-- Recipe expansion v1 — archetype families, quality breakdown, source dedupe index

ALTER TABLE curated_recipes ADD COLUMN archetype_family TEXT;
ALTER TABLE curated_recipes ADD COLUMN archetype_variation TEXT;
ALTER TABLE curated_recipes ADD COLUMN quality_breakdown_json TEXT;

CREATE INDEX IF NOT EXISTS idx_curated_recipes_archetype_family
  ON curated_recipes(archetype_family)
  WHERE status = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS idx_curated_recipes_source_external_unique
  ON curated_recipes(source_kind, external_id)
  WHERE external_id IS NOT NULL AND external_id != '';
