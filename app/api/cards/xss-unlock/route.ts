import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { revealCards, getRevealedCards } from "@/lib/profile";

const XSS_CARD_ID = "leo-solar-flare";
const IPI_CARD_ID = "gemini-mirror-strike";

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  let fromDocument = false;
  try {
    const body = (await request.json()) as { fromDocument?: boolean };
    fromDocument = !!body?.fromDocument;
  } catch {}
  try {
    const alreadyRevealed = new Set(await getRevealedCards(userId));
    const candidates = fromDocument ? [XSS_CARD_ID, IPI_CARD_ID] : [XSS_CARD_ID];
    const toReveal = candidates.filter((id) => !alreadyRevealed.has(id));
    if (toReveal.length > 0) {
      await revealCards(userId, toReveal);
    }
    return NextResponse.json({ unlocked: true, newlyRevealed: toReveal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlock card.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
