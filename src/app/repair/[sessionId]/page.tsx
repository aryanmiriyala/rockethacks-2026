"use client";

// feat/repair-walkthrough — owns this page
// Teammate: wire up useRepairSession, StepCard, StepProgress, VoiceButton, AudioPlayer

import { useEffect } from "react";
import { useParams } from "next/navigation";
import useRepairSession from "@/features/repair/hooks/useRepairSession";
import useSpeech from "@/features/voice/hooks/useSpeech";
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
  const { speak, audioUrl, listening, startListening } = useSpeech();

  const currentStep = session?.steps[session.currentStepNumber - 1];

  // Speak the current step instruction when it changes
  useEffect(() => {
    if (currentStep?.voicePrompt) {
      speak(currentStep.voicePrompt);
    }
  }, [currentStep?.stepNumber, repeatNonce, speak, currentStep?.voicePrompt]);

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

      <VoiceButton
        listening={listening}
        onPress={startListening}
        onVoiceCommand={(cmd) => {
          if (cmd === "done" || cmd === "next") advanceStep();
          if (cmd === "repeat") repeatStep();
        }}
      />
    </main>
  );
}
