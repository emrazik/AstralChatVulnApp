import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getArticleBySlug, getArticleSlugs } from "@/lib/articles";
import { ArticleBody } from "@/components/ArticleBody";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const data = getArticleBySlug(slug);
  if (!data) return { title: "Article | AstralChat" };
  return {
    title: `${data.meta.title} | AstralChat`,
    description: data.meta.excerpt
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const data = getArticleBySlug(slug);
  if (!data) notFound();

  const { meta, content } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      <Link
        href="/articles"
        className="mb-8 inline-flex items-center gap-1 text-sm text-astral-textMuted transition-colors hover:text-astral-indigo"
      >
        <ChevronLeft className="h-4 w-4" />
        All articles
      </Link>

      <article>
        <header className="mb-10 border-b border-indigo-400/15 pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-astral-text md:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-4 text-base text-astral-textMuted">{meta.excerpt}</p>
        </header>

        <ArticleBody content={content} />
      </article>

      <footer className="mt-14 border-t border-indigo-400/15 pt-8">
        <Link
          href="/articles"
          className="text-sm font-medium text-astral-indigo hover:underline"
        >
          ← Back to articles
        </Link>
      </footer>
    </div>
  );
}
