"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ZodiacBadge } from "@/components/ZodiacBadge";
import { BirthdayInput } from "@/components/BirthdayInput";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function goToStep2(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName, birthday, bio })
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        setError(json.message ?? "Sign-up failed.");
        return;
      }

      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          pendingProfile: { displayName, birthday, bio }
        })
      });

      if (!loginRes.ok) {
        router.push("/login");
        return;
      }

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
          <CardTitle className="text-2xl text-astral-text">
            {step === 1 ? "Create your account" : "Tell us about yourself"}
          </CardTitle>
          <CardDescription className="text-astral-textMuted">
            {step === 1
              ? "Step 1 of 2 — Your credentials"
              : "Step 2 of 2 — Your cosmic identity"}
          </CardDescription>
        </CardHeader>

        {step === 1 ? (
          <>
            <form id="step1-form" onSubmit={goToStep2} />
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  form="step1-form"
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
                  form="step1-form"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  form="step1-form"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                form="step1-form"
                className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-center text-sm text-astral-textMuted">
                Already have an account?{" "}
                <Link href="/login" className="text-astral-indigo hover:underline">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </>
        ) : (
          <>
            <form id="step2-form" onSubmit={onSubmit} />
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  form="step2-form"
                  placeholder="What should Celeste call you?"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday</Label>
                <BirthdayInput
                  id="birthday"
                  value={birthday}
                  onChange={setBirthday}
                />
                {birthday && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-astral-textMuted">Your sign:</span>
                    <ZodiacBadge birthday={birthday} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">About you</Label>
                <Textarea
                  id="bio"
                  form="step2-form"
                  placeholder="Tell Celeste a little about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <div className="flex w-full gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="submit"
                  form="step2-form"
                  className="flex-1 bg-indigo-500 text-white hover:bg-indigo-600"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create account"}
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
