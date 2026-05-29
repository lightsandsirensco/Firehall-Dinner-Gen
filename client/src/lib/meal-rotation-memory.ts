/**
 * Client-side recent meal memory — reduces repeat picks between sessions.
 */

const STORAGE_KEY = "firehall_recent_meal_slugs_v1";
const MAX_SLUGS = 24;

export function getRecentMealSlugs(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === "string").slice(-MAX_SLUGS);
  } catch {
    return [];
  }
}

export function recordMealSlug(slug: string | undefined | null): void {
  if (!slug?.trim()) return;
  const key = slug.trim().toLowerCase();
  const prev = getRecentMealSlugs().filter((s) => s !== key);
  prev.push(key);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prev.slice(-MAX_SLUGS)));
  } catch {
    /* quota / private mode */
  }
}
