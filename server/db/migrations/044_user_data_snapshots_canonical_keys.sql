-- Widen user_data_snapshots.data_key CHECK constraint to accept the canonical
-- personal-first sync keys (personal_favorites, personal_meal_history,
-- cooking_preferences) alongside the legacy hall_* keys they replace.
--
-- Bug: shared/sync/types.ts (SYNC_SNAPSHOT_KEYS) and the client push path
-- (expandSyncSnapshotsForPush / collectLocalSnapshots) have emitted the
-- canonical keys since the personal-first sync refactor, but this table's
-- CHECK constraint (migration 017) was never updated to match — every
-- authenticated sync push has been failing with a CHECK constraint
-- violation (caught server-side, surfaced to clients as a 500).
--
-- SQLite can't ALTER a CHECK constraint in-place, so we rebuild the table,
-- matching the pattern used in 006_editorial_workflow.sql / 031_canteen_staples.sql.
-- All existing rows (legacy or canonical) are preserved as-is.

PRAGMA foreign_keys=OFF;
BEGIN;

CREATE TABLE user_data_snapshots_new (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  data_key TEXT NOT NULL CHECK (data_key IN (
    'hall_favorites',
    'hall_history',
    'wheel_streak',
    'hall_profile',
    'personal_favorites',
    'personal_meal_history',
    'cooking_preferences'
  )),
  snapshot_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, data_key)
);

INSERT INTO user_data_snapshots_new (user_id, data_key, snapshot_json, updated_at)
SELECT user_id, data_key, snapshot_json, updated_at
FROM user_data_snapshots;

DROP TABLE user_data_snapshots;
ALTER TABLE user_data_snapshots_new RENAME TO user_data_snapshots;

CREATE INDEX IF NOT EXISTS idx_user_data_snapshots_user ON user_data_snapshots(user_id);

COMMIT;
PRAGMA foreign_keys=ON;
