-- Hall analytics — per-hall activity log for Pro insights

CREATE TABLE IF NOT EXISTS hall_activity_events (
  activity_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('meal_cooked', 'vote_created', 'wheel_spin', 'shopping_list_completed')
  ),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  recipe_slug TEXT,
  cuisine TEXT,
  category TEXT,
  shift_label TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hall_id, event_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_hall_activity_hall ON hall_activity_events(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_activity_type ON hall_activity_events(hall_id, event_type);
CREATE INDEX IF NOT EXISTS idx_hall_activity_occurred ON hall_activity_events(hall_id, occurred_at);
