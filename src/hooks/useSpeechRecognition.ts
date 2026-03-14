"use client";

// feat/voice — Web Speech API wrapper
// Detects keywords (done/next/repeat/help) and free-form questions separately

import { useRef, useState, useCallback } from "react";

export type Keyword = "done" | "next" | "repeat" | "help";

const KEYWORDS: Keyword[] = ["done", "next", "repeat", "help"];

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
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [keyword, setKeyword] = useState<Keyword | null>(null);
  const [question, setQuestion] = useState<string | null>(null);

  const start = useCallback(() => {
    const SR =
      (window as typeof window & { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SR) {
      console.warn("Web Speech API not supported in this browser");
      return;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      // auto-restart so mic stays on until explicitly stopped
      if (recognitionRef.current) recognition.start();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim().toLowerCase();
        setTranscript(text);

        if (result.isFinal) {
          const detected = KEYWORDS.find((kw) => text.includes(kw));
          if (detected) {
            setKeyword(detected);
            setQuestion(null);
          } else if (text.length > 3) {
            setQuestion(text);
            setKeyword(null);
          }
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" and "aborted" are benign — ignore them
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("SpeechRecognition error:", event.error);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setTranscript("");
  }, []);

  const clearResult = useCallback(() => {
    setKeyword(null);
    setQuestion(null);
  }, []);

  return { listening, transcript, keyword, question, start, stop, clearResult };
}
