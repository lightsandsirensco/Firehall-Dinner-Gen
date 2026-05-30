#!/usr/bin/env tsx
/**
 * Seed Breakfast catalog into curated_recipes.
 *
 *   npm run seed:breakfast-catalog
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import {
  listBreakfastPagesFromDisk,
  upsertBreakfastCatalogPage,
} from "../server/breakfast-catalog/upsert.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipExisting = args.includes("--skip-existing");

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const pages = listBreakfastPagesFromDisk();
  if (pages.length === 0) {
    console.error("[breakfast-catalog] No pages on disk — run npm run catalog:generate-breakfast first");
    process.exit(1);
  }

  let ok = 0;
  let skip = 0;
  let fail = 0;

  console.log(`[breakfast-catalog] Seeding ${pages.length} recipes (dryRun=${dryRun})…`);

  for (const page of pages) {
    try {
      const result = await upsertBreakfastCatalogPage(page, {
        dryRun,
        skipIfPublished: skipExisting,
      });
      if (result.ok) {
        if (result.reason === "already_breakfast") skip++;
        else ok++;
        console.log(`  ✓ ${page.slug}${result.reason ? ` (${result.reason})` : ""}`);
      } else {
        fail++;
        console.warn(`  ✗ ${page.slug}: ${result.reason}`);
      }
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${page.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (!dryRun) flushSqliteToDisk();

  console.log(`\n[breakfast-catalog] done — ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
