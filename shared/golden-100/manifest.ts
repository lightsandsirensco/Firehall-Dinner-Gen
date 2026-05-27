import { GOLDEN_100_RECIPES, GOLDEN_100_TARGET_BY_CATEGORY } from "./recipes-data.js";
import type { MasterCategoryId } from "../categories/constants.js";
import type { GoldenRecipeDefinition } from "./types.js";
import { GOLDEN_SET_TAG, GOLDEN_SET_VERSION } from "./types.js";

export { GOLDEN_100_RECIPES, GOLDEN_100_TARGET_BY_CATEGORY, GOLDEN_SET_TAG, GOLDEN_SET_VERSION };

export function getGoldenRecipeBySlug(slug: string): GoldenRecipeDefinition | undefined {
  return GOLDEN_100_RECIPES.find((r) => r.slug === slug);
}

export function goldenRecipesByCategory(): Record<MasterCategoryId, GoldenRecipeDefinition[]> {
  const out = {} as Record<MasterCategoryId, GoldenRecipeDefinition[]>;
  for (const r of GOLDEN_100_RECIPES) {
    if (!out[r.masterCategoryId]) out[r.masterCategoryId] = [];
    out[r.masterCategoryId].push(r);
  }
  return out;
}

export function goldenManifestSummary() {
  return {
    version: GOLDEN_SET_VERSION,
    tag: GOLDEN_SET_TAG,
    total: GOLDEN_100_RECIPES.length,
    targets: GOLDEN_100_TARGET_BY_CATEGORY,
    byCategory: Object.fromEntries(
      Object.entries(goldenRecipesByCategory()).map(([k, v]) => [k, v.length]),
    ),
  };
}
