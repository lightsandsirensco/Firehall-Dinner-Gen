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

export interface ParsedQuantity {
  amount: number;
  /** Trailing unit text embedded in the quantity string (e.g. "lb" from "3.5 lb"), "" if none. */
  unitText: string;
  /** Upper bound for range quantities like "1–2" or "8–10 oz" (undefined if not a range). */
  rangeEnd?: number;
}

/**
 * Parses a free-text quantity string into a numeric amount plus any trailing unit text.
 *
 * Recipes commonly embed the unit directly in `quantity` (e.g. "1 1/2 lb", "3.5 lb", "1/2 cup")
 * rather than storing it in the separate `unit` field. The previous implementation extracted
 * only the leading number and silently discarded everything after it — permanently losing the
 * unit the moment a recipe got rescaled (see scaleGoldenIngredients). It also mis-parsed mixed
 * fractions with a trailing unit (e.g. "1 1/2 lb" naively split on "/" and returned 0.5 instead
 * of 1.5). This version captures both the correct amount AND the trailing unit text so callers
 * can reassemble a complete, correctly-scaled quantity.
 */
export function parseQuantityAndUnit(qty: string | undefined): ParsedQuantity {
  if (!qty?.trim()) return { amount: 0, unitText: "" };
  const cleaned = qty.replace(/[¼]/g, "0.25").replace(/[½]/g, "0.5").replace(/[¾]/g, "0.75").trim();

  // Range with optional trailing unit: "1–2", "8-10 oz". Without this, the generic numeric
  // regex below would grab only the first number and misparse the dash + second number as
  // bogus "unit text" (e.g. "1–2" → amount 1, unitText "–2"), corrupting the quantity on scale.
  const range = cleaned.match(/^(\d*\.?\d+)\s*[–-]\s*(\d*\.?\d+)\s*([a-zA-Z].*)?$/);
  if (range) {
    const start = parseFloat(range[1]);
    const end = parseFloat(range[2]);
    return {
      amount: Number.isFinite(start) ? start : 0,
      unitText: (range[3] ?? "").trim(),
      rangeEnd: Number.isFinite(end) ? end : undefined,
    };
  }

  // Mixed fraction with optional trailing unit: "1 1/2 lb", "1 1/2"
  const mixed = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (mixed) {
    const den = parseInt(mixed[3], 10);
    const amount = parseInt(mixed[1], 10) + (den ? parseInt(mixed[2], 10) / den : 0);
    return { amount, unitText: mixed[4].trim() };
  }

  // Simple fraction with optional trailing unit: "1/2 cup", "3/4"
  const frac = cleaned.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (frac) {
    const den = parseInt(frac[2], 10);
    const amount = den ? parseInt(frac[1], 10) / den : 0;
    return { amount, unitText: frac[3].trim() };
  }

  // Decimal/integer with optional trailing unit: "3.5 lb", "2 cups", "2.4"
  const num = cleaned.match(/^(\d*\.?\d+)\s*(.*)$/);
  if (num) {
    const amount = parseFloat(num[1]);
    return { amount: Number.isFinite(amount) ? amount : 0, unitText: num[2].trim() };
  }

  return { amount: 0, unitText: "" };
}

function parseQuantity(qty: string | undefined): number {
  return parseQuantityAndUnit(qty).amount;
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

function isCountBased(ing: GoldenRecipePageIngredient, effectiveUnit: string): boolean {
  if (effectiveUnit && COUNT_UNITS.test(effectiveUnit)) return true;
  if (!effectiveUnit && ing.quantity?.trim() && COUNT_NAME_HINT.test(ing.name)) return true;
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
    const parsed = parseQuantityAndUnit(ing.quantity);
    if (parsed.amount <= 0) return { ...ing };

    // The unit may live in the dedicated `unit` field OR be embedded as trailing text in
    // `quantity` (e.g. "3.5 lb"). Whichever is present is authoritative for scaling behavior;
    // if it came from the quantity text it must be reattached after scaling or it's lost.
    const explicitUnit = ing.unit?.trim() ?? "";
    const effectiveUnit = explicitUnit || parsed.unitText;

    const factor = scaleFactor(baseServings, targetCrew, effectiveUnit);
    let scaledQty = parsed.amount * factor;
    let scaledRangeEnd = parsed.rangeEnd != null ? parsed.rangeEnd * factor : undefined;

    if (isCountBased(ing, effectiveUnit)) {
      scaledQty = roundCountQuantity(scaledQty);
      if (scaledRangeEnd != null) scaledRangeEnd = roundCountQuantity(scaledRangeEnd);
    }

    const formatted = formatScaledQuantity(scaledQty);
    if (!formatted) return { ...ing };

    let nextQuantity = !explicitUnit && parsed.unitText ? `${formatted} ${parsed.unitText}` : formatted;
    if (scaledRangeEnd != null) {
      const formattedEnd = formatScaledQuantity(Math.max(scaledRangeEnd, scaledQty));
      if (formattedEnd) {
        nextQuantity = !explicitUnit && parsed.unitText
          ? `${formatted}\u2013${formattedEnd} ${parsed.unitText}`
          : `${formatted}\u2013${formattedEnd}`;
      }
    }

    return {
      ...ing,
      quantity: nextQuantity,
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
