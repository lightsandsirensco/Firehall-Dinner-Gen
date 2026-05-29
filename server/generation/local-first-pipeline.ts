/**
 * Curated-only /api/generate resolution chain.
 *
 * CRITICAL product rule:
 * - Generator must only return recipes from approved hall catalogs (Golden 100 + Performance 50).
 * - No runtime AI recipe creation, no live external fetches, no template emergency pool.
 *
 * If user filters are too narrow, we broaden constraints in a controlled way (never blank).
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import { buildCacheKey, setCachedRecipe } from "../cache-store.js";
import { pickGolden100ForGenerate, type LocalRecipePick } from "./pick-local-recipes.js";
import { GAME_DAY_SAFE_FALLBACK_CATEGORIES } from "./firehall-category-pools.js";
import { log } from "../logger.js";
import {
  sourceKindForLayer,
  type GenerateFallbackLayer,
  type GenerateTelemetry,
} from "./generation-telemetry.js";

/** Hard cap on broadening attempts — prevents unbounded loops. */
export const MAX_BROADEN_ATTEMPTS = 24;

export interface LocalFirstPipelineContext {
  request: GenerateRequest;
  v2SessionKey: string;
  /** Used only for deterministic variety; no live catalog/AI paths. */
  varietySeed: number;
  recentSignatures?: string[];
  recentSlugs?: string[];
  currentRecipeSignature?: string;
  preferDifferentStyle: boolean;
  startTime: number;
}

export interface LocalFirstPipelineHit {
  layer: GenerateFallbackLayer;
  recipe: GenerateResponse;
  protein: string;
  originalTitle: string;
  extras: Record<string, unknown>;
  cacheKey: string;
  cacheHit: boolean;
  aiInvoked: boolean;
  telemetry: GenerateTelemetry;
  spoonacularId?: number;
}

function hitFromCurated(
  pick: LocalRecipePick,
  ctx: LocalFirstPipelineContext,
  attemptIndex: number,
  broadened: boolean,
): LocalFirstPipelineHit {
  const cacheKey = buildCacheKey("v2", ctx.request, pick.protein);
  setCachedRecipe(cacheKey, 0, pick.recipe);

  const layer: GenerateFallbackLayer = "golden_100";
  return {
    layer,
    recipe: pick.recipe,
    protein: pick.protein,
    originalTitle: pick.originalTitle,
    extras: {
      _source: "hall_catalog",
      _catalog_id: pick.catalogId,
      _slug: pick.slug,
      _recipe_source: pick.recipeSource,
      _fallback: broadened,
      _broaden_attempt: attemptIndex,
    },
    cacheKey,
    cacheHit: false,
    aiInvoked: false,
    telemetry: {
      layer,
      sourceKind: sourceKindForLayer(layer),
      durationMs: Date.now() - ctx.startTime,
      cacheHit: false,
      aiInvoked: false,
      catalogId: pick.catalogId,
      detail: broadened ? "curated_broadened" : "curated_only",
    },
    spoonacularId: undefined,
  };
}

function requestConfigKey(r: GenerateRequest): string {
  return JSON.stringify({
    t: r.time_available,
    p: r.protein,
    h: r.healthiness_preference,
    c: r.cuisine_style,
    f: r.meal_format,
    fc: r.firehall_category,
    v: r.vegetarian_swap_needed,
    a: (r.allergens_to_avoid || []).slice().sort(),
  });
}

function broadenRequests(base: GenerateRequest): GenerateRequest[] {
  const relaxed: GenerateRequest[] = [];
  const push = (r: GenerateRequest) => relaxed.push({ ...r });

  push(base);

  const fc = base.firehall_category;

  // Game Day: relax protein within category before dropping the vibe.
  if (fc === "game_day" && base.protein && base.protein !== "any" && base.protein !== "vegetarian") {
    push({ ...base, protein: "any" });
  }

  // Game Day: try alternate curated categories (handled inside pickForFirehallCategory stages).
  // Also add explicit request variants so downstream logging sees the stage.
  if (fc === "game_day") {
    for (const alt of GAME_DAY_SAFE_FALLBACK_CATEGORIES) {
      push({ ...base, firehall_category: alt });
    }
  }

  // Relax Firehall category selection (never hard-fail on category alone).
  if (fc) {
    push({ ...base, firehall_category: undefined });
  }

  if (base.meal_format && base.meal_format !== "random") {
    push({ ...base, meal_format: "random", firehall_category: fc });
  }

  if (base.cuisine_style && base.cuisine_style !== "any") {
    push({ ...base, cuisine_style: "any", firehall_category: undefined });
  }

  if (base.healthiness_preference && base.healthiness_preference !== "balanced") {
    push({ ...base, healthiness_preference: "balanced", firehall_category: undefined });
  }

  const timeOrder: GenerateRequest["time_available"][] = [
    "15-25",
    "20-30",
    "25-40",
    "30-45",
    "45-60",
    "60-90",
  ];
  const idx = timeOrder.indexOf(base.time_available);
  if (idx >= 0 && idx < timeOrder.length - 1) {
    push({
      ...base,
      time_available: timeOrder[Math.min(timeOrder.length - 1, idx + 1)]!,
      firehall_category: undefined,
    });
  }

  if (base.protein && base.protein !== "any" && base.protein !== "vegetarian") {
    push({ ...base, protein: "any", firehall_category: undefined });
  }

  push({
    ...base,
    meal_format: "random",
    cuisine_style: "any",
    healthiness_preference: "balanced",
    time_available: "60-90",
    protein: base.protein === "vegetarian" ? "vegetarian" : "any",
    firehall_category: undefined,
  });

  const seen = new Set<string>();
  return relaxed.filter((r) => {
    const key = requestConfigKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Resolve a meal through the curated-only chain. Always returns a usable hit when catalog has meals.
 */
export async function runLocalFirstGeneratePipeline(
  ctx: LocalFirstPipelineContext,
): Promise<LocalFirstPipelineHit> {
  const attempts = broadenRequests(ctx.request).slice(0, MAX_BROADEN_ATTEMPTS);

  log(
    `[generate:pipeline] start firehall=${ctx.request.firehall_category ?? "none"} protein=${ctx.request.protein} time=${ctx.request.time_available} attempts=${attempts.length}`,
    "generate",
  );

  for (let i = 0; i < attempts.length; i++) {
    const req = attempts[i]!;
    const pick = pickGolden100ForGenerate(req, {
      recentSignatures: ctx.recentSignatures,
      recentSlugs: ctx.recentSlugs,
      currentRecipeSignature: ctx.currentRecipeSignature,
      varietySeed: `curated150:${ctx.varietySeed}:${i}`,
    });

    const broadened =
      i > 0 ||
      req.firehall_category !== ctx.request.firehall_category ||
      req.protein !== ctx.request.protein ||
      req.time_available !== ctx.request.time_available;

    log(
      `[generate:pipeline] attempt=${i + 1}/${attempts.length} firehall=${req.firehall_category ?? "none"} protein=${req.protein} pick=${pick ? pick.slug : "none"}`,
      "generate",
    );

    if (!pick) continue;
    return hitFromCurated(pick, { ...ctx, request: req }, i, broadened);
  }

  // Ultimate fallback: drop all optional filters, keep allergens + vegetarian flag.
  const ultimate: GenerateRequest = {
    ...ctx.request,
    firehall_category: undefined,
    meal_format: "random",
    cuisine_style: "any",
    healthiness_preference: "balanced",
    time_available: "60-90",
    protein: ctx.request.protein === "vegetarian" ? "vegetarian" : "any",
  };

  log(`[generate:pipeline] ultimate fallback firehall cleared`, "generate");

  const lastPick = pickGolden100ForGenerate(ultimate, {
    recentSignatures: ctx.recentSignatures,
    recentSlugs: ctx.recentSlugs,
    currentRecipeSignature: undefined,
    varietySeed: `curated150:${ctx.varietySeed}:ultimate`,
  });

  if (lastPick) {
    return hitFromCurated(lastPick, { ...ctx, request: ultimate }, attempts.length, true);
  }

  throw new Error("No curated recipes available for generator");
}
