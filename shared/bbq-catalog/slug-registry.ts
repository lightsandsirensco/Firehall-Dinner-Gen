/**
 * BBQ catalog slug registry — Explore routing + image paths (client-safe).
 */
import { BBQ_CATALOG_RECIPES } from "../bbq-expansion/batch-25-bbq-recipes.js";

export const BBQ_CATALOG_SLUGS = BBQ_CATALOG_RECIPES.map((r) => r.manifest.slug) as readonly string[];

export const BBQ_SLUG_SET = new Set<string>(BBQ_CATALOG_SLUGS);

export function isBbqCatalogSlug(slug: string | null | undefined): boolean {
  const s = (slug || "").trim().toLowerCase();
  return s.length > 0 && BBQ_SLUG_SET.has(s);
}

export function bbqCatalogHeroPath(slug: string): string {
  return `/images/smoker-catalog/${(slug || "").trim().toLowerCase()}.jpg`;
}

export function bbqCatalogThumbPath(slug: string): string {
  return `/images/thumbs/smoker-catalog/${(slug || "").trim().toLowerCase()}.jpg`;
}

export function getBbqCatalogTitle(slug: string): string | null {
  const s = (slug || "").trim().toLowerCase();
  return BBQ_CATALOG_RECIPES.find((r) => r.manifest.slug === s)?.manifest.title ?? null;
}
