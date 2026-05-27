-- Editorial workflow v2: expand recipe statuses + audit fields
-- SQLite can't ALTER CHECK constraints in-place, so we rebuild curated_recipes.

PRAGMA foreign_keys=OFF;
BEGIN;

CREATE TABLE IF NOT EXISTS curated_recipes_new (
  recipe_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'published', 'rejected', 'archived')),

  title TEXT NOT NULL,
  summary TEXT,

  hero_image TEXT NOT NULL,
  hero_image_alt TEXT NOT NULL DEFAULT '',

  prep_minutes INTEGER NOT NULL DEFAULT 0,
  cook_minutes INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL,
  servings_base INTEGER NOT NULL DEFAULT 4,
  cleanup_difficulty INTEGER NOT NULL DEFAULT 3
    CHECK (cleanup_difficulty BETWEEN 1 AND 5),

  protein TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  category TEXT NOT NULL,
  meal_format TEXT NOT NULL,
  meal_archetype TEXT NOT NULL,
  cooking_style TEXT,

  archetype_family TEXT,
  archetype_variation TEXT,
  quality_breakdown_json TEXT,
  editorial_image_json TEXT,

  comfort_score INTEGER NOT NULL DEFAULT 50,
  healthy_score INTEGER NOT NULL DEFAULT 50,
  firehall_suitability_score INTEGER NOT NULL DEFAULT 50,
  quality_score INTEGER NOT NULL DEFAULT 0,
  appetite_score INTEGER NOT NULL DEFAULT 0,
  trend_score INTEGER NOT NULL DEFAULT 0,

  source_kind TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  source_license TEXT NOT NULL DEFAULT 'aggregator',
  external_id TEXT,

  legacy_catalog_id TEXT,
  generate_response_json TEXT,
  schema_version INTEGER NOT NULL DEFAULT 1,

  -- Editorial workflow fields
  editorial_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  published_at TEXT,

  featured INTEGER NOT NULL DEFAULT 0,
  trending_rank INTEGER,
  served_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO curated_recipes_new (
  recipe_id, slug, status,
  title, summary,
  hero_image, hero_image_alt,
  prep_minutes, cook_minutes, total_minutes, servings_base, cleanup_difficulty,
  protein, cuisine, category, meal_format, meal_archetype, cooking_style,
  archetype_family, archetype_variation, quality_breakdown_json, editorial_image_json,
  comfort_score, healthy_score, firehall_suitability_score, quality_score, appetite_score, trend_score,
  source_kind, source_name, source_url, source_license, external_id,
  legacy_catalog_id, generate_response_json, schema_version,
  featured, trending_rank, served_count,
  created_at, updated_at,
  published_at
)
SELECT
  recipe_id, slug,
  CASE
    WHEN status IN ('draft','review','published','archived') THEN status
    ELSE 'draft'
  END AS status,
  title, summary,
  hero_image, hero_image_alt,
  prep_minutes, cook_minutes, total_minutes, servings_base, cleanup_difficulty,
  protein, cuisine, category, meal_format, meal_archetype, cooking_style,
  archetype_family, archetype_variation, quality_breakdown_json, editorial_image_json,
  comfort_score, healthy_score, firehall_suitability_score, quality_score, appetite_score, trend_score,
  source_kind, source_name, source_url, source_license, external_id,
  legacy_catalog_id, generate_response_json, schema_version,
  featured, trending_rank, served_count,
  created_at, updated_at,
  CASE WHEN status = 'published' THEN updated_at ELSE NULL END AS published_at
FROM curated_recipes;

DROP TABLE curated_recipes;
ALTER TABLE curated_recipes_new RENAME TO curated_recipes;

-- Recreate key indexes (dropped with old table)
CREATE INDEX IF NOT EXISTS idx_curated_recipes_status_quality
  ON curated_recipes(status, quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_published_featured
  ON curated_recipes(status, featured, trending_rank)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_curated_recipes_protein
  ON curated_recipes(protein);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_category
  ON curated_recipes(category);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_meal_archetype
  ON curated_recipes(meal_archetype);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_legacy_catalog
  ON curated_recipes(legacy_catalog_id);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_external
  ON curated_recipes(source_kind, external_id);

COMMIT;
PRAGMA foreign_keys=ON;

