#!/usr/bin/env tsx
/**
 * Audit catalog ingredients: real US↔Metric conversion + Title Case names.
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatIngredientAmount,
  isFakeMetricConversion,
  parseLeadingQuantityUnit,
} from "../shared/measurements/convert.js";
import {
  formatTemperaturesInText,
  fahrenheitToCelsius,
} from "../shared/measurements/temperature.js";
import {
  formatIngredientDisplayName,
  isTitleCaseIngredientName,
} from "../shared/measurements/ingredient-names.js";

const ROOT = process.cwd();
const CATALOG_DIRS = [
  join(ROOT, "client/public/catalog/golden-100/pages"),
  join(ROOT, "client/public/catalog/breakfast/pages"),
  join(ROOT, "client/public/catalog/hall-expansion/pages"),
  join(ROOT, "client/public/catalog/performance-meals/pages"),
  join(ROOT, "client/public/catalog/bbq/pages"),
];

type Ingredient = { name?: string; quantity?: string; unit?: string };
type Page = { slug?: string; title?: string; ingredients?: Ingredient[]; steps?: Array<{ instruction?: string }> };

const issues: string[] = [];
let recipesChecked = 0;
let conversionFixed = 0;
let capitalizationFixed = 0;

function listJsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => join(dir, f));
}

for (const dir of CATALOG_DIRS) {
  for (const file of listJsonFiles(dir)) {
    const page = JSON.parse(readFileSync(file, "utf8")) as Page;
    if (!page.ingredients?.length) continue;
    recipesChecked++;
    const label = page.slug || file;

    for (const ing of page.ingredients) {
      const name = (ing.name || "").trim();
      if (!name) {
        issues.push(`${label}: ingredient missing name`);
        continue;
      }

      if (!isTitleCaseIngredientName(name)) {
        capitalizationFixed++;
        const fixed = formatIngredientDisplayName(name);
        if (fixed === name.toLowerCase()) {
          issues.push(`${label}: could not Title Case "${name}"`);
        }
      }

      const us = formatIngredientAmount(ing.quantity, ing.unit, "us");
      const metric = formatIngredientAmount(ing.quantity, ing.unit, "metric");

      if (metric.includes("undefined")) {
        issues.push(`${label}: broken metric for ${name}`);
      }

      if (isFakeMetricConversion(ing.quantity, ing.unit, metric)) {
        issues.push(`${label}: fake metric conversion ${us} → ${metric}`);
      }

      const resolvedUnit = ing.unit?.trim() || parseLeadingQuantityUnit(ing.quantity || "")?.unit;
      if (resolvedUnit && ["lb", "oz", "cup", "tbsp", "tsp"].includes(resolvedUnit)) {
        if (metric === us) {
          issues.push(`${label}: imperial unit not converted (${us}) for ${name}`);
        } else {
          conversionFixed++;
        }
      }
    }

    for (const step of page.steps ?? []) {
      const text = step.instruction || "";
      if (!/\d+\s*°\s*F/i.test(text)) continue;
      const metricText = formatTemperaturesInText(text, "metric");
      if (/\d+\s*°\s*F/i.test(metricText)) {
        issues.push(`${label}: step still shows °F in metric mode`);
      }
      if (/\d+\s*°\s*C/.test(metricText)) {
        const fMatch = text.match(/(\d+)\s*°\s*F/i);
        const cMatch = metricText.match(/(\d+)\s*°\s*C/);
        if (fMatch && cMatch) {
          const f = parseInt(fMatch[1], 10);
          const c = parseInt(cMatch[1], 10);
          if (f >= 350 && c === f) {
            issues.push(`${label}: fake temp ${f}°F → ${c}°C (label swap only)`);
          }
        }
      }
    }
  }
}

// Spot-check canonical examples
const examples: Array<[string, string, string]> = [
  ["2", "lb", "900 g"],
  ["1", "lb", "450 g"],
  ["8", "oz", "224 g"],
  ["1", "cup", "240 ml"],
  ["1", "tbsp", "15 ml"],
  ["1", "tsp", "5 ml"],
];
for (const [q, u, expected] of examples) {
  const got = formatIngredientAmount(q, u, "metric");
  if (got !== expected) {
    issues.push(`example: ${q} ${u} metric expected "${expected}" got "${got}"`);
  }
}

const temp350 = formatTemperaturesInText("Bake at 350°F until done.", "metric");
if (!temp350.includes("177°C") && !temp350.includes("176°C")) {
  issues.push(`350°F metric text expected ~177°C, got: ${temp350}`);
}
if (fahrenheitToCelsius(350) !== 177) {
  issues.push(`fahrenheitToCelsius(350) expected 177 got ${fahrenheitToCelsius(350)}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  recipesChecked,
  conversionIssuesFixed: conversionFixed,
  capitalizationIssuesFound: capitalizationFixed,
  failures: issues.length,
  issues,
};

const outJson = join(ROOT, "review", "measurement-conversion-audit.json");
const outMd = join(ROOT, "review", "measurement-conversion-audit.md");
writeFileSync(outJson, JSON.stringify(report, null, 2));
writeFileSync(
  outMd,
  [
    "# Measurement conversion audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Recipes checked | ${report.recipesChecked} |`,
    `| Imperial fields converted (sample) | ${report.conversionIssuesFixed} |`,
    `| Title Case gaps (display-layer fixes) | ${report.capitalizationIssuesFound} |`,
    `| Failures | ${report.failures} |`,
    "",
    report.issues.length ? report.issues.map((i) => `- ${i}`).join("\n") : "_No failures._",
  ].join("\n"),
);

if (issues.length > 0) {
  console.error(`[audit-measurement-conversion] FAIL ${issues.length} issues`);
  for (const i of issues.slice(0, 20)) console.error(`  - ${i}`);
  process.exit(1);
}

console.log(
  `[audit-measurement-conversion] OK recipes=${recipesChecked} imperialConverted=${conversionFixed} titleCaseGaps=${capitalizationFixed}`,
);
