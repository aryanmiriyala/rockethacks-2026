"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const { speak, audioUrl, spokenText, fallbackNonce } = useSpeech();
  const { listening, transcript, keyword, question, start, stop, clearResult } = useSpeechRecognition();
  const [session, setSession] = useState<InspectionSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [conversationClosed, setConversationClosed] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Tap the mic and talk while showing the item.");
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [pendingCaptureRequest, setPendingCaptureRequest] = useState<string | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const lastAutoCaptureTokenRef = useRef<string | null>(null);

  function clearScheduledCapture() {
    if (countdownTimerRef.current) {
      window.clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    setCaptureCountdown(null);
    setPendingCaptureRequest(null);
  }

  useEffect(() => {
    startCamera();
    return () => {
      clearScheduledCapture();
      setConversationClosed(true);
      setVoiceStatus("Tap the mic and talk while showing the item.");
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

  async function submitTurn(
    transcript: string,
    options?: { includeFrame?: boolean; frameSource?: "manual" | "requested" }
  ) {
    const normalizedTranscript = transcript.trim();
    if (!normalizedTranscript) {
      return;
    }

    clearScheduledCapture();
    console.log("[inspection] submitting turn", { transcript: normalizedTranscript });

    setLoading(true);
    setError(null);
    setVoiceStatus("Thinking...");

    try {
      const activeSession = session ?? (await createSession(normalizedTranscript));
      if (!activeSession) {
        return;
      }

      const frameBase64 = options?.includeFrame ? await captureFrameBase64() : undefined;

      const res = await fetch("/api/inspection/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSession.sessionId,
          transcript: normalizedTranscript,
          frameBase64,
          frameSource: options?.frameSource,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? `Inspection turn failed (${res.status})`);
      }

      const { session: updatedSession, spokenResponse } = data as InspectionTurnResponse;
      console.log("[inspection] turn response", { spokenResponse, sessionId: updatedSession.sessionId });
      setSession(updatedSession);
      clearResult();
      setConversationClosed(false);
      setVoiceStatus("Assistant speaking...");

      speak(
        spokenResponse?.trim() ||
        "I need another look before I can answer that confidently."
      );
    } catch (turnError) {
      setError(turnError instanceof Error ? turnError.message : "Inspection turn failed");
      setVoiceStatus("Tap the mic and talk while showing the item.");
    } finally {
      setLoading(false);
    }
  }

  function scheduleRequestedCapture(viewRequest: string, source: "manual" | "requested") {
    if (loading || !isReady) {
      return;
    }

    stop();
    setConversationClosed(false);
    setPendingCaptureRequest(viewRequest);
    setCaptureCountdown(3);
    setVoiceStatus(`Capturing in 3 seconds: ${viewRequest}`);

    countdownIntervalRef.current = window.setInterval(() => {
      setCaptureCountdown((current) => {
        if (current === null || current <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return null;
        }

        return current - 1;
      });
    }, 1000);

    countdownTimerRef.current = window.setTimeout(() => {
      countdownTimerRef.current = null;
      setPendingCaptureRequest(null);
      setVoiceStatus("Capturing requested image...");

      submitTurn(
        source === "requested"
          ? `Here is the requested view: ${viewRequest}`
          : "Here is the current view.",
        { includeFrame: true, frameSource: source }
      ).catch((turnError) => {
        setError(turnError instanceof Error ? turnError.message : "Inspection turn failed");
        setVoiceStatus("Tap the mic and talk while showing the item.");
      });
    }, 3000);
  }

  function handleVoiceToggle() {
    if (listening) {
      setConversationClosed(true);
      clearScheduledCapture();
      setVoiceStatus("Conversation paused. Tap the mic to continue.");
      stop();
      return;
    }

    setConversationClosed(false);
    setVoiceStatus("Listening...");
    clearResult();
    start();
  }

  function handleRecognizedUtterance(rawUtterance: string) {
    const nextUtterance = rawUtterance.trim();
    if (!nextUtterance) {
      return;
    }

    console.log("[inspection] recognized utterance", { utterance: nextUtterance });
    clearResult();

    if (isConversationEnd(nextUtterance) || nextUtterance.toLowerCase() === "stop") {
      setConversationClosed(true);
      setVoiceStatus("Conversation paused. Tap the mic to continue.");
      speak("Okay. I’ll stop listening now. Tap the mic if you want to continue.");
      return;
    }

    submitTurn(nextUtterance).catch((turnError) => {
      setError(turnError instanceof Error ? turnError.message : "Inspection turn failed");
      setVoiceStatus("Tap the mic and talk while showing the item.");
    });
  }

  useEffect(() => {
    if (!question?.trim() || loading) {
      return;
    }

    handleRecognizedUtterance(question);
  }, [loading, question]);

  useEffect(() => {
    if (!keyword || loading) {
      return;
    }

    handleRecognizedUtterance(keyword);
  }, [keyword, loading]);

  function handlePlaybackChange(playing: boolean) {
    setAssistantSpeaking(playing);

    if (playing) {
      setVoiceStatus("Assistant speaking...");
      return;
    }

    if (!playing && session && !loading && !listening && !conversationClosed && !pendingCaptureRequest && captureCountdown === null) {
      setVoiceStatus("Listening...");
      window.setTimeout(() => {
        if (!loading && !listening && !conversationClosed && !pendingCaptureRequest && captureCountdown === null) {
          try {
            start();
          } catch (voiceError) {
            console.error("Auto-restart listening failed:", voiceError);
          }
        }
      }, 250);
    }
  }

  useEffect(() => {
    if (!session?.latestFinding || loading || assistantSpeaking || listening) {
      return;
    }

    const requestedView = session.currentViewRequest?.trim();
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
    const shouldAutoCapture = Boolean(
      requestedView
      && session.latestFinding.recommendedOutcome === "inspect_more"
      && latestAssistantMessage
    );

    if (!shouldAutoCapture || !requestedView || !latestAssistantMessage) {
      return;
    }

    const autoCaptureToken = `${latestAssistantMessage.createdAt}:${requestedView}`;
    if (lastAutoCaptureTokenRef.current === autoCaptureToken) {
      return;
    }

    lastAutoCaptureTokenRef.current = autoCaptureToken;
    scheduleRequestedCapture(requestedView, "requested");
  }, [assistantSpeaking, listening, loading, messages, session]);

  const liveTranscript = listening ? transcript : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#15324a_0%,#0f172a_38%,#081018_100%)] text-white">
      <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-3 sm:px-5 lg:min-h-screen lg:grid-cols-[minmax(0,1.55fr)_380px] lg:gap-5 lg:px-6 lg:py-5">
        <div className="flex min-w-0 flex-col gap-4">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl shadow-black/30 lg:min-h-[calc(100vh-2.5rem)]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="aspect-[4/5] h-full min-h-[28rem] w-full bg-black object-cover object-center sm:aspect-[16/10] lg:absolute lg:inset-0 lg:aspect-auto lg:min-h-0"
          />

          {!isReady && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <Spinner size={10} />
            </div>
          )}

          {pendingCaptureRequest && captureCountdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 p-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/65 px-7 py-6 text-center shadow-2xl backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.28em] text-brand-green/80">Requested View</p>
                <p className="mt-3 max-w-sm text-lg font-medium text-white">{pendingCaptureRequest}</p>
                <div className="mt-5 text-5xl font-semibold text-brand-green">{captureCountdown}</div>
                <p className="mt-3 text-sm text-slate-300">Hold the camera steady while Fix-It-Flow captures the image.</p>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/85 via-black/30 to-transparent p-4 sm:p-5">
            <div className="max-w-[75%] rounded-full border border-white/10 bg-black/50 px-3 py-2 text-sm text-slate-200 backdrop-blur-sm">
              {session?.currentViewRequest ?? "Point the camera at the item you want help with."}
            </div>
            <div className="rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-brand-green backdrop-blur-sm">
              Live view
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent p-4 sm:p-5">
            <div className="flex items-end justify-between gap-3">
              <div className="max-w-[68%] rounded-[1.6rem] border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-md sm:px-5">
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
                          : loading
                            ? "Thinking..."
                            : voiceStatus}
                    </p>
                  </div>
                </div>
                {liveTranscript && (
                  <p className="mt-3 border-t border-white/10 pt-3 text-sm text-slate-200">
                    “{liveTranscript}”
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/45 p-2 backdrop-blur-md">
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
                    scheduleRequestedCapture(session?.currentViewRequest ?? "Show the current area clearly.", "manual");
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

          <AudioPlayer
            src={audioUrl}
            fallbackText={spokenText}
            fallbackNonce={fallbackNonce}
            onPlaybackChange={handlePlaybackChange}
          />
        </section>

        {(cameraError || error) && (
          <ErrorBanner message={cameraError ?? error ?? "Unknown error"} onDismiss={() => setError(null)} />
        )}
        </div>{/* end left column */}

        <section className="lg:sticky lg:top-5 lg:h-[calc(100vh-2.5rem)]">
          <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-brand-green/80">Conversation</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Guided inspection</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Keep talking naturally. The assistant should guide what to show next.
                </p>
              </div>
              {session && (
                <p className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300">
                  {session.frames.length} frames reviewed
                </p>
              )}
            </div>
            </div>

            {session?.latestFinding && (
              <div className="mx-5 mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Current read</p>
                  <p className="rounded-full bg-brand-green/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-brand-green">
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

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
              {messages.length === 0 && (
                <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-400">
                  Tap the mic, describe what is wrong, and keep the item in view. The first thing you say starts the session.
                </div>
              )}

              {messages.map((entry, index) => (
                <div
                  key={`${entry.createdAt}-${index}`}
                  className={`max-w-[92%] rounded-[1.4rem] border px-4 py-3 text-sm leading-6 shadow-sm ${
                    entry.role === "assistant"
                      ? "self-start border-white/10 bg-white/8 text-white"
                      : "self-end border-brand-green/20 bg-brand-green text-brand-dark"
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
