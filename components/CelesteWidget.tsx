"use client";

import { Moon, X, SquarePen, ArrowLeft, Trash2, MessageCircle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCeleste } from "@/components/CelesteProvider";
import ChatWindow, { type ChatMessage } from "@/components/ChatWindow";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "celeste_conversations";

const GREETING: ChatMessage = {
  role: "celeste",
  content:
    "Greetings, stargazer. I am Celeste, your celestial guide through the cosmos. Ask about your star sign, compatibility, or personality reading \u2014 the stars have much to reveal."
};

type CelesteConversation = {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
};

function loadConversations(): CelesteConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CelesteConversation[]) : [];
  } catch {
    return [];
  }
}

function persist(convs: CelesteConversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {}
}

function createConversation(): CelesteConversation {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: new Date().toISOString(),
    messages: [GREETING]
  };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function CelesteWidget() {
  const { session } = useAuth();
  const { isOpen, pendingQuestion, openCeleste, closeCeleste } = useCeleste();

  const [conversations, setConversations] = useState<CelesteConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "chat">("list");
  // Track which conv ID should receive the pending initial question
  const [pendingForConvId, setPendingForConvId] = useState<string | null>(null);

  const didInitRef = useRef(false);

  // Initialise when widget opens
  useEffect(() => {
    if (!isOpen) {
      didInitRef.current = false;
      return;
    }
    if (didInitRef.current) return;
    didInitRef.current = true;

    const convs = loadConversations();

    if (pendingQuestion) {
      // Always open a fresh conversation for a pending question
      const conv = createConversation();
      const updated = [conv, ...convs];
      persist(updated);
      setConversations(updated);
      setActiveId(conv.id);
      setPendingForConvId(conv.id);
      setView("chat");
    } else if (convs.length === 0) {
      // First ever open — drop straight into a new conversation
      const conv = createConversation();
      persist([conv]);
      setConversations([conv]);
      setActiveId(conv.id);
      setView("chat");
    } else {
      setConversations(convs);
      setActiveId(null);
      setView("list");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function startNewConversation() {
    const conv = createConversation();
    const updated = [conv, ...conversations];
    persist(updated);
    setConversations(updated);
    setActiveId(conv.id);
    setPendingForConvId(null);
    setView("chat");
  }

  function openConversation(id: string) {
    setActiveId(id);
    setView("chat");
  }

  function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = conversations.filter((c) => c.id !== id);
    persist(updated);
    setConversations(updated);
    if (activeId === id) {
      setActiveId(null);
      setView("list");
    }
  }

  function handleMessagesChange(messages: ChatMessage[]) {
    if (!activeId) return;
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== activeId) return c;
        const firstUser = messages.find((m) => m.role === "user");
        const title = firstUser
          ? firstUser.content.slice(0, 45) + (firstUser.content.length > 45 ? "\u2026" : "")
          : c.title;
        return { ...c, messages, title };
      });
      persist(updated);
      return updated;
    });
  }

  const activeConv = conversations.find((c) => c.id === activeId) ?? null;

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
              "bottom-4 right-4 h-[calc(100vh-4.5rem)] w-[500px]",
              "max-md:bottom-0 max-md:right-0 max-md:h-[100vh] max-md:w-full max-md:rounded-none"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-indigo-400/20 px-4 py-3">
              <div className="flex items-center gap-2.5">
                {view === "chat" && (
                  <button
                    onClick={() => setView("list")}
                    className="rounded-lg p-1.5 text-astral-textMuted transition-colors hover:bg-indigo-500/15 hover:text-astral-text"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Moon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-astral-text">
                    {view === "chat" && activeConv ? activeConv.title : "Celeste"}
                  </p>
                  <p className="text-[10px] text-astral-textMuted">Celestial Guide</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={startNewConversation}
                  className="rounded-lg p-1.5 text-astral-textMuted transition-colors hover:bg-indigo-500/15 hover:text-astral-text"
                  aria-label="New conversation"
                  title="New conversation"
                >
                  <SquarePen className="h-4 w-4" />
                </button>
                <button
                  onClick={closeCeleste}
                  className="rounded-lg p-1.5 text-astral-textMuted transition-colors hover:bg-indigo-500/15 hover:text-astral-text"
                  aria-label="Close Celeste"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              {view === "list" ? (
                <div className="flex h-full flex-col overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                      <MessageCircle className="h-10 w-10 text-indigo-400/40" />
                      <p className="text-sm text-astral-textMuted">No conversations yet.</p>
                      <button
                        onClick={startNewConversation}
                        className="rounded-lg bg-indigo-500/20 px-4 py-2 text-sm text-indigo-300 transition-colors hover:bg-indigo-500/30"
                      >
                        Start a conversation
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-indigo-400/10">
                      {conversations.map((conv) => (
                        <li key={conv.id} className="group">
                          <button
                            onClick={() => openConversation(conv.id)}
                            className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-indigo-500/10"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                              <Moon className="h-4 w-4 text-purple-300" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-astral-text">
                                {conv.title}
                              </p>
                              <p className="text-[11px] text-astral-textMuted">
                                {formatDate(conv.createdAt)}
                              </p>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => deleteConversation(conv.id, e)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  deleteConversation(conv.id, e as unknown as React.MouseEvent);
                                }
                              }}
                              className="ml-1 rounded-lg p-1.5 text-astral-textMuted opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/15 hover:text-red-400 focus:opacity-100"
                              aria-label="Delete conversation"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : activeConv ? (
                <ChatWindow
                  key={activeConv.id}
                  compact
                  initialMessages={activeConv.messages}
                  initialQuestion={pendingForConvId === activeConv.id ? pendingQuestion : undefined}
                  onMessagesChange={handleMessagesChange}
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}
