import { randomUUID } from "crypto";
import {
  createInspectionSessionRecord,
  getInspectionSessionRecord,
  updateSession,
} from "@/server/clients/aws/dynamodb";
import { getImageObjectBase64 } from "@/server/clients/aws/s3";
import { runInspectionTurn } from "@/server/clients/featherless";
import { inspectLiveFrame } from "@/server/clients/gemini";
import { uploadInspectionFrame } from "@/server/services/storage";
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

  const frames: InspectionFrame[] = [...session.frames];
  const fallback = createFallbackFinding(request.transcript);
  const capturedAt = nowIso();
  const latestStoredFrame = [...session.frames].reverse().find((frame) => frame.s3Key);
  const latestStoredVisualSummary = [...session.frames]
    .reverse()
    .find((frame) => frame.geminiSummary?.trim())
    ?.geminiSummary ?? null;
  let imageBase64ForVision = request.frameBase64 ?? null;

  if (!imageBase64ForVision && latestStoredFrame?.s3Key) {
    try {
      imageBase64ForVision = await getImageObjectBase64(latestStoredFrame.s3Key);
    } catch (error) {
      console.error("Inspection frame retrieval failed:", error);
    }
  }

  // Run upload, Gemini (vision), and Featherless (reasoning) in parallel.
  // Featherless gets the PREVIOUS turn's visual summary so it has image context
  // without waiting for Gemini to finish this turn.
  const [uploadSettled, visionSettled, reasoningSettled] = await Promise.allSettled([
    request.frameBase64
      ? uploadInspectionFrame({
          sessionId: session.sessionId,
          capturedAt,
          source: request.frameSource ?? "manual",
          imageBase64: request.frameBase64,
        })
      : Promise.resolve(null),
    imageBase64ForVision
      ? withTimeout(
          inspectLiveFrame({
            imageBase64: imageBase64ForVision,
            userProblem: session.userProblem,
            transcript: request.transcript,
            previousSummary: session.latestFinding?.issueSummary ?? null,
          }),
          8000,
          "Gemini vision"
        )
      : Promise.resolve(null),
    withTimeout(
      runInspectionTurn({
        userProblem: session.userProblem,
        transcript: request.transcript,
        itemLabel: session.itemLabel,
        visionSummary: latestStoredVisualSummary ?? session.latestFinding?.issueSummary ?? null,
        rekognitionLabels: [],
        previousFinding: session.latestFinding,
        currentViewRequest: session.currentViewRequest,
        messages: [...session.messages, userMessage],
      }),
      12000,
      "Featherless reasoning"
    ),
  ]);

  const uploadedFrame = uploadSettled.status === "fulfilled" ? uploadSettled.value : null;
  if (uploadSettled.status === "rejected") console.error("Inspection frame upload failed:", uploadSettled.reason);

  const vision = visionSettled.status === "fulfilled" ? visionSettled.value : null;
  if (visionSettled.status === "rejected") console.error("Gemini vision failed:", visionSettled.reason);

  const reasoning = reasoningSettled.status === "fulfilled"
    ? reasoningSettled.value
    : { spokenResponse: fallback.issueSummary, finding: fallback };
  if (reasoningSettled.status === "rejected") console.error("Featherless reasoning failed:", reasoningSettled.reason);

  if (request.frameBase64) {
    frames.push({
      capturedAt,
      s3Key: uploadedFrame?.s3Key ?? undefined,
      source: request.frameSource ?? "manual",
      geminiSummary: vision?.visibleIssue ?? undefined,
      rekognitionLabels: [],
    });
  }

  const itemLabel = vision?.itemLabel || session.itemLabel;
  const normalizedFinding = normalizeFinding(
    reasoning.finding,
    fallback,
    vision?.requestedView ?? reasoning.finding.requestedView ?? null,
    vision?.safetyWarnings ?? reasoning.finding.safetyWarnings ?? []
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
    itemLabel: itemLabel ?? null,
    currentViewRequest: normalizedFinding.requestedView ?? null,
    latestFinding: normalizedFinding,
    messages: nextMessages,
    frames,
  };

  try {
    const updated = await updateSession(session.sessionId, {
      itemLabel: itemLabel ?? null,
      currentViewRequest: normalizedFinding.requestedView ?? null,
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
