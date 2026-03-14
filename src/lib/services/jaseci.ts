// feat/jaseci-orchestration — owns this file
import type { OrchestrateResponse } from "@/lib/types";

export async function triggerRepairGraph(
  sessionId: string,
  event: "start" | "step_done" | "skip" | "repeat",
  payload?: Record<string, unknown>
): Promise<OrchestrateResponse> {
  const res = await fetch(process.env.JASECI_LAMBDA_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.JASECI_API_KEY!,
    },
    body: JSON.stringify({ sessionId, event, payload }),
  });

  if (!res.ok) throw new Error(`Jaseci Lambda error: ${res.status}`);
  return res.json();
}
