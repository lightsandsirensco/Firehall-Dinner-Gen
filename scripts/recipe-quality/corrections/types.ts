/**
 * Declarative, guarded recipe corrections applied to the served page JSON
 * (client/public/catalog/<collection>/pages/<slug>.json).
 *
 * Every edit states what it expects to find, so a correction never lands on
 * text that has changed since it was written, and re-running is a no-op.
 */
export type CorrectionCollection =
  | "golden-100"
  | "performance-meals"
  | "hall-expansion"
  | "pizza-night"
  | "breakfast"
  | "bbq"
  | "smoothies";

export type CorrectionCategory =
  | "food_safety"
  | "dietary"
  | "missing_ingredient"
  | "unused_ingredient"
  | "quantity"
  | "serving_scaling"
  | "instruction"
  | "claim"
  | "nutrition"
  | "presentation";

export type CorrectionOp =
  /** Replace one exact occurrence of `find` inside the string at `path`. */
  | { op: "replace"; path: string; find: string; replace: string }
  /** Set the value at `path`; `expect` must equal the current value. */
  | { op: "set"; path: string; expect: unknown; value: unknown }
  /** Insert `value` into the array at `path` at `index` (skipped if an equal item exists). */
  | { op: "insert"; path: string; index: number; value: unknown }
  /** Remove the array item at `path` whose `name` equals `name`. */
  | { op: "remove"; path: string; name: string };

export interface RecipeCorrection {
  slug: string;
  collection: CorrectionCollection;
  /** Batch id, e.g. "B2-food-safety-01". */
  batch: string;
  category: CorrectionCategory;
  /** Audit finding code(s) this resolves. */
  findings: string[];
  /** Plain-language summary for the change log. */
  summary: string;
  /** Why this is the right fix (culinary or safety rationale). */
  rationale: string;
  /** Authoritative reference for safety or dietary changes. */
  reference?: string;
  /** Edit the recipe page (default) or this recipe's entry in the collection index.json. */
  target?: "page" | "index";
  ops: CorrectionOp[];
}

export const USDA_SAFE_TEMPS =
  "USDA FSIS Safe Minimum Internal Temperature Chart (fsis.usda.gov): poultry 165°F; ground beef/pork/lamb 160°F; ground poultry 165°F; whole cuts of beef/pork/lamb 145°F + 3-min rest; fish 145°F or flesh opaque and flakes; leftovers/casseroles 165°F; hot holding 140°F+ (FDA Food Code 3-501.16)";
