"use client";

// feat/repair-walkthrough — owns this page
// Teammate: wire up useRepairSession, StepCard, StepProgress, VoiceButton, AudioPlayer

import { useEffect } from "react";
import { useParams } from "next/navigation";
import useRepairSession from "@/lib/hooks/useRepairSession";
import useSpeech from "@/lib/hooks/useSpeech";
import StepCard from "@/components/repair/StepCard";
import StepProgress from "@/components/repair/StepProgress";
import RepairComplete from "@/components/repair/RepairComplete";
import VoiceButton from "@/components/voice/VoiceButton";
import AudioPlayer from "@/components/voice/AudioPlayer";
import Spinner from "@/components/ui/Spinner";
import ErrorBanner from "@/components/ui/ErrorBanner";

export default function RepairSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { session, loading, error, advanceStep, repeatStep } = useRepairSession(sessionId);
  const { speak, audioUrl, listening, startListening } = useSpeech();

  const currentStep = session?.steps[session.currentStepNumber - 1];

  // Speak the current step instruction when it changes
  useEffect(() => {
    if (currentStep?.voicePrompt) {
      speak(currentStep.voicePrompt);
    }
  }, [currentStep?.stepNumber]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;
  if (error) return <div className="p-6"><ErrorBanner message={error} /></div>;
  if (!session) return null;
  if (session.status === "complete") return <RepairComplete session={session} />;

  return (
    <main className="flex min-h-screen flex-col px-4 py-6 gap-4 max-w-lg mx-auto">
      {session.identification && (
        <div className="text-center">
          <p className="text-brand-muted text-sm">Repairing</p>
          <h2 className="text-xl font-bold text-white">{session.identification.device}</h2>
          <p className="text-brand-green text-sm">{session.identification.part}</p>
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
