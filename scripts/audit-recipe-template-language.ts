#!/usr/bin/env tsx
/**
 * Scan all curated catalog JSON pages for generic template language.
 *
 *   npm run audit:recipe-template-language
 */
import fs from "node:fs";
import path from "node:path";
import { findTemplateLanguageInText } from "../shared/golden-100/recipe-quality/template-language.js";

const PUBLIC = path.join(process.cwd(), "client", "public", "catalog");

const CATALOG_DIRS = [
  "golden-100/pages",
  "breakfast/pages",
  "performance-meals/pages",
  "hall-expansion/pages",
  "smoothies/pages",
];

type Hit = { slug: string; catalog: string; field: string; issues: string[] };

function scanPage(filePath: string, catalog: string): Hit | null {
  const raw = fs.readFileSync(filePath, "utf8").trimStart();
  if (raw.startsWith("<")) return null;
  const page = JSON.parse(raw) as Record<string, unknown>;
  const slug = String(page.slug || path.basename(filePath, ".json"));
  const issues: string[] = [];

  const textFields: Array<[string, string]> = [
    ["description", String(page.description || "")],
    ["mealPrepNotes", String(page.mealPrepNotes || "")],
    ["whyCrewsLikeIt", String(page.whyCrewsLikeIt || "")],
  ];

  const tonightSpread = page.tonightSpread;
  if (Array.isArray(tonightSpread)) {
    textFields.push(["tonightSpread", tonightSpread.join("\n")]);
  }
  const proTips = page.proTips;
  if (Array.isArray(proTips)) {
    textFields.push(["proTips", proTips.join("\n")]);
  }
  const leftovers = page.leftoversStrategy;
  if (Array.isArray(leftovers)) {
    textFields.push(["leftoversStrategy", leftovers.join("\n")]);
  }

  const steps = page.steps;
  if (Array.isArray(steps)) {
    for (const step of steps) {
      const s = step as { title?: string; instruction?: string; stepNumber?: number };
      const label = `step${s.stepNumber ?? "?"}:${s.title ?? "untitled"}`;
      textFields.push([label, `${s.title || ""}\n${s.instruction || ""}`]);
    }
  }

  for (const [field, text] of textFields) {
    if (!text.trim()) continue;
    const hits = findTemplateLanguageInText(text);
    for (const hit of hits) {
      issues.push(`${field}: ${hit}`);
    }
  }

  if (issues.length === 0) return null;
  return { slug, catalog, field: issues[0]!.split(":")[0]!, issues };
}

function main(): void {
  const allHits: Hit[] = [];
  let scanned = 0;

  for (const dir of CATALOG_DIRS) {
    const abs = path.join(PUBLIC, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs).filter((f) => f.endsWith(".json"))) {
      scanned += 1;
      const hit = scanPage(path.join(abs, file), dir.split("/")[0]!);
      if (hit) allHits.push(hit);
    }
  }

  if (allHits.length > 0) {
    console.error("[audit:recipe-template-language] FAIL\n");
    for (const hit of allHits.sort((a, b) => a.slug.localeCompare(b.slug))) {
      console.error(`  ${hit.catalog}/${hit.slug}`);
      for (const issue of hit.issues.slice(0, 4)) {
        console.error(`    - ${issue}`);
      }
      if (hit.issues.length > 4) {
        console.error(`    - ... +${hit.issues.length - 4} more`);
      }
    }
    console.error(`\n${allHits.length} recipes with template language (${scanned} scanned)`);
    process.exit(1);
  }

  console.log(`[audit:recipe-template-language] PASS — ${scanned} recipes scanned, 0 template hits`);
}

main();
