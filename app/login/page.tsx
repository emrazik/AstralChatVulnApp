"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const pendingProfile =
        typeof window !== "undefined"
          ? JSON.parse(sessionStorage.getItem("pendingProfile") ?? "null")
          : null;

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, pendingProfile })
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setError(json.message ?? "Sign-in failed.");
        return;
      }

      sessionStorage.removeItem("pendingProfile");
      await refresh();
      router.push("/chat");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-indigo-400/20 bg-slate-900/70 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15">
            <Sparkles className="h-6 w-6 text-astral-indigo" />
          </div>
          <CardTitle className="text-2xl text-astral-text">Welcome back</CardTitle>
          <CardDescription className="text-astral-textMuted">
            Sign in to continue your celestial journey
          </CardDescription>
        </CardHeader>

        <form id="login-form" onSubmit={onSubmit} />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              form="login-form"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              form="login-form"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            form="login-form"
            className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-astral-textMuted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-astral-indigo hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
