import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { getAllArticles } from "@/lib/articles";

export const metadata = {
  title: "Articles | AstralChat",
  description: "Cosmic guides on astrology, compatibility, and celestial cycles."
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
      <header className="mb-12 text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-astral-indigo">
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Journal</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-astral-text md:text-4xl">
          Articles
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-astral-textMuted">
          Deep dives into signs, planets, houses, and the stories the stars tell.
        </p>
      </header>

      <div className="space-y-4">
        {articles.map((article) => (
          <article key={article.slug}>
            <Link
              href={`/articles/${article.slug}`}
              className="group block rounded-xl border border-indigo-400/15 bg-slate-900/50 p-6 backdrop-blur transition-colors hover:border-indigo-400/30 hover:bg-slate-900/70"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-semibold text-astral-text transition-colors group-hover:text-astral-indigo">
                    {article.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-astral-textMuted">
                    {article.excerpt}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-astral-indigo opacity-80 transition-opacity group-hover:opacity-100">
                  Read
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
