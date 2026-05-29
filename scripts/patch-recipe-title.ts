#!/usr/bin/env tsx
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

const slug = process.argv[2];
const title = process.argv[3];
if (!slug || !title) {
  console.error("Usage: tsx scripts/patch-recipe-title.ts <slug> <title>");
  process.exit(1);
}

await initCuratedRecipeStore();
const db = await getSharedLocalDb();
const existing = db
  .prepare(`SELECT title, generate_response_json FROM curated_recipes WHERE slug = ?`)
  .get(slug) as { title: string; generate_response_json: string | null } | undefined;
if (!existing) {
  console.log("not found:", slug);
  process.exit(1);
}

let jsonPatch = existing.generate_response_json;
if (jsonPatch) {
  try {
    const parsed = JSON.parse(jsonPatch) as Record<string, unknown>;
    if (typeof parsed.title === "string") parsed.title = title;
    jsonPatch = JSON.stringify(parsed);
  } catch {
    /* keep original json */
  }
}

db.prepare(
  `UPDATE curated_recipes
   SET title = ?, generate_response_json = ?, updated_at = datetime('now')
   WHERE slug = ?`,
).run(title, jsonPatch, slug);

const row = db.prepare(`SELECT slug, title FROM curated_recipes WHERE slug = ?`).get(slug) as
  | { slug: string; title: string }
  | undefined;
console.log(row ?? "not found");
flushSqliteToDisk();
releaseSqliteTimersForTests();
