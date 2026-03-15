import { streamSpeech } from "@/server/clients/elevenlabs";

export async function synthesizeSpeech(text: string, voiceId?: string) {
  return streamSpeech(text, voiceId);
}
