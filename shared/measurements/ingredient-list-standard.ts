/**
 * Catalog ingredient list standardization — Title Case names + kitchen abbreviations.
 */

import { formatIngredientDisplayName } from "./ingredient-names.js";
import { parseQuantityString } from "./convert.js";

export { formatIngredientDisplayName as standardizeIngredientName } from "./ingredient-names.js";

const UNIT_ALIASES: Record<string, string> = {
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cup: "cup",
  cups: "cup",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
};

function normalizeUnitKey(unit: string): string | null {
  const key = unit.trim().toLowerCase().replace(/\s+/g, " ");
  return UNIT_ALIASES[key] ?? null;
}

/** Standardize common imperial abbreviations: Tbsp, Tsp, Cup/Cups, Lb, Oz. */
export function standardizeIngredientUnit(
  unit: string | undefined,
  quantity?: string | undefined,
): string | undefined {
  const trimmed = unit?.trim();
  if (!trimmed) return unit;

  const key = normalizeUnitKey(trimmed);
  if (!key) return trimmed;

  switch (key) {
    case "tbsp":
      return "Tbsp";
    case "tsp":
      return "Tsp";
    case "lb":
      return "Lb";
    case "oz":
      return "Oz";
    case "cup": {
      const qty = parseQuantityString(quantity);
      return qty !== null && qty > 1 ? "Cups" : "Cup";
    }
    default:
      return trimmed;
  }
}

export function standardizeIngredientFields(ingredient: {
  name?: string;
  quantity?: string;
  unit?: string;
}): { name?: string; quantity?: string; unit?: string; changed: boolean } {
  const result = { ...ingredient, changed: false };

  const name = (ingredient.name || "").trim();
  if (name) {
    const fixedName = formatIngredientDisplayName(name);
    if (fixedName !== name) {
      result.name = fixedName;
      result.changed = true;
    }
  }

  if (ingredient.unit !== undefined) {
    const fixedUnit = standardizeIngredientUnit(ingredient.unit, ingredient.quantity);
    if (fixedUnit !== ingredient.unit) {
      result.unit = fixedUnit;
      result.changed = true;
    }
  }

  return result;
}
