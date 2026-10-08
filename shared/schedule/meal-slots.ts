/**
 * Deterministic meal-slot generation for one shift (no AI).
 *
 * Meals are evaluated per local "meal day" (05:00 → 05:00 next day, so a
 * 00:30 late-night snack belongs to the evening before). For each meal day
 * the shift touches and each meal type:
 *
 *   usable span  = [shift start + arrival grace, shift end − departure buffer]
 *   window       = the meal's local window on that meal day
 *
 *   1. Default time AFTER the usable end → no slot. Meals are never pulled
 *      earlier to squeeze in before leaving — this is what stops a second
 *      breakfast at 06:00 when a 24 ends at 07:00.
 *   2. Default time BEFORE the usable start → pushed later to the usable
 *      start, only if that is still ≥ MIN_WINDOW before the window closes.
 *      A pushed meal is optional (the crew likely ate before coming in).
 *   3. Otherwise → slot at the default time.
 *   Late night is optional whenever it is generated.
 *
 * All window math is on the local wall clock of the shift's timezone and
 * converted to instants per meal day, so it is correct across DST.
 */
import type { ShiftInstance } from "./types.js";
import {
  formatLocalDateTime,
  instantToWall,
  parseLocalTime,
  wallToInstant,
} from "./timezone.js";

const MINUTE_MS = 60_000;
const DAY_MINUTES = 24 * 60;
const DAY_MS = DAY_MINUTES * MINUTE_MS;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "late_night", "custom"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export type StandardMealType = Exclude<MealType, "custom">;
export const STANDARD_MEAL_TYPES: readonly StandardMealType[] = ["breakfast", "lunch", "dinner", "late_night"];

/** Local time at which a new meal day begins; earlier meals belong to the previous day. */
export const MEAL_DAY_ROLLOVER_MINUTES = 5 * 60;
/** A pushed meal needs at least this much of its window left. */
export const MIN_MEAL_WINDOW_MINUTES = 30;

export const DEFAULT_ARRIVAL_GRACE_MINUTES = 30;
export const DEFAULT_DEPARTURE_BUFFER_MINUTES = 60;

/** Minutes from meal-day midnight; values ≥ 1440 are after midnight (next calendar day). */
export interface MealWindow {
  start: number;
  defaultTime: number;
  end: number;
}

export const DEFAULT_MEAL_WINDOWS: Readonly<Record<StandardMealType, MealWindow>> = {
  breakfast: { start: 6 * 60, defaultTime: 7 * 60 + 30, end: 10 * 60 },
  lunch: { start: 11 * 60, defaultTime: 12 * 60, end: 14 * 60 },
  dinner: { start: 16 * 60 + 30, defaultTime: 18 * 60, end: 20 * 60 + 30 },
  late_night: { start: 22 * 60, defaultTime: 23 * 60 + 30, end: 26 * 60 },
};

export const MEAL_TYPE_LABELS: Readonly<Record<MealType, string>> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  late_night: "Late Night",
  custom: "Meal",
};

/**
 * "auto"     — rules above (late night optional);
 * "required" — same eligibility, never optional;
 * "optional" — same eligibility, always optional;
 * "off"      — never generated.
 */
export type MealSlotMode = "auto" | "required" | "optional" | "off";

export interface MealTypePreference {
  mode?: MealSlotMode;
  /** "HH:MM" local. windowEnd earlier than windowStart crosses midnight. */
  windowStart?: string;
  defaultTime?: string;
  windowEnd?: string;
}

export interface CustomMealPreference {
  id: string;
  label: string;
  /** "HH:MM" local; before 05:00 counts as the end of the previous meal day. */
  time: string;
  optional?: boolean;
}

/** The only persisted meal-slot data: how a user wants defaults customized. */
export interface MealSlotPreferences {
  meals?: Partial<Record<StandardMealType, MealTypePreference>>;
  custom?: CustomMealPreference[];
  arrivalGraceMinutes?: number;
  departureBufferMinutes?: number;
}

export interface MealSlotShiftInput {
  /** ISO instant or Date. */
  start: string | Date;
  end: string | Date;
  timezone: string;
  crewSize: number;
  /** Stable shift key (ShiftInstance.key) used to build stable slot keys. */
  shiftKey?: string;
}

export interface MealSlot {
  /** Stable: `${shiftKey}|${type or custom id}|${mealDate}` — future per-slot state attaches here. */
  key: string;
  type: MealType;
  label: string;
  customMealId?: string;
  /** Planned/default time — ISO instant and local reading. */
  plannedTime: string;
  plannedLocal: string;
  /** Local meal day ("YYYY-MM-DD") and 1-based day of the shift it belongs to. */
  mealDate: string;
  dayIndex: number;
  crewSize: number;
  optional: boolean;
  /** True when the default time fell before arrival and the slot was pushed later. */
  adjusted: boolean;
  /** Reserved for later phases — always defaults here. */
  skipped: boolean;
  byo: boolean;
  customLabel: string | null;
}

function toMs(v: string | Date): number {
  return typeof v === "string" ? Date.parse(v) : v.getTime();
}

function hhmm(value: string | undefined): number | null {
  return value == null ? null : parseLocalTime(value);
}

/** Resolve a type's window from defaults + preference. Invalid pieces fall back to defaults. */
export function resolveMealWindow(type: StandardMealType, pref?: MealTypePreference): MealWindow {
  const base = DEFAULT_MEAL_WINDOWS[type];
  if (!pref) return base;
  const rawStart = hhmm(pref.windowStart);
  const rawEnd = hhmm(pref.windowEnd);
  const rawDefault = hhmm(pref.defaultTime);

  const shiftIntoDay = (m: number) => (m < MEAL_DAY_ROLLOVER_MINUTES ? m + DAY_MINUTES : m);
  let start = rawStart != null ? shiftIntoDay(rawStart) : base.start;
  let end = rawEnd != null ? shiftIntoDay(rawEnd) : base.end;
  if (end <= start) end += DAY_MINUTES;
  if (end - start > 12 * 60) {
    start = base.start;
    end = base.end;
  }
  let defaultTime = rawDefault != null ? shiftIntoDay(rawDefault) : base.defaultTime;
  if (defaultTime < start && defaultTime + DAY_MINUTES <= end) defaultTime += DAY_MINUTES;
  if (defaultTime < start || defaultTime > end) {
    defaultTime = base.defaultTime >= start && base.defaultTime <= end ? base.defaultTime : start;
  }
  return { start, defaultTime, end };
}

function clampMinutes(value: number | undefined, fallback: number, max: number): number {
  return Number.isInteger(value) && value! >= 0 && value! <= max ? value! : fallback;
}

/** Wall ms of local midnight for the meal day containing `wallMs`. */
function mealDayWall(wallMs: number): number {
  const shifted = wallMs - MEAL_DAY_ROLLOVER_MINUTES * MINUTE_MS;
  return Math.floor(shifted / DAY_MS) * DAY_MS;
}

const TYPE_ORDER: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2, late_night: 3, custom: 4 };

export function generateMealSlots(shift: MealSlotShiftInput, prefs: MealSlotPreferences = {}): MealSlot[] {
  const startMs = toMs(shift.start);
  const endMs = toMs(shift.end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
  const tz = shift.timezone;

  const grace = clampMinutes(prefs.arrivalGraceMinutes, DEFAULT_ARRIVAL_GRACE_MINUTES, 180);
  const buffer = clampMinutes(prefs.departureBufferMinutes, DEFAULT_DEPARTURE_BUFFER_MINUTES, 240);
  const usableStart = startMs + grace * MINUTE_MS;
  const usableEnd = endMs - buffer * MINUTE_MS;
  if (usableEnd < usableStart) return [];

  const firstDay = mealDayWall(instantToWall(startMs, tz));
  const lastDay = mealDayWall(instantToWall(endMs, tz));
  const shiftKey = shift.shiftKey ?? formatLocalDateTime(instantToWall(startMs, tz));
  const at = (dayWall: number, minutes: number) => wallToInstant(dayWall + minutes * MINUTE_MS, tz).instantMs;

  const slots: MealSlot[] = [];
  const push = (
    dayWall: number,
    type: MealType,
    plannedMs: number,
    optional: boolean,
    adjusted: boolean,
    label: string,
    customMealId?: string,
  ) => {
    const mealDate = formatLocalDateTime(dayWall).slice(0, 10);
    slots.push({
      key: `${shiftKey}|${customMealId ? `custom:${customMealId}` : type}|${mealDate}`,
      type,
      label,
      ...(customMealId ? { customMealId } : {}),
      plannedTime: new Date(plannedMs).toISOString(),
      plannedLocal: formatLocalDateTime(instantToWall(plannedMs, tz)),
      mealDate,
      dayIndex: Math.round((dayWall - firstDay) / DAY_MS) + 1,
      crewSize: shift.crewSize,
      optional,
      adjusted,
      skipped: false,
      byo: false,
      customLabel: null,
    });
  };

  for (let dayWall = firstDay; dayWall <= lastDay; dayWall += DAY_MS) {
    for (const type of STANDARD_MEAL_TYPES) {
      const pref = prefs.meals?.[type];
      const mode: MealSlotMode = pref?.mode ?? "auto";
      if (mode === "off") continue;
      const w = resolveMealWindow(type, pref);
      const defaultMs = at(dayWall, w.defaultTime);
      const windowEndMs = at(dayWall, w.end);

      let plannedMs: number;
      let adjusted = false;
      if (defaultMs > usableEnd) continue;
      if (defaultMs < usableStart) {
        if (usableStart > windowEndMs - MIN_MEAL_WINDOW_MINUTES * MINUTE_MS) continue;
        if (usableStart > usableEnd) continue;
        plannedMs = usableStart;
        adjusted = true;
      } else {
        plannedMs = defaultMs;
      }

      const optional =
        mode === "optional" ? true : mode === "required" ? false : type === "late_night" || adjusted;
      push(dayWall, type, plannedMs, optional, adjusted, MEAL_TYPE_LABELS[type]);
    }

    for (const custom of prefs.custom ?? []) {
      const raw = parseLocalTime(custom.time);
      if (raw == null) continue;
      const minutes = raw < MEAL_DAY_ROLLOVER_MINUTES ? raw + DAY_MINUTES : raw;
      const plannedMs = at(dayWall, minutes);
      if (plannedMs < usableStart || plannedMs > usableEnd) continue;
      push(dayWall, "custom", plannedMs, custom.optional ?? false, false, custom.label.trim() || MEAL_TYPE_LABELS.custom, custom.id);
    }
  }

  return slots.sort(
    (a, b) => a.plannedTime.localeCompare(b.plannedTime) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type],
  );
}

/** Convenience for a generated shift. Cancelled shifts produce no slots. */
export function mealSlotsForShift(shift: ShiftInstance, prefs?: MealSlotPreferences): MealSlot[] {
  if (shift.status === "cancelled") return [];
  return generateMealSlots(
    { start: shift.start, end: shift.end, timezone: shift.timezone, crewSize: shift.crewSize, shiftKey: shift.key },
    prefs,
  );
}
