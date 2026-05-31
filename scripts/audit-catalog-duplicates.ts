#!/usr/bin/env tsx
/**
 * Full-catalog duplicate and similarity audit (Phase 4 gate).
 *
 *   npm run audit:catalog-duplicates
 */
import fs from "node:fs";
import path from "node:path";
import { buildDuplicateReport } from "../shared/catalog-duplicate-audit/build-report.js";

const OUT_PATH = path.join(process.cwd(), "review", "duplicate-report.json");

function main(): void {
  const report = buildDuplicateReport();
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2));

  const s = report.catalogSummary;
  console.log("=== Firehall Catalog Duplicate Audit ===");
  console.log(`Total recipes: ${s.totalRecipes}`);
  console.log(`By collection: ${JSON.stringify(s.byCollection)}`);
  console.log(`EXACT_DUPLICATE recipes: ${s.exactDuplicateRecipes}`);
  console.log(`NEAR_DUPLICATE recipes: ${s.nearDuplicateRecipes}`);
  console.log(`SAME_MEAL_DIFFERENT_NAME recipes: ${s.sameMealDifferentNameRecipes}`);
  console.log(`UNIQUE recipes: ${s.uniqueRecipes}`);
  console.log(`Significant pairs: ${s.duplicatePairCount}`);
  console.log("");
  console.log("Top overrepresented meal types:");
  for (const row of report.topOverrepresentedMealTypes.slice(0, 8)) {
    console.log(`  ${row.count}x ${row.label} — e.g. ${row.examples.slice(0, 2).join(", ")}`);
  }
  console.log("");
  console.log("Saturated patterns (reject new variants):");
  for (const row of report.rejectionPatterns.filter((r) => r.count >= 3)) {
    console.log(`  ${row.count}x ${row.pattern}`);
  }
  console.log("");
  console.log(`Report written: ${OUT_PATH}`);
}

main();
