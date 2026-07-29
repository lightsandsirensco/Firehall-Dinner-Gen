/**
 * Audit: flag recipe pages where subtitle / shortDescription / whyCrewsLikeIt
 * are exact or near-duplicates of each other, causing the recipe page to
 * visually repeat the same sentence 2-3 times before any real content.
 *
 * Usage: tsx scripts/audit-recipe-copy-duplication.ts
 */

import fs from "node:fs";
import path from "node:path";

const CATALOG_DIRS = [
  "client/public/catalog/golden-100/pages",
  "client/public/catalog/performance-meals/pages",
  "client/public/catalog/hall-expansion/pages",
  "client/public/catalog/pizza-night/pages",
];

type Row = { file: string; slug: string; issue: string };

function norm(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

function main() {
  const rows: Row[] = [];
  let total = 0;

  for (const dir of CATALOG_DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      total++;
      const full = path.join(dir, file);
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(fs.readFileSync(full, "utf8"));
      } catch {
        continue;
      }
      const subtitle = norm(json.subtitle);
      const shortDesc = norm(json.shortDescription);
      const why = norm(json.whyCrewsLikeIt);

      if (subtitle && subtitle === shortDesc && subtitle === why) {
        rows.push({ file: full, slug: String(json.slug), issue: "subtitle === shortDescription === whyCrewsLikeIt (exact triplicate)" });
      } else if (subtitle && subtitle === shortDesc) {
        rows.push({ file: full, slug: String(json.slug), issue: "subtitle === shortDescription" });
      } else if (why && (why === subtitle || why === shortDesc)) {
        rows.push({ file: full, slug: String(json.slug), issue: "whyCrewsLikeIt duplicates subtitle/shortDescription" });
      }
    }
  }

  console.log(`Scanned ${total} recipe pages.`);
  console.log(`Found ${rows.length} with duplicated lead copy.\n`);
  for (const row of rows) {
    console.log(`- ${row.slug}: ${row.issue}`);
  }
}

main();
