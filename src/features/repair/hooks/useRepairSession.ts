"use client";

// feat/repair-walkthrough — owns this hook
import { useState, useEffect, useCallback } from "react";
import type { RepairSession } from "@/shared/types";

export default function useRepairSession(sessionId: string) {
  const [session, setSession] = useState<RepairSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repeatNonce, setRepeatNonce] = useState(0);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (!res.ok) throw new Error("Failed to load session");
      const data: RepairSession = await res.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const advanceStep = useCallback(async () => {
    if (!session) return;
    const currentStep = session.steps[session.currentStepNumber - 1];

    if (currentStep?.isTerminal) {
      await fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "complete" }),
      });
      await fetchSession();
      return;
    }

    const nextStepNumber = session.currentStepNumber + 1;
    const existingStep = session.steps[nextStepNumber - 1];

    if (existingStep) {
      await fetch(`/api/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStepNumber: nextStepNumber,
          status: existingStep.isTerminal ? "complete" : "in_progress",
        }),
      });
      await fetchSession();
      return;
    }

    const identification = session.identification;
    if (!identification) return;

    const stepRes = await fetch("/api/repair-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        device: identification.device,
        part: identification.part,
        stepNumber: nextStepNumber,
        previousSteps: session.steps.map((step) => step.instruction),
        problemObservation: identification.problemObservation,
      }),
    });

    if (!stepRes.ok) {
      throw new Error("Failed to generate next repair step");
    }

    const { step } = await stepRes.json();

    await fetch(`/api/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentStepNumber: nextStepNumber,
        status: step.isTerminal ? "complete" : "in_progress",
        steps: [...session.steps, step],
      }),
    });

    await fetchSession();
  }, [session, sessionId, fetchSession]);

  const repeatStep = useCallback(async () => {
    setRepeatNonce((value) => value + 1);
  }, []);

  return { session, loading, error, advanceStep, repeatStep, repeatNonce, refresh: fetchSession };
}
