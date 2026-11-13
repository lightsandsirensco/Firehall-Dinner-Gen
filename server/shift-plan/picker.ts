/**
 * Slot picker — one meal slot → one curated recipe. Deterministic for a given
 * seed and inputs; no AI.
 *
 * - Lunch / dinner / late night: the existing Pick Tonight pipeline
 *   (runLocalFirstGeneratePipeline) with the slot's format, time budget and crew,
 *   over the full generator pool narrowed to that meal's occasion pool
 *   (shared/catalog/meal-occasions.ts). The whole pool is the last resort when
 *   hard restrictions leave the occasion pool empty.
 * - Breakfast: the approved catalog's breakfast entries (shared/shift-plan/breakfast.ts),
 *   because the generator pool excludes breakfast dishes.
 */
import type { GenerateRequest } from "../../shared/schema.js";
import { buildSlotGenerateRequest, slotSelectionProfile, stableSeed } from "../../shared/shift-plan/plan.js";
import { pickBreakfast, type BreakfastCandidate } from "../../shared/shift-plan/breakfast.js";
import {
  describeNutritionGoalFit,
  scoreProfileNutritionGoal,
  type ProfileNutritionGoalKey,
} from "../../shared/nutrition/profile-goals.js";
import { runLocalFirstGeneratePipeline } from "../generation/local-first-pipeline.js";
import { nutritionGoalFactsForSlug } from "../generation/nutrition-goals-gate.js";
import {
  cookedTooRecently,
  describeMemoryReason,
  isPersonalReason,
  memoryReasonsFor,
  scoreHistorySignal,
  type HistorySignals,
} from "../generation/history-personalization.js";
import { tonightIneligibleReason } from "../generation/tonight-eligibility.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import { classifyMealOccasions, type MealOccasion } from "../../shared/catalog/meal-occasions.js";
import { getRecipeMeta } from "../insights/catalog-meta.js";
import type { SlotPick, SlotPicker } from "./service.js";

export interface SlotPickerInputs {
  /** Validated, sanitized, entitlement-gated base request. */
  base: GenerateRequest;
  recentSlugs: string[];
  historySignals?: HistorySignals | null;
  nutritionGoal?: ProfileNutritionGoalKey | null;
  /** The user's "Not for us" meals — never auto-picked. */
  dislikedSlugs?: ReadonlySet<string> | null;
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

let occasionCache: { source: unknown; pools: Map<MealOccasion, Set<string>> } | null = null;

/** Approved-catalog slugs that are a realistic pick for this meal. */
export function occasionPoolSlugs(occasion: MealOccasion): ReadonlySet<string> {
  const catalog = getApprovedCatalog();
  if (occasionCache?.source !== catalog) {
    const pools = new Map<MealOccasion, Set<string>>();
    for (const r of catalog.recipes) {
      for (const o of classifyMealOccasions(r).occasions) {
        if (!pools.has(o)) pools.set(o, new Set());
        pools.get(o)!.add(r.slug);
      }
    }
    occasionCache = { source: catalog, pools };
  }
  return occasionCache.pools.get(occasion) ?? new Set();
}

/** Breakfast slots: the same history scoring and reason lines as dinner picks (no favorites lane — the pool is small). */
function pickBreakfastSlot(
  inputs: SlotPickerInputs,
  slot: Parameters<SlotPicker>[0],
  avoid: Parameters<SlotPicker>[1],
  seed: string,
): SlotPick | null {
  const goal = inputs.nutritionGoal ?? null;
  const signals = inputs.historySignals ?? null;
  const candidates = inputs.breakfastCandidates ?? loadBreakfastCandidates();
  const disliked = inputs.dislikedSlugs ?? new Set<string>();
  const recentCooks = signals ? candidates.filter((c) => cookedTooRecently(c.slug, signals)).map((c) => c.slug) : [];
  const proteinOf = (slug: string) => getRecipeMeta(slug).protein ?? "";
  const preference = (slug: string) =>
    (goal ? scoreProfileNutritionGoal(goal, nutritionGoalFactsForSlug(slug)) : 0) +
    (signals ? scoreHistorySignal({ slug, protein: proteinOf(slug) }, signals).delta : 0);

  const slug = pickBreakfast(candidates, buildSlotGenerateRequest(inputs.base, slot), {
    avoid: { hard: [...avoid.hard, ...disliked], soft: [...avoid.soft, ...recentCooks] },
    recentSlugs: inputs.recentSlugs,
    seed,
    ...(goal || signals ? { preferenceScore: preference } : {}),
  });
  if (!slug) return null;

  const memory = signals
    ? memoryReasonsFor({ slug, protein: proteinOf(slug) }, signals, scoreHistorySignal({ slug, protein: proteinOf(slug) }, signals).appliedSignals)
    : [];
  const goalLine = goal ? describeNutritionGoalFit(goal, nutritionGoalFactsForSlug(slug)) : null;
  const reasons = [...memory.map(describeMemoryReason), goalLine].filter((r): r is string => Boolean(r));
  return { slug, why: reasons.length ? { reasons, pickedForYou: memory.some(isPersonalReason) } : null };
}

export function createSlotPicker(inputs: SlotPickerInputs): SlotPicker {
  return async (slot, avoid, seed) => {
    const mealType = slotSelectionProfile(slot).mealType;
    if (mealType === "breakfast") return pickBreakfastSlot(inputs, slot, avoid, seed);

    const avoidLists = avoid.soft.length > 0 ? [[...avoid.hard, ...avoid.soft], avoid.hard] : [avoid.hard];
    for (const restrictToSlugs of [occasionPoolSlugs(mealType), null]) {
      for (const avoidSlugs of avoidLists) {
        try {
          const hit = await runLocalFirstGeneratePipeline({
            request: buildSlotGenerateRequest(inputs.base, slot, avoidSlugs),
            v2SessionKey: inputs.sessionKey,
            varietySeed: stableSeed(seed),
            recentSlugs: inputs.recentSlugs,
            preferDifferentStyle: false,
            startTime: Date.now(),
            historySignals: inputs.historySignals ?? null,
            nutritionGoal: inputs.nutritionGoal ?? null,
            restrictToSlugs,
            dislikedSlugs: inputs.dislikedSlugs ?? null,
          });
          const slug = typeof hit.extras._slug === "string" ? hit.extras._slug.toLowerCase() : "";
          if (!slug || avoid.hard.includes(slug)) continue;
          const reasons = Array.isArray(hit.extras._personalization_reasons)
            ? (hit.extras._personalization_reasons as unknown[]).filter((r): r is string => typeof r === "string")
            : [];
          return { slug, why: reasons.length ? { reasons, pickedForYou: hit.extras._picked_for_you === true } : null };
        } catch {
          // Nothing eligible with this avoid list / pool — try the relaxed one.
        }
      }
    }
    return null;
  };
}
