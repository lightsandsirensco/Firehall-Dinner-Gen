/**
 * Build the approved curated catalog for Explore and public browse.
 */

import type { GoldenCatalogIndexEntry } from "../shared/golden-100/recipe-page-schema.js";
import {
  type ApprovedCatalogEntry,
  type ApprovedCatalogResponse,
  approvedCatalogCookTimeBucket,
  formatApprovedCatalogCategory,
  resolveApprovedCatalogKind,
} from "../shared/approved-catalog.js";
import { filterExploreEligibleCatalogEntries } from "../shared/explore-image-mapping.js";
import { buildCrossCatalogHeroAuditContext } from "./cross-catalog-hero-index.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import {
  isApprovedCatalogSlug,
  isHallClassicSlug,
  isPerformance50Slug,
  resolveCatalogTraitBadges,
  resolvePrimaryCatalogBadge,
} from "../shared/hall-catalog/gate.js";
import { loadMergedHallCatalogIndex } from "./meal-catalog/load-index.js";
import { readBreakfastCatalogIndexFromDisk } from "./breakfast-catalog/catalog.js";
import { readBbqCatalogIndexFromDisk } from "./bbq-catalog/catalog.js";
import type { BreakfastIndexEntry } from "../shared/breakfast-schema.js";
import { CATALOG_ASSET_REVISION } from "../shared/meal-catalog/asset-revision.js";
import { classifyRecipeDietary } from "../shared/dietary/classify-recipe.js";
import type { DietarySummary } from "../shared/dietary/schema.js";

const SMOOTHIE_COOK_MINUTES = 5;

function catalogImageFields(images: ReturnType<typeof resolveExistingSlugImage>): Pick<
  ApprovedCatalogEntry,
  "heroImage" | "thumbImage" | "thumbCacheVersion" | "heroCacheVersion"
> {
  return {
    heroImage: images.hero,
    thumbImage: images.thumb,
    thumbCacheVersion: images.thumbCacheVersion,
    heroCacheVersion: images.heroCacheVersion,
  };
}

function deriveMealFlags(
  entry: GoldenCatalogIndexEntry,
  isClassic: boolean,
): Pick<
  ApprovedCatalogEntry,
  "isHealthy" | "isBbqGrill" | "isHighProtein" | "isLowCarb" | "isLowCleanup"
> {
  const cat = entry.category;
  const tagHay = entry.tags.join(" ").toLowerCase();
  const isPerformance = isPerformance50Slug(entry.slug);
  const nutrition = entry.nutritionSummary;

  // "Healthy" and "High protein" are nutrition-threshold scoring rules (see
  // shared/nutrition/calculate.ts) computed from the recipe's actual per-serving
  // macros whenever an estimate is available — never a subjective tag/keyword
  // match. The category/performance-slug checks remain as an editorial fallback
  // ONLY for the rare recipe where no nutrition estimate could be computed at all
  // (nutrition.estimateAvailable === false), so those recipes aren't silently
  // dropped from every nutrition-based filter.
  const hasNutritionData = nutrition?.estimateAvailable === true;
  const isHealthy = hasNutritionData
    ? nutrition!.healthy
    : cat === "healthy_performance" || isPerformance;

  // "barbecue" was previously never matched (only "bbq"/"grill"/"smoker"),
  // so a recipe tagged solely "barbecue" silently missed the BBQ & Grill
  // filter — a pure synonym gap, not a real category distinction.
  const isBbqGrill =
    cat === "bbq_grill_nights" ||
    tagHay.includes("bbq") ||
    tagHay.includes("barbecue") ||
    tagHay.includes("grill") ||
    tagHay.includes("smoker");

  const isHighProtein = hasNutritionData
    ? nutrition!.highProtein
    : isPerformance || cat === "healthy_performance";

  const isLowCarb = hasNutritionData ? nutrition!.lowCarb : false;

  // "one pot" (unhyphenated) was previously never matched (only "one-pot"),
  // so a recipe tagged "one pot meal" silently missed the Low Cleanup filter.
  const isLowCleanup =
    cat === "rookie_friendly" ||
    cat === "meal_prep_leftovers" ||
    tagHay.includes("easy cleanup") ||
    tagHay.includes("one pan") ||
    tagHay.includes("one-pot") ||
    tagHay.includes("one pot") ||
    tagHay.includes("sheet pan");

  void isClassic;
  return { isHealthy, isBbqGrill, isHighProtein, isLowCarb, isLowCleanup };
}

function buildSearchText(parts: string[]): string {
  return parts.join(" ").toLowerCase();
}

function mealEntryToApproved(entry: GoldenCatalogIndexEntry): ApprovedCatalogEntry {
  const slug = entry.slug.trim().toLowerCase();
  const isClassic = isHallClassicSlug(slug);
  const kind = resolveApprovedCatalogKind(slug);
  const catalogBadge = resolvePrimaryCatalogBadge(slug);
  const traitBadges = resolveCatalogTraitBadges(slug, {
    firehallCategory: entry.category,
    nutritionProfile: isPerformance50Slug(slug) ? "high_protein" : undefined,
    sourceKind: isClassic ? "hall_classic" : undefined,
  }).filter((badge) => badge !== catalogBadge);
  const images = resolveExistingSlugImage(slug, kind);
  const flags = deriveMealFlags(entry, isClassic);

  return {
    slug,
    title: entry.title,
    kind,
    category: entry.category,
    categoryLabel: formatApprovedCatalogCategory(entry.category),
    cuisine: entry.cuisine,
    protein: entry.protein,
    mealFormat: entry.mealFormat,
    cookTime: entry.cookTime,
    cookTimeBucket: approvedCatalogCookTimeBucket(entry.cookTime),
    ...catalogImageFields(images),
    tags: entry.tags,
    searchText: buildSearchText([
      entry.title,
      entry.slug,
      entry.category,
      entry.cuisine,
      entry.protein,
      entry.mealFormat,
      ...entry.tags,
      ...entry.searchTerms,
    ]),
    catalogBadge,
    traitBadges,
    isSmoothie: false,
    ...flags,
    dietarySummary: entry.dietarySummary,
  };
}

function smoothieEntryToApproved(item: (typeof SMOOTHIE_CATALOG_ITEMS)[number]): ApprovedCatalogEntry {
  const slug = item.slug.trim().toLowerCase();
  const kind = "smoothie" as const;
  const images = resolveExistingSlugImage(slug, kind);
  const taxonomy = item.taxonomyCategory;
  const isHighProtein =
    taxonomy === "protein_smoothie" || taxonomy === "recovery_smoothie";
  const catalogBadge: ApprovedCatalogEntry["catalogBadge"] = isHighProtein
    ? "High Protein"
    : "Quick Shift Meal";
  const dietaryResult = classifyRecipeDietary(item.ingredients);
  const dietarySummary: DietarySummary = {
    confidence: dietaryResult.confidence,
    flags: dietaryResult.flags,
    adaptable: dietaryResult.adaptable,
  };

  return {
    slug,
    title: item.title,
    kind,
    category: "smoothies",
    categoryLabel: "Smoothie",
    cuisine: "American",
    protein: isHighProtein ? "Protein blend" : "Blend",
    mealFormat: "smoothie",
    cookTime: SMOOTHIE_COOK_MINUTES,
    cookTimeBucket: "under_30",
    ...catalogImageFields(images),
    tags: [item.subtitle, item.taxonomyCategory],
    searchText: buildSearchText([
      item.title,
      item.slug,
      "smoothie",
      item.subtitle,
      item.taxonomyCategory,
      item.intro,
    ]),
    catalogBadge,
    traitBadges: isHighProtein ? ["High Protein"] : [],
    isSmoothie: true,
    isHealthy: true,
    isBbqGrill: false,
    isHighProtein,
    isLowCarb: false,
    isLowCleanup: true,
    dietarySummary,
  };
}

function breakfastEntryToApproved(entry: BreakfastIndexEntry): ApprovedCatalogEntry {
  const slug = entry.slug.trim().toLowerCase();
  const kind = resolveApprovedCatalogKind(slug);
  const catalogBadge = resolvePrimaryCatalogBadge(slug);
  const traitBadges = resolveCatalogTraitBadges(slug, {
    firehallCategory: "breakfast_brunch",
    explorePool: entry.filters.join(" "),
  }).filter((badge) => badge !== catalogBadge);
  const images = resolveExistingSlugImage(slug, kind);
  const tagHay = entry.tags.join(" ").toLowerCase();
  const nutrition = entry.nutritionSummary;
  const hasNutritionData = nutrition?.estimateAvailable === true;
  const isHighProtein = hasNutritionData
    ? nutrition!.highProtein
    : entry.filters.includes("high_protein") || tagHay.includes("protein") || tagHay.includes("high-protein");
  const isLowCarb = hasNutritionData ? nutrition!.lowCarb : false;
  const isHealthy = hasNutritionData ? nutrition!.healthy : entry.filters.includes("healthy_breakfasts");

  return {
    slug,
    title: entry.title,
    kind,
    category: "breakfast_brunch",
    categoryLabel: "Breakfast & Brunch",
    cuisine: "American",
    protein: tagHay.includes("sausage")
      ? "Sausage"
      : tagHay.includes("bacon")
        ? "Bacon"
        : tagHay.includes("steak")
          ? "Steak"
          : "Eggs",
    mealFormat: "breakfast",
    cookTime: entry.totalTime,
    cookTimeBucket: approvedCatalogCookTimeBucket(entry.totalTime),
    ...catalogImageFields(images),
    tags: entry.tags,
    searchText: buildSearchText([
      entry.title,
      entry.slug,
      "breakfast",
      ...entry.filters,
      ...entry.tags,
    ]),
    catalogBadge,
    traitBadges,
    isSmoothie: false,
    isHealthy,
    isBbqGrill: entry.filters.includes("bbq_breakfast"),
    isHighProtein,
    isLowCarb,
    isLowCleanup: entry.totalTime <= 45,
    dietarySummary: entry.dietarySummary,
  };
}

function bbqEntryToApproved(entry: GoldenCatalogIndexEntry): ApprovedCatalogEntry {
  const slug = entry.slug.trim().toLowerCase();
  const kind = resolveApprovedCatalogKind(slug);
  const catalogBadge = resolvePrimaryCatalogBadge(slug);
  const traitBadges = resolveCatalogTraitBadges(slug, {
    firehallCategory: "bbq_grill_nights",
    explorePool: "bbq",
  }).filter((badge) => badge !== catalogBadge);
  const images = resolveExistingSlugImage(slug, kind);
  const tagHay = entry.tags.join(" ").toLowerCase();
  const nutrition = entry.nutritionSummary;
  const hasNutritionData = nutrition?.estimateAvailable === true;
  const isHighProtein = hasNutritionData
    ? nutrition!.highProtein
    : tagHay.includes("high_protein") || tagHay.includes("high protein");
  const isLowCarb = hasNutritionData ? nutrition!.lowCarb : false;
  const isHealthy = hasNutritionData ? nutrition!.healthy : tagHay.includes("healthy");

  return {
    slug,
    title: entry.title,
    kind,
    category: "bbq_grill_nights",
    categoryLabel: "BBQ & Grill",
    cuisine: entry.cuisine,
    protein: entry.protein,
    mealFormat: entry.mealFormat,
    cookTime: entry.cookTime,
    cookTimeBucket: approvedCatalogCookTimeBucket(entry.cookTime),
    ...catalogImageFields(images),
    tags: entry.tags,
    searchText: buildSearchText([
      entry.title,
      entry.slug,
      "bbq",
      "grill",
      "smoker",
      entry.category,
      entry.cuisine,
      entry.protein,
      entry.mealFormat,
      ...entry.tags,
      ...entry.searchTerms,
    ]),
    catalogBadge,
    traitBadges,
    isSmoothie: false,
    isHealthy,
    isBbqGrill: true,
    isHighProtein,
    isLowCarb,
    isLowCleanup: entry.cookTime <= 60 && !tagHay.includes("heavy"),
    dietarySummary: entry.dietarySummary,
  };
}

export function buildAllApprovedCatalogEntries(): ApprovedCatalogEntry[] {
  const index = loadMergedHallCatalogIndex();
  const mealSlugs = new Set<string>();

  const meals = index.recipes
    .filter((entry) => isApprovedCatalogSlug(entry.slug))
    .map((entry) => {
      mealSlugs.add(entry.slug.trim().toLowerCase());
      return mealEntryToApproved(entry);
    });

  const breakfastIndex = readBreakfastCatalogIndexFromDisk();
  const breakfasts = (breakfastIndex?.recipes ?? [])
    .filter((entry) => isApprovedCatalogSlug(entry.slug) && !mealSlugs.has(entry.slug))
    .map((entry) => {
      mealSlugs.add(entry.slug.trim().toLowerCase());
      return breakfastEntryToApproved(entry);
    });

  const bbqIndex = readBbqCatalogIndexFromDisk();
  const bbqRecipes = (bbqIndex?.recipes ?? [])
    .filter((entry) => isApprovedCatalogSlug(entry.slug) && !mealSlugs.has(entry.slug))
    .map((entry) => {
      mealSlugs.add(entry.slug.trim().toLowerCase());
      return bbqEntryToApproved(entry);
    });

  const smoothies = SMOOTHIE_CATALOG_ITEMS.filter((item) => !mealSlugs.has(item.slug)).map(
    smoothieEntryToApproved,
  );

  return [...meals, ...breakfasts, ...bbqRecipes, ...smoothies].sort((a, b) => a.title.localeCompare(b.title));
}

export function buildApprovedCatalog(): ApprovedCatalogResponse {
  const allRecipes = buildAllApprovedCatalogEntries();
  const crossCatalog = buildCrossCatalogHeroAuditContext(allRecipes);
  const { recipes } = filterExploreEligibleCatalogEntries(allRecipes, undefined, crossCatalog);

  return {
    version: 2,
    assetRevision: CATALOG_ASSET_REVISION,
    recipeCount: recipes.length,
    recipes,
  };
}
