"use client";

// Voice loop test — development only
// Tests: ElevenLabs TTS + Web Speech API keywords + conversational Q&A
// Visit http://localhost:3000/test/voice

import { useState, useRef, useCallback, useEffect } from "react";
import { useSpeechRecognition } from "@/features/voice/hooks/useSpeechRecognition";
import { MOCK_STEPS, HELP_TEXT } from "@/features/voice/mock/repairSteps";

// ── helpers ──────────────────────────────────────────────────────────────────

async function speakText(text: string): Promise<void> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.play();
  await new Promise<void>((resolve) => { audio.onended = () => resolve(); });
}

// ── component ─────────────────────────────────────────────────────────────────

export default function VoiceTestPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const { listening, transcript, keyword, question, start, stop, clearResult } =
    useSpeechRecognition();

  // refs so effects always see latest values without re-subscribing
  const stepIndexRef = useRef(0);
  useEffect(() => { stepIndexRef.current = stepIndex; }, [stepIndex]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 30));
  }, []);

  const speak = useCallback(async (text: string) => {
    setSpeaking(true);
    try {
      await speakText(text);
    } catch (err) {
      addLog(`TTS error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSpeaking(false);
    }
  }, [addLog]);

  // ── keyword handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!keyword) return;
    clearResult();
    const idx = stepIndexRef.current;

    switch (keyword) {
      case "done":
      case "next": {
        const next = Math.min(idx + 1, MOCK_STEPS.length - 1);
        addLog(`"${keyword}" → step ${next + 1}`);
        setStepIndex(next);
        speak(MOCK_STEPS[next].instruction);
        break;
      }
      case "repeat":
        addLog(`"repeat" → replaying step ${idx + 1}`);
        speak(MOCK_STEPS[idx].instruction);
        break;
      case "help":
        addLog(`"help" → reading tips`);
        speak(HELP_TEXT);
        break;
      case "stop":
        addLog(`"stop" → session ended`);
        stop();
        speak("Session stopped. Say 'Start Session' to begin again.");
        break;
    }
  }, [keyword, clearResult, speak, stop, addLog]);

  // ── question handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!question) return;
    clearResult();
    const context = MOCK_STEPS[stepIndexRef.current].instruction;
    addLog(`Question: "${question}"`);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.answer) speak(data.answer); })
      .catch((err) => addLog(`Chat error: ${err.message}`));
  }, [question, clearResult, speak, addLog]);

  // ── session controls ─────────────────────────────────────────────────────
  async function handleStart() {
    addLog("Session started");
    await speak(MOCK_STEPS[stepIndex].instruction);
    start();
  }

  function handleStop() {
    stop();
    addLog("Session stopped");
  }

  const currentStep = MOCK_STEPS[stepIndex];

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-brand-dark p-6 flex flex-col gap-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Voice Loop Test</h1>
        <p className="text-brand-muted text-sm mt-1">STT + Keywords + TTS — development only</p>
      </div>

      {/* Current step */}
      <div className="rounded-xl bg-brand-surface border border-white/10 p-4 space-y-2">
        <p className="text-xs text-brand-muted font-medium uppercase tracking-wide">
          Step {stepIndex + 1} / {MOCK_STEPS.length}
        </p>
        <p className="text-white text-sm leading-relaxed">{currentStep.instruction}</p>
        {currentStep.hint && (
          <p className="text-brand-muted text-xs border-t border-white/10 pt-2 mt-2">
            {currentStep.hint}
          </p>
        )}
      </div>

      {/* Status pills */}
      <div className="flex gap-3">
        <div
          className={`flex-1 rounded-xl p-3 text-center text-sm font-medium border transition-colors ${
            listening
              ? "bg-brand-green/20 text-brand-green border-brand-green/40"
              : "bg-brand-surface text-brand-muted border-white/10"
          }`}
        >
          {listening ? "● Listening" : "Mic off"}
        </div>
        <div
          className={`flex-1 rounded-xl p-3 text-center text-sm font-medium border transition-colors ${
            speaking
              ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
              : "bg-brand-surface text-brand-muted border-white/10"
          }`}
        >
          {speaking ? "● Speaking" : "Silent"}
        </div>
      </div>

      {/* Live transcript */}
      {transcript && (
        <div className="rounded-xl bg-brand-surface border border-white/10 p-3 text-sm">
          <span className="text-white/40 text-xs mr-2">Heard:</span>
          <span className="text-white">{transcript}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <button
          onClick={handleStart}
          disabled={speaking || listening}
          className="flex-1 rounded-xl bg-brand-green py-4 font-semibold text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          Start Session
        </button>
        <button
          onClick={handleStop}
          disabled={!listening && !speaking}
          className="rounded-xl bg-brand-surface border border-white/10 px-5 py-4 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
        >
          Stop
        </button>
      </div>

      {/* Manual step nav */}
      <div className="flex gap-2">
        {MOCK_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setStepIndex(i); addLog(`Manual → step ${i + 1}`); }}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-colors ${
              i === stepIndex
                ? "bg-brand-green text-brand-dark"
                : "bg-brand-surface text-brand-muted hover:bg-white/5"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Voice command reference */}
      <div className="rounded-xl bg-brand-surface border border-white/10 p-4 text-xs space-y-1">
        <p className="font-semibold text-white mb-2">Voice commands</p>
        <p><span className="text-brand-green font-mono">"done" / "next"</span> — advance step</p>
        <p><span className="text-brand-green font-mono">"repeat"</span> — hear step again</p>
        <p><span className="text-brand-green font-mono">"help"</span> — hear navigation tips</p>
        <p><span className="text-brand-green font-mono">"stop"</span> — end session</p>
        <p><span className="text-brand-green font-mono">any question</span> — ask about the repair → AI answers back</p>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-brand-surface border border-white/10 p-4">
          <p className="text-xs font-semibold text-white mb-2">Activity log</p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {log.map((entry, i) => (
              <p key={i} className="text-xs text-brand-muted font-mono">{entry}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
