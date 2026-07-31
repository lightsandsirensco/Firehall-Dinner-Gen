#!/usr/bin/env tsx
/**
 * Projects each recipe page's already-computed `nutrition.filterFlags` /
 * `nutrition.badgeCandidates` (see shared/nutrition/calculate.ts —
 * `highProtein: protein >= 35g`, `lowCarb: carbs <= 25g`, `lighterOption:
 * calories <= 550 && fat <= 20g`, etc.) onto a compact `nutritionSummary`
 * field on the matching entry in each collection's index.json.
 *
 * This replaces the previous Explore "High protein" / "Healthy" filters,
 * which classified recipes from title/tag keyword text (e.g. tags containing
 * "protein" or "healthy") instead of real per-serving macros. Must be re-run
 * any time recipe nutrition changes or a collection index is regenerated.
 *
 *   npx tsx scripts/nutrition-index-classify.ts --dry-run
 *   npx tsx scripts/nutrition-index-classify.ts
 */
import fs from "node:fs";
import path from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");

const COLLECTIONS: Array<{ id: string; root: string }> = [
  { id: "golden-100", root: "client/public/catalog/golden-100" },
  { id: "hall-expansion", root: "client/public/catalog/hall-expansion" },
  { id: "bbq", root: "client/public/catalog/bbq" },
  { id: "performance-meals", root: "client/public/catalog/performance-meals" },
  { id: "breakfast", root: "client/public/catalog/breakfast" },
  { id: "pizza-night", root: "client/public/catalog/pizza-night" },
  { id: "smoothies", root: "client/public/catalog/smoothies" },
];

interface PageRecord {
  collection: string;
  slug: string;
  nutritionSummary: {
    highProtein: boolean;
    lowCarb: boolean;
    healthy: boolean;
    estimateAvailable: boolean;
  };
}

function loadPages(root: string, collection: string): PageRecord[] {
  const dir = path.join(root, "pages");
  const out: PageRecord[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (!json?.slug) continue;
      const ff = json.nutrition?.filterFlags;
      const bc = json.nutrition?.badgeCandidates;
      const estimateAvailable = Boolean(json.nutrition?.estimateAvailable);
      out.push({
        collection,
        slug: json.slug,
        nutritionSummary: {
          highProtein: estimateAvailable ? Boolean(ff?.highProtein) : false,
          lowCarb: estimateAvailable ? Boolean(ff?.lowCarb) : false,
          // "Healthy" = an explicit, nutrition-threshold scoring rule (calories <= 550
          // AND fat <= 20g per serving, i.e. shared/nutrition/calculate.ts's
          // `lighterOption`), OR the dedicated performance-meal macros (>=30g protein,
          // <=650 cal, <=25g fat) — never a subjective "healthy" tag/keyword match.
          healthy: estimateAvailable ? Boolean(bc?.lighterOption || bc?.performanceMeal) : false,
          estimateAvailable,
        },
      });
    } catch {
      // skip malformed
    }
  }
  return out;
}

const allPages: PageRecord[] = [];
for (const { id, root } of COLLECTIONS) {
  allPages.push(...loadPages(root, id));
}

const bySlug = new Map<string, PageRecord["nutritionSummary"]>();
for (const p of allPages) bySlug.set(`${p.collection}::${p.slug}`, p.nutritionSummary);

console.log(`[nutrition-index] Loaded nutrition data for ${allPages.length} recipe pages.`);

let indexesUpdated = 0;
function patchIndex(indexPath: string, collectionId: string): void {
  if (!fs.existsSync(indexPath)) return;
  let index: any;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    console.warn(`[nutrition-index] Could not parse ${indexPath}, skipping.`);
    return;
  }
  if (!Array.isArray(index.recipes)) return;

  let touched = 0;
  for (const entry of index.recipes) {
    const summary = bySlug.get(`${collectionId}::${entry.slug}`);
    if (!summary) continue;
    entry.nutritionSummary = summary;
    touched++;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  indexesUpdated++;
  console.log(`[nutrition-index] ${collectionId}: tagged ${touched}/${index.recipes.length} index entries.`);
}

for (const { id, root } of COLLECTIONS) {
  patchIndex(path.join(root, "index.json"), id);
}
patchIndex("client/public/catalog/breakfast/performance/index.json", "breakfast");

console.log(`[nutrition-index] Done. ${indexesUpdated} catalog indexes updated.`);
