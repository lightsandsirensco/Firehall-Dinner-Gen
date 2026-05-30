#!/usr/bin/env tsx
/**
 * Seed Hall Expansion 30 into curated_recipes (Explore + generator + approved catalog).
 *
 *   npm run seed:hall-expansion
 *   npm run seed:hall-expansion -- --dry-run
 *   npm run seed:hall-expansion -- --skip-existing
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { upsertHallExpansionRecipe } from "../server/hall-expansion/upsert.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  let ok = 0;
  let skip = 0;
  let fail = 0;

  console.log(
    `[hall-expansion] Seeding ${HALL_EXPANSION_ADAPTED_RECIPES.length} recipes (dryRun=${dryRun})…`,
  );

  for (const recipe of HALL_EXPANSION_ADAPTED_RECIPES) {
    try {
      const result = await upsertHallExpansionRecipe(recipe, {
        dryRun,
        skipIfPublished: skipExisting,
      });
      if (result.ok) {
        if (result.reason === "already_expansion") skip++;
        else ok++;
        console.log(`  ✓ ${recipe.slug}${result.reason ? ` (${result.reason})` : ""}`);
      } else {
        fail++;
        console.warn(`  ✗ ${recipe.slug}: ${result.reason}`);
      }
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${recipe.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun) flushSqliteToDisk();

  console.log(`\n[hall-expansion] done — ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
