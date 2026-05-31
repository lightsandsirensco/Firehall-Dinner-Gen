#!/usr/bin/env tsx
/**   npm run import:bbq-batch-25-heroes */
import fs from "node:fs";
import path from "node:path";
import { BATCH_25_BBQ_RECIPES } from "../shared/bbq-expansion/batch-25-bbq-recipes.js";
import { writeBbqCatalogImageVariants } from "../server/imagery/variants.js";
import { bbqCatalogHeroPath } from "../shared/bbq-catalog/slug-registry.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const STAGING = path.join(PUBLIC, "images", "_staging", "bbq-batch-25");

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  let ok = 0;
  let fail = 0;
  for (const recipe of BATCH_25_BBQ_RECIPES) {
    const slug = recipe.manifest.slug;
    const heroPath = bbqCatalogHeroPath(slug);
    if (!force && imageFileExists(heroPath, PUBLIC)) {
      console.log(`  ○ ${slug}`);
      ok++;
      continue;
    }
    const stagingPath = path.join(STAGING, `${slug}.jpg`);
    let buf: Buffer;
    if (fs.existsSync(stagingPath)) {
      buf = fs.readFileSync(stagingPath);
    } else {
      fail++;
      console.warn(`  ✗ ${slug}: missing ${stagingPath}`);
      continue;
    }
    try {
      await writeBbqCatalogImageVariants(slug, buf, 1);
      ok++;
      console.log(`  ✓ ${slug}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n[import:bbq-batch-25-heroes] ok=${ok} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
