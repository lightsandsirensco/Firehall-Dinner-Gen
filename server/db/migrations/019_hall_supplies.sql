-- Hall supplies — canteen restock checklist with member shortage reports

CREATE TABLE IF NOT EXISTS hall_supplies (
  supply_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('kitchen', 'cleaning', 'equipment')),
  status TEXT NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'low', 'out', 'purchased')),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  last_updated_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_supplies_hall ON hall_supplies(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_supplies_status ON hall_supplies(hall_id, status);
