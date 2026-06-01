/**
 * Centralized recipe validation — safe, modular, no raw Zod to users.
 */

import type { GenerateResponse } from "../schema.js";
import {
  titleMatchesIngredients,
  normalizeFormatKey,
  ingredientNameMatchesRecipeTitle,
} from "../meal-format-contract.js";
import { isMinimumViableRecipe, isRoboticTitle } from "../generation-reliability.js";
import { heroPathConflictsTitle, scoreImageTitleAlignment } from "../meal-image-title-match.js";
import { parseFirehallRecipe } from "./validators.js";

export type ValidationSeverity = "error" | "warn";

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  field?: string;
}

export interface RecipeValidationReport {
  ok: boolean;
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidateContext {
  mealFormat?: string;
  protein?: string;
  heroImagePath?: string;
  legacyValidationOk?: boolean;
  importedSource?: boolean;
}

const FILLER_STEP =
  /^(cook until done|serve and enjoy|plate and serve|enjoy|serve hot|garnish and serve)\.?$/i;

const WEAK_STEP =
  /^(cook|heat|prepare|make)\s+(the\s+)?(meal|food|dish)\.?$/i;

const MIN_STEP_WORDS = 18;

function push(
  issues: ValidationIssue[],
  code: string,
  message: string,
  severity: ValidationSeverity,
  field?: string,
): void {
  issues.push({ code, message, severity, field });
}

export function validateIngredients(
  recipe: GenerateResponse,
  ctx: ValidateContext = {},
): RecipeValidationReport {
  const issues: ValidationIssue[] = [];
  const ingredients = recipe.ingredients || [];
  const mealFormat = ctx.mealFormat || recipe.meal_style;

  if (ingredients.length === 0) {
    push(issues, "ingredients_empty", "Recipe has no ingredients", "error", "ingredients");
  } else if (ingredients.length < 4) {
    push(issues, "ingredients_sparse", "Too few ingredients for a crew meal", "warn", "ingredients");
  }

  const names = new Set<string>();
  const recipeTitle = recipe.title || "";
  for (const ing of ingredients) {
    const name = (ing.item || "").trim().toLowerCase();
    if (!name) {
      push(issues, "ingredient_blank", "Blank ingredient name", "error", "ingredients");
      continue;
    }
    if (recipeTitle && ingredientNameMatchesRecipeTitle(ing.item || "", recipeTitle)) {
      push(
        issues,
        "title_as_ingredient",
        `Recipe title used as ingredient: ${ing.item}`,
        "error",
        "ingredients",
      );
    }
    if (names.has(name)) {
      push(issues, "ingredient_duplicate", `Duplicate ingredient: ${ing.item}`, "warn", "ingredients");
    }
    names.add(name);
  }

  const titleCheck = titleMatchesIngredients(recipe.title || "", ingredients, mealFormat);
  if (!titleCheck.ok) {
    push(
      issues,
      titleCheck.reason || "title_ingredient_mismatch",
      "Title does not match ingredient list",
      "error",
      "title",
    );
  }

  const fmt = normalizeFormatKey(mealFormat);
  if (fmt === "tacos" && !titleCheck.ok) {
    push(issues, "format_taco_incoherent", "Taco meal missing tortilla structure", "error", "ingredients");
  }

  return splitReport(issues);
}

export function validateInstructions(
  recipe: GenerateResponse,
): RecipeValidationReport {
  const issues: ValidationIssue[] = [];
  const steps = recipe.steps || [];

  if (steps.length < 2) {
    push(issues, "steps_too_few", "Need at least two instruction steps", "error", "steps");
    return splitReport(issues);
  }

  let fillerCount = 0;
  let shallowCount = 0;

  for (let i = 0; i < steps.length; i++) {
    const body = (steps[i].instruction || steps[i].body || "").trim();
    const heading = (steps[i].title || steps[i].heading || "").trim();
    if (!body && !heading) {
      push(issues, "step_empty", `Step ${i + 1} is empty`, "error", "steps");
      continue;
    }
    const words = body.split(/\s+/).filter(Boolean).length;
    if (FILLER_STEP.test(body) || WEAK_STEP.test(body)) {
      fillerCount++;
      push(issues, "step_filler", `Step ${i + 1} is generic filler`, "error", "steps");
    } else if (words < MIN_STEP_WORDS) {
      shallowCount++;
      push(issues, "step_shallow", `Step ${i + 1} lacks cooking detail`, "warn", "steps");
    }
  }

  if (fillerCount > 0 && fillerCount >= Math.ceil(steps.length * 0.4)) {
    push(issues, "steps_mostly_filler", "Too many placeholder steps", "error", "steps");
  }
  if (shallowCount > Math.ceil(steps.length * 0.6)) {
    push(issues, "steps_mostly_shallow", "Instructions are too brief for crew cooking", "warn", "steps");
  }

  const prep = recipe.timing?.prep_minutes ?? 0;
  const cook = recipe.timing?.cook_minutes ?? 0;
  const total = recipe.timing?.total_minutes ?? 0;
  if (total > 0 && total < prep + cook - 10) {
    push(issues, "timing_inconsistent", "Total time is less than prep + cook", "warn", "timing");
  }

  return splitReport(issues);
}

export function validateMealStructure(
  recipe: GenerateResponse,
  ctx: ValidateContext = {},
): RecipeValidationReport {
  const issues: ValidationIssue[] = [];
  const title = (recipe.title || "").trim();

  if (!title || title.length < 4) {
    push(issues, "title_missing", "Recipe title is missing", "error", "title");
  }
  if (isRoboticTitle(title)) {
    push(issues, "title_robotic", "Title reads like system metadata", "error", "title");
  }
  if (!isMinimumViableRecipe(recipe)) {
    push(issues, "minimum_shape", "Recipe missing protein, starch, or sufficient steps", "error");
  }
  if (ctx.legacyValidationOk === false && !ctx.importedSource) {
    push(issues, "legacy_validator", "Failed hall validator checks", "error");
  }

  const canonical = parseFirehallRecipe(recipe);
  if (!canonical.ok) {
    push(issues, "canonical_shape", "Recipe does not match canonical schema", "error");
    if (canonical.errors.length > 0) {
      push(issues, "canonical_detail", canonical.errors[0], "warn");
    }
  }

  return splitReport(issues);
}

export function validateImageConsistency(
  recipe: GenerateResponse,
  ctx: ValidateContext = {},
): RecipeValidationReport {
  const issues: ValidationIssue[] = [];
  const hero = ctx.heroImagePath;
  const title = recipe.title || "";
  const mealFormat = ctx.mealFormat || recipe.meal_style;

  if (hero && heroPathConflictsTitle(hero, title, mealFormat)) {
    push(issues, "hero_path_mismatch", "Hero image path conflicts with meal title", "error", "media");
  }

  const match = scoreImageTitleAlignment(title, mealFormat, {
    heroSource: hero ? "generated" : undefined,
  });
  if (!match.pass && hero) {
    push(
      issues,
      "image_title_mismatch",
      `Image/title alignment low (${match.conflicts.join(",") || "low score"})`,
      "error",
      "media",
    );
  }

  return splitReport(issues);
}

function splitReport(issues: ValidationIssue[]): RecipeValidationReport {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warn");
  return {
    ok: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

function mergeReports(...reports: RecipeValidationReport[]): RecipeValidationReport {
  const issues = reports.flatMap((r) => r.issues);
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warn");
  return { ok: errors.length === 0, issues, errors, warnings };
}

/** Full validation suite — all modules. */
export function validateRecipe(
  recipe: GenerateResponse,
  ctx: ValidateContext = {},
): RecipeValidationReport {
  return mergeReports(
    validateMealStructure(recipe, ctx),
    validateIngredients(recipe, ctx),
    validateInstructions(recipe),
    validateImageConsistency(recipe, ctx),
  );
}

/** User-safe summary — never includes Zod paths or internal codes in production UI */
export function validationSummaryForClient(report: RecipeValidationReport): string | null {
  if (report.ok) return null;
  return "This meal didn't pass our quality check — trying another one.";
}
