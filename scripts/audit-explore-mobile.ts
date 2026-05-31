#!/usr/bin/env tsx
/**
 * Static audit — Explore mobile stability rules (pagination, thumbs, no hero grid).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { exploreCardImageCandidates, EXPLORE_CATALOG_PAGE_SIZE } from "../client/src/lib/explore-card-image.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";

const browserSrc = fs.readFileSync(
  path.join(process.cwd(), "client", "src", "components", "explore-catalog-browser.tsx"),
  "utf8",
);

assert.equal(EXPLORE_CATALOG_PAGE_SIZE, 24, "page size must be 24");
assert.match(browserSrc, /EXPLORE_CATALOG_PAGE_SIZE/, "uses page size constant");
assert.match(browserSrc, /explore-catalog-load-more/, "Load More button present");
assert.match(browserSrc, /exploreCardImageCandidates/, "uses thumb candidate helper");
assert.match(browserSrc, /loading="lazy"/, "lazy loads card images");
assert.match(browserSrc, /decoding="async"/, "async image decode");
assert.doesNotMatch(browserSrc, /entry\.heroImage/, "grid must not use heroImage");
assert.doesNotMatch(browserSrc, /cinematicGrade/, "no cinematic grade on grid");
assert.doesNotMatch(browserSrc, /framer-motion/, "no framer-motion on explore grid");

const catalog = buildApprovedCatalog();
assert.ok(catalog.recipes.length >= 20, `catalog has recipes (${catalog.recipes.length})`);

let heroInGrid = 0;
for (const entry of catalog.recipes.slice(0, 40)) {
  const candidates = exploreCardImageCandidates(entry);
  assert.ok(candidates.length >= 1, `thumb candidates for ${entry.slug}`);
  for (const src of candidates) {
    assert.notEqual(src, entry.heroImage, `${entry.slug} card candidate must not be hero`);
    if (src.includes("/golden-100/")) heroInGrid++;
  }
}

assert.equal(heroInGrid, 0, "no golden-100 hero paths in card candidates sample");

console.log(
  `[audit-explore-mobile] OK — ${catalog.recipes.length} recipes, page size ${EXPLORE_CATALOG_PAGE_SIZE}`,
);
