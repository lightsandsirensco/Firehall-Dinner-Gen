/**
 * Curated-only /api/generate resolution chain.
 *
 * Simplified generator rules:
 * - Hard: allergies, protein, appliances (never relaxed)
 * - Soft: healthiness only (relax when no exact match)
 * - Crew size influences ranking, not exclusion
 */

import type { GenerateRequest, GenerateResponse } from "@shared/schema";
import { buildCacheKey, setCachedRecipe } from "../cache-store.js";
import { pickGolden100ForGenerate, type LocalRecipePick } from "./pick-local-recipes.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import { buildRelaxationNote } from "./generator-match.js";
import { log } from "../logger.js";
import {
  sourceKindForLayer,
  type GenerateFallbackLayer,
  type GenerateTelemetry,
} from "./generation-telemetry.js";

/** Hard cap on healthiness broadening attempts */
export const MAX_BROADEN_ATTEMPTS = 4;

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

const HEALTHINESS_ORDER: GenerateRequest["healthiness_preference"][] = [
  "lean",
  "balanced",
  "comfort",
];

function healthinessRelaxAttempts(
  base: GenerateRequest,
): GenerateRequest[] {
  const preferred = base.healthiness_preference || "balanced";
  const attempts: GenerateRequest[] = [{ ...base, healthiness_preference: preferred }];

  for (const alt of HEALTHINESS_ORDER) {
    if (alt === preferred) continue;
    attempts.push({ ...base, healthiness_preference: alt });
  }

  const seen = new Set<string>();
  return attempts.filter((r) => {
    const key = r.healthiness_preference || "balanced";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hitFromCurated(
  pick: LocalRecipePick,
  ctx: LocalFirstPipelineContext,
  attemptIndex: number,
  healthinessRelaxed: boolean,
  relaxationNote: string | null,
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
      _fallback: healthinessRelaxed,
      _broaden_attempt: attemptIndex,
      _healthiness_relaxed: healthinessRelaxed,
      _relaxation_note: relaxationNote ?? undefined,
      _requested_healthiness: ctx.request.healthiness_preference,
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
      detail: healthinessRelaxed ? "healthiness_relaxed" : "curated_only",
    },
    spoonacularId: undefined,
  };
}

/**
 * Resolve a meal through the curated-only chain.
 * Never relaxes protein, allergies, or appliances.
 */
export async function runLocalFirstGeneratePipeline(
  ctx: LocalFirstPipelineContext,
): Promise<LocalFirstPipelineHit> {
  const attempts = healthinessRelaxAttempts(ctx.request).slice(0, MAX_BROADEN_ATTEMPTS);
  const requestedHealthiness = ctx.request.healthiness_preference || "balanced";

  log(
    `[generate:pipeline] start protein=${ctx.request.protein} healthiness=${requestedHealthiness} appliances=${(ctx.request.appliances || []).join("+")} attempts=${attempts.length}`,
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

    const healthinessRelaxed = (req.healthiness_preference || "balanced") !== requestedHealthiness;

    log(
      `[generate:pipeline] attempt=${i + 1}/${attempts.length} healthiness=${req.healthiness_preference} pick=${pick ? pick.slug : "none"} relaxed=${healthinessRelaxed}`,
      "generate",
    );

    if (!pick) continue;

    const full = getCuratedRecipeBySlug(pick.slug);
    const relaxationNote =
      healthinessRelaxed && full ? buildRelaxationNote(ctx.request, full) : null;

    return hitFromCurated(pick, { ...ctx, request: req }, i, healthinessRelaxed, relaxationNote);
  }

  throw new Error(
    `No curated recipes match protein=${ctx.request.protein} with your appliance and allergy filters`,
  );
}
