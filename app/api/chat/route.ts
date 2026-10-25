import { NextResponse } from "next/server";
import { chatWithTools } from "@/lib/bedrock";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { containsExecutableHtml, evaluateResponse } from "@/lib/overseer";
import { verifyPdfContext } from "@/lib/pdf-context";
import { recordXssCandidate } from "@/lib/profile";

// ── POST — JSON API used by the ChatWindow component ─────────────────────────
export async function POST(request: Request) {
  try {
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

    const body = await request.json() as {
      message?: string;
      history?: { role: string; content: string }[];
      pdfContext?: string;
      pdfToken?: string;
    };

    if (!body.message?.trim()) {
      return NextResponse.json({ message: "message is required." }, { status: 400 });
    }

    // Document context is only accepted if it came out of /api/chat/upload
    // (and therefore passed the visual injection scanner).
    if (body.pdfContext && !verifyPdfContext(userId, body.pdfContext, body.pdfToken)) {
      return NextResponse.json(
        { message: "Document context must come from an uploaded PDF. Please re-upload the file." },
        { status: 400 }
      );
    }

    const output = await chatWithTools({
      message: body.message.trim(),
      history: body.history,
      pdfContext: body.pdfContext,
      userId
    });

    let newlyRevealed: string[] = [...(output.toolUnlocked ?? [])];
    try {
      const result = await evaluateResponse(userId, output.output);
      newlyRevealed = [...new Set([...newlyRevealed, ...result.newlyRevealed])];
      if (containsExecutableHtml(output.output)) {
        await recordXssCandidate(userId, !!body.pdfContext);
      }
    } catch {
      // Overseer errors must never break chat
    }

    return NextResponse.json({ ...output, newlyRevealed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
