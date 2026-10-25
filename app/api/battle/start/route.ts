import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { createBattle, saveBattle, toBattleView } from "@/lib/battle";
import { ASTRAL_CARDS, CELESTE_CARDS, DEFAULT_REVEALED_CARD_IDS } from "@/lib/cards";
import { getRevealedCards } from "@/lib/profile";
import { randomUUID } from "crypto";

const ALL_BATTLE_CARD_IDS = new Set(
  [...ASTRAL_CARDS, ...CELESTE_CARDS].map((c) => c.id)
);

/** Fallback deck for profiles with zero revealed battle cards. Uses the same
 *  default set as fresh profiles so vuln-reward cards stay locked. */
const STARTER_CARD_IDS = DEFAULT_REVEALED_CARD_IDS.filter((id) =>
  ALL_BATTLE_CARD_IDS.has(id)
);

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const revealed = await getRevealedCards(userId);
  const playerCardIds = [...new Set(revealed.filter((id) => ALL_BATTLE_CARD_IDS.has(id)))];

  // Fall back to Common starter cards so new users can still battle
  const deckIds = playerCardIds.length > 0 ? playerCardIds : STARTER_CARD_IDS;

  const battleId = randomUUID();
  const battle = createBattle(battleId, userId, deckIds);
  await saveBattle(battle);

  return NextResponse.json({ battle: toBattleView(battle) });
}
