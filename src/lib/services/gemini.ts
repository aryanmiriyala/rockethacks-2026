// feat/vision-identify — owns this file
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DeviceIdentification } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function identifyDeviceFromImage(imageBase64: string): Promise<DeviceIdentification> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

  const text = result.response.text().trim().replace(/```json\n?|```\n?/g, "");
  const parsed = JSON.parse(text);

  return {
    device: parsed.device,
    part: parsed.part,
    confidence: parsed.confidence,
  };
}
