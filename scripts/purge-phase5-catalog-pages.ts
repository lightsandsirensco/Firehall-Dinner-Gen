#!/usr/bin/env tsx
/**
 * Delete consolidated-away catalog page JSON (phase 5 losers).
 *
 *   npx tsx scripts/purge-phase5-catalog-pages.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PHASE5_REMOVED_SLUGS } from "../shared/catalog-consolidation/phase5-redirects.js";

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

let removed = 0;
for (const slug of PHASE5_REMOVED_SLUGS) {
  for (const dir of COLLECTIONS) {
    const file = path.join(PUBLIC, dir, `${slug}.json`);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      removed++;
      console.log(`  ✓ ${file}`);
    }
  }
}
console.log(`\n[purge-phase5] removed ${removed} page files`);
