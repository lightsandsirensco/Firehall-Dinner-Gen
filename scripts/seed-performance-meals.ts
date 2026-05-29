#!/usr/bin/env tsx
/**
 * Seed Performance Meals 50 into curated_recipes for explore + generator.
 *
 *   npx tsx scripts/seed-performance-meals.ts --dry-run
 *   npx tsx scripts/seed-performance-meals.ts --skip-existing
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { upsertPerformanceMeal } from "../server/performance-meals/upsert.js";
import { PERFORMANCE_ADAPTED_RECIPES } from "../shared/performance-meals/adapted/index.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  let ok = 0;
  let skip = 0;
  let fail = 0;

  console.log(`[performance-meals] Seeding ${PERFORMANCE_ADAPTED_RECIPES.length} recipes (dryRun=${dryRun})…`);

  for (const recipe of PERFORMANCE_ADAPTED_RECIPES) {
    try {
      const result = await upsertPerformanceMeal(recipe, {
        dryRun,
        skipIfPublished: skipExisting,
      });
      if (result.ok) {
        if (result.reason === "already_performance") skip++;
        else ok++;
        console.log(`  ✓ ${recipe.manifest.slug}${result.reason ? ` (${result.reason})` : ""}`);
      } else {
        fail++;
        console.warn(`  ✗ ${recipe.manifest.slug}: ${result.reason}`);
      }
    } catch (err: unknown) {
      fail++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ✗ ${recipe.manifest.slug}: ${msg}`);
    }
  }

  if (!dryRun) flushSqliteToDisk();

  console.log(`\n[performance-meals] done — ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
