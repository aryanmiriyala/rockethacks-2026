"use client";

// feat/repair-walkthrough — owns this page
// Teammate: wire up useRepairSession, StepCard, StepProgress, VoiceButton, AudioPlayer

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import useRepairSession from "@/features/repair/hooks/useRepairSession";
import useSpeech from "@/features/voice/hooks/useSpeech";
import { useSpeechRecognition } from "@/features/voice/hooks/useSpeechRecognition";
import StepCard from "@/features/repair/components/StepCard";
import StepProgress from "@/features/repair/components/StepProgress";
import RepairComplete from "@/features/repair/components/RepairComplete";
import VoiceButton from "@/features/voice/components/VoiceButton";
import AudioPlayer from "@/features/voice/components/AudioPlayer";
import Spinner from "@/shared/ui/Spinner";
import ErrorBanner from "@/shared/ui/ErrorBanner";

export default function RepairSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, loading, error, advanceStep, repeatStep, repeatNonce } = useRepairSession(sessionId);
  const { speak, audioUrl } = useSpeech();
  const { listening, transcript, keyword, question, start, stop, clearResult } = useSpeechRecognition();
  const [voiceStatus, setVoiceStatus] = useState("");
  const currentStepRef = useRef(session?.steps[session.currentStepNumber - 1] ?? null);

  const currentStep = session?.steps[session.currentStepNumber - 1];
  currentStepRef.current = currentStep ?? null;

  // Speak the current step instruction when it changes
  useEffect(() => {
    if (currentStep?.voicePrompt) {
      speak(currentStep.voicePrompt);
    }
  }, [currentStep?.stepNumber, repeatNonce, speak, currentStep?.voicePrompt]);

  const askFollowUp = useCallback(async (userQuestion: string) => {
    const context = currentStepRef.current?.instruction ?? "";
    setVoiceStatus("Answering your question...");
    stop();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userQuestion, context }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? `Chat failed (${res.status})`);
      }

      if (data.answer) {
        speak(data.answer);
      }
      setVoiceStatus("Tap the mic to keep talking.");
    } catch (chatError) {
      setVoiceStatus(chatError instanceof Error ? chatError.message : "Voice question failed");
    }
  }, [speak, stop]);

  useEffect(() => {
    if (!keyword) {
      return;
    }

    clearResult();
    setVoiceStatus(`Heard "${keyword}"`);

    if (keyword === "done" || keyword === "next") {
      // Last step — complete the repair naturally, no need to say "end session"
      if (currentStepRef.current?.isTerminal) {
        stop();
        speak("Great job! The repair is complete. Well done.");
        advanceStep().catch(() => {});
        return;
      }
      advanceStep().catch((advanceError) => {
        setVoiceStatus(advanceError instanceof Error ? advanceError.message : "Could not advance step");
      });
      return;
    }

    if (keyword === "repeat") {
      repeatStep();
      return;
    }

    if (keyword === "help") {
      speak("Say done or next to move on, repeat to hear this step again, say end session to stop early, or ask a question about the repair.");
      return;
    }

    if (keyword === "stop") {
      stop();
      setVoiceStatus("Session ended.");
      speak("Session ended. Thanks for using Fix-It-Flow.");
    }
  }, [advanceStep, clearResult, keyword, repeatStep, speak, stop]);

  useEffect(() => {
    if (!question) {
      return;
    }

    clearResult();
    askFollowUp(question);
  }, [askFollowUp, clearResult, question]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;
  if (!session) return null;
  if (session.status === "complete") return <RepairComplete session={session} />;

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 gap-4 max-w-lg mx-auto">
      {session.identification && (
        <div className="flex flex-col gap-2">
          <div className="text-center">
            <p className="text-brand-muted text-sm">Repairing</p>
            <h2 className="text-xl font-bold text-white">{session.identification.device}</h2>
            <p className="text-brand-green text-sm">{session.identification.part}</p>
          </div>
          {session.identification.problemObservation && (
            <div className="bg-brand-surface rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-brand-green mb-1">What we found</p>
              <p className="text-sm text-white leading-snug">{session.identification.problemObservation}</p>
            </div>
          )}
        </div>
      )}

      <StepProgress
        currentStep={session.currentStepNumber}
        totalSteps={session.steps.length}
      />

      {currentStep && (
        <StepCard
          step={currentStep}
          onDone={advanceStep}
          onRepeat={repeatStep}
        />
      )}

      <AudioPlayer src={audioUrl} />

      {(transcript || voiceStatus) && (
        <div className="rounded-lg bg-brand-surface px-4 py-3">
          {transcript && (
            <p className="text-sm text-white">
              <span className="mr-2 text-xs uppercase tracking-wide text-brand-muted">Heard</span>
              {transcript}
            </p>
          )}
          {voiceStatus && (
            <p className="mt-1 text-xs text-brand-muted">{voiceStatus}</p>
          )}
        </div>
      )}

      <VoiceButton
        listening={listening}
        onPress={() => {
          setVoiceStatus("Listening...");
          start();
        }}
        onVoiceCommand={() => {}}
      />
    </main>
  );
}
