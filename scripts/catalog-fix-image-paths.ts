#!/usr/bin/env tsx
/**
 * Fix invalid stored image paths in curated DB:
 * - curated_recipes.hero_image
 * - curated_recipe_images.url
 * - curated_recipes.editorial_image_json paths (best-effort)
 *
 * Does NOT invent placeholders; preserves filenames and structure.
 */

import "dotenv/config";
import { initCuratedRecipeStore } from "../server/curated-recipe-store.js";
import { getSharedLocalDb } from "../server/sqlite.js";
import { normalizeImagePath } from "../shared/media/normalize-image-path.js";

type Fix = { table: string; id: string; field: string; before: string; after: string };

function safeNormalize(v: unknown): { before: string; after: string } | null {
  if (typeof v !== "string") return null;
  const before = v;
  const after = normalizeImagePath(before);
  if (!before.trim() || before === after) return null;
  return { before, after };
}

function fixEditorialJson(raw: string): { json: string; fixes: Fix[] } {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fixes: Fix[] = [];
    const fields = [
      "heroImage",
      "thumbnailImage",
      "mobileHeroImage",
      "railPreviewImage",
      "manualOverridePath",
    ] as const;
    for (const field of fields) {
      const norm = safeNormalize(parsed[field]);
      if (!norm) continue;
      parsed[field] = norm.after;
      fixes.push({ table: "curated_recipes", id: "recipe_id", field, before: norm.before, after: norm.after });
    }
    return { json: JSON.stringify(parsed), fixes };
  } catch {
    return { json: raw, fixes: [] };
  }
}

async function main(): Promise<void> {
  await initCuratedRecipeStore();
  const db = await getSharedLocalDb();

  const fixes: Fix[] = [];

  // hero_image
  const recipes = db.prepare("SELECT recipe_id, hero_image, editorial_image_json FROM curated_recipes").all() as Array<{
    recipe_id: string;
    hero_image: string;
    editorial_image_json: string | null;
  }>;

  for (const row of recipes) {
    const norm = safeNormalize(row.hero_image);
    if (norm) {
      db.prepare("UPDATE curated_recipes SET hero_image = ? WHERE recipe_id = ?").run(norm.after, row.recipe_id);
      fixes.push({
        table: "curated_recipes",
        id: row.recipe_id,
        field: "hero_image",
        before: norm.before,
        after: norm.after,
      });
    }

    if (row.editorial_image_json) {
      const out = fixEditorialJson(row.editorial_image_json);
      if (out.json !== row.editorial_image_json) {
        db.prepare("UPDATE curated_recipes SET editorial_image_json = ? WHERE recipe_id = ?").run(
          out.json,
          row.recipe_id,
        );
        for (const f of out.fixes) {
          fixes.push({ ...f, id: row.recipe_id });
        }
      }
    }
  }

  // curated_recipe_images.url
  const images = db.prepare("SELECT recipe_id, role, url FROM curated_recipe_images").all() as Array<{
    recipe_id: string;
    role: string;
    url: string;
  }>;
  for (const img of images) {
    const norm = safeNormalize(img.url);
    if (!norm) continue;
    db.prepare("UPDATE curated_recipe_images SET url = ? WHERE recipe_id = ? AND role = ? AND url = ?").run(
      norm.after,
      img.recipe_id,
      img.role,
      img.url,
    );
    fixes.push({
      table: "curated_recipe_images",
      id: img.recipe_id,
      field: `url(${img.role})`,
      before: norm.before,
      after: norm.after,
    });
  }

  const byField = new Map<string, number>();
  for (const f of fixes) {
    const k = `${f.table}.${f.field}`;
    byField.set(k, (byField.get(k) || 0) + 1);
  }

  console.log(`[catalog:fix-image-paths] fixed ${fixes.length} path(s)`);
  for (const [k, n] of [...byField.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${k}: ${n}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

