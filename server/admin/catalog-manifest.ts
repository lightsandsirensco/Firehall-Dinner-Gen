/**
 * Admin "All Recipes" catalog manifest — a read-only, additive union of every
 * active canonical recipe catalog for browsing in Admin.
 *
 * Deliberately reuses `buildAllApprovedCatalogEntries()` (the existing
 * Explore/dinner-picker canonical merged index — see
 * `server/approved-catalog.ts`) as the source of truth rather than building
 * a second one. That function already merges Golden 100 + Performance Meals
 * + Hall Expansion + Breakfast + BBQ + Smoothies, slug-deduplicated, with
 * retired/deprecated slugs (`PHASE5_REMOVED_SLUGS`) already excluded via
 * `isApprovedCatalogSlug`.
 *
 * The one active catalog `buildAllApprovedCatalogEntries()` intentionally
 * omits is Pizza Night (it has its own `/pizza` hub and is deliberately kept
 * out of Explore/the dinner picker — see `loadRecipeLinkGraphCatalogIndex()`
 * in `server/meal-catalog/load-index.ts`). Admin browsing is a different
 * concern than customer-facing Explore eligibility, so Pizza Night entries
 * are unioned in here, additively, with the same slug-dedup and retired-slug
 * exclusion — never by changing `buildAllApprovedCatalogEntries()` itself.
 *
 * No recipe content, URLs, or file locations are changed by this module —
 * it only reads existing catalog indexes and re-shapes them for display.
 */
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/index.js";
import {
  buildAllApprovedCatalogEntries,
} from "../approved-catalog.js";
import type { ApprovedCatalogEntry } from "../../shared/approved-catalog.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import { isGolden100Slug } from "../../shared/hall-catalog/gate.js";
import { PHASE5_REMOVED_SLUGS } from "../../shared/catalog-consolidation/phase5-redirects.js";
import { isPizzaNightSlug } from "../../shared/pizza-night/manifest.js";
import { readPizzaNightCatalogIndexFromDisk } from "../pizza-night/page-store.js";

export type AdminCatalogSource =
  | "golden_100"
  | "performance_meal"
  | "hall_expansion"
  | "breakfast_catalog"
  | "bbq_catalog"
  | "smoothie"
  | "pizza_night"
  | "firehall_catalog";

export interface AdminCatalogEntry {
  slug: string;
  title: string;
  category: string;
  categoryLabel: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  cookTime: number;
  heroImage: string;
  thumbImage: string;
  /** Which underlying catalog this recipe's canonical identity lives in. */
  catalogSource: AdminCatalogSource;
  /** Preserves the Golden 100 distinction even for entries also tagged with another kind. */
  isGolden100: boolean;
  catalogBadge: ApprovedCatalogEntry["catalogBadge"] | null;
  /** Public recipe URL — unchanged from whatever the catalog already serves at. */
  previewPath: string;
}

export interface AdminCatalogManifest {
  generatedAt: string;
  recipeCount: number;
  summary: { bySource: Record<AdminCatalogSource, number> };
  recipes: AdminCatalogEntry[];
}

function approvedEntryToAdmin(entry: ApprovedCatalogEntry): AdminCatalogEntry {
  const catalogSource: AdminCatalogSource =
    entry.kind === "smoothie"
      ? "smoothie"
      : entry.kind === "breakfast_catalog"
        ? "breakfast_catalog"
        : entry.kind === "bbq_catalog"
          ? "bbq_catalog"
          : entry.kind === "hall_expansion"
            ? "hall_expansion"
            : entry.kind === "performance_meal"
              ? "performance_meal"
              : isGolden100Slug(entry.slug)
                ? "golden_100"
                : "firehall_catalog";

  return {
    slug: entry.slug,
    title: entry.title,
    category: entry.category,
    categoryLabel: entry.categoryLabel,
    protein: entry.protein,
    cuisine: entry.cuisine,
    mealFormat: entry.mealFormat,
    cookTime: entry.cookTime,
    heroImage: entry.heroImage,
    thumbImage: entry.thumbImage,
    catalogSource,
    isGolden100: isGolden100Slug(entry.slug),
    catalogBadge: entry.catalogBadge ?? null,
    previewPath: approvedCatalogRecipePath(entry.slug),
  };
}

/** Builds the unioned Admin "All Recipes" manifest. Read-only, additive, no new source of truth. */
export function buildAdminCatalogManifest(): AdminCatalogManifest {
  const approved = buildAllApprovedCatalogEntries();
  const seenSlugs = new Set(approved.map((r) => r.slug));
  const recipes: AdminCatalogEntry[] = approved.map(approvedEntryToAdmin);

  // Additive: Pizza Night, not part of buildAllApprovedCatalogEntries() by
  // design (see module comment above). Same dedup + retired-slug exclusion
  // rules applied here, inline, rather than modifying the shared
  // `isApprovedCatalogSlug` gate used by Explore.
  const pizzaIndex = readPizzaNightCatalogIndexFromDisk();
  for (const p of pizzaIndex?.recipes ?? []) {
    const slug = p.slug.trim().toLowerCase();
    if (seenSlugs.has(slug)) continue;
    if (PHASE5_REMOVED_SLUGS.has(slug)) continue;
    if (!isPizzaNightSlug(slug)) continue;
    seenSlugs.add(slug);
    recipes.push({
      slug,
      title: p.title,
      category: p.category,
      categoryLabel: p.category.replace(/_/g, " "),
      protein: p.protein,
      cuisine: p.cuisine,
      mealFormat: p.mealFormat,
      cookTime: p.cookTime,
      heroImage: p.heroImage,
      thumbImage: p.thumbImage,
      catalogSource: "pizza_night",
      isGolden100: false,
      catalogBadge: null,
      previewPath: approvedCatalogRecipePath(slug),
    });
  }

  recipes.sort((a, b) => a.title.localeCompare(b.title));

  const bySource: Record<AdminCatalogSource, number> = {
    golden_100: 0,
    performance_meal: 0,
    hall_expansion: 0,
    breakfast_catalog: 0,
    bbq_catalog: 0,
    smoothie: 0,
    pizza_night: 0,
    firehall_catalog: 0,
  };
  for (const r of recipes) bySource[r.catalogSource] += 1;

  return {
    generatedAt: new Date().toISOString(),
    recipeCount: recipes.length,
    summary: { bySource },
    recipes,
  };
}

// Re-exported for admin diagnostics/tests — total Golden 100 manifest size,
// independent of the merged view above (Golden 100 keeps its own dedicated
// admin page/workflow untouched).
export const GOLDEN_100_MANIFEST_COUNT = GOLDEN_100_RECIPES.length;
