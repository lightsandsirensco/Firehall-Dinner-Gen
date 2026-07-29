/**
 * Global nutrition sanity rules — permanent QA gates that flag structurally implausible
 * per-serving macros regardless of which specific recipe they belong to. These are in
 * addition to the generic math checks in validate.ts (missing/negative/macro-divergence).
 */
import type { RecipeNutritionPerServing } from "./types.js";
import { classifyMealRole, isFullMealRole, type MealRole } from "./meal-role.js";

export interface SanityIssue {
  code: string;
  message: string;
}

export interface SanityRuleContext {
  title?: string;
  subtitle?: string;
  shortDescription?: string;
  tags?: string[];
  mealType?: "dinner" | "breakfast" | "smoothie" | string;
  /** Sum of all non-optional ingredient weights in grams, batch total (not per serving). */
  totalIngredientGrams?: number;
}

const CHICKEN_RE = /\b(chicken|poultry)\b/i;
const BEEF_RE = /\b(beef|brisket|short rib|pot roast|meatloaf|burger|steak burger)\b/i;
const STEAK_RE = /\b(steak|ribeye|sirloin|strip steak|ny strip|tri-tip|tri tip|picanha|flank steak|skirt steak|filet mignon|prime rib)\b/i;
const SAUSAGE_BACON_RE = /\b(sausage|bacon|linguica|bratwurst|chorizo|scrapple|ham)\b/i;

export function evaluateGlobalSanityRules(
  macros: RecipeNutritionPerServing,
  ctx: SanityRuleContext,
): { role: MealRole; issues: SanityIssue[] } {
  const role = classifyMealRole(ctx);
  const issues: SanityIssue[] = [];

  if (!isFullMealRole(role)) {
    // Sides, sauces, salads, condiments, and appetizer boards are not expected to carry a
    // full meal's worth of calories/protein — they're exempt from the entree-level floors below.
    return { role, issues };
  }

  const haystack = `${ctx.title ?? ""} ${ctx.subtitle ?? ""} ${ctx.shortDescription ?? ""} ${(ctx.tags ?? []).join(" ")}`;

  if (ctx.mealType === "breakfast" && SAUSAGE_BACON_RE.test(haystack) && macros.protein < 15) {
    issues.push({
      code: "low_protein_breakfast_meat",
      message: `Breakfast with sausage/bacon under 15g protein (${macros.protein}g)`,
    });
  }

  if (STEAK_RE.test(haystack) && macros.protein < 25) {
    issues.push({
      code: "low_protein_steak",
      message: `Steak entrée under 25g protein (${macros.protein}g)`,
    });
  } else if ((CHICKEN_RE.test(haystack) || BEEF_RE.test(haystack)) && macros.protein < 20) {
    issues.push({
      code: "low_protein_entree",
      message: `Chicken/beef entrée under 20g protein (${macros.protein}g)`,
    });
  }

  if (ctx.totalIngredientGrams != null && ctx.totalIngredientGrams > 700 && macros.calories > 0 && macros.calories < 250) {
    issues.push({
      code: "heavy_meal_low_calorie",
      message: `Meal uses over 700g of ingredients but reports under 250 calories (${macros.calories})`,
    });
  }

  return { role, issues };
}
