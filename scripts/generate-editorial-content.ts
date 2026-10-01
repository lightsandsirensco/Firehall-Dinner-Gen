#!/usr/bin/env tsx
/**
 * Publish editorial guides from shared source to client/public.
 * Page JSON for guides no longer in the source (retired or renamed) is deleted,
 * because the server serves any page file it finds.
 *
 *   npx tsx scripts/generate-editorial-content.ts
 */
import fs from "node:fs";
import path from "node:path";
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { withGuidePublishingDefaults } from "../shared/editorial/seo-article-build.js";
import { editorialArticleSchema } from "../shared/editorial/content-schema.js";
import { assertRetiredGuideMap } from "../shared/editorial/retired-guides.js";
import {
  EDITORIAL_PAGES_DIR,
  listEditorialSlugs,
  writeEditorialArticle,
  writeEditorialIndex,
} from "../server/editorial/page-store.js";

function main(): void {
  const liveSlugs = new Set(EDITORIAL_ARTICLES.map((a) => a.slug));
  assertRetiredGuideMap(liveSlugs);

  const entries = [];
  for (const raw of EDITORIAL_ARTICLES) {
    const article = withGuidePublishingDefaults(raw);
    editorialArticleSchema.parse(article);
    writeEditorialArticle(article);
    entries.push({
      slug: article.slug,
      title: article.title,
      subtitle: article.subtitle,
      description: article.description,
      topic: article.topic,
      pillar: article.pillar,
      readMinutes: article.readMinutes,
      publishedAt: article.publishedAt,
    });
  }

  const removed = listEditorialSlugs().filter((slug) => !liveSlugs.has(slug));
  for (const slug of removed) fs.unlinkSync(path.join(EDITORIAL_PAGES_DIR, `${slug}.json`));

  const indexPath = writeEditorialIndex(entries);
  console.log(`[content:generate-guides] ${entries.length} articles → ${indexPath}`);
  if (removed.length) console.log(`[content:generate-guides] removed ${removed.length} stale page(s): ${removed.join(", ")}`);
}

main();
