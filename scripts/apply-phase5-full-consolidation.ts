#!/usr/bin/env tsx
/**
 * Phase 5 full consolidation — delete loser pages, prune golden manifest, regenerate catalogs.
 *
 *   npx tsx scripts/apply-phase5-full-consolidation.ts
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PHASE5_CONSOLIDATIONS, PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

const PUBLIC = path.join(process.cwd(), "client", "public", "catalog");
const RECIPES_DATA = path.join(process.cwd(), "shared", "golden-100", "recipes-data.ts");
const COLLECTIONS = [
  "golden-100/pages",
  "performance-meals/pages",
  "hall-expansion/pages",
  "breakfast/pages",
  "bbq/pages",
  "pizza-night/pages",
  "smoothies/pages",
];

function deletePageJson(slug: string): string | null {
  for (const dir of COLLECTIONS) {
    const file = path.join(PUBLIC, dir, `${slug}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      return file;
    }
  }
  return null;
}

function pruneGoldenManifest(): number {
  const removed = PHASE5_REMOVED_SLUGS;
  const goldenRemoved = GOLDEN_100_RECIPES.filter((r) => removed.has(r.slug)).map((r) => r.slug);
  if (goldenRemoved.length === 0) return 0;

  let src = fs.readFileSync(RECIPES_DATA, "utf8");
  for (const slug of goldenRemoved) {
    const re = new RegExp(
      `\\n\\s*goldenEntry\\(\\{[^}]*slug:\\s*\"${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\"[\\s\\S]*?\\}\\),?`,
      "g",
    );
    const next = src.replace(re, "\n");
    if (next === src) {
      console.warn(`  ⚠ could not strip goldenEntry for ${slug}`);
    } else {
      src = next;
      console.log(`  ✓ pruned manifest ${slug}`);
    }
  }
  fs.writeFileSync(RECIPES_DATA, src.replace(/\n{3,}/g, "\n\n"));
  return goldenRemoved.length;
}

function main(): void {
  let removed = 0;
  for (const slug of PHASE5_REMOVED_SLUGS) {
    const deleted = deletePageJson(slug);
    if (deleted) {
      removed++;
      console.log(`  ✓ removed page ${deleted}`);
    }
  }
  console.log(`\n[phase5-full] removed ${removed} page JSON files (${PHASE5_CONSOLIDATIONS.length} redirects)`);

  const pruned = pruneGoldenManifest();
  console.log(`[phase5-full] pruned ${pruned} golden manifest entries`);

  const cmds = [
    "npm run catalog:generate-pages",
    "npm run catalog:generate-breakfast",
    "npm run catalog:generate-bbq",
    "npm run hall-expansion:generate-pages",
    "npm run catalog:generate-hall-index",
    "npx tsx scripts/rebuild-golden-100-index.ts",
  ];
  for (const cmd of cmds) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
  }
}

main();
