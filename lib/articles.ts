import fs from "fs";
import path from "path";

const ARTICLES_DIR = path.join(process.cwd(), "content", "articles");

export type ArticleMeta = {
  slug: string;
  title: string;
  excerpt: string;
  filename: string;
};

function fileToSlug(filename: string): string | null {
  if (!filename.endsWith(".md")) return null;
  if (!filename.startsWith("article-")) return null;
  return filename.slice("article-".length, -".md".length);
}

function parseArticleFile(filename: string): ArticleMeta | null {
  const slug = fileToSlug(filename);
  if (!slug) return null;

  const fullPath = path.join(ARTICLES_DIR, filename);
  const raw = fs.readFileSync(fullPath, "utf8");
  const lines = raw.split("\n");

  let title = slug.replace(/-/g, " ");
  let bodyStart = 0;
  const first = lines[0]?.trim();
  if (first?.startsWith("# ")) {
    title = first.slice(2).trim();
    bodyStart = 1;
    while (bodyStart < lines.length && lines[bodyStart].trim() === "") {
      bodyStart++;
    }
  }

  const body = lines.slice(bodyStart).join("\n").trim();
  const firstBlock = body.split(/\n\n+/)[0] ?? "";
  const plain = firstBlock.replace(/\*\*|__/g, "").replace(/^[-*]\s+/gm, "");
  let excerpt = plain.slice(0, 200).trim();
  if (plain.length > 200) excerpt = `${excerpt.slice(0, 197)}…`;

  return { slug, title, excerpt, filename };
}

export function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(ARTICLES_DIR)) return [];
  return fs
    .readdirSync(ARTICLES_DIR)
    .map(parseArticleFile)
    .filter((a): a is ArticleMeta => a !== null)
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function getArticleBySlug(
  slug: string
): { meta: ArticleMeta; content: string } | null {
  const filename = `article-${slug}.md`;
  const fullPath = path.join(ARTICLES_DIR, filename);
  if (!fs.existsSync(fullPath)) return null;

  const meta = parseArticleFile(filename);
  if (!meta) return null;

  const raw = fs.readFileSync(fullPath, "utf8");
  let content = raw.trim();
  if (content.startsWith("# ")) {
    content = content.replace(/^# [^\n]+\n+/, "").trim();
  }

  return { meta, content };
}

export function getArticleSlugs(): string[] {
  return getAllArticles().map((a) => a.slug);
}
