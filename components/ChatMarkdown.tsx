"use client";

import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false });

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: md.render(content) }}
    />
  );
}
