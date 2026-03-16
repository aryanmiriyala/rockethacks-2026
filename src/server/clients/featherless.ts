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

export interface InspectionTurnInput {
  imageBase64?: string | null;
  userProblem: string;
  transcript: string;
  itemLabel?: string | null;
  previousFinding?: InspectionFinding | null;
  previousMessages: Array<{ role: string; content: string }>;
}

export interface InspectionTurnResult {
  spokenResponse: string;
  itemLabel: string;
  finding: InspectionFinding;
}

// Single Featherless call using Qwen2.5-VL — handles vision + reasoning together.
// Replaces the old inspectLiveFrame (Gemini) + runInspectionTurn (Llama) two-step.
export async function inspectAndReason(input: InspectionTurnInput): Promise<InspectionTurnResult> {
  const conversationContext = input.previousMessages
    .slice(-6)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const systemPrompt = `You are a voice-first sustainability assistant helping a user diagnose and fix a broken household item.
Your priorities in order: repair it > replace only the broken part > reuse/repurpose > donate > recycle. Buying new is always the last resort.
Be conversational, concise, and encouraging. Answer the user's question directly before asking for more evidence.
When suggesting a fix, briefly explain why it is the most sustainable choice.
Return JSON only — no markdown, no extra text.`;

  const userPrompt = `User's stated problem: "${input.userProblem}"
${input.itemLabel ? `Item identified as: "${input.itemLabel}"` : ""}
${input.previousFinding ? `Previous assessment: "${input.previousFinding.issueSummary}" (confidence ${input.previousFinding.confidence})` : ""}
${conversationContext ? `\nRecent conversation:\n${conversationContext}` : ""}

Latest message from user: "${input.transcript}"
${input.imageBase64 ? "A camera frame is attached — analyse what is visible and combine it with the user's description." : "No camera frame this turn — rely on conversation context."}

Respond ONLY with valid JSON:
{
  "spokenResponse": "Short warm spoken reply (1-3 sentences). Address what the user just said first.",
  "itemLabel": "Name of the item (e.g. 'Floor Lamp')",
  "finding": {
    "issueSummary": "Current best hypothesis based on visible evidence and user description",
    "confidence": 0.0,
    "recommendedOutcome": "inspect_more | repair | replace_part | reuse | donate | recycle | unsafe",
    "rationale": "Why this outcome — include sustainability reasoning",
    "requestedView": "Specific next camera view to request, or null",
    "safetyWarnings": []
  }
}`;

  const userContent = input.imageBase64
    ? [
        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` } },
        { type: "text", text: userPrompt },
      ]
    : userPrompt;

  const res = await fetch(`${FEATHERLESS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FEATHERLESS_VISION_MODEL ?? "Qwen/Qwen2.5-VL-7B-Instruct",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.25,
      max_tokens: 350,
    }),
  });

  if (!res.ok) throw new Error(`Featherless inspectAndReason error: ${res.status}`);

  const data = await res.json();
  return extractJsonObject<InspectionTurnResult>(data.choices[0].message.content.trim());
}

export async function runInspectionTurn(
  input: InspectionReasoningInput
): Promise<InspectionReasoningResult> {
  const transcriptIntent = inferTranscriptIntent(input.transcript);

  // Extract previously suggested actions from conversation so the model doesn't repeat them
  const previousSuggestions = input.messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join(" | ");

  const recentMessages = input.messages.slice(-8).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const questionsAsked = input.messages
    .filter((m) => m.role === "assistant" && m.content.includes("?"))
    .length;
  const questionLimitReached = questionsAsked >= 3;

  const systemPrompt = `You are Fix-It-Flow, a conversational sustainability repair mentor. Your job is to help the user fix or responsibly handle a broken household item through a natural back-and-forth conversation.

CONVERSATION RULES:
- ${questionLimitReached ? "QUESTIONS LIMIT REACHED (3/3). You must now commit to a specific recommendation — do NOT ask any more questions." : `You have asked ${questionsAsked}/3 follow-up questions. ${questionsAsked < 3 ? "You may ask ONE more targeted question only if it would materially change your recommendation, otherwise give a concrete action." : ""}`}
- NEVER repeat a suggestion already mentioned in the conversation history.
- Treat prior visual evidence as real evidence. Do not ignore it just because there is no new image this turn.
- Only request a new camera view if the missing visual detail would materially change your recommendation.
- When the user asks a direct question, answer it first in plain language before asking for anything else.
- If your confidence is below 0.55, explain the uncertainty briefly instead of pretending to know.
- Be specific: say exactly which part to check, which tool to use, how to test it. Avoid vague advice like "check the wiring".
- Sustainability priority: repair > replace only the broken part > clean/adjust/repurpose > donate > recycle. Buying new is always last.
- If too complex for home repair, name a specific sustainable alternative (e.g. "iFixit has a guide for this exact part", "manufacturer sells this fuse for $2", "local repair cafe can do this in 20 min").
- When you suggest an action, briefly say why it avoids waste or saves the item — one sentence is enough.
- spokenResponse must be 2-3 sentences max. It will be read aloud by text-to-speech.
- Return JSON only. No markdown.`;

  const prompt = `Item: ${input.itemLabel ?? "unknown"}
User's problem: "${input.userProblem}"
Visual analysis: ${input.visionSummary ?? "none"}
Previous assessment: ${input.previousFinding ? `${input.previousFinding.issueSummary} (confidence ${input.previousFinding.confidence}, outcome: ${input.previousFinding.recommendedOutcome})` : "none"}
Current requested view: ${input.currentViewRequest ?? "none"}
Already suggested: ${previousSuggestions || "nothing yet"}
Transcript intent: ${transcriptIntent}
Latest message: "${input.transcript}"

Conversation so far:
${recentMessages.map((m) => `${m.role === "user" ? "User" : "You"}: ${m.content}`).join("\n")}

Respond with valid JSON only:
{
  "spokenResponse": "...",
  "finding": {
    "issueSummary": "Specific hypothesis about what is broken and why",
    "confidence": 0.0,
    "recommendedOutcome": "inspect_more | repair | replace_part | reuse | donate | recycle | unsafe",
    "rationale": "Why this is the most sustainable next step given the conversation so far",
    "requestedView": "Specific camera angle that would materially change your recommendation, or null if you can answer now",
    "safetyWarnings": []
  }
}`;

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
      temperature: 0.2,
      max_tokens: 320,
    }),
  });

  if (!res.ok) {
    throw new Error(`Featherless API error: ${res.status}`);
  }

  const data = await res.json();
  return extractJsonObject<InspectionReasoningResult>(data.choices[0].message.content.trim());
}
