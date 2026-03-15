import { NextRequest, NextResponse } from "next/server";
import { getInspectionSession, updateInspectionSession } from "@/server/services/inspection";
import type { UpdateInspectionSessionRequest } from "@/shared/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getInspectionSession(params.sessionId);
  if (!session) {
    return NextResponse.json({ error: "Inspection session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const patch: UpdateInspectionSessionRequest = await req.json();
  const updated = await updateInspectionSession(params.sessionId, patch);
  return NextResponse.json(updated);
}
