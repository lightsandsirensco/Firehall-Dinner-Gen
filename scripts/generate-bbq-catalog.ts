#!/usr/bin/env tsx
/**
 * Generate Firehall BBQ catalog static pages + index.
 *
 *   npm run catalog:generate-bbq
 */
import {
  BBQ_CATALOG_RECIPES,
  BBQ_CATALOG_RECIPE_COUNT,
} from "../shared/bbq-expansion/batch-25-bbq-recipes.js";
import {
  bbqRecipeToIndexEntry,
  buildBbqCatalogRecipePage,
} from "../server/bbq-catalog/page-builder.js";
import { writeBbqCatalogIndex, writeBbqRecipePage } from "../server/bbq-catalog/page-store.js";
import type { GoldenCatalogIndex } from "../shared/golden-100/recipe-page-schema.js";
import { BBQ_CATALOG_SLUGS } from "../shared/bbq-catalog/slug-registry.js";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";

function main(): void {
  const allSlugs = [...BBQ_CATALOG_SLUGS];
  if (BBQ_CATALOG_RECIPES.length !== BBQ_CATALOG_RECIPE_COUNT) {
    console.error(`[bbq] Expected ${BBQ_CATALOG_RECIPE_COUNT} recipes, found ${BBQ_CATALOG_RECIPES.length}`);
    process.exit(1);
  }

  const pages = BBQ_CATALOG_RECIPES.filter((def) => !PHASE5_REMOVED_SLUGS.has(def.manifest.slug)).map((def) =>
    buildBbqCatalogRecipePage(def, allSlugs),
  );
  for (const page of pages) {
    writeBbqRecipePage(page);
  }

  const index: GoldenCatalogIndex = {
    version: 1,
    contentVersion: 2,
    generatedAt: new Date().toISOString(),
    recipeCount: pages.length,
    recipes: pages.map((page, i) => bbqRecipeToIndexEntry(page, BBQ_CATALOG_RECIPES[i]!)),
  };

  writeBbqCatalogIndex(index);
  console.log(`[bbq] wrote ${pages.length} pages + index`);
}

main();

