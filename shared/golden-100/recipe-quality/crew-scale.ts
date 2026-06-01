/**
 * Intelligent crew-size scaling for Golden recipe ingredients.
 */

import type { GoldenRecipePageIngredient } from "../recipe-page-schema.js";
import { clampGoldenIngredientsForCrew, type PortionFix } from "../../recipe/crew-portion-limits.js";
import {
  CANONICAL_BASE_SERVINGS,
  CREW_SIZE_OPTIONS,
  type CrewSizeOption,
} from "../../recipe/crew-scaling-config.js";

export type { PortionFix as CrewPortionFix };
export { CANONICAL_BASE_SERVINGS, CREW_SIZE_OPTIONS, type CrewSizeOption };

/** Seasonings scale sub-linearly so 12 firefighters ≠ 6× garlic. */
const SUBLINEAR_UNITS =
  /^(tsp|tbsp|clove|cloves|pinch|dash|sprig|sprigs|bay leaf|bay leaves|stick|sticks)$/i;

const GARNISH_UNITS = /^(count|slice|slices|wedge|wedges|leaf|leaves|sprig|sprigs)$/i;

const COUNT_UNITS =
  /^(count|whole|large|medium|small|head|heads|bun|buns|loaf|loaves|can|cans|package|packages|bag|bags|egg|eggs|onion|onions|clove|cloves|stalk|stalks|bunch|bunches|fillet|fillets|breast|breasts|thigh|thighs|drumstick|drumsticks|link|links|patty|patties|wedge|wedges|slice|slices|sprig|sprigs|stick|sticks|leaf|leaves|jar|jars|bottle|bottles|roll|rolls|tortilla|tortillas)$/i;

const COUNT_NAME_HINT =
  /\b(onions?|eggs?|limes?|lemons?|garlic|cloves?|potatoes?|tomatoes?|peppers?|avocados?|apples?|bananas?|tortillas?|buns?|rolls?|links?|patties?|sausages?|breasts?|thighs?|drumsticks?|heads?|bunches?|stalks?|wedges?|slices?|cans?|jars?|bottles?|packages?|bags?)\b/i;

function parseQuantity(qty: string | undefined): number {
  if (!qty?.trim()) return 0;
  const cleaned = qty.replace(/[¼]/g, "0.25").replace(/[½]/g, "0.5").replace(/[¾]/g, "0.75");
  const mixed = cleaned.trim().match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }
  if (cleaned.includes("/")) {
    const [a, b] = cleaned.split("/").map((x) => parseFloat(x.trim()));
    if (a && b) return a / b;
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatScaledQuantity(n: number): string {
  if (n <= 0) return "";
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  const eighths = Math.round(n * 8) / 8;
  if (eighths === 0.25) return "1/4";
  if (eighths === 0.5) return "1/2";
  if (eighths === 0.75) return "3/4";
  if (eighths === 1.25) return "1 1/4";
  if (eighths === 1.5) return "1 1/2";
  if (eighths === 1.75) return "1 3/4";
  if (eighths === 0.125) return "1/8";
  if (eighths === 0.375) return "3/8";
  if (eighths === 0.625) return "5/8";
  if (eighths === 0.875) return "7/8";
  return String(Math.round(n * 10) / 10);
}

function scaleFactor(baseServings: number, targetCrew: number, unit?: string): number {
  const raw = targetCrew / Math.max(baseServings, 2);
  if (unit && SUBLINEAR_UNITS.test(unit.trim())) {
    return Math.pow(raw, 0.72);
  }
  if (unit && GARNISH_UNITS.test(unit.trim())) {
    return Math.pow(raw, 0.85);
  }
  return raw;
}

function isCountBased(ing: GoldenRecipePageIngredient): boolean {
  const unit = ing.unit?.trim() ?? "";
  if (unit && COUNT_UNITS.test(unit)) return true;
  if (!unit && ing.quantity?.trim() && COUNT_NAME_HINT.test(ing.name)) return true;
  return false;
}

/** Snap count ingredients to kitchen-friendly whole or quarter amounts. */
export function roundCountQuantity(n: number): number {
  if (n <= 0) return 0;
  if (n >= 1) return Math.max(1, Math.round(n));
  const quarter = Math.round(n * 4) / 4;
  if (quarter <= 0) return 0.25;
  return quarter;
}

export function scaleGoldenIngredients(
  ingredients: GoldenRecipePageIngredient[],
  baseServings: number,
  targetCrew: number,
): GoldenRecipePageIngredient[] {
  if (targetCrew === baseServings) {
    return clampGoldenIngredientsForCrew(ingredients, targetCrew).ingredients;
  }

  const scaled = ingredients.map((ing) => {
    const qty = parseQuantity(ing.quantity);
    if (qty <= 0) return { ...ing };

    const factor = scaleFactor(baseServings, targetCrew, ing.unit);
    let scaledQty = qty * factor;

    if (isCountBased(ing)) {
      scaledQty = roundCountQuantity(scaledQty);
    }

    return {
      ...ing,
      quantity: formatScaledQuantity(scaledQty) || ing.quantity,
    };
  });

  return clampGoldenIngredientsForCrew(scaled, targetCrew).ingredients;
}

/** Cook times stay fixed unless scaling up materially (>25% more crew). */
export function adjustCookTimeForCrew(
  baseCookMinutes: number,
  baseServings: number,
  targetCrew: number,
): number {
  if (targetCrew <= baseServings) return baseCookMinutes;
  const ratio = targetCrew / baseServings;
  if (ratio <= 1.25) return baseCookMinutes;
  const extra = targetCrew - baseServings;
  const bump = Math.min(25, Math.round(extra * 1.5));
  return Math.min(480, baseCookMinutes + bump);
}
