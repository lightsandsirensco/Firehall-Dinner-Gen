/**
 * Safe curated fallback — when send gate blocks, serve an approved catalog meal.
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import type { RecipeSourceAttribution } from "../../shared/canonical-recipe.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../../shared/performance-meals/adapted/index.js";
import {
  resolveCatalogRankBias,
  type CatalogCollectionId,
} from "../../shared/hall-catalog/gate.js";
import { log } from "../logger.js";
import { pickGolden100ForGenerate } from "./pick-local-recipes.js";
import { GAME_DAY_SAFE_FALLBACK_CATEGORIES } from "./firehall-category-pools.js";
import { proteinMatchesFilter } from "../spoonacular-converter.js";
import { hydrateCatalogGenerateResponse } from "../meal-catalog/hydrate-golden-generate.js";

export interface SafeCuratedFallbackResult {
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  source: "hall_catalog";
  catalogId?: string;
  recipeSource?: RecipeSourceAttribution;
  slug?: string;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function safeFallbackRequests(request: GenerateRequest): GenerateRequest[] {
  const out: GenerateRequest[] = [request];

  if (request.firehall_category === "game_day") {
    for (const alt of GAME_DAY_SAFE_FALLBACK_CATEGORIES) {
      out.push({ ...request, firehall_category: alt });
    }
    out.push({ ...request, firehall_category: undefined, protein: "any" });
  } else if (request.firehall_category) {
    out.push({ ...request, firehall_category: undefined });
  }

  out.push({
    ...request,
    firehall_category: undefined,
    protein: request.protein === "vegetarian" ? "vegetarian" : "any",
    meal_format: "random",
    cuisine_style: "any",
    time_available: "60-90",
  });

  const seen = new Set<string>();
  return out.filter((r) => {
    const key = `${r.firehall_category}:${r.protein}:${r.time_available}:${r.meal_format}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function pickDeterministicCatalogSlug(
  seed: number,
  protein?: string,
  bias: ReturnType<typeof resolveCatalogRankBias> = "mixed",
): string {
  const selected = protein && protein !== "any" ? protein : null;
  const goldenPool = selected
    ? GOLDEN_100_RECIPES.filter((r) => proteinMatchesFilter(r.protein, selected))
    : GOLDEN_100_RECIPES;
  const performancePool = selected
    ? PERFORMANCE_ADAPTED_RECIPES.filter((r) => proteinMatchesFilter(r.manifest.protein, selected))
    : PERFORMANCE_ADAPTED_RECIPES;

  const pool: Array<{ slug: string; collection: CatalogCollectionId }> = [];
  if (bias !== "performance") {
    for (const r of goldenPool.length > 0 ? goldenPool : GOLDEN_100_RECIPES) {
      pool.push({ slug: r.slug, collection: "golden_100" });
    }
  }
  if (bias !== "golden") {
    for (const r of performancePool.length > 0 ? performancePool : PERFORMANCE_ADAPTED_RECIPES) {
      pool.push({ slug: r.manifest.slug, collection: "performance_50" });
    }
  }

  const list = pool.length > 0 ? pool : GOLDEN_100_RECIPES.map((r) => ({
    slug: r.slug,
    collection: "golden_100" as const,
  }));
  return list[seed % list.length]!.slug;
}

export async function resolveSafeCuratedFallback(
  request: GenerateRequest,
  recentSignatures: string[] = [],
  reason: string,
): Promise<SafeCuratedFallbackResult> {
  const seed = hashSeed(`safe-fb:${reason}:${request.protein}:${request.meal_format}`);
  const attempts = safeFallbackRequests(request);
  const bias = resolveCatalogRankBias(request);

  for (let i = 0; i < attempts.length; i++) {
    const req = attempts[i]!;
    const pick = pickGolden100ForGenerate(req, {
      recentSignatures,
      varietySeed: String(seed + i),
    });
    if (pick) {
      log(
        `[safe-fallback] hall_catalog slug=${pick.slug} reason=${reason} firehall=${req.firehall_category ?? "none"}`,
        "generate",
      );
      return {
        recipe: { ...pick.recipe, _fallback: true },
        protein: pick.protein,
        originalTitle: pick.originalTitle,
        source: "hall_catalog",
        catalogId: pick.catalogId,
        recipeSource: pick.recipeSource,
        slug: pick.slug,
      };
    }
  }

  const slug = pickDeterministicCatalogSlug(seed, request.protein, bias);
  const hydrated = hydrateCatalogGenerateResponse(slug, request.crew_size);
  if (hydrated) {
    log(`[safe-fallback] deterministic catalog slug=${slug} reason=${reason}`, "generate");
    return {
      recipe: { ...hydrated.recipe, _fallback: true },
      protein: hydrated.protein,
      originalTitle: hydrated.title,
      source: "hall_catalog",
      catalogId: hydrated.catalogId,
      slug,
    };
  }

  throw new Error(`No approved catalog recipe available for safe fallback (${reason})`);
}
