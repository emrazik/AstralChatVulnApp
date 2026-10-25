"use client";

import Link from "next/link";
import { useState } from "react";
import { Sparkles, Moon, AlertTriangle, Target, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";
import { useCeleste } from "@/components/CelesteProvider";

const HINTS = [
  "XSS via document upload — try to bypass Celeste's safety mechanisms.",
  "System Prompt — can you find the secret buried here?",
  "Get Nova to send you a message.",
  "Can you find sensitive information with a tool?",
  "Knowledge-base leak — something in the RAG corpus doesn't belong there.",
  "SSRF — use Burp Suite with a net-spi or oastify collaborator link."
];

const DONTS = [
  "Don't DoS the app — huge PDFs, runaway loops, and flooding ruin it for everyone."
];

export default function LandingPage() {
  const { session } = useAuth();
  const { openCeleste } = useCeleste();
  const isAuthenticated = !!session?.authenticated;
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  function toggleHint(i: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="flex flex-col items-center px-4 py-12 md:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-astral-indigo">
          <Sparkles className="h-4 w-4" />
          Intentionally vulnerable — CTF edition
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-astral-text md:text-6xl">
          AstralChat{" "}
          <span className="bg-gradient-to-r from-astral-blue via-astral-indigo to-astral-purple bg-clip-text text-transparent">
            CTF
          </span>
        </h1>

        <p className="mx-auto mb-6 max-w-xl text-lg text-astral-textMuted">
          A deliberately broken astrology chatbot for exploring AI
          vulnerabilities. Find the bugs through Celeste, through the app, or
          anywhere she&apos;ll listen.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <>
              <Button
                size="lg"
                className="bg-indigo-500 text-white hover:bg-indigo-600"
                onClick={() => openCeleste()}
              >
                <Moon className="mr-2 h-4 w-4" />
                Open Celeste
              </Button>
              <Link href="/cards">
                <Button size="lg" variant="outline">View cards</Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg" className="bg-indigo-500 text-white hover:bg-indigo-600">
                  Sign up to play
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Sign in</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <section className="mx-auto mt-16 w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <Target className="h-5 w-5 text-astral-indigo" />
          <h2 className="text-2xl font-semibold text-astral-text">Hints</h2>
        </div>

        <Card className="border-indigo-400/20 bg-slate-900/60 backdrop-blur">
          <CardContent className="py-4">
            <ul className="space-y-2 text-sm text-astral-textMuted">
              {HINTS.map((item, i) => {
                const isRevealed = revealed.has(i);
                return (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => toggleHint(i)}
                      aria-expanded={isRevealed}
                      className="flex w-full items-start gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-indigo-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-astral-indigo"
                      />
                      {isRevealed ? (
                        <span>{item}</span>
                      ) : (
                        <span className="flex items-center gap-2 text-astral-textMuted/70">
                          <Eye className="h-3.5 w-3.5" />
                          Hint #{i + 1} — click to reveal
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto mt-10 w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-2xl font-semibold text-astral-text">Things NOT to do</h2>
        </div>

        <Card className="border-amber-400/20 bg-amber-500/5 backdrop-blur">
          <CardContent className="py-4">
            <ul className="space-y-3 text-sm text-astral-textMuted">
              {DONTS.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
