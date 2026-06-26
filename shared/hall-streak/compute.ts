import type { HallHistoryEntry, HallHistoryEntryType } from "../hall-profile/types.js";
import { shiftLabelMatches } from "../shift-dashboard/history.js";
import { computeShiftStreak, daysBetweenLocalKeys, localDateKey } from "../wheel-streak/streak-math.js";
import type { HallStreakCounts, HallStreakDisplayRow, HallStreakKind, HallStreaksSnapshot } from "./types.js";

function historyTypeForKind(kind: HallStreakKind): HallHistoryEntryType | null {
  switch (kind) {
    case "meals":
      return "meal_cooked";
    case "votes":
      return "hall_vote";
    case "wheel":
      return "wheel_result";
    default:
      return null;
  }
}

function activityDays(
  entries: HallHistoryEntry[],
  kind: HallStreakKind,
  shiftLabel?: string | null,
): string[] {
  const type = historyTypeForKind(kind);
  if (!type) return [];
  return [
    ...new Set(
      entries
        .filter((entry) => {
          if (entry.type !== type) return false;
          if (shiftLabel && !shiftLabelMatches(entry, shiftLabel)) return false;
          return true;
        })
        .map((entry) => localDateKey(new Date(entry.at)))
        .filter((day) => day.length === 10),
    ),
  ];
}

export function computeLongestShiftStreak(days: Iterable<string>): number {
  const dayKeys = [...new Set(days)].sort();
  if (dayKeys.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < dayKeys.length; i += 1) {
    if (daysBetweenLocalKeys(dayKeys[i - 1]!, dayKeys[i]!) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

export function computeStreakCounts(
  entries: HallHistoryEntry[],
  kind: HallStreakKind,
  shiftLabel?: string | null,
): HallStreakCounts {
  const days = activityDays(entries, kind, shiftLabel);
  const daySet = new Set(days);
  return {
    current: computeShiftStreak(daySet),
    longest: Math.max(computeLongestShiftStreak(days), computeShiftStreak(daySet)),
  };
}

export function buildHallStreaksSnapshot(input: {
  entries: HallHistoryEntry[];
  wheelCurrent: number;
  wheelLongest: number;
  shiftLabel?: string | null;
}): HallStreaksSnapshot {
  const shiftLabel = input.shiftLabel?.trim() || null;
  return {
    hall: {
      meals: computeStreakCounts(input.entries, "meals"),
      votes: computeStreakCounts(input.entries, "votes"),
      wheel: {
        current: input.wheelCurrent,
        longest: Math.max(input.wheelLongest, input.wheelCurrent),
      },
    },
    shift: shiftLabel
      ? {
          label: shiftLabel,
          meals: computeStreakCounts(input.entries, "meals", shiftLabel),
          votes: computeStreakCounts(input.entries, "votes", shiftLabel),
          wheel: computeStreakCounts(input.entries, "wheel", shiftLabel),
        }
      : null,
  };
}

export function hallStreakDisplayRows(
  snapshot: HallStreaksSnapshot,
  options?: { includeShift?: boolean },
): HallStreakDisplayRow[] {
  const includeShift = options?.includeShift ?? true;
  const rows: HallStreakDisplayRow[] = [
    {
      id: "hall-meals",
      scopeLabel: "Hall",
      kind: "meals",
      current: snapshot.hall.meals.current,
      longest: snapshot.hall.meals.longest,
      featured: snapshot.hall.meals.current >= 2,
    },
    {
      id: "hall-votes",
      scopeLabel: "Hall",
      kind: "votes",
      current: snapshot.hall.votes.current,
      longest: snapshot.hall.votes.longest,
    },
    {
      id: "hall-wheel",
      scopeLabel: "Hall",
      kind: "wheel",
      current: snapshot.hall.wheel.current,
      longest: snapshot.hall.wheel.longest,
    },
  ];

  if (includeShift && snapshot.shift) {
    rows.push(
      {
        id: "shift-meals",
        scopeLabel: snapshot.shift.label,
        kind: "meals",
        current: snapshot.shift.meals.current,
        longest: snapshot.shift.meals.longest,
        featured: snapshot.shift.meals.current >= 2,
      },
      {
        id: "shift-votes",
        scopeLabel: snapshot.shift.label,
        kind: "votes",
        current: snapshot.shift.votes.current,
        longest: snapshot.shift.votes.longest,
      },
      {
        id: "shift-wheel",
        scopeLabel: snapshot.shift.label,
        kind: "wheel",
        current: snapshot.shift.wheel.current,
        longest: snapshot.shift.wheel.longest,
      },
    );
  }

  return rows;
}

export function shiftsInARowLabel(count: number): string {
  if (count === 0) return "No streak yet";
  if (count === 1) return "1 shift in a row";
  return `${count} shifts in a row`;
}
