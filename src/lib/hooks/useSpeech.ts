"use client";

// feat/voice — owns this hook
import { useState, useCallback, useRef } from "react";

type VoiceCommand = "done" | "next" | "repeat" | "skip" | string;

export default function useSpeech() {
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Fetch ElevenLabs TTS audio from /api/speak and return object URL
  const speak = useCallback(async (text: string) => {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
  }, []);

  // Web Speech API STT — fires onVoiceCommand when user speaks
  const startListening = useCallback((onCommand: (cmd: VoiceCommand) => void) => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      onCommand(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { speak, audioUrl, listening, startListening, stopListening };
}
