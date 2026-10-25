import MarkdownIt from "markdown-it";
import { redirect } from "next/navigation";
import { chatWithTools } from "@/lib/bedrock";
import { getAuthenticatedUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";

const md = new MarkdownIt({ html: false });

export default async function ReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  // Every render calls Bedrock, so this page must sit behind the same auth +
  // rate limit as /api/chat. Otherwise any crawler or shared link could run
  // up model costs and use Celeste's tools anonymously.
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect("/login");
  }

  const { message } = await searchParams;
  const prompt = message?.trim().slice(0, 500) || "Give me a warm cosmic greeting.";

  let html = "";
  if (isRateLimited(userId)) {
    html = "<p>The stars need a moment to realign. Try again in a minute.</p>";
  } else {
    try {
      const { output } = await chatWithTools({ message: prompt, userId });
      html = md.render(output);
    } catch {
      html = "<p>The stars are quiet right now. Try again soon.</p>";
    }
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
