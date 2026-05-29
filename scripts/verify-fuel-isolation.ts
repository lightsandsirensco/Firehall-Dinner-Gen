#!/usr/bin/env npx tsx
/**
 * Verify smoothie/fuel content never appears in dinner catalogs.
 */
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/recipes-data.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { isExcludedFromDinnerFeeds } from "../shared/fuel-catalog/isolation.js";
import { SMOOTHIE_CATALOG_SLUGS } from "../shared/fuel-catalog/smoothies/manifest.js";
import { GOLDEN_SET_TAG } from "../shared/golden-100/types.js";

const failures: string[] = [];

for (const slug of SMOOTHIE_CATALOG_SLUGS) {
  if (GOLDEN_100_RECIPES.some((r) => r.slug === slug)) {
    failures.push(`Smoothie slug in Golden 100: ${slug}`);
  }
  if (PERFORMANCE_ADAPTED_RECIPES.some((r) => r.manifest.slug === slug)) {
    failures.push(`Smoothie slug in Performance Meals: ${slug}`);
  }
}

const goldenIndex = path.join(process.cwd(), "client/public/catalog/golden-100/index.json");
if (fs.existsSync(goldenIndex)) {
  const index = JSON.parse(fs.readFileSync(goldenIndex, "utf8")) as {
    recipes?: Array<{ slug: string; title?: string }>;
  };
  for (const slug of SMOOTHIE_CATALOG_SLUGS) {
    if (index.recipes?.some((r) => r.slug === slug)) {
      failures.push(`Smoothie slug in golden index.json: ${slug}`);
    }
  }
  for (const r of index.recipes ?? []) {
    if (isExcludedFromDinnerFeeds({ slug: r.slug, title: r.title })) {
      failures.push(`Dinner catalog row looks like fuel: ${r.slug}`);
    }
  }
}

// Optional DB check when running inside the app with curated store initialized
try {
  const { listCuratedSummariesByTag } = await import("../server/curated-recipe-store.js");
  const goldenCurated = listCuratedSummariesByTag(GOLDEN_SET_TAG, 120);
  for (const row of goldenCurated) {
    if (isExcludedFromDinnerFeeds(row)) {
      failures.push(`Curated golden row excluded as fuel: ${row.slug}`);
    }
  }
} catch {
  /* static checks only without DB */
}

if (failures.length > 0) {
  console.error("[verify:fuel-isolation] FAIL");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `[verify:fuel-isolation] OK — ${SMOOTHIE_CATALOG_SLUGS.length} smoothie slugs isolated from dinner catalogs`,
);
