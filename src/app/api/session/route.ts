// feat/session-aws — owns this route
import { NextRequest, NextResponse } from "next/server";
import { createRepairSession } from "@/server/services/session";
import type { CreateSessionRequest, CreateSessionResponse } from "@/shared/types";

export async function POST(req: NextRequest) {
  const { identification }: CreateSessionRequest = await req.json();

  const sessionId = await createRepairSession(identification);

  return NextResponse.json({ sessionId } satisfies CreateSessionResponse, { status: 201 });
}
