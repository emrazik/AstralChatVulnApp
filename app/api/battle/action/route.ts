import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { getBattle, saveBattle, processPlays, processAttacks, toBattleView } from "@/lib/battle";
import { getProfile, upsertProfile } from "@/lib/profile";
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

  await saveBattle(battle);

  if (battle.status !== "active") {
    const profile = await getProfile(userId);
    const wins = profile?.battleWins ?? 0;
    const losses = profile?.battleLosses ?? 0;
    if (battle.status === "playerWon") {
      await upsertProfile(userId, { battleWins: wins + 1 });
    } else {
      await upsertProfile(userId, { battleLosses: losses + 1 });
    }
  }

  return NextResponse.json({
    battle: toBattleView(battle),
    combatEvents: combatEvents.length > 0 ? combatEvents : undefined,
    errors: errors.length > 0 ? errors : undefined
  });
}
