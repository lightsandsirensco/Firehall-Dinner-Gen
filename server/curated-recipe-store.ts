/**
 * Curated Recipe Database — normalized SQLite persistence.
 */

import { log } from "./logger.js";
import { getSharedLocalDb, type SqliteDatabase } from "./sqlite.js";
import { runDbMigrations } from "./db/migrate.js";
import type {
  CuratedRecipe,
  CuratedRecipeInsert,
  CuratedRecipeListQuery,
  CuratedRecipeSummary,
} from "../shared/curated-recipe/types.js";
import { validateCuratedRecipeInsert } from "../shared/curated-recipe/validation.js";
import {
  scoreEditorialQuality,
  isLowQualityRecipeHost,
} from "../shared/editorial-quality.js";
import { exploreIdFromRecipeId, isSyntheticExploreId } from "../shared/explore-curated-id.js";
import type { CatalogBalanceSnapshot } from "../shared/feed-balance.js";
import { recipeFingerprint, normalizeTitleKey } from "../shared/ingestion/dedupe.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";
import { parseEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { safeJsonParseNullable } from "./lib/safe-json.js";
import { normalizeImagePath } from "../shared/media/normalize-image-path.js";

const GOLDEN_100_SLUGS = new Set(GOLDEN_100_RECIPES.map((r) => r.slug));
import type { IngestRecipeDraft } from "../shared/ingestion/recipe-ingest-schema.js";

let db: SqliteDatabase | null = null;

export async function initCuratedRecipeStore(): Promise<void> {
  await runDbMigrations();
  db = await getSharedLocalDb();
  const { setExpansionDb } = await import("./expansion/db-access.js");
  setExpansionDb(db);
  log("Curated recipe store initialized", "catalog");
}

function requireDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Curated recipe store not initialized — call initCuratedRecipeStore() first");
  }
  return db;
}

function deleteChildRows(database: SqliteDatabase, recipeId: string): void {
  database.prepare("DELETE FROM curated_recipe_ingredients WHERE recipe_id = ?").run(recipeId);
  database.prepare("DELETE FROM curated_recipe_instructions WHERE recipe_id = ?").run(recipeId);
  database.prepare("DELETE FROM curated_recipe_tags WHERE recipe_id = ?").run(recipeId);
  database.prepare("DELETE FROM curated_recipe_images WHERE recipe_id = ?").run(recipeId);
  database.prepare("DELETE FROM curated_recipe_categories WHERE recipe_id = ?").run(recipeId);
}

function insertChildRows(database: SqliteDatabase, input: CuratedRecipeInsert): void {
  const { recipeId } = input;

  for (const ing of input.ingredients) {
    database
      .prepare(
        `INSERT INTO curated_recipe_ingredients
         (recipe_id, position, name, amount, unit, original_text, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        recipeId,
        ing.position,
        ing.name,
        ing.amount,
        ing.unit,
        ing.originalText,
        ing.category ?? null,
      );
  }

  for (const step of input.instructions) {
    database
      .prepare(
        `INSERT INTO curated_recipe_instructions (recipe_id, step_number, heading, body)
         VALUES (?, ?, ?, ?)`,
      )
      .run(recipeId, step.stepNumber, step.heading ?? null, step.body);
  }

  const tagSet = new Set<string>();
  for (const tag of input.tags || []) {
    const t = tag.trim().toLowerCase();
    if (!t || tagSet.has(t)) continue;
    tagSet.add(t);
    database
      .prepare(
        `INSERT OR IGNORE INTO curated_recipe_tags (recipe_id, tag, tag_kind) VALUES (?, ?, 'general')`,
      )
      .run(recipeId, t);
  }

  for (const cat of input.categories || []) {
    const key = cat.trim().toLowerCase();
    if (!key) continue;
    database
      .prepare(
        `INSERT OR REPLACE INTO curated_recipe_categories (recipe_id, category_key, weight)
         VALUES (?, ?, 1)`,
      )
      .run(recipeId, key);
    database
      .prepare(
        `INSERT OR IGNORE INTO curated_recipe_tags (recipe_id, tag, tag_kind)
         VALUES (?, ?, 'explore_pool')`,
      )
      .run(recipeId, key);
  }

  const images = input.images?.length
    ? input.images
    : [{ role: "hero" as const, url: input.heroImage, altText: input.title, position: 0 }];

  for (const img of images) {
    database
      .prepare(
        `INSERT INTO curated_recipe_images
         (recipe_id, role, url, width, height, alt_text, dominant_color, blur_hash, source_attribution, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        recipeId,
        img.role,
        img.url,
        img.width ?? null,
        img.height ?? null,
        img.altText,
        img.dominantColor ?? null,
        img.blurHash ?? null,
        img.sourceAttribution ?? null,
        img.position ?? 0,
      );
  }
}

export function upsertCuratedRecipe(input: CuratedRecipeInsert): CuratedRecipe {
  // Normalize media paths before strict validation. This ensures all stored media
  // paths are either absolute URLs or site-root /images/* paths.
  const editorialNormalized = input.editorialImage
    ? {
        ...input.editorialImage,
        heroImage: normalizeImagePath(input.editorialImage.heroImage),
        thumbnailImage: normalizeImagePath(input.editorialImage.thumbnailImage),
        mobileHeroImage: normalizeImagePath(input.editorialImage.mobileHeroImage),
        ...(typeof input.editorialImage.railPreviewImage === "string"
          ? { railPreviewImage: normalizeImagePath(input.editorialImage.railPreviewImage) }
          : {}),
        ...(typeof input.editorialImage.manualOverridePath === "string"
          ? { manualOverridePath: normalizeImagePath(input.editorialImage.manualOverridePath) }
          : {}),
      }
    : undefined;

  const normalized: CuratedRecipeInsert = {
    ...input,
    heroImage: normalizeImagePath(input.heroImage),
    images: input.images?.map((img) => ({
      ...img,
      url: normalizeImagePath(img.url),
    })),
    editorialImage: editorialNormalized ?? input.editorialImage,
  };

  const validation = validateCuratedRecipeInsert(normalized);
  if (!validation.ok) {
    throw new Error(`Invalid curated recipe: ${validation.errors.join("; ")}`);
  }

  const database = requireDb();
  const data = validation.data;
  const status = data.status ?? "draft";
  const cookMinutes =
    data.cookMinutes ?? Math.max(0, data.totalMinutes - data.prepMinutes);

  const txn = database.transaction(() => {
    database
      .prepare(
        `INSERT INTO curated_recipes (
          recipe_id, slug, status, title, summary, hero_image, hero_image_alt,
          prep_minutes, cook_minutes, total_minutes, servings_base, cleanup_difficulty,
          protein, cuisine, category, meal_format, meal_archetype, cooking_style,
          archetype_family, archetype_variation, quality_breakdown_json, editorial_image_json,
          comfort_score, healthy_score, firehall_suitability_score, quality_score, appetite_score, trend_score,
          source_kind, source_name, source_url, source_license, external_id,
          legacy_catalog_id, generate_response_json, featured, trending_rank, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, datetime('now')
        )
        ON CONFLICT(recipe_id) DO UPDATE SET
          slug = excluded.slug,
          status = excluded.status,
          title = excluded.title,
          summary = excluded.summary,
          hero_image = excluded.hero_image,
          hero_image_alt = excluded.hero_image_alt,
          prep_minutes = excluded.prep_minutes,
          cook_minutes = excluded.cook_minutes,
          total_minutes = excluded.total_minutes,
          servings_base = excluded.servings_base,
          cleanup_difficulty = excluded.cleanup_difficulty,
          protein = excluded.protein,
          cuisine = excluded.cuisine,
          category = excluded.category,
          meal_format = excluded.meal_format,
          meal_archetype = excluded.meal_archetype,
          cooking_style = excluded.cooking_style,
          archetype_family = excluded.archetype_family,
          archetype_variation = excluded.archetype_variation,
          quality_breakdown_json = excluded.quality_breakdown_json,
          editorial_image_json = excluded.editorial_image_json,
          comfort_score = excluded.comfort_score,
          healthy_score = excluded.healthy_score,
          firehall_suitability_score = excluded.firehall_suitability_score,
          quality_score = excluded.quality_score,
          appetite_score = excluded.appetite_score,
          trend_score = excluded.trend_score,
          source_kind = excluded.source_kind,
          source_name = excluded.source_name,
          source_url = excluded.source_url,
          source_license = excluded.source_license,
          external_id = excluded.external_id,
          legacy_catalog_id = excluded.legacy_catalog_id,
          generate_response_json = excluded.generate_response_json,
          featured = excluded.featured,
          trending_rank = excluded.trending_rank,
          updated_at = datetime('now')`,
      )
      .run(
        data.recipeId,
        data.slug,
        status,
        data.title,
        data.summary ?? null,
        data.heroImage,
        data.title,
        data.prepMinutes,
        cookMinutes,
        data.totalMinutes,
        data.servingsBase,
        data.cleanupDifficulty,
        data.protein,
        data.cuisine,
        data.category,
        data.mealFormat,
        data.mealArchetype,
        data.cookingStyle ?? null,
        data.archetypeFamily ?? null,
        data.archetypeVariation ?? null,
        data.qualityBreakdown ? JSON.stringify(data.qualityBreakdown) : null,
        data.editorialImage ? JSON.stringify(data.editorialImage) : null,
        data.scores.comfort,
        data.scores.healthy,
        data.scores.firehallSuitability,
        data.scores.quality,
        data.scores.appetite,
        data.scores.trend ?? 0,
        data.source.kind,
        data.source.name,
        data.source.url,
        data.source.license,
        data.source.externalId ?? null,
        data.legacyCatalogId ?? null,
        data.generateResponse ? JSON.stringify(data.generateResponse) : null,
        data.featured ? 1 : 0,
        data.trendingRank ?? null,
      );

    deleteChildRows(database, data.recipeId);
    insertChildRows(database, data as CuratedRecipeInsert);
  });

  txn();

  const recipe = getCuratedRecipeById(data.recipeId);
  if (!recipe) throw new Error(`Failed to read back curated recipe ${data.recipeId}`);
  log(`[curated-db] upsert id=${data.recipeId} status=${status} quality=${data.scores.quality}`, "catalog");
  return recipe;
}

function parseSpoonacularId(recipeId: string, externalId: unknown): number | null {
  const fromExternal = parseInt(String(externalId || ""), 10);
  if (Number.isFinite(fromExternal) && fromExternal > 0) return fromExternal;
  const m = recipeId.match(/^spoonacular:(\d+)$/i);
  if (m) return parseInt(m[1]!, 10);
  return null;
}

function rowToSummary(row: Record<string, unknown>): CuratedRecipeSummary {
  const recipeId = String(row.recipe_id);
  return {
    recipeId,
    slug: String(row.slug),
    title: String(row.title),
    heroImage: String(row.hero_image),
    protein: String(row.protein),
    cuisine: String(row.cuisine),
    category: String(row.category),
    totalMinutes: Number(row.total_minutes) || 0,
    scores: {
      quality: Number(row.quality_score) || 0,
      firehallSuitability: Number(row.firehall_suitability_score) || 0,
      comfort: Number(row.comfort_score) || 0,
      healthy: Number(row.healthy_score) || 0,
    },
    sourceName: String(row.source_name),
    sourceUrl: String(row.source_url || ""),
    sourceKind: String(row.source_kind || "spoonacular"),
    spoonacularId: parseSpoonacularId(recipeId, row.external_id),
    summary: String(row.summary || ""),
    status: row.status as CuratedRecipeSummary["status"],
    featured: Boolean(row.featured),
  };
}

const LOW_EDITORIAL_SOURCE_NAMES = new Set(
  ["foodista", "pinkwhen", "recipe source", "blogspot", "maplewoodroad", "foodandspice"].map((s) =>
    s.toLowerCase(),
  ),
);

function isAggregatorSourceName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return LOW_EDITORIAL_SOURCE_NAMES.has(n) || n.includes("foodista") || n.includes("pinkwhen");
}

function sortByEditorialPriority(rows: CuratedRecipeSummary[]): CuratedRecipeSummary[] {
  return [...rows]
    .filter((row) => !row.sourceUrl || !isLowQualityRecipeHost(row.sourceUrl))
    .map((row) => {
      let editorial = scoreEditorialQuality({
        title: row.title,
        summary: row.summary,
        heroImage: row.heroImage,
        sourceUrl: row.sourceUrl,
        sourceKind: row.sourceKind,
        protein: row.protein,
        qualityScore: row.scores.quality,
      });
      if (isAggregatorSourceName(row.sourceName)) editorial -= 28;
      if (row.heroImage.includes("spoonacular.com")) editorial -= 12;
      if (GOLDEN_100_SLUGS.has(row.slug)) editorial += 45;
      return { row, editorial };
    })
    .sort((a, b) => {
      const pubA = a.row.sourceKind === "publisher" || a.row.sourceKind === "partner" ? 1 : 0;
      const pubB = b.row.sourceKind === "publisher" || b.row.sourceKind === "partner" ? 1 : 0;
      if (pubB !== pubA) return pubB - pubA;
      const imgA = a.row.heroImage.includes("spoonacular.com") ? 0 : 1;
      const imgB = b.row.heroImage.includes("spoonacular.com") ? 0 : 1;
      if (imgB !== imgA) return imgB - imgA;
      return b.editorial - a.editorial;
    })
    .map((x) => x.row);
}

/** Explore rails — published recipes matching editorial pool tag (publisher-first) */
export function listCuratedForExplorePool(poolTag: string, limit = 12): CuratedRecipeSummary[] {
  const pool = poolTag.toLowerCase();
  const tagged = sortByEditorialPriority(
    listCuratedRecipeSummaries({
      status: "published",
      explorePool: pool,
      minQuality: 35,
      limit: limit * 4,
      orderBy: "publisherFirst",
    }),
  );
  if (tagged.length >= Math.min(3, limit)) return tagged.slice(0, limit);

  return sortByEditorialPriority(
    listCuratedRecipeSummaries({
      status: "published",
      minQuality: 35,
      limit: limit * 6,
      orderBy: "publisherFirst",
    }).filter((row) => {
    const hay = `${row.title} ${row.category} ${row.protein}`.toLowerCase();
    const poolHints: Record<string, RegExp> = {
      trending: /popular|classic|favorite/i,
      bbq: /bbq|grill|smok|rib|brisket/i,
      comfort: /comfort|mac|cheese|meatloaf|pot pie|mashed/i,
      quick: /quick|30|minute|easy|fast/i,
      hearty: /soup|chili|stew|chowder/i,
      healthy: /healthy|salmon|lean|grilled/i,
      chicken: /chicken/i,
      beef: /beef|steak|brisket/i,
      pasta: /pasta|spaghetti|lasagna|ziti/i,
      handheld: /burger|taco|sandwich|wrap/i,
      slow: /slow|crock|pot roast/i,
      one_pot: /one pot|sheet pan|skillet/i,
      bowl: /bowl/i,
      breakfast: /breakfast|pancake|hash/i,
    };
    const re = poolHints[pool];
    return re ? re.test(hay) : true;
    }),
  ).slice(0, limit);
}

export function countPublishedCuratedRecipes(): number {
  return getCuratedStoreStats().published;
}

export function listCuratedRecipeSummaries(query: CuratedRecipeListQuery = {}): CuratedRecipeSummary[] {
  const database = requireDb();
  const limit = Math.min(query.limit ?? 24, 100);
  const offset = query.offset ?? 0;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    conditions.push(`status IN (${statuses.map(() => "?").join(",")})`);
    params.push(...statuses);
  } else {
    conditions.push("status = 'published'");
  }

  if (query.protein) {
    conditions.push("protein = ?");
    params.push(query.protein);
  }
  if (query.category) {
    conditions.push("category = ?");
    params.push(query.category);
  }
  if (query.minQuality != null) {
    conditions.push("quality_score >= ?");
    params.push(query.minQuality);
  }
  if (query.featured) {
    conditions.push("featured = 1");
  }

  let join = "";
  if (query.explorePool) {
    join = " INNER JOIN curated_recipe_categories c ON c.recipe_id = curated_recipes.recipe_id AND c.category_key = ?";
    params.unshift(query.explorePool.toLowerCase());
  }

  const orderBy =
    query.orderBy === "publisherFirst"
      ? `CASE source_kind WHEN 'publisher' THEN 0 WHEN 'partner' THEN 1 WHEN 'hall_classic' THEN 2 ELSE 3 END,
         CASE WHEN hero_image LIKE '%spoonacular.com%' THEN 1 ELSE 0 END,
         quality_score DESC`
      : query.orderBy === "trending"
        ? "CASE WHEN trending_rank IS NULL THEN 1 ELSE 0 END, trending_rank ASC, quality_score DESC"
        : query.orderBy === "served"
          ? "served_count DESC"
          : query.orderBy === "recent"
            ? "updated_at DESC"
            : "quality_score DESC";

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT curated_recipes.*
    FROM curated_recipes
    ${join}
    ${where}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const rows = database.prepare(sql).all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToSummary);
}

export function getCuratedRecipeById(recipeId: string): CuratedRecipe | null {
  const database = requireDb();
  const row = database
    .prepare("SELECT * FROM curated_recipes WHERE recipe_id = ?")
    .get(recipeId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateCuratedRecipe(database, row);
}

export function getCuratedRecipeBySlug(slug: string): CuratedRecipe | null {
  const database = requireDb();
  const row = database
    .prepare("SELECT * FROM curated_recipes WHERE slug = ?")
    .get(slug) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateCuratedRecipe(database, row);
}

/** Lookup by Spoonacular id (Explore cards use numeric Spoonacular ids). */
export function getCuratedRecipeByExploreId(exploreId: number): CuratedRecipe | null {
  if (!isSyntheticExploreId(exploreId)) {
    return getCuratedRecipeBySpoonacularId(exploreId);
  }
  const database = requireDb();
  const rows = database
    .prepare(
      `SELECT recipe_id FROM curated_recipes WHERE status = 'published' AND source_kind IN ('publisher', 'partner', 'hall_classic', 'import')`,
    )
    .all() as { recipe_id: string }[];
  for (const row of rows) {
    if (exploreIdFromRecipeId(row.recipe_id) === exploreId) {
      return getCuratedRecipeById(row.recipe_id);
    }
  }
  return null;
}

export function getCuratedRecipeBySpoonacularId(spoonacularId: number): CuratedRecipe | null {
  if (!spoonacularId || spoonacularId <= 0) return null;
  const database = requireDb();
  const idStr = String(spoonacularId);
  const row = database
    .prepare(
      `SELECT * FROM curated_recipes
       WHERE external_id = ? OR recipe_id = ? OR recipe_id = ?
       LIMIT 1`,
    )
    .get(idStr, idStr, `spoonacular:${idStr}`) as Record<string, unknown> | undefined;
  if (!row) return null;
  return hydrateCuratedRecipe(database, row);
}

function hydrateCuratedRecipe(database: SqliteDatabase, row: Record<string, unknown>): CuratedRecipe {
  const recipeId = String(row.recipe_id);

  const ingredients = database
    .prepare(
      `SELECT position, name, amount, unit, original_text, category
       FROM curated_recipe_ingredients WHERE recipe_id = ? ORDER BY position`,
    )
    .all(recipeId) as Record<string, unknown>[];

  const instructions = database
    .prepare(
      `SELECT step_number, heading, body FROM curated_recipe_instructions
       WHERE recipe_id = ? ORDER BY step_number`,
    )
    .all(recipeId) as Record<string, unknown>[];

  const tags = database
    .prepare(`SELECT tag FROM curated_recipe_tags WHERE recipe_id = ?`)
    .all(recipeId) as { tag: string }[];

  const categories = database
    .prepare(
      `SELECT category_key FROM curated_recipe_categories WHERE recipe_id = ? ORDER BY weight DESC`,
    )
    .all(recipeId) as { category_key: string }[];

  const images = database
    .prepare(
      `SELECT role, url, width, height, alt_text, dominant_color, blur_hash, source_attribution, position
       FROM curated_recipe_images WHERE recipe_id = ? ORDER BY position`,
    )
    .all(recipeId) as Record<string, unknown>[];

  const generateResponse = row.generate_response_json
    ? safeJsonParseNullable<CuratedRecipe["generateResponse"]>(String(row.generate_response_json)) ??
      undefined
    : undefined;

  return {
    recipeId,
    slug: String(row.slug),
    status: row.status as CuratedRecipe["status"],
    title: String(row.title),
    summary: row.summary ? String(row.summary) : undefined,
    heroImage: String(row.hero_image),
    images: images.map((img) => ({
      role: img.role as CuratedRecipe["images"][0]["role"],
      url: String(img.url),
      width: img.width != null ? Number(img.width) : undefined,
      height: img.height != null ? Number(img.height) : undefined,
      altText: String(img.alt_text || ""),
      dominantColor: img.dominant_color ? String(img.dominant_color) : undefined,
      blurHash: img.blur_hash ? String(img.blur_hash) : undefined,
      sourceAttribution: img.source_attribution ? String(img.source_attribution) : undefined,
      position: Number(img.position) || 0,
    })),
    ingredients: ingredients.map((ing) => ({
      position: Number(ing.position),
      name: String(ing.name),
      amount: Number(ing.amount),
      unit: String(ing.unit),
      originalText: String(ing.original_text),
      category: ing.category ? String(ing.category) : undefined,
    })),
    instructions: instructions.map((s) => ({
      stepNumber: Number(s.step_number),
      heading: s.heading ? String(s.heading) : undefined,
      body: String(s.body),
    })),
    prepMinutes: Number(row.prep_minutes),
    cookMinutes: Number(row.cook_minutes),
    totalMinutes: Number(row.total_minutes),
    servingsBase: Number(row.servings_base),
    cleanupDifficulty: Number(row.cleanup_difficulty) as CuratedRecipe["cleanupDifficulty"],
    protein: String(row.protein),
    cuisine: String(row.cuisine),
    category: String(row.category),
    mealFormat: String(row.meal_format),
    mealArchetype: row.meal_archetype as CuratedRecipe["mealArchetype"],
    archetypeFamily: row.archetype_family ? String(row.archetype_family) : undefined,
    archetypeVariation: row.archetype_variation ? String(row.archetype_variation) : undefined,
    qualityBreakdown: row.quality_breakdown_json
      ? (safeJsonParseNullable<CuratedRecipe["qualityBreakdown"]>(
          String(row.quality_breakdown_json),
        ) ?? undefined)
      : undefined,
    cookingStyle: row.cooking_style ? String(row.cooking_style) : undefined,
    editorialImage: row.editorial_image_json
      ? parseEditorialImageMetadata(
          safeJsonParseNullable(String(row.editorial_image_json)),
        ) ?? undefined
      : undefined,
    tags: tags.map((t) => t.tag),
    categories: categories.map((c) => c.category_key),
    scores: {
      comfort: Number(row.comfort_score),
      healthy: Number(row.healthy_score),
      firehallSuitability: Number(row.firehall_suitability_score),
      quality: Number(row.quality_score),
      appetite: Number(row.appetite_score),
      trend: Number(row.trend_score),
    },
    source: {
      kind: row.source_kind as CuratedRecipe["source"]["kind"],
      name: String(row.source_name),
      url: String(row.source_url),
      license: row.source_license as CuratedRecipe["source"]["license"],
      externalId: row.external_id ? String(row.external_id) : undefined,
    },
    generateResponse,
    legacyCatalogId: row.legacy_catalog_id ? String(row.legacy_catalog_id) : undefined,
    featured: Boolean(row.featured),
    trendingRank: row.trending_rank != null ? Number(row.trending_rank) : undefined,
    servedCount: Number(row.served_count) || 0,
    schemaVersion: Number(row.schema_version) || 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function findExistingCuratedForDraft(
  draft: Pick<
    IngestRecipeDraft,
    "title" | "spoonacularId" | "sourceUrl" | "curatedSlug" | "fingerprint"
  >,
): CuratedRecipe | null {
  if (draft.spoonacularId && draft.spoonacularId > 0) {
    const bySpoon = getCuratedRecipeBySpoonacularId(draft.spoonacularId);
    if (bySpoon && bySpoon.status !== "archived") return bySpoon;
  }

  if (draft.curatedSlug) {
    const bySlug = getCuratedRecipeBySlug(draft.curatedSlug);
    if (bySlug && bySlug.status !== "archived") return bySlug;
  }

  const database = requireDb();
  const fp = draft.fingerprint || recipeFingerprint(draft);
  const tagRow = database
    .prepare(
      `SELECT recipe_id FROM curated_recipe_tags WHERE tag = ? LIMIT 1`,
    )
    .get(`fp:${fp}`) as { recipe_id: string } | undefined;
  if (tagRow) {
    const recipe = getCuratedRecipeById(tagRow.recipe_id);
    if (recipe && recipe.status !== "archived") return recipe;
  }

  const titleKey = normalizeTitleKey(draft.title);
  let host = "";
  try {
    if (draft.sourceUrl) host = new URL(draft.sourceUrl).hostname.replace(/^www\./i, "");
  } catch {
    /* ignore */
  }

  const rows = database
    .prepare(
      `SELECT recipe_id, title, source_url FROM curated_recipes WHERE status != 'archived'`,
    )
    .all() as { recipe_id: string; title: string; source_url: string }[];

  for (const row of rows) {
    if (normalizeTitleKey(row.title) !== titleKey) continue;
    if (host) {
      try {
        const rowHost = new URL(row.source_url || "").hostname.replace(/^www\./i, "");
        if (rowHost !== host) continue;
      } catch {
        continue;
      }
    }
    return getCuratedRecipeById(row.recipe_id);
  }

  return null;
}

export function getCatalogBalanceSnapshot(): CatalogBalanceSnapshot {
  const database = requireDb();
  const totalPublished = Number(
    (
      database
        .prepare("SELECT COUNT(*) AS c FROM curated_recipes WHERE status = 'published'")
        .get() as { c: number }
    ).c,
  );

  const byProtein: Record<string, number> = {};
  const byCuisine: Record<string, number> = {};
  const byArchetypeFamily: Record<string, number> = {};
  const byExplorePool: Record<string, number> = {};

  for (const row of database
    .prepare(
      `SELECT protein, COUNT(*) AS c FROM curated_recipes WHERE status = 'published' GROUP BY protein`,
    )
    .all() as { protein: string; c: number }[]) {
    byProtein[row.protein.toLowerCase()] = row.c;
  }

  for (const row of database
    .prepare(
      `SELECT cuisine, COUNT(*) AS c FROM curated_recipes WHERE status = 'published' GROUP BY cuisine`,
    )
    .all() as { cuisine: string; c: number }[]) {
    byCuisine[row.cuisine.toLowerCase()] = row.c;
  }

  for (const row of database
    .prepare(
      `SELECT COALESCE(archetype_family, meal_archetype, 'station_plated') AS af, COUNT(*) AS c
       FROM curated_recipes WHERE status = 'published' GROUP BY af`,
    )
    .all() as { af: string; c: number }[]) {
    byArchetypeFamily[row.af] = row.c;
  }

  for (const row of database
    .prepare(
      `SELECT c.category_key, COUNT(DISTINCT c.recipe_id) AS cnt
       FROM curated_recipe_categories c
       INNER JOIN curated_recipes r ON r.recipe_id = c.recipe_id AND r.status = 'published'
       GROUP BY c.category_key`,
    )
    .all() as { category_key: string; cnt: number }[]) {
    byExplorePool[row.category_key] = row.cnt;
  }

  const spoonRow = database
    .prepare(
      `SELECT COUNT(*) AS c FROM curated_recipes
       WHERE status = 'published' AND hero_image LIKE '%spoonacular.com%'`,
    )
    .get() as { c: number };

  return {
    totalPublished,
    byProtein,
    byCuisine,
    byArchetypeFamily,
    byExplorePool,
    spoonacularImageCount: spoonRow.c,
  };
}

export function getCuratedStoreStats(): {
  total: number;
  published: number;
  draft: number;
  migrationVersion: number;
} {
  const database = requireDb();
  const total = Number(
    (database.prepare("SELECT COUNT(*) AS c FROM curated_recipes").get() as { c: number }).c,
  );
  const published = Number(
    (
      database
        .prepare("SELECT COUNT(*) AS c FROM curated_recipes WHERE status = 'published'")
        .get() as { c: number }
    ).c,
  );
  const draft = Number(
    (
      database
        .prepare("SELECT COUNT(*) AS c FROM curated_recipes WHERE status = 'draft'")
        .get() as { c: number }
    ).c,
  );
  const mig = database
    .prepare("SELECT MAX(version) AS v FROM schema_migrations")
    .get() as { v: number | null };
  return { total, published, draft, migrationVersion: mig?.v ?? 0 };
}

export interface CuratedTagSummary {
  recipeId: string;
  slug: string;
  title: string;
  heroImage: string;
  protein: string;
  quality: number;
  sourceKind: string;
  status: string;
}

/** Published recipes carrying an editorial tag (e.g. golden_100). */
export function listCuratedSummariesByTag(tag: string, limit = 200): CuratedTagSummary[] {
  const database = requireDb();
  const rows = database
    .prepare(
      `SELECT cr.recipe_id, cr.slug, cr.title, cr.hero_image, cr.protein, cr.quality_score, cr.source_kind, cr.status
       FROM curated_recipes cr
       INNER JOIN curated_recipe_tags t ON t.recipe_id = cr.recipe_id AND t.tag = ?
       WHERE cr.status = 'published'
       ORDER BY cr.quality_score DESC
       LIMIT ?`,
    )
    .all(tag, limit) as Record<string, unknown>[];

  return rows.map((row) => ({
    recipeId: String(row.recipe_id),
    slug: String(row.slug),
    title: String(row.title),
    heroImage: String(row.hero_image),
    protein: String(row.protein),
    quality: Number(row.quality_score) || 0,
    sourceKind: String(row.source_kind),
    status: String(row.status),
  }));
}
