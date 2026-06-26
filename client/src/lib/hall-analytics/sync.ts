import type { HallHistoryEntry } from "@shared/hall-profile/types";
import type { HallActivitySyncEntry } from "@shared/hall-analytics/types";
import { getHallHistoryEntries } from "@/lib/hall-history-store";
import { getWheelStreakSnapshot } from "@/lib/wheel-streak-store";

function mapHistoryEntry(entry: HallHistoryEntry): HallActivitySyncEntry | null {
  switch (entry.type) {
    case "meal_cooked":
      return {
        external_id: entry.id,
        event_type: "meal_cooked",
        title: entry.title,
        recipe_slug: entry.recipeSlug,
        shift_label: entry.shiftLabel,
        occurred_at: entry.at,
      };
    case "hall_vote":
      return {
        external_id: entry.meta?.voteId ?? entry.id,
        event_type: "vote_created",
        title: entry.title,
        shift_label: entry.shiftLabel,
        occurred_at: entry.at,
      };
    case "wheel_result":
      return {
        external_id: entry.id,
        event_type: "wheel_spin",
        title: entry.title,
        recipe_slug: entry.recipeSlug,
        shift_label: entry.shiftLabel,
        occurred_at: entry.at,
      };
    default:
      return null;
  }
}

export function buildHallAnalyticsSyncPayload(): {
  entries: HallActivitySyncEntry[];
  wheel_spin_days: string[];
} {
  const entries = getHallHistoryEntries()
    .map(mapHistoryEntry)
    .filter((entry): entry is HallActivitySyncEntry => entry != null);

  const streak = getWheelStreakSnapshot();
  return {
    entries,
    wheel_spin_days: streak.spinDays,
  };
}
