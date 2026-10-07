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
import {
  buildTonightHighlights,
  loadTonightRecipeMeta,
  matchesMealStyle,
  matchesTimeWindow,
} from "./tonight-selection.js";
import { TONIGHT_MEAL_STYLE_LABELS, TONIGHT_TIME_WINDOW_LABELS } from "../../shared/tonight-filters.js";
import { sampleSizeBucket, type HistorySignals } from "./history-personalization.js";
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
  /** Insight-Driven Personalization — deterministic history-learned soft signals (see history-personalization.ts). Absent/null = scoring unchanged from before this feature existed. */
  historySignals?: HistorySignals | null;
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
  const highlights = buildTonightHighlights(
    pick.slug,
    pick.recipe.timing,
    ctx.request,
    pick.recipeSource?.kind,
  );
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
      _tonight_badge: highlights.badge,
      _tonight_why: highlights.why,
      _personalization_used: Boolean(ctx.historySignals),
      _personalization_note: pick.personalization?.note ?? undefined,
      _personalization_signal_types: pick.personalization?.signalTypes?.length
        ? pick.personalization.signalTypes.join(",")
        : undefined,
      _personalization_sample_bucket: ctx.historySignals
        ? sampleSizeBucket(ctx.historySignals.totalRows)
        : undefined,
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

/** Explains a pick that falls outside the visible Pick Tonight style / time filters. */
function tonightFilterMissNote(
  pick: LocalRecipePick,
  request: GenerateRequest,
  timeRelaxed: boolean,
): string | null {
  const style = request.meal_style ?? "any";
  const window = request.time_window ?? "any";
  const styleMiss = style !== "any" && !matchesMealStyle(loadTonightRecipeMeta().get(pick.slug), style);
  const windowMiss =
    timeRelaxed || !matchesTimeWindow(pick.recipe.timing?.total_minutes ?? 0, window);
  if (!styleMiss && !windowMiss) return null;

  const styleLabel =
    style === "bbq"
      ? "BBQ"
      : style === "different"
        ? `"${TONIGHT_MEAL_STYLE_LABELS[style]}"`
        : TONIGHT_MEAL_STYLE_LABELS[style].toLowerCase();
  const windowLabel = window === "any" ? "your time window" : `the ${TONIGHT_TIME_WINDOW_LABELS[window].replace(/ min$/, "").toLowerCase()} min window`;
  if (styleMiss && windowMiss) {
    return `No more ${styleLabel} meals fit ${windowLabel} with these filters, so here's the closest match.`;
  }
  if (styleMiss) {
    return `No more ${styleLabel} meals fit these filters, so here's the closest match.`;
  }
  return `Nothing else fits ${windowLabel} with these filters, so here's the closest match.`;
}

/**
 * Resolve a meal through the curated-only chain.
 * Never relaxes protein, allergies, or appliances.
 */
export async function runLocalFirstGeneratePipeline(
  ctx: LocalFirstPipelineContext,
): Promise<LocalFirstPipelineHit> {
  const attempts = healthinessRelaxAttempts(ctx.request).slice(0, MAX_BROADEN_ATTEMPTS);
  const timeEnforced = ctx.request.enforce_time_bucket !== false;
  if (timeEnforced) attempts.push({ ...ctx.request, enforce_time_bucket: false });
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
      historySignals: ctx.historySignals,
    });

    const healthinessRelaxed = (req.healthiness_preference || "balanced") !== requestedHealthiness;

    log(
      `[generate:pipeline] attempt=${i + 1}/${attempts.length} healthiness=${req.healthiness_preference} pick=${pick ? pick.slug : "none"} relaxed=${healthinessRelaxed}`,
      "generate",
    );

    if (!pick) continue;

    const timeRelaxed = timeEnforced && req.enforce_time_bucket === false;
    const full = getCuratedRecipeBySlug(pick.slug);
    const relaxationNote =
      tonightFilterMissNote(pick, ctx.request, timeRelaxed) ??
      (healthinessRelaxed && full ? buildRelaxationNote(ctx.request, full) : null);

    return hitFromCurated(pick, { ...ctx, request: req }, i, healthinessRelaxed, relaxationNote);
  }

  throw new Error(
    `No curated recipes match protein=${ctx.request.protein} with your appliance and allergy filters`,
  );
}
