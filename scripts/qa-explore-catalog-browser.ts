#!/usr/bin/env tsx
/**
 * Verify Explore approved catalog browse.
 *
 *   npx tsx scripts/qa-explore-catalog-browser.ts
 */
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import { loadMergedHallCatalogIndex } from "../server/meal-catalog/load-index.js";
import { SMOOTHIE_CATALOG_ITEMS } from "../shared/fuel-catalog/smoothies/catalog-data.js";
import {
  isApprovedCatalogSlug,
  isPerformance50Slug,
} from "../shared/hall-catalog/gate.js";
import { APPROVED_CATALOG_TOTAL } from "../shared/meal-catalog/curated-count.js";
import { resolveExistingSlugImage } from "../shared/explore-image-paths.js";
import {
  filterApprovedCatalogEntries,
  DEFAULT_APPROVED_CATALOG_FILTERS,
} from "../client/src/lib/approved-catalog-filters.js";

const FORBIDDEN_PUBLIC_LABELS = ["Golden 100", "Performance 50", "golden_100", "performance_50"];

function main(): void {
  const catalog = buildApprovedCatalog();
  const index = loadMergedHallCatalogIndex();
  const errors: string[] = [];

  if (catalog.recipeCount !== catalog.recipes.length) {
    errors.push(`recipeCount mismatch: ${catalog.recipeCount} vs ${catalog.recipes.length}`);
  }

  const mealCount = catalog.recipes.filter((entry) => !entry.isSmoothie).length;
  const expectedMeals =
    index.recipes.filter((entry) => isApprovedCatalogSlug(entry.slug)).length +
    catalog.recipes.filter((entry) => entry.kind === "breakfast_catalog").length;
  if (mealCount !== expectedMeals) {
    errors.push(`Meal count mismatch: expected ${expectedMeals}, got ${mealCount}`);
  }

  if (catalog.recipeCount !== APPROVED_CATALOG_TOTAL) {
    errors.push(`Approved catalog total mismatch: expected ${APPROVED_CATALOG_TOTAL}, got ${catalog.recipeCount}`);
  }

  const smoothieCount = catalog.recipes.filter((entry) => entry.isSmoothie).length;
  const mealSlugs = new Set(
    index.recipes.filter((entry) => isApprovedCatalogSlug(entry.slug)).map((entry) => entry.slug.trim().toLowerCase()),
  );
  const expectedSmoothies = SMOOTHIE_CATALOG_ITEMS.filter(
    (item) => !mealSlugs.has(item.slug.trim().toLowerCase()),
  ).length;
  if (smoothieCount !== expectedSmoothies) {
    errors.push(
      `Smoothie count mismatch: expected ${expectedSmoothies}, got ${smoothieCount}`,
    );
  }

  const performanceInBrowse = catalog.recipes.filter((entry) =>
    isPerformance50Slug(entry.slug),
  ).length;
  if (performanceInBrowse === 0) {
    errors.push("Performance Meals missing from approved catalog browse");
  }

  const healthyMatches = filterApprovedCatalogEntries(catalog.recipes, {
    ...DEFAULT_APPROVED_CATALOG_FILTERS,
    primary: "healthy",
  });
  if (healthyMatches.length === 0) {
    errors.push("Healthy filter returned zero recipes");
  }

  const bbqMatches = filterApprovedCatalogEntries(catalog.recipes, {
    ...DEFAULT_APPROVED_CATALOG_FILTERS,
    primary: "bbq_grill",
  });
  if (bbqMatches.length === 0) {
    errors.push("BBQ & Grill filter returned zero recipes");
  }

  const smoothieMatches = filterApprovedCatalogEntries(catalog.recipes, {
    ...DEFAULT_APPROVED_CATALOG_FILTERS,
    primary: "smoothies",
  });
  if (smoothieMatches.length !== smoothieCount) {
    errors.push("Smoothies filter mismatch");
  }

  const slugs = new Set<string>();
  for (const entry of catalog.recipes) {
    if (!entry.isSmoothie && !isApprovedCatalogSlug(entry.slug)) {
      errors.push(`Unapproved meal slug in browse index: ${entry.slug}`);
    }
    if (slugs.has(entry.slug)) {
      errors.push(`Duplicate slug in browse index: ${entry.slug}`);
    }
    slugs.add(entry.slug);

    const badgeHay = `${entry.catalogBadge} ${entry.traitBadges.join(" ")}`;
    for (const forbidden of FORBIDDEN_PUBLIC_LABELS) {
      if (badgeHay.includes(forbidden)) {
        errors.push(`Forbidden public label "${forbidden}" on ${entry.slug}`);
      }
    }

    if (!entry.heroImage.startsWith("/images/")) {
      errors.push(`Non-curated image path on ${entry.slug}: ${entry.heroImage}`);
    }

    const resolved = resolveExistingSlugImage(entry.slug, entry.kind);
    if (!resolved.found) {
      errors.push(`Missing on-disk image for ${entry.slug}`);
    }

    if (!entry.title.trim()) errors.push(`Missing title for ${entry.slug}`);
  }

  if (errors.length > 0) {
    console.error("[qa-explore-catalog-browser] FAIL\n");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(
    `[qa-explore-catalog-browser] PASS — ${catalog.recipeCount} approved recipes (${mealCount} meals, ${smoothieCount} smoothies, ${performanceInBrowse} performance meals)`,
  );
}

main();
