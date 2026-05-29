/**
 * Intelligent crew-size scaling for Golden recipe ingredients.
 */

import type { GoldenRecipePageIngredient } from "../recipe-page-schema.js";

export const CREW_SIZE_OPTIONS = [2, 4, 6, 8, 10, 12] as const;
export type CrewSizeOption = (typeof CREW_SIZE_OPTIONS)[number];

/** Seasonings scale sub-linearly so 12 firefighters ≠ 6× garlic. */
const SUBLINEAR_UNITS =
  /^(tsp|tbsp|clove|cloves|pinch|dash|sprig|sprigs|bay leaf|bay leaves|stick|sticks)$/i;

const GARNISH_UNITS = /^(count|slice|slices|wedge|wedges|leaf|leaves|sprig|sprigs)$/i;

const COUNT_UNITS = /^(count|bun|buns|loaf|loaves|can|cans|package|packages|bag|bags)$/i;

function parseQuantity(qty: string | undefined): number {
  if (!qty?.trim()) return 0;
  const cleaned = qty.replace(/[¼]/g, "0.25").replace(/[½]/g, "0.5").replace(/[¾]/g, "0.75");
  if (cleaned.includes("/")) {
    const [a, b] = cleaned.split("/").map((x) => parseFloat(x.trim()));
    if (a && b) return a / b;
  }
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function formatQuantity(n: number): string {
  if (n <= 0) return "";
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  const eighths = Math.round(n * 8) / 8;
  if (eighths === 0.25) return "1/4";
  if (eighths === 0.5) return "1/2";
  if (eighths === 0.75) return "3/4";
  if (eighths === 1.25) return "1 1/4";
  if (eighths === 1.5) return "1 1/2";
  if (eighths === 1.75) return "1 3/4";
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

export function scaleGoldenIngredients(
  ingredients: GoldenRecipePageIngredient[],
  baseServings: number,
  targetCrew: number,
): GoldenRecipePageIngredient[] {
  if (targetCrew === baseServings) return ingredients;

  return ingredients.map((ing) => {
    const qty = parseQuantity(ing.quantity);
    if (qty <= 0) return { ...ing };

    const factor = scaleFactor(baseServings, targetCrew, ing.unit);
    let scaled = qty * factor;

    if (ing.unit && COUNT_UNITS.test(ing.unit.trim())) {
      scaled = Math.max(1, Math.round(scaled));
    }

    return {
      ...ing,
      quantity: formatQuantity(scaled) || ing.quantity,
    };
  });
}

export function adjustCookTimeForCrew(
  baseCookMinutes: number,
  baseServings: number,
  targetCrew: number,
): number {
  if (targetCrew <= baseServings) return baseCookMinutes;
  const extra = targetCrew - baseServings;
  const bump = Math.min(25, Math.round(extra * 1.5));
  return Math.min(480, baseCookMinutes + bump);
}
