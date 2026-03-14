// feat/jaseci-orchestration — owns this route
import { NextRequest, NextResponse } from "next/server";
import { triggerRepairGraph } from "@/lib/services/jaseci";
import type { OrchestrateRequest, OrchestrateResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body: OrchestrateRequest = await req.json();
  const result = await triggerRepairGraph(body.sessionId, body.event, body.payload);
  return NextResponse.json(result satisfies OrchestrateResponse);
}
