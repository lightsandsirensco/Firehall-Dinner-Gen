#!/usr/bin/env tsx
/**
 * Firehall Meals Pro V1 Feature 2 — "Foods to Avoid" ingredient preferences.
 *
 * Classifies every recipe in the catalog (golden-100, hall-expansion, bbq,
 * performance-meals, breakfast, pizza-night, smoothies) against the canonical
 * curated ingredient-preference database (shared/ingredient-preferences/),
 * and writes the resulting `avoidTags` array directly onto each recipe page
 * JSON (and onto the matching entry in each collection's index.json).
 *
 * This is a standalone enrichment pass over already-built catalog JSON,
 * following the exact same read-modify-write convention as
 * scripts/dietary-classify-catalog.ts and scripts/nutrition-index-classify.ts.
 * It must be re-run any time recipe ingredients change or a collection is
 * regenerated from its TypeScript source.
 *
 *   npx tsx scripts/ingredient-preferences-classify.ts --dry-run
 *   npx tsx scripts/ingredient-preferences-classify.ts
 */
import fs from "node:fs";
import path from "node:path";
import { computeAvoidTags } from "../shared/ingredient-preferences/match.js";

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

const allPages: PageRecord[] = [];
for (const { id, root } of COLLECTIONS) {
  allPages.push(...loadPages(root, id));
}

console.log(`[ingredient-preferences-classify] Loaded ${allPages.length} recipe pages across ${COLLECTIONS.length} collections.`);

let written = 0;
const avoidTagsBySlug = new Map<string, string[]>();

for (const record of allPages) {
  const ingredients = Array.isArray(record.json.ingredients)
    ? record.json.ingredients.map((i: any) => ({ name: String(i.name ?? ""), notes: i.notes ? String(i.notes) : undefined }))
    : [];
  const avoidTags = computeAvoidTags(ingredients);
  avoidTagsBySlug.set(`${record.collection}::${record.slug}`, avoidTags);

  record.json.avoidTags = avoidTags;

  if (!DRY_RUN) {
    fs.writeFileSync(record.file, JSON.stringify(record.json, null, 2) + "\n", "utf8");
  }
  written++;
}

console.log(`[ingredient-preferences-classify] ${DRY_RUN ? "[DRY RUN] Would write" : "Wrote"} avoidTags onto ${written} pages.`);

let indexesUpdated = 0;
for (const { id, root } of COLLECTIONS) {
  const indexPath = path.join(root, "index.json");
  if (!fs.existsSync(indexPath)) continue;
  let index: any;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    console.warn(`[ingredient-preferences-classify] Could not parse index for ${id}, skipping.`);
    continue;
  }
  if (!Array.isArray(index.recipes)) continue;

  let touched = 0;
  for (const entry of index.recipes) {
    const avoidTags = avoidTagsBySlug.get(`${id}::${entry.slug}`);
    if (!avoidTags) continue;
    entry.avoidTags = avoidTags;
    touched++;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  }
  indexesUpdated++;
  console.log(`[ingredient-preferences-classify] ${id}: tagged ${touched}/${index.recipes.length} index entries.`);
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
        const avoidTags = avoidTagsBySlug.get(`breakfast::${entry.slug}`);
        if (!avoidTags) continue;
        entry.avoidTags = avoidTags;
        touched++;
      }
      if (!DRY_RUN) {
        fs.writeFileSync(breakfastPerfIndexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
      }
      console.log(`[ingredient-preferences-classify] breakfast/performance: tagged ${touched}/${index.recipes.length} index entries.`);
    }
  } catch {
    console.warn("[ingredient-preferences-classify] Could not parse breakfast/performance index, skipping.");
  }
}

console.log(`[ingredient-preferences-classify] Done. ${indexesUpdated} catalog indexes updated.`);
