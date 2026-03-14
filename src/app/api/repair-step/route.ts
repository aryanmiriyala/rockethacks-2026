// feat/llm-steps — owns this route
import { NextRequest, NextResponse } from "next/server";
import { getRepairStep } from "@/lib/services/featherless";
import type { RepairStepRequest, RepairStepResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body: RepairStepRequest = await req.json();
  const step = await getRepairStep(body);
  return NextResponse.json({ step } satisfies RepairStepResponse);
}
