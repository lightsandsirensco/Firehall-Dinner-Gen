#!/usr/bin/env tsx
/**
 * Audit and apply ingredient list capitalization + unit abbreviations across catalogs.
 *
 *   npx tsx scripts/standardize-ingredient-lists.ts
 *   npx tsx scripts/standardize-ingredient-lists.ts --apply
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  standardizeIngredientName,
  standardizeIngredientUnit,
} from "../shared/measurements/ingredient-list-standard.js";

const ROOT = process.cwd();
const APPLY = process.argv.includes("--apply");
const REPORT_PATH = join(ROOT, "review/ingredient-list-standardization-audit.json");

const CATALOG_DIRS: Array<{ label: string; dir: string }> = [
  { label: "golden-100", dir: join(ROOT, "client/public/catalog/golden-100/pages") },
  { label: "breakfast", dir: join(ROOT, "client/public/catalog/breakfast/pages") },
  { label: "performance-meals", dir: join(ROOT, "client/public/catalog/performance-meals/pages") },
  { label: "bbq", dir: join(ROOT, "client/public/catalog/bbq/pages") },
  { label: "hall-expansion", dir: join(ROOT, "client/public/catalog/hall-expansion/pages") },
];

type Ingredient = { name?: string; quantity?: string; unit?: string };
type Page = { slug?: string; title?: string; ingredients?: Ingredient[] };

type LineChange = {
  field: "name" | "unit";
  before: string;
  after: string;
};

type RecipeChange = {
  catalog: string;
  slug: string;
  file: string;
  changes: LineChange[];
};

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));
}

const recipeChanges: RecipeChange[] = [];
let recipesScanned = 0;
let recipesWithIngredients = 0;
let ingredientLinesScanned = 0;
let ingredientLinesChanged = 0;

for (const { label, dir } of CATALOG_DIRS) {
  for (const file of listJsonFiles(dir)) {
    recipesScanned++;
    const raw = readFileSync(file, "utf8");
    const page = JSON.parse(raw) as Page;
    if (!page.ingredients?.length) continue;

    recipesWithIngredients++;
    const slug = page.slug || file.split(/[/\\]/).pop()?.replace(/\.json$/, "") || "unknown";
    const changes: LineChange[] = [];
    let pageChanged = false;

    for (const ing of page.ingredients) {
      ingredientLinesScanned++;
      const beforeName = (ing.name || "").trim();
      const beforeUnit = ing.unit;

      const fixedName = beforeName ? standardizeIngredientName(beforeName) : beforeName;
      const fixedUnit = standardizeIngredientUnit(beforeUnit, ing.quantity);

      if (beforeName && fixedName !== beforeName) {
        ingredientLinesChanged++;
        changes.push({ field: "name", before: beforeName, after: fixedName });
        ing.name = fixedName;
        pageChanged = true;
      }

      if (beforeUnit !== undefined && fixedUnit !== beforeUnit) {
        ingredientLinesChanged++;
        changes.push({ field: "unit", before: beforeUnit ?? "", after: fixedUnit ?? "" });
        ing.unit = fixedUnit;
        pageChanged = true;
      }
    }

    if (pageChanged) {
      recipeChanges.push({ catalog: label, slug, file, changes });
      if (APPLY) {
        writeFileSync(file, `${JSON.stringify(page, null, 2)}\n`, "utf8");
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: APPLY ? "apply" : "audit",
  catalogs: CATALOG_DIRS.map((c) => c.label),
  recipesScanned,
  recipesWithIngredients,
  recipesUpdated: recipeChanges.length,
  ingredientLinesScanned,
  ingredientLinesChanged,
  byCatalog: Object.fromEntries(
    CATALOG_DIRS.map(({ label }) => [
      label,
      {
        recipesUpdated: recipeChanges.filter((r) => r.catalog === label).length,
        linesChanged: recipeChanges
          .filter((r) => r.catalog === label)
          .reduce((sum, r) => sum + r.changes.length, 0),
      },
    ]),
  ),
  sampleChanges: recipeChanges.slice(0, 12).map((r) => ({
    catalog: r.catalog,
    slug: r.slug,
    changes: r.changes.slice(0, 4),
  })),
  recipeChanges,
};

writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log("[ingredient-list-standardization]");
console.log(`  Mode: ${APPLY ? "APPLY" : "AUDIT (dry run)"}`);
console.log(`  Catalogs: ${CATALOG_DIRS.map((c) => c.label).join(", ")}`);
console.log(`  Recipes scanned: ${recipesScanned}`);
console.log(`  Recipes with ingredients: ${recipesWithIngredients}`);
console.log(`  Recipes updated: ${recipeChanges.length}`);
console.log(`  Ingredient lines scanned: ${ingredientLinesScanned}`);
console.log(`  Ingredient lines changed: ${ingredientLinesChanged}`);
console.log(`  Report: ${REPORT_PATH}`);

if (!APPLY && recipeChanges.length > 0) {
  console.log("\n  Re-run with --apply to write catalog JSON updates.");
}
