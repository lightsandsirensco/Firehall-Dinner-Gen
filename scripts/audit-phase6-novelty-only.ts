#!/usr/bin/env tsx
/** Novelty-only gate for Phase 6 — no image requirement. */
import { BATCH_30_BBQ_GRILL_RECIPES } from "../shared/bbq-expansion/batch-30-bbq-grill-recipes.js";
import { loadCatalogRecipes } from "../shared/catalog-duplicate-audit/load-catalog.js";
import {
  materialNoveltyScoreAgainstCatalog,
  NOVELTY_GATE_MINIMUM,
  scoreMaterialDistinctness,
} from "../shared/catalog-duplicate-audit/score-pair.js";
import { inferMealArchetypes } from "../shared/catalog-duplicate-audit/meal-archetypes.js";

function inferCookingMethod(recipe: (typeof BATCH_30_BBQ_GRILL_RECIPES)[number]): string {
  const blob = `${recipe.manifest.title} ${recipe.manifest.mealFormat} ${recipe.equipment.join(" ")}`.toLowerCase();
  if (/\b(griddle|flat.?top|hibachi)\b/.test(blob)) return "griddle";
  return "grill";
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
    sideDishes: recipe.ingredients.filter((i) => /side|service|garnish|salad|serve/i.test(i.group || "")).map((i) => i.name.toLowerCase()),
    ingredientNames: recipe.ingredients.map((i) => i.name.toLowerCase()),
    equipment: recipe.equipment.map((e) => e.toLowerCase()),
    tags: recipe.manifest.explorePools.map((t) => t.toLowerCase()),
    archetypes: [] as ReturnType<typeof inferMealArchetypes>,
  };
  record.archetypes = inferMealArchetypes(record);
  return record;
}

const phase6Slugs = new Set(BATCH_30_BBQ_GRILL_RECIPES.map((r) => r.manifest.slug));
const catalog = loadCatalogRecipes().filter((r) => !phase6Slugs.has(r.slug));
let fail = 0;
for (const recipe of BATCH_30_BBQ_GRILL_RECIPES) {
  const rec = toAuditRecord(recipe);
  let worst = "";
  let maxSim = 0;
  for (const existing of catalog) {
    if (existing.slug === rec.slug) continue;
    const sim = scoreMaterialDistinctness(rec, existing);
    if (sim > maxSim) {
      maxSim = sim;
      worst = existing.slug;
    }
  }
  const score = materialNoveltyScoreAgainstCatalog(rec, catalog);
  const ok = score >= NOVELTY_GATE_MINIMUM;
  console.log(`${ok ? "✓" : "✗"} ${rec.slug}: ${score}/10 (nearest ${worst} @ ${maxSim}%)`);
  if (!ok) fail++;
}
process.exit(fail ? 1 : 0);
