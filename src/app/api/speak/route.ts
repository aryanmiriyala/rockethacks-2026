// feat/voice — owns this route
import { NextRequest } from "next/server";
import { streamSpeech } from "@/lib/services/elevenlabs";
import type { SpeakRequest } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { text, voiceId }: SpeakRequest = await req.json();

  const audioStream = await streamSpeech(text, voiceId);

  return new Response(audioStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Transfer-Encoding": "chunked",
    },
  });
}
