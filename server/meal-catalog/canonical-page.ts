/**
 * Canonical recipe record for an approved catalog slug.
 *
 * The recipe detail page (/api/catalog/golden-100/:slug) and Explore are built from this
 * record, so "Pick Tonight's Meal" must resolve the same slug to the same record — never to a
 * DB copy, a classic-package lookup under a different slug, or a re-composed AI-style plate.
 */

import type { GoldenRecipePage } from "../../shared/golden-100/recipe-page-schema.js";
import { canonicalExploreProtein } from "../../shared/explore-taxonomy.js";
import { normalizeCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { resolveHallRecipePage } from "./load-index.js";
import { sanitizeRecipeHeroSurface } from "../sanitize-verified-recipe-hero.js";

export type CanonicalCatalogPage = GoldenRecipePage;

export const CANONICAL_PAGE_DIRS = ["golden-100", "performance-meals", "hall-expansion", "bbq"] as const;

export function loadCanonicalCatalogPage(slug: string): CanonicalCatalogPage | null {
  return resolveHallRecipePage(normalizeCatalogSlug(slug));
}

/** Canonical page with the same hero verification the detail page applies. */
export function loadCanonicalCatalogPageForDisplay(
  slug: string,
): (CanonicalCatalogPage & { heroVerified: boolean }) | null {
  const page = loadCanonicalCatalogPage(slug);
  return page ? sanitizeRecipeHeroSurface(page) : null;
}

/** Generator protein filter family for a canonical (Explore) protein label; null = no single family. */
export function generatorProteinFamily(exploreLabel: string): string | null {
  const key = exploreLabel.trim().toLowerCase();
  if (key === "chicken") return "chicken";
  if (key === "beef") return "beef";
  if (["pork", "sausage", "bacon", "ham"].includes(key)) return "pork";
  if (key === "turkey") return "turkey";
  if (["fish", "salmon", "shrimp", "seafood", "tuna", "cod"].includes(key)) return "seafood";
  if (["vegetarian", "vegan", "beans", "eggs", "tofu"].includes(key)) return "vegetarian";
  if (key === "mixed protein") return "mixed";
  return null;
}

/** Canonical protein for Tonight filtering/chips — identical to the label Explore shows. */
export function canonicalTonightProtein(rawProtein: string, slug: string): { label: string; family: string | null } {
  const label = canonicalExploreProtein(rawProtein, slug);
  return { label, family: generatorProteinFamily(label) };
}
