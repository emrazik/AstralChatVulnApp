"use client";

import { Moon, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCeleste } from "@/components/CelesteProvider";
import ChatWindow from "@/components/ChatWindow";
import { cn } from "@/lib/utils";

export function CelesteWidget() {
  const { session } = useAuth();
  const { isOpen, pendingQuestion, openCeleste, closeCeleste } = useCeleste();

  if (!session?.authenticated) return null;

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => openCeleste()}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
            "rounded-full bg-gradient-to-br from-indigo-500 to-purple-600",
            "shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-purple-500/50",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          )}
          aria-label="Open Celeste"
        >
          <Moon className="h-6 w-6 text-white" />
        </button>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
            onClick={closeCeleste}
          />

          <div
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden",
              "rounded-2xl border border-indigo-400/20 bg-slate-900/95 shadow-2xl shadow-purple-500/10 backdrop-blur-md",
              "bottom-4 right-4 h-[calc(100vh-6rem)] w-[420px]",
              "max-md:bottom-0 max-md:right-0 max-md:h-[100vh] max-md:w-full max-md:rounded-none"
            )}
          >
            <div className="flex items-center justify-between border-b border-indigo-400/20 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Moon className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-astral-text">
                    Celeste
                  </p>
                  <p className="text-[10px] text-astral-textMuted">
                    Celestial Guide
                  </p>
                </div>
              </div>
              <button
                onClick={closeCeleste}
                className="rounded-lg p-1.5 text-astral-textMuted transition-colors hover:bg-indigo-500/15 hover:text-astral-text"
                aria-label="Close Celeste"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <ChatWindow compact initialQuestion={pendingQuestion} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
