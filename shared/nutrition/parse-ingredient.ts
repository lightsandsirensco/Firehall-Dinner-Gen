import { parseQuantityAmount } from "../recipe/normalization.js";
import type { CatalogIngredientLine } from "./types.js";

export interface ParsedIngredientAmount {
  quantity: number;
  unit: string;
  raw: string;
}

/** Parse quantity/unit from catalog ingredient lines (handles embedded amounts). */
export function parseCatalogIngredientAmount(ing: CatalogIngredientLine): ParsedIngredientAmount {
  const qtyRaw = (ing.quantity || "").trim();
  const unitRaw = (ing.unit || "").trim();

  if (qtyRaw && !unitRaw) {
    const embedded = parseQuantityAmount(qtyRaw);
    if (embedded.quantity != null) {
      return { quantity: embedded.quantity, unit: embedded.unit, raw: qtyRaw };
    }
    const range = qtyRaw.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      if (!Number.isNaN(a) && !Number.isNaN(b)) {
        return { quantity: (a + b) / 2, unit: "", raw: qtyRaw };
      }
    }
    const n = Number(qtyRaw);
    if (!Number.isNaN(n)) return { quantity: n, unit: "", raw: qtyRaw };
  }

  if (qtyRaw && unitRaw) {
    const frac = qtyRaw.match(/^([\d./]+)$/);
    let quantity = 1;
    if (frac) {
      if (qtyRaw.includes("/")) {
        const [a, b] = qtyRaw.split("/").map(Number);
        quantity = b ? a / b : a;
      } else {
        quantity = Number(qtyRaw);
      }
    } else {
      quantity = Number(qtyRaw) || 1;
    }
    return { quantity, unit: unitRaw.toLowerCase(), raw: `${qtyRaw} ${unitRaw}` };
  }

  return { quantity: 1, unit: unitRaw.toLowerCase(), raw: qtyRaw || unitRaw };
}

const LEADING_UNIT_WORDS = new Set([
  "cup", "cups", "tbsp", "tbsps", "tablespoon", "tablespoons", "tsp", "tsps", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "can", "cans", "clove", "cloves",
  "slice", "slices", "stick", "sticks", "packet", "packets", "pinch", "dash", "quart", "quarts",
  "pint", "pints", "bunch", "bunches", "head", "heads", "bag", "bags", "jar", "jars", "bottle", "bottles",
  "loaf", "loaves",
]);

/**
 * Some hand-authored ingredient entries put the unit as a leading word in the `name` field
 * instead of in `quantity`/`unit` (e.g. `{ quantity: "2", name: "tbsp tomato paste" }` instead
 * of `{ quantity: "2", unit: "tbsp", name: "tomato paste" }`). Left alone, the unit-less amount
 * falls back to a generic ~100g/count guess and the ingredient-profile lookup also has to work
 * around the stray unit word. Only applied when the ingredient has no unit anywhere else.
 */
export function extractLeadingUnitFromName(name: string): { unit: string; cleanedName: string } {
  const match = name.trim().match(/^([a-zA-Z]+)\.?\s+(.+)$/);
  if (!match) return { unit: "", cleanedName: name };
  const word = match[1].toLowerCase();
  if (LEADING_UNIT_WORDS.has(word)) {
    return { unit: word, cleanedName: match[2] };
  }
  return { unit: "", cleanedName: name };
}

const WEIGHT_HINT_RE =
  /(?:about|approx(?:imately)?)?\s*([\d.\/]+)\s*(lb|lbs|pound|pounds|oz|ounces?|kg|kilograms?|g|grams?)\s*(each|per\s+\w+|total|overall)?/i;

function parseSimpleNumber(raw: string): number | null {
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map(Number);
    return b ? a / b : null;
  }
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

/**
 * Recipes often specify whole cuts in non-standard units ("racks", "legs", "whole") that have
 * no unitGrams mapping, but describe the real weight in a free-text note ("about 1 lb each",
 * "about 8 lb total"). Without this, gramsFromAmount silently falls back to a generic ~80g
 * guess, which can undercount a whole turkey leg or rack of ribs by 5-10x. Only used when the
 * unit itself doesn't already resolve to a known conversion.
 */
export function gramsFromNotesHint(notes: string | undefined, quantity: number): number | null {
  if (!notes) return null;
  const match = notes.match(WEIGHT_HINT_RE);
  if (!match) return null;
  const amount = parseSimpleNumber(match[1]);
  if (amount == null || amount <= 0) return null;
  const unit = match[2].toLowerCase();
  const perUnitGrams = unit.startsWith("lb") || unit.startsWith("pound")
    ? amount * 454
    : unit.startsWith("oz")
      ? amount * 28.35
      : unit.startsWith("kg") || unit.startsWith("kilogram")
        ? amount * 1000
        : amount;
  const qualifier = (match[3] || "").toLowerCase();
  const isTotal = qualifier.includes("total") || qualifier.includes("overall");
  return isTotal ? perUnitGrams : perUnitGrams * Math.max(1, quantity);
}

export function gramsFromAmount(
  quantity: number,
  unit: string,
  unitGrams: Record<string, number> | undefined,
  notes?: string,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const u = unit.toLowerCase().replace(/\./g, "").trim();

  if (unitGrams?.[u]) return quantity * unitGrams[u];

  const aliases: Record<string, string> = {
    pounds: "lb",
    pound: "lb",
    lbs: "lb",
    ounces: "oz",
    ounce: "oz",
    grams: "g",
    gram: "g",
    kilograms: "kg",
    kilogram: "kg",
    tablespoons: "tbsp",
    tablespoon: "tbsp",
    teaspoons: "tsp",
    teaspoon: "tsp",
    cups: "cup",
    cans: "can",
    cloves: "clove",
    large: "large",
    medium: "medium",
    slices: "slice",
    count: "count",
  };
  const normalized = aliases[u] || u;

  if (unitGrams?.[normalized]) return quantity * unitGrams[normalized];

  switch (normalized) {
    case "lb":
      return quantity * 454;
    case "oz":
      return quantity * 28.35;
    case "g":
      return quantity;
    case "kg":
      return quantity * 1000;
    case "cup":
      return quantity * (unitGrams?.cup ?? 120);
    case "tbsp":
      return quantity * (unitGrams?.tbsp ?? 15);
    case "tsp":
      return quantity * (unitGrams?.tsp ?? 5);
    case "quart":
      return quantity * 960;
    case "pint":
      return quantity * 480;
    case "":
    case "count":
      return gramsFromNotesHint(notes, quantity) ?? quantity * (unitGrams?.count ?? 100);
    default:
      return gramsFromNotesHint(notes, quantity) ?? quantity * (unitGrams?.count ?? 80);
  }
}
