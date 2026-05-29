#!/usr/bin/env npx tsx
/**
 * Publish smoothie fuel catalog to client/public/catalog/smoothies/
 */
import { SMOOTHIE_CATALOG_COUNT } from "../shared/fuel-catalog/smoothies/manifest.js";
import { buildAllSmoothiePages } from "../server/fuel-catalog/page-builder.js";
import {
  writeSmoothieCatalogIndex,
  writeSmoothieRecipePage,
} from "../server/fuel-catalog/page-store.js";

const pages = buildAllSmoothiePages();
if (pages.length !== SMOOTHIE_CATALOG_COUNT) {
  console.error(`Expected ${SMOOTHIE_CATALOG_COUNT} pages, got ${pages.length}`);
  process.exit(1);
}

for (const page of pages) {
  writeSmoothieRecipePage(page);
}
writeSmoothieCatalogIndex(pages);
console.log(`[fuel:smoothies] Published ${pages.length} smoothie pages`);
