-- Recipe archetypes (families) + parent-child variant relationships
-- Recipe slugs and public URLs are unchanged — families are editorial/SEO grouping.

CREATE TABLE IF NOT EXISTS recipe_archetypes (
  archetype_id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  family_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  tagline TEXT,
  legacy_meal_archetype TEXT NOT NULL,
  metadata_json TEXT,
  base_structure_json TEXT,
  explore_pools_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recipe_archetypes_family_key ON recipe_archetypes(family_key);

ALTER TABLE curated_recipes ADD COLUMN archetype_id TEXT;
ALTER TABLE curated_recipes ADD COLUMN parent_recipe_id TEXT;
ALTER TABLE curated_recipes ADD COLUMN recipe_role TEXT NOT NULL DEFAULT 'standalone';
ALTER TABLE curated_recipes ADD COLUMN variant_key TEXT;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_archetype_id
  ON curated_recipes(archetype_id);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_parent_recipe_id
  ON curated_recipes(parent_recipe_id)
  WHERE parent_recipe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_recipe_role
  ON curated_recipes(recipe_role, archetype_id);
