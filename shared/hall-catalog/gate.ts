/**
 * Hall catalog gate — Golden 100 + Performance 50 + Hall Classics (internal collections).
 * Customer-facing labels never expose internal collection names.
 */

import { GOLDEN_100_RECIPES, getGoldenRecipeBySlug } from "../golden-100/manifest.js";
import {
  PERFORMANCE_ADAPTED_RECIPES,
  getPerformanceRecipeBySlug,
} from "../performance-meals/adapted/index.js";
import { getClassicHallMeal, CLASSIC_HALL_MEALS } from "../classic-hall-meals.js";
import { performancePageHeroPath } from "../performance-meals/recipe-page-paths.js";
import {
  HALL_EXPANSION_ADAPTED_RECIPES,
  getHallExpansionRecipeBySlug,
} from "../hall-expansion/adapted/index.js";
import { hallExpansionHeroPath } from "../hall-expansion/recipe-page-paths.js";
import {
  BREAKFAST_SLUG_SET,
  breakfastCatalogHeroPath,
  getBreakfastCatalogTitle,
  isBreakfastCatalogSlug,
} from "../breakfast-catalog/slug-registry.js";
import type { RecipeSourceAttribution } from "../canonical-recipe.js";

/** Internal editorial collection ids (admin / telemetry only). */
export type CatalogCollectionId =
  | "golden_100"
  | "performance_50"
  | "hall_expansion_56"
  | "breakfast_catalog";

/** Customer-facing catalog badges — never use internal collection names. */
export type CatalogPublicBadge =
  | "Firehall Meals Catalog"
  | "Performance Meal"
  | "Hall Classic"
  | "Crew Favorite"
  | "High Protein"
  | "Quick Shift Meal";

/** @deprecated Use CatalogPublicBadge — kept for gradual migration. */
export type CatalogBadge = CatalogPublicBadge;

export interface CatalogBadgeContext {
  featured?: boolean;
  explorePool?: string;
  firehallCategory?: string;
  nutritionProfile?: string;
  sourceKind?: string;
}

export interface CatalogGateInput {
  slug?: string | null;
  title?: string | null;
  heroImage?: string | null;
  recipeSource?: RecipeSourceAttribution | { type?: string; kind?: string } | null;
  source?: string | null;
}

export interface CatalogGateResult {
  approved: boolean;
  slug: string | null;
  catalogTitle: string | null;
  badge: CatalogPublicBadge | null;
  collection: CatalogCollectionId | null;
  matchedBy: string | null;
  score: number | null;
  reasons: string[];
}

const GOLDEN_SLUG_SET = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));
const PERFORMANCE_SLUG_SET = new Set(PERFORMANCE_ADAPTED_RECIPES.map((r) => r.manifest.slug));
const HALL_EXPANSION_SLUG_SET = new Set(HALL_EXPANSION_ADAPTED_RECIPES.map((r) => r.slug));
const CLASSIC_SLUG_SET = new Set(CLASSIC_HALL_MEALS.map((m) => m.slug));

const DISALLOWED_SOURCES = new Set([
  "emergency_pool",
  "template_fallback",
  "ai_generated",
  "synthetic",
  "spoonacular_v2",
  "spoonacular_v2_relaxed",
  "ingredient_assembly",
]);

const OWNED_IMAGE_PREFIXES = [
  "/images/golden-100/",
  "/images/performance-50/",
  "/images/hall-expansion/",
  "/images/breakfast/",
  "/images/mobile/",
  "/images/thumbs/",
  "/images/rails/",
  "/images/explore/",
] as const;

export function normalizeCatalogSlug(slug: string | null | undefined): string {
  return (slug || "").trim().toLowerCase();
}

export function isGolden100Slug(slug: string | null | undefined): boolean {
  const s = normalizeCatalogSlug(slug);
  return s.length > 0 && GOLDEN_SLUG_SET.has(s);
}

export function isPerformance50Slug(slug: string | null | undefined): boolean {
  const s = normalizeCatalogSlug(slug);
  return s.length > 0 && PERFORMANCE_SLUG_SET.has(s);
}

export function isHallExpansionSlug(slug: string | null | undefined): boolean {
  const s = normalizeCatalogSlug(slug);
  return s.length > 0 && HALL_EXPANSION_SLUG_SET.has(s);
}

export { isBreakfastCatalogSlug };

export function isApprovedCatalogSlug(slug: string | null | undefined): boolean {
  return (
    isGolden100Slug(slug) ||
    isPerformance50Slug(slug) ||
    isHallExpansionSlug(slug) ||
    isBreakfastCatalogSlug(slug)
  );
}

/** @deprecated Prefer isApprovedCatalogSlug */
export function isHallCatalogSlug(slug: string | null | undefined): boolean {
  return isApprovedCatalogSlug(slug);
}

export function isHallClassicSlug(slug: string | null | undefined): boolean {
  const s = normalizeCatalogSlug(slug);
  if (CLASSIC_SLUG_SET.has(s)) return true;
  const golden = getGoldenRecipeBySlug(s);
  return Boolean(golden?.classicSlug && CLASSIC_SLUG_SET.has(golden.classicSlug));
}

export function resolveCatalogCollection(slug: string): CatalogCollectionId | null {
  const s = normalizeCatalogSlug(slug);
  if (BREAKFAST_SLUG_SET.has(s)) return "breakfast_catalog";
  if (HALL_EXPANSION_SLUG_SET.has(s)) return "hall_expansion_56";
  if (PERFORMANCE_SLUG_SET.has(s)) return "performance_50";
  if (GOLDEN_SLUG_SET.has(s)) return "golden_100";
  return null;
}

export function getCatalogTitle(slug: string): string | null {
  const s = normalizeCatalogSlug(slug);
  const golden = getGoldenRecipeBySlug(s);
  if (golden?.title) return golden.title;
  const perf = getPerformanceRecipeBySlug(s);
  if (perf?.manifest.title) return perf.manifest.title;
  const expansion = getHallExpansionRecipeBySlug(s);
  if (expansion?.title) return expansion.title;
  const breakfastTitle = getBreakfastCatalogTitle(s);
  if (breakfastTitle) return breakfastTitle;
  return null;
}

export function golden100HeroPath(slug: string): string {
  return `/images/golden-100/${normalizeCatalogSlug(slug)}.jpg`;
}

export function performance50HeroPath(slug: string): string {
  return `/images/performance-50/${normalizeCatalogSlug(slug)}.jpg`;
}

export function resolveCatalogHeroPath(slug: string): string {
  const s = normalizeCatalogSlug(slug);
  if (isBreakfastCatalogSlug(s)) {
    return breakfastCatalogHeroPath(s);
  }
  if (isHallExpansionSlug(s)) {
    return hallExpansionHeroPath(s);
  }
  if (isPerformance50Slug(s)) {
    return performancePageHeroPath(s);
  }
  return golden100HeroPath(s);
}

/** Primary customer-facing lineage badge for a catalog slug. */
export function resolvePrimaryCatalogBadge(slug: string): CatalogPublicBadge {
  if (isHallClassicSlug(slug)) return "Hall Classic";
  if (isPerformance50Slug(slug)) return "Performance Meal";
  return "Firehall Meals Catalog";
}

/** @deprecated Use resolvePrimaryCatalogBadge */
export function resolveCatalogBadge(slug: string): CatalogPublicBadge {
  return resolvePrimaryCatalogBadge(slug);
}

/** Optional trait badges layered on explore / detail surfaces. */
export function resolveCatalogTraitBadges(
  slug: string,
  ctx: CatalogBadgeContext = {},
): CatalogPublicBadge[] {
  const traits: CatalogPublicBadge[] = [];
  const pool = (ctx.explorePool || "").toLowerCase();
  const kind = (ctx.sourceKind || "").toLowerCase();

  if (ctx.featured || pool.includes("crew") || kind === "hall_classic") {
    traits.push("Crew Favorite");
  }
  if (
    isPerformance50Slug(slug) ||
    ctx.nutritionProfile === "high_protein" ||
    ctx.firehallCategory === "high_protein" ||
    pool.includes("performance")
  ) {
    traits.push("High Protein");
  }
  if (ctx.firehallCategory === "quick_meals" || pool.includes("quick")) {
    traits.push("Quick Shift Meal");
  }

  return traits.filter((t, i, arr) => arr.indexOf(t) === i);
}

export function resolveCatalogDisplayBadges(
  slug: string,
  ctx: CatalogBadgeContext = {},
): CatalogPublicBadge[] {
  const primary = resolvePrimaryCatalogBadge(slug);
  const traits = resolveCatalogTraitBadges(slug, ctx).filter((t) => t !== primary);
  return [primary, ...traits];
}

function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleMatchesCatalog(title: string, catalogTitle: string): boolean {
  const a = normalizeTitleForMatch(title);
  const b = normalizeTitleForMatch(catalogTitle);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith(b) || b.startsWith(a)) return true;

  const aWords = a.split(" ").filter(Boolean);
  const bWords = b.split(" ").filter(Boolean);
  const overlap = aWords.filter((w) => bWords.includes(w)).length;
  const minLen = Math.min(aWords.length, bWords.length);
  return minLen >= 2 && overlap >= Math.ceil(minLen * 0.6);
}

function isApprovedSourceAttribution(source: CatalogGateInput["recipeSource"]): boolean {
  if (!source) return true;
  const kind = String(
    (source as RecipeSourceAttribution).kind || (source as { type?: string }).type || "",
  )
    .trim()
    .toLowerCase();
  if (!kind) return true;
  if (kind.includes("ai") || kind.includes("template") || kind.includes("emergency")) return false;
  return (
    kind === "curated" ||
    kind === "catalog" ||
    kind === "golden_100" ||
    kind === "performance_meals_50" ||
    kind === "hall_expansion_56" ||
    kind === "hall_expansion_30" ||
    kind === "breakfast_catalog" ||
    kind === "hall_classic" ||
    kind === "publisher"
  );
}

export function imagePathBelongsToSlug(imagePath: string | null | undefined, slug: string): boolean {
  if (!imagePath?.trim()) return true;
  const path = imagePath.trim().toLowerCase();
  const s = normalizeCatalogSlug(slug);
  if (!s) return false;

  if (path.includes("spoonacular.com")) {
    const classic = getClassicHallMeal(s);
    if (classic?.heroImagePath && path.includes(classic.heroImagePath.toLowerCase())) return true;
    return false;
  }

  const owned = OWNED_IMAGE_PREFIXES.some((prefix) => path.includes(prefix));
  if (owned) return path.includes(`/${s}.`) || path.includes(`/${s}/`) || path.endsWith(`/${s}`);
  return path.includes(s);
}

export function evaluateCatalogRecipe(
  input: CatalogGateInput,
  options: { score?: number | null } = {},
): CatalogGateResult {
  const slug = normalizeCatalogSlug(input.slug);
  const reasons: string[] = [];

  if (!slug) {
    reasons.push("missing_slug");
    return {
      approved: false,
      slug: null,
      catalogTitle: null,
      badge: null,
      collection: null,
      matchedBy: null,
      score: options.score ?? null,
      reasons,
    };
  }

  const collection = resolveCatalogCollection(slug);
  if (!collection) {
    reasons.push("slug_not_in_approved_catalog");
    return {
      approved: false,
      slug,
      catalogTitle: null,
      badge: null,
      collection: null,
      matchedBy: null,
      score: options.score ?? null,
      reasons,
    };
  }

  const catalogTitle = getCatalogTitle(slug);
  if (!catalogTitle) {
    reasons.push("missing_catalog_title");
  }

  const badge = resolvePrimaryCatalogBadge(slug);
  const matchedBy =
    collection === "performance_50"
      ? "performance_50_index"
      : collection === "hall_expansion_56"
        ? "hall_expansion_index"
        : collection === "breakfast_catalog"
          ? "breakfast_catalog_index"
          : "golden_100_index";

  if (input.source && DISALLOWED_SOURCES.has(String(input.source).toLowerCase())) {
    reasons.push(`disallowed_source:${input.source}`);
  }

  if (!isApprovedSourceAttribution(input.recipeSource)) {
    reasons.push("recipe_source_not_catalog");
  }

  const title = (input.title || "").trim();
  if (catalogTitle && title && !titleMatchesCatalog(title, catalogTitle)) {
    reasons.push("title_mismatch");
  }

  if (input.heroImage && !imagePathBelongsToSlug(input.heroImage, slug)) {
    reasons.push("image_slug_mismatch");
  }

  return {
    approved: reasons.length === 0,
    slug,
    catalogTitle,
    badge,
    collection,
    matchedBy,
    score: options.score ?? null,
    reasons,
  };
}

export function isApprovedCatalogRecipe(input: CatalogGateInput): boolean {
  return evaluateCatalogRecipe(input).approved;
}

export function enforceCatalogIdentity<T extends Record<string, unknown>>(
  payload: T,
  slug: string,
): T & {
  catalog_badge: CatalogPublicBadge;
  _slug: string;
  hero_image: string;
  title: string;
} {
  const normalized = normalizeCatalogSlug(slug);
  const title = getCatalogTitle(normalized) || String(payload.title || "");
  const badge = resolvePrimaryCatalogBadge(normalized);
  const hero = resolveCatalogHeroPath(normalized);

  return {
    ...payload,
    title,
    catalog_badge: badge,
    _slug: normalized,
    hero_image: hero,
    hero_image_alt: title,
    hero_image_status: "ready",
    hall_curated: true,
  };
}

export function filterApprovedCatalogSlugs<T extends { slug: string }>(rows: T[]): T[] {
  return rows.filter((r) => isApprovedCatalogSlug(r.slug));
}

/** @deprecated Prefer filterApprovedCatalogSlugs */
export function filterGolden100Slugs<T extends { slug: string }>(rows: T[]): T[] {
  return filterApprovedCatalogSlugs(rows);
}

export interface HallCatalogSearchHit {
  slug: string;
  title: string;
  heroImage: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  collection: CatalogCollectionId;
}

export function searchHallCatalog(query: string, limit = 15): HallCatalogSearchHit[] {
  const q = query.trim().toLowerCase();

  const goldenPool = q
    ? GOLDEN_100_RECIPES.filter((r) => {
        const hay = `${r.title} ${r.slug} ${r.cuisine} ${r.protein} ${r.mealFormat}`.toLowerCase();
        return hay.includes(q);
      })
    : GOLDEN_100_RECIPES;

  const performancePool = q
    ? PERFORMANCE_ADAPTED_RECIPES.filter((r) => {
        const m = r.manifest;
        const hay = `${m.title} ${m.slug} ${m.cuisine} ${m.protein} ${m.mealFormat}`.toLowerCase();
        return hay.includes(q);
      })
    : PERFORMANCE_ADAPTED_RECIPES;

  const expansionPool = q
    ? HALL_EXPANSION_ADAPTED_RECIPES.filter((r) => {
        const hay =
          `${r.title} ${r.slug} ${r.cuisine} ${r.protein} ${r.mealFormat} ${r.category}`.toLowerCase();
        return hay.includes(q);
      })
    : HALL_EXPANSION_ADAPTED_RECIPES;

  const hits: HallCatalogSearchHit[] = [
    ...goldenPool.map((r) => ({
      slug: r.slug,
      title: r.title,
      heroImage: golden100HeroPath(r.slug),
      protein: r.protein,
      cuisine: r.cuisine,
      mealFormat: r.mealFormat,
      collection: "golden_100" as const,
    })),
    ...performancePool.map((r) => ({
      slug: r.manifest.slug,
      title: r.manifest.title,
      heroImage: resolveCatalogHeroPath(r.manifest.slug),
      protein: r.manifest.protein,
      cuisine: r.manifest.cuisine,
      mealFormat: r.manifest.mealFormat,
      collection: "performance_50" as const,
    })),
    ...expansionPool.map((r) => ({
      slug: r.slug,
      title: r.title,
      heroImage: hallExpansionHeroPath(r.slug),
      protein: r.protein,
      cuisine: r.cuisine,
      mealFormat: r.mealFormat,
      collection: "hall_expansion_56" as const,
    })),
  ];

  return hits.slice(0, Math.max(1, limit));
}

/** @deprecated Prefer searchHallCatalog */
export function searchGolden100Catalog(query: string, limit = 15): HallCatalogSearchHit[] {
  return searchHallCatalog(query, limit).filter((h) => h.collection === "golden_100");
}

export type CatalogRankBias = "performance" | "golden" | "mixed";

/** Generator ranking — which catalog to prioritize for a request. */
export function resolveCatalogRankBias(input: {
  firehall_category?: string;
  healthiness_preference?: string;
}): CatalogRankBias {
  const fc = input.firehall_category;
  if (fc === "high_protein" || fc === "healthy_options") return "performance";
  if (input.healthiness_preference === "lean") return "performance";
  if (
    fc === "comfort_food" ||
    fc === "bbq_smoker" ||
    fc === "feed_a_crowd" ||
    fc === "crew_favorites" ||
    fc === "game_day"
  ) {
    return "golden";
  }
  return "mixed";
}

export function catalogCollectionScoreBoost(
  collection: CatalogCollectionId,
  bias: CatalogRankBias,
): number {
  if (bias === "mixed") return 0;
  if (bias === "performance" && collection === "performance_50") return 30;
  if (bias === "golden" && collection === "golden_100") return 30;
  return -8;
}
