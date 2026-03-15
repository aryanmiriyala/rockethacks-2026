// feat/llm-steps — owns this route
import { NextRequest, NextResponse } from "next/server";
import { generateRepairStep } from "@/server/services/repair";
import type { RepairStepRequest, RepairStepResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  const body: RepairStepRequest = await req.json();
  const step = await generateRepairStep(body);
  return NextResponse.json({ step } satisfies RepairStepResponse);
}
