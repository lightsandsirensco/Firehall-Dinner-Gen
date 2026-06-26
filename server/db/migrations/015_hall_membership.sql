-- Hall membership: extended hall profile, invites, role normalization

ALTER TABLE halls ADD COLUMN station_number TEXT;
ALTER TABLE halls ADD COLUMN department TEXT;
ALTER TABLE halls ADD COLUMN crew_size INTEGER;
ALTER TABLE halls ADD COLUMN shift_names_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE halls ADD COLUMN appliances_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE halls ADD COLUMN join_code TEXT;
ALTER TABLE halls ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'));

UPDATE hall_memberships SET role = 'captain' WHERE role = 'owner';

CREATE TABLE IF NOT EXISTS hall_invites (
  invite_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('link', 'qr', 'code')),
  invite_token TEXT UNIQUE,
  invite_code TEXT,
  created_by_user_id TEXT REFERENCES users(user_id),
  expires_at TEXT NOT NULL,
  max_uses INTEGER,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_invites_hall ON hall_invites(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_invites_token ON hall_invites(invite_token);
CREATE INDEX IF NOT EXISTS idx_hall_invites_code ON hall_invites(invite_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_halls_join_code ON halls(join_code);
