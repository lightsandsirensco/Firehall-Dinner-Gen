/**
 * Final recipe quality gate — reject incoherent titles, taco misuse, filler copy.
 */

import type { GenerateResponse } from "./schema.js";
import {
  titleMatchesIngredients,
  titleClaimsTacos,
  normalizeFormatKey,
  getFormatContract,
  ingredientsText,
} from "./meal-format-contract.js";
import { scoreHallRealism } from "./firehall-instruction-voice.js";
import { validateMealSteps } from "./meal-step-validation.js";
import type { MealIdentity } from "./meal-semantics.js";
import { isRoboticTitle, repairRecipeTitle } from "./generation-reliability.js";
import { scoreRecipeTitle } from "./recipe-title-quality.js";

const BANNED_COPY_PHRASES: RegExp[] = [
  /\bfeeds hard\b/gi,
  /\btonight'?s board\b/gi,
  /\bstation template\b/gi,
  /\bhall spread\b/gi,
  /\btonight at the hall\b/gi,
  /\bfamily style\b/gi,
];

const GENERIC_TITLE =
  /\b(healthy|hearty|delicious|easy|simple|classic)\s+(chicken|beef|meal|dish)\b/i;

const BLAND_TITLE_SUFFIX = /\b(with rice and vegetables|with mixed vegetables|dinner)\s*$/i;

export type QualityIssueCode =
  | "title_taco_no_tortilla"
  | "title_ingredient_mismatch"
  | "format_taco_no_tortilla"
  | "taco_with_rice"
  | "banned_copy"
  | "generic_title"
  | "robotic_title"
  | "shallow_steps"
  | "hall_realism_low"
  | "step_validation_failed"
  | "why_too_generic";

export interface RecipeQualityResult {
  pass: boolean;
  score: number;
  issues: QualityIssueCode[];
  messages: string[];
}

export interface RecipeQualityGateContext {
  mealFormat?: string;
  identity?: MealIdentity;
  protein?: string;
  crewSize?: number;
  /** Spoonacular/catalog — do not fail on title polish alone */
  importedSource?: boolean;
}

export function scanBannedCopy(text: string): string[] {
  const hits: string[] = [];
  for (const re of BANNED_COPY_PHRASES) {
    if (re.test(text)) hits.push(re.source.replace(/\\b/g, "").replace(/\\/g, ""));
  }
  return hits;
}

export function runRecipeQualityGate(
  recipe: GenerateResponse,
  ctx: RecipeQualityGateContext = {},
): RecipeQualityResult {
  const issues: QualityIssueCode[] = [];
  const messages: string[] = [];
  let score = 100;

  const title = recipe.title || "";
  const ingredients = recipe.ingredients || [];
  const steps = recipe.steps || [];
  const fmt = normalizeFormatKey(ctx.mealFormat || recipe.meal_style);
  const combined =
    `${title} ${recipe.why_it_fits_tonight || ""} ${steps.map((s) => `${s.heading} ${s.body}`).join(" ")}`;

  const titleCheck = titleMatchesIngredients(title, ingredients, fmt);
  if (!titleCheck.ok) {
    const code =
      titleCheck.reason === "taco_with_rice"
        ? "taco_with_rice"
        : titleCheck.reason === "format_taco_no_tortilla"
          ? "format_taco_no_tortilla"
          : titleCheck.reason?.startsWith("title_")
            ? "title_ingredient_mismatch"
            : "title_taco_no_tortilla";
    issues.push(code);
    messages.push(titleCheck.reason || "title_mismatch");
    score -= 25;
  }

  const ings = ingredientsText(ingredients);
  const contract = getFormatContract(fmt);
  if (contract?.forbiddenStarches.test(ings) && (fmt === "tacos" || titleClaimsTacos(title))) {
    if (!issues.includes("taco_with_rice")) {
      issues.push("taco_with_rice");
      messages.push("rice_in_taco_meal");
      score -= 20;
    }
  }

  if (GENERIC_TITLE.test(title) || BLAND_TITLE_SUFFIX.test(title)) {
    issues.push("generic_title");
    messages.push("bland_title");
    score -= 15;
  }

  if (isRoboticTitle(title)) {
    issues.push("robotic_title");
    messages.push("robotic_title");
    score -= 25;
  }

  const titleQuality = scoreRecipeTitle(title, {
    mealFormat: fmt,
    protein: ctx.protein || recipe.chosen_protein,
    ingredients,
    cuisine: recipe.tags?.cuisine,
  });
  if (!titleQuality.pass) {
    if (!issues.includes("robotic_title")) {
      issues.push("robotic_title");
      messages.push(`title_quality:${titleQuality.score}`);
    }
    score -= Math.max(8, 100 - titleQuality.score);
  }

  const banned = scanBannedCopy(combined);
  if (banned.length > 0) {
    issues.push("banned_copy");
    messages.push(`banned:${banned.join(",")}`);
    score -= 10 * Math.min(3, banned.length);
  }

  const why = recipe.why_it_fits_tonight || "";
  if (why.length < 40 || /\b(hearty meal|crew|shift)\b/i.test(why) && why.split(/\s+/).length < 12) {
    issues.push("why_too_generic");
    messages.push("weak_description");
    score -= 8;
  }

  const realism = scoreHallRealism(title, steps, ingredients);
  if (realism.score < 6) {
    issues.push("hall_realism_low");
    messages.push(...realism.issues);
    score -= 12;
  }

  if (steps.length > 0 && ctx.identity) {
    const stepVal = validateMealSteps(steps, ingredients, {
      title,
      identity: ctx.identity,
      mealFormat: fmt,
      protein: ctx.protein || recipe.chosen_protein,
      totalMinutes: recipe.timing?.total_minutes || 45,
      crewSize: ctx.crewSize || 6,
    });
    if (!stepVal.ok && !ctx.importedSource) {
      issues.push("step_validation_failed");
      messages.push(...stepVal.errors.slice(0, 4));
      score -= 15;
    } else if (!stepVal.ok && ctx.importedSource) {
      score -= 5;
    }
  }

  if (steps.length > 0) {
    const shallow = steps.filter((s) => (s.body || "").split(/\s+/).length < 25).length;
    if (shallow > Math.ceil(steps.length * 0.6)) {
      issues.push("shallow_steps");
      messages.push("steps_too_short");
      score -= 12;
    }
  }

  const hardFail = new Set<QualityIssueCode>([
    "title_taco_no_tortilla",
    "format_taco_no_tortilla",
    "taco_with_rice",
    "title_ingredient_mismatch",
    "robotic_title",
  ]);

  const blocking = issues.filter((i) => hardFail.has(i));
  const pass = blocking.length === 0 && score >= 55;

  return {
    pass,
    score: Math.max(0, Math.min(100, score)),
    issues,
    messages,
  };
}

/** Apply safe auto-fixes before re-gate (title only). */
export function applyQualityTitleFix(recipe: GenerateResponse, mealFormat?: string): GenerateResponse {
  const fixed = { ...recipe };
  const ings = ingredientsText(recipe.ingredients || []);
  const fmt = normalizeFormatKey(mealFormat || recipe.meal_style);

  if (titleClaimsTacos(fixed.title || "") && !/\b(tortilla|shell)\b/i.test(ings)) {
    const protein = (fixed.chosen_protein || "chicken").replace(/^\w/, (c) => c.toUpperCase());
    const flavor = /\b(chipotle|bbq|smoky|garlic|honey|buffalo)\b/i.exec(ings)?.[0];
    const flavorPart = flavor ? `${flavor[0].toUpperCase()}${flavor.slice(1)} ` : "";
    fixed.title = `${flavorPart}${protein} Bowls with Loaded Toppings`;
    fixed.meal_style = "bowl";
  }

  if (fmt === "tacos" && !/\b(tortilla|shell)\b/i.test(ings)) {
    fixed.meal_style = "bowl";
  }

  return repairRecipeTitle(fixed, mealFormat);
}
