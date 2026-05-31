#!/usr/bin/env tsx
/**
 * Phase 6 QA — novelty gate for 30 new BBQ & grill recipes.
 *
 *   npm run audit:phase6-bbq-grill
 */
import fs from "node:fs";
import path from "node:path";
import { BATCH_30_BBQ_GRILL_RECIPES } from "../shared/bbq-expansion/batch-30-bbq-grill-recipes.js";
import { loadCatalogRecipes } from "../shared/catalog-duplicate-audit/load-catalog.js";
import {
  materialNoveltyScoreAgainstCatalog,
  NOVELTY_GATE_MINIMUM,
  scoreMaterialDistinctness,
} from "../shared/catalog-duplicate-audit/score-pair.js";
import { inferMealArchetypes } from "../shared/catalog-duplicate-audit/meal-archetypes.js";
import { bbqCatalogHeroPath } from "../shared/bbq-catalog/slug-registry.js";
import { imageFileExists } from "../shared/explore-image-paths.js";
import { isBbqCatalogSlug } from "../shared/bbq-catalog/slug-registry.js";

const PUBLIC = path.join(process.cwd(), "client", "public");

function inferCookingMethod(recipe: (typeof BATCH_30_BBQ_GRILL_RECIPES)[number]): string {
  const blob = `${recipe.manifest.title} ${recipe.manifest.mealFormat} ${recipe.equipment.join(" ")} ${recipe.steps.map((s) => s.instruction).join(" ")}`.toLowerCase();
  if (/\b(smok|smoker)\b/.test(blob)) return "smoke";
  if (/\b(griddle|flat.?top|hibachi|sizzler)\b/.test(blob)) return "griddle";
  if (/\b(skewer|kabob|plank|grill|platter)\b/.test(blob)) return "grill";
  return recipe.manifest.mealFormat || "grill";
}

function inferSideDishes(recipe: (typeof BATCH_30_BBQ_GRILL_RECIPES)[number]): string[] {
  const sides: string[] = [];
  for (const ing of recipe.ingredients) {
    const group = (ing.group || "").toLowerCase();
    if (/side|service|garnish|topping|salad|bread|sauce|pickle|finish|serve/.test(group)) {
      sides.push(ing.name.toLowerCase());
    }
  }
  return sides;
}

function toAuditRecord(recipe: (typeof BATCH_30_BBQ_GRILL_RECIPES)[number]) {
  const record = {
    slug: recipe.manifest.slug,
    title: recipe.manifest.title,
    collection: "bbq",
    category: "bbq_grill_nights",
    cuisine: recipe.manifest.cuisine,
    protein: recipe.manifest.protein,
    mealFormat: recipe.manifest.mealFormat,
    cookingMethod: inferCookingMethod(recipe),
    sideDishes: inferSideDishes(recipe),
    ingredientNames: recipe.ingredients.map((i) => i.name.toLowerCase()),
    equipment: recipe.equipment.map((e) => e.toLowerCase()),
    tags: recipe.manifest.explorePools.map((t) => t.toLowerCase()),
    archetypes: [] as ReturnType<typeof inferMealArchetypes>,
  };
  record.archetypes = inferMealArchetypes(record);
  return record;
}

function main(): void {
  const phase6Slugs = new Set(BATCH_30_BBQ_GRILL_RECIPES.map((r) => r.manifest.slug));
  const catalog = loadCatalogRecipes().filter((r) => !phase6Slugs.has(r.slug));
  const failures: string[] = [];
  const noveltyResults: Array<{ slug: string; score: number; worst?: string }> = [];

  if (BATCH_30_BBQ_GRILL_RECIPES.length !== 30) {
    failures.push(`Expected 30 Phase 6 recipes, found ${BATCH_30_BBQ_GRILL_RECIPES.length}`);
  }

  for (const recipe of BATCH_30_BBQ_GRILL_RECIPES) {
    const auditRecord = toAuditRecord(recipe);
    let worstSlug = "";
    let maxSim = 0;
    for (const existing of catalog) {
      if (existing.slug === recipe.manifest.slug) continue;
      const sim = scoreMaterialDistinctness(auditRecord, existing);
      if (sim > maxSim) {
        maxSim = sim;
        worstSlug = existing.slug;
      }
    }
    const score = materialNoveltyScoreAgainstCatalog(auditRecord, catalog);
    noveltyResults.push({ slug: recipe.manifest.slug, score, worst: worstSlug });
    if (score < NOVELTY_GATE_MINIMUM) {
      failures.push(`${recipe.manifest.slug}: novelty ${score}/10 vs ${worstSlug} (${maxSim}% similar)`);
    }

    const pagePath = path.join(PUBLIC, "catalog", "bbq", "pages", `${recipe.manifest.slug}.json`);
    if (!fs.existsSync(pagePath)) {
      failures.push(`${recipe.manifest.slug}: missing page JSON`);
    }

    if (!isBbqCatalogSlug(recipe.manifest.slug)) {
      failures.push(`${recipe.manifest.slug}: not in BBQ_CATALOG_SLUGS`);
    }

    const hero = bbqCatalogHeroPath(recipe.manifest.slug);
    if (!imageFileExists(hero, PUBLIC)) {
      failures.push(`${recipe.manifest.slug}: missing hero ${hero}`);
    }
  }

  const slugs = BATCH_30_BBQ_GRILL_RECIPES.map((r) => r.manifest.slug);
  if (new Set(slugs).size !== slugs.length) {
    failures.push("Duplicate slugs in Phase 6 batch");
  }

  console.log("=== Phase 6 BBQ & Grill Expansion Audit ===");
  console.log(`New recipes: ${BATCH_30_BBQ_GRILL_RECIPES.length}`);
  console.log(
    `Novelty scores: min=${Math.min(...noveltyResults.map((n) => n.score))} max=${Math.max(...noveltyResults.map((n) => n.score))}`,
  );
  for (const n of noveltyResults.sort((a, b) => a.score - b.score).slice(0, 5)) {
    console.log(`  lowest: ${n.slug} = ${n.score}/10 (nearest: ${n.worst})`);
  }

  if (failures.length) {
    console.error(`\nFAILURES (${failures.length}):`);
    for (const f of failures.slice(0, 40)) console.error(`  ✗ ${f}`);
    if (failures.length > 40) console.error(`  … +${failures.length - 40} more`);
    process.exit(1);
  }
  console.log("\nPASS — all Phase 6 BBQ & grill recipes meet novelty gate and catalog checks.");
}

main();
