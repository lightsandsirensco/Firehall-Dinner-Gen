export const HALL_SHIFT_KEYS = ["a", "b", "c", "d"] as const;
export type HallShiftKey = (typeof HALL_SHIFT_KEYS)[number];

export const DEFAULT_SHIFT_NAMES: Record<HallShiftKey, string> = {
  a: "A Shift",
  b: "B Shift",
  c: "C Shift",
  d: "D Shift",
};

export const HALL_SHIFT_LABELS: Record<HallShiftKey, string> = {
  a: "A Shift",
  b: "B Shift",
  c: "C Shift",
  d: "D Shift",
};

export interface HallShiftInput {
  shift_key: HallShiftKey;
  name: string;
  enabled: boolean;
}

export function defaultHallShifts(): HallShiftInput[] {
  return HALL_SHIFT_KEYS.map((shift_key, sort_order) => ({
    shift_key,
    name: DEFAULT_SHIFT_NAMES[shift_key],
    enabled: true,
  }));
}

export function shiftNamesFromInputs(shifts: HallShiftInput[]): string[] {
  return shifts.filter((shift) => shift.enabled).map((shift) => shift.name.trim()).filter(Boolean);
}

export function normalizeShiftInputs(
  shifts?: HallShiftInput[] | null,
  legacyNames?: string[] | null,
): HallShiftInput[] {
  if (shifts?.length === 4) {
    return shifts.map((shift) => ({
      shift_key: shift.shift_key,
      name: shift.name.trim() || DEFAULT_SHIFT_NAMES[shift.shift_key],
      enabled: shift.enabled,
    }));
  }

  const names = legacyNames?.map((name) => name.trim()).filter(Boolean) ?? [];
  if (names.length === 0) return defaultHallShifts();

  return HALL_SHIFT_KEYS.map((shift_key, index) => ({
    shift_key,
    name: names[index] ?? DEFAULT_SHIFT_NAMES[shift_key],
    enabled: index < names.length,
  }));
}
