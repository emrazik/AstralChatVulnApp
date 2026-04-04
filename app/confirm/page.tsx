"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
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

export default function ConfirmPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "confirming" | "logging-in">("idle");

  useEffect(() => {
    const saved = sessionStorage.getItem("confirmEmail");
    if (saved) setEmail(saved);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setStatus("confirming");

    try {
      const confirmRes = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const confirmJson = (await confirmRes.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!confirmRes.ok) {
        setError(confirmJson.message ?? "Confirmation failed.");
        return;
      }

      const password = sessionStorage.getItem("confirmPassword");
      const pendingProfile = sessionStorage.getItem("pendingProfile");

      if (password) {
        setStatus("logging-in");
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            pendingProfile: pendingProfile ? JSON.parse(pendingProfile) : undefined
          })
        });

        sessionStorage.removeItem("confirmEmail");
        sessionStorage.removeItem("confirmPassword");
        sessionStorage.removeItem("pendingProfile");

        if (loginRes.ok) {
          await refresh();
          router.push("/chat");
          return;
        }
      }

      sessionStorage.removeItem("confirmEmail");
      sessionStorage.removeItem("confirmPassword");
      sessionStorage.removeItem("pendingProfile");
      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setStatus("idle");
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-indigo-400/20 bg-slate-900/70 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15">
            {status === "logging-in" ? (
              <CheckCircle className="h-6 w-6 text-emerald-400" />
            ) : (
              <Mail className="h-6 w-6 text-astral-indigo" />
            )}
          </div>
          <CardTitle className="text-2xl text-astral-text">Check your email</CardTitle>
          <CardDescription className="text-astral-textMuted">
            Enter the confirmation code we sent to your inbox
          </CardDescription>
        </CardHeader>

        <form id="confirm-form" onSubmit={onSubmit} />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              form="confirm-form"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Confirmation code</Label>
            <Input
              id="code"
              form="confirm-form"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            form="confirm-form"
            className="w-full bg-indigo-500 text-white hover:bg-indigo-600"
            disabled={loading}
          >
            {status === "logging-in"
              ? "Signing you in..."
              : status === "confirming"
                ? "Confirming..."
                : "Confirm account"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
