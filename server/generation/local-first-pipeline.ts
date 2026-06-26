/**
 * Curated-only /api/generate resolution chain.
 *
 * CRITICAL product rule:
 * - Generator must only return recipes from approved hall catalogs (Golden 100 + Performance 50).
 * - When user selects a Firehall category, stay in-category until all in-category relaxations fail.
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
  categoryMeta?: {
    requested?: string;
    matched?: string;
    broadened: boolean;
  },
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
      _requested_firehall_category: categoryMeta?.requested ?? ctx.request.firehall_category,
      _matched_firehall_category: categoryMeta?.matched ?? pick.matchedCategory,
      _category_broadened: categoryMeta?.broadened ?? false,
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

const TIME_ORDER: GenerateRequest["time_available"][] = [
  "15-25",
  "20-30",
  "25-40",
  "30-45",
  "45-60",
  "60-90",
];

function broadenWithinCategory(base: GenerateRequest): GenerateRequest[] {
  const fc = base.firehall_category!;
  const attempts: GenerateRequest[] = [base];
  const push = (r: GenerateRequest) => attempts.push({ ...r });

  if (fc === "game_day" && base.protein && base.protein !== "any" && base.protein !== "vegetarian") {
    push({ ...base, protein: "any" });
  }

  const timeIdx = TIME_ORDER.indexOf(base.time_available);
  if (timeIdx >= 0 && timeIdx < TIME_ORDER.length - 1) {
    push({ ...base, time_available: TIME_ORDER[timeIdx + 1]! });
  }

  if (base.protein && base.protein !== "any" && base.protein !== "vegetarian") {
    push({ ...base, protein: "any" });
  }

  if (base.meal_format && base.meal_format !== "random") {
    push({ ...base, meal_format: "random" });
  }

  if (base.cuisine_style && base.cuisine_style !== "any") {
    push({ ...base, cuisine_style: "any" });
  }

  if (base.healthiness_preference && base.healthiness_preference !== "balanced") {
    push({ ...base, healthiness_preference: "balanced" });
  }

  if (fc === "game_day") {
    for (const alt of GAME_DAY_SAFE_FALLBACK_CATEGORIES) {
      push({ ...base, firehall_category: alt });
    }
  }

  return attempts;
}

function broadenWithoutCategory(base: GenerateRequest): GenerateRequest[] {
  const relaxed: GenerateRequest[] = [];
  const push = (r: GenerateRequest) => relaxed.push({ ...r });

  push({ ...base, firehall_category: undefined });

  if (base.meal_format && base.meal_format !== "random") {
    push({ ...base, meal_format: "random", firehall_category: undefined });
  }

  if (base.cuisine_style && base.cuisine_style !== "any") {
    push({ ...base, cuisine_style: "any", firehall_category: undefined });
  }

  if (base.healthiness_preference && base.healthiness_preference !== "balanced") {
    push({ ...base, healthiness_preference: "balanced", firehall_category: undefined });
  }

  const timeIdx = TIME_ORDER.indexOf(base.time_available);
  if (timeIdx >= 0 && timeIdx < TIME_ORDER.length - 1) {
    push({
      ...base,
      time_available: TIME_ORDER[Math.min(TIME_ORDER.length - 1, timeIdx + 1)]!,
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

  return relaxed;
}

function broadenRequests(base: GenerateRequest): GenerateRequest[] {
  const fc = base.firehall_category;
  const attempts = fc
    ? [...broadenWithinCategory(base), ...broadenWithoutCategory(base)]
    : broadenWithoutCategory({ ...base, firehall_category: undefined });

  const seen = new Set<string>();
  return attempts.filter((r) => {
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
  const requestedCategory = ctx.request.firehall_category;

  log(
    `[generate:pipeline] start firehall=${requestedCategory ?? "none"} protein=${ctx.request.protein} time=${ctx.request.time_available} attempts=${attempts.length}`,
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

    const categoryBroadened = Boolean(
      requestedCategory &&
        (req.firehall_category !== requestedCategory || !req.firehall_category),
    );

    const broadened =
      i > 0 ||
      req.firehall_category !== ctx.request.firehall_category ||
      req.protein !== ctx.request.protein ||
      req.time_available !== ctx.request.time_available;

    log(
      `[generate:pipeline] attempt=${i + 1}/${attempts.length} firehall=${req.firehall_category ?? "none"} protein=${req.protein} pick=${pick ? pick.slug : "none"} category_broadened=${categoryBroadened}`,
      "generate",
    );

    if (!pick) continue;
    return hitFromCurated(
      pick,
      { ...ctx, request: req },
      i,
      broadened,
      {
        requested: requestedCategory,
        matched: pick.matchedCategory ?? req.firehall_category ?? undefined,
        broadened: categoryBroadened,
      },
    );
  }

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
    return hitFromCurated(
      lastPick,
      { ...ctx, request: ultimate },
      attempts.length,
      true,
      {
        requested: requestedCategory,
        matched: lastPick.matchedCategory,
        broadened: Boolean(requestedCategory),
      },
    );
  }

  throw new Error("No curated recipes available for generator");
}
