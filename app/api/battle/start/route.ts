import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { createBattle, saveBattle, toBattleView } from "@/lib/battle";
import { ASTRAL_CARDS, CELESTE_CARDS } from "@/lib/cards";
import { getRevealedCards } from "@/lib/profile";
import { randomUUID } from "crypto";

const ALL_BATTLE_CARD_IDS = new Set(
  [...ASTRAL_CARDS, ...CELESTE_CARDS].map((c) => c.id)
);

/** Cards every user has access to regardless of unlocks — keeps the game playable from day one. */
const STARTER_CARD_IDS = ASTRAL_CARDS
  .filter((c) => c.rarity === "Common")
  .map((c) => c.id);

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const revealed = await getRevealedCards(userId);
  const playerCardIds = revealed.filter((id) => ALL_BATTLE_CARD_IDS.has(id));

  // Fall back to Common starter cards so new users can still battle
  const deckIds = playerCardIds.length > 0 ? playerCardIds : STARTER_CARD_IDS;

  const battleId = randomUUID();
  const battle = createBattle(battleId, userId, deckIds);
  await saveBattle(battle);

  return NextResponse.json({ battle: toBattleView(battle) });
}
