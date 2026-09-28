/**
 * Deterministic unit normalization for the pricing engine.
 *
 * Conversion factors intentionally match shared/measurements/convert.ts
 * (lb=454g, oz=28g, cup=240ml, tbsp=15ml, tsp=5ml, fl oz=30ml, quart=960ml,
 * gallon=3800ml) so a recipe's displayed quantities and its priced quantities
 * never silently disagree.
 *
 * If a unit or piece conversion isn't reliably known, callers get `null` —
 * NEVER a guessed number.
 */

/** Grams per 1 unit, for weight units. */
const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kilogram: 1000,
  kilograms: 1000,
  oz: 28,
  ounce: 28,
  ounces: 28,
  lb: 454,
  lbs: 454,
  pound: 454,
  pounds: 454,
};

/** Milliliters per 1 unit, for volume units. */
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1000,
  liter: 1000,
  liters: 1000,
  litre: 1000,
  litres: 1000,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  cup: 240,
  cups: 240,
  "fl oz": 30,
  floz: 30,
  "fluid ounce": 30,
  "fluid ounces": 30,
  quart: 960,
  quarts: 960,
  qt: 960,
  gallon: 3800,
  gallons: 3800,
  gal: 3800,
};

/**
 * Reliable piece → gram baselines. Only include an item here when a single
 * "piece" has a widely-agreed-upon average weight. When in doubt, leave it
 * out — the engine will report the ingredient as unresolved instead of
 * guessing.
 */
export const PIECE_WEIGHT_G: Record<string, number> = {
  egg: 50,
  onion: 150,
  "bell pepper": 150,
  "garlic clove": 5,
  clove: 5,
  lime: 70,
  lemon: 100,
  tomato: 120,
  potato: 170,
  avocado: 200,
};

export type BaseUnit = "g" | "ml" | "piece";

const PIECE_UNIT_WORDS = new Set([
  "",
  "piece",
  "pieces",
  "each",
  "whole",
  "count",
  "clove",
  "cloves",
]);

function normalizeUnitToken(unit: string | undefined): string {
  return (unit || "").trim().toLowerCase();
}

/** Classify a raw recipe unit into its base unit family, or null if unknown. */
export function classifyUnit(unit: string | undefined): BaseUnit | null {
  const u = normalizeUnitToken(unit);
  if (u in WEIGHT_TO_GRAMS) return "g";
  if (u in VOLUME_TO_ML) return "ml";
  if (PIECE_UNIT_WORDS.has(u)) return "piece";
  return null;
}

/**
 * Convert a recipe quantity+unit into an exact amount of the target base unit
 * ("g", "ml", or "piece"). Returns null when the conversion isn't reliable —
 * callers must treat that as "unresolved", not zero.
 */
export function convertToBaseUnit(
  quantity: number,
  unit: string | undefined,
  target: BaseUnit,
  /** Ingredient name — used only for piece↔weight cross-conversion lookups. */
  ingredientName?: string,
): number | null {
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const u = normalizeUnitToken(unit);
  const family = classifyUnit(u);

  if (family === target) {
    if (target === "g") return quantity * WEIGHT_TO_GRAMS[u];
    if (target === "ml") return quantity * VOLUME_TO_ML[u];
    return quantity; // piece -> piece
  }

  // Cross conversion: recipe gives a piece count but ingredient is priced by weight.
  if (family === "piece" && target === "g") {
    const gramsEach = pieceWeightFor(ingredientName);
    return gramsEach != null ? quantity * gramsEach : null;
  }

  // Cross conversion: recipe gives a weight but ingredient is priced per piece
  // (e.g. "150 g onion" against a per-onion baseline).
  if (family === "g" && target === "piece") {
    const gramsEach = pieceWeightFor(ingredientName);
    if (!gramsEach) return null;
    const grams = quantity * WEIGHT_TO_GRAMS[u];
    return grams / gramsEach;
  }

  return null;
}

function pieceWeightFor(ingredientName: string | undefined): number | undefined {
  if (!ingredientName) return undefined;
  const n = ingredientName.toLowerCase();
  for (const [key, grams] of Object.entries(PIECE_WEIGHT_G)) {
    if (n.includes(key)) return grams;
  }
  return undefined;
}

/** Grams-per-unit for a `PriceRecord.pricing_unit` value (weight/piece units only). */
export function gramsPerPricingUnit(unit: string): number | null {
  const u = unit.toLowerCase();
  if (u in WEIGHT_TO_GRAMS) return WEIGHT_TO_GRAMS[u];
  return null;
}

/** Milliliters-per-unit for a `PriceRecord.pricing_unit` value (volume units only). */
export function mlPerPricingUnit(unit: string): number | null {
  const u = unit.toLowerCase();
  if (u in VOLUME_TO_ML) return VOLUME_TO_ML[u];
  return null;
}
