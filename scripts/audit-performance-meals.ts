#!/usr/bin/env tsx
import { auditPerformanceMeals } from "../shared/performance-meals/qa/audit.js";
import { listPerformancePageSlugs } from "../server/performance-meals/page-store.js";
import { PERFORMANCE_MEAL_COUNT } from "../shared/performance-meals/types.js";

const report = auditPerformanceMeals();
const published = listPerformancePageSlugs();

console.log(
  `[audit:performance-meals] recipes=${report.recipeCount} published=${published.length} pass=${report.pass}`,
);
console.log(`  errors=${report.errors.length} warnings=${report.warnings.length}`);

if (published.length < PERFORMANCE_MEAL_COUNT) {
  console.warn(`  published page count ${published.length} < ${PERFORMANCE_MEAL_COUNT}`);
}

for (const e of report.errors) {
  console.error(`  ✗ ${e.slug}: ${e.code} — ${e.message}`);
}
for (const w of report.warnings.slice(0, 15)) {
  console.warn(`  ⚠ ${w.slug}: ${w.code} — ${w.message}`);
}
if (report.warnings.length > 15) {
  console.warn(`  … and ${report.warnings.length - 15} more warnings`);
}

process.exit(report.pass ? 0 : 1);
