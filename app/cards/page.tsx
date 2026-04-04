"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { CardDisplay } from "@/components/CardDisplay";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AstralCard } from "@/lib/cards";
import { RARITY_ORDER } from "@/lib/cards";

type CardWithRevealed = AstralCard & { revealed: boolean };

type SortKey = "rarity" | "attack" | "defense" | "speed" | "name";

const ELEMENT_TABS = ["All", "Fire", "Earth", "Air", "Water"] as const;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "rarity", label: "Rarity" },
  { value: "attack", label: "Attack" },
  { value: "defense", label: "Defense" },
  { value: "speed", label: "Speed" },
  { value: "name", label: "Name" }
];

function CardsInner() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<CardWithRevealed[]>([]);
  const [fetching, setFetching] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("rarity");
  const [element, setElement] = useState<string>("All");

  useEffect(() => {
    if (!loading && !session?.authenticated) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  useEffect(() => {
    if (!session?.authenticated) return;
    fetch("/api/cards")
      .then((r) => r.json())
      .then((data: { cards: CardWithRevealed[] }) => setCards(data.cards))
      .catch(() => setCards([]))
      .finally(() => setFetching(false));
  }, [session?.authenticated]);

  const filtered = useMemo(() => {
    let result = element === "All" ? cards : cards.filter((c) => c.element === element);

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "rarity":
          return RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        case "attack":
          return b.attack - a.attack;
        case "defense":
          return b.defense - a.defense;
        case "speed":
          return b.speed - a.speed;
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [cards, element, sortBy]);

  if (loading || !session?.authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-astral-textMuted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-astral-indigo">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Your Arsenal</span>
        </div>
        <h1 className="text-3xl font-bold text-astral-text md:text-4xl">Astral Cards</h1>
        <p className="mx-auto mt-3 max-w-2xl text-astral-textMuted">
          Your collection of cosmic battle cards. Each card channels the power of a zodiac sign
          through elemental forces. Click a card to reveal its full stats and abilities. Unlock
          locked cards by exploiting AI feature vulnerabilities.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
        <Tabs defaultValue="All" onValueChange={setElement}>
          <TabsList className="bg-slate-800/60">
            {ELEMENT_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-astral-textMuted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-indigo-400/20 bg-slate-800/60 px-3 py-1.5 text-sm text-astral-text outline-none transition-colors focus:border-indigo-400/40"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {fetching ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-astral-textMuted">Loading cards...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-astral-textMuted">No cards found.</p>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {filtered.map((card) => (
            <CardDisplay key={card.id} card={card} revealed={card.revealed} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-astral-textMuted">Loading...</p>
      </div>
    }>
      <CardsInner />
    </Suspense>
  );
}
