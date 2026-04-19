"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Moon, Paperclip, FileText, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { UnsafeMarkdown } from "@/components/UnsafeMarkdown";
import { AchievementDialog } from "@/components/AchievementDialog";
import { lookupCardById } from "@/lib/cards";
import type { AstralCard } from "@/lib/cards";
import { SECRET_KEY_CARD_ID, KB_FLAG_CARD_ID, SSRF_CARD_ID } from "@/lib/overseer";

const XSS_CARD_ID = "scorpio-abyssal-sting";
const IPI_CARD_ID = "gemini-mirror-strike";
const BOLA_CARD_ID = "libra-gale-arbiter";

type Achievement = {
  card: AstralCard;
  title: string;
  subtitle: string;
  description: string;
};

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB — must match server limit

type LinkPreview = {
  url: string;
  title: string;
  description: string;
};

export type ChatMessage = {
  role: "user" | "celeste" | "system";
  content: string;
  attachment?: string;
  previews?: LinkPreview[];
  fromDocument?: boolean;
};

type PdfAttachment = {
  file: File;
  text: string | null;
  status: "uploading" | "ready" | "error";
  error?: string;
};

type ChatWindowProps = {
  initialQuestion?: string;
  compact?: boolean;
  initialMessages?: ChatMessage[];
  onMessagesChange?: (messages: ChatMessage[]) => void;
};

function validatePdfClientSide(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return "Only PDF files are allowed.";
  }
  if (file.type !== "application/pdf") {
    return "Invalid file type. Only PDF files are allowed.";
  }
  if (file.size === 0) {
    return "File is empty.";
  }
  if (file.size > MAX_PDF_SIZE) {
    return "File is too large. Maximum size is 5 MB.";
  }
  return null;
}

const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    role: "celeste",
    content:
      "Greetings, stargazer. I am Celeste, your celestial guide through the cosmos. Ask about your star sign, compatibility, or personality reading \u2014 the stars have much to reveal."
  }
];

export default function ChatWindow({ initialQuestion, compact, initialMessages, onMessagesChange }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? DEFAULT_MESSAGES);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState<PdfAttachment | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<Achievement[]>([]);
  const xssUnlockInFlight = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialSent = useRef(false);
  const isMounted = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    onMessagesChange?.(messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (initialQuestion && !initialSent.current) {
      initialSent.current = true;
      sendMessage(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    async function handleXssUnlock() {
      if (xssUnlockInFlight.current) return;
      xssUnlockInFlight.current = true;
      try {
        const res = await fetch("/api/cards/xss-unlock", { method: "POST" });
        if (!res.ok) return;
        const data = (await res.json()) as { newlyRevealed?: string[] };
        const newAchievements: Achievement[] = [];
        if (data.newlyRevealed?.includes(XSS_CARD_ID)) {
          const card = lookupCardById(XSS_CARD_ID);
          if (card) newAchievements.push({
            card,
            title: "Cross-Site Scripting",
            subtitle: "> XSS Payload Executed",
            description: "You bypassed the visual scanner and naiveStrip() filter to execute arbitrary JavaScript in the chat window via a malicious PDF."
          });
        }
        if (data.newlyRevealed?.includes(IPI_CARD_ID)) {
          const card = lookupCardById(IPI_CARD_ID);
          if (card) newAchievements.push({
            card,
            title: "Indirect Prompt Injection",
            subtitle: "> Hidden PDF Payload Triggered",
            description: "You embedded a hidden prompt injection payload in a PDF that bypassed the visual scanner and manipulated Celeste into delivering your XSS payload."
          });
        }
        if (newAchievements.length > 0) {
          setAchievementQueue((q) => [...q, ...newAchievements]);
        }
      } catch {}
    }
    window.addEventListener("xss-card-unlock", handleXssUnlock);
    return () => window.removeEventListener("xss-card-unlock", handleXssUnlock);
  }, []);

  async function uploadPdf(file: File) {
    const clientError = validatePdfClientSide(file);
    if (clientError) {
      setAttachment({ file, text: null, status: "error", error: clientError });
      return;
    }

    setAttachment({ file, text: null, status: "uploading" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData
      });
      const data = (await res.json()) as { text?: string; message?: string };

      if (!res.ok) {
        setAttachment({
          file,
          text: null,
          status: "error",
          error: data.message ?? "Upload failed."
        });
        return;
      }

      setAttachment(null);
      await sendMessage(`I've uploaded ${file.name}. Please read it.`, {
        pdfContext: data.text ?? "",
        attachmentName: file.name
      });
    } catch {
      setAttachment({
        file,
        text: null,
        status: "error",
        error: "Network error. Could not upload PDF."
      });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadPdf(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment() {
    setAttachment(null);
  }

  function extractUrls(text: string): string[] {
    const matches = text.match(/https?:\/\/[^\s)>\]"'`]+/g) ?? [];
    return [...new Set(matches)].slice(0, 3);
  }

  async function fetchPreviews(urls: string[]): Promise<LinkPreview[]> {
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const res = await fetch(`/api/preview?${new URLSearchParams({ url })}`);
          if (!res.ok) return null;
          return (await res.json()) as LinkPreview;
        } catch {
          return null;
        }
      })
    );
    return results.filter((r): r is LinkPreview => r !== null && !("error" in r));
  }

  async function sendMessage(
    text: string,
    override?: { pdfContext?: string; attachmentName?: string }
  ) {
    if (!text.trim() || loading) return;
    if (!override && attachment && attachment.status === "uploading") return;

    const userMessage = text.trim();
    const pdfContext =
      override?.pdfContext ?? (attachment?.status === "ready" ? attachment.text : undefined);
    const attachmentName = override?.attachmentName ?? attachment?.file.name;

    setMessage("");
    setAttachment(null);
    setLoading(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, attachment: attachmentName }
    ]);

    try {
      const history = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role === "celeste" ? "assistant" : "user",
          content: m.content
        }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: history.length > 0 ? history : undefined,
          pdfContext: pdfContext ?? undefined
        })
      });

      let data: { output?: string; message?: string; guardrailAction?: string; newlyRevealed?: string[] } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server error (HTTP ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(data.message ?? "Chat request failed.");
      }

      const output =
        data.guardrailAction === "BLOCKED"
          ? "The stars sense something amiss with that question. Could you rephrase it for me, stargazer?"
          : data.output ?? "The cosmos is silent on that one. Try asking in a different way.";

      const urls = extractUrls(output);
      const previews = urls.length > 0 ? await fetchPreviews(urls) : [];
      setMessages((prev) => [
        ...prev,
        {
          role: "celeste",
          content: output,
          previews: previews.length > 0 ? previews : undefined,
          fromDocument: pdfContext != null
        }
      ]);

      if (data.newlyRevealed && data.newlyRevealed.length > 0) {
        // Secret key extraction — show the achievement popup
        if (data.newlyRevealed.includes(SECRET_KEY_CARD_ID)) {
          const card = lookupCardById(SECRET_KEY_CARD_ID);
          if (card) setAchievementQueue((q) => [...q, {
            card,
            title: "Prompt Injection",
            subtitle: "> System Prompt Extraction",
            description: "You manipulated Celeste into revealing her hidden system instructions and extracted the secret key. The system has been compromised."
          }]);
        }

        if (data.newlyRevealed.includes(BOLA_CARD_ID)) {
          const card = lookupCardById(BOLA_CARD_ID);
          if (card) setAchievementQueue((q) => [...q, {
            card,
            title: "Broken Object Level Authorization",
            subtitle: "> Unauthorized Profile Access",
            description: "You exploited a missing authorization check to read another user's private profile data through Celeste's tool interface."
          }]);
        }

        if (data.newlyRevealed.includes(KB_FLAG_CARD_ID)) {
          const card = lookupCardById(KB_FLAG_CARD_ID);
          if (card) setAchievementQueue((q) => [...q, {
            card,
            title: "Knowledge Base Secret Exfiltration",
            subtitle: "> Planted API Key Leaked",
            description: "You coaxed Celeste into quoting a fake API key hidden inside a knowledge-base article. RAG happily retrieved it and echoed it back — no output filtering stood in the way."
          }]);
        }

        if (data.newlyRevealed.includes(SSRF_CARD_ID)) {
          const card = lookupCardById(SSRF_CARD_ID);
          if (card) setAchievementQueue((q) => [...q, {
            card,
            title: "Server-Side Request Forgery",
            subtitle: "> Outbound Probe Triggered",
            description: "You steered Celeste into emitting a collaborator-style URL. The link-preview endpoint fetched it server-side with no scheme allowlist or hostname blocklist — perfect for pivoting at internal services or cloud metadata endpoints."
          }]);
        }

        // Regular toast for any other newly revealed cards
        const otherCards = data.newlyRevealed.filter(
          (id) => id !== SECRET_KEY_CARD_ID && id !== BOLA_CARD_ID && id !== KB_FLAG_CARD_ID && id !== SSRF_CARD_ID
        );
        if (otherCards.length > 0) {
          toast(
            `${otherCards.length === 1 ? "A new Astral Card has" : `${otherCards.length} new Astral Cards have`} been revealed!`,
            {
              description: "Check your card collection to see what you've unlocked.",
              icon: <Sparkles className="h-4 w-4 text-amber-400" />,
              duration: 6000
            }
          );
        }
      }
    } catch (error) {
      const content = error instanceof Error ? error.message : "Unexpected error";
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Request failed: ${content}` }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    await sendMessage(message);
  }

  return (
    <div className="flex h-full flex-col">
      <AchievementDialog
        card={achievementQueue[0]?.card ?? null}
        open={achievementQueue.length > 0}
        onClose={() => setAchievementQueue((q) => q.slice(1))}
        title={achievementQueue[0]?.title}
        subtitle={achievementQueue[0]?.subtitle}
        description={achievementQueue[0]?.description}
      />
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((item, index) => (
          <div
            key={`${item.role}-${index}`}
            className={cn(
              "flex gap-3",
              item.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            {item.role === "celeste" && (
              <Avatar className="mt-0.5 h-8 w-8 shrink-0 border border-purple-400/30">
                <AvatarFallback className="bg-purple-500/20 text-purple-200">
                  <Moon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                item.role === "user"
                  ? "bg-indigo-500/25 text-indigo-100"
                  : item.role === "celeste"
                  ? "bg-purple-500/15 text-purple-100"
                  : "bg-red-500/20 text-red-200"
              )}
            >
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-astral-textMuted">
                {item.role === "celeste" ? "Celeste" : item.role === "user" ? "You" : "System"}
              </p>
              {item.attachment && (
                <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-300">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.attachment}</span>
                </div>
              )}
              {item.role === "celeste" ? (
                <UnsafeMarkdown content={item.content} className="text-sm leading-relaxed" />
              ) : (
                <ChatMarkdown content={item.content} className="text-sm leading-relaxed" />
              )}
              {item.previews && item.previews.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {item.previews.map((p) => (
                    <a
                      key={p.url}
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-indigo-400/20 bg-slate-900/60 px-3 py-2 text-xs transition-colors hover:border-indigo-400/40"
                    >
                      <p className="truncate font-medium text-indigo-200">{p.title}</p>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-2 text-astral-textMuted">{p.description}</p>
                      )}
                      <p className="mt-1 truncate text-[10px] text-indigo-400/60">{p.url}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <Avatar className="mt-0.5 h-8 w-8 shrink-0 border border-purple-400/30">
              <AvatarFallback className="bg-purple-500/20 text-purple-200">
                <Moon className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl bg-purple-500/15 px-4 py-3 text-sm text-purple-200">
              <span className="inline-flex gap-1">
                <span className="animate-pulse">Reading the stars</span>
                <span className="animate-pulse delay-100">.</span>
                <span className="animate-pulse delay-200">.</span>
                <span className="animate-pulse delay-300">.</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Attachment preview */}
      {attachment && (
        <div className="border-t border-indigo-300/10 bg-slate-900/30 px-4 py-2">
          <div className="mx-auto flex max-w-4xl items-center gap-2">
            {attachment.status === "uploading" && (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
            )}
            {attachment.status === "ready" && (
              <FileText className="h-4 w-4 shrink-0 text-emerald-400" />
            )}
            {attachment.status === "error" && (
              <FileText className="h-4 w-4 shrink-0 text-red-400" />
            )}
            <span
              className={cn(
                "truncate text-xs",
                attachment.status === "error" ? "text-red-300" : "text-slate-300"
              )}
            >
              {attachment.file.name}
              {attachment.status === "uploading" && " — extracting text…"}
              {attachment.status === "ready" && " — ready"}
              {attachment.status === "error" && ` — ${attachment.error}`}
            </span>
            <button
              type="button"
              onClick={removeAttachment}
              className="ml-auto rounded p-0.5 text-slate-400 transition-colors hover:text-slate-200"
              aria-label="Remove attachment"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className={cn("border-t border-indigo-300/15 bg-slate-900/50 backdrop-blur", compact ? "p-3" : "p-4")}>
        <form className={cn("flex gap-2", !compact && "mx-auto max-w-4xl")} onSubmit={submitMessage}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-slate-400 hover:text-indigo-300"
            disabled={loading || attachment?.status === "uploading"}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach PDF"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            className="flex-1 border-indigo-300/20 bg-slate-950 placeholder:text-slate-500 focus-visible:ring-indigo-400/40"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Celeste about the stars..."
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={loading || !message.trim() || attachment?.status === "uploading"}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
