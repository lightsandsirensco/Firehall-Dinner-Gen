/**
 * Smart Shopping — unit vocabulary and same-family conversion.
 *
 * Only exact, ingredient-independent conversions live here: US/metric
 * volume to volume and mass to mass. Mass <-> volume (density) is never
 * attempted — "1 cup flour" and "4 oz flour" stay separate lines.
 */

export type UnitFamily = "volume" | "mass" | "count" | "other";

/** Display system for merged quantities; `undefined` means "as the recipes wrote it". */
export type ShoppingUnitSystem = "us" | "metric";

/** Millilitres per unit (US customary). */
const ML_PER_UNIT: Record<string, number> = {
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  "fl oz": 29.5735295625,
  cup: 236.5882365,
  ml: 1,
  l: 1000,
};

/** Grams per unit (avoirdupois). */
const G_PER_UNIT: Record<string, number> = {
  oz: 28.349523125,
  lb: 453.59237,
  g: 1,
  kg: 1000,
};

const METRIC_UNITS = new Set(["ml", "l", "g", "kg"]);

const UNIT_ALIASES: Record<string, string> = {
  tsp: "tsp", tsps: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  "fl oz": "fl oz", floz: "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l",
  oz: "oz", ounce: "oz", ounces: "oz",
  lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
  g: "g", gram: "g", grams: "g",
  kg: "kg", kgs: "kg", kilogram: "kg", kilograms: "kg",
  count: "count", ct: "count", each: "count", ea: "count", whole: "count",
  piece: "count", pieces: "count", pc: "count", pcs: "count",
  egg: "count", eggs: "count",
  large: "count", medium: "count", small: "count",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  can: "can", cans: "can",
  bunch: "bunch", bunches: "bunch",
  head: "head", heads: "head",
  stalk: "stalk", stalks: "stalk",
  sprig: "sprig", sprigs: "sprig",
  package: "package", packages: "package", pkg: "package", pkgs: "package",
  bag: "bag", bags: "bag",
  jar: "jar", jars: "jar",
  bottle: "bottle", bottles: "bottle",
  pinch: "pinch", pinches: "pinch",
  dash: "dash", dashes: "dash",
  pint: "pint", pints: "pint",
  quart: "quart", quarts: "quart", qt: "quart",
  gallon: "gallon", gallons: "gallon", gal: "gallon",
  loaf: "loaf", loaves: "loaf",
  leaf: "leaf", leaves: "leaf",
  stick: "stick", sticks: "stick",
};

const SIZE_WORDS = /^(large|medium|small)\s+/;

function singularizeUnitWord(word: string): string {
  if (/ies$/.test(word) && word.length > 4) return word.slice(0, -3) + "y";
  if (/(ch|sh|x)es$/.test(word)) return word.slice(0, -2);
  if (/[^s]s$/.test(word) && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Canonical unit key. Known aliases collapse ("Tbsp", "tablespoons" -> "tbsp");
 * container sizes stay part of the identity ("cans (15 oz)" -> "can (15 oz)")
 * so a 15 oz can never merges with a 28 oz can.
 */
export function normalizeUnit(unit: string): string {
  let key = unit.trim().toLowerCase().replace(/\s+/g, " ").replace(/\.(?=\s|$)/g, "");
  if (!key) return "";
  if (UNIT_ALIASES[key]) return UNIT_ALIASES[key];

  const sized = key.replace(SIZE_WORDS, "");
  if (sized !== key && sized) key = sized;

  const paren = key.match(/^([^(]*?)\s*(\([^)]*\))\s*(.*)$/);
  const head = (paren ? paren[1] : key).trim();
  const suffix = paren ? `${paren[2]}${paren[3] ? ` ${paren[3]}` : ""}` : "";

  const words = head.split(" ");
  const first = words[0] ?? "";
  const twoWord = words.slice(0, 2).join(" ");
  let canonicalHead: string;
  let restWords: string[];
  if (words.length >= 2 && UNIT_ALIASES[twoWord]) {
    canonicalHead = UNIT_ALIASES[twoWord];
    restWords = words.slice(2);
  } else {
    canonicalHead = UNIT_ALIASES[first] ?? singularizeUnitWord(first);
    restWords = words.slice(1);
  }

  return [canonicalHead, ...restWords, suffix].filter(Boolean).join(" ").trim();
}

export function unitFamily(unit: string): UnitFamily {
  if (unit in ML_PER_UNIT) return "volume";
  if (unit in G_PER_UNIT) return "mass";
  if (unit === "count" || unit === "") return "count";
  return "other";
}

/** Base-unit factor (ml or g) for convertible units; null for count/other. */
export function baseFactor(unit: string): number | null {
  return ML_PER_UNIT[unit] ?? G_PER_UNIT[unit] ?? null;
}

/** Exact same-family conversion; null when the units are not interchangeable. */
export function convertUnitValue(value: number, from: string, to: string): number | null {
  if (from === to) return value;
  const fam = unitFamily(from);
  if ((fam !== "volume" && fam !== "mass") || unitFamily(to) !== fam) return null;
  return (value * baseFactor(from)!) / baseFactor(to)!;
}

export function isMetricUnit(unit: string): boolean {
  return METRIC_UNITS.has(unit);
}

/** Purchase rounding increments — always rounded UP so a converted total never under-buys. */
function purchaseIncrement(unit: string, value: number): number {
  switch (unit) {
    case "tsp":
      return 0.25;
    case "tbsp":
      return 0.5;
    case "cup":
      return 0.25;
    case "fl oz":
      return 1;
    case "oz":
      return value < 1 ? 0.25 : 1;
    case "lb":
      return 0.25;
    case "g":
      return value < 100 ? 5 : 10;
    case "ml":
      return value < 100 ? 5 : 10;
    case "kg":
    case "l":
      return 0.1;
    default:
      return 0.01;
  }
}

export function roundUpForPurchase(value: number, unit: string): number {
  const inc = purchaseIncrement(unit, value);
  return Math.round(Math.ceil(value / inc - 1e-9) * inc * 1000) / 1000;
}

/**
 * Pick the display unit for a merged same-family total (expressed in base
 * units — ml or g).
 *
 * - No system: stay within the units the recipes actually used, choosing the
 *   largest one that keeps the number >= 1 ("1 tsp + 1 tbsp" -> tbsp).
 * - "us" / "metric": use that system's ladder (tsp/tbsp/cup, oz/lb, ml/l, g/kg).
 */
export function chooseDisplayUnit(
  family: "volume" | "mass",
  totalBase: number,
  usedUnits: string[],
  system?: ShoppingUnitSystem,
): string {
  const candidates = system ? systemLadder(family, system) : [...new Set(usedUnits)];
  const sorted = candidates.sort((a, b) => baseFactor(b)! - baseFactor(a)!);
  for (const unit of sorted) {
    if (totalBase / baseFactor(unit)! >= minimumDisplayValue(unit, system)) return unit;
  }
  return sorted[sorted.length - 1];
}

function systemLadder(family: "volume" | "mass", system: ShoppingUnitSystem): string[] {
  if (family === "volume") return system === "metric" ? ["ml", "l"] : ["tsp", "tbsp", "cup"];
  return system === "metric" ? ["g", "kg"] : ["oz", "lb"];
}

/** Cups read naturally from 1/4 cup up; everything else switches at 1. */
function minimumDisplayValue(unit: string, system?: ShoppingUnitSystem): number {
  return system === "us" && unit === "cup" ? 0.25 : 1;
}

/** True when a set of units is already entirely expressed in the requested system. */
export function unitsMatchSystem(units: string[], system: ShoppingUnitSystem): boolean {
  return units.every((u) => (system === "metric" ? isMetricUnit(u) : !isMetricUnit(u)));
}

const INVARIANT_UNITS = new Set(["tsp", "tbsp", "fl oz", "oz", "lb", "g", "kg", "ml", "count"]);

/** Human display for a canonical unit ("cup", 2 -> "cups"; "l" -> "L"; "can (15 oz)", 2 -> "cans (15 oz)"). */
export function displayUnit(unit: string, value: number): string {
  if (!unit) return "";
  if (unit === "l") return "L";
  if (INVARIANT_UNITS.has(unit) || value <= 1) return unit;
  const [first, ...rest] = unit.split(" ");
  let plural: string;
  if (/(ch|sh|x|s)$/.test(first)) plural = `${first}es`;
  else if (/[^aeiou]y$/.test(first)) plural = `${first.slice(0, -1)}ies`;
  else if (/f$/.test(first)) plural = `${first.slice(0, -1)}ves`;
  else plural = `${first}s`;
  return [plural, ...rest].join(" ");
}
