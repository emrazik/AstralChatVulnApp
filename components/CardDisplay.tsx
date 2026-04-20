"use client";

import { useState } from "react";
import { Swords, Shield, Zap, Sparkles, X, Flame, Mountain, Wind, Droplets, Star, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZODIAC_SIGNS, ELEMENT_COLORS } from "@/lib/zodiac";
import type { AstralCard } from "@/lib/cards";
import { RARITY_FRAME, RARITY_SHINE_CLASS } from "@/lib/cards";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ELEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Fire: Flame,
  Earth: Mountain,
  Air: Wind,
  Water: Droplets,
  Cosmic: Star
};

const ELEMENT_ICON_COLORS: Record<string, string> = {
  Fire: "text-orange-400",
  Earth: "text-emerald-400",
  Air: "text-sky-400",
  Water: "text-blue-400",
  Cosmic: "text-fuchsia-400"
};

function ElementBadge({ element, size = "sm" }: { element: string; size?: "sm" | "md" }) {
  const Icon = ELEMENT_ICONS[element];
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border",
        size === "sm" ? "px-1 py-0.5" : "px-1.5 py-0.5",
        ELEMENT_COLORS[element as keyof typeof ELEMENT_COLORS]
      )}
    >
      {Icon && <Icon className={cn(iconSize, ELEMENT_ICON_COLORS[element])} />}
    </span>
  );
}

/** Same inner face for every card — rarity reads from frame + shine only */
const CARD_FACE =
  "bg-gradient-to-b from-[#1c243c] via-[#141b2e] to-[#0c101c]";

const RARITY_BADGE_COLORS: Record<string, string> = {
  Common: "bg-slate-500/20 text-slate-300 border-slate-400/30",
  Uncommon: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  Rare: "bg-sky-500/20 text-sky-300 border-sky-400/30",
  Epic: "bg-purple-500/20 text-purple-300 border-purple-400/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  Mythic:
    "text-white border-white/30 bg-[linear-gradient(90deg,#ec4899_0%,#a855f7_28%,#38bdf8_52%,#34d399_76%,#fbbf24_100%)]"
};

function StatBar({ label, value, icon: Icon, textClass, barClass }: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  textClass: string;
  barClass: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-4 w-4 shrink-0", textClass)} />
      <span className="w-8 text-xs font-medium text-astral-textMuted">{label}</span>
      <div className="flex-1">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-700/60">
          <div
            className={cn("h-full rounded-full", barClass)}
            style={{ width: `${value * 10}%` }}
          />
        </div>
      </div>
      <span className="w-5 text-right text-xs font-bold text-astral-text">{value}</span>
    </div>
  );
}

export function CardDisplay({ card, revealed = true }: { card: AstralCard; revealed?: boolean }) {
  const [open, setOpen] = useState(false);
  const zodiac = ZODIAC_SIGNS.find((z) => z.id === card.zodiacId);

  if (!revealed) {
    return (
      <div
        className={cn(
          "group relative flex aspect-[3/4] w-full max-w-[200px] flex-col overflow-hidden rounded-xl",
          RARITY_FRAME[card.rarity]
        )}
        style={{ perspective: "800px" }}
      >
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(0.75rem-3px)]",
            "bg-gradient-to-b from-[#12162a] via-[#0e1220] to-[#090c18]"
          )}
        >
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 p-3">
            <Lock className="h-10 w-10 text-slate-500/60" />
            <span className="text-sm font-bold text-slate-500/70">???</span>
            <span className="text-[10px] text-slate-600">Locked</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group relative flex aspect-[3/4] w-full max-w-[200px] cursor-pointer flex-col overflow-hidden rounded-xl transition-all duration-300",
          "hover:-translate-y-1 hover:scale-[1.02]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          RARITY_FRAME[card.rarity]
        )}
        style={{ perspective: "800px" }}
      >
        <div
          className={cn(
            "relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[calc(0.75rem-3px)]",
            CARD_FACE
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[inherit]",
              RARITY_SHINE_CLASS[card.rarity]
            )}
            aria-hidden
          />

          <div className="relative z-10 flex flex-1 flex-col p-3">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-left text-sm font-bold leading-tight text-astral-text">
              {card.name}
            </h3>
            <span
              className={cn(
                "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                RARITY_BADGE_COLORS[card.rarity]
              )}
            >
              {card.rarity}
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center">
            <div className="relative">
              {card.zodiacId === "cosmic" ? (
                <Star className="h-16 w-16 text-fuchsia-300 opacity-80 drop-shadow-lg transition-transform duration-300 group-hover:scale-110 sm:h-20 sm:w-20" />
              ) : (
                <img
                  src={`/${card.zodiacId}.png`}
                  alt={zodiac?.name ?? card.zodiacId}
                  className="h-20 w-20 object-contain opacity-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.45)] transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24"
                />
              )}
              <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-radial from-indigo-400/18 to-transparent blur-2xl" />
            </div>
          </div>

          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between">
              <ElementBadge element={card.element} />
              <span className="text-xs text-astral-textMuted">
                {card.zodiacId === "cosmic" ? "Cosmic" : zodiac?.name}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1 rounded-lg bg-slate-800/60 px-2 py-1.5 text-[10px]">
              <span className="flex items-center gap-1 text-red-400">
                <Swords className="h-3 w-3" /> {card.attack}
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <Shield className="h-3 w-3" /> {card.defense}
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Zap className="h-3 w-3" /> {card.speed}
              </span>
            </div>
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-center gap-2 rounded-[inherit] bg-slate-950/92 p-3 text-left opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-astral-purple" />
              <span className="text-xs font-semibold text-astral-text">
                {card.ability.name}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-astral-textMuted">
              {card.ability.description}
            </p>
          </div>
          </div>
        </div>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex flex-col overflow-hidden border-[3px] bg-slate-900/95 backdrop-blur-xl sm:max-w-md",
            RARITY_FRAME[card.rarity]
              .replace("animate-legendary-border", "")
              .replace("animate-epic-border", "")
              .replace("animate-mythic-border", "")
          )}
        >
          {card.rarity === "Legendary" && (
            <div
              className="pointer-events-none absolute inset-[-3px] rounded-[inherit] animate-legendary-border"
              aria-hidden
            />
          )}
          {card.rarity === "Epic" && (
            <div
              className="pointer-events-none absolute inset-[-3px] rounded-[inherit] animate-epic-border"
              aria-hidden
            />
          )}
          {card.rarity === "Mythic" && (
            <div
              className="pointer-events-none absolute inset-[-3px] rounded-[inherit] animate-mythic-border"
              aria-hidden
            />
          )}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[inherit]",
              CARD_FACE
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 rounded-[inherit]",
              RARITY_SHINE_CLASS[card.rarity]
            )}
            aria-hidden
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-0 right-0 z-[200] text-astral-text hover:bg-white/10"
                />
              }
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogClose>

            <DialogHeader className="pr-10">
              <div className="flex items-center gap-3">
                {card.zodiacId === "cosmic" ? (
                  <Star className="h-10 w-10 shrink-0 text-fuchsia-300" />
                ) : (
                  <img
                    src={`/${card.zodiacId}.png`}
                    alt={zodiac?.name ?? card.zodiacId}
                    className="h-12 w-12 shrink-0 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                  />
                )}
                <div>
                  <DialogTitle className="text-lg text-astral-text">
                    {card.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2">
                    <ElementBadge element={card.element} size="md" />
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                        RARITY_BADGE_COLORS[card.rarity]
                      )}
                    >
                      {card.rarity}
                    </span>
                    <span className="text-xs text-astral-textMuted">
                      {card.zodiacId === "cosmic" ? "Cosmic" : `${zodiac?.name} · ${zodiac?.dateRange}`}
                    </span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <StatBar label="ATK" value={card.attack} icon={Swords} textClass="text-red-400" barClass="bg-red-400" />
                <StatBar label="DEF" value={card.defense} icon={Shield} textClass="text-sky-400" barClass="bg-sky-400" />
                <StatBar label="SPD" value={card.speed} icon={Zap} textClass="text-amber-400" barClass="bg-amber-400" />
              </div>

              <div className="rounded-lg border border-indigo-400/20 bg-indigo-500/5 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-astral-purple" />
                  <span className="text-sm font-semibold text-astral-text">
                    {card.ability.name}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-astral-textMuted">
                  {card.ability.description}
                </p>
              </div>

              <p className="border-t border-slate-700/50 pt-3 text-center text-xs italic text-astral-textMuted/70">
                &ldquo;{card.flavor}&rdquo;
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
