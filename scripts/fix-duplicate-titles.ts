#!/usr/bin/env tsx
import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb, flushSqliteToDisk, releaseSqliteTimersForTests } from "../server/sqlite.js";

/** Fix duplicate titles introduced by prior robotic-title pass — slug-aware unique names. */
const TITLE_BY_SLUG: Record<string, string> = {
  "one-pot-chicken-rice": "Garlic Butter Chicken & Rice",
  "sheet-pan-fajitas": "Sizzling Chicken Fajitas",
  "sheet-pan-meal-prep": "Roasted Chicken Meal Prep Plates",
  "one-pot-creamy-cajun-chicken-pasta": "Creamy Cajun Chicken Pasta",
  "skillet-chicken-alfredo": "Skillet Chicken Alfredo",
  "greek-chicken-sheet-pan-dinner-with-green-beans-and-feta": "Lemon Herb Greek Chicken Sheet Dinner",
  "italian-style-baked-chicken-thighs": "Italian Herb Baked Chicken Thighs",
  "street-corn-chicken": "Mexican Street Corn Chicken Bowls",
  "mexican-chicken-rice-bowl": "Smoky Mexican Chicken Rice Bowl",
  "loaded-nacho-skillet": "Game-Night Loaded Nacho Skillet",
  "asian-chicken-noodle-soup": "Ginger Sesame Chicken Noodle Soup",
  "oven-baked-salmon-with-broccoli-sheet-pan": "Lemon Herb Salmon & Broccoli",
  "italian-meatloaf-with-hard-boiled-eggs": "Italian Stuffed Meatloaf",
  "meat-lovers-sheet-pizza": "Meat Lover's Sheet Pan Pizza",
  "bulgogi-bowls": "Korean Bulgogi Rice Bowls",
  "greek-chicken-bowls": "Greek Lemon Chicken Bowls",
};

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();
  for (const [slug, title] of Object.entries(TITLE_BY_SLUG)) {
    const row = db.prepare("SELECT recipe_id, title FROM curated_recipes WHERE slug = ?").get(slug) as
      | { recipe_id: string; title: string }
      | undefined;
    if (!row) continue;
    if (row.title === title) continue;
    db.prepare("UPDATE curated_recipes SET title = ?, updated_at = datetime('now') WHERE recipe_id = ?").run(
      title,
      row.recipe_id,
    );
    console.log(`${slug}: "${row.title}" -> "${title}"`);
  }
  flushSqliteToDisk();
  releaseSqliteTimersForTests();
}

main();
