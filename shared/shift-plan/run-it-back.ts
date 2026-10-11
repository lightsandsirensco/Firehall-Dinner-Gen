/**
 * Run It Back — copy an earlier shift's plan into a target shift.
 *
 * Only the per-slot plan decisions are copied (recipe + lock + source,
 * skipped, BYO, a still-sensible per-meal crew size). Shopping check-offs,
 * ratings, cooked history and completion live elsewhere or are derived, so
 * they never come along.
 *
 * Slots match by meal (type or custom meal id) and day of the shift, so a
 * different-length target keeps its own structure: extra days stay open,
 * missing days are dropped. Every copied recipe is re-checked against the
 * user's current hard restrictions; failures are flagged and left open.
 */
import type { GenerateRequest } from "../schema.js";
import type { DietarySummary } from "../dietary/schema.js";
import { DIETARY_FILTER_LABELS } from "../dietary/schema.js";
import { getFoodPreferenceDefinition } from "../ingredient-preferences/definitions.js";
import type { MealSlot } from "../schedule/meal-slots.js";
import { SCHEDULE_LIMITS } from "../schedule/engine.js";
import type { ShiftInstance } from "../schedule/types.js";
import { requiredDietaryFlags } from "./breakfast.js";
import { defaultSlotState } from "./plan.js";
import type { RunItBackFlag, RunItBackMatch, ShiftPlanSlotState } from "./types.js";

/** How far back to look for a plan to run back. */
export const RUN_IT_BACK_LOOKBACK_DAYS = 60;
/** Most recent candidate shifts considered (short-block patterns can produce many). */
export const RUN_IT_BACK_MAX_CANDIDATES = 40;

export type RunItBackMode = "copy" | "refresh";

/** Same meal across shifts: type (or custom meal) on the same day of the shift. */
export function slotIdentity(slot: Pick<MealSlot, "type" | "customMealId" | "dayIndex">): string {
  return `${slot.customMealId ? `custom:${slot.customMealId}` : slot.type}|${slot.dayIndex}`;
}

export function isDecided(state: Pick<ShiftPlanSlotState, "recipeSlug" | "skipped" | "byo">): boolean {
  return state.recipeSlug != null || state.skipped || state.byo;
}

const localTime = (s: Pick<ShiftInstance, "startLocal">) => s.startLocal.slice(11, 16);

export function runItBackMatch(
  source: Pick<ShiftInstance, "scheduledMinutes" | "startLocal">,
  target: Pick<ShiftInstance, "scheduledMinutes" | "startLocal">,
): RunItBackMatch {
  if (source.scheduledMinutes !== target.scheduledMinutes) return "different_length";
  return localTime(source) === localTime(target) ? "same_type" : "same_length";
}

const MATCH_RANK: Record<RunItBackMatch, number> = { same_type: 2, same_length: 1, different_length: 0 };

export interface RunItBackCandidate {
  shift: ShiftInstance;
  states: ShiftPlanSlotState[];
}

/**
 * The previous comparable plan: shifts starting before the target with at
 * least one decided meal; same shift type beats same length beats any, then
 * the most recent wins.
 */
export function chooseRunItBackSource(
  target: Pick<ShiftInstance, "key" | "start" | "scheduledMinutes" | "startLocal">,
  candidates: readonly RunItBackCandidate[],
): (RunItBackCandidate & { match: RunItBackMatch }) | null {
  let best: (RunItBackCandidate & { match: RunItBackMatch }) | null = null;
  for (const c of candidates) {
    if (c.shift.key === target.key || c.shift.status === "cancelled") continue;
    if (!(Date.parse(c.shift.start) < Date.parse(target.start))) continue;
    if (!c.states.some(isDecided)) continue;
    const match = runItBackMatch(c.shift, target);
    if (
      !best ||
      MATCH_RANK[match] > MATCH_RANK[best.match] ||
      (MATCH_RANK[match] === MATCH_RANK[best.match] && c.shift.start > best.shift.start)
    ) {
      best = { ...c, match };
    }
  }
  return best;
}

/**
 * A per-meal crew size carries over only while it still means the same thing:
 * a smaller-than-crew meal stays smaller, a bigger one (guests) stays bigger.
 */
export function carryCrewOverride(override: number | null, sourceCrew: number, targetCrew: number): number | null {
  if (override == null || override === targetCrew) return null;
  if (override < SCHEDULE_LIMITS.minCrewSize || override > SCHEDULE_LIMITS.maxCrewSize) return null;
  if (sourceCrew === targetCrew) return override;
  return Math.sign(override - sourceCrew) === Math.sign(override - targetCrew) ? override : null;
}

export type HardFilterRequest = Pick<
  GenerateRequest,
  "dietary_restrictions" | "allergens_to_avoid" | "protein" | "foods_to_avoid"
>;

/**
 * Why a recipe fails the user's current hard restrictions (Explore / breakfast
 * rules: high-confidence dietary flags incl. allergens, Foods to Avoid tags),
 * or null when it passes.
 */
export function hardFilterViolation(
  recipe: { dietarySummary?: DietarySummary; avoidTags?: readonly string[] },
  request: HardFilterRequest,
): string | null {
  const flags = requiredDietaryFlags(request);
  if (flags.length > 0) {
    const summary = recipe.dietarySummary;
    if (!summary || summary.confidence !== "high") {
      return `Not verified ${flags.map((f) => DIETARY_FILTER_LABELS[f]).join(" / ")}`;
    }
    const failed = flags.find((f) => !summary.flags[f]);
    if (failed) return `Not ${DIETARY_FILTER_LABELS[failed]}`;
  }
  const tags = new Set(recipe.avoidTags ?? []);
  const hit = (request.foods_to_avoid ?? []).find((k) => tags.has(k));
  if (hit) return `Contains ${(getFoodPreferenceDefinition(hit)?.label ?? hit).toLowerCase()}`;
  return null;
}

export type RecipeCheck =
  | { ok: true }
  | { ok: false; kind: RunItBackFlag["kind"]; reason: string; title: string | null };

/** Copied recipes must still exist (`lookup`) and pass the user's current hard restrictions. */
export function makeRecipeCheck(
  lookup: (slug: string) => { title: string; dietarySummary?: DietarySummary; avoidTags?: readonly string[] } | undefined,
  request: HardFilterRequest,
): (slug: string) => RecipeCheck {
  return (slug) => {
    const entry = lookup(slug);
    if (!entry) return { ok: false, kind: "unavailable", reason: "No longer available", title: null };
    const reason = hardFilterViolation(entry, request);
    return reason ? { ok: false, kind: "restriction", reason, title: entry.title } : { ok: true };
  };
}

export interface RunItBackCopyInput {
  sourceShift: Pick<ShiftInstance, "crewSize">;
  sourceSlots: readonly MealSlot[];
  sourceStates: readonly ShiftPlanSlotState[];
  targetShift: Pick<ShiftInstance, "crewSize">;
  targetSlots: readonly MealSlot[];
  checkRecipe(slug: string): RecipeCheck;
}

export interface RunItBackCopyResult {
  /** One state per target slot — the whole target plan is replaced. */
  states: ShiftPlanSlotState[];
  copiedMeals: number;
  copiedSkipped: number;
  copiedByo: number;
  crewOverridesKept: number;
  crewOverridesReset: number;
  flagged: RunItBackFlag[];
  /** Target slots with no counterpart in the source shift (longer shift, different meal times). */
  newSlotKeys: string[];
  /** Decided source meals with no place in the target (shorter shift). */
  droppedMeals: number;
}

export function buildRunItBackStates(input: RunItBackCopyInput): RunItBackCopyResult {
  const stateByKey = new Map(input.sourceStates.map((s) => [s.slotKey, s]));
  const sourceByIdentity = new Map<string, ShiftPlanSlotState | null>();
  for (const slot of input.sourceSlots) sourceByIdentity.set(slotIdentity(slot), stateByKey.get(slot.key) ?? null);

  const result: RunItBackCopyResult = {
    states: [],
    copiedMeals: 0,
    copiedSkipped: 0,
    copiedByo: 0,
    crewOverridesKept: 0,
    crewOverridesReset: 0,
    flagged: [],
    newSlotKeys: [],
    droppedMeals: 0,
  };

  const targetIdentities = new Set<string>();
  for (const slot of input.targetSlots) {
    const identity = slotIdentity(slot);
    targetIdentities.add(identity);
    const next = defaultSlotState(slot.key);
    if (!sourceByIdentity.has(identity)) result.newSlotKeys.push(slot.key);
    const src = sourceByIdentity.get(identity) ?? null;
    if (src) {
      next.skipped = src.skipped;
      next.byo = src.byo;
      if (src.skipped) result.copiedSkipped += 1;
      if (src.byo) result.copiedByo += 1;
      if (src.recipeSlug) {
        const check = input.checkRecipe(src.recipeSlug);
        if (check.ok) {
          next.recipeSlug = src.recipeSlug;
          next.selectionSource = src.selectionSource;
          next.locked = src.locked;
          result.copiedMeals += 1;
        } else {
          result.flagged.push({
            slotKey: slot.key,
            label: slot.label,
            recipeSlug: src.recipeSlug,
            recipeTitle: check.title,
            reason: check.reason,
            kind: check.kind,
          });
        }
      }
      if (src.crewSizeOverride != null) {
        next.crewSizeOverride = carryCrewOverride(src.crewSizeOverride, input.sourceShift.crewSize, input.targetShift.crewSize);
        if (next.crewSizeOverride != null) result.crewOverridesKept += 1;
        else result.crewOverridesReset += 1;
      }
    }
    result.states.push(next);
  }

  for (const [identity, state] of sourceByIdentity) {
    if (state && isDecided(state) && !targetIdentities.has(identity)) result.droppedMeals += 1;
  }
  return result;
}
