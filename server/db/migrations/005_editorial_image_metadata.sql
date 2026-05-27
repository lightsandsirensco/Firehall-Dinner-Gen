-- Editorial imagery metadata + review workflow hooks

ALTER TABLE curated_recipes ADD COLUMN editorial_image_json TEXT;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_editorial_image
  ON curated_recipes (slug)
  WHERE editorial_image_json IS NOT NULL;
