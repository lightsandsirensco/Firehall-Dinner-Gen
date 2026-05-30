#!/usr/bin/env tsx
/**
 * Audit Pizza Night catalog — 20 recipes, images, alphabetical order, quality.
 */
import fs from "node:fs";
import path from "node:path";
import { PIZZA_NIGHT_RECIPES } from "../shared/pizza-night/manifest.js";
import { goldenPageImageSet } from "../shared/golden-100/recipe-page-paths.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import { getMealSpecificPack } from "../shared/golden-100/recipe-quality/meal-specific-packs.js";

const ROOT = process.cwd();
const PAGES_DIR = path.join(ROOT, "client/public/catalog/pizza-night/pages");
const CREW_SCALE = 1;

let errors = 0;
let warnings = 0;

function fail(msg: string): void {
  errors++;
  console.error(`  ✗ ${msg}`);
}

function warn(msg: string): void {
  warnings++;
  console.warn(`  ⚠ ${msg}`);
}

function ok(msg: string): void {
  console.log(`  ✓ ${msg}`);
}

console.log("[audit:pizza-night] Starting audit…\n");

if (PIZZA_NIGHT_RECIPES.length !== 20) {
  fail(`Expected 20 recipes, found ${PIZZA_NIGHT_RECIPES.length}`);
} else {
  ok("Exactly 20 pizza recipes defined");
}

const titles = PIZZA_NIGHT_RECIPES.map((r) => r.title);
const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b, "en"));
if (JSON.stringify(titles) !== JSON.stringify(sortedTitles)) {
  fail("recipes-data.ts is not alphabetical by title");
} else {
  ok("Manifest alphabetical by title");
}

const slugs = new Set<string>();
for (const def of PIZZA_NIGHT_RECIPES) {
  if (slugs.has(def.slug)) fail(`Duplicate slug: ${def.slug}`);
  slugs.add(def.slug);

  const pack = getMealSpecificPack(def, CREW_SCALE);
  if (!pack?.steps?.length || pack.steps.length < 4) {
    fail(`${def.slug}: missing detailed steps pack`);
  } else if (pack.steps.some((s) => s.instruction.length < 80)) {
    warn(`${def.slug}: some steps may be too short`);
  }

  if (!pack?.ingredients?.length) {
    fail(`${def.slug}: missing ingredients`);
  }

  const images = goldenPageImageSet(def.slug);
  for (const [role, imgPath] of Object.entries(images)) {
    const disk = path.join(ROOT, "client/public", imgPath);
    if (!fs.existsSync(disk)) {
      fail(`${def.slug}: missing image ${role} at ${imgPath}`);
    }
  }

  const pageFile = path.join(PAGES_DIR, `${def.slug}.json`);
  if (!fs.existsSync(pageFile)) {
    fail(`${def.slug}: missing page JSON`);
    continue;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(pageFile, "utf8"));
    const page = goldenRecipePageSchema.parse(raw);
    if (page.slug !== def.slug) fail(`${def.slug}: page slug mismatch`);
    if (page.steps.length < 4) fail(`${def.slug}: page has fewer than 4 steps`);
  } catch (e) {
    fail(`${def.slug}: invalid JSON — ${e instanceof Error ? e.message : String(e)}`);
  }
}

const indexFile = path.join(ROOT, "client/public/catalog/pizza-night/index.json");
if (!fs.existsSync(indexFile)) {
  fail("Missing pizza-night index.json");
} else {
  const index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
  if (index.recipeCount !== 20) fail(`Index recipeCount=${index.recipeCount}, expected 20`);
  else ok("Index has 20 recipes");

  const indexTitles = index.recipes.map((r: { title: string }) => r.title);
  const indexSorted = [...indexTitles].sort((a: string, b: string) => a.localeCompare(b, "en"));
  if (JSON.stringify(indexTitles) !== JSON.stringify(indexSorted)) {
    warn("Index recipes not stored alphabetically (UI sorts client-side)");
  }
}

console.log(`\n[audit:pizza-night] errors=${errors} warnings=${warnings}`);
process.exit(errors > 0 ? 1 : 0);
