#!/usr/bin/env tsx
/**
 * Scans every catalog recipe's ingredient list and reports ingredient names that
 * fail to resolve to a nutrition profile via findIngredientProfile. Used to find
 * gaps in the ingredient database (missing cuts, aliases, ethnic ingredients, etc).
 */
import fs from "node:fs";
import path from "node:path";
import { findIngredientProfile } from "../shared/nutrition/ingredient-database.js";

const ROOT = process.cwd();

const CATALOG_DIRS = [
  "client/public/catalog/golden-100/pages",
  "client/public/catalog/performance-meals/pages",
  "client/public/catalog/hall-expansion/pages",
  "client/public/catalog/breakfast/pages",
  "client/public/catalog/smoothies/pages",
  "client/public/catalog/bbq/pages",
];

interface Unmatched {
  name: string;
  count: number;
  recipes: Set<string>;
}

function listJsonFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(abs, f));
}

function main() {
  const unmatched = new Map<string, Unmatched>();
  let totalIngredients = 0;
  let totalRecipes = 0;

  for (const dir of CATALOG_DIRS) {
    for (const file of listJsonFiles(dir)) {
      totalRecipes += 1;
      const page = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const slug = String(page.slug || path.basename(file, ".json"));
      const ingredients = Array.isArray(page.ingredients) ? page.ingredients : [];
      for (const ing of ingredients) {
        const i = ing as Record<string, unknown>;
        const name = String(i.name || "").trim();
        if (!name) continue;
        totalIngredients += 1;
        const optional = Boolean(i.optional);
        const profile = findIngredientProfile(name);
        if (!profile) {
          const key = name.toLowerCase();
          const entry = unmatched.get(key) || { name, count: 0, recipes: new Set<string>() };
          entry.count += 1;
          entry.recipes.add(`${slug}${optional ? " (optional)" : ""}`);
          unmatched.set(key, entry);
        }
      }
    }
  }

  const rows = Array.from(unmatched.values()).sort((a, b) => b.count - a.count);
  console.log(`Scanned ${totalRecipes} recipes, ${totalIngredients} ingredient lines.`);
  console.log(`Unmatched unique ingredient names: ${rows.length}`);
  console.log("");
  for (const row of rows) {
    const recipeList = Array.from(row.recipes).slice(0, 6).join(", ");
    const more = row.recipes.size > 6 ? ` (+${row.recipes.size - 6} more)` : "";
    console.log(`${row.count}x  ${row.name}  ->  ${recipeList}${more}`);
  }
}

main();
