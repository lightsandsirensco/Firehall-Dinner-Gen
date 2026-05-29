/**
 * Hard boundaries — fuel content must never surface in dinner flows.
 */

import { FUEL_CATALOG_TAGS } from "./constants.js";
import { SMOOTHIE_CATALOG_SLUGS } from "./smoothies/manifest.js";

const FUEL_SLUG_SET = new Set<string>(SMOOTHIE_CATALOG_SLUGS);

const BLOCKED_TITLE_PATTERN =
  /\b(smoothie|smoothies|protein shake|recovery shake|meal replacement shake)\b/i;

const BLOCKED_MEAL_FORMAT = new Set([
  "smoothie",
  "shake",
  "drink",
  "breakfast_drink",
]);

export function isFuelCatalogTag(tag: string): boolean {
  const t = tag.trim().toLowerCase();
  return FUEL_CATALOG_TAGS.some((ft) => t === ft || t.includes(ft));
}

export function isFuelCatalogSlug(slug: string): boolean {
  return FUEL_SLUG_SET.has(slug.trim().toLowerCase());
}

/** True when a curated / catalog row must be excluded from dinner generator, explore, wheel */
export function isExcludedFromDinnerFeeds(input: {
  slug?: string;
  tags?: string[];
  title?: string;
  mealFormat?: string;
}): boolean {
  if (input.slug && isFuelCatalogSlug(input.slug)) return true;
  if (input.tags?.some((t) => isFuelCatalogTag(t))) return true;
  if (input.mealFormat && BLOCKED_MEAL_FORMAT.has(input.mealFormat.toLowerCase())) return true;
  if (input.title && BLOCKED_TITLE_PATTERN.test(input.title)) {
    // Allow "breakfast burrito" etc. — only block clear drink titles
    if (/\b(smoothie|shake)\b/i.test(input.title)) return true;
  }
  return false;
}

export function filterDinnerOnlySlugs<T extends { slug: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isFuelCatalogSlug(r.slug));
}

export function filterDinnerOnlyCatalog<T extends { slug: string; tags?: string[] }>(
  rows: T[],
): T[] {
  return rows.filter((r) => !isExcludedFromDinnerFeeds(r));
}
