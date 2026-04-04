import { NextResponse } from "next/server";
import { chatWithTools } from "@/lib/bedrock";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { evaluateResponse } from "@/lib/overseer";

type ChatBody = {
  message?: string;
  history?: { role: string; content: string }[];
  pdfContext?: string;
};

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (isRateLimited(userId)) {
    return NextResponse.json(
      { message: "Rate limit exceeded. Please slow down." },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as ChatBody;
  if (!body.message?.trim()) {
    return NextResponse.json({ message: "message is required." }, { status: 400 });
  }

  try {
    const output = await chatWithTools({
      message: body.message.trim(),
      history: body.history,
      pdfContext: body.pdfContext
    });

    let newlyRevealed: string[] = [];
    try {
      const result = await evaluateResponse(userId, output.output);
      newlyRevealed = result.newlyRevealed;
    } catch {
      // Overseer errors must never break chat
    }

    return NextResponse.json({ ...output, newlyRevealed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
