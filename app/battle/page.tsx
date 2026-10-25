"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Swords, Trophy, Skull } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { BattleBoard } from "@/components/BattleBoard";
import { AchievementDialog } from "@/components/AchievementDialog";
import { Button } from "@/components/ui/button";
import { lookupCardById, type AstralCard } from "@/lib/cards";
import type { BattleView, CombatEvent, PlayAction, AttackAction } from "@/lib/battle";

type Achievement = {
  card: AstralCard;
  title: string;
  subtitle: string;
  description: string;
};

function BattleInner() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [battle, setBattle] = useState<BattleView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ wins: number; losses: number } | null>(null);

  const [combatEvents, setCombatEvents] = useState<CombatEvent[]>([]);
  const [preAttackSnapshot, setPreAttackSnapshot] = useState<BattleView | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);

  function queueMythicReveal(newlyRevealed: string[] | undefined) {
    if (!newlyRevealed) return;
    for (const id of newlyRevealed) {
      if (!id.endsWith("-mythic-ascendant")) continue;
      const card = lookupCardById(id);
      if (!card) continue;
      setAchievementQueue((q) => [...q, {
        card,
        title: "Final Battle Victory",
        subtitle: "> Mythic Ascension Unlocked",
        description: "You conquered the final battle with every vulnerability reward already in hand. The stars themselves bent to forge a mythic card bound to your sign — awarded only to those who complete the trial in full."
      }]);
    }
  }
  const battleRef = useRef<BattleView | null>(null);
  battleRef.current = battle;

  useEffect(() => {
    if (!authLoading && !session?.authenticated) {
      router.push("/login");
    }
  }, [authLoading, session, router]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/battle/history");
        if (res.ok) setStats(await res.json());
      } catch { /* ignore */ }
    }
    if (session?.authenticated) fetchStats();
  }, [session]);

  const startBattle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCombatEvents([]);
    setPreAttackSnapshot(null);
    try {
      const res = await fetch("/api/battle/start", { method: "POST" });
      if (!res.ok) throw new Error("Failed to start battle");
      const data = await res.json();
      setBattle(data.battle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitPlays = useCallback(async (plays: PlayAction[]) => {
    if (!battleRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battle/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: battleRef.current.battleId, plays }),
      });
      if (!res.ok) throw new Error("Failed to submit plays");
      const data = await res.json();
      setBattle(data.battle);

      if (data.battle.status !== "active") {
        const sr = await fetch("/api/battle/history");
        if (sr.ok) setStats(await sr.json());
        queueMythicReveal(data.newlyRevealed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const submitAttacks = useCallback(async (attacks: AttackAction[]) => {
    if (!battleRef.current) return;
    const snapshot = battleRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/battle/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battleId: snapshot.battleId, attacks }),
      });
      if (!res.ok) throw new Error("Failed to submit attacks");
      const data = await res.json();
      setPreAttackSnapshot(snapshot);
      setCombatEvents(data.combatEvents ?? []);
      setBattle(data.battle);

      if (data.battle.status !== "active") {
        const sr = await fetch("/api/battle/history");
        if (sr.ok) setStats(await sr.json());
        queueMythicReveal(data.newlyRevealed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnimationComplete = useCallback(() => {
    setCombatEvents([]);
    setPreAttackSnapshot(null);
  }, []);

  const handleNewBattle = useCallback(() => {
    setBattle(null);
    setCombatEvents([]);
    setPreAttackSnapshot(null);
  }, []);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (!session?.authenticated) return null;

  const mythicDialog = (
    <AchievementDialog
      card={achievementQueue[0]?.card ?? null}
      open={achievementQueue.length > 0}
      onClose={() => setAchievementQueue((q) => q.slice(1))}
      title={achievementQueue[0]?.title}
      subtitle={achievementQueue[0]?.subtitle}
      description={achievementQueue[0]?.description}
    />
  );

  if (!battle) {
    return (
      <>
        {mythicDialog}
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 border border-indigo-400/20">
          <Swords className="h-10 w-10 text-indigo-300" />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-astral-text">Battle Celeste</h1>
          <p className="mt-2 text-sm text-astral-textMuted">
            Challenge the celestial AI to a 3v3 card battle. Play cards from your hand onto the grid,
            then command them to attack. Destroy Celeste&apos;s cards and reduce her HP to zero to win.
          </p>
        </div>

        {stats && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-sm text-astral-text"><span className="font-bold">{stats.wins}</span> wins</span>
            </div>
            <div className="flex items-center gap-2">
              <Skull className="h-4 w-4 text-red-400" />
              <span className="text-sm text-astral-text"><span className="font-bold">{stats.losses}</span> losses</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button onClick={startBattle} disabled={loading} size="lg"
          className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white hover:from-indigo-600 hover:to-fuchsia-600">
          {loading ? "Starting..." : "Start Battle"}
        </Button>

        <div className="mt-4 space-y-2 rounded-lg border border-indigo-400/10 bg-slate-900/40 p-4 text-left text-xs text-astral-textMuted">
          <h3 className="font-semibold text-astral-text">How to Play</h3>
          <ul className="list-disc space-y-1 pl-4">
            <li>Each side has 12 cards and 3 grid slots</li>
            <li>Draw up to 6 cards each turn</li>
            <li>Play cards from your hand onto empty grid slots</li>
            <li>Assign attacks — target enemy cards, or attack Celeste directly if the slot ahead is empty</li>
            <li>Cards have 10 HP each. Players start with 30 HP</li>
            <li>Reduce Celeste&apos;s HP to 0 to win</li>
          </ul>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
      {mythicDialog}
    <div className="mx-auto max-w-2xl px-4 py-6">
      <BattleBoard
        battle={battle}
        combatEvents={combatEvents.length > 0 ? combatEvents : undefined}
        preAttackSnapshot={preAttackSnapshot}
        onSubmitPlays={submitPlays}
        onSubmitAttacks={submitAttacks}
        onAnimationComplete={handleAnimationComplete}
        onNewBattle={handleNewBattle}
        loading={loading}
      />
      {error && <p className="mt-2 text-center text-sm text-red-400">{error}</p>}
    </div>
    </>
  );
}

export default function BattlePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    }>
      <BattleInner />
    </Suspense>
  );
}
