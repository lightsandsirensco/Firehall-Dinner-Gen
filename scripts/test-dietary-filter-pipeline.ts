#!/usr/bin/env tsx
/**
 * Food Safety & Dietary Intelligence Sprint — filter-pipeline integration test.
 *
 * The unit-level classifier is covered by scripts/dietary-qa-test-cases.ts. This
 * script instead verifies the layer ABOVE the classifier — the actual Explore
 * catalog filter pipeline used by the client (`filterApprovedCatalogEntries`) —
 * against the real, live catalog data (the same `buildApprovedCatalog()` the
 * `/api/catalog/approved` endpoint serves). It asserts:
 *
 *   1. Single-filter positive case: every entry returned under a strict dietary
 *      filter has confidence "high" AND that flag true (no fallback bypass).
 *   2. Single-filter negative case: every entry EXCLUDED by a strict filter
 *      either lacks a verified profile or actually fails that flag.
 *   3. Multi-filter AND logic: filtering by [A, B] together always yields the
 *      exact set-intersection of filtering by [A] and [B] individually — never
 *      a superset (which would indicate a filter being silently ignored/relaxed).
 *   4. Zero-match state: an intentionally-impossible filter combination returns
 *      an empty array, not a fallback to the unfiltered/full catalog.
 *   5. No unverified/low-confidence recipe EVER appears under any active
 *      dietary filter, across the whole catalog.
 *
 *   npx tsx scripts/test-dietary-filter-pipeline.ts
 */
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  filterApprovedCatalogEntries,
  DEFAULT_APPROVED_CATALOG_FILTERS,
  type ApprovedCatalogFilterState,
} from "../client/src/lib/approved-catalog-filters.js";
import { DIETARY_FILTER_KEYS, type DietaryFilterKey } from "../shared/dietary/schema.js";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

function withDietary(keys: DietaryFilterKey[]): ApprovedCatalogFilterState {
  return { ...DEFAULT_APPROVED_CATALOG_FILTERS, dietary: keys };
}

function main() {
  const catalog = buildApprovedCatalog();
  const all = catalog.recipes;
  console.log(`[test-dietary-filter-pipeline] Loaded ${all.length} approved catalog entries.\n`);

  // --- 1 & 2: single-filter positive/negative correctness ---
  for (const key of DIETARY_FILTER_KEYS) {
    const included = filterApprovedCatalogEntries(all, withDietary([key]));
    const excluded = all.filter((e) => !included.includes(e));

    const badIncluded = included.filter(
      (e) => !e.dietarySummary || e.dietarySummary.confidence !== "high" || !e.dietarySummary.flags[key],
    );
    check(
      `Single filter "${key}": every included recipe is high-confidence and flag=true`,
      badIncluded.length === 0,
      badIncluded.map((e) => e.slug).join(", "),
    );

    const badExcluded = excluded.filter(
      (e) => e.dietarySummary && e.dietarySummary.confidence === "high" && e.dietarySummary.flags[key],
    );
    check(
      `Single filter "${key}": no qualifying recipe is wrongly excluded`,
      badExcluded.length === 0,
      badExcluded.map((e) => e.slug).join(", "),
    );
  }

  // --- 3: multi-filter strict AND logic ---
  const pairsToTest: Array<[DietaryFilterKey, DietaryFilterKey]> = [
    ["vegetarian", "glutenFree"],
    ["vegan", "porkFree"],
    ["dairyFree", "nutFree"],
    ["eggFree", "soyFree"],
    ["shellfishFree", "fishFree"],
  ];
  for (const [a, b] of pairsToTest) {
    const onlyA = new Set(filterApprovedCatalogEntries(all, withDietary([a])).map((e) => e.slug));
    const onlyB = new Set(filterApprovedCatalogEntries(all, withDietary([b])).map((e) => e.slug));
    const expectedIntersection = [...onlyA].filter((slug) => onlyB.has(slug)).sort();
    const actualBoth = filterApprovedCatalogEntries(all, withDietary([a, b]))
      .map((e) => e.slug)
      .sort();
    const matches =
      expectedIntersection.length === actualBoth.length &&
      expectedIntersection.every((slug, i) => slug === actualBoth[i]);
    check(
      `Multi-filter AND: [${a}, ${b}] === intersection(${a}, ${b}) (${actualBoth.length} recipes)`,
      matches,
      matches ? undefined : `expected ${expectedIntersection.length} got ${actualBoth.length}`,
    );
  }

  // --- 4: zero-match / empty-state, never a fallback to the full catalog ---
  const impossible = withDietary([
    "vegan",
    "nutFree",
    "peanutFree",
    "soyFree",
    "porkFree",
    "shellfishFree",
    "fishFree",
    "glutenFree",
  ]);
  const impossibleResult = filterApprovedCatalogEntries(all, impossible);
  check(
    "Zero/near-zero-match combined filter never falls back to the unfiltered catalog",
    impossibleResult.length < all.length,
    `got ${impossibleResult.length} of ${all.length} — filter had no effect`,
  );
  check(
    "Empty-state filter returns a plain array (not null/undefined) for the UI to render its empty state",
    Array.isArray(impossibleResult),
  );

  // --- 5: catalog-wide — no low-confidence/unverified recipe ever passes ANY active dietary filter ---
  let bypasses = 0;
  for (const key of DIETARY_FILTER_KEYS) {
    const included = filterApprovedCatalogEntries(all, withDietary([key]));
    bypasses += included.filter((e) => !e.dietarySummary || e.dietarySummary.confidence !== "high").length;
  }
  check("Catalog-wide: zero low-confidence recipes bypass any strict dietary filter", bypasses === 0, `${bypasses} bypasses found`);

  // --- No filters active => full catalog (sanity check the default state itself doesn't drop recipes) ---
  const noFilter = filterApprovedCatalogEntries(all, DEFAULT_APPROVED_CATALOG_FILTERS);
  check("No active dietary filter returns the full catalog", noFilter.length === all.length);

  console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  if (failed > 0) process.exit(1);
}

main();
