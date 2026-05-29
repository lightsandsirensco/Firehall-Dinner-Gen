#!/usr/bin/env tsx
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { editorialArticleSchema } from "../shared/editorial/content-schema.js";
import { auditEditorialArticleCopy } from "../shared/editorial/editorial-copy-audit.js";
import { validateArticleMealRecommendations } from "../shared/editorial/recommendation-rules.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

const goldenSlugs = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));
let fail = 0;

for (const article of EDITORIAL_ARTICLES) {
  try {
    editorialArticleSchema.parse(article);
  } catch (e) {
    console.error(`  ✗ ${article.slug}: schema`, e);
    fail++;
    continue;
  }

  for (const meal of article.mealRecommendations) {
    if (!goldenSlugs.has(meal.slug)) {
      console.error(`  ✗ ${article.slug}: unknown recipe slug ${meal.slug}`);
      fail++;
    }
  }

  for (const rel of article.relatedArticleSlugs ?? []) {
    if (!EDITORIAL_ARTICLES.some((a) => a.slug === rel)) {
      console.error(`  ✗ ${article.slug}: unknown related article ${rel}`);
      fail++;
    }
  }

  for (const issue of validateArticleMealRecommendations(article)) {
    console.error(`  ✗ ${article.slug}: ${issue.message}`);
    fail++;
  }

  for (const issue of auditEditorialArticleCopy(article)) {
    if (issue.severity === "error") {
      console.error(`  ✗ ${article.slug}: [${issue.code}] ${issue.message}`);
      fail++;
    }
  }
}

console.log(`[content:verify-guides] ${EDITORIAL_ARTICLES.length} articles, ${fail} issues`);
process.exit(fail > 0 ? 1 : 0);
