/**
 * Curated recipe totals — hall dinners + breakfast (client-safe constants).
 */
export const HALL_DINNER_CATALOG_COUNT = 198 as const;
export const BREAKFAST_CATALOG_COUNT = 42 as const;
/** Total Firehall-tested curated recipes (dinners + breakfast). */
export const CURATED_RECIPE_TOTAL = HALL_DINNER_CATALOG_COUNT + BREAKFAST_CATALOG_COUNT;
/** Approved Explore catalog (meals + smoothies). */
export const APPROVED_CATALOG_TOTAL = CURATED_RECIPE_TOTAL + 10;

/** Marketing floor for homepage copy when live count is verified. */
export const CURATED_RECIPE_MARKETING_FLOOR = 250 as const;

export function marketingRecipeCount(liveCount: number): number {
  return Math.max(liveCount, CURATED_RECIPE_MARKETING_FLOOR);
}

/** Display count with "+" suffix, e.g. "250+". */
export function formatMarketingRecipeCount(liveCount: number): string {
  return `${marketingRecipeCount(liveCount)}+`;
}

/** Hero/catalog headline, e.g. "250+ Firehall-Tested Recipes". */
export function marketingRecipeCountPhrase(liveCount: number): string {
  return `${formatMarketingRecipeCount(liveCount)} Firehall-Tested Recipes`;
}

/** Inline marketing copy, e.g. "250+ firefighter-tested recipes". */
export function marketingRecipeCountCopy(liveCount: number): string {
  return `${formatMarketingRecipeCount(liveCount)} firefighter-tested recipes`;
}
