/**
 * Firehall Meals — canonical crew scaling configuration.
 * Recipes are stored at CANONICAL_BASE_SERVINGS; UI scales dynamically.
 */

import { FIREHALL_CREW_SCALE_SIZES } from "../recipe-sourcing-policy.js";

export const CANONICAL_BASE_SERVINGS = 8;

/** Default selected crew size on recipe pages. */
export const DEFAULT_CREW_SIZE = 8;

/** Crew size picker options (no duplicate recipe variants). */
export const CREW_SIZE_OPTIONS = FIREHALL_CREW_SCALE_SIZES;

export type CrewSizeOption = (typeof CREW_SIZE_OPTIONS)[number];

export function isCrewSizeOption(n: number): n is CrewSizeOption {
  return (CREW_SIZE_OPTIONS as readonly number[]).includes(n);
}

/** Crew size when nothing has been saved anywhere — matches the generator's default crew. */
export const FALLBACK_PREFERRED_CREW_SIZE = 6;

const validCrew = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 2 && n <= 20;

/**
 * The one answer to "how many are we cooking for?" before a meal-specific
 * crew is set — same precedence as the generator's crew filter: the crew
 * last picked in the generator, then the account profile, then this device's
 * saved crew. Recipe pages, Explore, and Shift Planner setup all start here.
 */
export function resolvePreferredCrewSize(input: {
  generatorCrewSize?: number | null;
  accountCrewSize?: number | null;
  deviceCrewSize?: number | null;
}): number {
  if (validCrew(input.generatorCrewSize)) return Math.round(input.generatorCrewSize);
  if (validCrew(input.accountCrewSize)) return Math.round(input.accountCrewSize);
  if (validCrew(input.deviceCrewSize)) return Math.round(input.deviceCrewSize);
  return FALLBACK_PREFERRED_CREW_SIZE;
}

/** Picker options with the crew's exact size included ("7" for a crew of 7). */
export function crewSizeOptionsWith(crewSize: number): number[] {
  const options = new Set<number>(CREW_SIZE_OPTIONS);
  if (validCrew(crewSize)) options.add(Math.round(crewSize));
  return [...options].sort((a, b) => a - b);
}

/** Resolve stored base servings from a catalog page (before/after normalization). */
export function getRecipeBaseServings(page: {
  baseServings?: number;
  crewSize?: number;
}): number {
  return page.baseServings ?? page.crewSize ?? CANONICAL_BASE_SERVINGS;
}
