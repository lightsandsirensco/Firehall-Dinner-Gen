#!/usr/bin/env tsx
/**
 * Audit and fix crew portion scaling across static catalog recipe pages.
 *
 *   npx tsx scripts/audit-recipe-portion-scaling.ts
 *   npx tsx scripts/audit-recipe-portion-scaling.ts --fix
 */

import fs from "node:fs";
import path from "node:path";
import {
  auditProteinOzPerFirefighter,
  clampGoldenIngredientsForCrew,
  type PortionFix,
} from "../shared/recipe/crew-portion-limits.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";

const FIX = process.argv.includes("--fix");

const CATALOG_ROOTS = [
  "client/public/catalog/golden-100/pages",
  "client/public/catalog/hall-expansion/pages",
  "client/public/catalog/breakfast/pages",
  "client/public/catalog/pizza-night/pages",
  "client/public/catalog/performance-meals/pages",
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

type PageAudit = {
  slug: string;
  title: string;
  file: string;
  crewSize: number;
  fixes: PortionFix[];
  proteinPerFirefighter: Array<{ item: string; oz: number }>;
};

function auditPage(file: string): PageAudit | null {
  const page = JSON.parse(fs.readFileSync(file, "utf8")) as {
    slug?: string;
    title?: string;
    crewSize?: number;
    baseServings?: number;
    ingredients?: GoldenRecipePageIngredient[];
  };
  const crewSize = page.baseServings ?? page.crewSize ?? 8;
  const ingredients = page.ingredients ?? [];
  if (!ingredients.length) return null;

  const { ingredients: clamped, fixes } = clampGoldenIngredientsForCrew(ingredients, crewSize);
  const proteinPerFirefighter = ingredients
    .map((ing) => {
      const oz = auditProteinOzPerFirefighter(ing.name, ing.quantity, ing.unit, crewSize);
      return oz != null ? { item: ing.name, oz } : null;
    })
    .filter(Boolean) as Array<{ item: string; oz: number }>;

  if (FIX && fixes.length) {
    page.ingredients = clamped;
    fs.writeFileSync(file, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  }

  return {
    slug: page.slug || path.basename(file, ".json"),
    title: page.title || page.slug || file,
    file,
    crewSize,
    fixes: fixes.map((f) => ({ ...f, name: `${page.slug}: ${f.name}` })),
    proteinPerFirefighter,
  };
}

function main(): void {
  const pages: PageAudit[] = [];
  for (const root of CATALOG_ROOTS) {
    for (const file of walkJsonPages(root)) {
      const audit = auditPage(file);
      if (audit) pages.push(audit);
    }
  }

  const allFixes = pages.flatMap((p) => p.fixes);
  const outliers = pages
    .flatMap((p) =>
      p.proteinPerFirefighter
        .filter((x) => x.oz > 12)
        .map((x) => ({ slug: p.slug, title: p.title, crew: p.crewSize, ...x })),
    )
    .sort((a, b) => b.oz - a.oz);

  const report = {
    generatedAt: new Date().toISOString(),
    mode: FIX ? "fix" : "audit",
    pagesScanned: pages.length,
    recipesCorrected: pages.filter((p) => p.fixes.length).length,
    ingredientFixes: allFixes.length,
    remainingProteinOutliers: FIX ? [] : outliers,
    fixes: allFixes,
  };

  fs.mkdirSync("review", { recursive: true });
  fs.writeFileSync("review/recipe-portion-scaling-audit.json", `${JSON.stringify(report, null, 2)}\n`);

  const mdLines = [
    "# Recipe portion scaling audit",
    "",
    `- Pages scanned: **${report.pagesScanned}**`,
    `- Recipes corrected: **${report.recipesCorrected}**`,
    `- Ingredient fixes: **${report.ingredientFixes}**`,
    `- Mode: **${report.mode}**`,
    "",
    "## Corrections",
    "",
    "| Recipe | Crew | Old | New | Reason |",
    "| --- | ---: | --- | --- | --- |",
    ...allFixes.map(
      (f) =>
        `| ${f.name.split(": ")[0]} | ${f.crewSize} | ${f.oldQuantity} | ${f.newQuantity} | ${f.reason} |`,
    ),
  ];
  fs.writeFileSync("review/recipe-portion-scaling-audit.md", `${mdLines.join("\n")}\n`);

  console.log(`[audit-recipe-portion-scaling] pages=${report.pagesScanned} fixes=${report.ingredientFixes} mode=${report.mode}`);
  if (!FIX && outliers.length) {
    console.error(`[audit-recipe-portion-scaling] FAIL — ${outliers.length} protein outliers > 12 oz/person`);
    for (const o of outliers.slice(0, 15)) {
      console.error(`  ${o.slug} (${o.crew} crew): ${o.item} = ${o.oz} oz/person`);
    }
    process.exit(1);
  }

  if (FIX && allFixes.length === 0) {
    console.log("[audit-recipe-portion-scaling] OK — no corrections needed");
  } else if (FIX) {
    console.log(`[audit-recipe-portion-scaling] OK — wrote ${allFixes.length} fixes`);
  }
}

main();
