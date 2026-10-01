#!/usr/bin/env tsx
/**
 * Guide internal-link validation against the source data (no server needed).
 *
 * For every live guide it checks:
 *   - recipe picks resolve to an approved catalog recipe
 *   - recipe picks do not use a consolidated slug that only redirects
 *   - no recipe is picked twice on the same page
 *   - related guides exist, are live, are not the page itself, not duplicated
 *   - inline /guides/ and /recipes/ links in prose resolve directly
 * and that the retired-guide redirect map has no chains or dead targets.
 *
 *   npx tsx scripts/test-guide-internal-links.ts
 */
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { getCatalogSlugRedirect } from "../shared/catalog-slug-redirects.js";
import { assertRetiredGuideMap, getRetiredGuide } from "../shared/editorial/retired-guides.js";
import { getApprovedCatalog } from "../server/approved-catalog-cache.js";

const recipeSlugs = new Set(getApprovedCatalog().recipes.map((r) => r.slug));
const liveGuides = new Set(EDITORIAL_ARTICLES.map((a) => a.slug));
const problems: string[] = [];

try {
  assertRetiredGuideMap(liveGuides);
} catch (e) {
  problems.push((e as Error).message);
}

function checkGuideSlug(owner: string, slug: string, where: string): void {
  const retired = getRetiredGuide(slug);
  if (retired) {
    problems.push(`${owner}: ${where} links retired guide "${slug}" (use "${retired.target ?? "nothing"}")`);
  } else if (!liveGuides.has(slug)) {
    problems.push(`${owner}: ${where} links nonexistent guide "${slug}"`);
  } else if (slug === owner) {
    problems.push(`${owner}: ${where} links to itself`);
  }
}

function checkRecipeSlug(owner: string, slug: string, where: string): void {
  const redirect = getCatalogSlugRedirect(slug);
  if (redirect) problems.push(`${owner}: ${where} uses consolidated recipe "${slug}" (use "${redirect}")`);
  else if (!recipeSlugs.has(slug)) problems.push(`${owner}: ${where} links nonexistent recipe "${slug}"`);
}

function proseStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => proseStrings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => proseStrings(v, out));
  return out;
}

let recipeLinkCount = 0;
for (const article of EDITORIAL_ARTICLES) {
  const seenRecipes = new Set<string>();
  for (const pick of article.mealRecommendations) {
    recipeLinkCount++;
    if (seenRecipes.has(pick.slug)) problems.push(`${article.slug}: recipe "${pick.slug}" picked twice`);
    seenRecipes.add(pick.slug);
    checkRecipeSlug(article.slug, pick.slug, "recipe pick");
  }

  const related = article.relatedArticleSlugs ?? [];
  if (new Set(related).size !== related.length) problems.push(`${article.slug}: duplicate related guides`);
  for (const slug of related) checkGuideSlug(article.slug, slug, "related guide");

  const { mealRecommendations: _m, relatedArticleSlugs: _r, sources: _s, ...proseFields } = article;
  for (const text of proseStrings(proseFields)) {
    for (const m of text.matchAll(/\/guides\/([a-z0-9-]+)/g)) {
      if (m[1] !== "topic") checkGuideSlug(article.slug, m[1], "inline link");
    }
    for (const m of text.matchAll(/\/recipes\/([a-z0-9-]+)/g)) checkRecipeSlug(article.slug, m[1], "inline link");
  }
}

console.log(
  `[test:guide-links] ${liveGuides.size} live guides, ${recipeLinkCount} recipe picks, ${problems.length} problem(s)`,
);
for (const p of problems) console.log(`  - ${p}`);
if (problems.length) process.exit(1);
