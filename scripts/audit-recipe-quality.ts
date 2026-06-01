#!/usr/bin/env tsx
/**
 * Audit curated recipe quality — beginner-proof, accurate, firehall-authentic.
 *
 *   npm run audit:recipe-quality
 *   npm run audit:recipe-quality -- --scope=full
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { breakfastPageToGolden, smoothiePageToGolden } from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";
import {
  auditCuratedRecipeQuality,
  buildCuratedQualityReport,
} from "../shared/recipe-quality/curated-recipe-quality-audit.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const REVIEW = path.join(ROOT, "review");
const scope = process.argv.includes("--scope=full") ? "full" : "approved";

const CATALOG_ROOTS = [
  "catalog/golden-100/pages",
  "catalog/hall-expansion/pages",
  "catalog/breakfast/pages",
  "catalog/pizza-night/pages",
  "catalog/performance-meals/pages",
  "catalog/bbq/pages",
  "catalog/smoothies/pages",
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

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const candidates = [
    kind === "breakfast_catalog" ? `/catalog/breakfast/pages/${slug}.json` : null,
    kind === "bbq_catalog" ? `/catalog/bbq/pages/${slug}.json` : null,
    kind === "smoothie" ? `/catalog/smoothies/pages/${slug}.json` : null,
    `/catalog/golden-100/pages/${slug}.json`,
    `/catalog/performance-meals/pages/${slug}.json`,
    `/catalog/hall-expansion/pages/${slug}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function loadPageFromFile(file: string): GoldenRecipePage | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const slug = String(raw.slug || path.basename(file, ".json"));
    if (file.includes(`${path.sep}breakfast${path.sep}`)) {
      return breakfastPageToGolden(raw);
    }
    if (file.includes(`${path.sep}smoothies${path.sep}`)) {
      return smoothiePageToGolden(raw);
    }
    return raw as GoldenRecipePage;
  } catch {
    return null;
  }
}

function loadApprovedPages(): Array<{ page: GoldenRecipePage; entry: ApprovedCatalogEntry }> {
  const pages: Array<{ page: GoldenRecipePage; entry: ApprovedCatalogEntry }> = [];
  for (const entry of buildAllApprovedCatalogEntries()) {
    const abs = resolvePageJsonPath(entry.slug, entry.kind);
    if (!abs) continue;
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    const page =
      entry.kind === "breakfast_catalog"
        ? breakfastPageToGolden(raw)
        : entry.kind === "smoothie"
          ? smoothiePageToGolden(raw)
          : (raw as GoldenRecipePage);
    pages.push({ page, entry });
  }
  return pages;
}

function loadFullCatalogPages(): Array<{ page: GoldenRecipePage; entry: Pick<ApprovedCatalogEntry, "slug" | "kind"> }> {
  const rows: Array<{ page: GoldenRecipePage; entry: Pick<ApprovedCatalogEntry, "slug" | "kind"> }> = [];
  for (const rel of CATALOG_ROOTS) {
    for (const file of walkJsonPages(path.join(PUBLIC, rel))) {
      const page = loadPageFromFile(file);
      if (!page?.ingredients?.length) continue;
      let kind: ApprovedCatalogEntry["kind"] = "golden_100";
      if (rel.includes("breakfast")) kind = "breakfast_catalog";
      else if (rel.includes("bbq")) kind = "bbq_catalog";
      else if (rel.includes("smoothies")) kind = "smoothie";
      else if (rel.includes("performance")) kind = "performance_meal";
      rows.push({ page, entry: { slug: page.slug, kind } });
    }
  }
  return rows;
}

function main(): void {
  const sources = scope === "full" ? loadFullCatalogPages() : loadApprovedPages();
  const rows = sources.map(({ page, entry }) => auditCuratedRecipeQuality(page, entry));
  const report = buildCuratedQualityReport(rows);

  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(path.join(REVIEW, "recipe-quality-audit.json"), `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Firehall Meals Recipe Quality Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Scope: **${scope}** (${report.totals.recipes} recipes)`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Pass | ${report.totals.pass} |`,
    `| Fail | ${report.totals.fail} |`,
    "",
    "## Issues by category",
    "",
    "| Category | Count |",
    "| --- | ---: |",
    ...Object.entries(report.totals.byCategory)
      .filter(([, n]) => n > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, n]) => `| ${cat.replace(/_/g, " ")} | ${n} |`),
    "",
    "## Failures (sample)",
    "",
    ...report.rows
      .filter((r) => !r.pass)
      .slice(0, 50)
      .map((r) => `- **${r.slug}** — ${r.issues.slice(0, 3).map((i) => i.message).join("; ")}`),
  ];

  fs.writeFileSync(path.join(REVIEW, "recipe-quality-audit.md"), `${md.join("\n")}\n`);

  console.log(
    `[audit:recipe-quality] scope=${scope} recipes=${report.totals.recipes} pass=${report.totals.pass} fail=${report.totals.fail}`,
  );
}

main();
