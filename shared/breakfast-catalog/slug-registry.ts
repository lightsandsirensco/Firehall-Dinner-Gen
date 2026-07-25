/**
 * Breakfast catalog slug registry — used by hall gate + Explore routing (client-safe).
 */
import { NEW_BREAKFAST_PAGES } from "../breakfast-expansion/new-breakfast-pages.js";
import { BATCH_25_BREAKFAST_PAGES } from "../breakfast-expansion/batch-25-breakfast-pages.js";
import { BATCH_A_BREAKFAST_PAGES } from "../breakfast-expansion/batch-a-breakfast-pages.js";
import { BATCH_WAVE1_BREAKFAST_PAGES } from "../breakfast-expansion/batch-wave1-breakfast-pages.js";

/** Original 22 breakfast seeds (pre-expansion). */
export const BASE_BREAKFAST_CATALOG_SLUGS = [
  "hall-breakfast-burritos",
  "chorizo-breakfast-burritos",
  "turkey-sausage-burritos",
  "bacon-hash-burritos",
  "veggie-egg-burritos",
  "cast-iron-breakfast-skillet",
  "bacon-egg-hash-skillet",
  "ham-pepper-skillet",
  "steakhouse-hash-skillet",
  "turkey-sausage-egg-bake",
  "ham-cheddar-egg-bake",
  "southwest-egg-bake",
  "sheet-pan-breakfast-hash",
  "quick-egg-tacos",
  "breakfast-sandwich-trays",
  "sausage-egg-cheese-sandwiches",
  "bbq-breakfast-hash",
  "protein-pancake-tray",
  "crew-french-toast-bake",
  "buttermilk-pancakes",
  "big-pot-savory-oats",
  "high-protein-parfaits",
] as const;

const BASE_BREAKFAST_TITLES: Record<(typeof BASE_BREAKFAST_CATALOG_SLUGS)[number], string> = {
  "hall-breakfast-burritos": "Hall Breakfast Burritos",
  "chorizo-breakfast-burritos": "Chorizo Breakfast Burritos",
  "turkey-sausage-burritos": "Turkey Sausage Breakfast Burritos",
  "bacon-hash-burritos": "Bacon Hash Burritos",
  "veggie-egg-burritos": "Veggie Egg Burritos",
  "cast-iron-breakfast-skillet": "Cast Iron Breakfast Skillet",
  "bacon-egg-hash-skillet": "Bacon Egg Hash Skillet",
  "ham-pepper-skillet": "Ham & Pepper Breakfast Skillet",
  "steakhouse-hash-skillet": "Steakhouse Hash Skillet",
  "turkey-sausage-egg-bake": "Turkey Sausage Egg Bake",
  "ham-cheddar-egg-bake": "Ham & Cheddar Egg Bake",
  "southwest-egg-bake": "Southwest Egg Bake",
  "sheet-pan-breakfast-hash": "Sheet Pan Breakfast Hash",
  "quick-egg-tacos": "Quick Egg Tacos",
  "breakfast-sandwich-trays": "Breakfast Sandwich Trays",
  "sausage-egg-cheese-sandwiches": "Sausage Egg & Cheese Sandwiches",
  "bbq-breakfast-hash": "BBQ Breakfast Hash",
  "protein-pancake-tray": "Protein Pancake Tray",
  "crew-french-toast-bake": "Crew French Toast Bake",
  "buttermilk-pancakes": "Buttermilk Pancakes for the Crew",
  "big-pot-savory-oats": "Big-Pot Savory Oats",
  "high-protein-parfaits": "High-Protein Yogurt Parfaits",
};

export const BREAKFAST_CATALOG_SLUGS = [
  ...BASE_BREAKFAST_CATALOG_SLUGS,
  ...NEW_BREAKFAST_PAGES.map((p) => p.slug),
  ...BATCH_25_BREAKFAST_PAGES.map((p) => p.slug),
  ...BATCH_A_BREAKFAST_PAGES.map((p) => p.slug),
  ...BATCH_WAVE1_BREAKFAST_PAGES.map((p) => p.slug),
] as const;

export const BREAKFAST_SLUG_SET = new Set<string>(BREAKFAST_CATALOG_SLUGS);

export function isBreakfastCatalogSlug(slug: string | null | undefined): boolean {
  const s = (slug || "").trim().toLowerCase();
  return s.length > 0 && BREAKFAST_SLUG_SET.has(s);
}

export function breakfastCatalogHeroPath(slug: string): string {
  return `/images/breakfast/${(slug || "").trim().toLowerCase()}.jpg`;
}

export function breakfastCatalogThumbPath(slug: string): string {
  return `/images/thumbs/breakfast/${(slug || "").trim().toLowerCase()}.jpg`;
}

export function getBreakfastCatalogTitle(slug: string): string | null {
  const s = (slug || "").trim().toLowerCase();
  const fromBatch = BATCH_25_BREAKFAST_PAGES.find((p) => p.slug === s);
  if (fromBatch?.title) return fromBatch.title;
  const fromNew = NEW_BREAKFAST_PAGES.find((p) => p.slug === s);
  if (fromNew?.title) return fromNew.title;
  return BASE_BREAKFAST_TITLES[s as (typeof BASE_BREAKFAST_CATALOG_SLUGS)[number]] ?? null;
}
