"use client";

import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed [overflow-wrap:anywhere]">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-current/40 pl-3 opacity-90">{children}</blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="break-all underline decoration-indigo-400/60 underline-offset-2 hover:text-indigo-200"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-3 border-t border-current/20" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-current/20 bg-black/20 px-2 py-1 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-current/15 px-2 py-1 align-top [overflow-wrap:anywhere]">{children}</td>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-black/35 p-3 text-xs leading-relaxed">{children}</pre>
  ),
  code: ({ className, children }) => {
    const isFenced = Boolean(className);
    if (isFenced) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-black/30 px-1 py-0.5 font-mono text-[0.85em] [overflow-wrap:anywhere]">
        {children}
      </code>
    );
  }
};

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
