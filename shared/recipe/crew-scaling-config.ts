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

/** Resolve stored base servings from a catalog page (before/after normalization). */
export function getRecipeBaseServings(page: {
  baseServings?: number;
  crewSize?: number;
}): number {
  return page.baseServings ?? page.crewSize ?? CANONICAL_BASE_SERVINGS;
}
