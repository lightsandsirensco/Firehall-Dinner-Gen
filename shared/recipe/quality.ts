/**
 * Recipe trust quality scoring — title, coherence, image, instructions, hall fit.
 */

import type { GenerateResponse } from "../schema.js";
import { scoreRecipeTitle } from "../recipe-title-quality.js";
import { isRoboticTitle } from "../generation-reliability.js";
import { scoreImageTitleAlignment, heroPathConflictsTitle } from "../meal-image-title-match.js";
import { titleMatchesIngredients } from "../meal-format-contract.js";
import { runRecipeQualityGate } from "../recipe-quality-gate.js";
import { detectMealIdentity } from "../meal-semantics.js";
import { scoreHallRealism } from "../firehall-instruction-voice.js";

export const TRUST_QUALITY_THRESHOLD = 58;
export const TRUST_IMPORTED_THRESHOLD = 52;

export interface TitleQualityResult {
  score: number;
  craveScore: number;
  pass: boolean;
  issues: string[];
  badAi: boolean;
}

export interface RecipeTrustQualityReport {
  titleQuality: number;
  ingredientCoherence: number;
  imageMatchConfidence: number;
  instructionQuality: number;
  mealRealism: number;
  firehallSuitability: number;
  sideDishQuality: number;
  composite: number;
  pass: boolean;
  blockingIssues: string[];
}

export interface QualityContext {
  mealFormat?: string;
  protein?: string;
  heroImagePath?: string;
  importedSource?: boolean;
  crewSize?: number;
}

/** Title quality + bad AI detection. */
export function titleQualityScore(
  recipe: GenerateResponse,
  ctx: QualityContext = {},
): TitleQualityResult {
  const title = recipe.title || "";
  const result = scoreRecipeTitle(title, {
    mealFormat: ctx.mealFormat || recipe.meal_style,
    protein: ctx.protein || recipe.chosen_protein,
    ingredients: recipe.ingredients,
    cuisine: recipe.tags?.cuisine,
  });
  const badAi = detectBadAIGeneration(title, result);
  return {
    score: result.score,
    craveScore: result.craveScore,
    pass: result.pass && !badAi,
    issues: result.issues,
    badAi,
  };
}

export function detectBadAIGeneration(
  title: string,
  titleScore?: ReturnType<typeof scoreRecipeTitle>,
): boolean {
  if (isRoboticTitle(title)) return true;
  const q = titleScore || scoreRecipeTitle(title, {});
  return !q.pass || q.issues.length > 0;
}

/** Suggest a human editorial title for a legacy generate payload. */
export function resolveHumanRecipeTitle(
  recipe: GenerateResponse,
  ctx: QualityContext = {},
): string {
  const q = scoreRecipeTitle(recipe.title || "", {
    mealFormat: ctx.mealFormat || recipe.meal_style,
    protein: ctx.protein || recipe.chosen_protein,
    ingredients: recipe.ingredients,
    cuisine: recipe.tags?.cuisine,
  });
  if (q.suggestedTitle && !detectBadAIGeneration(q.suggestedTitle)) {
    return q.suggestedTitle;
  }
  return recipe.title || "Firehall Crew Dinner";
}

export function imageMatchConfidence(
  recipe: GenerateResponse,
  heroImagePath?: string,
): { score: number; pass: boolean; conflicts: string[] } {
  const path = heroImagePath;
  const title = recipe.title || "";
  const mealFormat = recipe.meal_style;

  if (path && heroPathConflictsTitle(path, title, mealFormat)) {
    return { score: 25, pass: false, conflicts: ["hero_path_conflict"] };
  }

  const match = scoreImageTitleAlignment(title, mealFormat, {
    heroSource: path ? "generated" : undefined,
  });
  return { score: match.score, pass: match.pass, conflicts: match.conflicts };
}

function scoreInstructionQuality(recipe: GenerateResponse): number {
  const steps = recipe.steps || [];
  if (steps.length < 2) return 20;
  let score = 70;
  for (const s of steps) {
    const body = (s.instruction || s.body || "").trim();
    const words = body.split(/\s+/).length;
    if (words < 15) score -= 8;
    if (/cook until done|serve and enjoy/i.test(body)) score -= 20;
    if (/\d+\s*(min|minute|°|degrees|f\b)/i.test(body)) score += 4;
  }
  return Math.max(0, Math.min(100, score));
}

function scoreSideDishQuality(recipe: GenerateResponse): number {
  const extras = recipe.extra_items_needed || [];
  const used = recipe.ingredients_used || [];
  if (extras.length === 0 && used.length >= 3) return 75;
  if (extras.length > 0 && extras.length <= 6) return 80;
  return 60;
}

/** Composite trust quality for send gate. */
export function computeRecipeTrustQuality(
  recipe: GenerateResponse,
  ctx: QualityContext = {},
): RecipeTrustQualityReport {
  const fmt = ctx.mealFormat || recipe.meal_style || "bowl";
  const titleQ = titleQualityScore(recipe, ctx);
  const ingCheck = titleMatchesIngredients(recipe.title || "", recipe.ingredients || [], fmt);
  const ingredientCoherence = ingCheck.ok ? 90 : 40;
  const imageQ = imageMatchConfidence(recipe, ctx.heroImagePath);
  const instructionQuality = scoreInstructionQuality(recipe);
  const gate = runRecipeQualityGate(recipe, {
    mealFormat: fmt,
    identity: detectMealIdentity(recipe.title || "", fmt),
    protein: ctx.protein || recipe.chosen_protein,
    crewSize: ctx.crewSize || 6,
    importedSource: ctx.importedSource,
  });
  const realism = scoreHallRealism(
    recipe.title || "",
    recipe.steps || [],
    recipe.ingredients || [],
  );
  const mealRealism = Math.round((gate.score + realism.score * 10) / 2);
  const firehallSuitability = gate.score;
  const sideDishQuality = scoreSideDishQuality(recipe);

  const composite = Math.round(
    titleQ.score * 0.28 +
      ingredientCoherence * 0.22 +
      imageQ.score * 0.12 +
      instructionQuality * 0.15 +
      mealRealism * 0.15 +
      firehallSuitability * 0.08,
  );

  const blocking: string[] = [];
  if (!titleQ.pass) blocking.push(...titleQ.issues.map((i) => `title:${i}`));
  if (titleQ.badAi) blocking.push("bad_ai_title");
  if (!ingCheck.ok) blocking.push(ingCheck.reason || "ingredient_incoherence");
  if (!imageQ.pass && ctx.heroImagePath) blocking.push(...imageQ.conflicts);
  if (gate.issues.includes("robotic_title")) blocking.push("robotic_title");
  if (gate.issues.includes("title_taco_no_tortilla")) blocking.push("title_taco_no_tortilla");
  if (gate.issues.includes("taco_with_rice")) blocking.push("taco_with_rice");

  const threshold = ctx.importedSource ? TRUST_IMPORTED_THRESHOLD : TRUST_QUALITY_THRESHOLD;
  const pass =
    blocking.length === 0 &&
    composite >= threshold &&
    (ctx.importedSource || (titleQ.pass && gate.score >= 48));

  return {
    titleQuality: titleQ.score,
    ingredientCoherence,
    imageMatchConfidence: imageQ.score,
    instructionQuality,
    mealRealism,
    firehallSuitability,
    sideDishQuality,
    composite,
    pass,
    blockingIssues: blocking,
  };
}
