-- Cloud sync snapshots for authenticated users (hall data, history, profile)

CREATE TABLE IF NOT EXISTS user_data_snapshots (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  data_key TEXT NOT NULL CHECK (data_key IN (
    'hall_favorites',
    'hall_history',
    'wheel_streak',
    'hall_profile'
  )),
  snapshot_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, data_key)
);

CREATE INDEX IF NOT EXISTS idx_user_data_snapshots_user ON user_data_snapshots(user_id);
