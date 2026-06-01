#!/usr/bin/env tsx
/**
 * Title ↔ dish identity audit — fails when title-required components missing from ingredients/steps.
 *
 *   npm run audit:title-dish-identity
 *
 * Output: review/title-dish-identity-audit.json
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { breakfastPageToGolden, smoothiePageToGolden } from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";
import { titleMatchesDishIdentity } from "../shared/meal-format-contract.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const OUT = path.join("review", "title-dish-identity-audit.json");

type Row = {
  slug: string;
  title: string;
  kind: string;
  pass: boolean;
  reason?: string;
};

function resolvePageJsonPath(slug: string, kind: ApprovedCatalogEntry["kind"]): string | null {
  const candidates = [
    kind === "breakfast_catalog" ? `/catalog/breakfast/pages/${slug}.json` : null,
    kind === "bbq_catalog" ? `/catalog/bbq/pages/${slug}.json` : null,
    kind === "smoothie" ? `/catalog/smoothies/pages/${slug}.json` : null,
    `/catalog/golden-100/pages/${slug}.json`,
    `/catalog/performance-meals/pages/${slug}.json`,
    `/catalog/hall-expansion/pages/${slug}.json`,
    `/catalog/pizza-night/pages/${slug}.json`,
  ].filter(Boolean) as string[];
  for (const rel of candidates) {
    const abs = path.join(PUBLIC, rel.replace(/^\//, ""));
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function loadPage(abs: string): GoldenRecipePage | null {
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    if (abs.includes(`${path.sep}breakfast${path.sep}`)) return breakfastPageToGolden(raw);
    if (abs.includes(`${path.sep}smoothies${path.sep}`)) return smoothiePageToGolden(raw);
    return raw as GoldenRecipePage;
  } catch {
    return null;
  }
}

function auditPage(page: GoldenRecipePage, kind: string): Row {
  const ingCheck = titleMatchesDishIdentity(page.title, page.ingredients);
  const blob = [
    ...(page.steps ?? []).map((s) => `${s.title} ${s.instruction}`),
    page.heroImageAlt ?? "",
  ]
    .join(" ")
    .toLowerCase();

  let pass = ingCheck.ok;
  let reason = ingCheck.reason;

  if (pass && /\bbarley\b/i.test(page.title) && !/\bbarley\b/i.test(blob)) {
    pass = false;
    reason = "steps_or_alt_missing_barley";
  }
  if (pass && /\b(dumpling|dumplings)\b/i.test(page.title)) {
    if (!/\b(dumpling|dumplings|baking powder)\b/i.test(blob)) {
      pass = false;
      reason = "steps_or_alt_missing_dumplings";
    }
  }

  return {
    slug: page.slug,
    title: page.displayTitle || page.title,
    kind,
    pass,
    reason: pass ? undefined : reason,
  };
}

function main(): void {
  const rows: Row[] = [];

  for (const entry of buildAllApprovedCatalogEntries()) {
    const abs = resolvePageJsonPath(entry.slug, entry.kind);
    if (!abs) continue;
    const page = loadPage(abs);
    if (!page) continue;
    rows.push(auditPage(page, entry.kind));
  }

  const failed = rows.filter((r) => !r.pass);
  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      audited: rows.length,
      passed: rows.filter((r) => r.pass).length,
      failed: failed.length,
    },
    failedRecipes: failed,
    rows,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `[audit:title-dish-identity] audited=${report.totals.audited} pass=${report.totals.passed} fail=${report.totals.failed}`,
  );
  console.log(`[audit:title-dish-identity] wrote ${OUT}`);

  if (failed.length > 0) {
    for (const f of failed.slice(0, 10)) {
      console.error(`  FAIL ${f.slug}: ${f.reason}`);
    }
    process.exit(1);
  }
}

main();
