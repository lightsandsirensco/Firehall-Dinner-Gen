/**
 * Recipe catalog — SQLite persistence for real recipes (V2 write-through).
 */

import { log } from "./index";
import type { GenerateRequest, GenerateResponse } from "../shared/schema.js";
import {
  type CanonicalRecipe,
  catalogIdFromSpoonacularId,
  mealFormatToArchetype,
  publisherNameFromSourceUrl,
  inferCleanupDifficulty,
} from "../shared/canonical-recipe.js";
import { scoreAppetiteAppeal } from "../shared/explore-editorial.js";
import { spoonacularImageUrl } from "../shared/explore-recipe.js";
import { getSharedLocalDb, type SqliteDatabase } from "./sqlite.js";

const CATALOG_VERSION = 1;
const MIN_LIST_QUALITY = 30;

let db: SqliteDatabase | null = null;

export async function initRecipeCatalog(): Promise<void> {
  db = await getSharedLocalDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_catalog (
      catalog_id TEXT PRIMARY KEY,
      spoonacular_id INTEGER UNIQUE,
      source_kind TEXT NOT NULL DEFAULT 'spoonacular',
      protein TEXT,
      cuisine TEXT,
      meal_format TEXT,
      meal_archetype TEXT,
      quality_score INTEGER NOT NULL DEFAULT 0,
      appetite_score INTEGER NOT NULL DEFAULT 0,
      hero_image TEXT,
      source_name TEXT,
      source_url TEXT,
      payload_json TEXT NOT NULL,
      served_count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_recipe_catalog_spoonacular ON recipe_catalog(spoonacular_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_catalog_protein ON recipe_catalog(protein);
    CREATE INDEX IF NOT EXISTS idx_recipe_catalog_archetype ON recipe_catalog(meal_archetype);
  `);
  log("Recipe catalog initialized", "catalog");
}

function requireDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Recipe catalog not initialized — call initRecipeCatalog() first");
  }
  return db;
}

export interface V2CatalogWriteInput {
  request: GenerateRequest;
  recipe: GenerateResponse;
  spoonacularId: number;
  originalTitle: string;
  chosenProtein: string;
  sourceUrl: string;
  image?: string;
  cuisines?: string[];
  readyInMinutes?: number;
  servings?: number;
}

function scoreHealthyFromRequest(request: GenerateRequest): number {
  const h = request.healthiness_preference || "balanced";
  if (h === "lighter" || h === "light") return 75;
  if (h === "hearty" || h === "comfort") return 25;
  return 50;
}

function scoreComfortFromArchetype(archetype: string): number {
  if (archetype === "comfort_night" || archetype === "slow_cooker" || archetype === "bbq_night") {
    return 85;
  }
  if (archetype === "healthy_bowl") return 35;
  return 55;
}

function scoreFirehallSuitability(request: GenerateRequest, recipe: GenerateResponse): number {
  let score = 60;
  const crew = request.crew_size || 4;
  if (crew >= 6) score += 10;
  if (crew >= 10) score += 5;
  const total = recipe.timing?.total_minutes ?? 0;
  if (total > 0 && total <= 45) score += 10;
  if (total > 75) score -= 10;
  const format = request.meal_format || "random";
  if (/one_pot|sheet_pan|casserole|slow|stew|soup/i.test(format)) score += 8;
  return Math.min(100, Math.max(0, score));
}

export function buildCanonicalFromV2(input: V2CatalogWriteInput): CanonicalRecipe {
  const {
    request,
    recipe,
    spoonacularId,
    originalTitle,
    chosenProtein,
    sourceUrl,
    image,
    cuisines = [],
    readyInMinutes = 0,
    servings = 4,
  } = input;

  const catalogId = catalogIdFromSpoonacularId(spoonacularId);
  const mealFormat = request.meal_format || "random";
  const mealArchetype = mealFormatToArchetype(mealFormat);
  const cuisine =
    cuisines[0] ||
    (recipe.tags?.cuisine as string | undefined) ||
    request.cuisine_style ||
    "any";
  const heroImage =
    image?.trim() && image.includes("spoonacular.com")
      ? image
      : spoonacularImageUrl(spoonacularId);
  const publisherName = publisherNameFromSourceUrl(sourceUrl);
  const prepMin = recipe.timing?.prep_minutes ?? Math.max(0, Math.floor((readyInMinutes || 0) * 0.35));
  const totalMin = recipe.timing?.total_minutes ?? readyInMinutes ?? 0;
  const stepsCount = recipe.steps?.length ?? 0;

  const appetiteCard = {
    id: spoonacularId,
    title: originalTitle,
    image: heroImage,
    imageAlt: originalTitle,
    readyInMinutes: totalMin,
    servings,
    summary: recipe.why_it_fits_tonight || "",
    sourceUrl,
    cuisines: cuisines.length ? cuisines : [cuisine],
    diets: [],
    _pool: mealArchetype,
  };

  const appetiteScore = scoreAppetiteAppeal(appetiteCard, 0);
  const comfortScore = scoreComfortFromArchetype(mealArchetype);
  const healthyScore = scoreHealthyFromRequest(request);
  const firehallSuitabilityScore = scoreFirehallSuitability(request, recipe);
  const qualityScore = Math.round(
    appetiteScore * 0.35 +
      firehallSuitabilityScore * 0.25 +
      comfortScore * 0.15 +
      healthyScore * 0.1 +
      (totalMin > 0 && totalMin <= 45 ? 15 : 5),
  );

  const now = new Date().toISOString();

  return {
    catalogId,
    spoonacularId,
    title: recipe.title || originalTitle,
    heroImage,
    imageAlt: originalTitle,
    protein: chosenProtein,
    cuisine,
    mealFormat,
    mealArchetype,
    cookingStyle: mealFormat.replace(/_/g, " "),
    prepMinutes: prepMin,
    totalMinutes: totalMin,
    cleanupDifficulty: inferCleanupDifficulty(mealFormat, originalTitle, stepsCount),
    servingsBase: servings,
    tags: [
      chosenProtein,
      cuisine !== "any" ? cuisine : "",
      mealArchetype.replace(/_/g, " "),
    ].filter(Boolean),
    comfortScore,
    healthyScore,
    firehallSuitabilityScore,
    appetiteScore,
    qualityScore,
    source: {
      kind: "spoonacular",
      name: publisherName,
      url: sourceUrl || "",
      license: "aggregator",
    },
    generateResponse: recipe,
    catalogVersion: CATALOG_VERSION,
    servedCount: 1,
    createdAt: now,
    updatedAt: now,
  };
}

export async function upsertCatalogFromV2(input: V2CatalogWriteInput): Promise<CanonicalRecipe> {
  const database = requireDb();
  const canonical = buildCanonicalFromV2(input);
  const payloadJson = JSON.stringify(canonical);

  database
    .prepare(
      `INSERT INTO recipe_catalog (
        catalog_id, spoonacular_id, source_kind, protein, cuisine, meal_format, meal_archetype,
        quality_score, appetite_score, hero_image, source_name, source_url, payload_json,
        served_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(catalog_id) DO UPDATE SET
        protein = excluded.protein,
        cuisine = excluded.cuisine,
        meal_format = excluded.meal_format,
        meal_archetype = excluded.meal_archetype,
        quality_score = excluded.quality_score,
        appetite_score = excluded.appetite_score,
        hero_image = excluded.hero_image,
        source_name = excluded.source_name,
        source_url = excluded.source_url,
        payload_json = excluded.payload_json,
        served_count = recipe_catalog.served_count + 1,
        updated_at = datetime('now')`,
    )
    .run(
      canonical.catalogId,
      canonical.spoonacularId ?? null,
      canonical.source.kind,
      canonical.protein,
      canonical.cuisine,
      canonical.mealFormat,
      canonical.mealArchetype,
      canonical.qualityScore,
      canonical.appetiteScore,
      canonical.heroImage,
      canonical.source.name,
      canonical.source.url,
      payloadJson,
    );

  const row = database
    .prepare("SELECT served_count FROM recipe_catalog WHERE catalog_id = ?")
    .get(canonical.catalogId) as { served_count: number } | undefined;
  const servedCount = row?.served_count ?? 1;

  log(
    `[catalog] write-through id=${canonical.catalogId} title="${canonical.title.slice(0, 50)}" quality=${canonical.qualityScore} served=${servedCount}`,
    "catalog",
  );

  return { ...canonical, servedCount };
}

export function getCatalogBySpoonacularId(spoonacularId: number): CanonicalRecipe | null {
  const database = requireDb();
  const row = database
    .prepare("SELECT payload_json FROM recipe_catalog WHERE spoonacular_id = ?")
    .get(spoonacularId) as { payload_json: string } | undefined;
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json) as CanonicalRecipe;
  } catch {
    return null;
  }
}

export function getCatalogById(catalogId: string): CanonicalRecipe | null {
  const database = requireDb();
  const row = database
    .prepare("SELECT payload_json FROM recipe_catalog WHERE catalog_id = ?")
    .get(catalogId) as { payload_json: string } | undefined;
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json) as CanonicalRecipe;
  } catch {
    return null;
  }
}

/** Load top catalog rows for generate-time ranking (catalog-before-V2). */
export function listCatalogCandidates(limit = 80): CanonicalRecipe[] {
  const database = requireDb();
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const rows = database
    .prepare(
      `SELECT payload_json FROM recipe_catalog
       WHERE quality_score >= ?
       ORDER BY quality_score DESC, appetite_score DESC, served_count DESC
       LIMIT ?`,
    )
    .all(MIN_LIST_QUALITY, safeLimit) as { payload_json: string }[];

  const out: CanonicalRecipe[] = [];
  for (const row of rows) {
    if (!row?.payload_json) continue;
    try {
      const parsed = JSON.parse(row.payload_json) as CanonicalRecipe;
      if (parsed?.catalogId && parsed.generateResponse) out.push(parsed);
    } catch {
      /* skip corrupt row */
    }
  }
  return out;
}
