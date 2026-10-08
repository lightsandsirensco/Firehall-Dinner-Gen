-- Shift Planner v2 — a user's meal plan for one scheduled shift.
--
-- Meal slots are NOT stored; they are generated from the shift by
-- shared/schedule/meal-slots.ts. Only per-slot decisions are persisted,
-- keyed by the stable slot key ("<shift key>|<meal type>|<meal date>").
-- A slot without a row is an empty, unlocked default. Rows for slots that
-- stop being generated (shift edited) are ignored on read.

CREATE TABLE IF NOT EXISTS user_shift_plans (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shift_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shift_key)
);

CREATE TABLE IF NOT EXISTS user_shift_plan_slots (
  user_id TEXT NOT NULL,
  shift_key TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  recipe_slug TEXT,
  selection_source TEXT CHECK (selection_source IN ('auto', 'manual')),
  locked BOOLEAN NOT NULL DEFAULT false,
  skipped BOOLEAN NOT NULL DEFAULT false,
  byo BOOLEAN NOT NULL DEFAULT false,
  crew_size_override INTEGER CHECK (crew_size_override BETWEEN 1 AND 200),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot_key),
  FOREIGN KEY (user_id, shift_key) REFERENCES user_shift_plans(user_id, shift_key) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_shift_plan_slots_plan
  ON user_shift_plan_slots (user_id, shift_key);
