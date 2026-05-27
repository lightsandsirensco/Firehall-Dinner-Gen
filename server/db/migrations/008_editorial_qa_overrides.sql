-- Editorial QA manual overrides (suppress flags, reviewer notes) — does not modify recipe content

ALTER TABLE curated_recipes ADD COLUMN qa_overrides_json TEXT;
