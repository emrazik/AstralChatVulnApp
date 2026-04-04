import { Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { AskCelesteButton } from "@/components/AskCelesteButton";
import { ZODIAC_SIGNS, ELEMENT_COLORS } from "@/lib/zodiac";
import { cn } from "@/lib/utils";

export default function HoroscopePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-astral-indigo">
          <Sparkles className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Zodiac guide</span>
        </div>
        <h1 className="text-3xl font-bold text-astral-text md:text-4xl">The twelve signs</h1>
        <p className="mx-auto mt-3 max-w-2xl text-astral-textMuted">
          Browse each sign&apos;s traits and compatibility, then ask Celeste for a deeper reading.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ZODIAC_SIGNS.map((sign) => (
          <Card
            key={sign.id}
            className="border-indigo-400/20 bg-slate-900/60 backdrop-blur transition-colors hover:border-indigo-400/35"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-astral-text">
                    <span className="text-xl">{sign.symbol}</span>
                    {sign.name}
                  </CardTitle>
                  <CardDescription className="text-astral-textMuted">
                    {sign.dateRange} ·{" "}
                    <span
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 text-xs font-medium",
                        ELEMENT_COLORS[sign.element]
                      )}
                    >
                      {sign.element}
                    </span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-astral-textMuted">
              <p>
                <span className="font-medium text-astral-text">Traits: </span>
                {sign.traits}
              </p>
              <p>
                <span className="font-medium text-astral-text">Compatibility: </span>
                {sign.compatibility}
              </p>
              <p>
                <span className="font-medium text-astral-text">Tone: </span>
                {sign.tone}
              </p>
              <AskCelesteButton
                question={`Tell me about ${sign.name}`}
                label={`Ask Celeste about ${sign.name}`}
                className="mt-1 w-full border-indigo-400/30 text-astral-indigo hover:bg-indigo-500/10"
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
