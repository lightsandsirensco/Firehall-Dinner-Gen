import { DEFAULT_SHIFT_NAMES, HALL_SHIFT_KEYS, type HallShiftKey } from "../hall-identity/shifts.js";
import type { HallActivityEvent } from "../hall-analytics/types.js";

function inferShiftKey(shiftLabel: string | null | undefined): HallShiftKey | null {
  const normalized = shiftLabel?.trim().toLowerCase() ?? "";
  if (!normalized) return null;

  for (const key of HALL_SHIFT_KEYS) {
    const defaultName = DEFAULT_SHIFT_NAMES[key].toLowerCase();
    if (normalized === defaultName || normalized.startsWith(`${key} `) || normalized.startsWith(`${key}-`)) {
      return key;
    }
  }
  return null;
}
import type { HallLeaderboardPayload, HallLeaderboardRankedRow } from "./types.js";

function isThisMonth(at: string, now: Date): boolean {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return false;
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function monthLabel(now: Date): string {
  return now.toLocaleDateString("en-US", { month: "long" });
}

function withRanks(
  rows: Array<Omit<HallLeaderboardRankedRow, "rank">>,
): HallLeaderboardRankedRow[] {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function rankMealsThisMonth(events: HallActivityEvent[], now: Date): HallLeaderboardRankedRow[] {
  const map = new Map<string, { label: string; count: number; recipe_slug: string | null }>();
  for (const event of events) {
    if (event.event_type !== "meal_cooked" || !isThisMonth(event.occurred_at, now)) continue;
    const key = event.recipe_slug?.trim() || event.title.trim().toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, {
        label: event.title.trim() || key,
        count: 1,
        recipe_slug: event.recipe_slug,
      });
    }
  }
  return withRanks(
    [...map.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 8)
      .map((row) => ({
        label: row.label,
        count: row.count,
        recipe_slug: row.recipe_slug,
      })),
  );
}

function rankShiftsByEventType(
  events: HallActivityEvent[],
  eventType: HallActivityEvent["event_type"],
  now: Date,
): HallLeaderboardRankedRow[] {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== eventType || !isThisMonth(event.occurred_at, now)) continue;
    const shift = event.shift_label?.trim();
    if (!shift) continue;
    map.set(shift, (map.get(shift) ?? 0) + 1);
  }
  return withRanks(
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 6)
      .map(([shift, count]) => ({
        label: shift,
        count,
        shift_label: shift,
        shift_key: inferShiftKey(shift),
      })),
  );
}

export function buildHallLeaderboard(
  events: HallActivityEvent[],
  now = new Date(),
): HallLeaderboardPayload {
  const most_cooked_meals = rankMealsThisMonth(events, now);
  const most_active_shifts = rankShiftsByEventType(events, "meal_cooked", now);
  const wheel_champions = rankShiftsByEventType(events, "wheel_spin", now);
  const top_voted_shifts = rankShiftsByEventType(events, "vote_created", now);

  return {
    month_label: monthLabel(now),
    most_cooked_meals,
    most_active_shifts,
    wheel_champion: wheel_champions[0] ?? null,
    wheel_champions,
    top_voted_shifts,
  };
}
