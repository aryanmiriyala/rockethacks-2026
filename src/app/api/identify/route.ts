// feat/vision-identify — owns this route
import { NextRequest, NextResponse } from "next/server";
import { identifyDevice } from "@/server/services/identify";
import type { IdentifyRequest, IdentifyResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 }: IdentifyRequest = await req.json();
    const identification = await identifyDevice(imageBase64);

    return NextResponse.json({ identification } satisfies IdentifyResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Device identification failed";
    console.error("Identify route failed:", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
