-- Shift reminder emails — day-before shift nudge with meal / vote actions

ALTER TABLE user_preferences ADD COLUMN shift_days_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE user_preferences ADD COLUMN shift_reminder_time TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE user_preferences ADD COLUMN shift_reminder_timezone TEXT NOT NULL DEFAULT 'America/New_York';

CREATE TABLE IF NOT EXISTS shift_reminder_sends (
  send_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shift_date TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT (datetime('now')),
  opened_at TEXT,
  last_clicked_action TEXT,
  last_clicked_at TEXT,
  UNIQUE(user_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_shift_reminder_sends_user ON shift_reminder_sends(user_id);
