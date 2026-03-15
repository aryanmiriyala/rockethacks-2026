// feat/llm-steps — owns this file
import type {
  InspectionFinding,
  InspectionMessage,
  RepairStep,
  RepairStepRequest,
} from "@/shared/types";
import { extractJsonObject } from "@/server/utils/llm";

const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";

export async function observeDeviceProblem(imageBase64: string): Promise<string> {
  const res = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FEATHERLESS_VISION_MODEL ?? "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            {
              type: "text",
              text: "You are an expert repair technician. Analyze this image and describe specifically what appears to be damaged, broken, or malfunctioning. Focus on visible defects, wear, or faults. Respond in 2-3 sentences.",
            },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 200,
    }),
  });

  if (!res.ok) throw new Error(`Featherless vision API error: ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function getRepairStep(context: RepairStepRequest): Promise<RepairStep> {
  const systemPrompt = `You are a master repair technician guiding a user through fixing their ${context.device}.
Be concise, clear, and encouraging. Each instruction should be one actionable step.
The user will say "Done" when they complete a step. Respond as if speaking directly to them.${
    context.problemObservation
      ? `\n\nVisual analysis of the device: ${context.problemObservation}`
      : ""
  }`;

  const previousContext = context.previousSteps.length > 0
    ? `Previous steps completed:\n${context.previousSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n`
    : "";

  const userMessage = context.userMessage
    ? `User says: "${context.userMessage}"\n\n`
    : "";

  const MAX_STEPS = 5;
  const isLastAllowed = context.stepNumber >= MAX_STEPS;

  const prompt = `${previousContext}${userMessage}What is step ${context.stepNumber} of at most ${MAX_STEPS} to repair the ${context.part} on a ${context.device}?

Respond ONLY with valid JSON:
{
  "instruction": "...",
  "voicePrompt": "...",
  "isTerminal": false
}

IMPORTANT: Set isTerminal to true if this step completes the repair OR if stepNumber is ${MAX_STEPS}.${isLastAllowed ? " This IS the final step — you MUST set isTerminal to true." : ""}`;

  const res = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FEATHERLESS_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!res.ok) throw new Error(`Featherless API error: ${res.status}`);

  const data = await res.json();
  const content = data.choices[0].message.content.trim();
  const parsed = extractJsonObject<{
    instruction: string;
    voicePrompt?: string;
    isTerminal?: boolean;
  }>(content);

  return {
    stepNumber: context.stepNumber,
    instruction: parsed.instruction,
    voicePrompt: parsed.voicePrompt ?? parsed.instruction,
    isTerminal: parsed.isTerminal ?? false,
  };
}

interface InspectionReasoningInput {
  userProblem: string;
  transcript: string;
  itemLabel?: string | null;
  visionSummary?: string | null;
  rekognitionLabels?: string[];
  previousFinding?: InspectionFinding | null;
  currentViewRequest?: string | null;
  messages: InspectionMessage[];
}

interface InspectionReasoningResult {
  spokenResponse: string;
  finding: InspectionFinding;
}

function inferTranscriptIntent(transcript: string): string {
  const text = transcript.toLowerCase().trim();

  if (!text) return "empty";
  if (/\b(how|what|why|where|when|can i|should i|is it|do i|could it)\b/.test(text)) return "question";
  if (/\b(showing|here is|this is|look at|see this)\b/.test(text)) return "camera_update";
  if (/\b(try|tried|did|done|fixed|worked|didn't|didnt|not working|still)\b/.test(text)) return "status_update";
  if (/\b(help|stuck|confused|not sure|unsure)\b/.test(text)) return "needs_guidance";
  return "observation";
}

export async function runInspectionTurn(
  input: InspectionReasoningInput
): Promise<InspectionReasoningResult> {
  const transcriptIntent = inferTranscriptIntent(input.transcript);
  const systemPrompt = `You are a voice-first sustainability assistant helping a user decide what to do with a household item.
You must be user-led, evidence-based, and cautious.
Do not jump straight into repair instructions.
First gather evidence, ask for specific views, and only then recommend repair, replace_part, reuse, donate, recycle, or unsafe.
When the user asks a direct question, answer it directly in plain language before asking for more evidence.
When the user gives a status update or describes what they are showing, interpret it and explain what it means.
You are not just labeling images. You are helping the user understand what they are looking at and what to do next.
Return JSON only.`;

  const recentMessages = input.messages.slice(-6).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const prompt = JSON.stringify({
    userProblem: input.userProblem,
    latestTranscript: input.transcript,
    transcriptIntent,
    itemLabel: input.itemLabel ?? null,
    visionSummary: input.visionSummary ?? null,
    rekognitionLabels: input.rekognitionLabels ?? [],
    previousFinding: input.previousFinding ?? null,
    currentViewRequest: input.currentViewRequest ?? null,
    recentMessages,
    responseFormat: {
      spokenResponse: "Short conversational response for ElevenLabs that directly addresses the user's latest utterance.",
      finding: {
        issueSummary: "Current best hypothesis grounded in visible evidence and the user's latest description.",
        confidence: "0 to 1 number",
        recommendedOutcome: "inspect_more | repair | replace_part | reuse | donate | recycle | unsafe",
        rationale: "Short explanation for why that outcome is currently best based on what the user said and what is visible.",
        requestedView: "Specific next view to request, or null",
        safetyWarnings: ["Short warnings only when relevant"],
      },
    },
  });

  const res = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FEATHERLESS_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 220,
    }),
  });

  if (!res.ok) {
    throw new Error(`Featherless API error: ${res.status}`);
  }

  const data = await res.json();
  return extractJsonObject<InspectionReasoningResult>(data.choices[0].message.content.trim());
}
