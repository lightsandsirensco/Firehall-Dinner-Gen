/**
 * Performance Meals 50 — public manifest (no source URLs).
 */

import { PERFORMANCE_SOURCE_SELECTED } from "./source-registry.js";
import type { PerformanceManifestEntry } from "./types.js";
import { PERFORMANCE_MEAL_COUNT } from "./types.js";

/** Map selected source → manifest skeleton (details in adapted packs) */
export function buildManifestFromSource(
  slug: string,
  sourceId: string,
  title: string,
  subtitle: string,
  protein: string,
  cuisine: string,
  mealFormat: string,
  hook: string,
  prep: number,
  cook: number,
  difficulty: PerformanceManifestEntry["difficulty"] = "medium",
): PerformanceManifestEntry {
  return {
    slug,
    title,
    subtitle,
    protein,
    cuisine,
    mealFormat,
    explorePools: ["healthy", "performance", "performance_meals_50"],
    hookLine: hook,
    prepMinutes: prep,
    cookMinutes: cook,
    difficulty,
    crewSizeDefault: 8,
    sourceId,
    featured: true,
  };
}

export const PERFORMANCE_MEAL_SLUGS = PERFORMANCE_SOURCE_SELECTED.map((s) => s.firehallSlug!);

export function assertPerformanceManifestCount(): void {
  if (PERFORMANCE_MEAL_SLUGS.length !== PERFORMANCE_MEAL_COUNT) {
    throw new Error(`Expected ${PERFORMANCE_MEAL_COUNT} performance meals, got ${PERFORMANCE_MEAL_SLUGS.length}`);
  }
}
