import MarkdownIt from "markdown-it";
import { chatWithTools } from "@/lib/bedrock";

const md = new MarkdownIt({ html: false });

export default async function ReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const prompt = message?.trim() || "Give me a warm cosmic greeting.";

  let html = "";
  try {
    const { output } = await chatWithTools({ message: prompt });
    html = md.render(output);
  } catch {
    html = "<p>The stars are quiet right now. Try again soon.</p>";
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-astral-text">
          ✨ Your Celestial Reading
        </h1>
        <p className="mt-1 text-sm text-astral-textMuted">
          A personal message from Celeste
        </p>
      </div>
      <div
        className="prose prose-invert max-w-none rounded-xl bg-slate-900/60 p-6 text-astral-text leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
