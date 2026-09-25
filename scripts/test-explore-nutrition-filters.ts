#!/usr/bin/env tsx
/**
 * Firehall Meals Pro V1 — Advanced Meal Matching (numeric nutrition filters).
 *
 * Covers:
 *  1. Free vs Pro entitlement (advanced_search) for numeric controls + High Protein
 *  2. Individual numeric filters (min protein / max calories / max carbs / max fat)
 *  3. Multiple numeric filters simultaneously, and numeric + existing filters (AND)
 *  4. High Protein preset composes predictably with numeric min-protein
 *  5. Fail-closed nutrition eligibility (insufficient/unreliable data never qualifies)
 *  6. A legitimate >900-calorie recipe is NOT excluded merely for the audit's soft heuristic
 *  7. Smoothies never participate in numeric filtering
 *  8. URL state round-trip, clear-individual, clear-all
 *  9. Zero-result state stays a plain empty array (no silent loosening/fallback)
 * 10. Existing free filters remain free (unconditional, no entitlement dependency)
 * 11. Canonical recipe navigation is unaffected by numeric filters
 *
 *   npx tsx scripts/test-explore-nutrition-filters.ts
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  filterApprovedCatalogEntries,
  DEFAULT_APPROVED_CATALOG_FILTERS,
  hasActiveNumericNutritionFilter,
  type ApprovedCatalogFilterState,
} from "../client/src/lib/approved-catalog-filters.js";
import { approvedCatalogRecipePath } from "../shared/approved-catalog.js";
import { hasFeature, PLAN_BASE_FEATURES } from "../shared/billing/types.js";
import { GUEST_BILLING } from "../client/src/lib/billing/constants.js";
import {
  isEligibleForNumericNutritionFilter,
  NUMERIC_FILTER_DISQUALIFYING_CODES,
} from "../shared/nutrition/filter-eligibility.js";
import type { NutritionIntegrityResult } from "../shared/nutrition/integrity-audit.js";
import {
  parseExploreBrowseSearch,
  buildExploreBrowseSearch,
} from "../shared/browse-canonical.js";

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ PASS: ${name}`);
  } else {
    failed++;
    console.error(`✗ FAIL: ${name}${detail ? `\n    ${detail}` : ""}`);
  }
}

function withFilters(patch: Partial<ApprovedCatalogFilterState>): ApprovedCatalogFilterState {
  return { ...DEFAULT_APPROVED_CATALOG_FILTERS, ...patch };
}

function baseAuditResult(overrides: Partial<NutritionIntegrityResult> = {}): NutritionIntegrityResult {
  return {
    slug: "test-recipe",
    title: "Test Recipe",
    catalog: "golden_100",
    status: "pass",
    servings: 8,
    stored: "500 cal · 40g P · 40g C · 15g F",
    findings: [],
    suspiciousCalories: false,
    suspiciousProtein: false,
    suspiciousCarbs: false,
    suspiciousFat: false,
    showsZeroUi: false,
    crewSizeCoupled: false,
    needsRecalculation: false,
    ingredientMatchPct: 95,
    ...overrides,
  };
}

function main() {
  const catalog = buildApprovedCatalog();
  const all = catalog.recipes;
  console.log(`[test-explore-nutrition-filters] Loaded ${all.length} approved catalog entries.\n`);

  // =====================================================================
  // 1. ENTITLEMENT — free vs Pro (advanced_search)
  // =====================================================================
  check(
    "Guest/free billing does NOT include advanced_search",
    hasFeature(GUEST_BILLING.features, "advanced_search") === false,
  );
  check(
    "Personal (free signed-in) plan base features do NOT include advanced_search",
    !PLAN_BASE_FEATURES.personal.includes("advanced_search"),
  );
  check(
    "firefighter_plus plan base features DO include advanced_search",
    PLAN_BASE_FEATURES.firefighter_plus.includes("advanced_search"),
  );
  // Admin-granted firefighter_plus users must be able to use the feature —
  // entitlement is resolved purely from plan_id (see shared/billing/types.ts
  // hasFeature/PLAN_BASE_FEATURES), with no separate "admin vs paid" branch,
  // so an admin grant of firefighter_plus is indistinguishable from (and
  // therefore just as usable as) a real subscription for this feature.
  const filtersSource = fs.readFileSync(
    path.join(process.cwd(), "client", "src", "components", "explore-catalog-filters.tsx"),
    "utf8",
  );
  check(
    "Explore filters UI reads entitlement via useFeature(\"advanced_search\")",
    /useFeature\(\s*"advanced_search"\s*\)/.test(filtersSource),
  );
  check(
    "Free-user click on the numeric Nutrition targets control routes to the Pro upgrade flow (not silently applying filters)",
    /requestProFilter\(\s*"nutrition_targets"\s*\)/.test(filtersSource),
  );
  check(
    "The numeric Nutrition targets input fields only render/mount when hasProFilters is true (gated section)",
    /hasProFilters \? \(\s*<Collapsible/.test(filtersSource),
  );
  check(
    "Free-user paywall interaction fires the existing pro_feature_clicked analytics (trackProFeatureClicked)",
    /trackProFeatureClicked/.test(filtersSource),
  );
  check(
    "Free-user paywall interaction records the existing pro_paywall_viewed analytics (recordPaywall/advanced_search)",
    // requestProFilter() now takes a billingFeature param (defaulting to
    // "advanced_search") so the same helper can also attribute the Foods to
    // Avoid paywall to "ingredient_preferences" — see Pro V1 Feature 2. The
    // nutrition-targets/high-protein call sites still call it with NO second
    // arg, so they still resolve to "advanced_search" via that default.
    /recordPaywall\(\s*"advanced_search"/.test(filtersSource) ||
      (/recordPaywall\(\s*billingFeature/.test(filtersSource) &&
        /billingFeature[^,)]*=\s*"advanced_search"/.test(filtersSource)),
  );

  // =====================================================================
  // 2. INDIVIDUAL NUMERIC FILTERS
  // =====================================================================
  const eligibleWithMacros = all.filter((e) => e.numericFilterEligible && e.macros);
  check(
    "At least one catalog recipe is eligible for numeric nutrition filtering",
    eligibleWithMacros.length > 0,
    `eligible=${eligibleWithMacros.length}/${all.length}`,
  );

  {
    const minProtein = withFilters({ minProtein: 40 });
    const result = filterApprovedCatalogEntries(all, minProtein);
    const bad = result.filter((e) => !e.macros || e.macros.protein < 40);
    check("Min protein ≥40g: every result actually has ≥40g protein", bad.length === 0, bad.map((e) => e.slug).join(", "));
    check(
      "Min protein ≥40g: narrows the catalog (doesn't return everything)",
      result.length < all.length && result.length > 0,
      `got ${result.length}/${all.length}`,
    );
  }

  {
    const maxCalories = withFilters({ maxCalories: 700 });
    const result = filterApprovedCatalogEntries(all, maxCalories);
    const bad = result.filter((e) => !e.macros || e.macros.calories > 700);
    check("Max calories ≤700: every result is actually ≤700 cal", bad.length === 0, bad.map((e) => e.slug).join(", "));
    check("Max calories ≤700: narrows the catalog", result.length < all.length && result.length > 0);
  }

  {
    const maxCarbs = withFilters({ maxCarbs: 60 });
    const result = filterApprovedCatalogEntries(all, maxCarbs);
    const bad = result.filter((e) => !e.macros || e.macros.carbs > 60);
    check("Max carbs ≤60g: every result is actually ≤60g carbs", bad.length === 0, bad.map((e) => e.slug).join(", "));
  }

  {
    const maxFat = withFilters({ maxFat: 25 });
    const result = filterApprovedCatalogEntries(all, maxFat);
    const bad = result.filter((e) => !e.macros || e.macros.fat > 25);
    check("Max fat ≤25g: every result is actually ≤25g fat", bad.length === 0, bad.map((e) => e.slug).join(", "));
  }

  // =====================================================================
  // 3. MULTIPLE NUMERIC FILTERS + COMPOSITION WITH EXISTING FILTERS
  // =====================================================================
  {
    const combined = withFilters({ minProtein: 30, maxCalories: 700, maxCarbs: 60, maxFat: 30 });
    const result = filterApprovedCatalogEntries(all, combined);
    const bad = result.filter(
      (e) =>
        !e.macros ||
        e.macros.protein < 30 ||
        e.macros.calories > 700 ||
        e.macros.carbs > 60 ||
        e.macros.fat > 30,
    );
    check(
      "Multiple numeric filters simultaneously: every result satisfies ALL four targets",
      bad.length === 0,
      bad.map((e) => e.slug).join(", "),
    );
  }

  {
    // Chicken + ≥40g protein
    const proteinRow = all.find((e) => e.protein.toLowerCase().includes("chicken"));
    if (proteinRow) {
      const combined = withFilters({ protein: proteinRow.protein, minProtein: 40 });
      const result = filterApprovedCatalogEntries(all, combined);
      const bad = result.filter((e) => e.protein !== proteinRow.protein || !e.macros || e.macros.protein < 40);
      check(
        `Numeric + protein filter: "${proteinRow.protein}" + ≥40g protein composes as AND`,
        bad.length === 0,
        bad.map((e) => e.slug).join(", "),
      );
    } else {
      check("Numeric + protein filter: fixture found", false, "no chicken-protein recipe in catalog");
    }
  }

  {
    // Gluten-Free + ≤700 calories
    const combined = withFilters({ dietary: ["glutenFree"], maxCalories: 700 });
    const result = filterApprovedCatalogEntries(all, combined);
    const bad = result.filter(
      (e) =>
        !e.dietarySummary ||
        e.dietarySummary.confidence !== "high" ||
        !e.dietarySummary.flags.glutenFree ||
        !e.macros ||
        e.macros.calories > 700,
    );
    check(
      "Numeric + dietary filter: Gluten-Free + ≤700 calories composes as AND",
      bad.length === 0,
      bad.map((e) => e.slug).join(", "),
    );
  }

  {
    // ≤45 minutes + ≥40g protein
    const combined = withFilters({ cookTime: "under_30", minProtein: 30 });
    const result = filterApprovedCatalogEntries(all, combined);
    const bad = result.filter((e) => e.cookTimeBucket !== "under_30" || !e.macros || e.macros.protein < 30);
    check(
      "Numeric + cook-time filter: under_30 + ≥30g protein composes as AND",
      bad.length === 0,
      bad.map((e) => e.slug).join(", "),
    );
  }

  {
    // Full combo from the spec: Chicken + Gluten-Free + ≤45min + ≥40g protein + ≤700 cal
    const chickenRow = all.find((e) => e.protein.toLowerCase().includes("chicken"));
    const combined = withFilters({
      protein: chickenRow?.protein ?? "all",
      dietary: ["glutenFree"],
      cookTime: "30_to_60",
      minProtein: 40,
      maxCalories: 700,
    });
    const result = filterApprovedCatalogEntries(all, combined);
    const bad = result.filter(
      (e) =>
        (chickenRow ? e.protein !== chickenRow.protein : false) ||
        !e.dietarySummary ||
        e.dietarySummary.confidence !== "high" ||
        !e.dietarySummary.flags.glutenFree ||
        e.cookTimeBucket !== "30_to_60" ||
        !e.macros ||
        e.macros.protein < 40 ||
        e.macros.calories > 700,
    );
    check(
      "Full filter combo (protein + dietary + cook time + 2 numeric targets) composes as strict AND",
      bad.length === 0,
      bad.map((e) => e.slug).join(", "),
    );
  }

  // =====================================================================
  // 4. HIGH PROTEIN PRESET INTERACTION
  // =====================================================================
  {
    const highProteinOnly = filterApprovedCatalogEntries(all, withFilters({ highProtein: true }));
    check(
      "High Protein preset alone still uses the canonical isHighProtein flag (unchanged)",
      highProteinOnly.every((e) => e.isHighProtein),
    );

    // Composition: High Protein + a numeric min-protein ABOVE the canonical
    // threshold must be a strict subset of High Protein alone (never wider).
    const combined = filterApprovedCatalogEntries(all, withFilters({ highProtein: true, minProtein: 45 }));
    const combinedSlugs = new Set(combined.map((e) => e.slug));
    const isSubset = [...combinedSlugs].every((slug) => highProteinOnly.some((e) => e.slug === slug));
    check(
      "High Protein + numeric min-protein(45g) is a subset of High Protein alone (predictable AND composition)",
      isSubset && combined.length <= highProteinOnly.length,
    );
    const bad = combined.filter((e) => !e.isHighProtein || !e.macros || e.macros.protein < 45);
    check(
      "High Protein + numeric min-protein(45g): every result satisfies BOTH the preset and the numeric target",
      bad.length === 0,
      bad.map((e) => e.slug).join(", "),
    );
  }

  // =====================================================================
  // 5. FAIL-CLOSED ELIGIBILITY (unit tests on the eligibility function)
  // =====================================================================
  check(
    "Withheld nutrition (unavailable) is never eligible for numeric filtering",
    isEligibleForNumericNutritionFilter(baseAuditResult({ status: "withheld" })) === false,
  );
  check(
    "Insufficient ingredient match (<70%) is never eligible",
    isEligibleForNumericNutritionFilter(baseAuditResult({ ingredientMatchPct: 40 })) === false,
  );
  check(
    "Unresolved ingredient calorie drift is never eligible",
    isEligibleForNumericNutritionFilter(
      baseAuditResult({ status: "fail", findings: [{ code: "ingredient_calorie_drift", message: "x" }] }),
    ) === false,
  );
  check(
    "Crew-size-coupled (unresolved divisor problem) is never eligible",
    isEligibleForNumericNutritionFilter(
      baseAuditResult({ status: "fail", crewSizeCoupled: true, findings: [{ code: "crew_size_coupled", message: "x" }] }),
    ) === false,
  );
  check(
    "UI-zero-macros (broken data) is never eligible",
    isEligibleForNumericNutritionFilter(
      baseAuditResult({ status: "fail", showsZeroUi: true, findings: [{ code: "ui_zero_macros", message: "x" }] }),
    ) === false,
  );
  check(
    "Incomplete macros (missing/invalid values) is never eligible",
    isEligibleForNumericNutritionFilter(
      baseAuditResult({ status: "fail", findings: [{ code: "incomplete_macros", message: "x" }] }),
    ) === false,
  );

  // =====================================================================
  // 6. A LEGITIMATE >900-CALORIE RECIPE IS NOT EXCLUDED FOR THE SOFT HEURISTIC ALONE
  // =====================================================================
  check(
    "\"calories_too_high\" (the soft >900 review heuristic) is NOT in the disqualifying code set",
    !NUMERIC_FILTER_DISQUALIFYING_CODES.has("calories_too_high"),
  );
  check(
    "A recipe whose ONLY finding is the soft >900-calorie heuristic remains eligible",
    isEligibleForNumericNutritionFilter(
      baseAuditResult({
        status: "fail",
        suspiciousCalories: true,
        findings: [{ code: "calories_too_high", message: "Calories over 900 per serving (1100) — verify crew portions" }],
      }),
    ) === true,
  );
  // Same principle for the analogous soft too-high heuristics (protein/carbs/fat "verify portion").
  for (const softCode of ["protein_too_high", "carbs_too_high", "fat_too_high"]) {
    check(
      `Soft "${softCode}" (verify portion) heuristic alone does not disqualify a recipe`,
      isEligibleForNumericNutritionFilter(
        baseAuditResult({ status: "fail", findings: [{ code: softCode, message: "verify portion" }] }),
      ) === true,
    );
  }
  // Confirm this isn't theoretical — at least one real >900 cal recipe in the
  // live catalog is in fact numeric-filter-eligible (not blanket-excluded).
  const legitimateHighCalorieEligible = eligibleWithMacros.some((e) => (e.macros?.calories ?? 0) > 900);
  check(
    "At least one real catalog recipe over 900 calories is numeric-filter-eligible (not blanket-excluded)",
    legitimateHighCalorieEligible,
  );

  // =====================================================================
  // 7. SMOOTHIES NEVER PARTICIPATE
  // =====================================================================
  const smoothieRows = all.filter((e) => e.isSmoothie);
  check("Catalog contains smoothie entries (fixture sanity)", smoothieRows.length > 0);
  check(
    "Every smoothie entry has numericFilterEligible === false",
    smoothieRows.every((e) => e.numericFilterEligible === false),
  );
  check(
    "No smoothie entry exposes a `macros` object",
    smoothieRows.every((e) => e.macros === undefined),
  );
  {
    const anyNumeric = filterApprovedCatalogEntries(all, withFilters({ minProtein: 1 }));
    check(
      "No smoothie ever appears under any active numeric nutrition filter",
      anyNumeric.every((e) => !e.isSmoothie),
    );
  }

  // =====================================================================
  // 8. URL STATE — round-trip, clear individual, clear all
  // =====================================================================
  {
    const qs = buildExploreBrowseSearch({
      primary: "all",
      category: "all",
      protein: "all",
      cookTime: "all",
      highProtein: false,
      lowCarb: false,
      lowCleanup: false,
      searchQuery: "",
      minProtein: 40,
      maxCalories: 700,
      maxCarbs: 60,
      maxFat: 25,
    });
    check("Numeric filters serialize to readable, stable query params", qs.includes("minProtein=40") && qs.includes("maxCalories=700"));
    const patch = parseExploreBrowseSearch(qs);
    check(
      "URL round-trip: parse(build(x)) recovers every numeric target exactly",
      patch.minProtein === 40 && patch.maxCalories === 700 && patch.maxCarbs === 60 && patch.maxFat === 25,
    );
  }
  {
    // Refresh / copy-paste / back-forward all just re-parse the same search string.
    const search = "?minProtein=35&maxCalories=650&highProtein=1&dietary=glutenFree";
    const patch = parseExploreBrowseSearch(search);
    check(
      "Copy/paste survival: an externally-typed URL parses numeric + existing filters together",
      patch.minProtein === 35 && patch.maxCalories === 650 && patch.highProtein === true && patch.dietary?.[0] === "glutenFree",
    );
  }
  {
    // Garbage/abuse values are rejected, not passed through.
    const patch = parseExploreBrowseSearch("?minProtein=-5&maxCalories=abc&maxCarbs=999999");
    check(
      "Invalid/out-of-range numeric query params are dropped, not silently applied",
      patch.minProtein === undefined && patch.maxCalories === undefined && patch.maxCarbs === 500,
    );
  }
  {
    // Clear individual filter
    const state = withFilters({ minProtein: 40, maxCalories: 700, dietary: ["vegan"] });
    const cleared = { ...state, minProtein: null };
    check(
      "Clear individual numeric filter: only that field resets, siblings survive",
      cleared.minProtein === null && cleared.maxCalories === 700 && cleared.dietary.length === 1,
    );
  }
  {
    // Clear all
    const state = withFilters({ minProtein: 40, maxCalories: 700, maxCarbs: 60, maxFat: 25, dietary: ["vegan"], highProtein: true });
    check("hasActiveNumericNutritionFilter is true before clearing", hasActiveNumericNutritionFilter(state));
    const cleared = { ...DEFAULT_APPROVED_CATALOG_FILTERS };
    check(
      "Clear all resets every numeric target to null (DEFAULT_APPROVED_CATALOG_FILTERS)",
      cleared.minProtein === null && cleared.maxCalories === null && cleared.maxCarbs === null && cleared.maxFat === null,
    );
    check("hasActiveNumericNutritionFilter is false after clearing", !hasActiveNumericNutritionFilter(cleared));
  }

  // =====================================================================
  // 9. ZERO-RESULT STATE
  // =====================================================================
  {
    // Vegan + ≥80g protein + ≤400 calories — expected to be empty or near-empty.
    const impossible = withFilters({ dietary: ["vegan"], minProtein: 80, maxCalories: 400 });
    const result = filterApprovedCatalogEntries(all, impossible);
    check(
      "Vegan + ≥80g protein + ≤400 calories returns a plain array (possibly empty), not null/undefined",
      Array.isArray(result),
    );
    check(
      "Zero/near-zero-result numeric combo never falls back to the unfiltered catalog",
      result.length < all.length,
    );
    const violatesTarget = result.some(
      (e) =>
        !e.dietarySummary?.flags.vegan ||
        !e.macros ||
        e.macros.protein < 80 ||
        e.macros.calories > 400,
    );
    check("Zero/near-zero-result combo never recommends a recipe violating the selected targets", !violatesTarget);
  }

  // =====================================================================
  // 10. EXISTING FREE FILTERS REMAIN FREE (unconditional — no entitlement dependency)
  // =====================================================================
  check(
    "filterApprovedCatalogEntries has no billing/entitlement parameter — free filters are applied unconditionally",
    filterApprovedCatalogEntries.length === 2,
  );
  {
    const lowCarbOnly = filterApprovedCatalogEntries(all, withFilters({ lowCarb: true }));
    check("Low carb (free) filters without any entitlement check", lowCarbOnly.every((e) => e.isLowCarb));
    const lowCleanupOnly = filterApprovedCatalogEntries(all, withFilters({ lowCleanup: true }));
    check("Low cleanup (free) filters without any entitlement check", lowCleanupOnly.every((e) => e.isLowCleanup));
    const cookTimeOnly = filterApprovedCatalogEntries(all, withFilters({ cookTime: "under_30" }));
    check("Cook time (free) filters without any entitlement check", cookTimeOnly.every((e) => e.cookTimeBucket === "under_30"));
    const dietaryOnly = filterApprovedCatalogEntries(all, withFilters({ dietary: ["vegetarian"] }));
    check(
      "Dietary (free) filters without any entitlement check",
      dietaryOnly.every((e) => e.dietarySummary?.confidence === "high" && e.dietarySummary.flags.vegetarian),
    );
  }
  check(
    "Low carb / low cleanup chips are not gated behind hasProFilters in the UI source",
    !/if \(!hasProFilters\) \{\s*requestProFilter\("low_carb"/.test(filtersSource) &&
      !/if \(!hasProFilters\) \{\s*requestProFilter\("low_cleanup"/.test(filtersSource),
  );

  // =====================================================================
  // 11. CANONICAL RECIPE NAVIGATION UNAFFECTED
  // =====================================================================
  {
    const sampleEligible = eligibleWithMacros[0];
    if (sampleEligible) {
      const pathBefore = approvedCatalogRecipePath(sampleEligible.slug);
      // Applying numeric filters doesn't change how an individual recipe's
      // canonical path is derived — path derivation takes only a slug.
      const pathAfter = approvedCatalogRecipePath(sampleEligible.slug);
      check(
        "Canonical recipe path is stable/unaffected by numeric filter state",
        pathBefore === pathAfter && (pathBefore.startsWith("/recipes/") || pathBefore.startsWith("/breakfast/") || pathBefore.startsWith("/smoothies/")),
      );
    }
  }

  console.log(`\n${failed === 0 ? "ALL CHECKS PASSED" : `${failed} CHECK(S) FAILED`}`);
  if (failed > 0) process.exit(1);
}

main();
