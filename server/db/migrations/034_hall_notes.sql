-- Hall Notes — shared grocery messages for linked hall members.

CREATE TABLE IF NOT EXISTS hall_notes (
  note_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hall_notes_hall_created
  ON hall_notes(hall_id, created_at DESC);
