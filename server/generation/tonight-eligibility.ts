/**
 * Which catalog slugs "Pick Tonight's Meal" may serve, and with which protein.
 *
 * Tonight serves only what Explore shows (same image-identity gate) minus recipes whose photo
 * is a different dish, and filters protein with the same canonical value Explore displays.
 */

import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { classifyMealOccasions } from "../../shared/catalog/meal-occasions.js";
import { tonightImageHoldReason } from "../../shared/catalog-integrity/image-holds.js";
import { normalizeCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { canonicalTonightProtein } from "../meal-catalog/canonical-page.js";

let exploreSlugs: { revision: unknown; slugs: Set<string> } | null = null;

function exploreEligibleSlugs(): Set<string> {
  const catalog = getApprovedCatalog();
  if (!exploreSlugs || exploreSlugs.revision !== catalog) {
    exploreSlugs = { revision: catalog, slugs: new Set(catalog.recipes.map((r) => normalizeCatalogSlug(r.slug))) };
  }
  return exploreSlugs.slugs;
}

export function tonightIneligibleReason(slug: string): string | null {
  const s = normalizeCatalogSlug(slug);
  const hold = tonightImageHoldReason(s);
  if (hold) return `image_hold:${hold}`;
  if (!exploreEligibleSlugs().has(s)) return "not_explore_eligible";
  return null;
}

let standaloneMeals: { revision: unknown; slugs: Set<string> } | null = null;

/**
 * Approved slugs Pick Tonight may serve as the whole meal. Sides, appetizers, and
 * drinks (shared/catalog/meal-occasions.ts role) stay in Explore/browse but are never
 * tonight's dinner on their own. Shift Planner narrows by occasion pool instead.
 */
export function tonightStandaloneMealSlugs(): ReadonlySet<string> {
  const catalog = getApprovedCatalog();
  if (!standaloneMeals || standaloneMeals.revision !== catalog) {
    const slugs = new Set<string>();
    for (const r of catalog.recipes) {
      if (classifyMealOccasions(r).role !== "meal") continue;
      slugs.add(r.slug);
      slugs.add(normalizeCatalogSlug(r.slug));
    }
    standaloneMeals = { revision: catalog, slugs };
  }
  return standaloneMeals.slugs;
}

/** Protein value used for Tonight filtering — the generator family of Explore's canonical protein. */
export function tonightFilterProtein(rawProtein: string, slug: string): string {
  return canonicalTonightProtein(rawProtein, slug).family ?? rawProtein;
}
