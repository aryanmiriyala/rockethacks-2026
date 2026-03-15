"use client";

import { useEffect, useMemo, useState } from "react";
import useCamera from "@/features/camera/hooks/useCamera";
import useSpeech from "@/features/voice/hooks/useSpeech";
import AudioPlayer from "@/features/voice/components/AudioPlayer";
import VoiceWave from "@/features/voice/components/VoiceWave";
import { useSpeechRecognition } from "@/features/voice/hooks/useSpeechRecognition";
import ErrorBanner from "@/shared/ui/ErrorBanner";
import Spinner from "@/shared/ui/Spinner";
import type {
  CreateInspectionSessionResponse,
  InspectionMessage,
  InspectionSession,
  InspectionTurnResponse,
} from "@/shared/types";

function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function isConversationEnd(text: string): boolean {
  return /\b(thank you|thanks|that'?s all|thats all|goodbye|bye|stop listening|stop now|never mind|nevermind)\b/i.test(text);
}

export default function NewRepairPage() {
  const { videoRef, error: cameraError, isReady, startCamera, stopCamera, capturePhoto } = useCamera();
  const { speak, audioUrl } = useSpeech();
  const { listening, transcript, question, start, stop, clearResult } = useSpeechRecognition();
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [conversationClosed, setConversationClosed] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      setConversationClosed(true);
      stop();
      stopCamera();
    };
  }, [startCamera, stop, stopCamera]);

  const messages = useMemo<InspectionMessage[]>(() => session?.messages ?? [], [session?.messages]);

  async function createSession(initialProblem: string) {
    const normalizedProblem = initialProblem.trim();

    if (!normalizedProblem) {
      setError("Say what seems wrong so the assistant can start.");
      return null;
    }

    setError(null);

    try {
      const res = await fetch("/api/inspection/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userProblem: normalizedProblem }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Could not start session (${res.status})`);
      }

      const nextSession = (data as CreateInspectionSessionResponse).session;
      setSession(nextSession);
      return nextSession;
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Could not start session");
      return null;
    }
  }

  async function captureFrameBase64() {
    const photo = await capturePhoto();
    if (!photo) {
      throw new Error("Camera is not ready yet.");
    }

    return blobToBase64(photo);
  }

  async function submitTurn(transcript: string) {
    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeSession = session ?? (await createSession(normalizedTranscript));
      if (!activeSession) {
        return;
      }

      const frameBase64 = await captureFrameBase64();

      const res = await fetch("/api/inspection/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          transcript: normalizedTranscript,
          frameBase64,
          frameSource: "manual",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Inspection turn failed (${res.status})`);
      }

      const { session: updatedSession, spokenResponse } = data as InspectionTurnResponse;
      setSession(updatedSession);
      clearResult();
      setConversationClosed(false);

      speak(
        spokenResponse?.trim() ||
        "I need another look before I can answer that confidently."
      );
    } catch (turnError) {
      setError(turnError instanceof Error ? turnError.message : "Inspection turn failed");
    } finally {
      setLoading(false);
    }
  }

  function handleVoiceToggle() {
    if (listening) {
      setConversationClosed(true);
      stop();
      return;
    }

    setConversationClosed(false);
    clearResult();
    start();
  }

  useEffect(() => {
    if (!question?.trim() || loading) {
      return;
    }

    const nextQuestion = question.trim();
    clearResult();

    if (isConversationEnd(nextQuestion)) {
      setConversationClosed(true);
      speak("Okay. I’ll stop listening now. Tap the mic if you want to continue.");
      return;
    }

    submitTurn(nextQuestion).catch((turnError) => {
      setError(turnError instanceof Error ? turnError.message : "Inspection turn failed");
    });
  }, [clearResult, loading, question, speak]);

  function handlePlaybackChange(playing: boolean) {
    setAssistantSpeaking(playing);

    if (!playing && session && !loading && !listening && !conversationClosed) {
      try {
        start();
      } catch (voiceError) {
        console.error("Auto-restart listening failed:", voiceError);
      }
    }
  }

  const liveTranscript = listening ? transcript : "";

  return (
    <main className="min-h-screen bg-brand-dark text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl shadow-black/20">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/5] w-full bg-black object-cover sm:aspect-[16/9]"
          />

          {!isReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Spinner size={10} />
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/80 via-black/20 to-transparent p-4">
            <div className="rounded-full border border-white/10 bg-black/45 px-3 py-2 text-sm text-slate-200">
              {session?.currentViewRequest ?? "Point the camera at the item you want help with."}
            </div>
            <div className="rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-brand-green">
              Live view
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
            <div className="flex items-end justify-between gap-3">
              <div className="max-w-[60%] rounded-2xl border border-white/10 bg-black/45 px-4 py-3">
                <div className="flex items-center gap-3">
                  <VoiceWave active={listening || assistantSpeaking} tone={assistantSpeaking ? "speaking" : "listening"} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      {assistantSpeaking ? "Assistant speaking" : "Voice"}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      {assistantSpeaking
                        ? "The assistant is talking back."
                        : listening
                          ? liveTranscript || "Listening now..."
                          : conversationClosed
                            ? "Conversation paused. Tap the mic to continue."
                          : "Tap the mic and talk while showing the item."}
                    </p>
                  </div>
                </div>
                {liveTranscript && (
                  <p className="mt-3 border-t border-white/10 pt-3 text-sm text-slate-200">
                    “{liveTranscript}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={loading}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border transition ${
                    listening
                      ? "border-brand-green bg-brand-green text-brand-dark shadow-[0_0_0_10px_rgba(0,200,150,0.16)]"
                      : "border-white/15 bg-white/10 text-white"
                  } ${loading ? "opacity-50" : "hover:bg-white/15"}`}
                  aria-label={listening ? "Stop voice input" : "Start voice input"}
                >
                  <MicIcon active={listening} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    submitTurn("Here is the current view you asked for.").catch(() => {});
                  }}
                  disabled={loading || !session || !isReady}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-40"
                  aria-label="Send current camera view"
                >
                  <CameraArrowIcon />
                </button>
              </div>
            </div>
          </div>

          <AudioPlayer src={audioUrl} onPlaybackChange={handlePlaybackChange} />
        </section>

        {(cameraError || error) && (
          <ErrorBanner message={cameraError ?? error ?? "Unknown error"} onDismiss={() => setError(null)} />
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-green/80">Conversation</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Guided inspection</h2>
              </div>
              {session && (
                <p className="text-xs text-slate-400">{session.frames.length} frames reviewed</p>
              )}
            </div>

            {session?.latestFinding && (
              <div className="mt-5 rounded-2xl border border-white/10 bg-brand-surface/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Current read</p>
                  <p className="text-xs uppercase tracking-[0.22em] text-brand-green">
                    {Math.round(session.latestFinding.confidence * 100)}% confidence
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  {session.latestFinding.issueSummary}
                </p>
                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                  Likely outcome: {session.latestFinding.recommendedOutcome.replace("_", " ")}
                </p>
                {(session.latestFinding.safetyWarnings ?? []).length > 0 && (
                  <div className="mt-3 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-sm text-red-200">
                    {(session.latestFinding.safetyWarnings ?? []).join(" ")}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex max-h-[28rem] min-h-[16rem] flex-col gap-3 overflow-y-auto">
              {messages.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
                  Tap the mic, describe what is wrong, and keep the item in view. The first thing you say starts the session.
                </div>
              )}

              {messages.map((entry, index) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    entry.role === "assistant"
                      ? "self-start bg-brand-surface text-white"
                      : "self-end bg-brand-green text-brand-dark"
                  }`}
                >
                  <p>{entry.content}</p>
                  <p
                    className={`mt-2 text-xs ${
                      entry.role === "assistant" ? "text-slate-400" : "text-brand-dark/70"
                    }`}
                  >
                    {formatTimestamp(entry.createdAt)}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg className={`h-7 w-7 ${active ? "text-brand-dark" : "text-white"}`} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-4a3.5 3.5 0 1 0-7 0v4A3.5 3.5 0 0 0 12 15Z"
        fill="currentColor"
      />
      <path
        d="M6.5 11.5a5.5 5.5 0 1 0 11 0M12 17v3m-3 0h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraArrowIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V8m0 0-3 3m3-3 3 3M4 17.5V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
