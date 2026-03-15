import { NextRequest, NextResponse } from "next/server";
import { processInspectionTurn } from "@/server/services/inspection";
import type { InspectionTurnRequest, InspectionTurnResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  try {
    const body: InspectionTurnRequest = await req.json();

    if (!body.sessionId?.trim()) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    if (!body.transcript?.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }

    const result = await processInspectionTurn(body);
    return NextResponse.json(result satisfies InspectionTurnResponse);
  } catch (error) {
    console.error("Inspection turn failed:", error);
    const message =
      error instanceof Error ? error.message : "Inspection turn failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
