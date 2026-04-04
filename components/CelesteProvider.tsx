"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode
} from "react";

type CelesteContextValue = {
  isOpen: boolean;
  pendingQuestion: string | undefined;
  openCeleste: (question?: string) => void;
  closeCeleste: () => void;
};

const CelesteContext = createContext<CelesteContextValue | null>(null);

export function CelesteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();

  const openCeleste = useCallback((question?: string) => {
    setPendingQuestion(question);
    setIsOpen(true);
  }, []);

  const closeCeleste = useCallback(() => {
    setIsOpen(false);
    setPendingQuestion(undefined);
  }, []);

  return (
    <CelesteContext.Provider
      value={{ isOpen, pendingQuestion, openCeleste, closeCeleste }}
    >
      {children}
    </CelesteContext.Provider>
  );
}

export function useCeleste() {
  const ctx = useContext(CelesteContext);
  if (!ctx) {
    throw new Error("useCeleste must be used within CelesteProvider");
  }
  return ctx;
}
