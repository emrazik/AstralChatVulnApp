"use client";

import { Terminal, Swords, Shield, Zap, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AstralCard } from "@/lib/cards";
import { RARITY_FRAME, RARITY_SHINE_CLASS } from "@/lib/cards";
import { Dialog, DialogContent, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const CARD_FACE = "bg-gradient-to-b from-[#1c243c] via-[#141b2e] to-[#0c101c]";

const RARITY_BADGE_COLORS: Record<string, string> = {
  Common: "bg-slate-500/20 text-slate-300 border-slate-400/30",
  Uncommon: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  Rare: "bg-sky-500/20 text-sky-300 border-sky-400/30",
  Epic: "bg-purple-500/20 text-purple-300 border-purple-400/30",
  Legendary: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  Mythic:
    "text-white border-white/30 bg-[linear-gradient(90deg,#ec4899_0%,#a855f7_28%,#38bdf8_52%,#34d399_76%,#fbbf24_100%)]"
};

type Props = {
  card: AstralCard | null;
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  description?: string;
};

export function AchievementDialog({
  card,
  open,
  onClose,
  title = "Prompt Injection",
  subtitle = "> System Prompt Extraction",
  description = "You manipulated Celeste into revealing her hidden system instructions and extracted the secret key. The system has been compromised.",
}: Props) {
  const shouldShow = open && !!card;

  return (
    <Dialog open={shouldShow} onOpenChange={(v) => !v && onClose()}>
      {card ? (
      <DialogContent
        showCloseButton={false}
        className="z-[70] overflow-hidden border-emerald-500/40 bg-slate-950/98 p-0 shadow-[0_0_40px_rgba(52,211,153,0.15)] backdrop-blur-xl sm:max-w-sm"
      >
        {/* Terminal-style achievement banner */}
        <div className="relative border-b border-emerald-500/20 bg-[#0a1a0f] px-5 pb-4 pt-5">
          <div className="mb-2 flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Achievement Unlocked
            </span>
          </div>

          <h2 className="font-mono text-xl font-bold text-emerald-300">
            {title}
          </h2>
          <p className="font-mono text-xs text-emerald-500">
            {subtitle}
          </p>

          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {description}
          </p>
        </div>

        {/* Card reveal section */}
        <div className="px-5 pt-4">
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-500/70">
            Card Unlocked
          </p>

          <div className="flex gap-4">
            {/* Card face */}
            <div
              className={cn(
                "relative flex aspect-[3/4] w-32 shrink-0 flex-col overflow-hidden rounded-xl",
                RARITY_FRAME[card.rarity]
              )}
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
                <div className="relative z-10 flex flex-1 flex-col p-2.5">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="text-left text-xs font-bold leading-tight text-astral-text">
                      {card.name}
                    </h3>
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold",
                        RARITY_BADGE_COLORS[card.rarity]
                      )}
                    >
                      {card.rarity}
                    </span>
                  </div>

                  <div className="flex flex-1 items-center justify-center">
                    {card.zodiacId === "cosmic" ? (
                      <Star className="h-12 w-12 text-fuchsia-300 opacity-80 drop-shadow-lg" />
                    ) : (
                      <img
                        src={`/${card.zodiacId}.png`}
                        alt={card.zodiacId}
                        className="h-16 w-16 object-contain opacity-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.45)]"
                      />
                    )}
                  </div>

                  <div className="mt-auto rounded-lg bg-slate-800/60 px-2 py-1 text-[9px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-0.5 text-red-400">
                        <Swords className="h-2.5 w-2.5" /> {card.attack}
                      </span>
                      <span className="flex items-center gap-0.5 text-sky-400">
                        <Shield className="h-2.5 w-2.5" /> {card.defense}
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-400">
                        <Zap className="h-2.5 w-2.5" /> {card.speed}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card details */}
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <p className="text-sm font-bold text-astral-text">{card.name}</p>
                <p className="text-[11px] text-astral-textMuted">{card.element} · {card.rarity}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Swords className="h-3 w-3 shrink-0 text-red-400" />
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                    <div className="h-full rounded-full bg-red-400" style={{ width: `${card.attack * 10}%` }} />
                  </div>
                  <span className="w-4 text-right text-[11px] font-bold text-astral-text">{card.attack}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Shield className="h-3 w-3 shrink-0 text-sky-400" />
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${card.defense * 10}%` }} />
                  </div>
                  <span className="w-4 text-right text-[11px] font-bold text-astral-text">{card.defense}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Zap className="h-3 w-3 shrink-0 text-amber-400" />
                  <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${card.speed * 10}%` }} />
                  </div>
                  <span className="w-4 text-right text-[11px] font-bold text-astral-text">{card.speed}</span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/5 p-2">
                <div className="mb-0.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  <span className="text-[11px] font-semibold text-astral-text">
                    {card.ability.name}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-astral-textMuted">
                  {card.ability.description}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] italic text-astral-textMuted/60">
            &ldquo;{card.flavor}&rdquo;
          </p>
        </div>

        <DialogFooter
          showCloseButton={false}
          className="mx-5 mb-5 mt-2 flex-col gap-3 rounded-lg border border-emerald-500/25 bg-emerald-950/25 px-4 py-4 sm:flex-row sm:justify-center"
        >
          <DialogClose
            render={
              <Button
                type="button"
                className="w-full max-w-sm bg-emerald-600 text-white hover:bg-emerald-500"
              />
            }
          >
            Claim Reward
          </DialogClose>
        </DialogFooter>
      </DialogContent>
      ) : null}
    </Dialog>
  );
}
