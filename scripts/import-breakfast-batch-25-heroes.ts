#!/usr/bin/env tsx
/**
 * Write mobile/thumb/rail variants from existing batch-25 hero JPEGs.
 *
 *   npm run import:breakfast-batch-25-heroes
 *   npm run import:breakfast-batch-25-heroes -- --force
 */
import fs from "node:fs";
import path from "node:path";
import { BATCH_25_BREAKFAST_PAGES } from "../shared/breakfast-expansion/batch-25-breakfast-pages.js";
import { writeBreakfastCatalogImageVariants } from "../server/imagery/variants.js";
import { breakfastCatalogHeroPath } from "../shared/breakfast-catalog/slug-registry.js";
import { imageFileExists } from "../shared/explore-image-paths.js";

const PUBLIC = path.join(process.cwd(), "client", "public");
const STAGING = path.join(PUBLIC, "images", "_staging", "breakfast-batch-25");

function parseArgs(argv: string[]) {
  return { force: argv.includes("--force") };
}

async function main(): Promise<void> {
  const { force } = parseArgs(process.argv);
  let ok = 0;
  let skip = 0;
  let fail = 0;

  for (const page of BATCH_25_BREAKFAST_PAGES) {
    const heroPath = breakfastCatalogHeroPath(page.slug);
    const stagingPath = path.join(STAGING, `${page.slug}.jpg`);

    if (!force && imageFileExists(heroPath, PUBLIC)) {
      skip++;
      console.log(`  ○ ${page.slug} — hero exists`);
      continue;
    }

    let buf: Buffer;
    if (fs.existsSync(stagingPath)) {
      buf = fs.readFileSync(stagingPath);
    } else if (fs.existsSync(path.join(PUBLIC, heroPath.replace(/^\//, "")))) {
      buf = fs.readFileSync(path.join(PUBLIC, heroPath.replace(/^\//, "")));
    } else {
      fail++;
      console.warn(`  ✗ ${page.slug}: no hero at ${stagingPath}`);
      continue;
    }

    try {
      const paths = await writeBreakfastCatalogImageVariants(page.slug, buf, 1);
      ok++;
      console.log(`  ✓ ${page.slug} → ${paths.hero}`);
    } catch (err: unknown) {
      fail++;
      console.warn(`  ✗ ${page.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n[import:breakfast-batch-25-heroes] ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
