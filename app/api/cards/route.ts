import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { ASTRAL_CARDS, CELESTE_CARDS } from "@/lib/cards";
import { getRevealedCards } from "@/lib/profile";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const revealed = new Set(await getRevealedCards(userId));

  // Base zodiac cards — always visible (locked or revealed)
  const zodiacCards = ASTRAL_CARDS.map((card) => ({
    ...card,
    revealed: revealed.has(card.id)
  }));

  // Achievement/Celeste cards — only appear once unlocked
  const celesteCards = CELESTE_CARDS
    .filter((card) => revealed.has(card.id))
    .map((card) => ({ ...card, revealed: true }));

  return NextResponse.json({ cards: [...zodiacCards, ...celesteCards] });
}
