"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Moon, Paperclip, FileText, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ChatMarkdown } from "@/components/ChatMarkdown";

const MAX_PDF_SIZE = 5 * 1024 * 1024; // 5 MB — must match server limit

export type ChatMessage = {
  role: "user" | "celeste" | "system";
  content: string;
  attachment?: string;
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

      setAttachment({ file, text: data.text ?? "", status: "ready" });
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

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    if (attachment && attachment.status === "uploading") return;

    const userMessage = text.trim();
    const pdfContext = attachment?.status === "ready" ? attachment.text : undefined;
    const attachmentName = attachment?.file.name;

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
          history,
          ...(pdfContext ? { pdfContext } : {})
        })
      });
      const data = (await res.json()) as {
        output?: string;
        message?: string;
        guardrailAction?: string;
        newlyRevealed?: string[];
      };

      if (!res.ok) {
        throw new Error(data.message ?? "Chat request failed.");
      }

      const output =
        data.guardrailAction === "BLOCKED"
          ? "The stars sense something amiss with that question. Could you rephrase it for me, stargazer?"
          : data.output ?? "The cosmos is silent on that one. Try asking in a different way.";

      setMessages((prev) => [...prev, { role: "celeste", content: output }]);

      if (data.newlyRevealed && data.newlyRevealed.length > 0) {
        const count = data.newlyRevealed.length;
        toast(
          `${count === 1 ? "A new Astral Card has" : `${count} new Astral Cards have`} been revealed!`,
          {
            description: "Check your card collection to see what you've unlocked.",
            icon: <Sparkles className="h-4 w-4 text-amber-400" />,
            duration: 6000
          }
        );
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
              <ChatMarkdown content={item.content} className="text-sm leading-relaxed" />
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
