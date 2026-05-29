#!/usr/bin/env tsx
/**
 * Generate static Golden 100 recipe pages + catalog index.
 *
 *   npx tsx scripts/catalog-generate-pages.ts
 *   npx tsx scripts/catalog-generate-pages.ts --dry-run
 *   npx tsx scripts/catalog-generate-pages.ts --only=smash-burgers,chicken-parm
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import { writeGoldenCatalogIndex, writeGoldenRecipePage } from "../server/golden-100/page-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const onlySlugs = onlyArg
  ? new Set(onlyArg.replace("--only=", "").split(",").map((s) => s.trim()).filter(Boolean))
  : null;

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  const defs = onlySlugs
    ? GOLDEN_100_RECIPES.filter((r) => onlySlugs.has(r.slug))
    : GOLDEN_100_RECIPES;

  console.log(`[catalog:pages] Building ${defs.length} recipe pages (dryRun=${dryRun})…`);

  const pages = [];
  let fail = 0;

  for (const def of defs) {
    const page = buildGoldenRecipePage(def);
    const validation = validateGoldenRecipePage(page);

    const errors = validation.issues.filter((i) => i.severity === "error");
    if (!validation.pass) {
      fail++;
      console.warn(`  ✗ ${def.slug}: ${errors.map((i) => i.message).join("; ") || "quality warnings"}`);
    } else {
      console.log(`  ✓ ${def.slug} (realism=${page.realismScore}, hall=${page.firefighterScore})`);
    }

    if (!dryRun) {
      writeGoldenRecipePage(page);
    }
    pages.push(page);
  }

  if (!dryRun && pages.length > 0) {
    const indexPath = writeGoldenCatalogIndex(pages);
    flushSqliteToDisk();
    console.log(`\n[catalog:pages] Wrote index → ${indexPath}`);
  }

  console.log(`\n[catalog:pages] done — ok=${pages.length} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
