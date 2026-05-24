-- Indexing for Explore feeds, filters, trending, recommendation prep

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

CREATE INDEX IF NOT EXISTS idx_curated_recipe_ingredients_recipe
  ON curated_recipe_ingredients(recipe_id, position);

CREATE INDEX IF NOT EXISTS idx_curated_recipe_instructions_recipe
  ON curated_recipe_instructions(recipe_id, step_number);

CREATE INDEX IF NOT EXISTS idx_curated_recipe_tags_tag
  ON curated_recipe_tags(tag);

CREATE INDEX IF NOT EXISTS idx_curated_recipe_categories_key
  ON curated_recipe_categories(category_key, weight DESC);
