/**
 * Curated generation fallback — real catalog/classic meals instead of template placeholders.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import { CLASSIC_HALL_MEALS } from "../shared/classic-hall-meals.js";
import { log } from "./logger.js";
import { pickCatalogRecipeForGenerate } from "./recipe-ranker.js";
import { recordReliabilityEvent } from "./generation-reliability.js";
import type { RecipeSourceAttribution } from "../shared/canonical-recipe.js";
import { TEMPLATE_FALLBACK_ATTRIBUTION } from "./recipe-fallback-policy.js";

function resolveSource(src?: RecipeSourceAttribution): RecipeSourceAttribution {
  return src ?? TEMPLATE_FALLBACK_ATTRIBUTION;
}

export interface CuratedFallbackResult {
  recipe: GenerateResponse;
  protein: string;
  recipeSource: RecipeSourceAttribution;
  catalogId?: string;
  classicSlug?: string;
}

function proteinKey(p: string | undefined): string {
  return (p || "any").toLowerCase().trim();
}

function pickClassicForRequest(request: GenerateRequest): (typeof CLASSIC_HALL_MEALS)[number] | null {
  const want = proteinKey(request.protein);
  const fmt = (request.meal_format || "").toLowerCase();
  const cuisine = (request.cuisine_style || "").toLowerCase();

  const scored = CLASSIC_HALL_MEALS.map((meal) => {
    let score = 0;
    const mp = proteinKey(meal.protein);
    if (want !== "any" && mp.includes(want)) score += 40;
    if (fmt && fmt !== "random" && meal.mealFormat === fmt) score += 30;
    if (cuisine && cuisine !== "any" && meal.cuisine.toLowerCase().includes(cuisine)) score += 15;
    return { meal, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0) return scored[0].meal;

  const idx = hashSeedNum(`${want}:${fmt}:${request.crew_size}`) % CLASSIC_HALL_MEALS.length;
  return CLASSIC_HALL_MEALS[idx];
}

function hashSeedNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Last-resort real meal: catalog (relaxed) → classic hall meal via catalog ID → null.
 */
export async function runCuratedGenerationFallback(
  request: GenerateRequest,
  recentSigs: string[] = [],
  reason: string,
): Promise<CuratedFallbackResult | null> {
  recordReliabilityEvent("curated_fallback", reason);

  const catalogHit = pickCatalogRecipeForGenerate(request, {
    relaxed: true,
    recentSignatures: recentSigs,
    varietySeed: hashSeedNum(`curated-fallback:${reason}:${Date.now() % 10000}`),
  });

  if (catalogHit?.recipe?.title) {
    log(
      `[curated-fallback] catalog id=${catalogHit.catalogId} title="${catalogHit.recipe.title.slice(0, 48)}" reason=${reason}`,
      "generate",
    );
    return {
      recipe: { ...catalogHit.recipe, _fallback: true },
      protein: catalogHit.protein,
      recipeSource: resolveSource(catalogHit.recipeSource),
      catalogId: catalogHit.catalogId,
    };
  }

  const classic = pickClassicForRequest(request);
  if (!classic) return null;

  const classicProtein = (classic.generatorFilters.proteins[0] || request.protein || "any") as GenerateRequest["protein"];
  const classicRequest: GenerateRequest = {
    ...request,
    protein: classicProtein,
    meal_format: classic.generatorFilters.meal_format as GenerateRequest["meal_format"],
    cuisine_style: classic.generatorFilters.cuisine_style as GenerateRequest["cuisine_style"],
  };

  const classicCatalog = pickCatalogRecipeForGenerate(classicRequest, {
    relaxed: true,
    recentSignatures: recentSigs,
    varietySeed: hashSeedNum(`classic:${classic.slug}`),
  });

  if (classicCatalog?.recipe) {
    const recipe = {
      ...classicCatalog.recipe,
      title: classic.displayTitle || classic.title,
      _fallback: true,
    };
    log(
      `[curated-fallback] classic=${classic.slug} catalog=${classicCatalog.catalogId} reason=${reason}`,
      "generate",
    );
    return {
      recipe,
      protein: classicCatalog.protein,
      recipeSource: resolveSource(classicCatalog.recipeSource),
      catalogId: classicCatalog.catalogId,
      classicSlug: classic.slug,
    };
  }

  log(`[curated-fallback] miss reason=${reason}`, "generate");
  return null;
}
