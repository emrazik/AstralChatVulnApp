import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { ASTRAL_CARDS, MYTHIC_CARDS } from "@/lib/cards";
import { getRevealedCards } from "@/lib/profile";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const revealed = new Set(await getRevealedCards(userId));

  const zodiacCards = ASTRAL_CARDS.map((card) => ({
    ...card,
    revealed: revealed.has(card.id)
  }));

  // Mythic cards are completely hidden until earned — the final-battle reward
  // should be a total surprise, not a locked slot in the grid.
  const mythicCards = MYTHIC_CARDS
    .filter((card) => revealed.has(card.id))
    .map((card) => ({ ...card, revealed: true }));

  return NextResponse.json({ cards: [...zodiacCards, ...mythicCards] });
}
