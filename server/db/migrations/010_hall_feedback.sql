-- Hall Feedback (beta) — general community input

CREATE TABLE IF NOT EXISTS hall_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  email TEXT,
  channel TEXT NOT NULL DEFAULT 'general',
  source TEXT NOT NULL DEFAULT 'unknown',
  page_path TEXT,
  session_id TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_feedback_created ON hall_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hall_feedback_channel ON hall_feedback(channel);
