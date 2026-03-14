// feat/session-aws — owns this route
import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/services/dynamodb";
import type { UpdateSessionRequest } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getSession(params.sessionId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const patch: UpdateSessionRequest = await req.json();
  const updated = await updateSession(params.sessionId, patch);
  return NextResponse.json(updated);
}
