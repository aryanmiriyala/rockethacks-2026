import { NextRequest, NextResponse } from "next/server";
import { createInspectionSession } from "@/server/services/inspection";
import type {
  CreateInspectionSessionRequest,
  CreateInspectionSessionResponse,
} from "@/shared/types";

export async function POST(req: NextRequest) {
  try {
    const body: CreateInspectionSessionRequest = await req.json();

    if (!body.userProblem?.trim()) {
      return NextResponse.json({ error: "userProblem is required" }, { status: 400 });
    }

    const session = await createInspectionSession(body);
    return NextResponse.json({ session } satisfies CreateInspectionSessionResponse, { status: 201 });
  } catch (error) {
    console.error("Inspection session creation failed:", error);
    const message =
      error instanceof Error ? error.message : "Could not create inspection session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
