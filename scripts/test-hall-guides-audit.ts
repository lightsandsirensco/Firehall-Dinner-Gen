#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { auditHallGuidesCatalog } from "../shared/editorial/hall-guides-audit.js";
import { withGuidePublishingDefaults } from "../shared/editorial/seo-article-build.js";
import { CREW_COOKING_GUIDES } from "../shared/editorial/crew-cooking-guides-data.js";

const articles = EDITORIAL_ARTICLES.map(withGuidePublishingDefaults);
const { summary, audits } = auditHallGuidesCatalog(articles);

// Consolidated and off-topic guides live in retired-guides.ts as 301/410s.
const LIVE_GUIDE_COUNT = 27;
assert.equal(articles.length, LIVE_GUIDE_COUNT);
assert.ok(summary.avgSeo >= 85, `avgSeo ${summary.avgSeo}`);
assert.ok(summary.avgHuman >= 80, `avgHuman ${summary.avgHuman}`);
assert.equal(summary.p0, 0, `expected no P0 guides, got ${summary.p0}`);
assert.equal(summary.p0 + summary.p1 + summary.p2, LIVE_GUIDE_COUNT);
assert.ok(audits.every((a) => a.url.startsWith("/guides/")));
assert.ok(audits.every((a) => a.recipeLinkCount >= 3));

const rewritten = new Set(CREW_COOKING_GUIDES.map((g) => g.slug));
for (const a of audits.filter((row) => rewritten.has(row.slug))) {
  assert.notEqual(a.priority, "P0", `${a.slug} regressed to P0`);
  assert.ok(a.humanWritingScore >= 90, `${a.slug} human score ${a.humanWritingScore}`);
  assert.ok(a.metaDescriptionLength <= 155, `${a.slug} meta description ${a.metaDescriptionLength} chars`);
}
for (const g of CREW_COOKING_GUIDES) {
  assert.ok(g.sources?.length, `${g.slug} must cite sources for its food-safety claims`);
}

console.log("[test-hall-guides-audit] OK", summary);
