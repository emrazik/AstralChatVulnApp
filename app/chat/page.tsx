"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Send, Hash, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/components/AuthProvider";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { cn } from "@/lib/utils";

type DirectMessage = {
  conversationId: string;
  sentAt: string;
  senderId: string;
  content: string;
};

type ConversationSummary = {
  conversationId: string;
  isChannel?: boolean;
  channelName?: string;
  participant: {
    userId: string;
    hexId: string;
    displayName: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageAt: string;
};

const BOT_NAMES: Record<string, string> = {
  "luna-system": "Luna",
  "nova-system": "Nova"
};

export default function ChatPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const displayedMessages = messages;

  useEffect(() => {
    if (!authLoading && !session?.authenticated) {
      router.replace("/login");
    }
  }, [authLoading, session?.authenticated, router]);

  useEffect(() => {
    if (!session?.authenticated) return;
    void loadConversations();
  }, [session?.authenticated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages]);

  async function loadConversations() {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !activeConv) {
        await selectConversation(data.conversations[0]);
      }
    } finally {
      setLoadingConvs(false);
    }
  }

  async function selectConversation(conv: ConversationSummary) {
    setActiveConv(conv);
    setLoadingMsgs(true);
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/messages/${conv.conversationId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages: DirectMessage[] };
      setMessages(data.messages);
    } finally {
      setLoadingMsgs(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending || !activeConv) return;

    const content = message.trim();
    setMessage("");
    setSending(true);

    const optimistic: DirectMessage = {
      conversationId: activeConv.conversationId,
      sentAt: new Date().toISOString(),
      senderId: session?.userId ?? "",
      content
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/messages/${activeConv.conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      // fire and forget — optimistic message already in state
    } catch {
      /* optimistic stays */
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  if (authLoading || !session?.authenticated) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-astral-textMuted">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex w-72 shrink-0 flex-col border-r border-indigo-400/15 bg-slate-900/60",
          "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-72",
          !sidebarOpen && "max-md:hidden"
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-indigo-400/15 px-4">
          <MessageSquare className="h-5 w-5 text-astral-indigo" />
          <h2 className="text-sm font-semibold text-astral-text">Messages</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <p className="p-4 text-sm text-astral-textMuted">Loading…</p>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-astral-textMuted">No conversations yet.</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.conversationId}
                onClick={() => void selectConversation(conv)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-indigo-500/10",
                  activeConv?.conversationId === conv.conversationId &&
                    "bg-indigo-500/15"
                )}
              >
                {conv.isChannel ? (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/20">
                    <Hash className="h-5 w-5 text-indigo-300" />
                  </div>
                ) : conv.participant.avatar ? (
                  <Image
                    src={conv.participant.avatar}
                    alt={conv.participant.displayName}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-200">
                      {conv.participant.displayName[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-astral-text">
                      {conv.isChannel ? `# ${conv.channelName}` : conv.participant.displayName}
                    </span>
                    <span className="text-[10px] text-astral-textMuted">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-astral-textMuted">
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Overlay backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main message area */}
      <div className="flex flex-1 flex-col">
        {activeConv ? (
          <>
            {/* Thread header */}
            <div className="flex h-14 items-center gap-3 border-b border-indigo-400/15 bg-slate-900/40 px-4 backdrop-blur">
              <button
                className="md:hidden rounded p-1 text-astral-textMuted hover:text-astral-text"
                onClick={() => setSidebarOpen(true)}
              >
                <Hash className="h-5 w-5" />
              </button>
              {activeConv.isChannel ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20">
                  <Hash className="h-4 w-4 text-indigo-300" />
                </div>
              ) : activeConv.participant.avatar ? (
                <Image
                  src={activeConv.participant.avatar}
                  alt={activeConv.participant.displayName}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-200">
                    {activeConv.participant.displayName[0]}
                  </AvatarFallback>
                </Avatar>
              )}
              <div>
                {activeConv.isChannel ? (
                  <>
                    <p className="text-sm font-medium text-astral-text"># {activeConv.channelName}</p>
                    <p className="text-[10px] text-astral-textMuted">Luna · Nova · You</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-astral-text">
                      {activeConv.participant.displayName}
                    </p>
                    <p className="text-[10px] font-mono text-astral-textMuted">
                      {activeConv.participant.hexId}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {loadingMsgs ? (
                <p className="text-center text-sm text-astral-textMuted">
                  Loading messages…
                </p>
              ) : (
                <div className="space-y-4">
                  {displayedMessages.map((msg, i) => {
                    const isMe = msg.senderId === session?.userId;
                    const showAvatar =
                      !isMe &&
                      (i === 0 || displayedMessages[i - 1].senderId !== msg.senderId);
                    return (
                      <div
                        key={`${msg.sentAt}-${i}`}
                        className={cn(
                          "flex gap-3",
                          isMe ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        {!isMe && showAvatar ? (
                          activeConv.isChannel ? (
                            <Avatar className="mt-0.5 h-8 w-8">
                              <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-200">
                                {(BOT_NAMES[msg.senderId] ?? "?")[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : activeConv.participant.avatar ? (
                            <Image
                              src={activeConv.participant.avatar}
                              alt={activeConv.participant.displayName}
                              width={32}
                              height={32}
                              className="mt-0.5 h-8 w-8 rounded-full"
                            />
                          ) : (
                            <Avatar className="mt-0.5 h-8 w-8">
                              <AvatarFallback className="bg-indigo-500/20 text-xs text-indigo-200">
                                {activeConv.participant.displayName[0]}
                              </AvatarFallback>
                            </Avatar>
                          )
                        ) : !isMe ? (
                          <div className="w-8" />
                        ) : null}
                        <div
                          className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
                            isMe
                              ? "bg-indigo-500/25 text-indigo-100"
                              : "bg-slate-800/60 text-astral-text"
                          )}
                        >
                          {showAvatar && !isMe && (
                            <p className="mb-0.5 text-xs font-semibold text-astral-indigo">
                              {activeConv.isChannel
                                ? (BOT_NAMES[msg.senderId] ?? msg.senderId)
                                : activeConv.participant.displayName}
                            </p>
                          )}
                          <ChatMarkdown
                            content={msg.content}
                            className="text-sm leading-relaxed"
                          />
                          <p className="mt-1 text-right text-[10px] text-astral-textMuted">
                            {formatTime(msg.sentAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-indigo-300/15 bg-slate-900/50 p-4 backdrop-blur">
              <form className="flex gap-2" onSubmit={handleSend}>
                  <Input
                    className="flex-1 border-indigo-300/20 bg-slate-950 placeholder:text-slate-500 focus-visible:ring-indigo-400/40"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={activeConv.isChannel ? "Message # general…" : `Message ${activeConv.participant.displayName}…`}
                    disabled={sending}
                  />
                  <Button
                    type="submit"
                    disabled={sending || !message.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-astral-textMuted">
            <MessageSquare className="h-10 w-10 opacity-40" />
            <p className="text-sm">Select a conversation to start chatting</p>
            <button
              className="text-sm text-astral-indigo underline md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              View conversations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
