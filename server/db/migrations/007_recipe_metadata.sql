-- Curated recipe CMS metadata — denormalized filter columns + JSON document

ALTER TABLE curated_recipes ADD COLUMN metadata_json TEXT;
ALTER TABLE curated_recipes ADD COLUMN difficulty TEXT;
ALTER TABLE curated_recipes ADD COLUMN cook_time_bucket TEXT;
ALTER TABLE curated_recipes ADD COLUMN meal_style TEXT;
ALTER TABLE curated_recipes ADD COLUMN nutrition_category TEXT;
ALTER TABLE curated_recipes ADD COLUMN leftovers_quality TEXT;
ALTER TABLE curated_recipes ADD COLUMN crew_size_bucket TEXT;
ALTER TABLE curated_recipes ADD COLUMN hall_tested TEXT NOT NULL DEFAULT 'not_tested';
ALTER TABLE curated_recipes ADD COLUMN busy_night_suitable INTEGER NOT NULL DEFAULT 0;
ALTER TABLE curated_recipes ADD COLUMN equipment_json TEXT;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_metadata_filters
  ON curated_recipes(status, difficulty, cook_time_bucket, meal_style, nutrition_category);

CREATE INDEX IF NOT EXISTS idx_curated_recipes_hall_tested
  ON curated_recipes(hall_tested)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_curated_recipes_busy_night
  ON curated_recipes(busy_night_suitable)
  WHERE status = 'published' AND busy_night_suitable = 1;
