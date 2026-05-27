/**
 * Recipe quality scoring foundation — interfaces + stubs wiring existing gates.
 * No new AI logic; architecture-ready for recommendations and publish thresholds.
 */

import { scoreRecipeTitle } from "../recipe-title-quality.js";
import { scoreImageTitleAlignment } from "../meal-image-title-match.js";
import { titleMatchesIngredients } from "../meal-format-contract.js";
import { runRecipeQualityGate } from "../recipe-quality-gate.js";
import { detectMealIdentity } from "../meal-semantics.js";
import type {
  FirehallRecipe,
  FirehallRecipeDraft,
  RecipeQualityScoreInput,
  RecipeQualityScoreResult,
} from "./types.js";

const PUBLISH_THRESHOLD = 58;

function draftTitle(recipe: FirehallRecipe | FirehallRecipeDraft): string {
  return recipe.identity?.title || (recipe as { title?: string }).title || "";
}

function draftIngredients(recipe: FirehallRecipe | FirehallRecipeDraft) {
  if (recipe.ingredients?.length) {
    return recipe.ingredients.map((i) => ({
      item: i.name,
      notes: i.originalText,
    }));
  }
  return [];
}

export function scoreTitleQualityForRecipe(
  recipe: FirehallRecipe | FirehallRecipeDraft,
): { score: number; pass: boolean; issues: string[] } {
  const title = draftTitle(recipe);
  const mealType = recipe.classification?.mealType;
  const result = scoreRecipeTitle(title, {
    mealFormat: mealType,
    protein: recipe.classification?.protein,
    ingredients: draftIngredients(recipe),
    cuisine: recipe.classification?.cuisine,
  });
  return {
    score: result.score,
    pass: result.pass,
    issues: result.issues,
  };
}

export function scoreIngredientCoherenceForRecipe(
  recipe: FirehallRecipe | FirehallRecipeDraft,
): { score: number; pass: boolean; reason?: string } {
  const title = draftTitle(recipe);
  const ings = draftIngredients(recipe);
  const check = titleMatchesIngredients(title, ings, recipe.classification?.mealType);
  return { score: check.ok ? 90 : 42, pass: check.ok, reason: check.reason };
}

export function scoreImageMatchForRecipe(
  recipe: FirehallRecipe | FirehallRecipeDraft,
  heroImagePath?: string,
): { score: number; pass: boolean; conflicts: string[] } {
  const title = draftTitle(recipe);
  const mealType = recipe.classification?.mealType;
  const path = heroImagePath || recipe.media?.heroImage;
  const match = scoreImageTitleAlignment(title, mealType, {
    heroSource: path ? "generated" : undefined,
  });
  return {
    score: match.score,
    pass: match.pass,
    conflicts: match.conflicts,
  };
}

export function scoreRecipeCompleteness(
  recipe: FirehallRecipe | FirehallRecipeDraft,
): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 100;
  if (!draftTitle(recipe)) {
    missing.push("title");
    score -= 40;
  }
  if (!recipe.ingredients?.length) {
    missing.push("ingredients");
    score -= 30;
  }
  if (!recipe.instructions?.length) {
    missing.push("instructions");
    score -= 25;
  }
  if (!recipe.timing?.totalMinutes) {
    missing.push("timing");
    score -= 10;
  }
  if (!recipe.media?.heroImage) {
    missing.push("hero_image");
    score -= 8;
  }
  return { score: Math.max(0, score), missing };
}

export function scoreRecipeRealism(
  recipe: FirehallRecipe | FirehallRecipeDraft,
): { score: number; issues: string[] } {
  const title = draftTitle(recipe);
  const steps = (recipe.instructions || []).map((s) => ({
    heading: s.title,
    body: s.instruction,
  }));
  const ingredients = draftIngredients(recipe);
  const gate = runRecipeQualityGate(
    {
      title: title || "Firehall Crew Dinner",
      meal_style: recipe.classification?.mealType,
      chosen_protein: recipe.classification?.protein || "any",
      ingredients: ingredients.map((i) => ({
        item: i.item || "",
        amount: "",
        notes: i.notes || "",
      })),
      steps,
      timing: {
        prep_minutes: recipe.timing?.prepMinutes || 0,
        cook_minutes: recipe.timing?.cookMinutes || 0,
        total_minutes: recipe.timing?.totalMinutes || 0,
      },
      macros_per_serving: {
        calories: recipe.nutrition?.caloriesEstimate || 0,
        protein_g: recipe.nutrition?.proteinEstimate || 0,
        carbs_g: recipe.nutrition?.carbEstimate || 0,
        fat_g: recipe.nutrition?.fatEstimate || 0,
      },
      protein_safety: [],
      cleanup_tip: "",
      why_it_fits_tonight: recipe.identity?.shortDescription || "",
      template_id: 0,
      primary_protein_source: recipe.classification?.protein || "any",
    },
    {
      mealFormat: recipe.classification?.mealType,
      identity: detectMealIdentity(
        title || "Firehall Crew Dinner",
        recipe.classification?.mealType || "bowl",
      ),
      protein: recipe.classification?.protein,
      importedSource: recipe.source?.sourceType !== "generated",
    },
  );
  return { score: gate.score, issues: gate.issues };
}

/** Composite quality score — foundation for publish / explore ranking. */
export function scoreFirehallRecipeQuality(
  input: RecipeQualityScoreInput,
): RecipeQualityScoreResult {
  const { recipe, heroImagePath } = input;
  const titleQ = scoreTitleQualityForRecipe(recipe);
  const ingQ = scoreIngredientCoherenceForRecipe(recipe);
  const imgQ = scoreImageMatchForRecipe(recipe, heroImagePath);
  const completeQ = scoreRecipeCompleteness(recipe);
  const realismQ = scoreRecipeRealism(recipe);

  const composite = Math.round(
    titleQ.score * 0.25 +
      ingQ.score * 0.2 +
      imgQ.score * 0.15 +
      completeQ.score * 0.2 +
      realismQ.score * 0.2,
  );

  const issues: string[] = [];
  const messages: string[] = [];
  if (!titleQ.pass) issues.push(...titleQ.issues.map((i) => `title:${i}`));
  if (!ingQ.pass) issues.push(ingQ.reason || "ingredient_incoherence");
  if (!imgQ.pass) issues.push(...imgQ.conflicts);
  if (completeQ.missing.length) issues.push(`missing:${completeQ.missing.join(",")}`);
  if (realismQ.issues.length) messages.push(...realismQ.issues.slice(0, 4));

  const pass = composite >= PUBLISH_THRESHOLD && titleQ.pass && ingQ.pass && completeQ.score >= 55;

  return {
    titleQuality: titleQ.score,
    ingredientCoherence: ingQ.score,
    imageMatchConfidence: imgQ.score,
    completeness: completeQ.score,
    realism: realismQ.score,
    composite,
    pass,
    issues,
    messages,
  };
}
