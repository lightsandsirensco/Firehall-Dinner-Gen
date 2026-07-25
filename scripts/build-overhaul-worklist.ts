#!/usr/bin/env tsx
/**
 * Build the library-overhaul worklist: every approved recipe audited and
 * sorted worst-first, with resolved page file paths.
 *
 *   npx tsx scripts/build-overhaul-worklist.ts
 *
 * Output: review/library-overhaul-worklist.json
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { auditCuratedRecipeQuality } from "../shared/recipe-quality/curated-recipe-quality-audit.js";
import {
  breakfastPageToGolden,
  smoothiePageToGolden,
} from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";

const PUBLIC = path.join(process.cwd(), "client", "public");

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const candidates = [
    kind === "breakfast_catalog" ? `catalog/breakfast/pages/${slug}.json` : null,
    kind === "bbq_catalog" ? `catalog/bbq/pages/${slug}.json` : null,
    kind === "smoothie" ? `catalog/smoothies/pages/${slug}.json` : null,
    `catalog/golden-100/pages/${slug}.json`,
    `catalog/performance-meals/pages/${slug}.json`,
    `catalog/hall-expansion/pages/${slug}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel);
    if (fs.existsSync(abs)) return rel;
  }
  return null;
}

const rows: Array<{
  slug: string;
  kind: string;
  file: string | null;
  pass: boolean;
  score: number;
  issues: string[];
}> = [];

for (const entry of buildAllApprovedCatalogEntries()) {
  const rel = resolvePageJsonPath(entry.slug, entry.kind);
  if (!rel) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(PUBLIC, rel), "utf8")) as Record<string, unknown>;
  const page =
    entry.kind === "breakfast_catalog"
      ? breakfastPageToGolden(raw)
      : entry.kind === "smoothie"
        ? smoothiePageToGolden(raw)
        : (raw as never);
  const audit = auditCuratedRecipeQuality(page, entry);
  rows.push({
    slug: entry.slug,
    kind: entry.kind,
    file: `client/public/${rel}`,
    pass: audit.pass,
    score: audit.score,
    issues: audit.issues.map((i) => `${i.category}: ${i.message}`),
  });
}

rows.sort((a, b) => a.score - b.score || a.slug.localeCompare(b.slug));

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    recipes: rows.length,
    pass: rows.filter((r) => r.pass).length,
    fail: rows.filter((r) => !r.pass).length,
  },
  rows,
};

fs.mkdirSync(path.join(process.cwd(), "review"), { recursive: true });
fs.writeFileSync(
  path.join(process.cwd(), "review", "library-overhaul-worklist.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(
  `[overhaul-worklist] recipes=${report.totals.recipes} pass=${report.totals.pass} fail=${report.totals.fail}`,
);
