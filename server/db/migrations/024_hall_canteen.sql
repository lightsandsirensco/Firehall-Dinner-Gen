-- Hall canteen: one shared list per hall, one canteen manager, shift-sourced updates

ALTER TABLE halls ADD COLUMN canteen_manager_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS hall_canteen_items (
  item_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('kitchen', 'cleaning', 'equipment')),
  status TEXT NOT NULL DEFAULT 'good' CHECK (
    status IN ('good', 'running_low', 'out', 'requested', 'purchased', 'restocked')
  ),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  submitted_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  submitted_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  last_updated_by_shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  last_updated_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_hall ON hall_canteen_items(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_status ON hall_canteen_items(hall_id, status);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_archived ON hall_canteen_items(hall_id, archived);

CREATE TABLE IF NOT EXISTS hall_canteen_history (
  history_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL,
  note TEXT,
  shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL,
  shift_name TEXT,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_canteen_history_hall ON hall_canteen_history(hall_id, created_at DESC);

INSERT INTO hall_canteen_items (
  item_id, hall_id, name, category, status, is_default, sort_order,
  last_updated_by_user_id, created_at, updated_at
)
SELECT
  supply_id,
  hall_id,
  name,
  category,
  CASE WHEN status = 'low' THEN 'running_low' ELSE status END,
  is_default,
  sort_order,
  last_updated_by_user_id,
  created_at,
  updated_at
FROM hall_supplies
WHERE NOT EXISTS (SELECT 1 FROM hall_canteen_items LIMIT 1);

DROP TABLE IF EXISTS hall_supplies;
