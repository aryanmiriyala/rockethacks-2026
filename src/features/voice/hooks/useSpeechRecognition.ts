"use client";

// feat/voice — Web Speech API wrapper
// Detects keywords (done/next/repeat/help/stop) and free-form questions separately

import { useRef, useState, useCallback, useEffect } from "react";

export type Keyword = "done" | "next" | "repeat" | "help" | "stop";

// "stop" checked first so "stop" in a phrase doesn't accidentally match "done"
const KEYWORDS: Keyword[] = ["stop", "done", "next", "repeat", "help"];

export interface SpeechRecognitionResult {
  listening: boolean;
  transcript: string;       // live interim text
  keyword: Keyword | null;  // set when a final result contains a keyword
  question: string | null;  // set when a final result has no keyword
  start: () => void;
  stop: () => void;
  clearResult: () => void;  // call after handling keyword/question
}

export function useSpeechRecognition(): SpeechRecognitionResult {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimeoutRef = useRef<number | null>(null);
  const lastTranscriptRef = useRef("");
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [question, setQuestion] = useState<string | null>(null);

  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }, []);

  const promoteTranscript = useCallback((rawText: string) => {
    const spokenText = rawText.trim();
    if (!spokenText) {
      return;
    }

    const normalizedText = spokenText.toLowerCase();
    const detected = KEYWORDS.find((kw) => normalizedText.includes(kw));

    if (detected) {
      setKeyword(detected);
      setQuestion(null);
      return;
    }

    if (spokenText.length > 3) {
      setQuestion(spokenText);
      setKeyword(null);
    }
  }, []);

  const start = useCallback(() => {
    const SR =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    window.dispatchEvent(new CustomEvent("fixit:voice-listen-start"));

    if (recognitionRef.current) {
      clearSilenceTimeout();
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      lastTranscriptRef.current = "";
      setTranscript("");
      setListening(true);
    };
    recognition.onend = () => {
      setListening(false);
      clearSilenceTimeout();
      if (!question && !keyword && lastTranscriptRef.current.trim().length > 3) {
        promoteTranscript(lastTranscriptRef.current);
      }
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const spokenText = Array.from(event.results)
        .map((result) => result[0]?.transcript?.trim() ?? "")
        .join(" ")
        .trim();

      lastTranscriptRef.current = spokenText;
      setTranscript(spokenText);
      clearSilenceTimeout();

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();

        if (result.isFinal) {
          promoteTranscript(spokenText || text);
          recognition.stop();
          return;
        }
      }

      if (spokenText.length > 3) {
        silenceTimeoutRef.current = window.setTimeout(() => {
          recognition.stop();
        }, 1200);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are benign — ignore them
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("SpeechRecognition error:", event.error);
      }
      clearSilenceTimeout();
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [clearSilenceTimeout, keyword, promoteTranscript, question]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      clearSilenceTimeout();
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript("");
    lastTranscriptRef.current = "";
  }, [clearSilenceTimeout]);

  const clearResult = useCallback(() => {
    setKeyword(null);
    setQuestion(null);
    setTranscript("");
    lastTranscriptRef.current = "";
  }, []);

  useEffect(() => {
    function handleStopMedia() {
      stop();
      clearResult();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        handleStopMedia();
      }
    }

    window.addEventListener("fixit:stop-media", handleStopMedia);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("fixit:stop-media", handleStopMedia);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      handleStopMedia();
    };
  }, [clearResult, stop]);

  return { listening, transcript, keyword, question, start, stop, clearResult };
}
