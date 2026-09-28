/**
 * Seed regional baseline price book.
 *
 * ⚠️ PLACEHOLDER DATA. Every "generic" record below is a manually-estimated
 * national ballpark price (confidence: "low"), NOT sourced from a real
 * retailer feed. It exists so the cost engine + QA script are runnable today.
 * Before showing estimates to real users, these need to be replaced/backed by
 * a real regional pricing data source (see DATA STILL NEEDED in the build
 * summary). A few country/province/city/postal records are included purely
 * to exercise the location fallback hierarchy in tests.
 *
 * Currency: assumed CAD (Firehall Meals' primary market). Not yet
 * locale-aware — see DATA STILL NEEDED.
 */
import type { PriceRecord } from "./types.js";

const SEEDED_AT = "2026-01-01T00:00:00.000Z";

function generic(
  id: string,
  price: number,
  pricing_unit: PriceRecord["pricing_unit"],
  package_size?: number,
): PriceRecord {
  return {
    canonical_ingredient_id: id,
    country: "generic",
    price,
    pricing_unit,
    package_size,
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "low",
    price_type: "baseline",
  };
}

export const BASELINE_PRICE_BOOK: PriceRecord[] = [
  // ---- generic baseline (last-resort fallback) ----
  generic("chicken_breast", 7.49, "lb"),
  generic("chicken_thigh", 5.49, "lb"),
  generic("ground_beef", 6.99, "lb"),
  generic("ground_pork", 5.49, "lb"),
  generic("ground_turkey", 6.49, "lb"),
  generic("bacon", 8.99, "lb"),
  generic("pork_chop", 6.49, "lb"),
  generic("salmon", 11.99, "lb"),
  generic("shrimp", 10.99, "lb"),
  generic("egg", 4.2, "piece", 12),
  generic("cheddar_cheese", 8.5, "lb"),
  generic("mozzarella_cheese", 7.5, "lb"),
  generic("sour_cream", 3.5, "ml", 500),
  generic("butter", 5.5, "lb"),
  generic("milk", 4.5, "l"),
  generic("white_rice", 3.0, "kg"),
  generic("pasta", 2.5, "lb"),
  generic("flour_tortilla", 3.5, "piece", 10),
  generic("corn_tortilla", 3.0, "piece", 20),
  generic("burger_bun", 4.0, "piece", 8),
  generic("potato", 1.5, "lb"),
  generic("onion", 0.75, "piece"),
  generic("garlic", 0.6, "piece", 10),
  generic("bell_pepper", 1.25, "piece"),
  generic("tomato", 0.9, "piece"),
  generic("canned_diced_tomato", 1.79, "g", 796),
  generic("broccoli", 3.5, "lb"),
  generic("carrot", 1.8, "lb"),
  generic("corn", 3.5, "lb"),
  generic("black_beans", 1.69, "g", 540),
  generic("pinto_beans", 1.69, "g", 540),
  generic("lettuce", 2.5, "g", 500),
  generic("cucumber", 1.2, "piece"),
  generic("lime", 0.6, "piece"),
  generic("lemon", 0.7, "piece"),
  generic("cilantro", 1.5, "g", 30),
  generic("jalapeno", 0.3, "piece"),
  generic("avocado", 1.5, "piece"),
  generic("olive_oil", 9.0, "ml", 750),
  generic("vegetable_oil", 6.0, "l"),
  generic("salt", 2.5, "kg"),
  generic("black_pepper", 6.0, "g", 100),
  generic("sugar", 3.5, "kg", 2),
  generic("flour", 4.0, "kg", 2.5),
  generic("soy_sauce", 4.0, "ml", 500),
  generic("bbq_sauce", 4.5, "ml", 425),
  generic("hot_sauce", 4.0, "ml", 150),
  generic("mayo", 5.5, "ml", 890),
  generic("ketchup", 4.0, "l"),
  generic("mustard", 3.0, "ml", 400),
  generic("salsa", 4.5, "ml", 430),
  generic("cumin", 5.0, "g", 100),
  generic("chili_powder", 5.0, "g", 100),
  generic("paprika", 5.0, "g", 100),

  // ---- country-level examples (fallback test fixtures) ----
  {
    canonical_ingredient_id: "chicken_breast",
    country: "CA",
    price: 7.99,
    pricing_unit: "lb",
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "medium",
    price_type: "baseline",
  },
  {
    canonical_ingredient_id: "ground_beef",
    country: "CA",
    price: 7.49,
    pricing_unit: "lb",
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "medium",
    price_type: "baseline",
  },

  // ---- province-level example ----
  {
    canonical_ingredient_id: "ground_beef",
    country: "CA",
    province_state: "ON",
    price: 7.29,
    pricing_unit: "lb",
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "medium",
    price_type: "baseline",
  },

  // ---- city/province example ----
  {
    canonical_ingredient_id: "onion",
    country: "CA",
    province_state: "ON",
    city: "Toronto",
    price: 0.69,
    pricing_unit: "piece",
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "medium",
    price_type: "baseline",
  },

  // ---- postal-region example (most specific) ----
  {
    canonical_ingredient_id: "chicken_breast",
    country: "CA",
    province_state: "ON",
    city: "Toronto",
    postal_region: "M5V",
    price: 7.29,
    pricing_unit: "lb",
    source: "manual_estimate_seed",
    observed_at: SEEDED_AT,
    confidence: "high",
    retailer: "Local flyer sample",
    price_type: "retailer",
  },
];
