-- Meal History — idempotency key for device-local history.
--
-- Postgres user_meal_history is the canonical durable record of cooked meals.
-- Devices also keep a local log (firehall_hall_history_v1) whose entries have
-- a stable client-generated id. Storing that id here lets
--   * live Cook Mode / "Made This" writes carry the local entry id, and
--   * POST /api/meal-history/import replay older local entries
-- without ever inserting the same cooked event twice.
--
-- Additive only. Existing rows keep client_entry_id NULL (not constrained).
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS client_entry_id TEXT;
ALTER TABLE user_meal_history ADD COLUMN IF NOT EXISTS source TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_meal_history_client_entry
  ON user_meal_history(user_id, client_entry_id)
  WHERE client_entry_id IS NOT NULL;
