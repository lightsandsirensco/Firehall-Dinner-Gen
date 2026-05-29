#!/usr/bin/env tsx
/**
 * Ensure Golden-100 thumbnail images exist at /images/thumbs/<slug>.jpg
 * by copying existing /images/golden-100/<slug>.jpg when missing.
 *
 * This avoids AI regeneration and satisfies catalog/page validators expecting thumbs.
 */

import fs from "node:fs";
import path from "node:path";

function main(): void {
  const heroesDir = path.join(process.cwd(), "client", "public", "images", "golden-100");
  const thumbsDir = path.join(process.cwd(), "client", "public", "images", "thumbs");
  fs.mkdirSync(thumbsDir, { recursive: true });

  const heroFiles = fs.existsSync(heroesDir)
    ? fs.readdirSync(heroesDir).filter((f) => f.toLowerCase().endsWith(".jpg"))
    : [];

  let made = 0;
  let skipped = 0;

  for (const file of heroFiles) {
    const src = path.join(heroesDir, file);
    const dst = path.join(thumbsDir, file);
    if (fs.existsSync(dst)) {
      skipped++;
      continue;
    }
    fs.copyFileSync(src, dst);
    made++;
  }

  console.log(`[thumb-sync] heroes=${heroFiles.length} made=${made} skipped=${skipped}`);
}

main();

