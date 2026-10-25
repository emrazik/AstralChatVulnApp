"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/components/AuthProvider";
import { ZodiacBadge } from "@/components/ZodiacBadge";
import { BirthdayInput } from "@/components/BirthdayInput";
import { cn } from "@/lib/utils";

type ProfileData = {
  hexId: string | null;
  email: string | null;
  displayName: string;
  birthday: string;
  bio: string;
  zodiacSign: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { refresh, session, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !session?.authenticated) {
      router.replace("/login");
      return;
    }
    if (!session?.authenticated) return;

    void (async () => {
      try {
        const res = await fetch("/api/auth/profile");
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const data = (await res.json()) as ProfileData;
        setProfile(data);
        setDisplayName(data.displayName ?? "");
        setBirthday(data.birthday ?? "");
        setBio(data.bio ?? "");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, session?.authenticated, router]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSaveMsg(null);
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, birthday, bio })
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.ok) {
      setSaveMsg({ type: "ok", text: "Saved." });
      await refresh();
    } else {
      setSaveMsg({ type: "err", text: json.message ?? "Could not save." });
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmNewPassword) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwMsg({ type: "err", text: "New password must be at least 8 characters." });
      return;
    }
    const res = await fetch("/api/auth/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const json = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Password updated." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } else {
      setPwMsg({ type: "err", text: json.message ?? "Could not update password." });
    }
  }

  if (authLoading || loading || !profile) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center text-astral-textMuted">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/15">
          <User className="h-6 w-6 text-astral-indigo" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-astral-text">Your profile</h1>
          <p className="text-sm text-astral-textMuted">Manage how Celeste knows you</p>
        </div>
      </div>

      <div className="space-y-8">
        <section className="rounded-xl border border-indigo-400/20 bg-slate-900/50 p-6 backdrop-blur">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-astral-purple" />
            <h2 className="text-lg font-medium text-astral-text">Personal information</h2>
          </div>
          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border-indigo-300/20 bg-slate-950"
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
                  <span className="text-xs text-astral-textMuted">Derived sign:</span>
                  <ZodiacBadge birthday={birthday} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">About you</Label>
              <Textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="border-indigo-300/20 bg-slate-950"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" className="bg-indigo-500 text-white hover:bg-indigo-600">
                Save changes
              </Button>
              {saveMsg && (
                <span
                  className={cn(
                    "text-sm",
                    saveMsg.type === "ok" ? "text-emerald-400" : "text-destructive"
                  )}
                >
                  {saveMsg.text}
                </span>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-indigo-400/20 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="mb-4 text-lg font-medium text-astral-text">Account</h2>
          <div className="space-y-3 text-sm">
            {profile.hexId && (
              <div className="space-y-1">
                <p className="text-astral-textMuted">User ID</p>
                <p className="font-mono font-medium tracking-wider text-astral-indigo">
                  {profile.hexId}
                </p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-astral-textMuted">Email</p>
              <p className="font-medium text-astral-text">{profile.email ?? "—"}</p>
            </div>
            {profile.zodiacSign && (
              <p className="pt-2 text-xs text-astral-textMuted">
                Saved sign:{" "}
                <span className="text-astral-indigo">{profile.zodiacSign}</span>
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-indigo-400/20 bg-slate-900/50 p-6 backdrop-blur">
          <h2 className="mb-4 text-lg font-medium text-astral-text">Change password</h2>
          <form onSubmit={onChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="border-indigo-300/20 bg-slate-950"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="border-indigo-300/20 bg-slate-950"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmNewPassword">Confirm new password</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="border-indigo-300/20 bg-slate-950"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="outline" className="border-indigo-400/40">
                Update password
              </Button>
              {pwMsg && (
                <span
                  className={cn(
                    "text-sm",
                    pwMsg.type === "ok" ? "text-emerald-400" : "text-destructive"
                  )}
                >
                  {pwMsg.text}
                </span>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
