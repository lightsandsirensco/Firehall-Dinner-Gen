#!/usr/bin/env tsx
/**
 * Publish Performance Meals 50 to client/public/catalog/performance-meals/
 */
import { assertPerformanceManifestCount } from "../shared/performance-meals/manifest.js";
import { auditPerformanceMeals } from "../shared/performance-meals/qa/audit.js";
import { buildAllPerformancePages } from "../server/performance-meals/page-builder.js";
import {
  writePerformanceCatalogIndex,
  writePerformanceRecipePage,
} from "../server/performance-meals/page-store.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";

function main(): void {
  assertPerformanceManifestCount();
  const audit = auditPerformanceMeals();
  if (!audit.pass) {
    console.error("[performance:generate-pages] QA failed:");
    for (const e of audit.errors) {
      console.error(`  ✗ ${e.slug}: ${e.message}`);
    }
    process.exit(1);
  }
  if (audit.warnings.length) {
    console.warn(`[performance:generate-pages] ${audit.warnings.length} warnings (non-blocking)`);
  }

  const pages = buildAllPerformancePages();
  for (const page of pages) {
    const validation = validateGoldenRecipePage(page);
    const errors = validation.issues.filter((i) => i.severity === "error");
    if (errors.length) {
      console.error(`[performance:generate-pages] page validation failed: ${page.slug}`);
      for (const e of errors) console.error(`  ${e.message}`);
      process.exit(1);
    }
    writePerformanceRecipePage(page);
  }
  const indexPath = writePerformanceCatalogIndex(pages);
  console.log(`[performance:generate-pages] ${pages.length} recipes → ${indexPath}`);
}

main();
