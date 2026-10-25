import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getBattle, saveBattle, processPlays, processAttacks, toBattleView, BattleConflictError } from "@/lib/battle";
import { getProfile, getRevealedCards, revealCards, incrementBattleStat } from "@/lib/profile";
import { getMythicCardForZodiac, VULN_REWARD_CARD_IDS } from "@/lib/cards";
import type { PlayAction, AttackAction } from "@/lib/battle";

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: { battleId: string; plays?: PlayAction[]; attacks?: AttackAction[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  if (!body.battleId) {
    return NextResponse.json({ message: "Missing battleId" }, { status: 400 });
  }

  const battle = await getBattle(body.battleId);
  if (!battle) {
    return NextResponse.json({ message: "Battle not found" }, { status: 404 });
  }
  if (battle.userId !== userId) {
    return NextResponse.json({ message: "Not your battle" }, { status: 403 });
  }
  if (battle.status !== "active") {
    return NextResponse.json({ message: "Battle already finished", battle: toBattleView(battle) }, { status: 400 });
  }

  let errors: string[] = [];
  let combatEvents: import("@/lib/battle").CombatEvent[] = [];

  if (battle.phase === "play") {
    errors = processPlays(battle, body.plays ?? []);
  } else if (battle.phase === "attack") {
    const result = processAttacks(battle, body.attacks ?? []);
    errors = result.errors;
    combatEvents = result.combatEvents;
  } else {
    return NextResponse.json({ message: `Unexpected phase: ${battle.phase}` }, { status: 400 });
  }

  try {
    await saveBattle(battle);
  } catch (err) {
    if (err instanceof BattleConflictError) {
      const fresh = await getBattle(body.battleId);
      return NextResponse.json(
        {
          message: err.message,
          battle: fresh ? toBattleView(fresh) : undefined
        },
        { status: 409 }
      );
    }
    throw err;
  }

  const newlyRevealed: string[] = [];
  if (battle.status !== "active") {
    if (battle.status === "playerWon") {
      await incrementBattleStat(userId, "battleWins");

      // Final-battle reward: when every vulnerability card is already unlocked,
      // reveal the zodiac-matched Mythic card (once).
      const profile = await getProfile(userId);
      const revealed = new Set(await getRevealedCards(userId));
      const hasAllVulnCards = VULN_REWARD_CARD_IDS.every((id) => revealed.has(id));
      if (hasAllVulnCards && profile?.zodiacSign) {
        const mythic = getMythicCardForZodiac(profile.zodiacSign);
        if (mythic && !revealed.has(mythic.id)) {
          await revealCards(userId, [mythic.id]);
          newlyRevealed.push(mythic.id);
        }
      }
    } else {
      await incrementBattleStat(userId, "battleLosses");
    }
  }

  return NextResponse.json({
    battle: toBattleView(battle),
    combatEvents: combatEvents.length > 0 ? combatEvents : undefined,
    errors: errors.length > 0 ? errors : undefined,
    newlyRevealed: newlyRevealed.length > 0 ? newlyRevealed : undefined
  });
}
