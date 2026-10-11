/**
 * Plan Ahead — which scheduled shifts a user may open and plan.
 *
 * Free: the shift under way, otherwise the next scheduled one (the "free
 * shift", plannableShift). Pro (`plan_ahead`): any working shift that starts
 * within PLAN_AHEAD_WINDOW_DAYS. Shifts are always the engine's real
 * occurrences (pattern + overrides) — cancelled shifts are never listed or
 * plannable, extra and modified shifts are.
 */
import type { BillingFeature } from "../billing/types.js";
import { getShiftsInRange } from "../schedule/engine.js";
import type { PersonalSchedule, ScheduleOverride, ShiftInstance } from "../schedule/types.js";
import { isPlanComplete, isSlotResolved, plannableShift } from "./plan.js";
import type { PlannedMealSlot } from "./types.js";

export const PLAN_AHEAD_WINDOW_DAYS = 30;
/** Hard cap on listed shifts (a pattern of very short blocks could otherwise produce hundreds). */
export const MAX_UPCOMING_SHIFTS = 40;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlanAheadAccess {
  canPlanAhead: boolean;
  windowDays: number;
}

export function resolvePlanAheadAccess(
  features: Partial<Record<BillingFeature, boolean>> | null | undefined,
): PlanAheadAccess {
  return { canPlanAhead: features?.plan_ahead === true, windowDays: PLAN_AHEAD_WINDOW_DAYS };
}

/** Exclusive end of the Plan Ahead window: a shift must START before this instant. */
export function planAheadHorizon(now: Date): Date {
  return new Date(now.getTime() + PLAN_AHEAD_WINDOW_DAYS * DAY_MS);
}

export interface UpcomingShiftSet {
  /** Current/next shift — plannable by every signed-in user. */
  freeShift: ShiftInstance | null;
  /** Free shift first (even if it starts beyond the window), then every other working shift in the window. */
  shifts: ShiftInstance[];
}

export function upcomingPlannableShifts(
  schedule: PersonalSchedule,
  overrides: readonly ScheduleOverride[],
  now: Date,
): UpcomingShiftSet {
  const freeShift = plannableShift(schedule, overrides, now);
  const inWindow = getShiftsInRange(schedule, overrides, { from: now, to: planAheadHorizon(now) }).filter(
    (s) => s.key !== freeShift?.key && Date.parse(s.end) > now.getTime(),
  );
  const shifts = freeShift ? [freeShift, ...inWindow] : inWindow;
  return { freeShift, shifts: shifts.slice(0, MAX_UPCOMING_SHIFTS) };
}

export interface ShiftAccess {
  /** Beyond the free shift — opening/planning it is Plan Ahead. */
  planAhead: boolean;
  /** This user may open and plan it now. */
  actionable: boolean;
}

export function shiftAccess(
  shift: Pick<ShiftInstance, "key" | "start" | "status">,
  freeShiftKey: string | null,
  access: PlanAheadAccess,
  now: Date,
): ShiftAccess {
  if (shift.status === "cancelled") return { planAhead: shift.key !== freeShiftKey, actionable: false };
  if (shift.key === freeShiftKey) return { planAhead: false, actionable: true };
  const inWindow = Date.parse(shift.start) < planAheadHorizon(now).getTime();
  return { planAhead: true, actionable: access.canPlanAhead && inWindow };
}

export type ShiftPlanStatus = "unplanned" | "partial" | "planned";

export const SHIFT_PLAN_STATUS_LABEL: Record<ShiftPlanStatus, string> = {
  unplanned: "Unplanned",
  partial: "Partially planned",
  planned: "Planned",
};

/** Planned = every required meal decided; partial = at least one decided; otherwise unplanned. */
export function shiftPlanStatus(slots: readonly PlannedMealSlot[]): ShiftPlanStatus {
  if (isPlanComplete(slots)) return "planned";
  return slots.some(isSlotResolved) ? "partial" : "unplanned";
}
