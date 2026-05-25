/**
 * Post-generation validation for meal cooking steps.
 */

import type { IngredientItem, RecipeStep } from "./schema.js";
import type { MealIdentity } from "./meal-semantics.js";
import { isSeasoningOrGarnish, PROTEIN_PATTERN } from "./meal-semantics.js";
import { stripBannedInstructionPhrases } from "./firehall-instruction-voice.js";

const GENERIC_FILLER =
  /\b(gentle bubble|gray steam bath|steam bath|visual cues|wooden bowl|spread evenly|prepare ingredients carefully|work over medium heat)\b/i;

const PROTEIN_COOK_PATTERN =
  /\b(sear|grill|bake|roast|broil|brown|fry|sauté|saute|cook|simmer|poach|boil|internal|165|160|145|°f|patty|patties|burger|ground beef|chicken breast|thigh|drumstick|steak|pork chop|sausage)\b/i;

const COOKING_ALLOWLIST =
  /\b(oil|olive|butter|salt|pepper|water|broth|stock|pan|skillet|pot|sheet|oven|heat|bowl|tongs|spatula|thermometer|foil|parchment|timer|cover|lid|stir|drain|season|taste|rest|serve|portion|line|crew|hall|station)\b/i;

export interface MealStepValidationContext {
  title: string;
  identity: MealIdentity;
  mealFormat: string;
  protein?: string;
  totalMinutes: number;
  crewSize: number;
}

export interface MealStepValidationResult {
  ok: boolean;
  errors: string[];
}

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ingredientTokens(ingredients: IngredientItem[]): string[] {
  return ingredients
    .filter((i) => !isSeasoningOrGarnish(i.item, i.notes))
    .map((i) => normalizeToken(i.item))
    .filter((t) => t.length > 2);
}

function stepReferencesIngredient(stepText: string, token: string): boolean {
  if (token.length < 4) return stepText.includes(token);
  if (stepText.includes(token)) return true;
  const words = token.split(" ").filter((w) => w.length > 3);
  return words.some((w) => stepText.includes(w));
}

function extractHallucinationTerms(stepText: string, tokens: string[]): string[] {
  const bad: string[] = [];
  const words = stepText.split(/\s+/).filter((w) => w.length > 4);
  for (const w of words) {
    if (COOKING_ALLOWLIST.test(w)) continue;
    if (tokens.some((t) => stepReferencesIngredient(stepText, t))) continue;
    if (/^\d+$/.test(w)) continue;
    if (/\b(minute|minutes|until|then|with|into|over|from|about)\b/.test(w)) continue;
    if (PROTEIN_COOK_PATTERN.test(w)) continue;
    bad.push(w);
  }
  return bad.slice(0, 3);
}

export function validateMealSteps(
  steps: RecipeStep[],
  ingredients: IngredientItem[],
  ctx: MealStepValidationContext,
): MealStepValidationResult {
  const errors: string[] = [];
  if (!steps.length) errors.push("no_steps");

  const tokens = ingredientTokens(ingredients);
  const combined = steps.map((s) => `${s.heading} ${s.body}`).join(" ");
  const combinedNorm = normalizeToken(stripBannedInstructionPhrases(combined));

  if (GENERIC_FILLER.test(combined)) {
    const isSoup =
      ctx.identity === "soup_stew" ||
      /\b(soup|chili|stew|broth)\b/i.test(ctx.title) ||
      tokens.some((t) => /\b(broth|stock)\b/.test(t));
    if (!isSoup || !/\bgentle bubble\b/i.test(combined)) {
      errors.push("generic_filler");
    }
  }

  const hasProteinIng = ingredients.some(
    (i) => PROTEIN_PATTERN.test(`${i.item} ${i.notes}`) && !isSeasoningOrGarnish(i.item, i.notes),
  );
  const proteinLabel = (ctx.protein || "").toLowerCase();
  const needsProteinCook =
    hasProteinIng && proteinLabel !== "vegetarian" && proteinLabel !== "any";

  if (needsProteinCook && !PROTEIN_COOK_PATTERN.test(combinedNorm)) {
    errors.push("missing_protein_cook");
  }

  if (ctx.identity === "burger" && !/\b(burger|patty|patties|grill|sear|flip)\b/i.test(combinedNorm)) {
    errors.push("burger_missing_cook");
  }

  for (const step of steps) {
    const text = normalizeToken(`${step.heading} ${step.body}`);
    const hallucinated = extractHallucinationTerms(text, tokens);
    if (hallucinated.length >= 2) {
      errors.push(`hallucinated:${hallucinated.join(",")}`);
      break;
    }
  }

  const major = ingredients.filter((i) => !isSeasoningOrGarnish(i.item, i.notes));
  let unused = 0;
  for (const ing of major.slice(0, 14)) {
    const tok = normalizeToken(ing.item);
    if (!stepReferencesIngredient(combinedNorm, tok)) unused++;
  }
  if (major.length >= 4 && unused > Math.ceil(major.length * 0.45)) {
    errors.push(`unused_ingredients:${unused}`);
  }

  let stepMinutes = 0;
  for (const s of steps) {
    const est = (s as { estimated_time?: number }).estimated_time;
    if (typeof est === "number") stepMinutes += est;
    else {
      const m = `${s.heading} ${s.body}`.match(/(\d+)\s*[-–]\s*(\d+)\s*min|(\d+)\s*min/i);
      if (m) {
        const lo = parseInt(m[1] || m[3] || "0", 10);
        const hi = m[2] ? parseInt(m[2], 10) : lo;
        stepMinutes += Math.round((lo + hi) / 2);
      } else {
        stepMinutes += 5;
      }
    }
  }

  const target = Math.max(ctx.totalMinutes || 30, 15);
  if (stepMinutes < target * 0.35 || stepMinutes > target * 2.2) {
    errors.push(`time_mismatch:${stepMinutes}vs${target}`);
  }

  return { ok: errors.length === 0, errors };
}

export function sourceStepsAreSpecific(
  steps: RecipeStep[],
  ingredients: IngredientItem[],
  ctx: MealStepValidationContext,
): boolean {
  if (steps.length < 4) return false;
  const validation = validateMealSteps(steps, ingredients, ctx);
  return validation.ok;
}
