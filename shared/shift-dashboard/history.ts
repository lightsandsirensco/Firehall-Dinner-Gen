import type { HallHistoryEntry, HallHistoryEntryType } from "../hall-profile/types.js";
import { daysBetweenLocalKeys, localDateKey } from "../wheel-streak/streak-math.js";

export function shiftLabelMatches(entry: HallHistoryEntry, shiftName: string): boolean {
  const label = entry.shiftLabel?.trim().toLowerCase();
  const target = shiftName.trim().toLowerCase();
  if (!label || !target) return false;
  return label === target;
}

export function filterHistoryForShift(
  entries: HallHistoryEntry[],
  shiftName: string,
): HallHistoryEntry[] {
  return entries.filter((entry) => shiftLabelMatches(entry, shiftName));
}

export function filterShiftHistoryByType(
  entries: HallHistoryEntry[],
  shiftName: string,
  type: HallHistoryEntryType,
): HallHistoryEntry[] {
  return filterHistoryForShift(entries, shiftName).filter((entry) => entry.type === type);
}

function isThisMonth(at: string): boolean {
  const cooked = new Date(at);
  if (Number.isNaN(cooked.getTime())) return false;
  const now = new Date();
  return cooked.getMonth() === now.getMonth() && cooked.getFullYear() === now.getFullYear();
}

export function countShiftMealsThisMonth(entries: HallHistoryEntry[], shiftName: string): number {
  return filterShiftHistoryByType(entries, shiftName, "meal_cooked").filter((entry) =>
    isThisMonth(entry.at),
  ).length;
}

export function countShiftVotesThisMonth(entries: HallHistoryEntry[], shiftName: string): number {
  return filterShiftHistoryByType(entries, shiftName, "hall_vote").filter((entry) =>
    isThisMonth(entry.at),
  ).length;
}

export function computeLongestMealStreak(entries: HallHistoryEntry[], shiftName: string): number {
  const dayKeys = [
    ...new Set(
      filterShiftHistoryByType(entries, shiftName, "meal_cooked")
        .map((entry) => localDateKey(new Date(entry.at)))
        .filter((key) => key.length === 10),
    ),
  ].sort();

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

function slugKey(slug: string | undefined): string | undefined {
  const normalized = slug?.trim().toLowerCase();
  return normalized || undefined;
}

export function getShiftMostCookedMeals(
  entries: HallHistoryEntry[],
  shiftName: string,
  limit = 1,
): Array<{
  slug?: string;
  title: string;
  recipePath?: string;
  cookCount: number;
  lastCookedAt: string;
}> {
  const counts = new Map<
    string,
    { slug?: string; title: string; recipePath?: string; count: number; lastAt: string }
  >();

  for (const entry of filterShiftHistoryByType(entries, shiftName, "meal_cooked")) {
    const key = slugKey(entry.recipeSlug) ?? entry.title.trim().toLowerCase();
    const prev = counts.get(key);
    if (!prev) {
      counts.set(key, {
        slug: entry.recipeSlug,
        title: entry.title,
        recipePath: entry.recipePath,
        count: 1,
        lastAt: entry.at,
      });
      continue;
    }
    prev.count += 1;
    if (entry.at > prev.lastAt) {
      prev.lastAt = entry.at;
      prev.title = entry.title;
      prev.recipePath = entry.recipePath;
      prev.slug = entry.recipeSlug;
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      recipePath: row.recipePath,
      cookCount: row.count,
      lastCookedAt: row.lastAt,
    }));
}
