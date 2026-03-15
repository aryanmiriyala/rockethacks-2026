"use client";

// feat/voice — owns this hook
import { useState, useCallback, useRef, useEffect } from "react";

type VoiceCommand = "done" | "next" | "repeat" | "skip" | string;

function normalizeCommand(transcript: string): VoiceCommand {
  const text = transcript.toLowerCase().trim();

  if (text.includes("repeat")) return "repeat";
  if (text.includes("skip")) return "skip";
  if (text.includes("next")) return "next";
  if (text.includes("done")) return "done";

  return text;
}

export default function useSpeech() {
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [spokenText, setSpokenText] = useState("");
  const [fallbackNonce, setFallbackNonce] = useState(0);
  const audioUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);

  // Fetch ElevenLabs TTS audio from /api/speak and return object URL
  const speak = useCallback(async (text: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setSpokenText(text);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      if (requestIdRef.current === requestId) {
        controller.abort();
        setAudioUrl(null);
        setFallbackNonce((value) => value + 1);
      }
    }, 1800);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Speak failed (${res.status})`);
      }

      const blob = await res.blob();
      window.clearTimeout(timeoutId);

      if (requestIdRef.current !== requestId) {
        return;
      }

      const url = URL.createObjectURL(blob);
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = url;
      setAudioUrl(url);
    } catch (error) {
      window.clearTimeout(timeoutId);
      setAudioUrl(null);

      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setFallbackNonce((value) => value + 1);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  // Web Speech API STT — fires onVoiceCommand when user speaks
  const startListening = useCallback((onCommand: (cmd: VoiceCommand) => void) => {
    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    window.dispatchEvent(new CustomEvent("fixit:voice-listen-start"));

    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);

      if (shouldRestartRef.current && recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch (error) {
          console.error("SpeechRecognition restart failed:", error);
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("SpeechRecognition error:", event.error);
      }
      setListening(false);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript?.trim();

        if (!transcript || !result.isFinal) {
          continue;
        }

        shouldRestartRef.current = false;
        onCommand(normalizeCommand(transcript));
        recognition.stop();
        return;
      }
    };

    shouldRestartRef.current = true;
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  return { speak, audioUrl, spokenText, fallbackNonce, listening, startListening, stopListening };
}
