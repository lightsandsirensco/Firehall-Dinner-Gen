#!/usr/bin/env tsx
import fs from "node:fs";
import path from "node:path";

const idxPath = path.join(process.cwd(), "client/public/catalog/breakfast/index.json");
const idx = JSON.parse(fs.readFileSync(idxPath, "utf8")) as {
  recipes: Array<Record<string, unknown>>;
  recipeCount: number;
  generatedAt: string;
};

const slugs = ["shakshuka-for-the-hall", "menemen-for-the-crew", "baked-oatmeal-mixed-berries"];
for (const slug of slugs) {
  const p = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "client/public/catalog/breakfast/pages", `${slug}.json`), "utf8"),
  ) as Record<string, unknown>;
  if (idx.recipes.some((r) => r.slug === slug)) continue;
  idx.recipes.push({
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    filters: p.filters,
    tags: p.tags,
    totalTime: p.totalTime,
    heroImage: p.heroImage,
    thumbImage: p.thumbImage,
    publishedAt: p.publishedAt,
    collectionTier: p.collectionTier ?? "firehall_classic",
  });
}
idx.recipes.sort((a, b) => String(a.title).localeCompare(String(b.title)));
idx.recipeCount = idx.recipes.length;
idx.generatedAt = new Date().toISOString();
fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
console.log(`[patch-breakfast-batch-a-index] ${idx.recipeCount} recipes`);
