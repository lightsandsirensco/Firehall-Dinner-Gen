#!/usr/bin/env tsx
/**
 * Every published catalog recipe that carries a `category` must use a
 * customer-facing master category id — cards and detail pages render that
 * field directly, so collection ids like "hall_expansion" must never leak.
 *
 * Usage:
 *   npx tsx scripts/test-recipe-display-categories.ts
 */
import fs from "node:fs";
import path from "node:path";
import { MASTER_CATEGORY_IDS } from "../shared/categories/constants.js";
import { HALL_EXPANSION_DISPLAY_CATEGORY } from "../shared/hall-expansion/display-categories.js";
import { HALL_EXPANSION_ADAPTED_RECIPES } from "../shared/hall-expansion/adapted/index.js";

const CATALOG_DIR = path.join(process.cwd(), "client/public/catalog");
const master = new Set<string>(MASTER_CATEGORY_IDS);
const failures: string[] = [];

function jsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return jsonFiles(full);
    return e.name.endsWith(".json") ? [full] : [];
  });
}

let checked = 0;
for (const file of jsonFiles(CATALOG_DIR)) {
  const rel = path.relative(CATALOG_DIR, file).replace(/\\/g, "/");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  const records: Array<{ slug?: string; category?: unknown }> = Array.isArray(json.recipes)
    ? json.recipes
    : json.slug
      ? [json]
      : [];
  for (const r of records) {
    if (r.category === undefined) continue;
    checked++;
    if (typeof r.category !== "string" || !master.has(r.category)) {
      failures.push(`${rel} ${r.slug ?? "?"}: category "${String(r.category)}" is not a master category`);
    }
  }
}

for (const recipe of HALL_EXPANSION_ADAPTED_RECIPES) {
  if (!(recipe.slug in HALL_EXPANSION_DISPLAY_CATEGORY)) {
    failures.push(`hall-expansion source ${recipe.slug}: missing from HALL_EXPANSION_DISPLAY_CATEGORY`);
  }
}

if (failures.length) {
  console.error(`[test-recipe-display-categories] FAIL — ${failures.length} issue(s):`);
  for (const f of failures.slice(0, 40)) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`[test-recipe-display-categories] PASS — ${checked} catalog records use master categories`);
