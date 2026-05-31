#!/usr/bin/env tsx
/**
 * Phase 5 Part A — remove consolidated duplicate pages and refresh indexes.
 *
 *   npm run apply:phase5-consolidation
 */
import fs from "node:fs";
import path from "node:path";
import { PHASE5_CONSOLIDATIONS, PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";
import { execSync } from "node:child_process";

const PUBLIC = path.join(process.cwd(), "client", "public", "catalog");
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

function main(): void {
  let removed = 0;
  for (const slug of PHASE5_REMOVED_SLUGS) {
    const deleted = deletePageJson(slug);
    if (deleted) {
      removed++;
      console.log(`  ✓ removed ${deleted}`);
    } else {
      console.log(`  ○ no page JSON for ${slug}`);
    }
  }

  console.log(`\n[apply:phase5-consolidation] removed ${removed} page JSON files`);
  console.log(`Redirects configured: ${PHASE5_CONSOLIDATIONS.length} mappings`);

  console.log("\nRegenerating hall-expansion catalog…");
  execSync("npm run hall-expansion:generate-pages", { stdio: "inherit", cwd: process.cwd() });
  execSync("npm run catalog:generate-hall-index", { stdio: "inherit", cwd: process.cwd() });
}

main();
