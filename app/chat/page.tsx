"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatWindow from "@/components/ChatWindow";
import { useAuth } from "@/components/AuthProvider";

function ChatInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading } = useAuth();
  const q = searchParams.get("q") ?? undefined;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!session?.authenticated) {
        router.replace("/login");
      } else {
        setReady(true);
      }
    }
  }, [loading, session?.authenticated, router]);

  if (!ready) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-astral-textMuted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <ChatWindow initialQuestion={q} />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-astral-textMuted">
          Loading…
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
