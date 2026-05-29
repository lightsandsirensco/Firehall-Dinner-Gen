import type { FilterState } from "@/components/filter-panel";

function timeChipLabel(timeAvailable: string): string {
  switch (timeAvailable) {
    case "15-25":
    case "20-30":
      return "~25 min";
    case "25-40":
    case "30-45":
      return "~35 min";
    case "45-60":
    case "60-90":
      return "45+ min";
    default:
      return "~35 min";
  }
}

import { CTA, GENERATOR } from "@/lib/brand-copy";

export const DIFFERENT_MEAL_LABEL = CTA.tryAnother;
export const DIFFERENT_MEAL_LOADING = GENERATOR.loadingAlt;
export const INITIAL_MEAL_LOADING = GENERATOR.loading;
export const INITIAL_MEAL_LABEL = CTA.pickDinner;
export const ONE_TAP_MEAL_LABEL = CTA.pickDinner;

export function crewLabel(crewSize: number): string {
  return crewSize >= 10 ? "10+" : String(crewSize);
}

/** Outcome line under primary CTAs — e.g. "Dinner for 6 · ~35 min" */
export function formatDinnerOutcomeLine(filters: FilterState, includeProtein = true): string {
  const protein =
    filters.protein === "any"
      ? "Surprise Me"
      : filters.protein.charAt(0).toUpperCase() + filters.protein.slice(1);
  const base = `Dinner for ${crewLabel(filters.crew_size)} · ${timeChipLabel(filters.time_available)}`;
  return includeProtein ? `${base} · ${protein}` : base;
}

/** Supporting copy under the Different Meal button */
export function formatDifferentMealSubcopy(filters: FilterState): string {
  return `${formatDinnerOutcomeLine(filters, false)}`;
}

/** Short tag for results / hall context */
export function formatTonightAtHallLine(): string {
  return "On the board";
}
