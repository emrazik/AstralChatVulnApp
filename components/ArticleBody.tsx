import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
  p: ({ children }) => (
    <p className="mb-4 last:mb-0 text-base leading-relaxed text-astral-text [overflow-wrap:anywhere]">
      {children}
    </p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-astral-text">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-astral-text">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="mb-4 mt-8 text-2xl font-bold tracking-tight text-astral-text first:mt-0 md:text-3xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 border-b border-indigo-400/15 pb-2 text-xl font-semibold text-astral-text">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-6 text-lg font-semibold text-astral-indigo">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-4 border-astral-purple/50 bg-indigo-500/5 py-2 pl-4 pr-2 italic text-astral-textMuted">
      {children}
    </blockquote>
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
  hr: () => <hr className="my-10 border-t border-indigo-400/20" />,
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-indigo-400/15">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-indigo-400/20 bg-slate-800/80 px-4 py-2 font-semibold text-astral-text">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-indigo-400/10 px-4 py-2 align-top text-astral-text [overflow-wrap:anywhere]">
      {children}
    </td>
  ),
  pre: ({ children }) => (
    <pre className="my-6 overflow-x-auto rounded-xl bg-slate-950/80 p-4 text-sm leading-relaxed ring-1 ring-indigo-400/10">
      {children}
    </pre>
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

type ArticleBodyProps = {
  content: string;
};

export function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div className="text-astral-text">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
