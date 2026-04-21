"use client";

import { useEffect } from "react";
import MarkdownIt from "markdown-it";

// html: true passes raw HTML blocks through to the DOM.
// naiveStrip removes <script>, <iframe>, and on* attributes but misses
// javascript: URLs, <svg>, <form> and other injection vectors.
// This renderer is used only for Celeste's responses to document uploads.
const md = new MarkdownIt({ html: true });

function naiveStrip(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<iframe\b[^>]*\/?>/gi, "")
    .replace(/\bon\w+\s*=/gi, "");
}

type UnsafeMarkdownProps = {
  content: string;
  className?: string;
  fromDocument?: boolean;
};

export function UnsafeMarkdown({ content, className, fromDocument }: UnsafeMarkdownProps) {
  useEffect(() => {
    // Intercept alert() so any successful XSS payload rendered through this
    // component — regardless of vector — triggers the card unlock.
    const originalAlert = window.alert;
    window.alert = (...args: Parameters<typeof window.alert>) => {
      window.dispatchEvent(
        new CustomEvent("xss-card-unlock", { detail: { fromDocument: !!fromDocument } })
      );
      originalAlert.apply(window, args);
    };
    return () => {
      window.alert = originalAlert;
    };
  }, [fromDocument]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: naiveStrip(md.render(content)) }}
    />
  );
}
