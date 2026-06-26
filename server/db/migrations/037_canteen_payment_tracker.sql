-- Hall Pro: Canteen Payment Tracker — monthly dues for hall members

CREATE TABLE IF NOT EXISTS hall_canteen_dues_members (
  enrollment_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'semi_annual', 'annual')),
  next_due_date TEXT NOT NULL,
  last_paid_at TEXT,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  enrolled_by_user_id TEXT,
  UNIQUE(hall_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_canteen_dues_hall ON hall_canteen_dues_members(hall_id);
CREATE INDEX IF NOT EXISTS idx_canteen_dues_due ON hall_canteen_dues_members(hall_id, next_due_date);

CREATE TABLE IF NOT EXISTS hall_canteen_dues_history (
  history_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  marked_by_user_id TEXT NOT NULL,
  due_date_at_payment TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'semi_annual', 'annual'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_dues_history_hall ON hall_canteen_dues_history(hall_id, paid_at DESC);

INSERT OR IGNORE INTO plan_feature_flags (plan_id, feature_key, enabled) VALUES
  ('hall_pro', 'canteen_payment_tracker', 1);
