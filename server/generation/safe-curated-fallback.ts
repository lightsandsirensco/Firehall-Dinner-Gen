/**
 * Safe curated fallback — when AI fails realism firewall, serve a trusted meal.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { log } from "../logger.js";
import { pickGolden100ForGenerate, pickEditorialCuratedForGenerate } from "./pick-local-recipes.js";
import { buildEmergencyFallbackRecipe } from "./emergency-fallback.js";
import { runCuratedGenerationFallback } from "../curated-generation-fallback.js";

export interface SafeCuratedFallbackResult {
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  source: "golden_100" | "curated_editorial" | "curated_fallback" | "emergency_pool";
  catalogId?: string;
  recipeSource?: RecipeSourceAttribution;
  slug?: string;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Resolve a boring-but-real meal — never invent nonsense.
 */
export async function resolveSafeCuratedFallback(
  request: GenerateRequest,
  recentSignatures: string[] = [],
  reason: string,
): Promise<SafeCuratedFallbackResult> {
  const seed = hashSeed(`safe-fb:${reason}:${request.protein}:${request.meal_format}`);

  const golden = pickGolden100ForGenerate(request, {
    recentSignatures,
    varietySeed: String(seed),
  });
  if (golden) {
    log(`[safe-fallback] golden_100 slug=${golden.slug} reason=${reason}`, "generate");
    return {
      recipe: { ...golden.recipe, _fallback: true },
      protein: golden.protein,
      originalTitle: golden.originalTitle,
      source: "golden_100",
      catalogId: golden.catalogId,
      recipeSource: golden.recipeSource,
      slug: golden.slug,
    };
  }

  const editorial = pickEditorialCuratedForGenerate(request, {
    recentSignatures,
    varietySeed: String(seed + 1),
  });
  if (editorial) {
    log(`[safe-fallback] editorial slug=${editorial.slug} reason=${reason}`, "generate");
    return {
      recipe: { ...editorial.recipe, _fallback: true },
      protein: editorial.protein,
      originalTitle: editorial.originalTitle,
      source: "curated_editorial",
      catalogId: editorial.catalogId,
      recipeSource: editorial.recipeSource,
      slug: editorial.slug,
    };
  }

  const curated = await runCuratedGenerationFallback(request, recentSignatures, `safe_fb:${reason}`);
  if (curated?.recipe?.title) {
    log(`[safe-fallback] catalog reason=${reason}`, "generate");
    return {
      recipe: curated.recipe,
      protein: curated.protein,
      originalTitle: curated.recipe.title,
      source: "curated_fallback",
      catalogId: curated.catalogId,
      recipeSource: curated.recipeSource,
    };
  }

  const emergency = buildEmergencyFallbackRecipe(request, `${reason}:${seed}`);
  log(`[safe-fallback] emergency id=${emergency.emergencyId} reason=${reason}`, "generate");
  return {
    recipe: emergency.recipe,
    protein: emergency.protein,
    originalTitle: emergency.recipe.title || emergency.seed.title,
    source: "emergency_pool",
    recipeSource: emergency.recipeSource,
  };
}
