"use client";

// feat/repair-walkthrough — owns this hook
import { useState, useEffect, useCallback } from "react";
import type { RepairSession } from "@/lib/types";

export default function useRepairSession(sessionId: string) {
  const [session, setSession] = useState<RepairSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Fire Jaseci event to advance the graph
    await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event: "step_done" }),
    });

    await fetchSession();
  }, [session, sessionId, fetchSession]);

  const repeatStep = useCallback(async () => {
    if (!session) return;
    await fetch("/api/orchestrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event: "repeat" }),
    });
    await fetchSession();
  }, [session, sessionId, fetchSession]);

  return { session, loading, error, advanceStep, repeatStep, refresh: fetchSession };
}
