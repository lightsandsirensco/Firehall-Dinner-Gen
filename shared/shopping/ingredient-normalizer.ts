/**
 * Smart Shopping — IngredientNormalizer.
 *
 * Turns a raw recipe ingredient line ("3.2 lb boneless, skinless chicken
 * thighs") into a canonical key ("chicken thigh") plus a parsed quantity, so
 * the same ingredient from two different recipes combines into one shopping
 * list line instead of two.
 */

import { formatKitchenFraction } from "../measurements/fractions";
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

/**
 * Prep/size words stripped from the canonical key so variants merge. Purchase
 * forms stay in the key — frozen spinach, canned tomatoes and fresh
 * mozzarella are different products from their plain namesakes.
 */
const QUALIFIER_WORDS =
  /\b(boneless|skinless|bone-in|skin-on|fresh(?! mozzarella)|cooked|raw|large|medium|small|extra|lean|organic|diced|sliced|chopped|minced|shredded|grated|crushed|whole|ripe|peeled|melted|softened|packed|crumbled|steamed|to taste|for garnish|optional)\b/gi;

/**
 * Words naming a piece or pack of the product rather than a different product
 * ("garlic cloves" is garlic, "basil leaves" is basil). Applied after
 * singularization, only alongside the products they describe.
 */
const PART_WORDS: Array<[RegExp, RegExp]> = [
  [/\bclove\b/g, /\bgarlic\b/],
  [/\b(?:stalk|stick|rib)\b/g, /\b(?:celery|lemongrass)\b/],
  [/\b(?:sprig|leaf|leave)\b/g, /\b(?:basil|mint|sage|thyme|rosemary|oregano|cilantro|parsley|tarragon|dill|shiso|epazote)\b/],
  [/\b(?:floret|crown)\b/g, /\b(?:broccoli|cauliflower)\b/],
  [/\bwedge\b/g, /\b(?:lemon|lime)\b/],
  [/\bfrond\b/g, /\bdill\b/],
  [/\blink\b/g, /\b(?:sausage|kielbasa|andouille|chorizo)\b/],
  [/\b(?:loaf|loave)\b/g, /\b(?:bread|baguette|scrapple)\b/],
  [/\bslice\b/g, /\b(?:pepperoni|cheese|provolone|swis|american|salami|ham|turkey|bacon)\b/],
  [/\b(?:bunch|head)\b/g, /./],
];

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
  chilies: "chili",
  chillies: "chili",
};

/** Canonicalize a display name into a merge key ("Chicken Thighs, boneless" -> "chicken thigh"). */
export function canonicalizeIngredientName(name: string): string {
  let key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
  for (const [part, product] of PART_WORDS) {
    if (!product.test(key)) continue;
    const stripped = key.replace(part, " ").replace(/^\s*of\s+/, "").replace(/\s+of\s*$/, "").replace(/\s+/g, " ").trim();
    if (stripped) key = stripped;
  }
  key = dropDefaultForm(key, "canned", "Pantry & Canned Goods");
  key = dropDefaultForm(key, "frozen", "Frozen Foods");
  key = dropDefaultForm(key, "dried", "Spices & Seasonings");
  return key || name.toLowerCase().trim();
}

/**
 * "canned chickpeas" and "chickpeas" are the same can; "canned tomatoes" and
 * "tomatoes" are not. Drop the form word only when the plain item is normally
 * bought in that form anyway.
 */
function dropDefaultForm(key: string, form: string, aisle: Department): string {
  if (!new RegExp(`\\b${form}\\b`).test(key)) return key;
  const plain = key.replace(new RegExp(`\\b${form}\\b`), " ").replace(/\s+/g, " ").trim();
  if (!plain) return key;
  return classifyDepartment(plain) === aisle || classifyDepartment(`${plain}s`) === aisle ? plain : key;
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

const NOT_PURCHASED = /^(?:(?:warm|cold|hot|boiling|ice|lukewarm|tap|filtered|reserved pasta|pasta cooking)\s+)*water$|^(?:ice|ice cubes|pan drippings|reserved drippings|reserved marinade)$/;

/** Kitchen-supplied lines (tap water, ice, pan drippings) that never belong on a grocery list. */
export function isNotPurchased(name: string): boolean {
  const key = name.toLowerCase().replace(/\([^)]*\)/g, " ").split(",")[0]!.replace(/\s+/g, " ").trim();
  return NOT_PURCHASED.test(key);
}

/** Parse "1 1/2", "3.2", "1/2", "¾", "1-2" style quantity strings into a number (upper bound for ranges). */
export function parseQuantityValue(raw: string | undefined): number {
  return parseShoppingQuantity(raw)?.value ?? 0;
}

export { formatKitchenFraction };

/** Metric amounts stay decimal (g/ml whole, kg/L one place); everything else reads as a kitchen fraction. */
export function formatQuantityValue(value: number, unit = ""): string {
  if (unit === "g" || unit === "ml") return String(Math.round(value));
  if (unit === "kg" || unit === "l") return String(Math.round(value * 10) / 10);
  return formatKitchenFraction(value);
}

/** Format a value+unit pair for display, e.g. (2, "lb") -> "2 lb", (1.25, "cup") -> "1¼ cups". */
export function formatQuantityLabel(value: number, unit: string, min?: number): string {
  if (value <= 0) return displayUnit(unit, 1);
  const amount =
    min !== undefined && min < value
      ? `${formatQuantityValue(min, unit)}\u2013${formatQuantityValue(value, unit)}`
      : formatQuantityValue(value, unit);
  const label = unit === "count" ? "" : displayUnit(unit, value);
  return label ? `${amount} ${label}` : amount;
}

/** The aisle a bare canonical key implies, tolerating the singularized key ("chickpea"). */
function keyDepartment(key: string): Department {
  const direct = classifyDepartment(key);
  return direct !== "Other" ? direct : classifyDepartment(`${key}s`);
}

const FORM_PREFIX: Partial<Record<Department, string>> = {
  "Pantry & Canned Goods": "canned",
  "Frozen Foods": "frozen",
  "Spices & Seasonings": "dried",
  "Condiments, Sauces & Oils": "jarred",
  Produce: "fresh",
};

/**
 * Two lines merge only when they're the same product from the same aisle.
 * When a line's aisle differs from what its bare key implies ("diced
 * tomatoes", 2 cans -> Pantry, but "tomato" is Produce), the key gains the
 * purchase form so canned and fresh tomatoes stay separate lines.
 */
export function withPurchaseForm(key: string, department: Department): string {
  const prefix = FORM_PREFIX[department];
  if (!prefix || new RegExp(`\\b${prefix}\\b`).test(key)) return key;
  const implied = keyDepartment(key);
  return implied === department || implied === "Other" ? key : `${prefix} ${key}`;
}

/** On the canned aisle these name different products (crushed vs diced tomatoes), not prep. */
const CANNED_STYLE = /\b(petite diced|crushed|diced|whole|stewed|fire[- ]roasted)\b/i;

function withCannedStyle(key: string, displayName: string, department: Department): string {
  if (department !== "Pantry & Canned Goods") return key;
  const style = displayName.split(",")[0]!.toLowerCase().match(CANNED_STYLE)?.[1]?.replace("-", " ");
  if (!style || key.includes(style)) return key;
  return key.startsWith("canned ") ? `canned ${style} ${key.slice(7)}` : `${style} ${key}`;
}

/** Normalize a single raw recipe ingredient into a canonical, classified shape. */
export function normalizeIngredient(raw: RawRecipeIngredient): NormalizedIngredient {
  const displayName = raw.name.trim();
  // Aisle depends on what the item is, not its role in this recipe ("lime, for garnish" is still produce).
  const department = classifyDepartment(displayName, raw.notes ?? "", { unit: raw.unit });
  const canonicalKey = withCannedStyle(
    withPurchaseForm(canonicalizeIngredientName(displayName), department),
    displayName,
    department,
  );
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
