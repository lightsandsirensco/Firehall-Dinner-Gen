-- Rollback for pg-migrations/0022_meal_memory.sql. Run manually, only with approval.
-- Drops every "Not for us" choice and stored shift-plan pick reasons.
BEGIN;
ALTER TABLE user_shift_plan_slots DROP COLUMN IF EXISTS pick_reasons_json;
DROP TABLE IF EXISTS user_recipe_dislikes;
DELETE FROM schema_migrations WHERE version = 22;
COMMIT;
