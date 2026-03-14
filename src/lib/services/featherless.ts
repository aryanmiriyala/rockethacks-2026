// feat/llm-steps — owns this file
import type { RepairStep, RepairStepRequest } from "@/lib/types";

const FEATHERLESS_BASE_URL = "https://api.featherless.ai/v1";

export async function getRepairStep(context: RepairStepRequest): Promise<RepairStep> {
  const systemPrompt = `You are a master repair technician guiding a user through fixing their ${context.device}.
Be concise, clear, and encouraging. Each instruction should be one actionable step.
The user will say "Done" when they complete a step. Respond as if speaking directly to them.`;

  const previousContext = context.previousSteps.length > 0
    ? `Previous steps completed:\n${context.previousSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n`
    : "";

  const userMessage = context.userMessage
    ? `User says: "${context.userMessage}"\n\n`
    : "";

  const prompt = `${previousContext}${userMessage}What is step ${context.stepNumber} to repair the ${context.part} on a ${context.device}?

Respond ONLY with valid JSON:
{
  "instruction": "...",
  "voicePrompt": "...",
  "isTerminal": false
}

Set isTerminal to true only if this is the final step needed to complete the repair.`;

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
  const parsed = JSON.parse(content);

  return {
    stepNumber: context.stepNumber,
    instruction: parsed.instruction,
    voicePrompt: parsed.voicePrompt,
    isTerminal: parsed.isTerminal ?? false,
  };
}
