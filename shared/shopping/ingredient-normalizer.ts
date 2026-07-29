/**
 * Smart Shopping — IngredientNormalizer.
 *
 * Turns a raw recipe ingredient line ("3.2 lb boneless, skinless chicken
 * thighs") into a canonical key ("chicken thigh") plus a parsed quantity, so
 * the same ingredient from two different recipes combines into one shopping
 * list line instead of two.
 */

import { classifyDepartment } from "./departments";
import type { Department, RawRecipeIngredient, ShoppingItemContribution } from "./types";

export interface ParsedQuantity {
  value: number;
  unit: string;
}

export interface NormalizedIngredient {
  canonicalKey: string;
  displayName: string;
  department: Department;
  parsed: ParsedQuantity | null;
  rawQuantity: string;
  notes?: string;
}

/** Prep/qualifier words stripped from the canonical key so variants merge. */
const QUALIFIER_WORDS =
  /\b(boneless|skinless|bone-in|skin-on|fresh|frozen|canned|cooked|raw|large|medium|small|extra|lean|organic|diced|sliced|chopped|minced|shredded|grated|crushed|whole|to taste|for garnish|optional)\b/gi;

const UNIT_ALIASES: Record<string, string> = {
  cup: "cup", cups: "cup",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", liter: "l", liters: "l",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  can: "can", cans: "can",
  bunch: "bunch", bunches: "bunch",
  head: "head", heads: "head",
  stalk: "stalk", stalks: "stalk",
  sprig: "sprig", sprigs: "sprig",
  count: "count", whole: "count",
  package: "package", packages: "package", pkg: "package",
  bag: "bag", bags: "bag",
  jar: "jar", jars: "jar",
  bottle: "bottle", bottles: "bottle",
};

/** Canonicalize a display name into a merge key ("Chicken Thighs, boneless" -> "chicken thigh"). */
export function canonicalizeIngredientName(name: string): string {
  let key = name.toLowerCase();
  key = key.replace(/\([^)]*\)/g, " "); // drop parenthetical asides
  key = key.replace(/,.*/, " "); // drop trailing ", boneless skinless" style qualifiers
  key = key.replace(QUALIFIER_WORDS, " ");
  key = key.replace(/[^a-z0-9 ]/g, " ");
  key = key.replace(/\s+/g, " ").trim();
  // Light singularization so "onions" and "onion" merge.
  key = key.replace(/\b(\w{4,})s\b/g, "$1");
  return key || name.toLowerCase().trim();
}

export function normalizeUnit(unit: string): string {
  const key = unit.trim().toLowerCase();
  return UNIT_ALIASES[key] || key;
}

/** Parse "1 1/2", "3.2", "1/2", "¾" style quantity strings into a number. */
export function parseQuantityValue(raw: string | undefined): number {
  if (!raw?.trim()) return 0;
  const cleaned = raw
    .trim()
    .replace(/¼/g, "0.25")
    .replace(/½/g, "0.5")
    .replace(/¾/g, "0.75")
    .replace(/⅓/g, "0.333")
    .replace(/⅔/g, "0.667");

  const mixed = cleaned.match(/^(\d+)\s+(\d+)\/(\d+)/);
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

export function formatQuantityValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Format a value+unit pair for display, e.g. (2, "lb") -> "2 lb". */
export function formatQuantityLabel(value: number, unit: string): string {
  if (value <= 0) return unit || "";
  const display = formatQuantityValue(value);
  return unit ? `${display} ${unit}` : display;
}

/** Normalize a single raw recipe ingredient into a canonical, classified shape. */
export function normalizeIngredient(raw: RawRecipeIngredient): NormalizedIngredient {
  const displayName = raw.name.trim();
  const canonicalKey = canonicalizeIngredientName(displayName);
  const department = classifyDepartment(displayName, raw.notes || "");
  const unit = normalizeUnit(raw.unit || "");
  const value = parseQuantityValue(raw.quantity);

  return {
    canonicalKey,
    displayName,
    department,
    parsed: value > 0 ? { value, unit } : null,
    rawQuantity: [raw.quantity, raw.unit].filter(Boolean).join(" ").trim(),
    notes: raw.notes,
  };
}

/**
 * Combine per-recipe contributions of the same ingredient into one display
 * label. Same-unit contributions are summed; differing units are shown
 * side by side (e.g. "2 lb + 3 cans") rather than incorrectly coerced.
 */
export function mergeContributions(contributions: ShoppingItemContribution[]): string {
  if (contributions.length === 0) return "";

  const byUnit = new Map<string, number>();
  const unitless: string[] = [];

  for (const c of contributions) {
    if (!c.unit && c.value <= 0) {
      if (c.rawQuantity.trim()) unitless.push(c.rawQuantity.trim());
      continue;
    }
    byUnit.set(c.unit, (byUnit.get(c.unit) || 0) + c.value);
  }

  const parts: string[] = [];
  for (const [unit, total] of byUnit.entries()) {
    parts.push(formatQuantityLabel(total, unit));
  }
  parts.push(...unitless);

  return parts.join(" + ");
}
