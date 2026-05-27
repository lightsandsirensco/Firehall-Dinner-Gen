/**
 * Read/write Golden 100 static catalog pages to client/public.
 */

import fs from "node:fs";
import path from "node:path";
import {
  goldenCatalogIndexSchema,
  goldenRecipePageSchema,
  GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  type GoldenCatalogIndex,
  type GoldenCatalogIndexEntry,
  type GoldenRecipePage,
} from "../../shared/golden-100/recipe-page-schema.js";

export const GOLDEN_CATALOG_PUBLIC_DIR = path.join(
  process.cwd(),
  "client",
  "public",
  "catalog",
  "golden-100",
);

export const GOLDEN_CATALOG_PAGES_DIR = path.join(GOLDEN_CATALOG_PUBLIC_DIR, "pages");

export function writeGoldenRecipePage(page: GoldenRecipePage): string {
  const parsed = goldenRecipePageSchema.parse(page);
  fs.mkdirSync(GOLDEN_CATALOG_PAGES_DIR, { recursive: true });
  const file = path.join(GOLDEN_CATALOG_PAGES_DIR, `${parsed.slug}.json`);
  fs.writeFileSync(file, JSON.stringify(parsed, null, 2), "utf8");
  return file;
}

export function readGoldenRecipePage(slug: string): GoldenRecipePage | null {
  const file = path.join(GOLDEN_CATALOG_PAGES_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    return goldenRecipePageSchema.parse(raw);
  } catch {
    return null;
  }
}

export function writeGoldenCatalogIndex(pages: GoldenRecipePage[]): string {
  const entries: GoldenCatalogIndexEntry[] = pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    category: p.category,
    cuisine: p.cuisine,
    protein: p.tags.find((t) => t.startsWith("protein:"))?.replace("protein:", "") ?? "",
    mealFormat: p.tags.find((t) => t.startsWith("format:"))?.replace("format:", "") ?? "",
    cookTime: p.cookTime,
    difficulty: p.difficulty,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    tags: p.tags,
    firefighterScore: p.firefighterScore,
    popularityWeight: p.popularityWeight,
    searchTerms: p.searchTerms,
  }));

  const index: GoldenCatalogIndex = {
    version: 1,
    contentVersion: GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
    generatedAt: new Date().toISOString(),
    recipeCount: entries.length,
    recipes: entries,
  };

  goldenCatalogIndexSchema.parse(index);
  fs.mkdirSync(GOLDEN_CATALOG_PUBLIC_DIR, { recursive: true });
  const file = path.join(GOLDEN_CATALOG_PUBLIC_DIR, "index.json");
  fs.writeFileSync(file, JSON.stringify(index, null, 2), "utf8");
  return file;
}

export function listGoldenPageSlugs(): string[] {
  if (!fs.existsSync(GOLDEN_CATALOG_PAGES_DIR)) return [];
  return fs
    .readdirSync(GOLDEN_CATALOG_PAGES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}
