/**
 * Recipe repair — fix recoverable issues before reject/fallback.
 */

import type { GenerateResponse, RecipeStep } from "../schema.js";
import {
  suggestHumanMealTitle,
  normalizeIngredientsUsed,
  repairRecipeTitle,
} from "../generation-reliability.js";
import { normalizeRecipeTitle as normalizeTitleFromQuality } from "../recipe-title-quality.js";
import { titleMatchesIngredients } from "../meal-format-contract.js";
import type { RecipeValidationReport } from "./validate.js";
import type { RecipeTrustQualityReport } from "./quality.js";
import type { RecipeTrustLogSink } from "./logger.js";
import { trustLog } from "./logger.js";
import { normalizeGenerateResponse } from "./normalize.js";

export interface RepairContext {
  mealFormat?: string;
  protein?: string;
  cuisine?: string;
}

export interface RepairResult {
  recipe: GenerateResponse;
  repairs: string[];
  recovered: boolean;
}

const FILLER_REPLACEMENTS: Record<string, string> = {
  "cook until done":
    "Cook until the protein reaches a safe internal temperature and the sauce coats the ingredients.",
  "serve and enjoy":
    "Portion for the crew and serve hot while everything is still crisp and saucy.",
};

function expandFillerStep(step: RecipeStep): RecipeStep {
  const body = (step.instruction || step.body || "").trim().toLowerCase();
  for (const [key, replacement] of Object.entries(FILLER_REPLACEMENTS)) {
    if (body === key || body === `${key}.`) {
      return {
        ...step,
        body: replacement,
        instruction: replacement,
      };
    }
  }
  const raw = (step.instruction || step.body || "").trim();
  if (raw.split(/\s+/).length < 12) {
    const expanded = `${raw} Work in batches if needed so the pan stays hot and the crew-sized portions cook evenly.`;
    return { ...step, body: expanded, instruction: expanded };
  }
  return step;
}

/** Attempt targeted repairs from validation/quality reports. */
export function repairGenerateResponse(
  recipe: GenerateResponse,
  validation: RecipeValidationReport,
  quality: RecipeTrustQualityReport | null,
  ctx: RepairContext = {},
  logSink?: RecipeTrustLogSink,
): RepairResult {
  const repairs: string[] = [];
  let out: GenerateResponse = { ...recipe };

  const titleBroken = validation.errors.some((e) =>
    ["title_robotic", "title_missing", "title_ingredient_mismatch"].includes(e.code),
  );
  if (titleBroken || quality?.blockingIssues.some((b) => b.startsWith("title:"))) {
    const before = out.title;
    out = repairRecipeTitle(out, ctx.mealFormat || out.meal_style);
    const suggested = normalizeTitleFromQuality({
      title: out.title,
      meal_style: ctx.mealFormat || out.meal_style,
      chosen_protein: ctx.protein || out.chosen_protein,
      ingredients: out.ingredients,
      tags: out.tags,
    });
    if (suggested && suggested !== out.title) {
      out = { ...out, title: suggested };
    } else if (!suggested) {
      out = {
        ...out,
        title: suggestHumanMealTitle({
          protein: ctx.protein || out.chosen_protein || "chicken",
          mealFormat: ctx.mealFormat || out.meal_style,
          ingredients: out.ingredients,
          cuisine: ctx.cuisine || out.tags?.cuisine,
        }),
      };
    }
    repairs.push("title_repaired");
    trustLog(logSink, "title_repair", `"${before}" → "${out.title}"`);
  }

  if (validation.errors.some((e) => e.code.startsWith("ingredient"))) {
    out = normalizeIngredientsUsed(out);
    repairs.push("ingredients_repaired");
    trustLog(logSink, "ingredient_repair", "normalized ingredients_used");
  }

  if (validation.errors.some((e) => e.code.startsWith("step_"))) {
    out = {
      ...out,
      steps: (out.steps || []).map((s) => expandFillerStep(s)),
    };
    repairs.push("steps_expanded");
    trustLog(logSink, "repair", "expanded filler steps");
  }

  const tacoMismatch = validation.errors.some((e) =>
    ["title_taco_no_tortilla", "format_taco_incoherent", "taco_with_rice"].includes(e.code),
  );
  if (tacoMismatch && !titleMatchesIngredients(out.title || "", out.ingredients || [], "tacos").ok) {
    if (!/\btortilla/i.test((out.ingredients || []).map((i) => i.item).join(" "))) {
      out = {
        ...out,
        meal_style: "bowl",
        title: suggestHumanMealTitle({
          protein: out.chosen_protein || "chicken",
          mealFormat: "bowl",
          ingredients: out.ingredients,
        }),
      };
      repairs.push("taco_reclassified_as_bowl");
    }
  }

  const norm = normalizeGenerateResponse(out, ctx, logSink);
  out = norm.recipe;
  repairs.push(...norm.repairs);

  const revalidation = titleMatchesIngredients(out.title || "", out.ingredients || [], out.meal_style);
  const recovered =
    repairs.length > 0 &&
    revalidation.ok &&
    (out.steps?.length || 0) >= 2 &&
    (out.ingredients?.length || 0) >= 4;

  if (repairs.length > 0) {
    trustLog(logSink, "repair", repairs.join(","));
  }

  return { recipe: out, repairs, recovered };
}
