-- Per-serving nutrition macros for curated recipes (filter + badge support)

ALTER TABLE curated_recipes ADD COLUMN calories_per_serving INTEGER;
ALTER TABLE curated_recipes ADD COLUMN protein_g_per_serving REAL;
ALTER TABLE curated_recipes ADD COLUMN carbs_g_per_serving REAL;
ALTER TABLE curated_recipes ADD COLUMN fat_g_per_serving REAL;
ALTER TABLE curated_recipes ADD COLUMN nutrition_source TEXT;
ALTER TABLE curated_recipes ADD COLUMN nutrition_flags_json TEXT;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_nutrition_filters
  ON curated_recipes(status, calories_per_serving, protein_g_per_serving, fat_g_per_serving)
  WHERE status = 'published';
