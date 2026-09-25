-- Firehall Meals Pro V1 Feature 2 — "Foods to Avoid" ingredient preferences.
-- Additive only: existing rows default to '[]' (no avoided ingredients),
-- matching the same convention as dietary_restrictions_json /
-- preferred_proteins_json / appliance_preferences_json.

ALTER TABLE user_preferences ADD COLUMN excluded_ingredients_json TEXT NOT NULL DEFAULT '[]';
