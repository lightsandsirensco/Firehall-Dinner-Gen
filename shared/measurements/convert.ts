/**
 * US / Imperial ↔ metric conversion for recipe display.
 * Scale quantities first, then convert for display (see formatIngredientAmount).
 */

export type MeasurementSystem = "us" | "metric";

const IMPERIAL_ALIASES: Record<string, string> = {
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  "fl oz": "fl oz",
  floz: "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  inch: "inch",
  inches: "inch",
  in: "inch",
};

/** Longest multi-word units first when parsing free text. */
const UNIT_PARSE_ORDER: Array<{ re: RegExp; norm: string }> = [
  { re: /^fluid\s+ounces?\b/i, norm: "fl oz" },
  { re: /^fl\s*oz\b/i, norm: "fl oz" },
  { re: /^tablespoons?\b/i, norm: "tbsp" },
  { re: /^teaspoons?\b/i, norm: "tsp" },
  { re: /^pounds?\b/i, norm: "lb" },
  { re: /^gallons?\b/i, norm: "gallon" },
  { re: /^quarts?\b/i, norm: "quart" },
  { re: /^ounces?\b/i, norm: "oz" },
  { re: /^tablespoons?\b/i, norm: "tbsp" },
  { re: /^teaspoons?\b/i, norm: "tsp" },
  { re: /^cups?\b/i, norm: "cup" },
  { re: /^tbsp\b/i, norm: "tbsp" },
  { re: /^tsp\b/i, norm: "tsp" },
  { re: /^lbs?\b/i, norm: "lb" },
  { re: /^oz\b/i, norm: "oz" },
  { re: /^gal\b/i, norm: "gallon" },
  { re: /^qt\b/i, norm: "quart" },
  { re: /^inches?\b/i, norm: "inch" },
  { re: /^in\b/i, norm: "inch" },
];

function normalizeUnit(unit: string): string | null {
  const key = unit.trim().toLowerCase().replace(/\s+/g, " ");
  return IMPERIAL_ALIASES[key] ?? null;
}

function parseUnitToken(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const direct = normalizeUnit(trimmed);
  if (direct) return direct;
  for (const { re, norm } of UNIT_PARSE_ORDER) {
    if (re.test(trimmed)) return norm;
  }
  return null;
}

export function parseQuantityString(qty: string | undefined): number | null {
  if (!qty?.trim()) return null;
  let s = qty
    .trim()
    .replace(/[¼]/g, "0.25")
    .replace(/[½]/g, "0.5")
    .replace(/[¾]/g, "0.75");

  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  }

  if (s.includes("/")) {
    const [num, den] = s.split("/").map((x) => parseFloat(x.trim()));
    if (num && den) return num / den;
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatDisplayNumber(n: number): string {
  if (Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

function roundGrams(g: number): number {
  if (g >= 500) return Math.round(g / 50) * 50;
  if (g >= 100) return Math.round(g / 10) * 10;
  if (g >= 10) return Math.round(g / 5) * 5;
  return Math.round(g);
}

function roundMl(ml: number): number {
  if (ml >= 100) return Math.round(ml / 10) * 10;
  if (ml >= 10) return Math.round(ml / 5) * 5;
  return Math.round(ml);
}

function roundKg(kg: number): number {
  return Math.round(kg * 10) / 10;
}

function roundLiters(l: number): number {
  return Math.round(l * 10) / 10;
}

function convertImperialQuantity(
  qty: number,
  unit: string,
): { quantity: string; unit: string } | null {
  const normalized = normalizeUnit(unit);
  if (!normalized || qty <= 0) return null;

  switch (normalized) {
    case "lb": {
      const grams = qty * 454;
      if (grams >= 1000) {
        return { quantity: formatDisplayNumber(roundKg(grams / 1000)), unit: "kg" };
      }
      return { quantity: String(roundGrams(grams)), unit: "g" };
    }
    case "oz": {
      const grams = Math.round(qty * 28);
      return { quantity: String(grams), unit: "g" };
    }
    case "cup":
      return { quantity: String(roundMl(qty * 240)), unit: "ml" };
    case "tbsp":
      return { quantity: String(roundMl(qty * 15)), unit: "ml" };
    case "tsp":
      return { quantity: String(roundMl(qty * 5)), unit: "ml" };
    case "fl oz":
      return { quantity: String(roundMl(qty * 30)), unit: "ml" };
    case "quart": {
      const ml = roundMl(qty * 960);
      if (ml >= 1000) {
        return { quantity: formatDisplayNumber(roundLiters(ml / 1000)), unit: "L" };
      }
      return { quantity: String(ml), unit: "ml" };
    }
    case "gallon":
      return { quantity: formatDisplayNumber(roundLiters(qty * 3.8)), unit: "L" };
    case "inch":
      return { quantity: formatDisplayNumber(Math.round(qty * 2.54 * 10) / 10), unit: "cm" };
    default:
      return null;
  }
}

/** Split quantity/unit when unit is embedded in quantity ("2 lb"). */
export function resolveIngredientQuantityUnit(
  quantity?: string,
  unit?: string,
): { quantity: string; unit: string } {
  const q = quantity?.trim() ?? "";
  const u = unit?.trim() ?? "";
  if (u) return { quantity: q, unit: u };

  const parsed = parseLeadingQuantityUnit(q);
  if (!parsed) return { quantity: q, unit: u };

  const qtyStr =
    Math.abs(parsed.quantity - Math.round(parsed.quantity)) < 0.05
      ? String(Math.round(parsed.quantity))
      : formatDisplayNumber(parsed.quantity);
  return { quantity: qtyStr, unit: parsed.unit };
}

/** Format structured ingredient qty + unit for display. */
export function formatIngredientAmount(
  quantity: string | undefined,
  unit: string | undefined,
  system: MeasurementSystem,
): string {
  const resolved = resolveIngredientQuantityUnit(quantity, unit);
  const parts = [resolved.quantity, resolved.unit].filter(Boolean);
  if (system === "us" || parts.length === 0) return parts.join(" ");

  const qtyNum = parseQuantityString(resolved.quantity);
  if (qtyNum === null || !resolved.unit) return parts.join(" ");

  const converted = convertImperialQuantity(qtyNum, resolved.unit);
  if (!converted) return parts.join(" ");
  return `${converted.quantity} ${converted.unit}`;
}

/** Format numeric client-recipe ingredient qty + unit. */
export function formatClientIngredientQty(
  qty: number,
  unit: string,
  system: MeasurementSystem,
): string {
  if (!qty && !unit) return "";
  if (system === "us") {
    const display = qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
    return unit ? `${display} ${unit}` : display;
  }

  if (!unit?.trim()) {
    return qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
  }

  const converted = convertImperialQuantity(qty, unit);
  if (!converted) {
    const display = qty % 1 === 0 ? qty.toString() : qty.toFixed(1);
    return unit ? `${display} ${unit}` : display;
  }
  return `${converted.quantity} ${converted.unit}`;
}

const QTY_TOKEN =
  /(\d+(?:\.\d+)?(?:\s+\d+\/\d+|\s*\/\s*\d+)?|\d+\/\d+|[¼½¾])/;

export function parseLeadingQuantityUnit(text: string): {
  quantity: number;
  unit: string;
  rest: string;
} | null {
  const trimmed = text.trim();
  const qtyMatch = trimmed.match(new RegExp(`^${QTY_TOKEN.source}\\s+`, "i"));
  if (!qtyMatch) return null;

  const qtyStr = qtyMatch[0].trim();
  const afterQty = trimmed.slice(qtyMatch[0].length);

  for (const { re, norm } of UNIT_PARSE_ORDER) {
    const unitMatch = afterQty.match(re);
    if (!unitMatch) continue;
    const unitLen = unitMatch[0].length;
    const rest = afterQty.slice(unitLen).trim();
    const qtyNum = parseQuantityString(qtyStr);
    if (qtyNum === null) return null;
    return { quantity: qtyNum, unit: norm, rest };
  }

  const simple = afterQty.match(/^([a-zA-Z]+(?:\.[a-zA-Z]+)?)\s*(.*)$/);
  if (!simple) return null;
  const norm = parseUnitToken(simple[1]);
  if (!norm) return null;
  const qtyNum = parseQuantityString(qtyStr);
  if (qtyNum === null) return null;
  return { quantity: qtyNum, unit: norm, rest: simple[2].trim() };
}

/** Convert a free-text ingredient line like "2 lb chicken breast". */
export function convertIngredientLine(line: string, system: MeasurementSystem): string {
  if (system === "us" || !line.trim()) return line;

  const parsed = parseLeadingQuantityUnit(line);
  if (!parsed) return line;

  const converted = convertImperialQuantity(parsed.quantity, parsed.unit);
  if (!converted) return line;

  const rest = parsed.rest ? ` ${parsed.rest}` : "";
  return `${converted.quantity} ${converted.unit}${rest}`;
}

/** Convert a shopping-list amount string ("2 lb", "1 cup"). */
export function convertShoppingAmountString(amount: string, system: MeasurementSystem): string {
  const trimmed = (amount || "").trim();
  if (!trimmed || system === "us") return trimmed;
  return convertIngredientLine(trimmed, system);
}

/** Detect label-only metric swaps (e.g. 2 lb → 2 kg). */
export function isFakeMetricConversion(
  quantity: string | undefined,
  unit: string | undefined,
  metricDisplay: string,
): boolean {
  const resolved = resolveIngredientQuantityUnit(quantity, unit);
  const qtyNum = parseQuantityString(resolved.quantity);
  if (qtyNum === null || !resolved.unit) return false;

  const metricTrimmed = metricDisplay.trim();
  const parsed = parseLeadingQuantityUnit(metricTrimmed);
  const imperial = normalizeUnit(resolved.unit);
  if (!imperial) return false;

  const metricQty = parsed?.quantity ?? parseQuantityString(metricTrimmed.split(/\s+/)[0] ?? "");
  if (metricQty === null) return false;

  const metricUnit = parsed?.unit?.toLowerCase() ?? "";
  const metricUnits = new Set(["g", "kg", "ml", "l", "cm"]);
  const looksMetric = metricUnits.has(metricUnit) || /\b(g|kg|ml|l|cm)\b/i.test(metricTrimmed);

  if (looksMetric && Math.abs(metricQty - qtyNum) < 0.02) return true;

  if (parsed && imperial === "cup" && parsed.unit === "ml") {
    const expected = convertImperialQuantity(qtyNum, "cup");
    if (expected && Math.abs(parseQuantityString(expected.quantity)! - parsed.quantity) > 5) {
      return false;
    }
  }

  return false;
}
