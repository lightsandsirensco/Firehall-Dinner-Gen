import type { RecipeNutritionPerServing } from "./types.js";

export interface NutritionValidationIssue {
  code: "missing" | "negative" | "impossible" | "suspicious";
  field?: keyof RecipeNutritionPerServing;
  message: string;
}

export function validateNutritionPerServing(
  macros: Partial<RecipeNutritionPerServing> | null | undefined,
  context?: { slug?: string; mealType?: string },
): NutritionValidationIssue[] {
  const issues: NutritionValidationIssue[] = [];
  if (!macros) {
    issues.push({ code: "missing", message: "No nutrition data" });
    return issues;
  }

  const fields: Array<keyof RecipeNutritionPerServing> = ["calories", "protein", "carbs", "fat"];
  for (const field of fields) {
    const v = macros[field];
    if (v == null || Number.isNaN(v)) {
      issues.push({ code: "missing", field, message: `Missing ${field}` });
    } else if (v < 0) {
      issues.push({ code: "negative", field, message: `Negative ${field}: ${v}` });
    }
  }

  if (issues.some((i) => i.code === "missing" || i.code === "negative")) return issues;

  const { calories, protein, carbs, fat } = macros as RecipeNutritionPerServing;
  const macroCal = protein * 4 + carbs * 4 + fat * 9;
  const ratio = macroCal / Math.max(calories, 1);

  if (calories > 1600) {
    issues.push({ code: "impossible", field: "calories", message: `Calories too high (${calories})` });
  }
  if (calories < 80 && (context?.mealType !== "smoothie")) {
    issues.push({ code: "suspicious", field: "calories", message: `Calories unusually low (${calories})` });
  }
  if (protein > 120) {
    issues.push({ code: "impossible", field: "protein", message: `Protein too high (${protein}g)` });
  }
  if (ratio < 0.55 || ratio > 1.45) {
    issues.push({
      code: "suspicious",
      message: `Macro calories (${Math.round(macroCal)}) diverge from label (${calories})`,
    });
  }

  return issues;
}

export function hasCompleteNutrition(macros: Partial<RecipeNutritionPerServing> | null | undefined): boolean {
  return validateNutritionPerServing(macros).every((i) => i.code !== "missing" && i.code !== "negative");
}
