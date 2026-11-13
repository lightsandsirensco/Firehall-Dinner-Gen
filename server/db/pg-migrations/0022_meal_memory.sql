-- Meal Memory.
--
-- user_recipe_dislikes: "Not for us" — a per-user list of catalog meals that
-- are never auto-picked (Pick Tonight, Shift Planner). Free for every
-- signed-in user. The recipe stays visible in Explore; undo removes the row.
--
-- user_shift_plan_slots.pick_reasons_json: the "why this meal" lines captured
-- when auto-fill picked the slot, so the planner shows the reasons that were
-- true at pick time. Cleared whenever the slot's recipe changes.
--
-- Rollback: server/db/pg-rollbacks/0022_meal_memory.down.sql

CREATE TABLE IF NOT EXISTS user_recipe_dislikes (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recipe_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_slug)
);

ALTER TABLE user_shift_plan_slots ADD COLUMN IF NOT EXISTS pick_reasons_json TEXT;
