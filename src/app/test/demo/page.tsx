"use client";

// Full end-to-end demo — Camera → Gemini → Featherless → ElevenLabs → STT loop
// No DynamoDB or Jaseci needed. Visit /test/demo

import { useState, useRef, useCallback, useEffect } from "react";
import CameraCapture from "@/components/camera/CameraCapture";
import Spinner from "@/components/ui/Spinner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { DeviceIdentification, RepairStep } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function tts(text: string): Promise<void> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  const audio = new Audio(URL.createObjectURL(blob));
  audio.play();
  await new Promise<void>((resolve) => { audio.onended = () => resolve(); });
}

async function fetchStep(
  device: string,
  part: string,
  stepNumber: number,
  previousSteps: string[],
  problemObservation?: string,
): Promise<RepairStep> {
  const res = await fetch("/api/repair-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "demo",
      device,
      part,
      stepNumber,
      previousSteps,
      problemObservation,
    }),
  });
  if (!res.ok) throw new Error(`Step fetch failed: ${res.status}`);
  const { step } = await res.json();
  return step;
}

// ── types ─────────────────────────────────────────────────────────────────────

type Phase = "camera" | "identifying" | "repairing" | "complete";

// ── component ─────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [phase, setPhase] = useState<Phase>("camera");
  const [identification, setIdentification] = useState<DeviceIdentification | null>(null);
  const [steps, setSteps] = useState<RepairStep[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState("");

  const { listening, transcript, keyword, question, start, stop, clearResult } =
    useSpeechRecognition();

  // refs for stable access inside async callbacks
  const stepsRef = useRef<RepairStep[]>([]);
  const stepIdxRef = useRef(0);
  const identRef = useRef<DeviceIdentification | null>(null);

  useEffect(() => { stepsRef.current = steps; }, [steps]);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);
  useEffect(() => { identRef.current = identification; }, [identification]);

  const addLog = useCallback((msg: string) => {
    setLog((p) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...p].slice(0, 40));
  }, []);

  // Speak text, pause mic while speaking, restart after
  const speakAndResume = useCallback(async (text: string, wasListening: boolean) => {
    stop();
    setSpeaking(true);
    setStatusMsg("Speaking...");
    try {
      await tts(text);
    } catch (err) {
      addLog(`TTS error: ${err instanceof Error ? err.message : "unknown"}`);
    } finally {
      setSpeaking(false);
      if (wasListening) {
        setStatusMsg("Listening...");
        start();
      } else {
        setStatusMsg("");
      }
    }
  }, [stop, start, addLog]);

  // Load the next step from Featherless and speak it
  const loadAndSpeakStep = useCallback(async (stepNumber: number) => {
    const ident = identRef.current;
    if (!ident) return;

    const prev = stepsRef.current.map((s) => s.instruction);
    setStatusMsg(`Generating step ${stepNumber}...`);
    addLog(`Fetching step ${stepNumber} from Featherless...`);

    try {
      const step = await fetchStep(ident.device, ident.part, stepNumber, prev, ident.problemObservation);
      setSteps((s) => [...s, step]);
      stepsRef.current = [...stepsRef.current, step];
      addLog(`Step ${stepNumber}: ready`);

      if (step.isTerminal) setPhase("complete");
      await speakAndResume(step.voicePrompt, true);
    } catch (err) {
      addLog(`Step error: ${err instanceof Error ? err.message : "unknown"}`);
      setStatusMsg("");
      start();
    }
  }, [speakAndResume, addLog, start]);

  // ── keyword handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!keyword) return;
    clearResult();

    const idx = stepIdxRef.current;
    const stepList = stepsRef.current;

    if (keyword === "done" || keyword === "next") {
      const nextIdx = idx + 1;
      setStepIdx(nextIdx);
      addLog(`"${keyword}" → step ${nextIdx + 1}`);

      // Use cached step if we have it, else fetch
      if (stepList[nextIdx]) {
        speakAndResume(stepList[nextIdx].voicePrompt, true);
      } else {
        loadAndSpeakStep(nextIdx + 1);
      }
    } else if (keyword === "repeat") {
      addLog(`"repeat" → step ${idx + 1}`);
      if (stepList[idx]) speakAndResume(stepList[idx].voicePrompt, true);
    } else if (keyword === "help") {
      speakAndResume(
        "Say 'done' or 'next' to move to the next step, 'repeat' to hear the current step again, or ask me any question.",
        true,
      );
    }
  }, [keyword, clearResult, speakAndResume, loadAndSpeakStep, addLog]);

  // ── question handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!question) return;
    clearResult();
    addLog(`Question: "${question}"`);

    const ctx = stepsRef.current[stepIdxRef.current]?.instruction ?? "";
    stop();

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context: ctx }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.answer) speakAndResume(data.answer, true); })
      .catch((err) => {
        addLog(`Chat error: ${err.message}`);
        start();
      });
  }, [question, clearResult, speakAndResume, stop, start, addLog]);

  // ── camera capture ───────────────────────────────────────────────────────
  async function handleCapture(blob: Blob) {
    setPhase("identifying");
    setStatusMsg("Analyzing device...");
    addLog("Photo captured → sending to Gemini...");

    try {
      const imageBase64 = await blobToBase64(blob);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      if (!res.ok) throw new Error(`Identify failed: ${res.status}`);
      const { identification: ident } = await res.json();
      setIdentification(ident);
      identRef.current = ident;
      addLog(`Identified: ${ident.device} — ${ident.part}`);

      // Speak intro, then load step 1
      setPhase("repairing");
      const intro = ident.problemObservation
        ? `I see you're working on a ${ident.device}. ${ident.problemObservation}. Let's fix it together.`
        : `I see you're working on a ${ident.device}. Let's diagnose the ${ident.part} together.`;

      setSpeaking(true);
      setStatusMsg("Speaking...");
      await tts(intro);
      setSpeaking(false);

      await loadAndSpeakStep(1);
    } catch (err) {
      addLog(`Error: ${err instanceof Error ? err.message : "unknown"}`);
      setStatusMsg("Something went wrong. Tap to retry.");
      setPhase("camera");
    }
  }

  // ── current step ─────────────────────────────────────────────────────────
  const currentStep = steps[stepIdx];

  // ── render ───────────────────────────────────────────────────────────────
  if (phase === "camera") {
    return <CameraCapture onCapture={handleCapture} />;
  }

  if (phase === "identifying") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-dark px-6">
        <Spinner />
        <p className="text-brand-muted text-sm">Analyzing your device...</p>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-brand-dark px-6 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-2xl font-bold text-white">Repair Complete</h1>
        <p className="text-brand-muted text-sm max-w-xs">
          You saved a device from the landfill. Every repair counts.
        </p>
        <button
          onClick={() => {
            setPhase("camera");
            setIdentification(null);
            setSteps([]);
            setStepIdx(0);
            setLog([]);
          }}
          className="rounded-xl bg-brand-green px-8 py-4 font-semibold text-brand-dark hover:opacity-90 transition-opacity"
        >
          Repair Another
        </button>
      </div>
    );
  }

  // repairing phase
  return (
    <main className="min-h-screen bg-brand-dark flex flex-col gap-4 px-4 py-6 max-w-lg mx-auto">
      {/* Device header */}
      {identification && (
        <div className="text-center">
          <p className="text-brand-muted text-xs uppercase tracking-wide">Repairing</p>
          <h2 className="text-xl font-bold text-white">{identification.device}</h2>
          <p className="text-brand-green text-sm">{identification.part}</p>
        </div>
      )}

      {/* Current step card */}
      <div className="rounded-xl bg-brand-surface border border-white/10 p-4 space-y-2 min-h-[100px]">
        {currentStep ? (
          <>
            <p className="text-xs text-brand-muted font-medium uppercase tracking-wide">
              Step {stepIdx + 1}
            </p>
            <p className="text-white text-sm leading-relaxed">{currentStep.instruction}</p>
          </>
        ) : (
          <div className="flex items-center gap-2 text-brand-muted text-sm">
            <Spinner />
            <span>{statusMsg || "Loading step..."}</span>
          </div>
        )}
      </div>

      {/* Status pills */}
      <div className="flex gap-3">
        <div className={`flex-1 rounded-xl p-3 text-center text-sm font-medium border transition-colors ${
          speaking
            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
            : "bg-brand-surface text-brand-muted border-white/10"
        }`}>
          {speaking ? "● Speaking" : "Silent"}
        </div>
        <div className={`flex-1 rounded-xl p-3 text-center text-sm font-medium border transition-colors ${
          listening
            ? "bg-brand-green/20 text-brand-green border-brand-green/40"
            : "bg-brand-surface text-brand-muted border-white/10"
        }`}>
          {listening ? "● Listening" : "Mic off"}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="rounded-xl bg-brand-surface border border-white/10 p-3 text-sm">
          <span className="text-white/40 text-xs mr-2">Heard:</span>
          <span className="text-white">{transcript}</span>
        </div>
      )}

      {/* Voice command hint */}
      <div className="rounded-xl bg-brand-surface border border-white/10 p-4 text-xs space-y-1">
        <p className="font-semibold text-white mb-1">Voice commands</p>
        <p><span className="text-brand-green font-mono">"done" / "next"</span> — next step</p>
        <p><span className="text-brand-green font-mono">"repeat"</span> — hear again</p>
        <p><span className="text-brand-green font-mono">"help"</span> — navigation tips</p>
        <p><span className="text-brand-green font-mono">any question</span> — AI answers back</p>
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-brand-surface border border-white/10 p-4">
          <p className="text-xs font-semibold text-white mb-2">Activity log</p>
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {log.map((e, i) => (
              <p key={i} className="text-xs text-brand-muted font-mono">{e}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
