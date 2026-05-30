#!/usr/bin/env tsx
/**
 * Generate static Pizza Night recipe pages + catalog index.
 *
 *   npx tsx scripts/pizza-night-generate-pages.ts
 */
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { PIZZA_NIGHT_RECIPES } from "../shared/pizza-night/manifest.js";
import { buildGoldenRecipePage } from "../server/golden-100/recipe-page-builder.js";
import { validateGoldenRecipePage } from "../server/golden-100/recipe-page-validator.js";
import {
  writePizzaNightCatalogIndex,
  writePizzaNightRecipePage,
} from "../server/pizza-night/page-store.js";
import { flushSqliteToDisk } from "../server/sqlite.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();

  console.log(`[pizza-night:pages] Building ${PIZZA_NIGHT_RECIPES.length} recipe pages…`);

  const pages = [];
  let fail = 0;

  for (const def of PIZZA_NIGHT_RECIPES) {
    const page = buildGoldenRecipePage(def, { relatedPool: PIZZA_NIGHT_RECIPES });
    const validation = validateGoldenRecipePage(page);
    const errors = validation.issues.filter((i) => i.severity === "error");

    if (!validation.pass) {
      fail++;
      console.warn(`  ✗ ${def.slug}: ${errors.map((i) => i.message).join("; ") || "quality warnings"}`);
    } else {
      console.log(`  ✓ ${def.slug} (realism=${page.realismScore}, hall=${page.firefighterScore})`);
    }

    writePizzaNightRecipePage(page);
    pages.push(page);
  }

  const indexPath = writePizzaNightCatalogIndex(pages);
  flushSqliteToDisk();
  console.log(`\n[pizza-night:pages] Wrote index → ${indexPath}`);
  console.log(`[pizza-night:pages] done — ok=${pages.length} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
