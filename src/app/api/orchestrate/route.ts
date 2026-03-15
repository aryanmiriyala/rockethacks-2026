// feat/jaseci-orchestration — owns this route
import { NextRequest, NextResponse } from "next/server";
import { orchestrateRepair } from "@/server/services/orchestration";
import type { OrchestrateRequest, OrchestrateResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  const body: OrchestrateRequest = await req.json();
  const result = await orchestrateRepair(body);
  return NextResponse.json(result satisfies OrchestrateResponse);
}
