import type { HallHistoryEntry } from "../hall-profile/types.js";
import type { HallActivityEvent } from "../hall-analytics/types.js";

export function historyEntryToActivityEvent(entry: HallHistoryEntry): HallActivityEvent | null {
  const base = {
    activity_id: entry.id,
    hall_id: "",
    user_id: null,
    title: entry.title,
    recipe_slug: entry.recipeSlug ?? null,
    cuisine: null,
    category: null,
    shift_label: entry.shiftLabel ?? null,
    occurred_at: entry.at,
  };

  switch (entry.type) {
    case "meal_cooked":
      return {
        ...base,
        event_type: "meal_cooked",
        external_id: entry.id,
      };
    case "hall_vote":
      return {
        ...base,
        event_type: "vote_created",
        external_id: entry.meta?.voteId ?? entry.id,
      };
    case "wheel_result":
      return {
        ...base,
        event_type: "wheel_spin",
        external_id: entry.id,
      };
    default:
      return null;
  }
}

export function historyToActivityEvents(entries: HallHistoryEntry[]): HallActivityEvent[] {
  return entries
    .map(historyEntryToActivityEvent)
    .filter((event): event is HallActivityEvent => event != null);
}

export function mergeActivityEvents(
  local: HallActivityEvent[],
  server: HallActivityEvent[],
): HallActivityEvent[] {
  const seen = new Set<string>();
  const merged: HallActivityEvent[] = [];

  for (const event of [...server, ...local]) {
    const key = `${event.event_type}|${event.external_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(event);
  }
  return merged;
}
