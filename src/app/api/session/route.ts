// feat/session-aws — owns this route
import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/services/dynamodb";
import type { CreateSessionRequest, CreateSessionResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  const { identification }: CreateSessionRequest = await req.json();

  const sessionId = await createSession(identification);

  return NextResponse.json({ sessionId } satisfies CreateSessionResponse, { status: 201 });
}
