#!/usr/bin/env tsx
/**
 * Firehall Meals — 9-phase master recipe audit.
 *
 *   npm run audit:master-recipes
 *   npm run audit:master-recipes -- --scope=approved
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import {
  auditMasterRecipe,
  buildMasterRecipeAuditReport,
} from "../shared/recipe-quality/master-recipe-audit.js";
import { breakfastPageToGolden, smoothiePageToGolden } from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";
import { GOLDEN_100_TARGET_BY_CATEGORY, GOLDEN_100_RECIPES } from "../shared/golden-100/recipes-data.js";

const JSON_OUT = path.join("review", "master-recipe-audit.json");
const MD_OUT = path.join("review", "master-recipe-audit.md");
const PUBLIC = path.join(process.cwd(), "client", "public");

const CATALOG_ROOTS = [
  ["golden_100", "catalog/golden-100/pages"],
  ["performance_meals", "catalog/performance-meals/pages"],
  ["hall_expansion", "catalog/hall-expansion/pages"],
  ["breakfast", "catalog/breakfast/pages"],
  ["breakfast_performance", "catalog/breakfast/performance/pages"],
  ["bbq", "catalog/bbq/pages"],
  ["pizza_night", "catalog/pizza-night/pages"],
  ["smoothies", "catalog/smoothies/pages"],
] as const;

function parseScope(): "full" | "approved" {
  return process.argv.includes("--scope=approved") ? "approved" : "full";
}

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

function kindForCollection(collection: string): ApprovedCatalogEntry["kind"] {
  if (collection === "breakfast" || collection === "breakfast_performance") return "breakfast_catalog";
  if (collection === "bbq") return "bbq_catalog";
  if (collection === "smoothies") return "smoothie";
  if (collection === "performance_meals") return "performance_meal";
  if (collection === "pizza_night") return "pizza_night";
  return "golden_100";
}

function loadPageFromFile(file: string, collection: string): GoldenRecipePage | null {
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    if (collection === "breakfast" || collection === "breakfast_performance") {
      return breakfastPageToGolden(raw);
    }
    if (collection === "smoothies") return smoothiePageToGolden(raw);
    return raw as GoldenRecipePage;
  } catch {
    return null;
  }
}

function loadAllPages(scope: "full" | "approved"): Array<{
  slug: string;
  collection: string;
  kind: ApprovedCatalogEntry["kind"];
  page: GoldenRecipePage;
}> {
  const approvedSlugs = scope === "approved" ? new Set(buildAllApprovedCatalogEntries().map((e) => e.slug)) : null;
  const bySlug = new Map<string, { slug: string; collection: string; kind: ApprovedCatalogEntry["kind"]; page: GoldenRecipePage }>();

  for (const [collection, rel] of CATALOG_ROOTS) {
    for (const file of walkJsonPages(path.join(PUBLIC, rel))) {
      const page = loadPageFromFile(file, collection);
      if (!page?.slug) continue;
      if (approvedSlugs && !approvedSlugs.has(page.slug)) continue;
      bySlug.set(`${collection}:${page.slug}`, {
        slug: page.slug,
        collection,
        kind: kindForCollection(collection),
        page,
      });
    }
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function main(): void {
  const scope = parseScope();
  const loaded = loadAllPages(scope);
  const rows = loaded.map(({ slug, collection, kind, page }) =>
    auditMasterRecipe({ slug, collection, kind, page }),
  );
  const report = buildMasterRecipeAuditReport(rows);

  const goldenByCat: Record<string, number> = {};
  for (const r of GOLDEN_100_RECIPES) {
    goldenByCat[r.masterCategoryId] = (goldenByCat[r.masterCategoryId] || 0) + 1;
  }

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, JSON.stringify({ ...report, scope, golden100: { total: GOLDEN_100_RECIPES.length, targets: GOLDEN_100_TARGET_BY_CATEGORY, byCategory: goldenByCat } }, null, 2));

  const gradeD = rows.filter((r) => r.grade === "D");
  const gradeC = rows.filter((r) => r.grade === "C");

  const md = `# Firehall Meals Master Recipe Audit

Generated: ${report.generatedAt}
Scope: **${scope}** (${report.totals.recipes} recipes)

## Objective

Accurate, detailed, beginner-proof, firehall-realistic, consistent recipes — not longer for length's sake.

## Summary

| Metric | Count |
| --- | ---: |
| Recipes audited | ${report.totals.recipes} |
| Grade A (publish ready) | ${report.totals.gradeA} |
| Grade B (minor fixes) | ${report.totals.gradeB} |
| Grade C (major rewrite) | ${report.totals.gradeC} |
| Grade D (replace) | ${report.totals.gradeD} |

## Phase Failures

| Phase | Name | Failures |
| ---: | --- | ---: |
| 1 | Spelling & grammar | ${report.totals.phaseFailures[1] ?? 0} |
| 2 | Title accuracy | ${report.totals.phaseFailures[2] ?? 0} |
| 3 | Ingredient alignment | ${report.totals.phaseFailures[3] ?? 0} |
| 4 | Beginner-proof steps | ${report.totals.phaseFailures[4] ?? 0} |
| 5 | Step detail | ${report.totals.phaseFailures[5] ?? 0} |
| 6 | Firehall protein realism | ${report.totals.phaseFailures[6] ?? 0} |
| 7 | Image accuracy (metadata) | ${report.totals.phaseFailures[7] ?? 0} |
| 8 | Recipe completeness | ${report.totals.phaseFailures[8] ?? 0} |
| 9 | Core content quality | ${report.totals.phaseFailures[9] ?? 0} |

## Golden 100

Total: **${GOLDEN_100_RECIPES.length}** (target 100)

## Grade D — Replace or Critical Fix (${gradeD.length})

${gradeD.length ? gradeD.map((r) => `- \`${r.slug}\` (${r.collection}) — ${r.blockingIssues.slice(0, 2).join("; ")}`).join("\n") : "_None_"}

## Grade C — Major Rewrite (${gradeC.length})

${gradeC.length ? gradeC.slice(0, 25).map((r) => `- \`${r.slug}\` — ${r.issueCount} issues`).join("\n") : "_None_"}
${gradeC.length > 25 ? `\n_…and ${gradeC.length - 25} more (see JSON)._` : ""}

## Grade A Sample

${rows.filter((r) => r.grade === "A").slice(0, 10).map((r) => `- \`${r.slug}\``).join("\n") || "_None yet_"}
`;

  fs.writeFileSync(MD_OUT, md, "utf8");
  console.log(`[audit:master-recipes] wrote ${JSON_OUT} and ${MD_OUT}`);
  console.log(
    `[audit:master-recipes] scope=${scope} recipes=${report.totals.recipes} A=${report.totals.gradeA} B=${report.totals.gradeB} C=${report.totals.gradeC} D=${report.totals.gradeD}`,
  );

  const blockers =
    (report.totals.phaseFailures[6] ?? 0) +
    (report.totals.phaseFailures[7] ?? 0) +
    report.totals.gradeD;
  if (blockers > 0 || report.totals.gradeC > 0) process.exitCode = 1;
}

main();
