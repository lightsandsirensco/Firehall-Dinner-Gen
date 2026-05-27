#!/usr/bin/env tsx
/**
 * Stage 5 — scan editorial image paths on disk vs Golden 100 slugs.
 */
import fs from "fs";
import path from "path";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

const ROOT = path.join(process.cwd(), "client", "public", "images");

function exists(sub: string, slug: string): boolean {
  return fs.existsSync(path.join(ROOT, sub, `${slug}.jpg`));
}

function main(): void {
  const missing: string[] = [];
  const partial: string[] = [];

  for (const r of GOLDEN_100_RECIPES) {
    const slug = r.classicSlug || r.slug;
    const hero = exists("golden-100", slug);
    const mobile = exists("mobile", slug);
    const thumb = exists("thumbs", slug);
    const rail = exists("rails", slug);

    if (!hero && !mobile) missing.push(slug);
    else if (!mobile || !thumb || !rail) partial.push(slug);
  }

  console.log("[stage5-scan-images]", {
    total: GOLDEN_100_RECIPES.length,
    missingHeroAndMobile: missing.length,
    partialVariants: partial.length,
  });

  if (missing.length > 0 && process.argv.includes("--strict")) {
    console.error("Missing:", missing.slice(0, 10).join(", "));
    process.exit(1);
  }
}

main();
