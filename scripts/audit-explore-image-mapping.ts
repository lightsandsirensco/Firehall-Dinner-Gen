#!/usr/bin/env tsx
/**
 * Explore image-to-recipe identity audit + repair.
 *
 *   npm run audit:explore-image-mapping
 *   npm run repair:explore-image-mapping
 */
import fs from "node:fs";
import path from "node:path";
import { buildAllApprovedCatalogEntries } from "../server/approved-catalog.js";
import { buildCrossCatalogHeroAuditContext } from "../server/cross-catalog-hero-index.js";
import { resolveApprovedCatalogKind } from "../shared/approved-catalog.js";
import {
  auditExploreImageMappings,
  getCanonicalExploreHeroPath,
  syncHeroToThumbIfDrifted,
} from "../shared/explore-image-mapping.js";
import { slugLockedImagePaths } from "../shared/explore-image-paths.js";
import { normalizeCatalogSlug } from "../shared/hall-catalog/gate.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const JSON_OUT = path.join("review", "explore-image-mapping-audit.json");
const MD_OUT = path.join("review", "explore-image-mapping-audit.md");
const FIX = process.argv.includes("--fix");

type CatalogPageRef = {
  file: string;
  slug: string;
  kind: ReturnType<typeof resolveApprovedCatalogKind>;
};

function discoverCatalogPages(): CatalogPageRef[] {
  const roots = [
    ["catalog/golden-100/pages", "firehall_catalog"],
    ["catalog/performance-meals/pages", "performance_meal"],
    ["catalog/hall-expansion/pages", "hall_expansion"],
    ["catalog/breakfast/pages", "breakfast_catalog"],
    ["catalog/smoothies/pages", "smoothie"],
  ] as const;

  const pages: CatalogPageRef[] = [];
  for (const [rel, kind] of roots) {
    const dir = path.join(PUBLIC, rel);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
      const slug = file.replace(/\.json$/, "");
      pages.push({ file: path.join(dir, file), slug, kind });
    }
  }
  return pages;
}

function repairCatalogPages(): { pagesFixed: number; indexesFixed: number; thumbsSynced: number } {
  let pagesFixed = 0;
  let indexesFixed = 0;
  let thumbsSynced = 0;

  for (const page of discoverCatalogPages()) {
    const slug = normalizeCatalogSlug(page.slug);
    const canonical = slugLockedImagePaths(slug, page.kind);
    const raw = JSON.parse(fs.readFileSync(page.file, "utf8")) as Record<string, unknown>;
    let changed = false;

    if (raw.heroImage !== canonical.hero) {
      raw.heroImage = canonical.hero;
      changed = true;
    }
    if (raw.thumbImage !== canonical.thumb) {
      raw.thumbImage = canonical.thumb;
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(page.file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      pagesFixed += 1;
    }

    if (syncHeroToThumbIfDrifted(slug, page.kind, PUBLIC)) {
      thumbsSynced += 1;
    }
  }

  const indexFiles = [
    "catalog/golden-100/index.json",
    "catalog/performance-meals/index.json",
    "catalog/hall-expansion/index.json",
    "catalog/breakfast/index.json",
    "catalog/smoothies/index.json",
  ];

  for (const rel of indexFiles) {
    const file = path.join(PUBLIC, rel);
    if (!fs.existsSync(file)) continue;
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as {
      recipes?: Array<Record<string, unknown>>;
    };
    if (!Array.isArray(raw.recipes)) continue;

    let changed = false;
    for (const recipe of raw.recipes) {
      const slug = normalizeCatalogSlug(String(recipe.slug || ""));
      if (!slug) continue;
      const kind = resolveApprovedCatalogKind(slug, rel.includes("smoothies"));
      const canonical = getCanonicalExploreHeroPath(slug, kind);
      const thumb = slugLockedImagePaths(slug, kind).thumb;

      if (recipe.heroImage !== canonical) {
        recipe.heroImage = canonical;
        changed = true;
      }
      if (recipe.thumbImage !== thumb) {
        recipe.thumbImage = thumb;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(file, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
      indexesFixed += 1;
    }
  }

  return { pagesFixed, indexesFixed, thumbsSynced };
}

function writeMarkdown(report: ReturnType<typeof auditExploreImageMappings>): void {
  const lines = [
    "# Explore Image Mapping Audit",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    "| Metric | Count |",
    "| --- | ---: |",
    `| Total recipes | ${report.totals.recipes} |`,
    `| Correct images | ${report.totals.correct} |`,
    `| Missing images | ${report.totals.missing} |`,
    `| Mismatched paths | ${report.totals.mismatchedPath} |`,
    `| Mismatched identity | ${report.totals.mismatchedIdentity} |`,
    `| Duplicate conflicts | ${report.totals.duplicateConflict} |`,
    `| Explore eligible | ${report.totals.exploreEligible} |`,
    `| Explore excluded | ${report.totals.exploreExcluded} |`,
    `| Duplicate image groups | ${report.totals.duplicateImageGroups} |`,
    "",
    "## Excluded from Explore",
    "",
  ];

  const excluded = report.rows.filter((row) => !row.exploreEligible);
  if (excluded.length === 0) {
    lines.push("_None — all catalog recipes pass slug-locked identity checks._");
  } else {
    lines.push("| Slug | Title | Status | Issue |");
    lines.push("| --- | --- | --- | --- |");
    for (const row of excluded.slice(0, 120)) {
      const issue = row.issues[0]?.message || row.status;
      lines.push(`| \`${row.slug}\` | ${row.title} | ${row.status} | ${issue} |`);
    }
    if (excluded.length > 120) {
      lines.push(`| … | … | … | ${excluded.length - 120} more excluded recipes |`);
    }
  }

  fs.mkdirSync(path.dirname(MD_OUT), { recursive: true });
  fs.writeFileSync(MD_OUT, `${lines.join("\n")}\n`, "utf8");
}

function main(): void {
  if (FIX) {
    const repair = repairCatalogPages();
    console.log(
      `[repair:explore-image-mapping] pages=${repair.pagesFixed} indexes=${repair.indexesFixed} thumbsSynced=${repair.thumbsSynced}`,
    );
  }

  const entries = buildAllApprovedCatalogEntries();
  const crossCatalog = buildCrossCatalogHeroAuditContext(entries, PUBLIC);
  const report = auditExploreImageMappings(entries, PUBLIC, crossCatalog);

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  fs.writeFileSync(JSON_OUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeMarkdown(report);

  console.log("[audit:explore-image-mapping] Summary");
  console.log(`  Total recipes:        ${report.totals.recipes}`);
  console.log(`  Correct images:       ${report.totals.correct}`);
  console.log(`  Missing images:       ${report.totals.missing}`);
  console.log(`  Mismatched paths:     ${report.totals.mismatchedPath}`);
  console.log(`  Mismatched identity:  ${report.totals.mismatchedIdentity}`);
  console.log(`  Duplicate conflicts:  ${report.totals.duplicateConflict}`);
  console.log(`  Explore eligible:     ${report.totals.exploreEligible}`);
  console.log(`  Explore excluded:     ${report.totals.exploreExcluded}`);
  console.log(`  Duplicate groups:     ${report.totals.duplicateImageGroups}`);
  console.log(`  Report: ${JSON_OUT}`);

  const badExamples = [
    "apple-cinnamon-baked-oatmeal",
    "bacon-hash-burritos",
    "applewood-pork-shoulder-steaks",
  ];
  for (const slug of badExamples) {
    const row = report.rows.find((entry) => entry.slug === slug);
    if (!row) continue;
    console.log(
      `  ${slug}: ${row.exploreEligible ? "IN Explore" : "EXCLUDED"} (${row.status})`,
    );
  }

  if (report.totals.exploreExcluded > 0) {
    console.log(
      "\nExplore serves only slug-validated heroes. Excluded recipes remain on detail routes until unique accurate heroes exist.",
    );
  }
}

main();
