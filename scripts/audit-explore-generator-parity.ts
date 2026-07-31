/**
 * Explore / Generator parity audit.
 *
 * Explore's catalog (server/approved-catalog.ts -> buildAllApprovedCatalogEntries)
 * and the Generator's default candidate pool (server/generation/pick-local-recipes.ts
 * -> getDefaultGeneratorPoolSlugs) are supposed to be backed by the SAME underlying
 * collections (Golden 100 + Performance 50 + Hall Expansion 74 + BBQ Catalog for
 * dinner meals). Breakfast and Smoothies are legitimately Explore-only (the
 * standalone Generator only ever produces dinner meals).
 *
 * This script asserts:
 *   1. Every Explore "dinner meal" recipe (i.e. not breakfast, not smoothie) is
 *      reachable in the Generator's default pool.
 *   2. Every Generator-pool slug also exists in the canonical merged hall catalog
 *      (no orphaned/stale Generator-only slugs).
 *
 * Exit code is non-zero if any dinner-eligible Explore recipe is missing from the
 * Generator pool, so this can run in CI.
 */

import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import { getDefaultGeneratorPoolSlugs } from "../server/generation/pick-local-recipes.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";

async function main() {
  await initCuratedRecipeStore();
  const allExplore = buildAllApprovedCatalogEntries();

  const breakfast = allExplore.filter((e) => e.mealFormat === "breakfast");
  const smoothies = allExplore.filter((e) => e.isSmoothie);
  const dinnerEligible = allExplore.filter(
    (e) => e.mealFormat !== "breakfast" && !e.isSmoothie,
  );

  const { slugs: generatorSlugs, bySource } = getDefaultGeneratorPoolSlugs();

  const missingFromGenerator = dinnerEligible.filter((e) => !generatorSlugs.has(e.slug));

  const dinnerSlugSet = new Set(dinnerEligible.map((e) => e.slug));
  const orphanedGeneratorSlugs = [...generatorSlugs].filter((s) => !dinnerSlugSet.has(s));

  console.log("=".repeat(70));
  console.log("EXPLORE / GENERATOR PARITY AUDIT");
  console.log("=".repeat(70));
  console.log(`Explore total catalog entries:      ${allExplore.length}`);
  console.log(`  - breakfast (Generator-excluded):  ${breakfast.length}`);
  console.log(`  - smoothies (Generator-excluded):  ${smoothies.length}`);
  console.log(`Explore dinner-eligible recipes:     ${dinnerEligible.length}`);
  console.log(`Generator-eligible pool (default):   ${generatorSlugs.size}`);
  for (const [source, list] of Object.entries(bySource)) {
    console.log(`  - ${source}: ${list.length}`);
  }
  console.log(`Missing from Generator:              ${missingFromGenerator.length}`);
  console.log(`Orphaned Generator-only slugs:        ${orphanedGeneratorSlugs.length}`);
  console.log("=".repeat(70));

  if (missingFromGenerator.length > 0) {
    console.log("\nMISSING FROM GENERATOR (Explore dinner recipes the Generator can never pick):");
    for (const e of missingFromGenerator.slice(0, 50)) {
      console.log(`  - ${e.slug}  (${e.title}) [category=${e.category}]`);
    }
    if (missingFromGenerator.length > 50) {
      console.log(`  ... and ${missingFromGenerator.length - 50} more`);
    }
  }

  if (orphanedGeneratorSlugs.length > 0) {
    console.log("\nORPHANED GENERATOR SLUGS (in pool but not in current Explore catalog):");
    for (const s of orphanedGeneratorSlugs.slice(0, 50)) {
      console.log(`  - ${s}`);
    }
  }

  console.log("\nRESULT:", missingFromGenerator.length === 0 ? "PASS ✅" : "FAIL ❌");

  if (missingFromGenerator.length > 0) {
    process.exitCode = 1;
  }
}

main();

