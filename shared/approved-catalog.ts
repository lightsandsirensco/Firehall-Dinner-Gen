/**
 * Approved curated catalog — Explore and public browse source of truth.
 */

import type { CatalogPublicBadge } from "./hall-catalog/gate.js";
import {
  isHallClassicSlug,
  isHallExpansionSlug,
  isPerformance50Slug,
  isBreakfastCatalogSlug,
  isBbqCatalogSlug,
} from "./hall-catalog/gate.js";
import { isPerformanceBreakfastSlug } from "./breakfast-catalog/governance-types.js";
import {
  slugLockedImagePaths,
  type ExploreCatalogImageKind,
} from "./explore-image-paths.js";
import { CATALOG_ASSET_REVISION } from "./meal-catalog/asset-revision.js";
import type { DietarySummary } from "./dietary/schema.js";

export type ApprovedCatalogKind = ExploreCatalogImageKind;

export type ApprovedCatalogPrimaryFilter = "all" | "healthy" | "bbq_grill" | "smoothies";

export type ApprovedCatalogCookTimeBucket = "under_30" | "30_to_60" | "over_60";

export interface ApprovedCatalogEntry {
  slug: string;
  title: string;
  kind: ApprovedCatalogKind;
  category: string;
  categoryLabel: string;
  cuisine: string;
  protein: string;
  mealFormat: string;
  cookTime: number;
  cookTimeBucket: ApprovedCatalogCookTimeBucket;
  heroImage: string;
  thumbImage: string;
  /** Thumb file mtime (seconds) — appended as ?v= for mobile grid cache busting. */
  thumbCacheVersion: number;
  /** Hero file mtime (seconds) — for recipe detail cache busting. */
  heroCacheVersion: number;
  tags: string[];
  searchText: string;
  catalogBadge: CatalogPublicBadge;
  traitBadges: CatalogPublicBadge[];
  isSmoothie: boolean;
  isHealthy: boolean;
  isBbqGrill: boolean;
  isHighProtein: boolean;
  isLowCleanup: boolean;
  /** Food-safety dietary/allergen classification — undefined only for legacy entries that predate the audit. */
  dietarySummary?: DietarySummary;
}

export interface ApprovedCatalogResponse {
  version: 2;
  /** Deploy/catalog bump — invalidates client query keys when changed. */
  assetRevision: typeof CATALOG_ASSET_REVISION;
  recipeCount: number;
  recipes: ApprovedCatalogEntry[];
}

/** Lightweight fields for Explore grid — no hero URLs in JSON payload. */
export type ApprovedCatalogGridEntry = Omit<ApprovedCatalogEntry, "heroImage" | "heroCacheVersion">;

export interface ApprovedCatalogGridResponse {
  version: 2;
  assetRevision: typeof CATALOG_ASSET_REVISION;
  recipeCount: number;
  recipes: ApprovedCatalogGridEntry[];
}

export function toApprovedCatalogGridResponse(
  catalog: ApprovedCatalogResponse,
): ApprovedCatalogGridResponse {
  return {
    version: catalog.version,
    assetRevision: catalog.assetRevision,
    recipeCount: catalog.recipeCount,
    recipes: catalog.recipes.map(({ heroImage: _hero, heroCacheVersion: _hv, ...rest }) => rest),
  };
}

export const APPROVED_CATALOG_COOK_TIME_LABELS: Record<ApprovedCatalogCookTimeBucket, string> = {
  under_30: "Under 30 min",
  "30_to_60": "30–60 min",
  over_60: "Over 60 min",
};

export const APPROVED_CATALOG_PRIMARY_LABELS: Record<ApprovedCatalogPrimaryFilter, string> = {
  all: "All",
  healthy: "Healthy",
  bbq_grill: "BBQ & Grill",
  smoothies: "Smoothies",
};

export function formatApprovedCatalogCategory(id: string): string {
  return id.replace(/_/g, " ");
}

export function approvedCatalogCookTimeBucket(minutes: number): ApprovedCatalogCookTimeBucket {
  if (minutes < 30) return "under_30";
  if (minutes <= 60) return "30_to_60";
  return "over_60";
}

/** Canonical curated hero paths for Explore cards (slug-locked). */
export function approvedCatalogHeroPath(slug: string, kind: ApprovedCatalogKind): string {
  return slugLockedImagePaths(slug, kind).hero;
}

/** Card image for Explore — slug-locked thumb (never full hero). */
export function approvedCatalogCardImagePath(slug: string, kind: ApprovedCatalogKind): string {
  const paths = slugLockedImagePaths(slug, kind);
  return paths.thumb || paths.rail || paths.mobile;
}

export function resolveApprovedCatalogKind(slug: string, isSmoothie = false): ApprovedCatalogKind {
  if (isSmoothie) return "smoothie";
  if (isBreakfastCatalogSlug(slug)) return "breakfast_catalog";
  if (isBbqCatalogSlug(slug)) return "bbq_catalog";
  if (isHallClassicSlug(slug)) return "hall_classic";
  if (isHallExpansionSlug(slug)) return "hall_expansion";
  if (isPerformance50Slug(slug)) return "performance_meal";
  return "firehall_catalog";
}

/** Public recipe detail route for an approved catalog slug. */
export function approvedCatalogRecipePath(slug: string): string {
  const s = (slug || "").trim().toLowerCase();
  if (!s) return "/explore";
  if (isBreakfastCatalogSlug(s)) {
    if (isPerformanceBreakfastSlug(s)) {
      return `/breakfast/performance/${encodeURIComponent(s)}`;
    }
    return `/breakfast/${encodeURIComponent(s)}`;
  }
  return `/recipes/${encodeURIComponent(s)}`;
}
