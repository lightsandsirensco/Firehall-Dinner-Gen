#!/usr/bin/env tsx
/**
 * Audit Golden 100 manifest + curated DB alignment.
 *
 *   npx tsx scripts/audit-golden-100.ts
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { auditGolden100Dataset, auditGoldenManifestStatic } from "../server/golden-100/audit.js";
import { goldenManifestSummary } from "../shared/golden-100/manifest.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const staticIssues = auditGoldenManifestStatic();
  const audit = auditGolden100Dataset();
  const summary = goldenManifestSummary();

  console.log("\n=== GOLDEN 100 AUDIT ===\n");
  console.log("manifest:", summary);
  console.log("\nstatic issues:", staticIssues.length);
  if (staticIssues.length > 0) {
    for (const i of staticIssues.slice(0, 20)) {
      console.log(`  [${i.severity}] ${i.slug}: ${i.code} — ${i.message}`);
    }
  }

  console.log("\ndatabase:");
  console.log(`  manifest recipes: ${audit.manifestCount}`);
  console.log(`  published golden tag: ${audit.publishedGoldenCount}`);
  console.log(`  matched in db: ${audit.matchedInDb}`);
  console.log(`  passes golden gate: ${audit.passesGoldenGate}`);
  console.log(`  missing in db (${audit.missingInDb.length}):`, audit.missingInDb.slice(0, 15).join(", "));
  if (audit.missingInDb.length > 15) console.log(`    … +${audit.missingInDb.length - 15} more`);
  console.log(`  extra golden in db: ${audit.extraGoldenInDb.length}`);
  console.log(`  weak titles: ${audit.weakTitles.length}`);
  console.log(`  missing imagery meta: ${audit.missingImagery.length}`);
  console.log(`  protein balance:`, audit.proteinBalance);
  console.log("\n  category distribution:");
  for (const [cat, row] of Object.entries(audit.categoryDistribution)) {
    const ok = row.manifest === row.target ? "✓" : "!";
    console.log(`    ${ok} ${cat}: target=${row.target} manifest=${row.manifest} db=${row.db}`);
  }

  const failed = staticIssues.filter((i) => i.severity === "error").length;
  if (failed > 0 || audit.manifestCount !== 100) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
