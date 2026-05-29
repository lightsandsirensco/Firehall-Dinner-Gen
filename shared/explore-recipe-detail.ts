import type { ExploreHeldImageryLabel, ExploreImageryStatus } from "./explore-imagery-status.js";

/**
 * Canonical Explore full-recipe detail shape (API + client).
 * Server `ExploreRecipeDetailPayload` extends this with curation metadata.
 */

export interface ExploreRecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  original: string;
}

export interface ExploreRecipeStep {
  number: number;
  heading?: string;
  step: string;
}

export interface ExploreRecipeMacros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Full recipe detail for Explore detail page and `/api/explore/recipe/:id`. */
export interface ExploreRecipeDetail {
  id: number;
  title: string;
  image: string;
  imageAlt?: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  ingredients: ExploreRecipeIngredient[];
  steps: ExploreRecipeStep[];
  macros: ExploreRecipeMacros;
  /** Matches Explore card tier — soft-held uses branded placeholder hero */
  imageryStatus?: ExploreImageryStatus;
  heldImageryLabel?: ExploreHeldImageryLabel;
}

/** Alias used in product docs / older references */
export type RecipeDetail = ExploreRecipeDetail;
