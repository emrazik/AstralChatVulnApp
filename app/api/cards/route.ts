import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { ASTRAL_CARDS } from "@/lib/cards";
import { getRevealedCards } from "@/lib/profile";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const revealed = new Set(await getRevealedCards(userId));
  const cards = ASTRAL_CARDS.map((card) => ({
    ...card,
    revealed: revealed.has(card.id)
  }));

  return NextResponse.json({ cards });
}
