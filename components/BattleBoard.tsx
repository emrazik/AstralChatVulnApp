"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { Sparkles, Heart, Layers, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { lookupCardById } from "@/lib/cards";
import { BattleCard, EmptySlot } from "@/components/BattleCard";
import { Button } from "@/components/ui/button";
import type { BattleView, CombatEvent, PlayAction, AttackAction, GridSlot } from "@/lib/battle";

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

type ArrowLine = {
  key: string;
  x1: number; y1: number;
  x2: number; y2: number;
  type: "targeting" | "combat";
};

type AnimPhase = "arrow" | "lunge" | "impact" | "destroy";
type DmgPopup = { id: number; slotKey: string; value: number; dodged: boolean };

type Props = {
  battle: BattleView;
  combatEvents?: CombatEvent[];
  preAttackSnapshot?: BattleView | null;
  onSubmitPlays: (plays: PlayAction[]) => Promise<void>;
  onSubmitAttacks: (attacks: AttackAction[]) => Promise<void>;
  onAnimationComplete: () => void;
  onNewBattle: () => void;
  loading: boolean;
};

export function BattleBoard({
  battle,
  combatEvents,
  preAttackSnapshot,
  onSubmitPlays,
  onSubmitAttacks,
  onAnimationComplete,
  onNewBattle,
  loading,
}: Props) {
  /* ------------------------------------------------------------------ */
  /*  Play / Attack interaction state                                    */
  /* ------------------------------------------------------------------ */
  const [selectedHandCard, setSelectedHandCard] = useState<string | null>(null);
  const [selectedAttacker, setSelectedAttacker] = useState<number | null>(null);
  const [pendingPlays, setPendingPlays] = useState<PlayAction[]>([]);
  const [pendingAttacks, setPendingAttacks] = useState<AttackAction[]>([]);
  const [localHand, setLocalHand] = useState<string[]>(battle.player.hand);
  const [localGrid, setLocalGrid] = useState(battle.player.grid);

  /* ------------------------------------------------------------------ */
  /*  Animation state                                                    */
  /* ------------------------------------------------------------------ */
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayState, setDisplayState] = useState<{
    playerGrid: (GridSlot | null)[];
    celesteGrid: (GridSlot | null)[];
    playerHp: number;
    celesteHp: number;
  } | null>(null);
  const [animEvent, setAnimEvent] = useState<{ event: CombatEvent; phase: AnimPhase } | null>(null);
  const [dmgPopups, setDmgPopups] = useState<DmgPopup[]>([]);
  const [arrows, setArrows] = useState<ArrowLine[]>([]);

  /* ------------------------------------------------------------------ */
  /*  Refs                                                               */
  /* ------------------------------------------------------------------ */
  const boardRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dmgId = useRef(0);
  const lastSyncKey = useRef(`${battle.battleId}-${battle.turn}-${battle.phase}`);
  const animGeneration = useRef(0);

  /* ------------------------------------------------------------------ */
  /*  Sync local state on battle prop change (skip during animation)     */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const key = `${battle.battleId}-${battle.turn}-${battle.phase}`;
    const hasPendingAnim = combatEvents && combatEvents.length > 0;
    if (key !== lastSyncKey.current && !isAnimating && !hasPendingAnim) {
      setLocalHand(battle.player.hand);
      setLocalGrid(battle.player.grid);
      setPendingPlays([]);
      setPendingAttacks([]);
      setSelectedHandCard(null);
      setSelectedAttacker(null);
      lastSyncKey.current = key;
    }
  }, [battle, isAnimating, combatEvents]);

  /* ------------------------------------------------------------------ */
  /*  Animation trigger                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!combatEvents || combatEvents.length === 0 || !preAttackSnapshot) return;

    const gen = ++animGeneration.current;

    (async () => {
      setIsAnimating(true);

      const alive = () => animGeneration.current === gen;

      const state = {
        playerGrid: preAttackSnapshot.player.grid.map(s => s ? { ...s, buffs: [...s.buffs] } : null),
        celesteGrid: preAttackSnapshot.celeste.grid.map(s => s ? { ...s, buffs: [...s.buffs] } : null),
        playerHp: preAttackSnapshot.player.hp,
        celesteHp: preAttackSnapshot.celeste.hp,
      };
      setDisplayState({ ...state });
      await wait(500);

      for (const ev of combatEvents) {
        if (!alive()) return;

        setAnimEvent({ event: ev, phase: "arrow" });
        await wait(450);
        if (!alive()) return;

        setAnimEvent({ event: ev, phase: "lunge" });
        await wait(850);
        if (!alive()) return;

        setAnimEvent({ event: ev, phase: "impact" });
        const targetSide = ev.attackerSide === "player" ? "celeste" : "player";
        const popupKey = ev.targetKind === "card" ? `${targetSide}-${ev.targetSlot}` : `${targetSide}-hp`;
        const pid = ++dmgId.current;
        setDmgPopups(p => [...p, { id: pid, slotKey: popupKey, value: ev.damage, dodged: ev.dodged }]);
        setTimeout(() => setDmgPopups(p => p.filter(d => d.id !== pid)), 950);

        if (ev.targetKind === "card") {
          const gk = targetSide === "celeste" ? "celesteGrid" : "playerGrid" as const;
          state[gk] = state[gk].map((s, i) =>
            i === ev.targetSlot && s ? { ...s, currentHp: Math.max(0, ev.newTargetHp) } : s
          );
        } else {
          const hk = targetSide === "celeste" ? "celesteHp" : "playerHp" as const;
          state[hk] = ev.newTargetHp;
        }
        setDisplayState({ ...state });
        await wait(600);
        if (!alive()) return;

        if (ev.destroyed && ev.targetKind === "card") {
          setAnimEvent({ event: ev, phase: "destroy" });
          await wait(750);
          if (!alive()) return;
          const gk = targetSide === "celeste" ? "celesteGrid" : "playerGrid" as const;
          state[gk] = state[gk].map((s, i) => (i === ev.targetSlot ? null : s));
          setDisplayState({ ...state });
        }

        setAnimEvent(null);
        await wait(300);
      }

      if (!alive()) return;

      setAnimEvent(null);
      setDisplayState(null);
      setDmgPopups([]);
      setIsAnimating(false);

      lastSyncKey.current = `${battle.battleId}-${battle.turn}-${battle.phase}`;
      setLocalHand(battle.player.hand);
      setLocalGrid(battle.player.grid);
      setPendingPlays([]);
      setPendingAttacks([]);
      setSelectedHandCard(null);
      setSelectedAttacker(null);

      onAnimationComplete();
    })();

    return () => { animGeneration.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combatEvents, preAttackSnapshot]);

  /* ------------------------------------------------------------------ */
  /*  Arrow geometry (layout effect so positions are fresh)              */
  /* ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) { setArrows([]); return; }
    const br = board.getBoundingClientRect();
    const next: ArrowLine[] = [];

    if (phase === "attack" && !isAnimating) {
      for (const atk of pendingAttacks) {
        const from = slotRefs.current[`player-${atk.fromSlot}`];
        const toKey = atk.target.kind === "card" ? `celeste-${atk.target.slotIndex}` : "celeste-hp";
        const to = slotRefs.current[toKey];
        if (from && to) {
          const fr = from.getBoundingClientRect();
          const tr = to.getBoundingClientRect();
          next.push({
            key: `t-${atk.fromSlot}`,
            x1: fr.left + fr.width / 2 - br.left,
            y1: fr.top + 2 - br.top,
            x2: tr.left + tr.width / 2 - br.left,
            y2: tr.top + tr.height - 2 - br.top,
            type: "targeting",
          });
        }
      }
    }

    if (animEvent && (animEvent.phase === "arrow" || animEvent.phase === "lunge")) {
      const e = animEvent.event;
      const from = slotRefs.current[`${e.attackerSide}-${e.attackerSlot}`];
      const ts = e.attackerSide === "player" ? "celeste" : "player";
      const toKey = e.targetKind === "card" ? `${ts}-${e.targetSlot}` : `${ts}-hp`;
      const to = slotRefs.current[toKey];
      if (from && to) {
        const fr = from.getBoundingClientRect();
        const tr = to.getBoundingClientRect();
        next.push({
          key: "combat",
          x1: fr.left + fr.width / 2 - br.left,
          y1: fr.top + fr.height / 2 - br.top,
          x2: tr.left + tr.width / 2 - br.left,
          y2: tr.top + tr.height / 2 - br.top,
          type: "combat",
        });
      }
    }

    setArrows(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAttacks, animEvent, isAnimating, displayState]);

  /* ------------------------------------------------------------------ */
  /*  Slot animation helpers                                             */
  /* ------------------------------------------------------------------ */
  function lungeStyle(slotKey: string): React.CSSProperties | undefined {
    if (!animEvent || animEvent.phase !== "lunge") return undefined;
    const e = animEvent.event;
    if (slotKey !== `${e.attackerSide}-${e.attackerSlot}`) return undefined;
    const from = slotRefs.current[slotKey];
    const ts = e.attackerSide === "player" ? "celeste" : "player";
    const toKey = e.targetKind === "card" ? `${ts}-${e.targetSlot}` : `${ts}-hp`;
    const to = slotRefs.current[toKey];
    if (!from || !to) return undefined;
    const fr = from.getBoundingClientRect();
    const tr = to.getBoundingClientRect();
    const dx = (tr.left + tr.width / 2) - (fr.left + fr.width / 2);
    const dy = (tr.top + tr.height / 2) - (fr.top + fr.height / 2);
    return {
      "--lunge-x": `${Math.round(dx * 0.85)}px`,
      "--lunge-y": `${Math.round(dy * 0.85)}px`,
      "--wb-x": `${Math.round(dx * -0.12)}px`,
      "--wb-y": `${Math.round(dy * -0.12)}px`,
    } as React.CSSProperties;
  }

  function wrapperAnim(slotKey: string): string {
    if (!animEvent) return "";
    const e = animEvent.event;
    if (slotKey === `${e.attackerSide}-${e.attackerSlot}` && animEvent.phase === "lunge") return "animate-battle-lunge";
    return "";
  }

  function cardAnim(slotKey: string): string {
    if (!animEvent) return "";
    const e = animEvent.event;
    const ts = e.attackerSide === "player" ? "celeste" : "player";
    const tKey = e.targetKind === "card" ? `${ts}-${e.targetSlot}` : "";
    if (slotKey === tKey && animEvent.phase === "impact") return e.dodged ? "animate-battle-dodge" : "animate-battle-impact";
    if (slotKey === tKey && animEvent.phase === "destroy") return "animate-battle-destroy";
    return "";
  }

  function hpBarAnim(side: "player" | "celeste"): string {
    if (!animEvent || animEvent.phase !== "impact") return "";
    if (animEvent.event.targetKind !== "player") return "";
    const ts = animEvent.event.attackerSide === "player" ? "celeste" : "player";
    return ts === side ? "animate-battle-direct-hit" : "";
  }

  /* ------------------------------------------------------------------ */
  /*  Derived rendering values                                           */
  /* ------------------------------------------------------------------ */
  const phase = battle.phase;
  const isFinished = battle.status !== "active";
  const blocked = isAnimating || loading;

  const pGrid = displayState ? displayState.playerGrid : (phase === "play" ? localGrid : battle.player.grid);
  const cGrid = displayState ? displayState.celesteGrid : battle.celeste.grid;
  const pHp = displayState ? displayState.playerHp : battle.player.hp;
  const cHp = displayState ? displayState.celesteHp : battle.celeste.hp;

  /* ------------------------------------------------------------------ */
  /*  Play-phase handlers                                                */
  /* ------------------------------------------------------------------ */
  const handleHandCardClick = (cardId: string) => {
    if (phase !== "play" || blocked) return;
    setSelectedHandCard(selectedHandCard === cardId ? null : cardId);
  };

  const handlePlayerSlotClick = (slotIdx: number) => {
    if (phase !== "play" || blocked || !selectedHandCard || localGrid[slotIdx]) return;
    const newGrid = [...localGrid];
    newGrid[slotIdx] = { cardId: selectedHandCard, currentHp: 10, buffs: [], abilityUsed: false };
    setLocalGrid(newGrid);
    setLocalHand(localHand.filter(id => id !== selectedHandCard));
    setPendingPlays([...pendingPlays, { type: "play", cardId: selectedHandCard, slotIndex: slotIdx }]);
    setSelectedHandCard(null);
  };

  const handleConfirmPlays = async () => { await onSubmitPlays(pendingPlays); };

  const handleUndoPlays = () => {
    setLocalHand(battle.player.hand);
    setLocalGrid(battle.player.grid);
    setPendingPlays([]);
    setSelectedHandCard(null);
  };

  /* ------------------------------------------------------------------ */
  /*  Attack-phase handlers                                              */
  /* ------------------------------------------------------------------ */
  const handlePlayerGridCardClick = (slotIdx: number) => {
    if (phase !== "attack" || blocked) return;
    const slot = battle.player.grid[slotIdx];
    if (!slot) return;
    if (pendingAttacks.some(a => a.fromSlot === slotIdx)) {
      setPendingAttacks(pendingAttacks.filter(a => a.fromSlot !== slotIdx));
      setSelectedAttacker(null);
      return;
    }
    setSelectedAttacker(selectedAttacker === slotIdx ? null : slotIdx);
  };

  const handleEnemySlotClick = (slotIdx: number) => {
    if (phase !== "attack" || blocked || selectedAttacker === null) return;
    const enemySlot = battle.celeste.grid[slotIdx];
    if (!enemySlot) return;
    setPendingAttacks([
      ...pendingAttacks.filter(a => a.fromSlot !== selectedAttacker),
      { type: "attack", fromSlot: selectedAttacker, target: { kind: "card", slotIndex: slotIdx } },
    ]);
    setSelectedAttacker(null);
  };

  const handleEnemyPlayerClick = () => {
    if (phase !== "attack" || blocked || selectedAttacker === null) return;
    if (battle.celeste.grid[selectedAttacker]) return;
    setPendingAttacks([
      ...pendingAttacks.filter(a => a.fromSlot !== selectedAttacker),
      { type: "attack", fromSlot: selectedAttacker, target: { kind: "player" } },
    ]);
    setSelectedAttacker(null);
  };

  const canAttackPlayer = (fromSlot: number) => !battle.celeste.grid[fromSlot];
  const handleConfirmAttacks = async () => { await onSubmitAttacks(pendingAttacks); };

  const getAttackTarget = (fromSlot: number) => {
    return pendingAttacks.find(a => a.fromSlot === fromSlot)?.target ?? null;
  };

  /* ------------------------------------------------------------------ */
  /*  Damage popup helper                                                */
  /* ------------------------------------------------------------------ */
  function renderPopups(slotKey: string) {
    const pops = dmgPopups.filter(d => d.slotKey === slotKey);
    if (pops.length === 0) return null;
    return pops.map(p => (
      <span
        key={p.id}
        className={cn("damage-number", p.dodged && "dodged")}
        style={{ top: "8%", left: "50%" }}
      >
        {p.dodged ? "MISS" : `-${p.value}`}
      </span>
    ));
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  const recentLogs = battle.log.slice(-10);

  return (
    <div ref={boardRef} className="relative flex flex-col gap-4">
      {/* SVG arrow overlay */}
      {arrows.length > 0 && (
        <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full overflow-visible">
          <defs>
            <marker id="ah-target" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#fbbf24" opacity="0.9" />
            </marker>
            <marker id="ah-combat" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
            <filter id="glow-c">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {arrows.map(a => (
            <g key={a.key} className={a.type === "targeting" ? "arrow-targeting" : "arrow-active"}>
              <line
                x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                stroke={a.type === "targeting" ? "#fbbf24" : "#ef4444"}
                strokeWidth={a.type === "targeting" ? 2 : 3}
                strokeDasharray={a.type === "targeting" ? "6 4" : "none"}
                strokeLinecap="round"
                markerEnd={a.type === "targeting" ? "url(#ah-target)" : "url(#ah-combat)"}
                filter={a.type === "combat" ? "url(#glow-c)" : undefined}
                opacity={a.type === "targeting" ? 0.65 : 1}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Phase indicator */}
      <div className="flex items-center justify-between rounded-lg border border-indigo-400/20 bg-slate-900/60 px-4 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-astral-purple" />
          <span className="text-sm font-medium text-astral-text">Turn {battle.turn}</span>
          {!isFinished && (
            <span className={cn(
              "rounded-md border px-2 py-0.5 text-xs font-semibold",
              isAnimating
                ? "border-red-400/30 bg-red-500/20 text-red-300 animate-pulse"
                : phase === "play"
                  ? "border-emerald-400/30 bg-emerald-500/20 text-emerald-300"
                  : "border-red-400/30 bg-red-500/20 text-red-300",
            )}>
              {isAnimating ? "Combat in progress..." : phase === "play" ? "Play Phase — Place your cards" : "Attack Phase — Both sides deployed"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-astral-textMuted">
          <Layers className="h-3 w-3" />
          <span>Celeste: {battle.celeste.handSize} in hand, {battle.celeste.deckSize} in deck</span>
        </div>
      </div>

      {/* Celeste HP */}
      <div ref={el => { slotRefs.current["celeste-hp"] = el; }} className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-500/20 border border-fuchsia-400/30">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
          </div>
          <span className="text-sm font-semibold text-astral-text">Celeste</span>
        </div>
        <div className={cn("flex-1 relative", hpBarAnim("celeste"))}>
          <div className="h-4 overflow-hidden rounded-full bg-slate-700/60 border border-slate-600/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 transition-all duration-500"
              style={{ width: `${(cHp / 30) * 100}%` }}
            />
          </div>
          {renderPopups("celeste-hp")}
        </div>
        <span className="min-w-[3.5rem] text-right text-sm font-bold text-astral-text">
          {cHp}/30
        </span>
      </div>

      {/* Celeste Grid */}
      <div className="grid grid-cols-3 justify-items-center gap-3">
        {cGrid.map((slot, i) => {
          const sk = `celeste-${i}`;
          const card = slot ? lookupCardById(slot.cardId) : null;
          const isTarget = !isAnimating && pendingAttacks.some(a => a.target.kind === "card" && a.target.slotIndex === i);
          const slotCanTarget = !isAnimating && phase === "attack" && !slot && selectedAttacker !== null && canAttackPlayer(selectedAttacker) && selectedAttacker === i;
          const slotIsAssigned = !isAnimating && phase === "attack" && !slot && pendingAttacks.some(a => a.target.kind === "player" && a.fromSlot === i);
          return (
            <div
              key={i}
              ref={el => { slotRefs.current[sk] = el; }}
              className={cn("relative", wrapperAnim(sk))}
              style={lungeStyle(sk)}
            >
              {card && slot ? (
                <BattleCard
                  card={card} slot={slot} size="md" showHp
                  selected={isTarget}
                  onClick={() => handleEnemySlotClick(i)}
                  disabled={blocked || phase !== "attack" || selectedAttacker === null}
                  animClass={cardAnim(sk)}
                />
              ) : (
                <EmptySlot
                  side="celeste"
                  targetable={slotCanTarget}
                  assigned={slotIsAssigned}
                  onClick={slotCanTarget ? handleEnemyPlayerClick : undefined}
                  label={phase === "play" && !isAnimating ? "Celeste plays next..." : "Empty"}
                />
              )}
              {isTarget && (
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</div>
              )}
              {renderPopups(sk)}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-slate-600/30" />
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Battlefield</span>
        <div className="flex-1 border-t border-slate-600/30" />
      </div>

      {/* Player Grid */}
      <div className="grid grid-cols-3 justify-items-center gap-3">
        {pGrid.map((slot, i) => {
          const sk = `player-${i}`;
          const card = slot ? lookupCardById(slot.cardId) : null;
          const target = getAttackTarget(i);
          const isAttacker = selectedAttacker === i;
          const hasAttack = !!target;
          return (
            <div
              key={i}
              ref={el => { slotRefs.current[sk] = el; }}
              className={cn("relative", wrapperAnim(sk))}
              style={lungeStyle(sk)}
            >
              {card && slot ? (
                <>
                  <BattleCard
                    card={card} slot={slot} size="md" showHp
                    selected={isAttacker && !isAnimating}
                    onClick={() => handlePlayerGridCardClick(i)}
                    disabled={blocked || phase !== "attack"}
                    animClass={cardAnim(sk)}
                  />
                  {hasAttack && !isAnimating && (
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {target.kind === "player" ? "P" : (target.slotIndex + 1)}
                    </div>
                  )}
                </>
              ) : (
                <EmptySlot
                  side="player"
                  highlighted={phase === "play" && !blocked && !!selectedHandCard}
                  onClick={() => handlePlayerSlotClick(i)}
                  label={phase === "play" && selectedHandCard ? "Place Here" : "Empty"}
                />
              )}
              {renderPopups(sk)}
            </div>
          );
        })}
      </div>

      {/* Player HP */}
      <div ref={el => { slotRefs.current["player-hp"] = el; }} className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400/30">
            <Heart className="h-4 w-4 text-indigo-300" />
          </div>
          <span className="text-sm font-semibold text-astral-text">You</span>
        </div>
        <div className={cn("flex-1 relative", hpBarAnim("player"))}>
          <div className="h-4 overflow-hidden rounded-full bg-slate-700/60 border border-slate-600/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
              style={{ width: `${(pHp / 30) * 100}%` }}
            />
          </div>
          {renderPopups("player-hp")}
        </div>
        <span className="min-w-[3.5rem] text-right text-sm font-bold text-astral-text">
          {pHp}/30
        </span>
      </div>

      {/* Player Hand */}
      {!isFinished && phase === "play" && !isAnimating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-astral-textMuted">Your Hand ({localHand.length})</span>
            <span className="text-[10px] text-slate-500">Select a card then click an empty slot to play it</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {localHand.map(cardId => {
              const card = lookupCardById(cardId);
              if (!card) return null;
              return (
                <BattleCard key={cardId} card={card} size="sm"
                  selected={selectedHandCard === cardId}
                  onClick={() => handleHandCardClick(cardId)}
                />
              );
            })}
            {localHand.length === 0 && <span className="py-4 text-xs text-slate-500">No cards in hand</span>}
          </div>
        </div>
      )}

      {/* Attack phase hint */}
      {!isFinished && phase === "attack" && !isAnimating && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-4 py-2 text-center text-xs text-amber-200">
          Celeste has played her cards. Click one of your grid cards, then click an enemy card to target it.
          {" "}If the slot across is empty, you can attack Celeste directly.
        </div>
      )}

      {/* Action buttons */}
      {!isFinished && !isAnimating && (
        <div className="flex items-center justify-center gap-3">
          {phase === "play" ? (
            <>
              <Button onClick={handleConfirmPlays} disabled={loading}
                className="bg-indigo-500 text-white hover:bg-indigo-600">
                {loading ? "Placing cards..." : pendingPlays.length > 0 ? `Confirm ${pendingPlays.length} card${pendingPlays.length > 1 ? "s" : ""}` : "Skip — no cards to play"}
              </Button>
              {pendingPlays.length > 0 && (
                <Button variant="ghost" onClick={handleUndoPlays} className="text-slate-400">
                  <RotateCcw className="mr-1 h-3 w-3" /> Undo
                </Button>
              )}
            </>
          ) : (
            <Button onClick={handleConfirmAttacks} disabled={loading}
              className="bg-red-500 text-white hover:bg-red-600">
              {loading ? "Resolving combat..." : pendingAttacks.length > 0 ? `Launch ${pendingAttacks.length} attack${pendingAttacks.length > 1 ? "s" : ""}` : "End Turn — no attacks"}
            </Button>
          )}
        </div>
      )}

      {/* Victory / Defeat */}
      {isFinished && !isAnimating && (
        <div className={cn(
          "flex flex-col items-center gap-4 rounded-xl border p-6",
          battle.status === "playerWon" ? "border-amber-400/30 bg-amber-500/10" : "border-red-400/30 bg-red-500/10",
        )}>
          <Trophy className={cn("h-10 w-10", battle.status === "playerWon" ? "text-amber-400" : "text-red-400")} />
          <h2 className={cn("text-2xl font-bold", battle.status === "playerWon" ? "text-amber-200" : "text-red-200")}>
            {battle.status === "playerWon" ? "Victory!" : "Defeat"}
          </h2>
          <p className="text-sm text-astral-textMuted">
            {battle.status === "playerWon"
              ? "You defeated Celeste! The stars shine in your favor."
              : "Celeste prevails. The cosmos awaits your return."}
          </p>
          <Button onClick={onNewBattle} className="bg-indigo-500 text-white hover:bg-indigo-600">Play Again</Button>
        </div>
      )}

      {/* Battle Log */}
      <div className="rounded-lg border border-indigo-400/10 bg-slate-900/40 p-3">
        <h3 className="mb-2 text-xs font-semibold text-astral-textMuted uppercase tracking-wider">Battle Log</h3>
        <div className="max-h-40 space-y-0.5 overflow-y-auto">
          {recentLogs.map((entry, i) => (
            <p key={i} className={cn(
              "text-xs",
              entry.actor === "player" ? "text-indigo-300" :
              entry.actor === "celeste" ? "text-fuchsia-300" : "text-slate-400",
            )}>
              <span className="font-medium">
                {entry.actor === "player" ? "You" : entry.actor === "celeste" ? "Celeste" : "⚔"}
              </span>{" "}
              {entry.message}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
