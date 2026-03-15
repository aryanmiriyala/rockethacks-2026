import { randomUUID } from "crypto";
import {
  createInspectionSessionRecord,
  getInspectionSessionRecord,
  updateSession,
} from "@/server/clients/aws/dynamodb";
import { runInspectionTurn } from "@/server/clients/featherless";
import { inspectLiveFrame } from "@/server/clients/gemini";
import type {
  CreateInspectionSessionRequest,
  InspectionFinding,
  InspectionFrame,
  InspectionMessage,
  InspectionSession,
  InspectionTurnRequest,
  UpdateInspectionSessionRequest,
} from "@/shared/types";

function nowIso() {
  return new Date().toISOString();
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

function createFallbackFinding(transcript: string): InspectionFinding {
  const normalized = transcript.toLowerCase();
  const looksLikeQuestion = /\b(how|what|why|where|when|can i|should i|is it|do i|could it)\b/.test(normalized);

  return {
    issueSummary:
      transcript || "We need a clearer look at the item before recommending anything.",
    confidence: 0.25,
    recommendedOutcome: "inspect_more",
    rationale: looksLikeQuestion
      ? "The user asked a question, but the assistant still needs more visual evidence to answer confidently."
      : "The assistant needs more evidence from the user and camera before deciding.",
    requestedView: looksLikeQuestion
      ? "Show the exact part you are asking about."
      : "Show a closer view of the area that looks damaged or unusual.",
    safetyWarnings: [],
  };
}

function normalizeFinding(
  finding: Partial<InspectionFinding> | null | undefined,
  fallback: InspectionFinding,
  requestedView: string | null,
  safetyWarnings: string[]
): InspectionFinding {
  return {
    issueSummary: finding?.issueSummary?.trim() || fallback.issueSummary,
    confidence:
      typeof finding?.confidence === "number" && Number.isFinite(finding.confidence)
        ? Math.min(1, Math.max(0, finding.confidence))
        : fallback.confidence,
    recommendedOutcome: finding?.recommendedOutcome ?? fallback.recommendedOutcome,
    rationale: finding?.rationale?.trim() || fallback.rationale,
    requestedView:
      finding?.requestedView === undefined ? requestedView ?? fallback.requestedView ?? null : finding.requestedView,
    safetyWarnings: Array.isArray(finding?.safetyWarnings)
      ? finding!.safetyWarnings.filter(Boolean)
      : safetyWarnings,
  };
}

export async function createInspectionSession(
  request: CreateInspectionSessionRequest
): Promise<InspectionSession> {
  const timestamp = nowIso();
  const session: InspectionSession = {
    sessionId: randomUUID(),
    status: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
    userProblem: request.userProblem,
    itemLabel: null,
    currentViewRequest: "Show the full item first.",
    latestFinding: null,
    messages: [
      {
        role: "assistant",
        content: "Show me the item and tell me what seems wrong. I’ll help narrow it down before suggesting anything.",
        createdAt: timestamp,
      },
    ],
    frames: [],
  };

  await createInspectionSessionRecord(session);
  return session;
}

export async function getInspectionSession(sessionId: string): Promise<InspectionSession | null> {
  return getInspectionSessionRecord(sessionId);
}

export async function updateInspectionSession(
  sessionId: string,
  patch: UpdateInspectionSessionRequest
): Promise<InspectionSession> {
  return updateSession(sessionId, patch) as Promise<InspectionSession>;
}

export async function processInspectionTurn(
  request: InspectionTurnRequest
): Promise<{ session: InspectionSession; spokenResponse: string }> {
  const session = await getInspectionSessionRecord(request.sessionId);

  if (!session) {
    throw new Error("Inspection session not found");
  }

  const userMessage: InspectionMessage = {
    role: "user",
    content: request.transcript,
    createdAt: nowIso(),
  };

  let itemLabel = session.itemLabel ?? null;
  let frameSummary: string | null = null;
  let requestedView = session.currentViewRequest ?? null;
  let safetyWarnings = session.latestFinding?.safetyWarnings ?? [];
  let rekognitionLabels: string[] = [];
  const frames: InspectionFrame[] = [...session.frames];

  if (request.frameBase64) {
    try {
      const vision = await withTimeout(
        inspectLiveFrame({
          imageBase64: request.frameBase64,
          userProblem: session.userProblem,
          transcript: request.transcript,
          previousSummary: session.latestFinding?.issueSummary ?? null,
        }),
        2200,
        "Gemini live inspection"
      );

      itemLabel = vision.itemLabel || itemLabel;
      frameSummary = vision.visibleIssue;
      requestedView = vision.requestedView;
      safetyWarnings = vision.safetyWarnings;
    } catch (error) {
      console.error("Live frame inspection failed:", error);
      frameSummary = null;
    }

    frames.push({
      capturedAt: nowIso(),
      source: request.frameSource ?? "manual",
      geminiSummary: frameSummary ?? undefined,
      rekognitionLabels,
    });
  }

  let reasoning = {
    spokenResponse:
      "I need a little more context before I can recommend the next step. Tell me what changed, and show me the area that looks off.",
    finding: createFallbackFinding(request.transcript),
  };

  try {
    reasoning = await withTimeout(
      runInspectionTurn({
        userProblem: session.userProblem,
        transcript: request.transcript,
        itemLabel,
        visionSummary: frameSummary,
        rekognitionLabels,
        previousFinding: session.latestFinding,
        currentViewRequest: requestedView,
        messages: [...session.messages, userMessage],
      }),
      3000,
      "Featherless reasoning"
    );
  } catch (error) {
    console.error("Inspection reasoning failed:", error);
    reasoning.finding = {
      ...reasoning.finding,
      requestedView,
      safetyWarnings,
    };
    reasoning.spokenResponse = /\b(how|what|why|where|when|can i|should i|is it|do i|could it)\b/.test(
      request.transcript.toLowerCase()
    )
      ? "I heard your question, but I need a clearer look at the exact part you mean before I answer confidently."
      : reasoning.spokenResponse;
  }

  const normalizedFinding = normalizeFinding(
    reasoning.finding,
    createFallbackFinding(request.transcript),
    requestedView,
    safetyWarnings
  );

  const assistantMessage: InspectionMessage = {
    role: "assistant",
    content: reasoning.spokenResponse,
    createdAt: nowIso(),
  };
  const nextMessages = [...session.messages, userMessage, assistantMessage];
  const nextSession: InspectionSession = {
    ...session,
    updatedAt: nowIso(),
    itemLabel,
    currentViewRequest: normalizedFinding.requestedView ?? requestedView ?? null,
    latestFinding: normalizedFinding,
    messages: nextMessages,
    frames,
  };

  try {
    const updated = await updateSession(session.sessionId, {
      itemLabel,
      currentViewRequest: normalizedFinding.requestedView ?? requestedView ?? null,
      latestFinding: normalizedFinding,
      messages: nextMessages,
      frames,
    }) as InspectionSession;

    return { session: updated, spokenResponse: reasoning.spokenResponse };
  } catch (error) {
    console.error("Inspection session persistence failed:", error);
    return { session: nextSession, spokenResponse: reasoning.spokenResponse };
  }
}
