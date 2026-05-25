/**
 * Explore detail for Firehall hall packages — authoritative over stale Spoonacular/DB rows.
 */
import {
  buildCuratedClientRecipe,
  getCuratedPackageDef,
  CURATED_HALL_PACKAGES,
} from "../shared/curated-hall-packages.js";
import { getClassicHallMeal, resolveClassicHeroImage } from "../shared/classic-hall-meals.js";
import type {
  ExploreDetailLookupHints,
  ExploreRecipeDetailPayload,
} from "./explore-detail-types.js";

export function getCuratedPackageBySpoonacularId(
  spoonacularId: number,
): ReturnType<typeof getCuratedPackageDef> {
  return CURATED_HALL_PACKAGES.find((p) => p.spoonacularRecipeId === spoonacularId);
}

export function resolveHallPackageSlug(
  exploreId: number,
  hints: ExploreDetailLookupHints,
): string | null {
  const fromHint = hints.slug?.trim().toLowerCase();
  if (fromHint && getCuratedPackageDef(fromHint)) return fromHint;
  const byId = getCuratedPackageBySpoonacularId(exploreId);
  return byId?.slug ?? null;
}

/** Build explore detail from in-app hall package (full steps, no Spoonacular mismatch). */
export function buildExploreDetailFromHallPackage(
  slug: string,
  exploreId: number,
  crewSize = 8,
): ExploreRecipeDetailPayload | null {
  const def = getCuratedPackageDef(slug);
  if (!def) return null;

  const recipe = buildCuratedClientRecipe(def, crewSize);
  const meta = getClassicHallMeal(slug);
  const heroImage = meta ? resolveClassicHeroImage(meta) : def.heroImage;

  const ingredients = recipe.ingredients.map((ing) => ({
    name: ing.name,
    amount: ing.qty,
    unit: ing.unit,
    original: [ing.qty, ing.unit, ing.name].filter(Boolean).join(" ").trim(),
  }));

  const steps = recipe.steps.map((s, i) => ({
    number: i + 1,
    heading: s.title,
    step: s.instructions,
  }));

  return {
    id: exploreId,
    title: def.displayTitle,
    image: heroImage,
    imageAlt: meta?.imageAlt || def.imageAlt,
    readyInMinutes: def.prepMin + def.cookMin,
    servings: crewSize,
    sourceUrl: def.externalUrl || "",
    summary: def.whyItFits,
    cuisines: def.cuisineLabel ? [def.cuisineLabel] : [],
    diets: [],
    dishTypes: def.tags,
    ingredients,
    steps,
    macros: {
      calories: Math.round(def.macros.calories),
      protein_g: Math.round(def.macros.protein_g),
      carbs_g: Math.round(def.macros.carbs_g),
      fat_g: Math.round(def.macros.fat_g),
    },
    _fromCurated: true,
    _curatedRecipeId: `curated:${slug}`,
    _publisherName: "Firehall Classics",
  };
}
