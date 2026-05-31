#!/usr/bin/env tsx
/**
 * Audit approved recipe detail quality (Phase 7 standard).
 *
 *   npm run audit:recipe-detail
 *   npm run audit:recipe-detail -- --batch=breakfast
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { isHallClassicSlug } from "../shared/hall-catalog/gate.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { auditRecipeDetailBatch } from "../shared/golden-100/recipe-quality/recipe-detail-audit.js";
import { breakfastPageToGolden, smoothiePageToGolden } from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const REVIEW = path.join(ROOT, "review");

type BatchId = "breakfast" | "bbq" | "classics" | "performance" | "remaining" | "all";

function parseBatch(): BatchId {
  const arg = process.argv.find((a) => a.startsWith("--batch="));
  return (arg?.split("=")[1] as BatchId) || "all";
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

function loadPage(entry: ApprovedCatalogEntry): GoldenRecipePage | null {
  const abs = resolvePageJsonPath(entry.slug, entry.kind);
  if (!abs) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    if (entry.kind === "breakfast_catalog") {
      return breakfastPageToGolden(raw);
    }
    if (entry.kind === "smoothie") {
      return smoothiePageToGolden(raw);
    }
    return raw as GoldenRecipePage;
  } catch {
    return null;
  }
}

function inBatch(entry: ApprovedCatalogEntry, batch: BatchId): boolean {
  if (batch === "all") return true;
  if (batch === "breakfast") return entry.kind === "breakfast_catalog";
  if (batch === "bbq") return entry.kind === "bbq_catalog";
  if (batch === "classics") return isHallClassicSlug(entry.slug);
  if (batch === "performance") return entry.kind === "performance_meal";
  if (batch === "remaining") {
    if (entry.kind === "breakfast_catalog" || entry.kind === "bbq_catalog") return false;
    if (entry.kind === "performance_meal") return false;
    if (isHallClassicSlug(entry.slug)) return false;
    return true;
  }
  return true;
}

function main(): void {
  const batch = parseBatch();
  const entries = buildAllApprovedCatalogEntries().filter((e) => inBatch(e, batch));
  const pages: Array<{ page: GoldenRecipePage; entry: ApprovedCatalogEntry }> = [];

  for (const entry of entries) {
    const page = loadPage(entry);
    if (!page) continue;
    pages.push({ page, entry });
  }

  const report = auditRecipeDetailBatch(
    pages.map(({ page, entry }) => ({
      page,
      entry: { slug: entry.slug, kind: entry.kind },
    })),
  );

  fs.mkdirSync(REVIEW, { recursive: true });
  fs.writeFileSync(path.join(REVIEW, "recipe-detail-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    "# Recipe Detail Audit",
    "",
    `Batch: **${batch}**`,
    `- Pass: **${report.totals.pass}/${report.totals.recipes}**`,
    `- Fail: **${report.totals.fail}**`,
    "",
    "## Failures",
    "",
    ...report.rows
      .filter((r) => !r.pass)
      .slice(0, 40)
      .map((r) => `- \`${r.slug}\` — ${r.issues.slice(0, 3).join("; ")}`),
  ];
  fs.writeFileSync(path.join(REVIEW, "recipe-detail-audit.md"), `${md.join("\n")}\n`);

  console.log(`[audit:recipe-detail] batch=${batch} pass=${report.totals.pass}/${report.totals.recipes}`);
  if (report.totals.fail > 0) {
    console.error(`[audit:recipe-detail] ${report.totals.fail} failures — see review/recipe-detail-audit.json`);
    process.exit(1);
  }
}

main();
