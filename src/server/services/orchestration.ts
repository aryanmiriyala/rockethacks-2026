import { triggerRepairGraph } from "@/server/clients/jaseci";
import type { OrchestrateRequest, OrchestrateResponse } from "@/shared/types";

export async function orchestrateRepair(
  request: OrchestrateRequest
): Promise<OrchestrateResponse> {
  return triggerRepairGraph(request.sessionId, request.event, request.payload);
}
