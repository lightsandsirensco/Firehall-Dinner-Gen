#!/usr/bin/env tsx
import { initCuratedRecipeStore, getCuratedRecipeBySlug } from "../server/curated-recipe-store.js";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";

const slug = process.argv[2];
if (!slug) process.exit(1);
await initCuratedRecipeStore();
const r = getCuratedRecipeBySlug(slug);
if (!r) {
  console.log("not found");
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      slug: r.slug,
      title: r.title,
      summary: r.summary,
      protein: r.protein,
      cuisine: r.cuisine,
      mealFormat: r.mealFormat,
      category: r.category,
      status: r.status,
      ingredients: r.ingredients?.slice(0, 12).map((i) => i.name),
      instructions: r.instructions?.slice(0, 3).map((s) => s.text?.slice(0, 120)),
    },
    null,
    2,
  ),
);
releaseSqliteTimersForTests();
