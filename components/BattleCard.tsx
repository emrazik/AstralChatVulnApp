"use client";

import { Swords, Shield, Zap, Star, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZODIAC_SIGNS, ELEMENT_COLORS } from "@/lib/zodiac";
import { RARITY_FRAME, RARITY_SHINE_CLASS } from "@/lib/cards";
import type { AstralCard } from "@/lib/cards";
import type { GridSlot } from "@/lib/battle";

const RARITY_BADGE_COLORS: Record<string, string> = {
  Common: "bg-slate-500/20 text-slate-300 border-slate-400/30",
  Uncommon: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  Rare: "bg-sky-500/20 text-sky-300 border-sky-400/30",
  Epic: "bg-purple-500/20 text-purple-300 border-purple-400/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-400/30"
};

const CARD_FACE = "bg-gradient-to-b from-[#1c243c] via-[#141b2e] to-[#0c101c]";

type BattleCardProps = {
  card: AstralCard;
  slot?: GridSlot | null;
  size?: "sm" | "md";
  selected?: boolean;
  onClick?: () => void;
  animClass?: string;
  showHp?: boolean;
  disabled?: boolean;
};

export function BattleCard({
  card,
  slot,
  size = "md",
  selected,
  onClick,
  animClass,
  showHp = false,
  disabled
}: BattleCardProps) {
  const zodiac = ZODIAC_SIGNS.find((z) => z.id === card.zodiacId);
  const hpPercent = slot ? Math.max(0, (slot.currentHp / 10) * 100) : 100;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg transition-all duration-200",
        size === "sm" ? "aspect-[3/4] w-full max-w-[100px]" : "aspect-[3/4] w-full max-w-[130px]",
        selected && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900",
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02]",
        RARITY_FRAME[card.rarity],
        animClass
      )}
    >
      <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(0.5rem-3px)]", CARD_FACE)}>
        <div
          className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", RARITY_SHINE_CLASS[card.rarity])}
          aria-hidden
        />
        <div className="relative z-10 flex flex-1 flex-col p-1.5">
          <div className="flex items-start justify-between gap-0.5">
            <h3 className={cn("text-left font-bold leading-tight text-astral-text", size === "sm" ? "text-[9px]" : "text-[10px]")}>
              {card.name}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded border px-1 py-0.5 font-semibold",
                size === "sm" ? "text-[7px]" : "text-[8px]",
                RARITY_BADGE_COLORS[card.rarity]
              )}
            >
              {card.rarity[0]}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center">
            {card.zodiacId === "cosmic" ? (
              <Star className={cn("text-fuchsia-300 opacity-80 drop-shadow-lg", size === "sm" ? "h-8 w-8" : "h-10 w-10")} />
            ) : (
              <img
                src={`/${card.zodiacId}.png`}
                alt={zodiac?.name ?? card.zodiacId}
                className={cn("object-contain opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]", size === "sm" ? "h-8 w-8" : "h-10 w-10")}
              />
            )}
          </div>

          <div className="mt-auto space-y-1">
            <div className={cn("flex items-center justify-between gap-0.5 rounded bg-slate-800/60 px-1 py-0.5", size === "sm" ? "text-[7px]" : "text-[8px]")}>
              <span className="flex items-center gap-0.5 text-red-400">
                <Swords className="h-2 w-2" /> {card.attack}
              </span>
              <span className="flex items-center gap-0.5 text-sky-400">
                <Shield className="h-2 w-2" /> {card.defense}
              </span>
              <span className="flex items-center gap-0.5 text-amber-400">
                <Zap className="h-2 w-2" /> {card.speed}
              </span>
            </div>

            {showHp && slot && (
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                  )}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

type EmptySlotProps = {
  label?: string;
  onClick?: () => void;
  highlighted?: boolean;
  targetable?: boolean;
  assigned?: boolean;
  side: "player" | "celeste";
};

export function EmptySlot({ label, onClick, highlighted, targetable, assigned, side }: EmptySlotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex aspect-[3/4] w-full max-w-[130px] flex-col items-center justify-center gap-1.5 rounded-lg border-2 transition-all duration-200",
        assigned
          ? "border-red-400/60 bg-red-500/15 text-red-300 border-solid animate-pulse"
          : targetable
            ? "border-red-400/50 bg-red-500/10 text-red-300 border-dashed cursor-pointer hover:border-red-400/80 hover:bg-red-500/20 hover:scale-[1.03]"
            : highlighted
              ? "border-yellow-400/60 bg-yellow-500/10 text-yellow-300 border-dashed"
              : side === "player"
                ? "border-indigo-400/20 bg-slate-800/30 text-slate-500 border-dashed"
                : "border-fuchsia-400/20 bg-slate-800/30 text-slate-500 border-dashed",
        !targetable && !assigned && onClick && !highlighted && "hover:border-indigo-400/40 hover:bg-slate-800/50 cursor-pointer"
      )}
    >
      {(targetable || assigned) ? (
        <>
          <Crosshair className={cn("h-6 w-6", assigned ? "text-red-400" : "text-red-400/70")} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {assigned ? "Targeting Celeste" : "Attack Celeste"}
          </span>
        </>
      ) : (
        <span className="text-[10px] font-medium">{label ?? "Empty"}</span>
      )}
    </button>
  );
}
