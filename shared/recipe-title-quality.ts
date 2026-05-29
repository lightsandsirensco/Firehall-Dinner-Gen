/**
 * Recipe title quality scoring — craveable, human, firehall-authentic.
 */

import { isRoboticTitle, suggestHumanMealTitle, type HumanTitleOptions } from "./generation-reliability.js";
import { titleMatchesIngredients } from "./meal-format-contract.js";

export type TitleQualityIssueCode =
  | "robotic_metadata"
  | "awkward_with_clause"
  | "cuisine_label_only"
  | "generic_stack"
  | "ingredient_mismatch"
  | "too_short"
  | "too_long"
  | "low_crave_signal"
  | "title_format_conflict";

const AWKWARD_WITH =
  /\b(with|and)\s+(quinoa|jasmine rice|basmati|brown rice|white rice|couscous|farro|barley)\b/i;

const STACKED_INGREDIENTS =
  /\b(any|every|simple|easy|quick|healthy|hearty)\s+(\w+\s+){0,2}(beef|chicken|pork|turkey|fish)\s+(skillet|bowl|plate|dinner)\s+with\b/i;

const GENERIC_OPENERS = /^(any|simple|easy|quick|healthy|hearty|traditional)\s+/i;

const CRAVE_SIGNAL =
  /\b(sticky|crispy|smoky|garlic|honey|chili|chipotle|lemon|herb|bbq|barbecue|buffalo|teriyaki|ginger|sesame|maple|sriracha|chimichurri|firehall|cajun|roasted|grilled|seared|zesty|tangy|spicy|savory|balsamic|mustard|pesto|curry|miso|street|loaded|smash|crispy|braised|caramelized|honey-glazed|garlic-butter)\b/i;

const BLOCKING_ISSUES = new Set<TitleQualityIssueCode>([
  "robotic_metadata",
  "awkward_with_clause",
  "cuisine_label_only",
  "generic_stack",
  "ingredient_mismatch",
  "title_format_conflict",
]);

export interface TitleQualityResult {
  pass: boolean;
  score: number;
  craveScore: number;
  issues: TitleQualityIssueCode[];
  messages: string[];
  /** Suggested replacement when repair is needed */
  suggestedTitle?: string;
}

export interface TitleQualityContext {
  mealFormat?: string;
  protein?: string;
  ingredients?: Array<{ item?: string; notes?: string }>;
  cuisine?: string;
}

export function scoreRecipeTitle(
  title: string,
  ctx: TitleQualityContext = {},
): TitleQualityResult {
  const issues: TitleQualityIssueCode[] = [];
  const messages: string[] = [];
  let score = 100;
  let craveScore = 50;
  const t = (title || "").trim();

  if (!t || t.length < 6) {
    issues.push("too_short");
    messages.push("title_too_short");
    return { pass: false, score: 0, craveScore: 0, issues, messages };
  }

  if (t.length > 72) {
    issues.push("too_long");
    score -= 8;
    messages.push("title_long");
  }

  if (isRoboticTitle(t)) {
    issues.push("robotic_metadata");
    score -= 35;
    messages.push("robotic_title");
  }

  if (AWKWARD_WITH.test(t)) {
    issues.push("awkward_with_clause");
    score -= 30;
    messages.push("awkward_with_starch");
  }

  if (STACKED_INGREDIENTS.test(t)) {
    issues.push("generic_stack");
    score -= 28;
    messages.push("stacked_ingredients");
  }

  if (GENERIC_OPENERS.test(t) && !CRAVE_SIGNAL.test(t)) {
    issues.push("low_crave_signal");
    score -= 12;
    craveScore -= 20;
    messages.push("generic_opener");
  }

  if (CRAVE_SIGNAL.test(t)) {
    craveScore += 25;
  }
  if (/\b(taco|fajita|burrito|sandwich|burger|bowl|wrap|pasta|chili|steak|bbq|sticky|crispy|firehall)\b/i.test(t)) {
    craveScore += 15;
  }
  if (t.split(/\s+/).length >= 3 && t.split(/\s+/).length <= 7) {
    craveScore += 8;
  }

  const titleCheck = titleMatchesIngredients(t, ctx.ingredients || [], ctx.mealFormat);
  if (!titleCheck.ok) {
    issues.push("ingredient_mismatch");
    score -= 22;
    messages.push(titleCheck.reason || "title_mismatch");
  }

  const fmt = (ctx.mealFormat || "").toLowerCase();
  if (/\btaco/i.test(t) && fmt && !/taco|wrap|burrito/.test(fmt)) {
    issues.push("title_format_conflict");
    score -= 18;
    messages.push("title_taco_format_mismatch");
  }
  if (/\b(skillet|stir.?fry)\b/i.test(t) && /taco|burger|pasta/.test(fmt) && fmt !== "skillet" && fmt !== "stir_fry") {
    issues.push("title_format_conflict");
    score -= 12;
  }

  score = Math.max(0, Math.min(100, score));
  craveScore = Math.max(0, Math.min(100, craveScore));
  const combined = Math.round(score * 0.65 + craveScore * 0.35);

  const blocking = issues.filter((i) => BLOCKING_ISSUES.has(i));
  const pass = blocking.length === 0 && combined >= 62 && craveScore >= 40;

  let suggestedTitle: string | undefined;
  if (!pass) {
    const opts: HumanTitleOptions = {
      protein: ctx.protein || "chicken",
      mealFormat: ctx.mealFormat,
      fallbackTitle: title,
      ingredients: ctx.ingredients,
      cuisine: ctx.cuisine,
    };
    suggestedTitle = suggestHumanMealTitle(opts);
    if (isRoboticTitle(suggestedTitle)) {
      suggestedTitle = suggestHumanMealTitle({ ...opts, fallbackTitle: undefined });
    }
  }

  return {
    pass,
    score: combined,
    craveScore,
    issues,
    messages,
    suggestedTitle: pass ? undefined : suggestedTitle,
  };
}

/** Normalize title: repair if weak, else return as-is. */
export function normalizeRecipeTitle(
  recipe: { title?: string; meal_style?: string; chosen_protein?: string; ingredients?: Array<{ item?: string; notes?: string }>; tags?: { cuisine?: string } },
): string {
  const ctx: TitleQualityContext = {
    mealFormat: recipe.meal_style,
    protein: recipe.chosen_protein,
    ingredients: recipe.ingredients,
    cuisine: recipe.tags?.cuisine,
  };
  const q = scoreRecipeTitle(recipe.title || "", ctx);
  if (q.pass) return (recipe.title || "").trim();
  if (q.suggestedTitle && !isRoboticTitle(q.suggestedTitle)) return q.suggestedTitle;
  return suggestHumanMealTitle({
    protein: recipe.chosen_protein || "chicken",
    mealFormat: recipe.meal_style,
    ingredients: recipe.ingredients,
    cuisine: recipe.tags?.cuisine,
  });
}
