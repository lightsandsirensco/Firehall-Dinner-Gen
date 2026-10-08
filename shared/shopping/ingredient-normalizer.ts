/**
 * Smart Shopping — IngredientNormalizer.
 *
 * Turns a raw recipe ingredient line ("3.2 lb boneless, skinless chicken
 * thighs") into a canonical key ("chicken thigh") plus a parsed quantity, so
 * the same ingredient from two different recipes combines into one shopping
 * list line instead of two.
 */

import { classifyDepartment } from "./departments";
import { parseShoppingQuantity } from "./quantity-parser";
import type {
  Department,
  RawRecipeIngredient,
  ShoppingItemContribution,
  ShoppingQuantity,
} from "./types";
import {
  baseFactor,
  chooseDisplayUnit,
  displayUnit,
  roundUpForPurchase,
  unitFamily,
  unitsMatchSystem,
  type ShoppingUnitSystem,
} from "./units";
export interface ParsedQuantity {
  /** Purchase quantity — upper bound for ranges. */
  value: number;
  /** Lower bound, only for ranges. */
  min?: number;
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

/**
 * Plurals the generic 4+-letter "-s" rule misses or mangles. Word-level and
 * explicit so stored pantry keys can be migrated exactly (see
 * migratePantryProfileKeys).
 */
export const IRREGULAR_PLURALS: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  mangoes: "mango",
  eggs: "egg",
  peas: "pea",
  oats: "oat",
  ribs: "rib",
  buns: "bun",
  figs: "fig",
  yams: "yam",
  nuts: "nut",
};

/** Canonicalize a display name into a merge key ("Chicken Thighs, boneless" -> "chicken thigh"). */
export function canonicalizeIngredientName(name: string): string {
  let key = name.toLowerCase();
  key = key.replace(/\([^)]*\)/g, " "); // drop parenthetical asides
  // Keep the first comma segment that names something: "Onion, diced" -> "onion",
  // "Boneless, Skinless Chicken Thighs" -> "chicken thighs".
  const segments = key.split(",").map((seg) => seg.replace(QUALIFIER_WORDS, " ").trim());
  key = segments.find((seg) => /[a-z0-9]/.test(seg)) ?? "";
  key = key.replace(/&/g, " and ");
  key = key.replace(/[^a-z0-9 ]/g, " ");
  key = key.replace(/\s+/g, " ").trim();
  key = key.replace(/\b[a-z]+\b/g, (w) => IRREGULAR_PLURALS[w] ?? w);
  // Light singularization so "onions" and "onion" merge.
  key = key.replace(/\b(\w{4,})s\b/g, "$1");
  return key || name.toLowerCase().trim();
}

const OPTIONAL_MARKER = /\(\s*optional\b[^)]*\)/i;

/** A notes clause (split on , ; or an em dash) that begins with "optional". */
const OPTIONAL_NOTES_CLAUSE = /(?:^|[,;—])\s*optional\b/i;

/**
 * One rule for every shopping entry point (recipe page, Shift Planner,
 * history reuse): explicit `optional: true`, a name containing "(optional)",
 * or a notes clause that starts with "optional" ("optional heat",
 * "chopped, optional", "adds texture; optional"). "Optional" qualifying a
 * prep detail ("seeds optional", "plus optional bacon") keeps the ingredient.
 */
export function isOptionalIngredient(raw: RawRecipeIngredient): boolean {
  if (raw.optional === true) return true;
  if (OPTIONAL_MARKER.test(raw.name)) return true;
  if (raw.notes && (OPTIONAL_NOTES_CLAUSE.test(raw.notes) || OPTIONAL_MARKER.test(raw.notes))) return true;
  if (raw.quantity && /^\s*optional\s*$/i.test(raw.quantity)) return true;
  return false;
}

/** Parse "1 1/2", "3.2", "1/2", "¾", "1-2" style quantity strings into a number (upper bound for ranges). */
export function parseQuantityValue(raw: string | undefined): number {
  return parseShoppingQuantity(raw)?.value ?? 0;
}

export function formatQuantityValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Format a value+unit pair for display, e.g. (2, "lb") -> "2 lb", (2, "cup") -> "2 cups". */
export function formatQuantityLabel(value: number, unit: string, min?: number): string {
  if (value <= 0) return displayUnit(unit, 1);
  const amount =
    min !== undefined && min < value
      ? `${formatQuantityValue(min)}\u2013${formatQuantityValue(value)}`
      : formatQuantityValue(value);
  const label = displayUnit(unit, value);
  return label ? `${amount} ${label}` : amount;
}

/** Normalize a single raw recipe ingredient into a canonical, classified shape. */
export function normalizeIngredient(raw: RawRecipeIngredient): NormalizedIngredient {
  const displayName = raw.name.trim();
  const canonicalKey = canonicalizeIngredientName(displayName);
  const department = classifyDepartment(displayName, raw.notes || "");
  const parsed = parseShoppingQuantity(raw.quantity, raw.unit);

  return {
    canonicalKey,
    displayName,
    department,
    parsed,
    rawQuantity: [raw.quantity, raw.unit].filter(Boolean).join(" ").trim(),
    notes: raw.notes,
  };
}

interface QuantityGroup {
  family: ReturnType<typeof unitFamily>;
  units: string[];
  /** Sum of upper bounds, in base units (ml/g) for convertible families, else in `units[0]`. */
  max: number;
  min: number;
  hasRange: boolean;
}

function groupKey(unit: string): string {
  const fam = unitFamily(unit);
  return fam === "volume" || fam === "mass" || fam === "count" ? fam : `other:${unit}`;
}

function collectGroups(contributions: ShoppingItemContribution[]): {
  groups: Map<string, QuantityGroup>;
  textOnly: string[];
} {
  const groups = new Map<string, QuantityGroup>();
  const textOnly: string[] = [];

  for (const c of contributions) {
    if (c.value <= 0) {
      const text = c.rawQuantity.trim();
      if (text && !textOnly.some((t) => t.toLowerCase() === text.toLowerCase())) textOnly.push(text);
      continue;
    }
    const key = groupKey(c.unit);
    const factor = baseFactor(c.unit) ?? 1;
    const lo = (c.min ?? c.value) * factor;
    const hi = c.value * factor;
    const g = groups.get(key);
    if (g) {
      if (!g.units.includes(c.unit)) g.units.push(c.unit);
      g.max += hi;
      g.min += lo;
      g.hasRange ||= c.min !== undefined;
    } else {
      groups.set(key, {
        family: unitFamily(c.unit),
        units: [c.unit],
        max: hi,
        min: lo,
        hasRange: c.min !== undefined,
      });
    }
  }
  return { groups, textOnly };
}

function resolveGroup(group: QuantityGroup, system?: ShoppingUnitSystem): ShoppingQuantity {
  const { family, units } = group;

  if (family === "count") {
    const unit = units.includes("count") ? "count" : "";
    return toQuantity(family, unit, group.max, group.hasRange ? group.min : undefined);
  }
  if (family === "other") {
    return toQuantity(family, units[0], group.max, group.hasRange ? group.min : undefined);
  }

  // Same-family volume/mass: keep the recipe's own unit when every contribution
  // agrees (and it already fits the requested system) — exact sum, no rounding.
  const single = units.length === 1 && (!system || unitsMatchSystem(units, system));
  if (single) {
    const factor = baseFactor(units[0])!;
    return toQuantity(family, units[0], group.max / factor, group.hasRange ? group.min / factor : undefined);
  }

  const unit = chooseDisplayUnit(family, group.max, units, system);
  const factor = baseFactor(unit)!;
  const max = roundUpForPurchase(group.max / factor, unit);
  const min = group.hasRange ? roundUpForPurchase(group.min / factor, unit) : undefined;
  return toQuantity(family, unit, max, min);
}

function toQuantity(
  family: ShoppingQuantity["family"],
  unit: string,
  value: number,
  min?: number,
): ShoppingQuantity {
  const q: ShoppingQuantity = { family, unit, value: Math.round(value * 1000) / 1000 };
  if (min !== undefined && min < value) q.min = Math.round(min * 1000) / 1000;
  return q;
}

/**
 * Structured purchase quantities for a merged item: one entry per
 * compatible unit family (volume, mass, count, or each distinct other unit).
 * Incompatible units are never coerced into each other.
 */
export function mergeContributionQuantities(
  contributions: ShoppingItemContribution[],
  system?: ShoppingUnitSystem,
): { quantities: ShoppingQuantity[]; textOnly: string[] } {
  const { groups, textOnly } = collectGroups(contributions);
  const quantities = [...groups.values()].map((g) => resolveGroup(g, system));
  return { quantities, textOnly };
}

export function formatShoppingQuantities(quantities: ShoppingQuantity[], textOnly: string[] = []): string {
  return [...quantities.map((q) => formatQuantityLabel(q.value, q.unit, q.min)), ...textOnly].join(" + ");
}

/**
 * Combine per-recipe contributions of the same ingredient into one display
 * label. Compatible units are converted and summed ("1 tsp + 1 tbsp" ->
 * "1.5 tbsp"); incompatible ones are shown side by side ("2 lb + 3 cans")
 * rather than incorrectly coerced.
 */
export function mergeContributions(
  contributions: ShoppingItemContribution[],
  system?: ShoppingUnitSystem,
): string {
  if (contributions.length === 0) return "";
  const { quantities, textOnly } = mergeContributionQuantities(contributions, system);
  return formatShoppingQuantities(quantities, textOnly);
}
