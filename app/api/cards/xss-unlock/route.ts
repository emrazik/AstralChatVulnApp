import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { revealCards, getRevealedCards } from "@/lib/profile";

// XSS unlock + Indirect Prompt Injection unlock — both user ASTRAL_CARDS
const XSS_CARD_IDS = ["scorpio-abyssal-sting", "gemini-mirror-strike"];

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  try {
    const alreadyRevealed = new Set(await getRevealedCards(userId));
    const toReveal = XSS_CARD_IDS.filter((id) => !alreadyRevealed.has(id));
    if (toReveal.length > 0) {
      await revealCards(userId, toReveal);
    }
    return NextResponse.json({ unlocked: true, newlyRevealed: toReveal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to unlock card.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
