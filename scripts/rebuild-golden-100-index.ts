#!/usr/bin/env tsx
/** Rebuild golden-100/index.json from all page JSON files on disk. */
import {
  listGoldenPageSlugs,
  readGoldenRecipePage,
  writeGoldenCatalogIndex,
} from "../server/golden-100/page-store.js";

const slugs = listGoldenPageSlugs().sort();
const pages = slugs.map((slug) => readGoldenRecipePage(slug)).filter((p) => p != null);
if (pages.length !== slugs.length) {
  console.warn(`[rebuild-golden-100-index] skipped ${slugs.length - pages.length} invalid pages`);
}
const path = writeGoldenCatalogIndex(pages);
console.log(`[rebuild-golden-100-index] ${pages.length} recipes → ${path}`);
