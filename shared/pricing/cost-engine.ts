/**
 * Deterministic recipe cost engine.
 *
 * Shared by BOTH product surfaces:
 *  - Free: baseline "Estimated cost / cost per person" (no saleOverrides).
 *  - Premium "Cook What's On Sale" (future): pass `saleOverrides` — only the
 *    affected canonical ingredient(s) use the sale price, everything else
 *    still resolves through the normal regional baseline hierarchy.
 *
 * Prices the quantity actually CONSUMED by the recipe (already scaled to the
 * recipe's current serving/crew size by the existing serving-scaling logic —
 * this module does not re-scale). Never invents a price: an ingredient that
 * can't be deterministically mapped or converted is reported as unresolved.
 */
import type {
  LocationFallbackLevel,
  LocationQuery,
  PriceRecord,
  RecipeCostEstimate,
  RecipeCostIngredientInput,
  RecipeCostLine,
  SaleOverride,
} from "./types.js";
import { resolveCanonicalIngredient } from "./canonical-ingredients.js";
import { convertToBaseUnit, gramsPerPricingUnit, mlPerPricingUnit } from "./units.js";
import { describeFallbackLevel, resolvePriceRecord } from "./regional-prices.js";

/** Minimum count-based ingredient pricing coverage before we'll show ANY estimate. */
export const COVERAGE_THRESHOLD = 0.8;
/** Below this many priceable ingredients, a recipe's estimate is too thin to be meaningful. */
export const MIN_PRICEABLE_INGREDIENTS = 3;

const SPECIFICITY_RANK: Record<LocationFallbackLevel, number> = {
  generic: 0,
  country: 1,
  province_state: 2,
  city_province: 3,
  postal_region: 4,
};

const CONFIDENCE_SPREAD: Record<PriceRecord["confidence"], number> = {
  high: 0.08,
  medium: 0.15,
  low: 0.25,
};

/** How many base units (g / ml / piece-count) one `pricing_unit` represents. */
function pricingUnitToBaseFactor(pricingUnit: PriceRecord["pricing_unit"], target: "g" | "ml" | "piece"): number | null {
  if (target === "g") return gramsPerPricingUnit(pricingUnit);
  if (target === "ml") return mlPerPricingUnit(pricingUnit);
  // target === "piece"
  if (pricingUnit === "piece") return 1;
  if (pricingUnit === "dozen") return 12;
  return null;
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Kitchen-friendly rounding so we never show false precision like "$61.37". */
export function roundDisplayRange(min: number, max: number): { min: number; max: number } {
  const magnitude = (min + max) / 2;
  const step = magnitude >= 100 ? 10 : magnitude >= 30 ? 5 : 1;
  return {
    min: Math.max(0, roundToStep(min, step)),
    max: Math.max(0, roundToStep(max, step)),
  };
}

export function roundPerPerson(min: number, max: number): { min: number; max: number } {
  const magnitude = (min + max) / 2;
  const step = magnitude >= 20 ? 1 : 0.5;
  return {
    min: Math.max(0, roundToStep(min, step)),
    max: Math.max(0, roundToStep(max, step)),
  };
}

export interface EstimateRecipeCostOptions {
  priceBook?: PriceRecord[];
  /** Future Premium local deals, keyed by canonical_ingredient_id. */
  saleOverrides?: Record<string, SaleOverride>;
}

export function estimateRecipeCost(
  ingredients: RecipeCostIngredientInput[],
  servings: number,
  location: LocationQuery,
  options: EstimateRecipeCostOptions = {},
): RecipeCostEstimate {
  const lines: RecipeCostLine[] = [];
  const unpricedIngredients: string[] = [];

  let totalMin = 0;
  let totalMax = 0;
  let priceableCount = 0;
  let pricedCount = 0;
  let hasSaleOverrides = false;
  let weakestLevel: LocationFallbackLevel | null = null;

  for (const ing of ingredients) {
    const quantity = ing.quantity;
    if (!quantity || !Number.isFinite(quantity) || quantity <= 0) {
      lines.push({ name: ing.name, canonicalId: null, priced: false, reason: "zero_quantity" });
      continue;
    }

    priceableCount += 1;

    const match = resolveCanonicalIngredient(ing.name);
    if (!match) {
      lines.push({ name: ing.name, canonicalId: null, priced: false, reason: "unmapped_ingredient" });
      unpricedIngredients.push(ing.name);
      continue;
    }

    const canonical = match.ingredient;
    const convertedQty = convertToBaseUnit(quantity, ing.unit, canonical.pricingUnit, ing.name);
    if (convertedQty == null) {
      lines.push({
        name: ing.name,
        canonicalId: canonical.id,
        priced: false,
        reason: "unit_unresolved",
        pantryStatus: canonical.defaultPantryStatus,
      });
      unpricedIngredients.push(ing.name);
      continue;
    }

    const resolution = resolvePriceRecord(canonical.id, location, {
      priceBook: options.priceBook,
      saleOverrides: options.saleOverrides,
    });
    if (!resolution) {
      lines.push({
        name: ing.name,
        canonicalId: canonical.id,
        priced: false,
        reason: "no_price_data",
        pantryStatus: canonical.defaultPantryStatus,
      });
      unpricedIngredients.push(ing.name);
      continue;
    }

    const { record, fallbackLevel, isSaleOverride } = resolution;
    const baseFactor = pricingUnitToBaseFactor(record.pricing_unit, canonical.pricingUnit);
    if (baseFactor == null) {
      lines.push({
        name: ing.name,
        canonicalId: canonical.id,
        priced: false,
        reason: "no_price_data",
        pantryStatus: canonical.defaultPantryStatus,
      });
      unpricedIngredients.push(ing.name);
      continue;
    }

    const pricePerBaseUnit = record.price / (record.package_size ?? 1) / baseFactor;
    const lineCost = pricePerBaseUnit * convertedQty;
    const spread = CONFIDENCE_SPREAD[record.confidence];

    pricedCount += 1;
    totalMin += lineCost * (1 - spread);
    totalMax += lineCost * (1 + spread);
    if (isSaleOverride) hasSaleOverrides = true;
    if (weakestLevel == null || SPECIFICITY_RANK[fallbackLevel] < SPECIFICITY_RANK[weakestLevel]) {
      weakestLevel = fallbackLevel;
    }

    lines.push({
      name: ing.name,
      canonicalId: canonical.id,
      priced: true,
      quantity: convertedQty,
      unit: canonical.pricingUnit,
      pantryStatus: canonical.defaultPantryStatus,
      isSaleOverride,
      costMin: lineCost * (1 - spread),
      costMax: lineCost * (1 + spread),
      confidence: record.confidence,
      fallbackLevel,
    });
  }

  const coveragePct = priceableCount > 0 ? pricedCount / priceableCount : 0;
  const coverageTrustworthy =
    coveragePct >= COVERAGE_THRESHOLD && priceableCount >= MIN_PRICEABLE_INGREDIENTS;

  const totalRounded = roundDisplayRange(totalMin, totalMax);
  const safeServings = Math.max(1, servings);
  const perPersonRounded = roundPerPerson(totalMin / safeServings, totalMax / safeServings);

  return {
    lines,
    unpricedIngredients,
    coveragePct,
    coverageTrustworthy,
    totalMin: totalRounded.min,
    totalMax: totalRounded.max,
    perPersonMin: perPersonRounded.min,
    perPersonMax: perPersonRounded.max,
    servings: safeServings,
    regionLabel: weakestLevel ? describeFallbackLevel(weakestLevel) : "typical national prices",
    fallbackLevel: weakestLevel,
    hasSaleOverrides,
  };
}

/** "Est. $55–$65" */
export function formatTotalCostRange(estimate: RecipeCostEstimate): string {
  return estimate.totalMin === estimate.totalMax
    ? `Est. $${estimate.totalMin}`
    : `Est. $${estimate.totalMin}–$${estimate.totalMax}`;
}

/** "~$7–$8/person" */
export function formatPerPersonCostRange(estimate: RecipeCostEstimate): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return estimate.perPersonMin === estimate.perPersonMax
    ? `~$${fmt(estimate.perPersonMin)}/person`
    : `~$${fmt(estimate.perPersonMin)}–$${fmt(estimate.perPersonMax)}/person`;
}

/**
 * Combine several already-computed per-recipe estimates (e.g. every meal
 * planned for one shift) into one grocery-run total. Sums the already
 * kitchen-rounded per-recipe ranges — never re-derives a price, never
 * fabricates precision beyond what each contributing estimate already had.
 * Per-person is the combined total split across the (shared) crew size, not
 * a sum of each meal's own per-person figure — that's the honest read of
 * "what does feeding the crew this whole shift cost per person."
 */
export interface AggregatedRecipeCostEstimate {
  totalMin: number;
  totalMax: number;
  perPersonMin: number;
  perPersonMax: number;
  crewSize: number;
  recipeCount: number;
  /** How many of the contributing recipes had a trustworthy (>=80% priced, >=3 priceable ingredients) estimate. */
  pricedRecipeCount: number;
  /** False if ANY contributing recipe's coverage wasn't trustworthy — the aggregate is only as good as its weakest meal. */
  coverageTrustworthy: boolean;
  /** Deduped ingredient names that couldn't be priced across all contributing recipes. */
  unpricedIngredients: string[];
}

export function aggregateRecipeCostEstimates(
  estimates: RecipeCostEstimate[],
  crewSize: number,
): AggregatedRecipeCostEstimate {
  const safeCrew = Math.max(1, crewSize);
  const rawTotalMin = estimates.reduce((sum, e) => sum + e.totalMin, 0);
  const rawTotalMax = estimates.reduce((sum, e) => sum + e.totalMax, 0);
  const total = roundDisplayRange(rawTotalMin, rawTotalMax);
  const perPerson = roundPerPerson(rawTotalMin / safeCrew, rawTotalMax / safeCrew);

  return {
    totalMin: total.min,
    totalMax: total.max,
    perPersonMin: perPerson.min,
    perPersonMax: perPerson.max,
    crewSize: safeCrew,
    recipeCount: estimates.length,
    pricedRecipeCount: estimates.filter((e) => e.coverageTrustworthy).length,
    coverageTrustworthy: estimates.length > 0 && estimates.every((e) => e.coverageTrustworthy),
    unpricedIngredients: [...new Set(estimates.flatMap((e) => e.unpricedIngredients))],
  };
}

/** "Estimated total: $58–$66" */
export function formatAggregatedTotalRange(agg: AggregatedRecipeCostEstimate): string {
  return agg.totalMin === agg.totalMax ? `$${agg.totalMin}` : `$${agg.totalMin}\u2013$${agg.totalMax}`;
}

/** "About $7–$8/person" */
export function formatAggregatedPerPersonRange(agg: AggregatedRecipeCostEstimate): string {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return agg.perPersonMin === agg.perPersonMax
    ? `$${fmt(agg.perPersonMin)}/person`
    : `$${fmt(agg.perPersonMin)}\u2013$${fmt(agg.perPersonMax)}/person`;
}
