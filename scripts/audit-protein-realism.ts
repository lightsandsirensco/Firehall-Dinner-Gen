#!/usr/bin/env tsx
/**
 * Audit curated catalog recipes for firehall grocery-store protein realism.
 *
 *   npm run audit:protein-realism
 */
import fs from "node:fs";
import path from "node:path";
import {
  auditRecipeProteinRealism,
  PROTEIN_REPLACEMENTS,
  approvedStapleProteins,
} from "../shared/catalog-governance/protein-realism.js";
import { GOLDEN_100_TARGET_BY_CATEGORY, GOLDEN_100_RECIPES } from "../shared/golden-100/recipes-data.js";

const JSON_OUT = path.join("review", "protein-realism-audit.json");
const MD_OUT = path.join("review", "protein-realism-audit.md");

function walkJsonPages(root: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...walkJsonPages(p));
    else if (entry.name.endsWith(".json") && entry.name !== "index.json") out.push(p);
  }
  return out;
}

function collectPageText(page: Record<string, unknown>): Record<string, string> {
  const fields: Record<string, string> = {};
  const scalarKeys = [
    "title",
    "displayTitle",
    "subtitle",
    "shortDescription",
    "description",
    "whyCrewsLikeIt",
    "heroImageAlt",
  ] as const;
  for (const key of scalarKeys) {
    if (page[key]) fields[key] = String(page[key]);
  }
  if (Array.isArray(page.ingredients)) {
    fields.ingredients = page.ingredients
      .map((i) => (typeof i === "object" && i ? String((i as Record<string, unknown>).name || "") : ""))
      .join(" | ");
  }
  if (Array.isArray(page.steps)) {
    fields.steps = page.steps
      .map((s) =>
        typeof s === "object" && s
          ? `${(s as Record<string, unknown>).title || ""} ${(s as Record<string, unknown>).instruction || ""}`
          : "",
      )
      .join(" | ");
  }
  if (Array.isArray(page.tonightSpread)) fields.tonightSpread = page.tonightSpread.map(String).join(" | ");
  if (Array.isArray(page.leftovers)) fields.leftovers = page.leftovers.map(String).join(" | ");
  if (Array.isArray(page.searchTerms)) fields.searchTerms = page.searchTerms.map(String).join(" | ");
  return fields;
}

function loadGoldenSummary(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const r of GOLDEN_100_RECIPES) {
    byCategory[r.masterCategoryId] = (byCategory[r.masterCategoryId] || 0) + 1;
  }
  return { total: GOLDEN_100_RECIPES.length, byCategory };
}

function loadCollectionCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  const roots = [
    ["golden_100", "client/public/catalog/golden-100/index.json"],
    ["performance_meals", "client/public/catalog/performance-meals/index.json"],
    ["hall_expansion", "client/public/catalog/hall-expansion/index.json"],
    ["breakfast", "client/public/catalog/breakfast/index.json"],
    ["bbq", "client/public/catalog/bbq/index.json"],
    ["pizza_night", "client/public/catalog/pizza-night/index.json"],
    ["smoothies", "client/public/catalog/smoothies/index.json"],
  ] as const;
  for (const [key, rel] of roots) {
    const file = path.join(process.cwd(), rel);
    if (!fs.existsSync(file)) continue;
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as { recipeCount?: number; recipes?: unknown[] };
    counts[key] = raw.recipeCount ?? raw.recipes?.length ?? 0;
  }
  return counts;
}

function main(): void {
  const roots = [
    ["golden_100", "client/public/catalog/golden-100/pages"],
    ["performance_meals", "client/public/catalog/performance-meals/pages"],
    ["hall_expansion", "client/public/catalog/hall-expansion/pages"],
    ["breakfast", "client/public/catalog/breakfast/pages"],
    ["breakfast_performance", "client/public/catalog/breakfast/performance/pages"],
    ["bbq", "client/public/catalog/bbq/pages"],
    ["pizza_night", "client/public/catalog/pizza-night/pages"],
    ["smoothies", "client/public/catalog/smoothies/pages"],
  ] as const;

  const failures: Array<{
    slug: string;
    collection: string;
    title: string;
    hits: ReturnType<typeof auditRecipeProteinRealism>;
  }> = [];

  for (const [collection, rel] of roots) {
    for (const file of walkJsonPages(path.join(process.cwd(), rel))) {
      const page = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
      const slug = String(page.slug || path.basename(file, ".json"));
      const title = String(page.title || page.displayTitle || slug);
      const hits = auditRecipeProteinRealism({
        slug,
        collection,
        title,
        fields: collectPageText(page),
      });
      if (hits.length) failures.push({ slug, collection, title, hits });
    }
  }

  const golden = loadGoldenSummary();
  const collectionCounts = loadCollectionCounts();

  const report = {
    generatedAt: new Date().toISOString(),
    approvedStaples: approvedStapleProteins(),
    replacements: PROTEIN_REPLACEMENTS,
    golden100: {
      total: golden.total,
      targets: GOLDEN_100_TARGET_BY_CATEGORY,
      byCategory: golden.byCategory,
    },
    collectionCounts,
    totals: {
      auditedCollections: roots.length,
      failures: failures.length,
      removed: PROTEIN_REPLACEMENTS.filter((r) => r.removedSlug !== r.replacementSlug).length,
      replacedInPlace: PROTEIN_REPLACEMENTS.filter((r) => r.removedSlug === r.replacementSlug).length,
    },
    failures,
  };

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2), "utf8");

  const md = `# Protein Realism Audit

Generated: ${report.generatedAt}

## Goal

Every curated recipe must use proteins a firefighter can buy at Walmart, No Frills, Food Basics, Costco, or Sobeys without a special trip.

**Approved staples:** ${report.approvedStaples.join(", ")}

## Summary

| Metric | Count |
| --- | --- |
| Forbidden-protein failures | ${report.totals.failures} |
| Recipes removed & replaced (new slug) | ${report.totals.removed} |
| Recipes fixed in place | ${report.totals.replacedInPlace} |

## Recipes Removed → Replaced

${PROTEIN_REPLACEMENTS.map(
  (r) =>
    `- \`${r.removedSlug}\` → \`${r.replacementSlug}\` — **${r.removedTitle}** → **${r.replacementTitle}** (${r.replacementProtein})`,
).join("\n")}

## Golden 100 Collection

| Category | Target | Actual |
| --- | ---: | ---: |
${Object.entries(GOLDEN_100_TARGET_BY_CATEGORY)
  .map(
    ([cat, target]) =>
      `| ${cat} | ${target} | ${(golden.byCategory as Record<string, number>)[cat] ?? 0} |`,
  )
  .join("\n")}

**Total:** ${golden.total} recipes (target 100)

## Catalog Counts

${Object.entries(collectionCounts)
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join("\n")}

## Failures

${failures.length ? failures.map((f) => `- \`${f.slug}\` (${f.collection}) — ${f.hits.map((h) => h.term).join(", ")}`).join("\n") : "_None — all curated recipes pass._"}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`[audit:protein-realism] wrote ${JSON_OUT} and ${MD_OUT}`);
  console.log(`[audit:protein-realism] failures=${failures.length}`);
  if (failures.length) process.exitCode = 1;
}

main();
