/**
 * Canonical Firehall recipe — auxiliary types (parse results, quality scoring).
 */

import type { FirehallRecipe } from "./schema.js";

export type {
  FirehallRecipe,
  RecipeIdentity,
  RecipeClassification,
  RecipeTiming,
  RecipeServings,
  RecipeIngredient,
  RecipeInstruction,
  RecipeShopping,
  RecipeMedia,
  RecipeFirehallMeta,
  RecipeNutrition,
  RecipeSource,
  RecipeSystem,
} from "./schema.js";

/** Partial input before normalization (ingest, AI, legacy adapters). */
export type FirehallRecipeDraft = Partial<FirehallRecipe> & {
  title?: string;
  ingredients?: Array<Partial<FirehallRecipe["ingredients"][number]>>;
  instructions?: Array<Partial<FirehallRecipe["instructions"][number]>>;
};

export interface RecipeParseSuccess {
  ok: true;
  data: FirehallRecipe;
  warnings: string[];
}

export interface RecipeParseFailure {
  ok: false;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

export type RecipeParseResult = RecipeParseSuccess | RecipeParseFailure;

/** Quality scoring bundle — architecture for recommendations / gating. */
export interface RecipeQualityDimensions {
  titleQuality: number;
  ingredientCoherence: number;
  imageMatchConfidence: number;
  completeness: number;
  realism: number;
  composite: number;
}

export interface RecipeQualityScoreInput {
  recipe: FirehallRecipe | FirehallRecipeDraft;
  heroImagePath?: string;
}

export interface RecipeQualityScoreResult extends RecipeQualityDimensions {
  pass: boolean;
  issues: string[];
  messages: string[];
}
