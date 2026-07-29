#!/usr/bin/env tsx
/**
 * Food Safety & Dietary Intelligence Sprint — Step 1-4.
 *
 * Classifies every recipe in the catalog (golden-100, hall-expansion, bbq,
 * performance-meals, breakfast, pizza-night, smoothies) against the canonical
 * ingredient dietary database, and writes the resulting `dietary` profile
 * directly onto each recipe page JSON (and a compact `dietarySummary`
 * projection onto the matching entry in each collection's index.json).
 *
 * This is a standalone enrichment pass over already-built catalog JSON,
 * following the same read-modify-write convention as
 * scripts/fix-broken-related-slugs.ts and scripts/standardize-ingredient-lists.ts.
 * It must be re-run any time recipe ingredients change or a collection is
 * regenerated from its TypeScript source (e.g. via rebuild-performance-meals-all.ts).
 *
 *   npx tsx scripts/dietary-classify-catalog.ts --dry-run
 *   npx tsx scripts/dietary-classify-catalog.ts
 */
import fs from "node:fs";
import path from "node:path";
import { classifyRecipeDietary } from "../shared/dietary/classify-recipe.js";
import { toDietarySummary } from "../shared/dietary/schema.js";

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
  file: string;
  slug: string;
  json: Record<string, any>;
}

function loadPages(root: string, collection: string): PageRecord[] {
  const dir = path.join(root, "pages");
  const out: PageRecord[] = [];
  if (!fs.existsSync(dir)) return out;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const full = path.join(dir, file);
    try {
      const json = JSON.parse(fs.readFileSync(full, "utf8"));
      if (json?.slug) out.push({ collection, file: full, slug: json.slug, json });
    } catch {
      // skip malformed
    }
  }
  return out;
}

const classifiedAt = new Date().toISOString();

const allPages: PageRecord[] = [];
for (const { id, root } of COLLECTIONS) {
  allPages.push(...loadPages(root, id));
}

console.log(`[dietary-classify] Loaded ${allPages.length} recipe pages across ${COLLECTIONS.length} collections.`);

let written = 0;
const dietaryBySlug = new Map<string, ReturnType<typeof classifyRecipeDietary>>();

for (const record of allPages) {
  const ingredients = Array.isArray(record.json.ingredients)
    ? record.json.ingredients.map((i: any) => ({ name: String(i.name ?? ""), notes: i.notes ? String(i.notes) : undefined }))
    : [];
  const profile = classifyRecipeDietary(ingredients);
  dietaryBySlug.set(`${record.collection}::${record.slug}`, profile);

  record.json.dietary = {
    confidence: profile.confidence,
    matchedCount: profile.matchedCount,
    totalCount: profile.totalCount,
    uncertainIngredients: profile.uncertainIngredients,
    flaggedIngredients: profile.flaggedIngredients,
    flags: profile.flags,
    adaptable: profile.adaptable,
    classifiedAt,
  };

  if (!DRY_RUN) {
    fs.writeFileSync(record.file, JSON.stringify(record.json, null, 2) + "\n", "utf8");
  }
  written++;
}

console.log(`[dietary-classify] ${DRY_RUN ? "[DRY RUN] Would write" : "Wrote"} dietary profile onto ${written} pages.`);

let indexesUpdated = 0;
for (const { id, root } of COLLECTIONS) {
  const indexPath = path.join(root, "index.json");
  if (!fs.existsSync(indexPath)) continue;
  let index: any;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    console.warn(`[dietary-classify] Could not parse index for ${id}, skipping.`);
    continue;
  }
  if (!Array.isArray(index.recipes)) continue;

  let touched = 0;
  for (const entry of index.recipes) {
    const profile = dietaryBySlug.get(`${id}::${entry.slug}`);
    if (!profile) continue;
    entry.dietarySummary = toDietarySummary({
      confidence: profile.confidence,
      matchedCount: profile.matchedCount,
      totalCount: profile.totalCount,
      uncertainIngredients: profile.uncertainIngredients,
      flaggedIngredients: profile.flaggedIngredients,
      flags: profile.flags,
      adaptable: profile.adaptable,
    });
    touched++;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  indexesUpdated++;
  console.log(`[dietary-classify] ${id}: tagged ${touched}/${index.recipes.length} index entries.`);
}

// Also patch the secondary breakfast "performance" index, which mirrors a
// subset of breakfast recipes under a separate index file.
const breakfastPerfIndexPath = "client/public/catalog/breakfast/performance/index.json";
if (fs.existsSync(breakfastPerfIndexPath)) {
  try {
    const index = JSON.parse(fs.readFileSync(breakfastPerfIndexPath, "utf8"));
    if (Array.isArray(index.recipes)) {
      let touched = 0;
      for (const entry of index.recipes) {
        const profile = dietaryBySlug.get(`breakfast::${entry.slug}`);
        if (!profile) continue;
        entry.dietarySummary = toDietarySummary({
          confidence: profile.confidence,
          matchedCount: profile.matchedCount,
          totalCount: profile.totalCount,
          uncertainIngredients: profile.uncertainIngredients,
          flaggedIngredients: profile.flaggedIngredients,
          flags: profile.flags,
          adaptable: profile.adaptable,
        });
        touched++;
      }
      if (!DRY_RUN) {
        fs.writeFileSync(breakfastPerfIndexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
      }
      console.log(`[dietary-classify] breakfast/performance: tagged ${touched}/${index.recipes.length} index entries.`);
    }
  } catch {
    console.warn("[dietary-classify] Could not parse breakfast/performance index, skipping.");
  }
}

console.log(`[dietary-classify] Done. ${indexesUpdated} catalog indexes updated.`);
