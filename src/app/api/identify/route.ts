// feat/vision-identify — owns this route
import { NextRequest, NextResponse } from "next/server";
import { identifyDeviceFromImage } from "@/lib/services/gemini";
import { validateLabels } from "@/lib/services/rekognition";
import type { IdentifyRequest, IdentifyResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { s3Key }: IdentifyRequest = await req.json();

  // Primary: Gemini Vision
  const identification = await identifyDeviceFromImage(s3Key);

  // Fallback: if Gemini confidence is low, cross-check with AWS Rekognition
  if (identification.confidence < 0.7) {
    const labels = await validateLabels(s3Key);
    identification.rekognitionLabels = labels;
  }

  return NextResponse.json({ identification } satisfies IdentifyResponse);
}
