#!/usr/bin/env tsx
/**
 * Phase 7 — rewrite failing approved recipe pages to production detail standard.
 *
 *   npm run rewrite:recipe-detail-phase7 -- --batch=breakfast
 *   npm run rewrite:recipe-detail-phase7 -- --batch=all
 *   npm run rewrite:recipe-detail-phase7 -- --batch=breakfast --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { isHallClassicSlug } from "../shared/hall-catalog/gate.js";
import type { GoldenRecipePage } from "../shared/golden-100/recipe-page-schema.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import {
  breakfastPageToGolden,
  goldenPageToBreakfastPatch,
  goldenPageToSmoothiePatch,
  rewriteRecipeDetailPage,
  smoothiePageToGolden,
} from "../shared/golden-100/recipe-quality/detail-rewrite-engine.js";
import { auditRecipeDetailPage } from "../shared/golden-100/recipe-quality/recipe-detail-audit.js";

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "client", "public");
const DRY_RUN = process.argv.includes("--dry-run");

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

function writePage(
  entry: ApprovedCatalogEntry,
  page: GoldenRecipePage,
  raw: Record<string, unknown>,
): void {
  const abs = resolvePageJsonPath(entry.slug, entry.kind)!;
  let output: Record<string, unknown>;
  if (entry.kind === "breakfast_catalog") {
    output = goldenPageToBreakfastPatch(page, raw);
  } else if (entry.kind === "smoothie") {
    output = goldenPageToSmoothiePatch(page, raw);
  } else {
    output = { ...raw, ...page };
  }
  if (!DRY_RUN) {
    fs.writeFileSync(abs, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  }
}

function main(): void {
  const batch = parseBatch();
  const entries = buildAllApprovedCatalogEntries().filter((e) => inBatch(e, batch));
  let rewritten = 0;
  let skipped = 0;
  let stillFailing = 0;

  for (const entry of entries) {
    const abs = resolvePageJsonPath(entry.slug, entry.kind);
    if (!abs) {
      console.warn(`[phase7] missing page: ${entry.slug}`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;
    const before =
      entry.kind === "breakfast_catalog"
        ? breakfastPageToGolden(raw)
        : entry.kind === "smoothie"
          ? smoothiePageToGolden(raw)
          : (raw as GoldenRecipePage);

    const beforeAudit = auditRecipeDetailPage(before, entry);
    if (beforeAudit.pass) {
      skipped++;
      continue;
    }

    const ctx = {
      slug: entry.slug,
      kind: entry.kind,
      protein: entry.protein,
      mealFormat: entry.mealFormat,
      category: entry.category,
      isClassic: isHallClassicSlug(entry.slug),
    };

    let page = rewriteRecipeDetailPage(before, ctx);

    // Up to 2 extra passes if still failing (padding/word expansion)
    for (let pass = 0; pass < 2; pass++) {
      const audit = auditRecipeDetailPage(page, entry);
      if (audit.pass) break;
      page = rewriteRecipeDetailPage(page, ctx);
    }

    if (entry.kind !== "breakfast_catalog" && entry.kind !== "smoothie") {
      page = goldenRecipePageSchema.parse(page);
    }

    const afterAudit = auditRecipeDetailPage(page, entry);
    writePage(entry, page, raw);
    rewritten++;

    if (afterAudit.pass) {
      console.log(`[phase7] ✓ ${entry.slug}`);
    } else {
      stillFailing++;
      console.warn(`[phase7] ✗ ${entry.slug} — ${afterAudit.issues.slice(0, 2).join("; ")}`);
    }
  }

  console.log(
    `[phase7] batch=${batch} rewritten=${rewritten} skipped=${skipped} stillFailing=${stillFailing}${DRY_RUN ? " (dry-run)" : ""}`,
  );

  if (stillFailing > 0 && !DRY_RUN) {
    process.exit(1);
  }
}

main();
