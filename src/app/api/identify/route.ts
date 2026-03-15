// feat/vision-identify — owns this route
import { NextRequest, NextResponse } from "next/server";
import { identifyDeviceFromImage, observeDeviceProblem } from "@/lib/services/gemini";
import type { DeviceIdentification, IdentifyRequest, IdentifyResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { imageBase64 }: IdentifyRequest = await req.json();

  // Run Gemini identification and Featherless vision observation in parallel
  const [geminiResult, observationResult] = await Promise.allSettled([
    identifyDeviceFromImage(imageBase64),
    observeDeviceProblem(imageBase64),
  ]);

  const identification: DeviceIdentification =
    geminiResult.status === "fulfilled"
      ? geminiResult.value
      : { device: "Unknown Device", part: "Unknown Part", confidence: 0 };

  if (observationResult.status === "fulfilled") {
    identification.problemObservation = observationResult.value;
  }

  return NextResponse.json({ identification } satisfies IdentifyResponse);
}
