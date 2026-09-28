/**
 * Internal QA / validation for the shared pricing foundation.
 * Reports Recipe / Estimated cost / Cost-per-person / Coverage % / Unpriced
 * ingredients / Region across a representative sample, then asserts the
 * deterministic behaviors the pricing engine must guarantee.
 *
 * Run: tsx scripts/test-pricing-engine.ts
 */
import {
  estimateRecipeCost,
  formatTotalCostRange,
  formatPerPersonCostRange,
  COVERAGE_THRESHOLD,
  type RecipeCostIngredientInput,
} from "../shared/pricing/cost-engine.js";
import { resolveCanonicalIngredient } from "../shared/pricing/canonical-ingredients.js";
import { convertToBaseUnit } from "../shared/pricing/units.js";
import type { LocationQuery, SaleOverride } from "../shared/pricing/types.js";

let failures = 0;
function check(label: string, cond: boolean) {
  if (!cond) {
    failures++;
    console.error(`FAIL: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

const NO_LOCATION: LocationQuery = {};
const GENERIC_CA: LocationQuery = { country: "CA" };
const TORONTO: LocationQuery = { country: "CA", province_state: "ON", city: "Toronto", postal_code: "M5V 2T6" };

function report(label: string, ingredients: RecipeCostIngredientInput[], servings: number, location: LocationQuery) {
  const est = estimateRecipeCost(ingredients, servings, location);
  console.log(`\n--- ${label} ---`);
  console.log(`servings: ${servings}  region: ${est.regionLabel} (${est.fallbackLevel ?? "n/a"})`);
  console.log(`coverage: ${(est.coveragePct * 100).toFixed(0)}%  trustworthy: ${est.coverageTrustworthy}`);
  console.log(
    est.coverageTrustworthy
      ? `${formatTotalCostRange(est)}  ${formatPerPersonCostRange(est)}`
      : "(coverage below threshold — no estimate shown to users)",
  );
  if (est.unpricedIngredients.length) {
    console.log(`unpriced: ${est.unpricedIngredients.join(", ")}`);
  }
  return est;
}

// ── Sample recipe: metric quantities, full coverage expected ──────────────
const tacoNightMetric: RecipeCostIngredientInput[] = [
  { name: "boneless skinless chicken breasts", quantity: 900, unit: "g" },
  { name: "corn tortillas", quantity: 8, unit: "piece" },
  { name: "shredded cheddar cheese", quantity: 200, unit: "g" },
  { name: "yellow onion", quantity: 1, unit: "piece" },
  { name: "lime", quantity: 2, unit: "piece" },
  { name: "salsa", quantity: 250, unit: "ml" },
];
const metricEst = report("Taco night (metric, 4 servings)", tacoNightMetric, 4, GENERIC_CA);
check("metric recipe fully priced", metricEst.coveragePct === 1);
check("metric recipe trustworthy", metricEst.coverageTrustworthy);
check("metric recipe has a non-degenerate range", metricEst.totalMax >= metricEst.totalMin);

// ── Same recipe, imperial units + cups/tbsp/tsp — should match closely ─────
const tacoNightImperial: RecipeCostIngredientInput[] = [
  { name: "chicken breast", quantity: 2, unit: "lb" },
  { name: "corn tortillas", quantity: 8, unit: "piece" },
  { name: "cheddar", quantity: 0.75, unit: "cup" }, // ~180g shredded, imprecise but resolvable
  { name: "onion", quantity: 1, unit: "" },
  { name: "lime", quantity: 2, unit: "" },
  { name: "salsa", quantity: 1, unit: "cup" },
];
const imperialEst = report("Taco night (imperial + cups, 4 servings)", tacoNightImperial, 4, GENERIC_CA);
// "3/4 cup cheddar" is intentionally left unresolved — there's no reliable
// volume→weight density for shredded cheese, so the engine correctly refuses
// to guess rather than fabricating a conversion. Coverage should still clear
// the trust threshold on the rest of the (mappable + convertible) lines.
check("imperial recipe still clears the coverage threshold", imperialEst.coverageTrustworthy);
check(
  "cup-of-cheese is reported unresolved rather than guessed",
  imperialEst.unpricedIngredients.includes("cheddar"),
);
check(
  "imperial and metric totals land in the same ballpark",
  Math.abs(imperialEst.totalMin - metricEst.totalMin) < metricEst.totalMin * 0.5,
);

// ── Aliases resolve to the same canonical id ───────────────────────────────
check(
  "aliases resolve to one canonical id",
  resolveCanonicalIngredient("chicken breast, cubed")?.ingredient.id === "chicken_breast" &&
    resolveCanonicalIngredient("boneless skinless chicken breasts")?.ingredient.id === "chicken_breast" &&
    resolveCanonicalIngredient("chicken breasts")?.ingredient.id === "chicken_breast",
);

// ── Crew size scaling: doubling servings should roughly double total cost ──
const doubledCrew = tacoNightMetric.map((i) => ({ ...i, quantity: (i.quantity ?? 0) * 2 }));
const scaledEst = report("Taco night (metric, scaled to 8 servings)", doubledCrew, 8, GENERIC_CA);
check(
  "doubling ingredient quantities roughly doubles total cost",
  scaledEst.totalMin >= metricEst.totalMin * 1.7 && scaledEst.totalMin <= metricEst.totalMin * 2.3,
);
check(
  "cost per person stays roughly stable when crew size and quantities scale together",
  Math.abs(scaledEst.perPersonMin - metricEst.perPersonMin) <= Math.max(1, metricEst.perPersonMin * 0.3),
);

// ── Partial coverage: one unmapped ingredient should reduce coverage, not crash ─
const partialCoverage: RecipeCostIngredientInput[] = [
  { name: "chicken breast", quantity: 2, unit: "lb" },
  { name: "white rice", quantity: 300, unit: "g" },
  { name: "dragon fruit reduction", quantity: 1, unit: "cup" }, // unmappable on purpose
];
const partialEst = report("Partial coverage recipe", partialCoverage, 4, GENERIC_CA);
check("partial coverage is between 0 and 1", partialEst.coveragePct > 0 && partialEst.coveragePct < 1);
check(
  "partial coverage below threshold is NOT marked trustworthy",
  partialEst.coveragePct < COVERAGE_THRESHOLD ? !partialEst.coverageTrustworthy : true,
);
check("unmapped ingredient surfaces by name", partialEst.unpricedIngredients.includes("dragon fruit reduction"));

// ── Missing ingredient mapping never fabricates a price ────────────────────
check(
  "totally unknown ingredient returns null (no guess)",
  resolveCanonicalIngredient("freeze-dried unicorn dust") === null,
);

// ── Missing / uncertain unit never fabricates a conversion ─────────────────
check(
  "unresolved unit for weight-priced ingredient returns null, not a guess",
  convertToBaseUnit(1, "handful", "g", "chicken breast") === null,
);
check(
  "reliable piece conversions work (egg, onion, garlic clove)",
  convertToBaseUnit(2, "", "g", "egg") === 100 &&
    convertToBaseUnit(1, "", "g", "onion") === 150 &&
    convertToBaseUnit(3, "clove", "g", "garlic clove") === 15,
);

// ── Location fallback hierarchy ─────────────────────────────────────────────
const fallbackIngredients: RecipeCostIngredientInput[] = [
  { name: "chicken breast", quantity: 2, unit: "lb" },
  { name: "ground beef", quantity: 1, unit: "lb" },
  { name: "onion", quantity: 2, unit: "piece" },
  { name: "white rice", quantity: 300, unit: "g" },
];
const noLocationEst = estimateRecipeCost(fallbackIngredients, 4, NO_LOCATION);
const caOnlyEst = estimateRecipeCost(fallbackIngredients, 4, GENERIC_CA);
const torontoEst = estimateRecipeCost(fallbackIngredients, 4, TORONTO);
check(
  "no location falls all the way back to generic baseline",
  noLocationEst.lines.every((l) => !l.priced || l.fallbackLevel === "generic"),
);
check(
  "country-only location uses country-level prices where available (chicken, beef)",
  caOnlyEst.lines.find((l) => l.canonicalId === "chicken_breast")?.fallbackLevel === "country" &&
    caOnlyEst.lines.find((l) => l.canonicalId === "ground_beef")?.fallbackLevel === "country",
);
check(
  "full postal + city + province location prefers the most specific match available",
  torontoEst.lines.find((l) => l.canonicalId === "chicken_breast")?.fallbackLevel === "postal_region" &&
    torontoEst.lines.find((l) => l.canonicalId === "onion")?.fallbackLevel === "city_province" &&
    torontoEst.lines.find((l) => l.canonicalId === "ground_beef")?.fallbackLevel === "province_state" &&
    torontoEst.lines.find((l) => l.canonicalId === "white_rice")?.fallbackLevel === "generic",
);
check(
  "overall region label reflects the WEAKEST link, not the strongest",
  torontoEst.fallbackLevel === "generic",
);

// ── Sale price override simulation (Premium readiness) ──────────────────────
const saleOverrides: Record<string, SaleOverride> = {
  chicken_breast: {
    canonical_ingredient_id: "chicken_breast",
    price: 4.99,
    pricing_unit: "lb",
    observed_at: new Date().toISOString(),
    retailer: "Sample Local Grocer",
    label: "sale_chicken_breast_4_99",
  },
};
const baselineOnly = estimateRecipeCost(
  [{ name: "chicken breast", quantity: 5, unit: "lb" }],
  4,
  GENERIC_CA,
);
const withSale = estimateRecipeCost(
  [{ name: "chicken breast", quantity: 5, unit: "lb" }],
  4,
  GENERIC_CA,
  { saleOverrides },
);
check("sale override is cheaper than baseline for the same 5 lb", withSale.totalMax < baselineOnly.totalMin);
check("sale override flagged on the estimate", withSale.hasSaleOverrides === true);

const mixedSale = estimateRecipeCost(
  [
    { name: "chicken breast", quantity: 5, unit: "lb" },
    { name: "ground beef", quantity: 1, unit: "lb" },
  ],
  4,
  GENERIC_CA,
  { saleOverrides },
);
check(
  "sale override only affects the targeted ingredient, ground beef stays baseline",
  mixedSale.lines.find((l) => l.canonicalId === "ground_beef")?.fallbackLevel === "country" &&
    mixedSale.lines.find((l) => l.canonicalId === "chicken_breast")?.isSaleOverride === true,
);

// ── Cost/person math sanity ─────────────────────────────────────────────────
check(
  "cost per person = total / servings (within rounding)",
  Math.abs(metricEst.perPersonMin * metricEst.servings - metricEst.totalMin) <= metricEst.servings,
);

console.log(`\n[test-pricing-engine] ${failures === 0 ? "OK" : `${failures} FAILURE(S)`}`);
if (failures > 0) process.exit(1);
