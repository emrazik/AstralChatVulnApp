"use client";

import Link from "next/link";
import { Sparkles, MessageCircle, Heart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/components/AuthProvider";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "Personalized Readings",
    description:
      "Ask Celeste about your sign's personality, strengths, and cosmic path."
  },
  {
    icon: Heart,
    title: "Zodiac Compatibility",
    description:
      "Discover how your stars align with friends, partners, and loved ones."
  },
  {
    icon: Star,
    title: "Cosmic Insights",
    description:
      "Explore all twelve signs and uncover the deeper mysteries of the zodiac."
  }
];

export default function LandingPage() {
  const { session } = useAuth();
  const isAuthenticated = !!session?.authenticated;

  return (
    <div className="flex flex-col items-center px-4 py-16 md:py-24">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-astral-indigo">
          <Sparkles className="h-4 w-4" />
          Powered by the cosmos
        </div>

        <h1 className="mb-6 text-4xl font-bold tracking-tight text-astral-text md:text-6xl">
          Discover What the Stars{" "}
          <span className="bg-gradient-to-r from-astral-blue via-astral-indigo to-astral-purple bg-clip-text text-transparent">
            Have in Store
          </span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-lg text-astral-textMuted">
          Meet Celeste, your personal celestial guide. Ask about your zodiac sign,
          explore compatibility, and unlock personality insights drawn from the stars.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Link href="/chat">
              <Button size="lg" className="bg-indigo-500 text-white hover:bg-indigo-600">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat with Celeste
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/signup">
                <Button size="lg" className="bg-indigo-500 text-white hover:bg-indigo-600">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">Sign In</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card
            key={feature.title}
            className="border-indigo-400/20 bg-slate-900/60 backdrop-blur"
          >
            <CardHeader>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15">
                <feature.icon className="h-5 w-5 text-astral-indigo" />
              </div>
              <CardTitle className="text-astral-text">{feature.title}</CardTitle>
              <CardDescription className="text-astral-textMuted">
                {feature.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
