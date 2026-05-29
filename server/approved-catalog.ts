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

const SMOOTHIE_COOK_MINUTES = 5;

function deriveMealFlags(
  entry: GoldenCatalogIndexEntry,
  isClassic: boolean,
): Pick<
  ApprovedCatalogEntry,
  "isHealthy" | "isBbqGrill" | "isHighProtein" | "isLowCleanup"
> {
  const cat = entry.category;
  const tagHay = entry.tags.join(" ").toLowerCase();
  const isPerformance = isPerformance50Slug(entry.slug);

  const isHealthy =
    cat === "healthy_performance" ||
    isPerformance ||
    tagHay.includes("healthy") ||
    tagHay.includes("light");

  const isBbqGrill =
    cat === "bbq_grill_nights" ||
    tagHay.includes("bbq") ||
    tagHay.includes("grill") ||
    tagHay.includes("smoker");

  const isHighProtein =
    isPerformance ||
    cat === "healthy_performance" ||
    tagHay.includes("high protein") ||
    tagHay.includes("high-protein");

  const isLowCleanup =
    cat === "rookie_friendly" ||
    cat === "meal_prep_leftovers" ||
    tagHay.includes("easy cleanup") ||
    tagHay.includes("one pan") ||
    tagHay.includes("one-pot") ||
    tagHay.includes("sheet pan");

  void isClassic;
  return { isHealthy, isBbqGrill, isHighProtein, isLowCleanup };
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
    heroImage: images.hero,
    thumbImage: images.cardImage,
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
    heroImage: images.hero,
    thumbImage: images.cardImage,
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
    isLowCleanup: true,
  };
}

export function buildApprovedCatalog(): ApprovedCatalogResponse {
  const index = loadMergedHallCatalogIndex();
  const mealSlugs = new Set<string>();

  const meals = index.recipes
    .filter((entry) => isApprovedCatalogSlug(entry.slug))
    .map((entry) => {
      mealSlugs.add(entry.slug.trim().toLowerCase());
      return mealEntryToApproved(entry);
    });

  const smoothies = SMOOTHIE_CATALOG_ITEMS.filter((item) => !mealSlugs.has(item.slug)).map(
    smoothieEntryToApproved,
  );

  const recipes = [...meals, ...smoothies].sort((a, b) => a.title.localeCompare(b.title));

  return {
    version: 1,
    recipeCount: recipes.length,
    recipes,
  };
}
