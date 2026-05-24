-- Curated Recipe Database v1 — normalized core + child tables
-- Safe to re-run: CREATE IF NOT EXISTS only

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curated_recipes (
  recipe_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'published', 'archived')),

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

  featured INTEGER NOT NULL DEFAULT 0,
  trending_rank INTEGER,
  served_count INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS curated_recipe_ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id TEXT NOT NULL REFERENCES curated_recipes(recipe_id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '',
  original_text TEXT NOT NULL,
  category TEXT
);

CREATE TABLE IF NOT EXISTS curated_recipe_instructions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id TEXT NOT NULL REFERENCES curated_recipes(recipe_id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  heading TEXT,
  body TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS curated_recipe_tags (
  recipe_id TEXT NOT NULL REFERENCES curated_recipes(recipe_id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  tag_kind TEXT NOT NULL DEFAULT 'general'
    CHECK (tag_kind IN ('general', 'diet', 'equipment', 'editorial', 'protein', 'explore_pool')),
  PRIMARY KEY (recipe_id, tag)
);

CREATE TABLE IF NOT EXISTS curated_recipe_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id TEXT NOT NULL REFERENCES curated_recipes(recipe_id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hero', 'card', 'og', 'thumb')),
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  dominant_color TEXT,
  blur_hash TEXT,
  source_attribution TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS curated_recipe_categories (
  recipe_id TEXT NOT NULL REFERENCES curated_recipes(recipe_id) ON DELETE CASCADE,
  category_key TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (recipe_id, category_key)
);
