#!/usr/bin/env tsx
/**
 * Auto-link curated recipes to archetype families and parent-child variant relationships.
 * Does not change recipe slugs or ingredient/step content.
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { listCuratedRecipesForEditorialQa } from "../server/curated-recipe-qa.js";
import { autoLinkCuratedFamilies, auditVariantDuplicates } from "../server/curated-recipe-families.js";
import { flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const recipes = await listCuratedRecipesForEditorialQa();
  const { proposed, applied } = await autoLinkCuratedFamilies(recipes);
  const nearDupes = await auditVariantDuplicates(recipes);

  const roles = proposed.reduce(
    (acc, p) => {
      acc[p.recipeRole] = (acc[p.recipeRole] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(`[families] linked ${applied} recipes`);
  console.log(`[families] roles:`, roles);
  console.log(`[families] near-duplicate variant pairs: ${nearDupes.length}`);
  for (const p of nearDupes.slice(0, 12)) {
    console.log(`  ${p.overall}% ${p.slugA} ↔ ${p.slugB}`);
  }

  await flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
