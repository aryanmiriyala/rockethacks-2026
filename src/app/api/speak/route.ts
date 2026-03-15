// feat/voice — owns this route
import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/server/services/speech";
import type { SpeakRequest } from "@/shared/types";

export async function POST(req: NextRequest) {
  const { text, voiceId }: SpeakRequest = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  try {
    const audioStream = await synthesizeSpeech(text, voiceId);

    return new Response(audioStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ElevenLabs request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
