"use client";

// feat/repair-walkthrough — owns this component
import type { RepairStep } from "@/lib/types";
import Button from "@/components/ui/Button";

interface Props {
  step: RepairStep;
  onDone: () => void;
  onRepeat: () => void;
}

export default function StepCard({ step, onDone, onRepeat }: Props) {
  return (
    <div className="rounded-2xl bg-brand-surface p-6 space-y-6">
      <div className="space-y-2">
        <span className="text-brand-green text-sm font-semibold uppercase tracking-wider">
          Step {step.stepNumber}
        </span>
        <p className="text-white text-xl leading-relaxed">
          {step.instruction}
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onRepeat} className="flex-1 text-sm">
          Repeat
        </Button>
        <Button variant="primary" onClick={onDone} className="flex-1">
          {step.isTerminal ? "All Done!" : "Done"}
        </Button>
      </div>
    </div>
  );
}
