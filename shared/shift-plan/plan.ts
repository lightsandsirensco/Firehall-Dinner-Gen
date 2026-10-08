/**
 * Shift Planner v2 — pure plan logic shared by the server routes and tests.
 *
 * - Which shift is plannable (the one under way, else the next scheduled one).
 * - Merging persisted per-slot state onto generated meal slots.
 * - Slot patch semantics (manual pick locks, skip/BYO are exclusive).
 * - Which slots auto-fill may touch.
 * - Mapping a meal slot onto the existing generator request (time window →
 *   time budget, crew size, meal format/category). No AI, no new ranking.
 */
import type { GenerateRequest } from "../schema.js";
import type { FirehallCategoryId } from "../firehall-categories.js";
import { inferBusyLevelFromTime } from "../busy-level.js";
import { getNextShift } from "../schedule/engine.js";
import type { MealSlot, StandardMealType } from "../schedule/meal-slots.js";
import type { PersonalSchedule, ScheduleOverride, ShiftInstance } from "../schedule/types.js";
import type {
  PlannedMealSlot,
  PlannedRecipe,
  ShiftPlanSelectionSource,
  ShiftPlanSlotState,
} from "./types.js";

/** Generator crew-size bounds (generateRequestSchema). Displayed servings use the real crew size. */
export const GENERATOR_MIN_CREW = 2;
export const GENERATOR_MAX_CREW = 20;

/** The shift a user plans: the one in progress, otherwise the next scheduled one. */
export function plannableShift(
  schedule: PersonalSchedule,
  overrides: readonly ScheduleOverride[],
  now: Date,
): ShiftInstance | null {
  return getNextShift(schedule, overrides, now, { includeInProgress: true });
}

export function defaultSlotState(slotKey: string): ShiftPlanSlotState {
  return {
    slotKey,
    recipeSlug: null,
    selectionSource: null,
    locked: false,
    skipped: false,
    byo: false,
    crewSizeOverride: null,
  };
}

export interface ShiftPlanSlotPatch {
  recipeSlug?: string | null;
  selectionSource?: ShiftPlanSelectionSource;
  skipped?: boolean;
  byo?: boolean;
  locked?: boolean;
  crewSizeOverride?: number | null;
}

/**
 * Applies one user/auto-fill change to a slot.
 *
 * - Setting a recipe clears skip/BYO. A manual pick locks the slot unless
 *   `locked` is given explicitly; an auto pick keeps the current lock.
 * - Clearing the recipe also clears the lock.
 * - Skip and BYO are mutually exclusive; the recipe is kept so un-skipping
 *   restores it.
 * - A slot can only be locked while it holds a recipe.
 * - A crew override equal to the shift's crew size is stored as "no override".
 */
export function applySlotPatch(
  current: ShiftPlanSlotState,
  patch: ShiftPlanSlotPatch,
  shiftCrewSize: number,
): ShiftPlanSlotState {
  const next: ShiftPlanSlotState = { ...current };

  if (patch.recipeSlug !== undefined) {
    if (patch.recipeSlug) {
      const source = patch.selectionSource ?? "manual";
      next.recipeSlug = patch.recipeSlug;
      next.selectionSource = source;
      next.skipped = false;
      next.byo = false;
      if (source === "manual") next.locked = true;
    } else {
      next.recipeSlug = null;
      next.selectionSource = null;
      next.locked = false;
    }
  }

  if (patch.skipped !== undefined) {
    next.skipped = patch.skipped;
    if (patch.skipped) next.byo = false;
  }
  if (patch.byo !== undefined) {
    next.byo = patch.byo;
    if (patch.byo) next.skipped = false;
  }

  if (patch.locked !== undefined) next.locked = patch.locked;
  if (!next.recipeSlug) next.locked = false;

  if (patch.crewSizeOverride !== undefined) {
    next.crewSizeOverride =
      patch.crewSizeOverride == null || patch.crewSizeOverride === shiftCrewSize ? null : patch.crewSizeOverride;
  }

  return next;
}

export function isDefaultSlotState(state: ShiftPlanSlotState): boolean {
  return (
    !state.recipeSlug &&
    !state.locked &&
    !state.skipped &&
    !state.byo &&
    state.crewSizeOverride == null
  );
}

/** Generated slots + stored state. State for slots no longer generated (shift edited) is ignored. */
export function mergePlanSlots(
  slots: readonly MealSlot[],
  states: readonly ShiftPlanSlotState[],
  resolveRecipe: (slug: string) => PlannedRecipe | null,
): PlannedMealSlot[] {
  const bySlot = new Map(states.map((s) => [s.slotKey, s]));
  return slots.map((slot) => {
    const state = bySlot.get(slot.key) ?? defaultSlotState(slot.key);
    const recipe = state.recipeSlug ? resolveRecipe(state.recipeSlug) : null;
    return {
      ...slot,
      shiftCrewSize: slot.crewSize,
      crewSize: state.crewSizeOverride ?? slot.crewSize,
      crewSizeOverride: state.crewSizeOverride,
      skipped: state.skipped,
      byo: state.byo,
      locked: Boolean(recipe) && state.locked,
      selectionSource: recipe ? state.selectionSource : null,
      recipe,
    };
  });
}

/** A slot is decided once it has a recipe, or is skipped, or is BYO. */
export function isSlotResolved(slot: Pick<PlannedMealSlot, "recipe" | "skipped" | "byo">): boolean {
  return slot.skipped || slot.byo || slot.recipe != null;
}

/** Complete = every required slot decided and at least one slot decided. Optional slots may stay open. */
export function isPlanComplete(slots: readonly PlannedMealSlot[]): boolean {
  return (
    slots.length > 0 &&
    slots.some(isSlotResolved) &&
    slots.every((s) => s.optional || isSlotResolved(s))
  );
}

/**
 * Slots an auto-fill request may change.
 * - Whole shift: every slot that isn't locked, skipped or BYO (unlocked picks are re-rolled).
 * - Explicit slots (Pick / Swap one): those slots unless skipped or BYO — an
 *   explicit action on a locked slot is the user's choice.
 */
export function autofillTargets(
  slots: readonly PlannedMealSlot[],
  slotKeys?: readonly string[],
): PlannedMealSlot[] {
  if (slotKeys && slotKeys.length > 0) {
    const wanted = new Set(slotKeys);
    return slots.filter((s) => wanted.has(s.key) && !s.skipped && !s.byo);
  }
  return slots.filter((s) => !s.locked && !s.skipped && !s.byo);
}

type TimeAvailable = GenerateRequest["time_available"];

const TIME_BUDGETS_SHORTEST_FIRST: readonly TimeAvailable[] = [
  "15-25",
  "20-30",
  "25-40",
  "30-45",
  "45-60",
  "60-90",
];

export interface SlotSelectionProfile {
  mealType: StandardMealType;
  meal_format: GenerateRequest["meal_format"];
  firehall_category?: FirehallCategoryId;
  time_available: TimeAvailable;
}

/**
 * Same occasion → generator mapping the original Shift Planner uses
 * (shared/shift-planner/occasions.ts), with Late Night as a quick meal.
 */
const SLOT_PROFILES: Record<StandardMealType, Omit<SlotSelectionProfile, "mealType">> = {
  breakfast: { meal_format: "breakfast", time_available: "20-30" },
  lunch: { meal_format: "random", firehall_category: "quick_meals", time_available: "30-45" },
  dinner: { meal_format: "random", firehall_category: "crew_favorites", time_available: "45-60" },
  late_night: { meal_format: "random", firehall_category: "quick_meals", time_available: "20-30" },
};

/** Custom meals borrow the profile of the standard meal nearest their local time. */
function mealTypeForCustomSlot(plannedLocal: string): StandardMealType {
  const hour = Number(plannedLocal.slice(11, 13));
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 21) return "dinner";
  return "late_night";
}

/**
 * Selection profile for a slot. A slot pushed later because the crew only
 * arrives near the end of the meal window gets one notch less cooking time.
 */
export function slotSelectionProfile(slot: Pick<MealSlot, "type" | "plannedLocal" | "adjusted">): SlotSelectionProfile {
  const mealType = slot.type === "custom" ? mealTypeForCustomSlot(slot.plannedLocal) : slot.type;
  const base = SLOT_PROFILES[mealType];
  let time_available = base.time_available;
  if (slot.adjusted) {
    const idx = TIME_BUDGETS_SHORTEST_FIRST.indexOf(time_available);
    time_available = TIME_BUDGETS_SHORTEST_FIRST[Math.max(0, idx - 1)]!;
  }
  return { mealType, ...base, time_available };
}

export function generatorCrewSize(crewSize: number): number {
  if (!Number.isFinite(crewSize)) return GENERATOR_MIN_CREW;
  return Math.min(GENERATOR_MAX_CREW, Math.max(GENERATOR_MIN_CREW, Math.round(crewSize)));
}

/**
 * One slot's generator request from the user's personalized base request.
 * Hard restrictions (allergens, dietary, foods to avoid, appliances) and
 * ranking preferences (healthiness, nutrition goal) pass through untouched.
 * Per-session Pick Tonight choices (protein, style, time window) are reset so
 * one shift gets varied meals — except a vegetarian protein choice, which is
 * a restriction.
 */
export function buildSlotGenerateRequest(
  base: GenerateRequest,
  slot: Pick<MealSlot, "type" | "plannedLocal" | "adjusted" | "crewSize">,
  avoidSlugs: readonly string[] = [],
): GenerateRequest {
  const profile = slotSelectionProfile(slot);
  const vegetarian = base.protein === "vegetarian";
  return {
    ...base,
    crew_size: generatorCrewSize(slot.crewSize),
    meal_format: profile.meal_format,
    firehall_category: profile.firehall_category,
    time_available: profile.time_available,
    busy_level: inferBusyLevelFromTime(profile.time_available),
    enforce_time_bucket: true,
    time_window: "any",
    meal_style: "any",
    protein: vegetarian ? "vegetarian" : "any",
    vegetarian_swap_needed: vegetarian,
    use_what_we_have: false,
    ingredients_on_hand: [],
    last_template_id: undefined,
    session_feedback: avoidSlugs.length > 0 ? { avoid_slugs: [...new Set(avoidSlugs)].slice(0, 40) } : undefined,
  };
}

/** FNV-1a — stable numeric variety seed from a string. */
export function stableSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
