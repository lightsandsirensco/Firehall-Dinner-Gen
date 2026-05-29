#!/usr/bin/env tsx
/**
 * Publish editorial guides from shared source to client/public.
 *
 *   npx tsx scripts/generate-editorial-content.ts
 */
import { EDITORIAL_ARTICLES } from "../shared/editorial/articles-data.js";
import { editorialArticleSchema } from "../shared/editorial/content-schema.js";
import {
  writeEditorialArticle,
  writeEditorialIndex,
} from "../server/editorial/page-store.js";

function main(): void {
  const entries = [];
  for (const article of EDITORIAL_ARTICLES) {
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
  const indexPath = writeEditorialIndex(entries);
  console.log(`[content:generate-guides] ${entries.length} articles → ${indexPath}`);
}

main();
