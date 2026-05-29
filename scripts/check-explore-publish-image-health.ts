#!/usr/bin/env tsx
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, releaseSqliteTimersForTests } from "../server/sqlite.js";

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  const published = db
    .prepare(
      `SELECT slug, hero_image FROM curated_recipes WHERE status = 'published'`,
    )
    .all() as { slug: string; hero_image: string }[];
  const external = published.filter((r) => /^https?:\/\//i.test(r.hero_image || ""));
  const empty = published.filter((r) => !r.hero_image?.trim());
  console.log({ published: published.length, external: external.length, empty: empty.length });
  releaseSqliteTimersForTests();
}

main();
