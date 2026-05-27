/**
 * Normalization pipeline — run before validation on legacy GenerateResponse payloads.
 */

import type { GenerateResponse, IngredientItem } from "../schema.js";
import {
  normalizeIngredientsUsed,
  repairRecipeTitle,
} from "../generation-reliability.js";
import { normalizeRecipeTitle } from "../recipe-title-quality.js";
import { normalizeRecipeTags } from "../recipe-tags.js";
import { coerceCuisine, coerceMealType, coerceProtein } from "./tags.js";
import {
  normalizeIngredientName,
  normalizeUnit,
  parseQuantityAmount,
} from "./normalization.js";
import { sanitizeGenerateResponseCopy } from "./sanitize.js";
import type { RecipeTrustLogSink } from "./logger.js";
import { trustLog } from "./logger.js";

export interface NormalizeContext {
  mealFormat?: string;
  protein?: string;
  cuisine?: string;
  crewSize?: number;
}

export interface NormalizeResult {
  recipe: GenerateResponse;
  repairs: string[];
}

function dedupeIngredients(items: IngredientItem[]): IngredientItem[] {
  const seen = new Set<string>();
  const out: IngredientItem[] = [];
  for (const raw of items) {
    const name = normalizeIngredientName(raw.item || "").toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const parsed = parseQuantityAmount(raw.amount || "");
    out.push({
      item: normalizeIngredientName(raw.item || ""),
      amount: raw.amount?.trim() || [parsed.quantity, parsed.unit].filter(Boolean).join(" "),
      notes: (raw.notes || "").trim(),
    });
  }
  return out;
}

function normalizeIngredientList(items: IngredientItem[]): IngredientItem[] {
  return dedupeIngredients(items).map((ing) => {
    const parsed = parseQuantityAmount(ing.amount);
    const unit = normalizeUnit(parsed.unit);
    const amount =
      ing.amount?.trim() ||
      [parsed.quantity, unit].filter((x) => x !== "" && x != null).join(" ");
    return {
      item: normalizeIngredientName(ing.item),
      amount,
      notes: ing.notes?.trim() || "",
    };
  });
}

/** Full normalize pass for generator output. */
export function normalizeGenerateResponse(
  recipe: GenerateResponse,
  ctx: NormalizeContext = {},
  logSink?: RecipeTrustLogSink,
): NormalizeResult {
  const repairs: string[] = [];
  let out = sanitizeGenerateResponseCopy({ ...recipe });

  const beforeTitle = out.title;
  out = normalizeIngredientsUsed(out);
  if ((out.ingredients_used || []).length > (recipe.ingredients_used || []).length) {
    repairs.push("ingredients_used_filled");
    trustLog(logSink, "ingredient_repair", "filled ingredients_used");
  }

  out = repairRecipeTitle(out, ctx.mealFormat || out.meal_style);
  const humanTitle = normalizeRecipeTitle({
    title: out.title,
    meal_style: ctx.mealFormat || out.meal_style,
    chosen_protein: ctx.protein || out.chosen_protein,
    ingredients: out.ingredients,
    tags: out.tags,
  });
  if (humanTitle !== out.title) {
    out = { ...out, title: humanTitle };
    repairs.push("title_normalized");
    trustLog(logSink, "title_repair", `"${beforeTitle}" → "${humanTitle}"`);
  }

  const protein = coerceProtein(ctx.protein || out.chosen_protein);
  const mealStyle = coerceMealType(ctx.mealFormat || out.meal_style);
  const cuisine = coerceCuisine(ctx.cuisine || out.tags?.cuisine);

  if (out.chosen_protein !== protein) {
    out = { ...out, chosen_protein: protein, primary_protein_source: protein };
    repairs.push("protein_coerced");
  }
  if (out.meal_style !== mealStyle) {
    out = { ...out, meal_style: mealStyle };
    repairs.push("meal_type_coerced");
  }

  const beforeIng = out.ingredients?.length || 0;
  out = {
    ...out,
    ingredients: normalizeIngredientList(out.ingredients || []),
    tags: normalizeRecipeTags(out.tags, { cuisine, cooking_method: out.tags?.cooking_method }),
  };
  if ((out.ingredients?.length || 0) < beforeIng) {
    repairs.push("ingredients_deduped");
    trustLog(logSink, "ingredient_repair", `deduped ${beforeIng} → ${out.ingredients?.length}`);
  }

  if (repairs.length > 0) {
    trustLog(logSink, "normalize", repairs.join(","));
  }

  return { recipe: out, repairs };
}

/** @deprecated Use normalizeGenerateResponse — alias for pipeline clarity */
export const normalizeRecipe = normalizeGenerateResponse;
