import { previousLocalDateKey } from "../wheel-streak/streak-math.js";
import type { HallActivityEvent, HallAnalyticsPayload } from "./types.js";

function localDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function computeMealStreak(events: HallActivityEvent[]): number {
  const days = new Set(
    events.filter((e) => e.event_type === "meal_cooked").map((e) => localDateKey(e.occurred_at)),
  );
  if (days.size === 0) return 0;

  const sorted = [...days].sort((a, b) => b.localeCompare(a));
  let streak = 0;
  let cursor = sorted[0]!;
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousLocalDateKey(cursor);
  }
  return streak;
}

function rankMeals(events: HallActivityEvent[]): Array<{ label: string; count: number; recipe_slug: string | null }> {
  const map = new Map<string, { label: string; count: number; recipe_slug: string | null }>();
  for (const event of events) {
    if (event.event_type !== "meal_cooked") continue;
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
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function rankCuisines(events: HallActivityEvent[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const event of events) {
    if (event.event_type !== "meal_cooked") continue;
    const cuisine = event.cuisine?.trim() || event.category?.trim();
    if (!cuisine) continue;
    const label = cuisine.replace(/_/g, " ");
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function mostActiveShift(events: HallActivityEvent[]): string | null {
  const map = new Map<string, number>();
  for (const event of events) {
    const shift = event.shift_label?.trim();
    if (!shift) continue;
    map.set(shift, (map.get(shift) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [shift, count] of map.entries()) {
    if (count > bestCount) {
      best = shift;
      bestCount = count;
    }
  }
  return best;
}

export function buildHallAnalyticsPayload(
  hallId: string,
  events: HallActivityEvent[],
): HallAnalyticsPayload {
  const meals = rankMeals(events);
  const cuisines = rankCuisines(events);
  const mealStreak = computeMealStreak(events);

  return {
    hall_id: hallId,
    generated_at: new Date().toISOString(),
    metrics: {
      meals_cooked: events.filter((e) => e.event_type === "meal_cooked").length,
      votes_created: events.filter((e) => e.event_type === "vote_created").length,
      wheel_spins: events.filter((e) => e.event_type === "wheel_spin").length,
      shopping_lists: events.filter((e) => e.event_type === "shopping_list_completed").length,
      meal_streak: mealStreak,
      most_active_shift: mostActiveShift(events),
    },
    top_meals: meals.slice(0, 8).map((m) => ({
      label: m.label,
      count: m.count,
      recipe_slug: m.recipe_slug,
    })),
    cards: {
      top_meal: meals[0]
        ? { label: meals[0].label, count: meals[0].count, recipe_slug: meals[0].recipe_slug }
        : null,
      top_cuisine: cuisines[0] ? { label: cuisines[0].label, count: cuisines[0].count } : null,
      most_cooked_meal: meals[0]
        ? { label: meals[0].label, count: meals[0].count, recipe_slug: meals[0].recipe_slug }
        : null,
      longest_streak: mealStreak,
    },
  };
}
