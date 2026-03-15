// feat/voice — conversational follow-up Q&A
// Uses Featherless.AI when FEATHERLESS_API_KEY is set; stubs otherwise.
// This is separate from /api/repair-step which generates structured steps.

import { NextRequest, NextResponse } from "next/server";

interface ChatRequest {
  question: string;
  context?: string; // current repair step instruction
}

interface ChatResponse {
  answer: string;
}

async function askFeatherless(question: string, context: string): Promise<string> {
  const res = await fetch("https://api.featherless.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FEATHERLESS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.FEATHERLESS_MODEL ?? "meta-llama/Meta-Llama-3.1-8B-Instruct",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly repair mentor helping a user fix a household appliance. " +
            "Answer their question clearly and concisely in 1-2 sentences. " +
            "Always end by encouraging them to continue or say 'done' when ready.",
        },
        {
          role: "user",
          content: `Current repair step: "${context}"\n\nUser question: "${question}"`,
        },
      ],
      temperature: 0.4,
      max_tokens: 120,
    }),
  });

  if (!res.ok) throw new Error(`Featherless error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export async function POST(req: NextRequest): Promise<NextResponse<ChatResponse | { error: string }>> {
  const { question, context }: ChatRequest = await req.json();

  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const ctx = context ?? "this repair step";

  try {
    if (process.env.FEATHERLESS_API_KEY) {
      const answer = await askFeatherless(question, ctx);
      return NextResponse.json({ answer });
    }

    // Stub until Featherless API key is set
    const answer = `Good question. In the context of ${ctx} — take your time and proceed carefully. Say 'repeat' to hear the step again, or 'done' when you're ready to continue.`;
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Chat request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
