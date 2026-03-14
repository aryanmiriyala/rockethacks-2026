// feat/voice — owns this file

export async function streamSpeech(text: string, voiceId?: string): Promise<ReadableStream<Uint8Array>> {
  const id = voiceId ?? process.env.ELEVENLABS_VOICE_ID!;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/stream`, {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_turbo_v2",  // lowest latency model
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs API error: ${res.status}`);
  if (!res.body) throw new Error("No response body from ElevenLabs");

  return res.body;
}
