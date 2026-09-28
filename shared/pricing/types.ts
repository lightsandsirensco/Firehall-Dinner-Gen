/**
 * Shared Pricing Foundation — core types.
 *
 * One engine powers BOTH:
 *  - Free: baseline "Estimated cost / cost per person" on every recipe.
 *  - Premium ("Cook What's On Sale", future): sale-price overrides on top of
 *    the same canonical ingredients + baseline price book.
 *
 * No AI/ML at runtime. Everything here is deterministic table lookups + math.
 */

/** Canonical pricing unit a price record / conversion is denominated in. */
export type PricingUnit = "g" | "ml" | "piece";

/** Ingredient categories reused from shared/recipe/constants.ts vocabulary. */
export type CanonicalCategory =
  | "protein"
  | "produce"
  | "dairy"
  | "pantry"
  | "spice"
  | "starch"
  | "sauce"
  | "other";

/** Pantry ownership signal — never used to silently zero out consumed cost. */
export type PantryStatus = "normal" | "likely_staple" | "hall_pantry";

export interface CanonicalIngredient {
  id: string;
  name: string;
  /** Lowercase, trimmed alias phrases that resolve to this id (deterministic substring match). */
  aliases: string[];
  category: CanonicalCategory;
  /** Unit the price book prices this ingredient in. */
  pricingUnit: PricingUnit;
  /** Only for pricingUnit === "piece": reliable avg weight, lets "200g diced onion" price against a per-piece baseline. */
  pieceWeightG?: number;
  /** Default pantry classification; Hall Pantry inventory can override at runtime later. */
  defaultPantryStatus: PantryStatus;
}

export type PriceType = "baseline" | "retailer" | "sale";

/** "low" = generic/national estimate, "high" = fresh local retailer scrape. */
export type PriceConfidence = "low" | "medium" | "high";

/**
 * Provider-agnostic regional price record. Never embedded in a recipe.
 * `price` is the cost of `package_size` units of `pricing_unit`
 * (package_size defaults to 1, i.e. `price` is already a unit price).
 */
export interface PriceRecord {
  canonical_ingredient_id: string;
  /** Free-text regional label for display only, e.g. "Greater Toronto Area". */
  region?: string;
  country: string;
  province_state?: string;
  /** City, paired with province_state for the "city/province" fallback level. */
  city?: string;
  /** Postal FSA / ZIP3 style prefix, e.g. "M5V" or "981". */
  postal_region?: string;
  price: number;
  pricing_unit: "g" | "kg" | "oz" | "lb" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "piece" | "dozen";
  package_size?: number;
  source: string;
  observed_at: string;
  confidence: PriceConfidence;
  retailer?: string;
  price_type: PriceType;
}

/** A future local-deal override for a single canonical ingredient (Premium). */
export interface SaleOverride {
  canonical_ingredient_id: string;
  price: number;
  pricing_unit: PriceRecord["pricing_unit"];
  package_size?: number;
  retailer?: string;
  observed_at: string;
  /** Optional — lets "Cook What's On Sale" show savings vs baseline later. */
  label?: string;
}

export interface LocationQuery {
  country?: string | null;
  province_state?: string | null;
  city?: string | null;
  postal_code?: string | null;
}

export type LocationFallbackLevel =
  | "postal_region"
  | "city_province"
  | "province_state"
  | "country"
  | "generic";

export interface RecipeCostIngredientInput {
  name: string;
  /** Quantity actually consumed by the recipe at its current (already-scaled) serving size. */
  quantity: number | undefined;
  unit: string | undefined;
  optional?: boolean;
}

export interface RecipeCostLine {
  name: string;
  canonicalId: string | null;
  priced: boolean;
  /** Why this line couldn't be priced, when priced === false. */
  reason?: "unmapped_ingredient" | "unit_unresolved" | "no_price_data" | "zero_quantity";
  quantity?: number;
  unit?: string;
  pantryStatus?: PantryStatus;
  isSaleOverride?: boolean;
  costMin?: number;
  costMax?: number;
  confidence?: PriceConfidence;
  fallbackLevel?: LocationFallbackLevel;
}

export interface RecipeCostEstimate {
  lines: RecipeCostLine[];
  unpricedIngredients: string[];
  /** Count-based: priced lines / priceable lines (0 quantity lines excluded from denominator). */
  coveragePct: number;
  /** True once coveragePct clears COVERAGE_THRESHOLD and there's a minimum sample size. */
  coverageTrustworthy: boolean;
  totalMin: number;
  totalMax: number;
  perPersonMin: number;
  perPersonMax: number;
  servings: number;
  /** Best fallback level actually used across priced lines (most specific wins for display). */
  regionLabel: string;
  fallbackLevel: LocationFallbackLevel | null;
  /** True if at least one line used a sale override instead of baseline. */
  hasSaleOverrides: boolean;
}
