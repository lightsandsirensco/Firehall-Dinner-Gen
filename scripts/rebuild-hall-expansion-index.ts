#!/usr/bin/env tsx
/** Rebuild hall-expansion/index.json from all page JSON files on disk. */
import {
  listHallExpansionPageSlugs,
  readHallExpansionRecipePage,
  writeHallExpansionCatalogIndex,
} from "../server/hall-expansion/page-store.js";

const slugs = listHallExpansionPageSlugs().sort();
const pages = slugs.map((slug) => readHallExpansionRecipePage(slug)).filter((p) => p != null);
if (pages.length !== slugs.length) {
  console.warn(`[rebuild-hall-expansion-index] skipped ${slugs.length - pages.length} invalid pages`);
}
const path = writeHallExpansionCatalogIndex(pages);
console.log(`[rebuild-hall-expansion-index] ${pages.length} recipes → ${path}`);
