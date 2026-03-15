// feat/vision-identify — owns this file
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DeviceIdentification } from "@/shared/types";
import { extractJsonObject } from "@/server/utils/llm";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function observeDeviceProblem(imageBase64: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_OBSERVE_MODEL ?? "gemini-1.5-flash",
  });
  const result = await model.generateContent([
    "Look at this broken device and describe the visible problem in one clear, specific sentence. What's wrong with it?",
    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
  ]);
  return result.response.text().trim();
}

export async function identifyDeviceFromImage(imageBase64: string): Promise<DeviceIdentification> {
  const model = genAI.getGenerativeModel({
    // `gemini-1.5-flash` is what the older working branch used and is more reliable on free-tier keys.
    model: process.env.GEMINI_IDENTIFY_MODEL ?? "gemini-1.5-flash",
  });

  const prompt = `You are an appliance repair expert. Look at this image and identify:
1. The type of device/appliance (e.g. "Floor Lamp", "Coffee Maker", "Toaster")
2. The specific part that appears broken or needs attention (e.g. "Socket Tab", "Heating Element", "Fuse")
3. Your confidence level from 0 to 1

Respond ONLY with valid JSON in this format:
{ "device": "...", "part": "...", "confidence": 0.9 }`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
  ]);

  const text = result.response.text();
  const parsed = extractJsonObject<DeviceIdentification>(text);

  return {
    device: parsed.device,
    part: parsed.part,
    confidence: parsed.confidence,
  };
}

interface InspectionVisionInput {
  imageBase64: string;
  userProblem: string;
  transcript: string;
  previousSummary?: string | null;
}

interface InspectionVisionResult {
  itemLabel: string;
  visibleIssue: string;
  confidence: number;
  requestedView: string | null;
  safetyWarnings: string[];
}

export async function inspectLiveFrame(input: InspectionVisionInput): Promise<InspectionVisionResult> {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_INSPECT_MODEL ?? process.env.GEMINI_IDENTIFY_MODEL ?? "gemini-1.5-flash",
  });

  const prompt = `You are helping inspect a household item during a live camera session.
The user says the problem is: "${input.userProblem}".
Their latest spoken message is: "${input.transcript}".
${input.previousSummary ? `Previous visual summary: "${input.previousSummary}".` : ""}

Look only at what is actually visible. Do not invent hidden failures or repair steps.
Return ONLY valid JSON:
{
  "itemLabel": "...",
  "visibleIssue": "...",
  "confidence": 0.0,
  "requestedView": "... or null",
  "safetyWarnings": ["..."]
}

Use requestedView when the camera should move to another angle to confirm the issue.`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: "image/jpeg", data: input.imageBase64 } },
  ]);

  return extractJsonObject<InspectionVisionResult>(result.response.text());
}
