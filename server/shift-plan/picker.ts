/**
 * Slot picker — one meal slot → one curated recipe. Deterministic for a given
 * seed and inputs; no AI.
 *
 * - Lunch / dinner / late night: the existing Pick Tonight pipeline
 *   (runLocalFirstGeneratePipeline) with the slot's format, time budget and crew.
 * - Breakfast: the approved catalog's breakfast entries (shared/shift-plan/breakfast.ts),
 *   because the generator pool excludes breakfast dishes.
 */
import type { GenerateRequest } from "../../shared/schema.js";
import { buildSlotGenerateRequest, slotSelectionProfile, stableSeed } from "../../shared/shift-plan/plan.js";
import { pickBreakfast, type BreakfastCandidate } from "../../shared/shift-plan/breakfast.js";
import type { ProfileNutritionGoalKey } from "../../shared/nutrition/profile-goals.js";
import { runLocalFirstGeneratePipeline } from "../generation/local-first-pipeline.js";
import type { HistorySignals } from "../generation/history-personalization.js";
import { tonightIneligibleReason } from "../generation/tonight-eligibility.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import type { SlotPicker } from "./service.js";

export interface SlotPickerInputs {
  /** Validated, sanitized, entitlement-gated base request. */
  base: GenerateRequest;
  recentSlugs: string[];
  historySignals?: HistorySignals | null;
  nutritionGoals?: readonly ProfileNutritionGoalKey[] | null;
  sessionKey: string;
  /** Defaults to the approved catalog's breakfast entries. */
  breakfastCandidates?: readonly BreakfastCandidate[];
}

let breakfastCache: { source: unknown; candidates: BreakfastCandidate[] } | null = null;

export function loadBreakfastCandidates(): BreakfastCandidate[] {
  const catalog = getApprovedCatalog();
  if (breakfastCache?.source === catalog) return breakfastCache.candidates;
  const candidates = catalog.recipes
    .filter((r) => r.mealFormat === "breakfast" && !r.isSmoothie && !tonightIneligibleReason(r.slug))
    .map((r) => {
      let quality: number | undefined;
      try {
        quality = getCuratedRecipeBySlug(r.slug)?.scores.quality || undefined;
      } catch {
        quality = undefined;
      }
      return {
        slug: r.slug,
        totalMinutes: r.cookTime,
        dietarySummary: r.dietarySummary,
        avoidTags: r.avoidTags ?? [],
        quality,
      };
    });
  breakfastCache = { source: catalog, candidates };
  return candidates;
}

export function createSlotPicker(inputs: SlotPickerInputs): SlotPicker {
  return async (slot, avoid, seed) => {
    if (slotSelectionProfile(slot).mealType === "breakfast") {
      return pickBreakfast(inputs.breakfastCandidates ?? loadBreakfastCandidates(), buildSlotGenerateRequest(inputs.base, slot), {
        avoid,
        recentSlugs: inputs.recentSlugs,
        seed,
      });
    }

    const attempts = avoid.soft.length > 0 ? [[...avoid.hard, ...avoid.soft], avoid.hard] : [avoid.hard];
    for (const avoidSlugs of attempts) {
      try {
        const hit = await runLocalFirstGeneratePipeline({
          request: buildSlotGenerateRequest(inputs.base, slot, avoidSlugs),
          v2SessionKey: inputs.sessionKey,
          varietySeed: stableSeed(seed),
          recentSlugs: inputs.recentSlugs,
          preferDifferentStyle: false,
          startTime: Date.now(),
          historySignals: inputs.historySignals ?? null,
          nutritionGoals: inputs.nutritionGoals ?? null,
        });
        const slug = typeof hit.extras._slug === "string" ? hit.extras._slug.toLowerCase() : "";
        if (slug && !avoid.hard.includes(slug)) return slug;
      } catch {
        // Nothing eligible with this avoid list — try the relaxed one.
      }
    }
    return null;
  };
}
