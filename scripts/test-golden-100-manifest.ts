/**
 * Golden 100 manifest validation (no DB / API).
 */

import assert from "node:assert/strict";
import { GOLDEN_100_RECIPES, GOLDEN_100_TARGET_BY_CATEGORY, goldenManifestSummary } from "../shared/golden-100/manifest.js";
import { validateGoldenManifest } from "../shared/golden-100/validate.js";

const summary = goldenManifestSummary();
assert.equal(summary.total, 104, "manifest must have 104 recipes");

for (const [cat, target] of Object.entries(GOLDEN_100_TARGET_BY_CATEGORY)) {
  const count = GOLDEN_100_RECIPES.filter((r) => r.masterCategoryId === cat).length;
  assert.equal(count, target, `category ${cat} count`);
}

const issues = validateGoldenManifest();
const errors = issues.filter((i) => i.severity === "error");
const warns = issues.filter((i) => i.severity === "warn");
assert.equal(errors.length, 0, `manifest errors: ${errors.map((e) => `${e.slug}:${e.code}`).join("; ")}`);
if (warns.length > 0) {
  console.log(`[test-golden-100-manifest] ${warns.length} title warnings (non-blocking)`);
}

const slugs = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));
assert.equal(slugs.size, 104, "unique slugs");

console.log("[test-golden-100-manifest] OK", summary);
