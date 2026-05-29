/**
 * Firehall BBQ 30 — original crew-scale BBQ recipes.
 *
 * These are fully authored Firehall Meals recipes (not scraped/copied).
 */

import type { MasterCategoryId } from "../categories/constants.js";
import type {
  GoldenRecipePageIngredient,
  GoldenRecipePageStep,
} from "../golden-100/recipe-page-schema.js";

export const BBQ_30_SET_TAG = "firehall_bbq_30" as const;
export const BBQ_30_SET_VERSION = 1 as const;
export const BBQ_30_RECIPE_COUNT = 30 as const;

export type BbqDifficulty = "easy" | "medium" | "hard";

export interface BbqImageMeta {
  recipeSlug: string;
  protein: string[];
  cuisineStyle: string[];
  servingStyle: string[];
  carb: string[];
  vegetables: string[];
  sauce: string[];
  cookingMethod: string[];
  visualKeywords: string[];
  imagePrompt: string;
  imagePath: string;
}

export interface BbqManifestEntry {
  slug: string;
  title: string;
  subtitle: string;
  protein: string;
  cuisine: string;
  mealFormat: string;
  explorePools: string[];
  hookLine: string;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: BbqDifficulty;
  crewSizeDefault: 10;
  featured?: boolean;
}

export interface BbqRecipe {
  manifest: BbqManifestEntry;
  description: string;
  whyCrewsLikeIt: string;
  stationTimingNotes: string;
  allergyNotes: string;
  equipment: string[];
  ingredients: GoldenRecipePageIngredient[];
  steps: GoldenRecipePageStep[];
  proTips: string[];
  tonightSpread: string[];
  leftovers: string[];
  substitutions?: string[];
  spiceLevel?: "mild" | "medium" | "hot";
  cleanupDifficulty?: "easy" | "medium" | "heavy";
  searchTerms: string[];
  relatedSlugs?: string[];
}

/** Category used for BBQ set pages. */
export const BBQ_30_PAGE_CATEGORY: MasterCategoryId = "bbq_grill_nights";

