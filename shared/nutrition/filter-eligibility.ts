/**
 * Pro numeric nutrition filtering — eligibility rule.
 *
 * Firehall Meals Pro lets users combine free filters with numeric nutrition
 * targets (min protein, max calories, max carbs, max fat). Those numeric
 * comparisons must FAIL CLOSED for any recipe whose stored macros are not
 * objectively trustworthy — otherwise "≥40g protein" could silently include a
 * recipe whose protein figure is known-wrong.
 *
 * This module derives that single boolean (`isEligibleForNumericNutritionFilter`)
 * from the EXISTING, already-computed nutrition integrity audit result (see
 * `./integrity-audit.ts` — `auditRecipeNutritionIntegrity`). It does not
 * recompute nutrition, does not introduce a second calculation engine, and
 * does not maintain a hand-written slug blacklist: eligibility is a pure
 * function of the audit's finding codes for that recipe.
 *
 * IMPORTANT — the audit's "critical" finding codes (which drive its own
 * pass/fail status for the human-facing integrity report) are a SUPERSET of
 * what should disqualify a recipe from numeric filtering. In particular the
 * audit intentionally flags "calories over 900 — verify crew portions" (and
 * the analogous too-high/too-low soft findings for protein/carbs/fat) as a
 * *review* signal, not proof the data is wrong — a legitimate high-calorie
 * recipe is not inherently unreliable. Only findings that indicate the
 * CALCULATION itself is objectively broken (drift vs. ingredients, a
 * batch/serving divisor problem, missing/invalid/impossible values, or an
 * internally-inconsistent macro/calorie total) are treated as disqualifying
 * here.
 */
import type { NutritionIntegrityResult } from "./integrity-audit.js";

/**
 * Finding codes that indicate an objective integrity failure in the
 * nutrition CALCULATION for a recipe (unresolved ingredient drift, a
 * serving/divisor problem, missing/invalid/impossible macros, or internal
 * macro-math inconsistency) — as opposed to a value that is merely high or
 * low and worth a human glance. Recipes with any of these findings must
 * never qualify for Pro numeric nutrition filtering.
 */
export const NUMERIC_FILTER_DISQUALIFYING_CODES: ReadonlySet<string> = new Set([
  /** UI would show 0 for a macro while nutrition is marked available — broken data. */
  "ui_zero_macros",
  /** Stored macros match batch÷(some other crew size) better than batch÷base servings — unresolved divisor problem. */
  "crew_size_coupled",
  /** Stored values look like the batch/tray total, not a per-serving figure — unresolved divisor problem. */
  "likely_batch_total_stored",
  /** Missing or invalid per-serving macro field(s). */
  "incomplete_macros",
  /** Hard implausibility ceiling (e.g. >1600 cal or >120g protein per serving) — not a "verify portion" heuristic. */
  "impossible",
  /** Stored protein diverges from the recipe's own ingredient list by more than the audit's drift tolerance. */
  "ingredient_protein_drift",
  /** Stored calories diverge from the recipe's own ingredient list by more than the audit's drift tolerance. */
  "ingredient_calorie_drift",
  /** protein*4 + carbs*4 + fat*9 doesn't reconcile with the labeled calories — internally inconsistent macros. */
  "macro_calorie_divergence",
  /** A meat-based meal claiming under 10g protein — implausible, not just unusually low. */
  "protein_too_low_meat",
  /** A rice/pasta/potato/bread-based meal claiming under 5g carbs — implausible, not just unusually low. */
  "carbs_too_low_starch",
]);

/**
 * Below this ingredient-match rate, too little of the recipe's ingredient
 * list resolved to a known nutrition profile for the audit's own
 * cross-checks (drift, divisor detection) to be meaningful — the underlying
 * signal is too thin to trust for hard numeric filtering ("insufficient
 * ingredient match").
 */
export const MIN_INGREDIENT_MATCH_PCT_FOR_NUMERIC_FILTER = 70;

export type NumericFilterEligibilityInput = Pick<
  NutritionIntegrityResult,
  "status" | "findings" | "ingredientMatchPct"
>;

/**
 * True when a recipe's stored per-serving macros are reliable enough to use
 * for Pro numeric nutrition filtering (min protein / max calories / max
 * carbs / max fat). Deterministic and centralized — callers must not
 * additionally special-case slugs.
 */
export function isEligibleForNumericNutritionFilter(result: NumericFilterEligibilityInput): boolean {
  // Nutrition unavailable/withheld — never eligible.
  if (result.status === "withheld") return false;

  // Insufficient ingredient match — the audit's own cross-checks (and thus
  // this eligibility signal) aren't meaningful at low match rates.
  if (result.ingredientMatchPct < MIN_INGREDIENT_MATCH_PCT_FOR_NUMERIC_FILTER) return false;

  // Any objective integrity failure — never eligible, regardless of the
  // audit's overall pass/fail status (which also bundles the soft
  // "verify portion" heuristics that must NOT disqualify on their own).
  return !result.findings.some((f) => NUMERIC_FILTER_DISQUALIFYING_CODES.has(f.code));
}
