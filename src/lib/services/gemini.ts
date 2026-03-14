// feat/vision-identify — owns this file
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DeviceIdentification } from "@/lib/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function identifyDeviceFromImage(s3Key: string): Promise<DeviceIdentification> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Build the public S3 URL (bucket must allow GetObject or use a signed URL for private)
  const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

  const prompt = `You are an appliance repair expert. Look at this image and identify:
1. The type of device/appliance (e.g. "Floor Lamp", "Coffee Maker", "Toaster")
2. The specific part that appears broken or needs attention (e.g. "Socket Tab", "Heating Element", "Fuse")
3. Your confidence level from 0 to 1

Respond ONLY with valid JSON in this format:
{ "device": "...", "part": "...", "confidence": 0.9 }`;

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: "image/jpeg", data: await fetchImageAsBase64(imageUrl) } },
  ]);

  const text = result.response.text().trim();
  const parsed = JSON.parse(text);

  return {
    device: parsed.device,
    part: parsed.part,
    confidence: parsed.confidence,
    s3Key,
  };
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}
