/**
 * Read/write editorial guides to client/public.
 */

import fs from "node:fs";
import path from "node:path";
import {
  editorialArticleSchema,
  editorialCatalogIndexSchema,
  EDITORIAL_CONTENT_VERSION,
  type EditorialArticle,
  type EditorialCatalogIndex,
  type EditorialIndexEntry,
} from "../../shared/editorial/content-schema.js";

export const EDITORIAL_PUBLIC_DIR = path.join(process.cwd(), "client", "public", "content", "guides");
export const EDITORIAL_PAGES_DIR = path.join(EDITORIAL_PUBLIC_DIR, "pages");

export function writeEditorialArticle(article: EditorialArticle): string {
  const parsed = editorialArticleSchema.parse(article);
  fs.mkdirSync(EDITORIAL_PAGES_DIR, { recursive: true });
  const file = path.join(EDITORIAL_PAGES_DIR, `${parsed.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2), "utf8");
  return file;
}

export function readEditorialArticle(slug: string): EditorialArticle | null {
  const file = path.join(EDITORIAL_PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return editorialArticleSchema.parse(raw);
}

export function listEditorialSlugs(): string[] {
  if (!fs.existsSync(EDITORIAL_PAGES_DIR)) return [];
  return fs
    .readdirSync(EDITORIAL_PAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

export function writeEditorialIndex(entries: EditorialIndexEntry[]): string {
  const index: EditorialCatalogIndex = {
    version: EDITORIAL_CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    articleCount: entries.length,
    articles: entries,
  };
  editorialCatalogIndexSchema.parse(index);
  fs.mkdirSync(EDITORIAL_PUBLIC_DIR, { recursive: true });
  const file = path.join(EDITORIAL_PUBLIC_DIR, "index.json");
  fs.writeFileSync(file, JSON.stringify(index, null, 2), "utf8");
  return file;
}

export function readEditorialIndex(): EditorialCatalogIndex | null {
  const file = path.join(EDITORIAL_PUBLIC_DIR, "index.json");
  if (!fs.existsSync(file)) return null;
  return editorialCatalogIndexSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
}
