#!/usr/bin/env tsx
/**   npm run seed:bbq-catalog */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { listBbqPagesFromDisk, upsertBbqCatalogPage } from "../server/bbq-catalog/upsert.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const pages = listBbqPagesFromDisk();
  if (pages.length === 0) {
    console.error("[bbq-catalog] No pages — run npm run catalog:generate-bbq first");
    process.exit(1);
  }
  let ok = 0;
  let fail = 0;
  console.log(`[bbq-catalog] Seeding ${pages.length} recipes…`);
  for (const page of pages) {
    try {
      const result = await upsertBbqCatalogPage(page);
      if (result.ok) {
        ok++;
        console.log(`  ✓ ${page.slug}`);
      } else {
        fail++;
        console.warn(`  ✗ ${page.slug}: ${result.reason}`);
      }
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${page.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  flushSqliteToDisk();
  console.log(`\n[bbq-catalog] done ok=${ok} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
