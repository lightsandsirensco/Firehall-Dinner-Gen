#!/usr/bin/env tsx
/**   npm run import:phase5-distinct-heroes */
import fs from "node:fs";
import path from "node:path";
import { PHASE5_DISTINCT_RECIPES } from "../shared/hall-expansion/adapted/batch-phase5-distinct.js";
import { writeHallExpansionCatalogImageVariants } from "../server/imagery/variants.js";
import { hallExpansionHeroPath } from "../shared/hall-expansion/recipe-page-paths.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const STAGING = path.join(PUBLIC, "images", "_staging", "phase5-distinct");

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  let ok = 0;
  let fail = 0;
  for (const recipe of PHASE5_DISTINCT_RECIPES) {
    const slug = recipe.slug;
    const heroPath = hallExpansionHeroPath(slug);
    if (!force && imageFileExists(heroPath, PUBLIC)) {
      console.log(`  ○ ${slug}`);
      ok++;
      continue;
    }
    const stagingPath = path.join(STAGING, `${slug}.jpg`);
    if (!fs.existsSync(stagingPath)) {
      fail++;
      console.warn(`  ✗ ${slug}: missing ${stagingPath}`);
      continue;
    }
    try {
      const buf = fs.readFileSync(stagingPath);
      await writeHallExpansionCatalogImageVariants(slug, buf, 1);
      ok++;
      console.log(`  ✓ ${slug}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n[import:phase5-distinct-heroes] ok=${ok} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
