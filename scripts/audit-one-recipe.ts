#!/usr/bin/env tsx
/**
 * Audit one or more catalog recipes against the full production quality bar.
 * Used by the library overhaul to verify each rewrite before it ships.
 *
 *   npx tsx scripts/audit-one-recipe.ts <slug> [slug...]
 *   npx tsx scripts/audit-one-recipe.ts <slug> --scale   (also print 4/14 crew scaling)
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import type { ApprovedCatalogEntry } from "../shared/approved-catalog.js";
import { auditCuratedRecipeQuality } from "../shared/recipe-quality/curated-recipe-quality-audit.js";
import { goldenRecipePageSchema } from "../shared/golden-100/recipe-page-schema.js";
import { breakfastRecipePageSchema } from "../shared/breakfast-schema.js";
import { scaleGoldenIngredients } from "../shared/golden-100/recipe-quality/crew-scale.js";
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
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const showScale = process.argv.includes("--scale");
if (!args.length) {
  console.error("usage: npx tsx scripts/audit-one-recipe.ts <slug> [slug...] [--scale]");
  process.exit(2);
}

const entries = buildAllApprovedCatalogEntries();
let failures = 0;

for (const slug of args) {
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) {
    console.log(`${slug}: NOT IN APPROVED CATALOG`);
    failures++;
    continue;
  }
  const abs = resolvePageJsonPath(slug, entry.kind);
  if (!abs) {
    console.log(`${slug}: PAGE FILE NOT FOUND`);
    failures++;
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(abs, "utf8")) as Record<string, unknown>;

  let page;
  let schemaNote = "";
  if (entry.kind === "breakfast_catalog") {
    const parsed = breakfastRecipePageSchema.safeParse(raw);
    if (!parsed.success) {
      console.log(`${slug}: BREAKFAST SCHEMA FAIL`);
      for (const issue of parsed.error.issues.slice(0, 6)) {
        console.log(`   schema: ${issue.path.join(".")}: ${issue.message}`);
      }
      failures++;
      continue;
    }
    page = breakfastPageToGolden(raw);
    schemaNote = " (breakfast adapter)";
  } else if (entry.kind === "smoothie") {
    page = smoothiePageToGolden(raw);
    schemaNote = " (smoothie adapter)";
  } else {
    const parsed = goldenRecipePageSchema.safeParse(raw);
    if (!parsed.success) {
      console.log(`${slug}: SCHEMA FAIL`);
      for (const issue of parsed.error.issues.slice(0, 6)) {
        console.log(`   schema: ${issue.path.join(".")}: ${issue.message}`);
      }
      failures++;
      continue;
    }
    page = parsed.data;
  }

  const audit = auditCuratedRecipeQuality(page, entry);
  if (audit.pass) {
    console.log(`${slug}: PASS (score ${audit.score})${schemaNote}`);
  } else {
    failures++;
    console.log(`${slug}: FAIL (score ${audit.score})${schemaNote}`);
    for (const issue of audit.issues) {
      console.log(`   ${issue.category}: ${issue.message}`);
    }
  }

  if (showScale) {
    for (const crew of [4, 14]) {
      const scaled = scaleGoldenIngredients(page.ingredients ?? [], 8, crew);
      console.log(
        `   crew ${crew}: ` +
          scaled
            .slice(0, 8)
            .map((i) => `${i.quantity ?? ""}${i.unit ? " " + i.unit : ""} ${i.name}`)
            .join(" | "),
      );
    }
  }
}

process.exit(failures ? 1 : 0);
