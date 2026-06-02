#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { auditHallGuidesCatalog } from "../shared/editorial/hall-guides-audit.js";
import { withGuidePublishingDefaults } from "../shared/editorial/seo-article-build.js";

const articles = EDITORIAL_ARTICLES.map(withGuidePublishingDefaults);
const { summary, audits } = auditHallGuidesCatalog(articles);

assert.equal(articles.length, 58);
assert.ok(summary.avgSeo >= 80);
assert.ok(summary.avgHuman >= 80);
assert.ok(summary.p0 <= 15, `expected P0 backlog <= 15, got ${summary.p0}`);
assert.ok(summary.p1 >= 5, `expected P1 backlog >= 5, got ${summary.p1}`);
assert.ok(summary.p2 >= 8, `expected at least 8 P2 guides, got ${summary.p2}`);
assert.equal(summary.p0 + summary.p1 + summary.p2, 58);
assert.ok(audits.every((a) => a.url.startsWith("/guides/")));
assert.ok(audits.every((a) => a.recipeLinkCount >= 3));

console.log("[test-hall-guides-audit] OK", summary);
