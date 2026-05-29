/**
 * Generation curation — delegates to shared recipe trust pipeline.
 */

import type { GenerateResponse } from "@shared/schema.js";
import type { ValidationResult } from "./validateRecipe.js";
import { runRecipeQualityGate, type RecipeQualityResult } from "../shared/recipe-quality-gate.js";
import { detectMealIdentity } from "../shared/meal-semantics.js";
import { processRecipeTrustPipeline } from "./recipe-trust-pipeline.js";

export interface CurationScores {
  title: number;
  crave: number;
  quality: number;
  ingredientCoherence: number;
  realism: number;
  combined: number;
}

export interface CurationResult {
  recipe: GenerateResponse;
  sendable: boolean;
  scores: CurationScores;
  reasons: string[];
  titleQuality: { pass: boolean; score: number; issues: string[] };
  qualityGate: RecipeQualityResult;
}

export interface CurationContext {
  mealFormat: string;
  protein: string;
  importedSource: boolean;
}

/** Map trust pipeline output to legacy curation result shape (routes compatibility). */
export function curateRecipeForClient(
  recipe: GenerateResponse,
  validation: ValidationResult,
  ctx: CurationContext,
): CurationResult {
  const trust = processRecipeTrustPipeline(recipe, validation, {
    mealFormat: ctx.mealFormat,
    protein: ctx.protein,
    importedSource: ctx.importedSource,
    skipRepair: ctx.importedSource,
  });

  const fmt = ctx.mealFormat || trust.recipe.meal_style || "bowl";
  const qualityGate = runRecipeQualityGate(trust.recipe, {
    mealFormat: fmt,
    identity: detectMealIdentity(trust.recipe.title || "", fmt),
    protein: ctx.protein || trust.recipe.chosen_protein,
    crewSize: 6,
    importedSource: ctx.importedSource,
  });

  const sendable =
    ctx.importedSource && trust.quality.composite >= 45
      ? true
      : trust.sendable;

  return {
    recipe: trust.recipe,
    sendable,
    scores: {
      title: trust.quality.titleQuality,
      crave: trust.quality.titleQuality,
      quality: trust.quality.firehallSuitability,
      ingredientCoherence: trust.quality.ingredientCoherence,
      realism: trust.quality.mealRealism,
      combined: trust.quality.composite,
    },
    reasons: trust.rejectReasons,
    titleQuality: {
      pass: trust.quality.pass,
      score: trust.quality.titleQuality,
      issues: trust.quality.blockingIssues,
    },
    qualityGate,
  };
}

export { verifyHeroForTitle } from "./generation-curation-hero.js";
