import type { HallHistoryEntry } from "@shared/hall-profile/types";
import { getHallHistoryEntries } from "@/lib/hall-history-store";

/** Recent recipes from meal history (generated, cooked, wheel) — deduped by slug/path. */
export function getRecentlyViewed(limit = 5): HallHistoryEntry[] {
  const entries = getHallHistoryEntries();
  const seen = new Set<string>();
  const result: HallHistoryEntry[] = [];

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const entry = entries[i];
    if (!entry.recipeSlug && !entry.recipePath) continue;
    const key = entry.recipeSlug ?? entry.recipePath ?? entry.id;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
    if (result.length >= limit) break;
  }

  return result;
}
