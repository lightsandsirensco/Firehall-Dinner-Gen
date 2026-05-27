#!/usr/bin/env tsx
/**
 * Run editorial QA across the curated catalog — read-only audit.
 *
 * Outputs:
 * - review/editorial-qa-report.json (machine-readable)
 * - stdout summary
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { listCuratedRecipesForEditorialQa, runCatalogEditorialQa } from "../server/curated-recipe-qa.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const recipes = await listCuratedRecipesForEditorialQa();
  const reports = await runCatalogEditorialQa(recipes);

  const outDir = path.join(process.cwd(), "review");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "editorial-qa-report.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    engineVersion: reports[0]?.engineVersion ?? 1,
    recipeCount: reports.length,
    notPublishReady: reports.filter((r) => !r.publishReady).length,
    reports,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const byScore = [...reports].sort((a, b) => a.overallScore - b.overallScore);
  console.log(`[editorial-qa] ${reports.length} recipes audited`);
  console.log(`[editorial-qa] not publish-ready: ${payload.notPublishReady}`);
  console.log(`[editorial-qa] wrote ${outPath}`);
  console.log("[editorial-qa] lowest scores:");
  for (const r of byScore.slice(0, 15)) {
    const codes = r.activeFlags.map((f) => f.code).slice(0, 4).join(", ");
    console.log(`  ${r.overallScore} ${r.slug} — ${codes || "ok"}`);
  }

  await flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
