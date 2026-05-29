/**
 * QA for Performance Meals — originality, realism, station practicality.
 */

import { PERFORMANCE_ADAPTED_RECIPES } from "../adapted/index.js";
import {
  isGenericStep,
  isPlaceholderIngredient,
  stepsFailQualityBar,
} from "../../golden-100/recipe-quality/placeholders.js";
import { validatePerformanceSourceRegistry } from "../source-registry.js";
import { PERFORMANCE_MEAL_COUNT } from "../types.js";

export interface PerformanceAuditIssue {
  slug: string;
  code: string;
  message: string;
  severity: "error" | "warn";
}

export interface PerformanceAuditReport {
  pass: boolean;
  recipeCount: number;
  errors: PerformanceAuditIssue[];
  warnings: PerformanceAuditIssue[];
}

const BANNED_PUBLIC_SOURCE =
  /\b(skinnytaste|serious eats|ambitious kitchen|the mediterranean dish|bon appétit|nyt cooking)\b/i;

export function auditPerformanceMeals(): PerformanceAuditReport {
  const errors: PerformanceAuditIssue[] = [];
  const warnings: PerformanceAuditIssue[] = [];

  for (const msg of validatePerformanceSourceRegistry()) {
    errors.push({ slug: "_registry", code: "registry", message: msg, severity: "error" });
  }

  if (PERFORMANCE_ADAPTED_RECIPES.length !== PERFORMANCE_MEAL_COUNT) {
    errors.push({
      slug: "_manifest",
      code: "count",
      message: `expected ${PERFORMANCE_MEAL_COUNT} adapted recipes, got ${PERFORMANCE_ADAPTED_RECIPES.length}`,
      severity: "error",
    });
  }

  const slugs = new Set<string>();
  for (const recipe of PERFORMANCE_ADAPTED_RECIPES) {
    const slug = recipe.manifest.slug;
    if (slugs.has(slug)) {
      errors.push({ slug, code: "duplicate_slug", message: "duplicate slug", severity: "error" });
    }
    slugs.add(slug);

    if (recipe.ingredients.length < 8) {
      errors.push({
        slug,
        code: "ingredients_count",
        message: `only ${recipe.ingredients.length} ingredients (need 8+)`,
        severity: "error",
      });
    }
    for (const ing of recipe.ingredients) {
      if (isPlaceholderIngredient(ing)) {
        errors.push({
          slug,
          code: "vague_ingredient",
          message: `vague ingredient: ${ing.name}`,
          severity: "error",
        });
      }
    }

    if (recipe.steps.length < 5) {
      errors.push({
        slug,
        code: "steps_count",
        message: `only ${recipe.steps.length} steps (need 5+)`,
        severity: "error",
      });
    }
    if (stepsFailQualityBar(recipe.steps)) {
      errors.push({ slug, code: "step_quality", message: "steps fail quality bar", severity: "error" });
    }
    for (const step of recipe.steps) {
      if (isGenericStep(step)) {
        errors.push({
          slug,
          code: "placeholder_step",
          message: `placeholder step: ${step.title}`,
          severity: "error",
        });
      }
      if (step.instruction.length < 55) {
        errors.push({
          slug,
          code: "short_instruction",
          message: `short instruction on step ${step.stepNumber}`,
          severity: "error",
        });
      }
    }

    const pubText = [
      recipe.description,
      recipe.whyCrewsLikeIt,
      ...recipe.proTips,
      ...recipe.steps.map((s) => s.instruction),
    ].join(" ");
    if (BANNED_PUBLIC_SOURCE.test(pubText)) {
      errors.push({
        slug,
        code: "source_leak",
        message: "publisher name appears in public copy",
        severity: "error",
      });
    }

    if (recipe.proTips.length < 3) {
      warnings.push({ slug, code: "pro_tips", message: "fewer than 3 pro tips", severity: "warn" });
    }
    if (recipe.stationWorkflow.length < 3) {
      warnings.push({
        slug,
        code: "station_workflow",
        message: "fewer than 3 station workflow notes",
        severity: "warn",
      });
    }

    const n = recipe.nutrition;
    if (n.protein < 12 && recipe.manifest.protein !== "vegetarian") {
      warnings.push({
        slug,
        code: "low_protein",
        message: `protein estimate ${n.protein}g may be low for ${recipe.manifest.protein}`,
        severity: "warn",
      });
    }
  }

  return {
    pass: errors.length === 0,
    recipeCount: PERFORMANCE_ADAPTED_RECIPES.length,
    errors,
    warnings,
  };
}
