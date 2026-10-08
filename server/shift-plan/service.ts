/**
 * Shift Planner v2 orchestration. Dependencies are injected so the exact
 * route behavior is testable without Postgres or the recipe catalog.
 */
import type { MealSlotPreferences } from "../../shared/schedule/meal-slots.js";
import { mealSlotsForShift } from "../../shared/schedule/meal-slots.js";
import type { PersonalSchedule, ScheduleOverride } from "../../shared/schedule/types.js";
import {
  applySlotPatch,
  autofillTargets,
  defaultSlotState,
  isPlanComplete,
  mergePlanSlots,
  plannableShift,
} from "../../shared/shift-plan/plan.js";
import type { ShiftPlanFillInput, ShiftPlanSlotPatchInput } from "../../shared/shift-plan/schema.js";
import type {
  PlannedMealSlot,
  PlannedRecipe,
  ShiftPlanFillResponse,
  ShiftPlanFillResult,
  ShiftPlanSlotResponse,
  ShiftPlanSlotState,
  ShiftPlanView,
} from "../../shared/shift-plan/types.js";
import type { ShiftPlanRepo } from "./store.js";

export interface ShiftPlanScheduleContext {
  schedule: PersonalSchedule;
  overrides: ScheduleOverride[];
  mealPreferences: MealSlotPreferences;
}

export interface ShiftPlanDeps {
  repo: ShiftPlanRepo;
  loadSchedule(userId: string): Promise<ShiftPlanScheduleContext | null>;
  resolveRecipe(slug: string): PlannedRecipe | null;
  /** Whether a manual pick may use this slug (exists in the browsable catalog). */
  isSelectableSlug(slug: string): boolean;
  now(): Date;
}

export interface SlotPickAvoid {
  /** Never serve these (swap: the current recipe + already-seen). */
  hard: string[];
  /** Avoid when possible (recipes already in this shift). */
  soft: string[];
}

/** Returns a recipe slug for the slot, or null when nothing eligible fits. */
export type SlotPicker = (slot: PlannedMealSlot, avoid: SlotPickAvoid, seed: string) => Promise<string | null>;

export class ShiftPlanError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

interface LoadedPlan {
  view: ShiftPlanView;
  states: Map<string, ShiftPlanSlotState>;
}

async function loadPlan(deps: ShiftPlanDeps, userId: string): Promise<LoadedPlan> {
  const ctx = await deps.loadSchedule(userId);
  if (!ctx) {
    return {
      view: { hasSchedule: false, timezone: null, shift: null, slots: [], started: false, complete: false },
      states: new Map(),
    };
  }
  const shift = plannableShift(ctx.schedule, ctx.overrides, deps.now());
  if (!shift) {
    return {
      view: { hasSchedule: true, timezone: ctx.schedule.timezone, shift: null, slots: [], started: false, complete: false },
      states: new Map(),
    };
  }
  const record = await deps.repo.getPlan(userId, shift.key);
  const slots = mergePlanSlots(mealSlotsForShift(shift, ctx.mealPreferences), record.slots, deps.resolveRecipe);
  return {
    view: {
      hasSchedule: true,
      timezone: ctx.schedule.timezone,
      shift,
      slots,
      started: record.exists,
      complete: isPlanComplete(slots),
    },
    states: new Map(record.slots.map((s) => [s.slotKey, s])),
  };
}

/** Writes are only accepted for the shift the planner currently shows. */
function requireShift(plan: LoadedPlan, shiftKey: string): NonNullable<ShiftPlanView["shift"]> {
  const shift = plan.view.shift;
  if (!plan.view.hasSchedule) throw new ShiftPlanError(404, "Set up your schedule first");
  if (!shift) throw new ShiftPlanError(404, "No upcoming shift");
  if (shift.key !== shiftKey) {
    throw new ShiftPlanError(409, "Your next shift changed — reload to plan the new one");
  }
  return shift;
}

export async function getShiftPlan(deps: ShiftPlanDeps, userId: string): Promise<ShiftPlanView> {
  return (await loadPlan(deps, userId)).view;
}

export async function patchShiftPlanSlot(
  deps: ShiftPlanDeps,
  userId: string,
  input: ShiftPlanSlotPatchInput,
): Promise<ShiftPlanSlotResponse> {
  const plan = await loadPlan(deps, userId);
  const shift = requireShift(plan, input.shiftKey);
  const slot = plan.view.slots.find((s) => s.key === input.slotKey);
  if (!slot) throw new ShiftPlanError(404, "That meal is no longer part of this shift");
  if (input.recipeSlug && !deps.isSelectableSlug(input.recipeSlug)) {
    throw new ShiftPlanError(400, "That recipe isn't available");
  }

  const { shiftKey: _s, slotKey: _k, ...patch } = input;
  const next = applySlotPatch(plan.states.get(slot.key) ?? defaultSlotState(slot.key), patch, slot.shiftCrewSize);
  const created = await deps.repo.saveSlots(userId, shift.key, [next]);
  return { plan: (await loadPlan(deps, userId)).view, created };
}

/**
 * Auto-fill the whole shift, or pick/swap specific slots. Slots are filled in
 * time order; recipes already in the shift are avoided so one shift doesn't
 * repeat a meal (relaxed only if a slot would otherwise stay empty).
 */
export async function fillShiftPlan(
  deps: ShiftPlanDeps,
  userId: string,
  input: Pick<ShiftPlanFillInput, "shiftKey" | "mode" | "slotKeys" | "excludeSlugs">,
  pick: SlotPicker,
): Promise<ShiftPlanFillResponse> {
  const plan = await loadPlan(deps, userId);
  const shift = requireShift(plan, input.shiftKey);

  const explicit = input.slotKeys && input.slotKeys.length > 0 ? input.slotKeys : undefined;
  if (input.mode === "swap" && !explicit) throw new ShiftPlanError(400, "Choose a meal to swap");
  const targets = autofillTargets(plan.view.slots, explicit);
  if (explicit && targets.length === 0) throw new ShiftPlanError(400, "Nothing to fill for that meal");

  const targetKeys = new Set(targets.map((t) => t.key));
  const inShift = new Set(
    plan.view.slots.filter((s) => s.recipe && !targetKeys.has(s.key)).map((s) => s.recipe!.slug),
  );
  const exclude = input.excludeSlugs ?? [];

  const updates: ShiftPlanSlotState[] = [];
  const results: ShiftPlanFillResult[] = [];
  for (const slot of targets) {
    const previous = slot.recipe?.slug ?? null;
    const hard = input.mode === "swap" ? [...(previous ? [previous] : []), ...exclude] : [...exclude];
    const soft = [...inShift].filter((s) => !hard.includes(s));
    const seed = `${userId}|${slot.key}|${input.mode}|${previous ?? ""}|${exclude.join(",")}`;

    let slug: string | null = null;
    try {
      slug = await pick(slot, { hard, soft }, seed);
    } catch {
      slug = null;
    }
    if (!slug) {
      results.push({ slotKey: slot.key, ok: false, previousSlug: previous, error: "No meal fits this slot's filters" });
      continue;
    }
    inShift.add(slug);
    updates.push(
      applySlotPatch(
        plan.states.get(slot.key) ?? defaultSlotState(slot.key),
        { recipeSlug: slug, selectionSource: "auto" },
        slot.shiftCrewSize,
      ),
    );
    results.push({ slotKey: slot.key, ok: true, recipeSlug: slug, previousSlug: previous });
  }

  const created = updates.length > 0 ? await deps.repo.saveSlots(userId, shift.key, updates) : false;
  return { plan: (await loadPlan(deps, userId)).view, results, created };
}
