/**
 * Build published smoothie pages for the fuel catalog.
 */

import { FUEL_SET_TAG_SMOOTHIE } from "../../shared/fuel-catalog/constants.js";
import {
  FUEL_RECIPE_CONTENT_VERSION,
  type FuelRecipePage,
} from "../../shared/fuel-catalog/schema.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../../shared/fuel-catalog/smoothies/catalog-data.js";
import { parseNutritionHighlights } from "../../shared/fuel-catalog/smoothies/nutrition-parse.js";
import { smoothieTaxonomyLabel } from "../../shared/fuel-catalog/smoothies/taxonomy.js";
import type { SmoothieCatalogItem } from "../../shared/fuel-catalog/smoothies/types.js";

function buildSeoTitle(title: string): string {
  const base = `${title} | Firefighter Smoothie`;
  return base.length <= 72 ? base : `${title.slice(0, 48)}… | Hall Smoothie`;
}

function buildSearchTerms(item: SmoothieCatalogItem): string[] {
  const cat = smoothieTaxonomyLabel(item.taxonomyCategory).toLowerCase();
  return [
    item.title.toLowerCase(),
    "healthy smoothies",
    "smoothies for firefighters",
    "firefighter breakfast",
    "recovery smoothie",
    `${cat} smoothie`,
    "station blender",
    "shift nutrition",
  ];
}

function relatedSlugs(current: string): string[] {
  const item = SMOOTHIE_CATALOG_ITEMS.find((r) => r.slug === current);
  if (!item) return SMOOTHIE_CATALOG_ITEMS.filter((r) => r.slug !== current).slice(0, 4).map((r) => r.slug);
  return SMOOTHIE_CATALOG_ITEMS.filter(
    (r) =>
      r.slug !== current &&
      (r.taxonomyCategory === item.taxonomyCategory || r.subtitle === item.subtitle),
  )
    .slice(0, 5)
    .map((r) => r.slug);
}

export function buildSmoothieRecipePage(item: SmoothieCatalogItem): FuelRecipePage {
  const macros = parseNutritionHighlights(item.nutritionHighlights);
  const taxonomyLabel = smoothieTaxonomyLabel(item.taxonomyCategory);

  return {
    slug: item.slug,
    title: item.title,
    subtitle: `${taxonomyLabel} · ${item.subtitle}`,
    description: item.intro.trim().slice(0, 580),
    fuelType: "smoothie",
    taxonomyCategory: item.taxonomyCategory,
    taxonomyLabel,
    intro: item.intro,
    ingredients: item.ingredients,
    steps: item.instructions.map((instruction, i) => ({
      stepNumber: i + 1,
      instruction,
    })),
    nutrition: {
      ...macros,
      highlights: item.nutritionHighlights,
    },
    substitutions: item.substitutions,
    shiftNote: item.shiftNote,
    heroImage: item.heroImage,
    thumbImage: item.thumbImage,
    tags: [
      FUEL_SET_TAG_SMOOTHIE,
      `taxonomy:${item.taxonomyCategory}`,
      "smoothie",
      "performance_fuel",
      "shift_nutrition",
    ],
    searchTerms: buildSearchTerms(item),
    relatedSlugs: relatedSlugs(item.slug),
    catalogSet: "fuel_smoothie",
    generatedAt: new Date().toISOString(),
    contentVersion: FUEL_RECIPE_CONTENT_VERSION,
    seoTitle: buildSeoTitle(item.title),
  };
}

export function buildAllSmoothiePages(): FuelRecipePage[] {
  return SMOOTHIE_CATALOG_ITEMS.map(buildSmoothieRecipePage);
}
