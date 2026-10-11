/**
 * Shift Planner v2 orchestration. Dependencies are injected so the exact
 * route behavior is testable without Postgres or the recipe catalog.
 */
import type { MealSlotPreferences } from "../../shared/schedule/meal-slots.js";
import { mealSlotsForShift } from "../../shared/schedule/meal-slots.js";
import { getShiftsInRange } from "../../shared/schedule/engine.js";
import type { PersonalSchedule, ScheduleOverride, ShiftInstance } from "../../shared/schedule/types.js";
import {
  RUN_IT_BACK_LOOKBACK_DAYS,
  RUN_IT_BACK_MAX_CANDIDATES,
  buildRunItBackStates,
  chooseRunItBackSource,
  isDecided,
  type RecipeCheck,
  type RunItBackCandidate,
} from "../../shared/shift-plan/run-it-back.js";
import {
  applySlotPatch,
  autofillTargets,
  defaultSlotState,
  isPlanComplete,
  isSlotResolved,
  mergePlanSlots,
} from "../../shared/shift-plan/plan.js";
import {
  PLAN_AHEAD_WINDOW_DAYS,
  shiftAccess,
  shiftPlanStatus,
  upcomingPlannableShifts,
} from "../../shared/shift-plan/plan-ahead.js";
import type { RunItBackInput, ShiftPlanFillInput, ShiftPlanSlotPatchInput } from "../../shared/shift-plan/schema.js";
import type {
  PlannedMealSlot,
  PlannedRecipe,
  RunItBackMatch,
  RunItBackPreview,
  RunItBackResponse,
  ShiftPlanFillResponse,
  ShiftPlanFillResult,
  ShiftPlanSlotResponse,
  ShiftPlanSlotState,
  ShiftPlanView,
  UpcomingShiftsView,
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
  /** Pro `plan_ahead` entitlement. Only consulted for shifts beyond the free current/next shift. */
  canPlanAhead(userId: string): Promise<boolean>;
  /** Pro `run_it_back` entitlement. */
  canRunItBack(userId: string): Promise<boolean>;
  /**
   * Called after a save leaves a plan complete (every required meal decided).
   * Starts the Pro reverse trial if this account never had one; returns
   * whether it started now. Never blocks or fails the save.
   */
  onPlanComplete?(userId: string, plan: ShiftPlanView): Promise<boolean>;
  now(): Date;
}

async function notifyPlanComplete(deps: ShiftPlanDeps, userId: string, view: ShiftPlanView): Promise<boolean> {
  if (!deps.onPlanComplete || !view.started || !view.complete) return false;
  try {
    return await deps.onPlanComplete(userId, view);
  } catch {
    return false;
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

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
    readonly code?: string,
  ) {
    super(message);
  }
}

type RunItBackSource = RunItBackCandidate & { match: RunItBackMatch };

interface LoadedPlan {
  view: ShiftPlanView;
  states: Map<string, ShiftPlanSlotState>;
  ctx: ShiftPlanScheduleContext | null;
  source: RunItBackSource | null;
}

function emptyView(timezone: string | null): ShiftPlanView {
  return {
    hasSchedule: timezone != null,
    timezone,
    shift: null,
    slots: [],
    started: false,
    complete: false,
    planAhead: false,
    runItBack: null,
  };
}

/** The previous comparable saved plan for `target` (see chooseRunItBackSource). */
async function findRunItBackSource(
  deps: ShiftPlanDeps,
  userId: string,
  ctx: ShiftPlanScheduleContext,
  target: ShiftInstance,
): Promise<RunItBackSource | null> {
  const targetStart = Date.parse(target.start);
  const earlier = getShiftsInRange(ctx.schedule, ctx.overrides, {
    from: new Date(targetStart - RUN_IT_BACK_LOOKBACK_DAYS * DAY_MS),
    to: new Date(targetStart),
  })
    .filter((s) => s.key !== target.key && Date.parse(s.start) < targetStart)
    .slice(-RUN_IT_BACK_MAX_CANDIDATES);
  if (earlier.length === 0) return null;
  const states = await deps.repo.listSlotStates(
    userId,
    earlier.map((s) => s.key),
  );
  return chooseRunItBackSource(
    target,
    earlier.map((shift) => ({ shift, states: states.get(shift.key) ?? [] })),
  );
}

function runItBackPreview(source: RunItBackSource | null): RunItBackPreview | null {
  if (!source) return null;
  return {
    sourceShiftKey: source.shift.key,
    sourceStartLocal: source.shift.startLocal,
    sourceScheduledMinutes: source.shift.scheduledMinutes,
    match: source.match,
    decidedCount: source.states.filter(isDecided).length,
  };
}

/**
 * Loads the plan for `shiftKey`, or for the free current/next shift when
 * omitted. A shift beyond the free shift needs Plan Ahead and must start
 * within the window; an unknown key (cancelled, moved, past, out of window)
 * fails with `missingStatus`.
 */
async function loadPlan(
  deps: ShiftPlanDeps,
  userId: string,
  shiftKey?: string,
  missingStatus: 404 | 409 = 404,
): Promise<LoadedPlan> {
  const ctx = await deps.loadSchedule(userId);
  if (!ctx) {
    if (shiftKey) throw new ShiftPlanError(404, "Set up your schedule first");
    return { view: emptyView(null), states: new Map(), ctx: null, source: null };
  }
  const now = deps.now();
  const { freeShift, shifts } = upcomingPlannableShifts(ctx.schedule, ctx.overrides, now);
  const shift = shiftKey ? shifts.find((s) => s.key === shiftKey) : freeShift;
  if (!shift) {
    if (!shiftKey) return { view: emptyView(ctx.schedule.timezone), states: new Map(), ctx, source: null };
    throw new ShiftPlanError(
      missingStatus,
      missingStatus === 409
        ? "That shift changed — reload to see your schedule"
        : "That shift isn't on your schedule in the next 30 days",
    );
  }

  const planAhead = shift.key !== freeShift?.key;
  if (planAhead) {
    const access = { canPlanAhead: await deps.canPlanAhead(userId), windowDays: PLAN_AHEAD_WINDOW_DAYS };
    if (!shiftAccess(shift, freeShift?.key ?? null, access, now).actionable) {
      throw new ShiftPlanError(403, "Planning shifts further ahead is part of Pro", "plan_ahead_required");
    }
  }

  const [record, source] = await Promise.all([
    deps.repo.getPlan(userId, shift.key),
    findRunItBackSource(deps, userId, ctx, shift),
  ]);
  const slots = mergePlanSlots(mealSlotsForShift(shift, ctx.mealPreferences), record.slots, deps.resolveRecipe);
  return {
    view: {
      hasSchedule: true,
      timezone: ctx.schedule.timezone,
      shift,
      slots,
      started: record.exists,
      complete: isPlanComplete(slots),
      planAhead,
      runItBack: runItBackPreview(source),
    },
    states: new Map(record.slots.map((s) => [s.slotKey, s])),
    ctx,
    source,
  };
}

/** Writes name their shift; it must still be a plannable shift for this user. */
async function loadPlanForWrite(deps: ShiftPlanDeps, userId: string, shiftKey: string) {
  const plan = await loadPlan(deps, userId, shiftKey, 409);
  return { plan, shift: plan.view.shift! };
}

/** The free current/next shift, or (`shiftKey`) any shift this user may plan. */
export async function getShiftPlan(deps: ShiftPlanDeps, userId: string, shiftKey?: string): Promise<ShiftPlanView> {
  return (await loadPlan(deps, userId, shiftKey)).view;
}

/**
 * The upcoming-shifts view: the free shift plus every working shift starting
 * within the Plan Ahead window, with plan status. Visible to every user —
 * `actionable` is false for shifts beyond the free boundary without Pro.
 */
export async function listUpcomingShifts(deps: ShiftPlanDeps, userId: string): Promise<UpcomingShiftsView> {
  const ctx = await deps.loadSchedule(userId);
  if (!ctx) {
    return { hasSchedule: false, timezone: null, canPlanAhead: false, windowDays: PLAN_AHEAD_WINDOW_DAYS, shifts: [] };
  }
  const now = deps.now();
  const { freeShift, shifts } = upcomingPlannableShifts(ctx.schedule, ctx.overrides, now);
  const access = { canPlanAhead: await deps.canPlanAhead(userId), windowDays: PLAN_AHEAD_WINDOW_DAYS };
  const states = await deps.repo.listSlotStates(
    userId,
    shifts.map((s) => s.key),
  );
  return {
    hasSchedule: true,
    timezone: ctx.schedule.timezone,
    canPlanAhead: access.canPlanAhead,
    windowDays: access.windowDays,
    shifts: shifts.map((shift) => {
      const slots = mergePlanSlots(
        mealSlotsForShift(shift, ctx.mealPreferences),
        states.get(shift.key) ?? [],
        deps.resolveRecipe,
      );
      return {
        shift,
        status: shiftPlanStatus(slots),
        plannedCount: slots.filter(isSlotResolved).length,
        mealCount: slots.length,
        isNext: shift.key === freeShift?.key,
        actionable: shiftAccess(shift, freeShift?.key ?? null, access, now).actionable,
      };
    }),
  };
}

export async function patchShiftPlanSlot(
  deps: ShiftPlanDeps,
  userId: string,
  input: ShiftPlanSlotPatchInput,
): Promise<ShiftPlanSlotResponse> {
  const { plan, shift } = await loadPlanForWrite(deps, userId, input.shiftKey);
  const slot = plan.view.slots.find((s) => s.key === input.slotKey);
  if (!slot) throw new ShiftPlanError(404, "That meal is no longer part of this shift");
  if (input.recipeSlug && !deps.isSelectableSlug(input.recipeSlug)) {
    throw new ShiftPlanError(400, "That recipe isn't available");
  }

  const { shiftKey: _s, slotKey: _k, ...patch } = input;
  const next = applySlotPatch(plan.states.get(slot.key) ?? defaultSlotState(slot.key), patch, slot.shiftCrewSize);
  const created = await deps.repo.saveSlots(userId, shift.key, [next]);
  const view = (await loadPlan(deps, userId, shift.key, 409)).view;
  return { plan: view, created, proTrialStarted: await notifyPlanComplete(deps, userId, view) };
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
  const { plan, shift } = await loadPlanForWrite(deps, userId, input.shiftKey);

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
  const view = (await loadPlan(deps, userId, shift.key, 409)).view;
  const proTrialStarted = updates.length > 0 ? await notifyPlanComplete(deps, userId, view) : false;
  return { plan: view, results, created, proTrialStarted };
}

/**
 * Run It Back (Pro): replace the target shift's plan with the previous
 * comparable plan, adapted to the target's slots. Copied recipes that fail
 * the user's current hard restrictions (or left the catalog) are flagged and
 * left open. `refresh` then re-picks every unlocked meal with the normal
 * auto-fill, never re-serving last shift's auto picks.
 */
export async function runItBack(
  deps: ShiftPlanDeps,
  userId: string,
  input: Pick<RunItBackInput, "shiftKey" | "sourceShiftKey" | "mode">,
  options: { checkRecipe(slug: string): RecipeCheck; pick?: SlotPicker },
): Promise<RunItBackResponse> {
  if (!(await deps.canRunItBack(userId))) {
    throw new ShiftPlanError(403, "Run It Back is part of Pro", "run_it_back_required");
  }
  const { plan, shift } = await loadPlanForWrite(deps, userId, input.shiftKey);
  const source = plan.source;
  if (!source) throw new ShiftPlanError(404, "No earlier shift plan to run back");
  if (input.sourceShiftKey && input.sourceShiftKey !== source.shift.key) {
    throw new ShiftPlanError(409, "Your last shift plan changed — reload and try again");
  }
  if (input.mode === "refresh" && !options.pick) throw new ShiftPlanError(400, "Refresh needs meal preferences");

  const prefs = plan.ctx!.mealPreferences;
  const copy = buildRunItBackStates({
    sourceShift: source.shift,
    sourceSlots: mealSlotsForShift(source.shift, prefs),
    sourceStates: source.states,
    targetShift: shift,
    targetSlots: plan.view.slots,
    checkRecipe: options.checkRecipe,
  });
  let created = copy.states.length > 0 ? await deps.repo.saveSlots(userId, shift.key, copy.states) : false;

  let refreshed = 0;
  let refreshFailed = 0;
  let proTrialStarted = false;
  let view = (await loadPlan(deps, userId, shift.key, 409)).view;
  if (input.mode === "refresh") {
    const lastShiftAutoPicks = source.states
      .filter((s) => s.recipeSlug && !s.locked)
      .map((s) => s.recipeSlug!)
      .slice(0, 40);
    const fill = await fillShiftPlan(
      deps,
      userId,
      { shiftKey: shift.key, mode: "fill", excludeSlugs: lastShiftAutoPicks },
      options.pick!,
    );
    refreshed = fill.results.filter((r) => r.ok).length;
    refreshFailed = fill.results.length - refreshed;
    created = created || fill.created;
    view = fill.plan;
    proTrialStarted = Boolean(fill.proTrialStarted);
  }
  if (!proTrialStarted && copy.states.length > 0) proTrialStarted = await notifyPlanComplete(deps, userId, view);

  const { states: _states, ...counts } = copy;
  return {
    plan: view,
    created,
    proTrialStarted,
    summary: {
      sourceShiftKey: source.shift.key,
      sourceStartLocal: source.shift.startLocal,
      match: source.match,
      mode: input.mode,
      ...counts,
      refreshed,
      refreshFailed,
    },
  };
}
