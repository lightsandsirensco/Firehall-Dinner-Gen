#!/usr/bin/env tsx
/**
 * One-off remediation: republish the on-disk smoothie catalog (index.json +
 * pages/*.json) so heroImage/thumbImage use the canonical .webp path
 * (shared/fuel-catalog/paths.ts's smoothieHeroImagePath), matching what
 * shared/explore-image-paths.ts's slugLockedImagePaths already prefers for
 * kind "smoothie". Both .jpg and .webp exist on disk for every smoothie —
 * this only fixes which one the catalog JSON points at.
 */
import fs from "node:fs";
import path from "node:path";
import {
  listSmoothiePageSlugs,
  readSmoothieRecipePage,
  writeSmoothieRecipePage,
  writeSmoothieCatalogIndex,
} from "../server/fuel-catalog/page-store.js";
import { smoothieHeroImagePath } from "../shared/fuel-catalog/paths.js";

function main(): void {
  const slugs = listSmoothiePageSlugs();
  let fixed = 0;
  const pages = [];
  for (const slug of slugs) {
    const page = readSmoothieRecipePage(slug);
    if (!page) continue;
    const canonical = smoothieHeroImagePath(slug);
    if (page.heroImage !== canonical || page.thumbImage !== canonical) {
      page.heroImage = canonical;
      page.thumbImage = canonical;
      writeSmoothieRecipePage(page);
      fixed++;
    }
    pages.push(page);
  }
  writeSmoothieCatalogIndex(pages);
  console.log(`[fix-smoothie-hero-path-format] republished ${pages.length} page(s), fixed ${fixed} path(s)`);
}

main();
