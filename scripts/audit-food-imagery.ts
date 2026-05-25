#!/usr/bin/env tsx
import "dotenv/config";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getFoodImageryConfig } from "../server/food-imagery/config.js";
import { runDbMigrations } from "../server/db/migrate.js";
import { getSharedLocalDb } from "../server/sqlite.js";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";

async function main(): Promise<void> {
  const cfg = getFoodImageryConfig();
  console.log("=== Food imagery audit ===");
  console.log("FOOD_IMAGERY_ENABLED env:", process.env.FOOD_IMAGERY_ENABLED ?? "(unset)");
  console.log("OPENAI_API_KEY set:", Boolean(process.env.OPENAI_API_KEY?.trim()));
  console.log("Pipeline enabled:", cfg.enabled);

  await runDbMigrations();
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'food_imagery%'`,
    )
    .all() as { name: string }[];
  console.log("DB tables:", tables.map((t) => t.name).join(", ") || "(none)");

  if (tables.some((t) => t.name === "food_imagery_assets")) {
    const assets = db.prepare(`SELECT COUNT(*) AS c FROM food_imagery_assets`).get() as {
      c: number;
    };
    const jobs = db.prepare(`SELECT COUNT(*) AS c FROM food_imagery_jobs`).get() as { c: number };
    console.log("Assets:", assets.c, "Jobs:", jobs.c);
    const recent = db
      .prepare(
        `SELECT recipe_key, status, last_error FROM food_imagery_jobs ORDER BY created_at DESC LIMIT 5`,
      )
      .all();
    console.log("Recent jobs:", recent);
    const okAssets = db
      .prepare(
        `SELECT recipe_key, public_path FROM food_imagery_assets WHERE status='succeeded' LIMIT 8`,
      )
      .all();
    console.log("Sample assets:", okAssets);
  }

  const genDir = join(process.cwd(), "client/public/images/generated");
  try {
    const files = readdirSync(genDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    console.log(`Generated files (${genDir}):`, files.length, files.slice(0, 5));
  } catch {
    console.log("Generated dir missing");
  }

  const heroes = db
    .prepare(
      `SELECT slug, hero_image,
        CASE WHEN hero_image LIKE '%spoonacular%' THEN 'spoonacular'
             WHEN hero_image LIKE '%/images/explore/%' THEN 'explore-owned'
             WHEN hero_image LIKE '%/images/generated/%' THEN 'generated'
             ELSE 'other' END AS kind
       FROM curated_recipes WHERE status='published' ORDER BY slug LIMIT 20`,
    )
    .all();
  console.log("Curated hero breakdown (sample):", heroes);

  const spoonCount = db
    .prepare(
      `SELECT COUNT(*) AS c FROM curated_recipes WHERE status='published' AND hero_image LIKE '%spoonacular%'`,
    )
    .get() as { c: number };
  console.log("Published curated with Spoonacular hero:", spoonCount.c);

  const owned = db
    .prepare(
      `SELECT slug, hero_image FROM curated_recipes
       WHERE status='published' AND hero_image LIKE '/images/%' LIMIT 15`,
    )
    .all();
  console.log("Owned /images/ heroes in DB:", owned);

  const hallSlugs = [
    "steak-tacos",
    "smash-burgers",
    "chili-garlic-bread",
    "jerk-chicken",
    "bbq-chicken-bowls",
    "chicken-parm",
  ];
  for (const slug of hallSlugs) {
    const row = db
      .prepare(
        `SELECT recipe_id, slug, hero_image, status FROM curated_recipes
         WHERE slug = ? OR recipe_id LIKE ? ORDER BY updated_at DESC LIMIT 1`,
      )
      .get(slug, `%${slug}%`) as
      | { recipe_id: string; slug: string; hero_image: string; status: string }
      | undefined;
    console.log(`Hall ${slug}:`, row ?? "(missing)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
