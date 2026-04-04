"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

export type SessionState = {
  authenticated: boolean;
  userId?: string;
  displayName?: string | null;
  zodiacSign?: string | null;
} | null;

type AuthContextValue = {
  session: SessionState;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated: boolean;
          userId?: string;
          displayName?: string | null;
          zodiacSign?: string | null;
        };
        setSession({
          authenticated: data.authenticated,
          userId: data.userId,
          displayName: data.displayName ?? null,
          zodiacSign: data.zodiacSign ?? null
        });
      } else {
        setSession({ authenticated: false });
      }
    } catch {
      setSession({ authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
