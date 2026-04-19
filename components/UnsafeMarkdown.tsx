"use client";

import { useEffect, useRef } from "react";
import MarkdownIt from "markdown-it";

// html: true passes raw HTML blocks through to the DOM.
// naiveStrip removes <script> and on* attributes but misses javascript: URLs,
// <svg>, <iframe>, <form> and other injection vectors.
// This renderer is used only for Celeste's responses to document uploads.
const md = new MarkdownIt({ html: true });

function naiveStrip(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/\bon\w+\s*=/gi, "");
}

type UnsafeMarkdownProps = {
  content: string;
  className?: string;
};

export function UnsafeMarkdown({ content, className }: UnsafeMarkdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Browsers block javascript: navigations in iframe src; evaluate them manually.
    el.querySelectorAll<HTMLIFrameElement>('iframe[src^="javascript:"]').forEach((iframe) => {
      const src = iframe.getAttribute("src") ?? "";
      const code = src.slice("javascript:".length);

      // Intercept alert() so a successful XSS demonstration triggers the card unlock.
      const originalAlert = window.alert;
      let alertFired = false;
      window.alert = (...args: Parameters<typeof window.alert>) => {
        alertFired = true;
        originalAlert.apply(window, args);
      };

      try {
        // eslint-disable-next-line no-new-func
        new Function(code)();
      } catch {}

      window.alert = originalAlert;

      // Only dispatch once per browser session — multiple UnsafeMarkdown instances
      // (one per Celeste message) would each fire alert(), causing duplicate unlocks.
      if (alertFired && !sessionStorage.getItem("xss-unlock-fired")) {
        sessionStorage.setItem("xss-unlock-fired", "1");
        window.dispatchEvent(new CustomEvent("xss-card-unlock"));
      }
    });
  }, [content]);

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: naiveStrip(md.render(content)) }}
    />
  );
}
