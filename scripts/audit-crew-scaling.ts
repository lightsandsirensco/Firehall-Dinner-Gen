#!/usr/bin/env tsx
/**
 * Audit dynamic crew scaling across all catalog recipes.
 *
 *   npm run audit:crew-scaling
 */

import fs from "node:fs";
import path from "node:path";
import {
  CANONICAL_BASE_SERVINGS,
  CREW_SIZE_OPTIONS,
  getRecipeBaseServings,
} from "../shared/recipe/crew-scaling-config.js";
import {
  formatScaledQuantity,
  roundCountQuantity,
  scaleGoldenIngredients,
} from "../shared/golden-100/recipe-quality/crew-scale.js";
import type { GoldenRecipePageIngredient } from "../shared/golden-100/recipe-page-schema.js";

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

type ScaleSample = {
  crew: number;
  name: string;
  baseQty: string;
  scaledQty: string;
  unit?: string;
};

type RecipeAudit = {
  slug: string;
  title: string;
  file: string;
  baseServings: number;
  crewSize: number;
  ingredientCount: number;
  ok: boolean;
  issues: string[];
  edgeCases: string[];
  scaleSamples: ScaleSample[];
};

function parseQty(qty: string | undefined): number {
  if (!qty?.trim()) return 0;
  const s = qty.replace(/[¼]/g, "0.25").replace(/[½]/g, "0.5").replace(/[¾]/g, "0.75");
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10);
  if (s.includes("/")) {
    const [a, b] = s.split("/").map((x) => parseFloat(x.trim()));
    if (a && b) return a / b;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function auditRecipe(file: string): RecipeAudit | null {
  const page = JSON.parse(fs.readFileSync(file, "utf8")) as {
    slug?: string;
    title?: string;
    crewSize?: number;
    baseServings?: number;
    ingredients?: GoldenRecipePageIngredient[];
  };

  const ingredients = page.ingredients ?? [];
  if (!ingredients.length) return null;

  const baseServings = getRecipeBaseServings(page);
  const issues: string[] = [];
  const edgeCases: string[] = [];

  if (baseServings !== CANONICAL_BASE_SERVINGS) {
    issues.push(`non_canonical_base: stored at ${baseServings}, expected ${CANONICAL_BASE_SERVINGS}`);
  }

  if (page.baseServings !== CANONICAL_BASE_SERVINGS || page.crewSize !== CANONICAL_BASE_SERVINGS) {
    issues.push(
      `metadata: baseServings=${page.baseServings ?? "missing"} crewSize=${page.crewSize ?? "missing"} (expected ${CANONICAL_BASE_SERVINGS})`,
    );
  }

  const scaleSamples: ScaleSample[] = [];

  for (const crew of CREW_SIZE_OPTIONS) {
    const scaled = scaleGoldenIngredients(ingredients, baseServings, crew);
    for (let i = 0; i < ingredients.length; i++) {
      const base = ingredients[i];
      const out = scaled[i];
      const baseNum = parseQty(base.quantity);
      if (baseNum <= 0) continue;

      const scaledNum = parseQty(out.quantity);
      const expectedLinear = baseNum * (crew / baseServings);

      if (crew < baseServings && scaledNum > baseNum + 0.01) {
        issues.push(`scale_up_bug: ${base.name} increased when scaling down to ${crew}`);
      }

      if (crew === 2 && baseServings === 8 && baseNum === 1 && /\bonion\b/i.test(base.name)) {
        if (out.quantity !== "1/4" && out.quantity !== "1/2") {
          edgeCases.push(`onion_at_2: ${base.name} ${base.quantity} → ${out.quantity} (expected ~1/4 or 1/2)`);
        }
      }

      if (crew === 4 && baseServings === 8 && baseNum === 2 && base.unit === "cup") {
        if (out.quantity !== "1") {
          edgeCases.push(`cups_at_4: ${base.name} 2 cups → ${out.quantity} ${out.unit || ""}`.trim());
        } else {
          scaleSamples.push({
            crew,
            name: base.name,
            baseQty: `${base.quantity} ${base.unit || ""}`.trim(),
            scaledQty: `${out.quantity} ${out.unit || ""}`.trim(),
            unit: out.unit,
          });
        }
      }

      if (/\blb\b/i.test(base.unit || "") && crew === 2 && baseServings === 8 && baseNum === 4) {
        const want = formatScaledQuantity(1);
        if (out.quantity !== want) {
          edgeCases.push(`weight_at_2: ${base.name} 4 lb → ${out.quantity} lb (expected ${want} lb)`);
        } else {
          scaleSamples.push({
            crew,
            name: base.name,
            baseQty: `${base.quantity} ${base.unit}`,
            scaledQty: `${out.quantity} ${out.unit}`,
            unit: out.unit,
          });
        }
      }

      if (scaledNum <= 0 && expectedLinear >= 0.125) {
        issues.push(`zeroed: ${base.name} became empty at crew ${crew}`);
      }

      if (/\bwhole\b/i.test(base.unit || "") && crew !== baseServings) {
        const rounded = roundCountQuantity(expectedLinear);
        if (Math.abs(scaledNum - rounded) > 0.15) {
          edgeCases.push(
            `count_rounding: ${base.name} ${base.quantity} @ crew ${crew} → ${out.quantity} (linear ${expectedLinear.toFixed(2)})`,
          );
        }
      }
    }
  }

  return {
    slug: page.slug || path.basename(file, ".json"),
    title: page.title || page.slug || file,
    file,
    baseServings,
    crewSize: page.crewSize ?? baseServings,
    ingredientCount: ingredients.length,
    ok: issues.length === 0,
    issues,
    edgeCases,
    scaleSamples: scaleSamples.slice(0, 3),
  };
}

function main(): void {
  const audits: RecipeAudit[] = [];
  for (const root of CATALOG_ROOTS) {
    for (const file of walkJsonPages(root)) {
      const audit = auditRecipe(file);
      if (audit) audits.push(audit);
    }
  }

  const failed = audits.filter((a) => !a.ok);
  const edgeCaseRows = audits.filter((a) => a.edgeCases.length > 0);
  const formattingFixes = edgeCaseRows.flatMap((a) =>
    a.edgeCases.map((e) => ({ slug: a.slug, note: e })),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    crewOptions: CREW_SIZE_OPTIONS,
    canonicalBase: CANONICAL_BASE_SERVINGS,
    recipesAudited: audits.length,
    successfullyScaled: audits.filter((a) => a.ok).length,
    failures: failed.length,
    edgeCaseRecipes: edgeCaseRows.length,
    quantityFormattingNotes: formattingFixes.length,
    failed,
    edgeCases: edgeCaseRows.map((a) => ({
      slug: a.slug,
      title: a.title,
      cases: a.edgeCases,
    })),
    sampleScaling: audits.flatMap((a) => a.scaleSamples).slice(0, 12),
  };

  fs.mkdirSync("review", { recursive: true });
  fs.writeFileSync("review/crew-scaling-audit.json", `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Crew scaling audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Recipes audited | ${report.recipesAudited} |`,
    `| Successfully scaled (canonical base ${CANONICAL_BASE_SERVINGS}) | ${report.successfullyScaled} |`,
    `| Failures | ${report.failures} |`,
    `| Edge-case recipes | ${report.edgeCaseRecipes} |`,
    `| Quantity formatting notes | ${report.quantityFormattingNotes} |`,
    "",
    "## Crew options",
    "",
    CREW_SIZE_OPTIONS.join(", "),
    "",
    "## Sample scaling (verified patterns)",
    "",
    "| Crew | Ingredient | Base (8) | Scaled |",
    "| ---: | --- | --- | --- |",
    ...report.sampleScaling.map(
      (s) => `| ${s.crew} | ${s.name} | ${s.baseQty} | ${s.scaledQty} |`,
    ),
    "",
    "## Failures",
    "",
    ...(failed.length
      ? failed.map((f) => `- **${f.slug}**: ${f.issues.join("; ")}`)
      : ["_None_"]),
    "",
    "## Edge cases",
    "",
    ...(edgeCaseRows.length
      ? edgeCaseRows.slice(0, 40).flatMap((a) => [
          `### ${a.slug}`,
          ...a.edgeCases.map((c) => `- ${c}`),
          "",
        ])
      : ["_None_"]),
  ];

  fs.writeFileSync("review/crew-scaling-audit.md", `${md.join("\n")}\n`);

  console.log(
    `[audit:crew-scaling] recipes=${report.recipesAudited} ok=${report.successfullyScaled} fail=${report.failures} edge=${report.edgeCaseRecipes}`,
  );

  if (failed.length > 0) process.exit(1);
}

main();
