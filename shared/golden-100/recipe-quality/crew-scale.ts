/**
 * Intelligent crew-size scaling for Golden recipe ingredients.
 */

import type { GoldenRecipePageIngredient } from "../recipe-page-schema.js";
import {
  clampGoldenIngredientsForCrew,
  formatKitchenQuantity,
  type PortionFix,
} from "../../recipe/crew-portion-limits.js";
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
  /^(count|each|whole|large|medium|small|head|heads|bun|buns|loaf|loaves|can|cans|package|packages|bag|bags|egg|eggs|onion|onions|clove|cloves|stalk|stalks|bunch|bunches|fillet|fillets|breast|breasts|thigh|thighs|drumstick|drumsticks|link|links|patty|patties|wedge|wedges|slice|slices|sprig|sprigs|stick|sticks|leaf|leaves|jar|jars|bottle|bottles|roll|rolls|round|rounds|tortilla|tortillas)$/i;

/** Bought and served whole — "3/4 bottle" of hot sauce is not a measurement. */
const WHOLE_PURCHASE_UNITS = /^(bottle|bottles|jar|jars|loaf|loaves)$/i;

const TBSP_UNIT = /^(tbsp|tablespoons?)$/i;
const TSP_UNIT = /^(tsp|teaspoons?)$/i;
const CUP_UNIT = /^cups?$/i;

/** Measuring sets can't measure "5/8 tbsp" or "7/8 cup": snap to spoon and cup sizes crews own. */
function snapToMeasuringSize(qty: number, unit: string): { qty: number; unit: string } {
  if (TBSP_UNIT.test(unit)) {
    if (qty < 0.9) return snapToMeasuringSize(qty * 3, /^tbsp$/i.test(unit) ? "tsp" : "teaspoons");
    return { qty: Math.round(qty * 2) / 2, unit };
  }
  if (TSP_UNIT.test(unit)) {
    if (qty < 0.19) return { qty: 0.125, unit };
    return { qty: Math.round(qty * 4) / 4, unit };
  }
  if (CUP_UNIT.test(unit)) {
    const thirds = Math.round(qty * 3);
    if (thirds > 0 && thirds % 3 !== 0 && Math.abs(qty * 3 - thirds) < 0.04) return { qty: thirds / 3, unit };
    const quarters = Math.round(qty * 4) / 4;
    if (qty < 0.5 && Math.abs(qty - quarters) > 0.04) return { qty: Math.max(1, Math.round(qty * 16)), unit: "tbsp" };
    return { qty: Math.max(0.25, Math.round(qty * 4) / 4), unit };
  }
  return { qty, unit };
}

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

/**
 * Splits a combined amount string ("1 1/2 lb", "3/4 bottle", "8–10 oz", "to taste") into the
 * numeric qty + unit sent to clients. Ranges use the upper bound so shopping never runs short.
 */
export function parseAmountToQtyUnit(amount: string | undefined): { qty: number; unit: string } {
  const text = amount?.trim() ?? "";
  if (!text) return { qty: 0, unit: "" };
  const parsed = parseQuantityAndUnit(text);
  if (parsed.amount <= 0) return { qty: 0, unit: text };
  const qty = Math.max(parsed.amount, parsed.rangeEnd ?? 0);
  return { qty: Math.round(qty * 100) / 100, unit: parsed.unitText };
}

function parseQuantity(qty: string | undefined): number {
  return parseQuantityAndUnit(qty).amount;
}

export function formatScaledQuantity(n: number): string {
  return formatKitchenQuantity(n);
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
  const sameCrew = targetCrew === baseServings;

  const scaled = ingredients.map((ing) => {
    const parsed = parseQuantityAndUnit(ing.quantity);
    if (parsed.amount <= 0) return { ...ing };

    // The unit may live in the dedicated `unit` field OR be embedded as trailing text in
    // `quantity` (e.g. "3.5 lb"). Whichever is present is authoritative for scaling behavior;
    // if it came from the quantity text it must be reattached after scaling or it's lost.
    const explicitUnit = ing.unit?.trim() ?? "";
    const effectiveUnit = explicitUnit || parsed.unitText;
    if (sameCrew && explicitUnit && parsed.unitText) return { ...ing };

    const factor = sameCrew ? 1 : scaleFactor(baseServings, targetCrew, effectiveUnit);
    let scaledQty = parsed.amount * factor;
    let scaledRangeEnd = parsed.rangeEnd != null ? parsed.rangeEnd * factor : undefined;

    if (WHOLE_PURCHASE_UNITS.test(effectiveUnit)) {
      scaledQty = Math.max(1, Math.ceil(scaledQty - 0.05));
      if (scaledRangeEnd != null) scaledRangeEnd = Math.max(1, Math.ceil(scaledRangeEnd - 0.05));
    } else if (isCountBased(ing, effectiveUnit)) {
      scaledQty = roundCountQuantity(scaledQty);
      if (scaledRangeEnd != null) scaledRangeEnd = roundCountQuantity(scaledRangeEnd);
    }

    let unit = effectiveUnit;
    if (!sameCrew) {
      const snapped = snapToMeasuringSize(scaledQty, effectiveUnit);
      if (scaledRangeEnd != null) {
        const ratio = snapped.unit === effectiveUnit ? 1 : CUP_UNIT.test(effectiveUnit) ? 16 : 3;
        scaledRangeEnd = snapToMeasuringSize(scaledRangeEnd * ratio, snapped.unit).qty;
      }
      scaledQty = snapped.qty;
      unit = snapped.unit;
    }

    const formatted = formatScaledQuantity(scaledQty);
    if (!formatted) return { ...ing };

    const unitInText = !explicitUnit && parsed.unitText;
    let nextQuantity = unitInText ? `${formatted} ${unit}` : formatted;
    if (scaledRangeEnd != null) {
      const formattedEnd = formatScaledQuantity(Math.max(scaledRangeEnd, scaledQty));
      if (formattedEnd) {
        nextQuantity = unitInText
          ? `${formatted}\u2013${formattedEnd} ${unit}`
          : `${formatted}\u2013${formattedEnd}`;
      }
    }

    return {
      ...ing,
      quantity: nextQuantity,
      ...(explicitUnit && unit !== explicitUnit ? { unit } : {}),
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
