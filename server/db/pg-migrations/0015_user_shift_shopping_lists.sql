-- Shift Planner — one consolidated shopping list for the user's current shift.
--
-- One row per user: the list for the shift being planned. Building the list
-- for a new shift replaces the row (no history yet). shift_key ties the list
-- to its source plan in user_shift_plans.
--
-- session_json is the canonical Smart Shopping session (shared/shopping):
-- recipes at each meal's crew size, merged items, checked state, manual
-- items and pantry flags. undo_json holds prior lists (newest first, bounded).
-- pantry_json is the Personal + Hall pantry the list was last matched with,
-- so server-side changes (plan edits, manual items) apply the same pantry.

CREATE TABLE IF NOT EXISTS user_shift_shopping_lists (
  user_id TEXT PRIMARY KEY,
  shift_key TEXT NOT NULL,
  session_json JSONB NOT NULL,
  undo_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  pantry_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, shift_key) REFERENCES user_shift_plans(user_id, shift_key) ON DELETE CASCADE
);
