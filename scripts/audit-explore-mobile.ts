#!/usr/bin/env tsx
/**
 * Static audit — Explore mobile stability (pagination, thumbs, lightweight API).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  exploreCardImageCandidates,
  exploreCardThumbSrc,
} from "../client/src/lib/explore-card-image.js";
import {
  EXPLORE_CATALOG_PAGE_SIZE_MOBILE,
  EXPLORE_CATALOG_PAGE_SIZE_DESKTOP,
} from "../client/src/lib/explore-mobile-page-size.js";
import { buildApprovedCatalog } from "../server/approved-catalog.js";
import {
  approvedCatalogRecipePath,
  toApprovedCatalogGridResponse,
} from "../shared/approved-catalog.js";

const browserSrc = fs.readFileSync(
  path.join(process.cwd(), "client", "src", "components", "explore-catalog-browser.tsx"),
  "utf8",
);
const apiSrc = fs.readFileSync(
  path.join(process.cwd(), "client", "src", "lib", "approved-catalog-api.ts"),
  "utf8",
);
const cardImageSrc = fs.readFileSync(
  path.join(process.cwd(), "client", "src", "lib", "explore-card-image.ts"),
  "utf8",
);
const explorePageSrc = fs.readFileSync(
  path.join(process.cwd(), "client", "src", "pages", "explore-discovery-page.tsx"),
  "utf8",
);

assert.equal(EXPLORE_CATALOG_PAGE_SIZE_MOBILE, 24, "mobile page size must be 24");
assert.ok(EXPLORE_CATALOG_PAGE_SIZE_DESKTOP >= 24, "desktop page size >= 24");
assert.match(browserSrc, /exploreCatalogPageSize/, "mobile-aware page size");
assert.match(browserSrc, /useIsMobile/, "uses mobile breakpoint");
assert.match(browserSrc, /explore-catalog-load-more/, "Load More button present");
assert.match(browserSrc, /explore-catalog-filter-open/, "mobile Filter button");
assert.match(browserSrc, /explore-catalog-filter-sheet/, "mobile filter bottom sheet");
assert.match(browserSrc, /explore-catalog-mobile-toolbar/, "compact mobile toolbar");
assert.match(browserSrc, /side="bottom"/, "bottom sheet drawer");
assert.match(browserSrc, /hidden md:block/, "desktop-only inline filters");
assert.match(browserSrc, /md:hidden/, "mobile-only toolbar");
assert.match(browserSrc, /fetchApprovedCatalogGrid/, "grid API (no hero payload)");
assert.match(browserSrc, /ExploreCatalogCardBoundary/, "per-card error boundary");
assert.match(browserSrc, /exploreCardImageCandidates/, "uses thumb candidate helper");
assert.match(browserSrc, /loading="lazy"/, "lazy loads card images");
assert.match(browserSrc, /decoding="async"/, "async image decode");
assert.match(browserSrc, /width=\{EXPLORE_CARD_IMG_WIDTH\}/, "explicit image width");
assert.match(browserSrc, /height=\{EXPLORE_CARD_IMG_HEIGHT\}/, "explicit image height");
assert.doesNotMatch(browserSrc, /entry\.heroImage/, "grid must not use heroImage");
assert.doesNotMatch(browserSrc, /framer-motion/, "no framer-motion on explore grid");
assert.match(browserSrc, /aspect-square/, "mobile thumb aspect ratio");
assert.match(browserSrc, /setTimeout\(\(\) => \{[\s\S]*setSearchQuery/, "search is debounced");
assert.match(
  browserSrc,
  /useMemo\(\(\) => \{[\s\S]*filterApprovedCatalogEntries/,
  "filtering is memoized",
);
assert.match(explorePageSrc, /ExploreErrorBoundary/, "explore page error boundary");
assert.match(browserSrc, /content-visibility:auto/, "content-visibility on grid items");
assert.match(browserSrc, /visibleRecipes\.map/, "renders visible slice only");
assert.match(browserSrc, /setVisibleCount\(\(n\) => n \+ pageSize\)/, "load more increments by page size");
assert.doesNotMatch(cardImageSrc, /\/images\/mobile\//, "card helper must not reference mobile paths");
assert.doesNotMatch(cardImageSrc, /\/images\/rails\//, "card helper must not reference rail paths");
assert.match(apiSrc, /view=grid/, "grid catalog fetch");
assert.match(apiSrc, /\/count/, "lightweight count endpoint");

const catalog = buildApprovedCatalog();
const grid = toApprovedCatalogGridResponse(catalog);
assert.ok(grid.recipes.length >= 20, `catalog has recipes (${grid.recipes.length})`);
assert.ok(
  grid.recipes.every((r) => !("heroImage" in r && (r as { heroImage?: string }).heroImage)),
  "grid payload omits heroImage",
);

const slugs = new Set<string>();
let heroInGrid = 0;
let nonThumb = 0;

for (const entry of catalog.recipes.slice(0, 80)) {
  assert.ok(!slugs.has(entry.slug), `duplicate slug in catalog: ${entry.slug}`);
  slugs.add(entry.slug);

  const route = approvedCatalogRecipePath(entry.slug);
  assert.match(route, /^\/(recipes|breakfast)\//, `${entry.slug} routes to recipe page`);

  assert.ok(
    typeof entry.thumbCacheVersion === "number" && entry.thumbCacheVersion >= 0,
    `${entry.slug} thumbCacheVersion`,
  );

  const thumb = exploreCardThumbSrc(entry);
  assert.match(thumb, /\/images\/thumbs\//, `${entry.slug} thumb path`);
  if (entry.thumbCacheVersion > 0) {
    assert.match(thumb, /\?v=\d+/, `${entry.slug} thumb must cache-bust when file exists`);
  }

  const candidates = exploreCardImageCandidates(entry);
  assert.ok(candidates.length >= 1, `thumb candidates for ${entry.slug}`);
  for (const src of candidates) {
    if (src.includes("/golden-100/") || src.includes("/images/mobile/")) heroInGrid++;
    if (!src.includes("/images/thumbs/")) nonThumb++;
  }
}

assert.equal(heroInGrid, 0, "no hero/mobile paths in card candidates");
assert.equal(nonThumb, 0, "all card candidates use /images/thumbs/");

console.log(
  `[audit-explore-mobile] OK — ${catalog.recipes.length} recipes, mobile page ${EXPLORE_CATALOG_PAGE_SIZE_MOBILE}, desktop ${EXPLORE_CATALOG_PAGE_SIZE_DESKTOP}`,
);
