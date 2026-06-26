-- Hall staples pickup claims: prevent duplicate grocery runs

CREATE TABLE hall_canteen_items_new (
  item_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('coffee_drinks', 'bread', 'condiments', 'staples', 'custom')),
  status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'running_low', 'out', 'being_picked_up')),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  submitted_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  submitted_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  last_updated_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  last_updated_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  picked_up_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  picked_up_at TEXT,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO hall_canteen_items_new (
  item_id, hall_id, name, category, status, is_default, sort_order, note,
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, picked_up_by_user_id, picked_up_at, archived, created_at, updated_at
)
SELECT
  item_id, hall_id, name, category, status, is_default, sort_order, note,
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, NULL, NULL, archived, created_at, updated_at
FROM hall_canteen_items;

DROP TABLE hall_canteen_items;
ALTER TABLE hall_canteen_items_new RENAME TO hall_canteen_items;

CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_hall ON hall_canteen_items(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_status ON hall_canteen_items(hall_id, status);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_archived ON hall_canteen_items(hall_id, archived);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_pickup ON hall_canteen_items(hall_id, picked_up_at);
