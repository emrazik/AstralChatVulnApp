import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { createBattle, saveBattle, toBattleView } from "@/lib/battle";
import { randomUUID } from "crypto";

export async function POST() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const battleId = randomUUID();
  const battle = createBattle(battleId, userId);
  await saveBattle(battle);

  return NextResponse.json({ battle: toBattleView(battle) });
}
