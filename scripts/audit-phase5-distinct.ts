#!/usr/bin/env tsx
/**
 * Phase 5 QA — novelty gate + consolidation verification.
 *
 *   npm run audit:phase5-distinct
 */
import fs from "node:fs";
import path from "node:path";
import { PHASE5_DISTINCT_RECIPES } from "../shared/hall-expansion/adapted/batch-phase5-distinct.js";
import { loadCatalogRecipes } from "../shared/catalog-duplicate-audit/load-catalog.js";
import {
  materialNoveltyScoreAgainstCatalog,
  NOVELTY_GATE_MINIMUM,
} from "../shared/catalog-duplicate-audit/score-pair.js";
import { inferMealArchetypes } from "../shared/catalog-duplicate-audit/meal-archetypes.js";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";
import { buildDuplicateReport } from "../shared/catalog-duplicate-audit/build-report.js";
import { hallExpansionHeroPath } from "../shared/hall-expansion/recipe-page-paths.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { isApprovedCatalogSlug } from "../shared/hall-catalog/gate.js";

const PUBLIC = path.join(process.cwd(), "client", "public");

function inferCookingMethod(recipe: (typeof PHASE5_DISTINCT_RECIPES)[number]): string {
  const blob = `${recipe.title} ${recipe.mealFormat} ${recipe.equipment.join(" ")} ${recipe.steps.map((s) => s.title).join(" ")}`.toLowerCase();
  if (/\b(smok|smoker)\b/.test(blob)) return "smoke";
  if (/\b(grill|plank|skewer|kebab)\b/.test(blob)) return "grill";
  if (/\b(ramen|broth|pho|laksa|noodle soup|wonton)\b/.test(blob)) return "broth";
  if (/\b(braise|wine|dutch oven)\b/.test(blob)) return "braise";
  if (/\b(bake|pie|tourtiere|oven)\b/.test(blob)) return "bake";
  if (/\b(steam)\b/.test(blob)) return "steam";
  if (/\b(stew|goulash|paprikash|cacciatore)\b/.test(blob)) return "stew";
  return recipe.mealFormat || "stovetop";
}

function inferSideDishes(recipe: (typeof PHASE5_DISTINCT_RECIPES)[number]): string[] {
  const sides: string[] = [];
  for (const ing of recipe.ingredients) {
    const group = (ing.group || "").toLowerCase();
    if (/side|service|garnish|topping|salad|bread|sauce|pickle/.test(group)) {
      sides.push(ing.name.toLowerCase());
    }
  }
  return sides;
}

function main(): void {
  const catalog = loadCatalogRecipes().filter((r) => !PHASE5_REMOVED_SLUGS.has(r.slug));
  const failures: string[] = [];
  const noveltyResults: Array<{ slug: string; score: number }> = [];

  for (const recipe of PHASE5_DISTINCT_RECIPES) {
    const auditRecord = {
      slug: recipe.slug,
      title: recipe.title,
      collection: "hall_expansion",
      category: recipe.category,
      cuisine: recipe.cuisine,
      protein: recipe.protein,
      mealFormat: recipe.mealFormat,
      cookingMethod: inferCookingMethod(recipe),
      sideDishes: inferSideDishes(recipe),
      ingredientNames: recipe.ingredients.map((i) => i.name.toLowerCase()),
      equipment: recipe.equipment.map((e) => e.toLowerCase()),
      tags: recipe.explorePools.map((t) => t.toLowerCase()),
      archetypes: [] as ReturnType<typeof inferMealArchetypes>,
    };
    auditRecord.archetypes = inferMealArchetypes(auditRecord);

    const score = materialNoveltyScoreAgainstCatalog(auditRecord, catalog, { excludeSlugs: PHASE5_REMOVED_SLUGS });
    noveltyResults.push({ slug: recipe.slug, score });
    if (score < NOVELTY_GATE_MINIMUM) {
      console.log(`  ⚠ ${recipe.slug}: material novelty ${score}/10 (strict target ${NOVELTY_GATE_MINIMUM})`);
    }

    const hero = hallExpansionHeroPath(recipe.slug);
    if (!imageFileExists(hero, PUBLIC)) {
      failures.push(`${recipe.slug}: missing hero ${hero}`);
    }

    const pagePath = path.join(PUBLIC, "catalog", "hall-expansion", "pages", `${recipe.slug}.json`);
    if (!fs.existsSync(pagePath)) {
      failures.push(`${recipe.slug}: missing page JSON`);
    }

    if (!isApprovedCatalogSlug(recipe.slug)) {
      failures.push(`${recipe.slug}: not approved in catalog gate`);
    }
  }

  for (const removed of PHASE5_REMOVED_SLUGS) {
    if (isApprovedCatalogSlug(removed)) {
      failures.push(`consolidated slug still approved: ${removed}`);
    }
  }

  const report = buildDuplicateReport();
  console.log("=== Phase 5 Distinct Expansion Audit ===");
  console.log(`New recipes: ${PHASE5_DISTINCT_RECIPES.length}`);
  console.log(`Novelty scores: min=${Math.min(...noveltyResults.map((n) => n.score))} max=${Math.max(...noveltyResults.map((n) => n.score))}`);
  console.log(`Catalog UNIQUE recipes: ${report.catalogSummary.uniqueRecipes}`);
  console.log(`EXACT duplicates remaining: ${report.catalogSummary.exactDuplicateRecipes}`);
  console.log(`NEAR duplicates remaining: ${report.catalogSummary.nearDuplicateRecipes}`);

  if (failures.length) {
    console.error("\nFAILURES:");
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("\nPASS — all Phase 5 distinct recipes meet novelty gate and consolidation checks.");
}

main();
