-- Shared hall shopping lists — one active grocery run per hall

CREATE TABLE IF NOT EXISTS hall_shopping_lists (
  list_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Hall grocery run',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  runner_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  runner_name TEXT,
  created_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hall_shopping_lists_hall ON hall_shopping_lists(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_shopping_lists_status ON hall_shopping_lists(hall_id, status);

CREATE TABLE IF NOT EXISTS hall_shopping_list_items (
  item_id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES hall_shopping_lists(list_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT 'Other',
  source_kind TEXT NOT NULL DEFAULT 'manual' CHECK (source_kind IN ('manual', 'recipe')),
  recipe_slug TEXT,
  recipe_title TEXT,
  purchased INTEGER NOT NULL DEFAULT 0,
  added_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_shopping_list_items_list ON hall_shopping_list_items(list_id);
