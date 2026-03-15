// feat/session-aws — owns this route
import { NextRequest, NextResponse } from "next/server";
import { getRepairSession, updateRepairSession } from "@/server/services/session";
import type { UpdateSessionRequest } from "@/shared/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getRepairSession(params.sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const patch: UpdateSessionRequest = await req.json();
  const updated = await updateRepairSession(params.sessionId, patch);
  return NextResponse.json(updated);
}
