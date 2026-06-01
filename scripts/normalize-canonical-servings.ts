#!/usr/bin/env tsx
/**
 * Normalize all catalog recipe pages to canonical base servings (8 firefighters).
 *
 *   npm run normalize:canonical-servings
 *   npm run normalize:canonical-servings -- --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { CANONICAL_BASE_SERVINGS } from "../shared/recipe/crew-scaling-config.js";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";

const DRY_RUN = process.argv.includes("--dry-run");

const CATALOG_ROOTS = [
  "client/public/catalog/golden-100/pages",
  "client/public/catalog/hall-expansion/pages",
  "client/public/catalog/breakfast/pages",
  "client/public/catalog/pizza-night/pages",
  "client/public/catalog/performance-meals/pages",
  "client/public/catalog/bbq/pages",
  "client/public/catalog/smoothies/pages",
];

function walkJsonPages(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJsonPages(p, out);
    else if (ent.name.endsWith(".json") && ent.name !== "index.json") out.push(p);
  }
  return out;
}

type NormalizeRow = {
  slug: string;
  file: string;
  oldBase: number;
  oldCrew: number;
  ingredientCount: number;
};

function normalizePage(file: string): NormalizeRow | null {
  const page = JSON.parse(fs.readFileSync(file, "utf8")) as {
    slug?: string;
    crewSize?: number;
    baseServings?: number;
    ingredients?: GoldenRecipePageIngredient[];
  };

  const ingredients = page.ingredients ?? [];
  if (!ingredients.length) return null;

  const oldBase = page.baseServings ?? page.crewSize ?? CANONICAL_BASE_SERVINGS;
  const oldCrew = page.crewSize ?? oldBase;

  const needsIngredientScale = oldBase !== CANONICAL_BASE_SERVINGS;
  const needsMetadata =
    page.baseServings !== CANONICAL_BASE_SERVINGS || page.crewSize !== CANONICAL_BASE_SERVINGS;

  if (!needsIngredientScale && !needsMetadata) {
    return null;
  }

  if (needsIngredientScale) {
    page.ingredients = scaleGoldenIngredients(ingredients, oldBase, CANONICAL_BASE_SERVINGS);
  }

  page.baseServings = CANONICAL_BASE_SERVINGS;
  page.crewSize = CANONICAL_BASE_SERVINGS;

  if (!DRY_RUN) {
    fs.writeFileSync(file, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  }

  return {
    slug: page.slug || path.basename(file, ".json"),
    file,
    oldBase,
    oldCrew,
    ingredientCount: ingredients.length,
  };
}

function main(): void {
  const normalized: NormalizeRow[] = [];
  let scanned = 0;

  for (const root of CATALOG_ROOTS) {
    for (const file of walkJsonPages(root)) {
      scanned++;
      const row = normalizePage(file);
      if (row) normalized.push(row);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? "dry-run" : "fix",
    canonicalBase: CANONICAL_BASE_SERVINGS,
    pagesScanned: scanned,
    pagesNormalized: normalized.length,
    byOldBase: normalized.reduce<Record<number, number>>((acc, r) => {
      acc[r.oldBase] = (acc[r.oldBase] || 0) + 1;
      return acc;
    }, {}),
    rows: normalized,
  };

  fs.mkdirSync("review", { recursive: true });
  fs.writeFileSync("review/canonical-servings-normalize.json", `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Canonical servings normalization",
    "",
    `- Mode: **${report.mode}**`,
    `- Pages scanned: **${report.pagesScanned}**`,
    `- Pages normalized to base **${CANONICAL_BASE_SERVINGS}**: **${report.pagesNormalized}**`,
    "",
    "## By previous base servings",
    "",
    ...Object.entries(report.byOldBase)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([base, count]) => `- ${base} → 8: **${count}** recipes`),
    "",
    "## Normalized recipes",
    "",
    "| Slug | Old base | Old crew | Ingredients |",
    "| --- | ---: | ---: | ---: |",
    ...normalized.map(
      (r) => `| ${r.slug} | ${r.oldBase} | ${r.oldCrew} | ${r.ingredientCount} |`,
    ),
  ];
  fs.writeFileSync("review/canonical-servings-normalize.md", `${md.join("\n")}\n`);

  console.log(
    `[normalize:canonical-servings] scanned=${scanned} normalized=${normalized.length} mode=${report.mode}`,
  );
}

main();
