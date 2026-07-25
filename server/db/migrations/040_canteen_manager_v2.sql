-- Canteen Manager V2: staples enrichment, shortage reports, weekly orders, deliveries, suggestions, activity

-- Expand staple inventory fields (nullable for backward compatibility)
ALTER TABLE hall_canteen_items ADD COLUMN preferred_brand TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN package_size TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN par_level REAL;
ALTER TABLE hall_canteen_items ADD COLUMN estimated_qty REAL;
ALTER TABLE hall_canteen_items ADD COLUMN reorder_qty REAL DEFAULT 1;
ALTER TABLE hall_canteen_items ADD COLUMN storage_location TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN preferred_retailer TEXT DEFAULT 'costco';
ALTER TABLE hall_canteen_items ADD COLUMN costco_search_term TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN product_url TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN last_restocked_at TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN recurrence TEXT DEFAULT 'none';
ALTER TABLE hall_canteen_items ADD COLUMN next_review_at TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN is_test INTEGER NOT NULL DEFAULT 0;

-- Recreate table to widen category + status CHECKs while preserving data
CREATE TABLE hall_canteen_items_v2 (
  item_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'coffee_beverages', 'breakfast', 'condiments', 'spices', 'pantry', 'snacks',
    'cleaning', 'paper_products', 'personal_care', 'frozen', 'refrigerated', 'other',
    'coffee_drinks', 'bread', 'staples', 'custom'
  )),
  status TEXT NOT NULL DEFAULT 'good' CHECK (status IN (
    'good', 'running_low', 'out', 'requested', 'ordered', 'delivered', 'being_picked_up'
  )),
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  preferred_brand TEXT,
  package_size TEXT,
  par_level REAL,
  estimated_qty REAL,
  reorder_qty REAL DEFAULT 1,
  storage_location TEXT,
  preferred_retailer TEXT DEFAULT 'costco',
  costco_search_term TEXT,
  product_url TEXT,
  last_restocked_at TEXT,
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN (
    'none', 'always_check_weekly', 'weekly', 'biweekly', 'monthly'
  )),
  next_review_at TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
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

INSERT INTO hall_canteen_items_v2 (
  item_id, hall_id, name, category, status, is_default, sort_order, note,
  preferred_brand, package_size, par_level, estimated_qty, reorder_qty,
  storage_location, preferred_retailer, costco_search_term, product_url,
  last_restocked_at, recurrence, next_review_at, is_test,
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, picked_up_by_user_id, picked_up_at, archived,
  created_at, updated_at
)
SELECT
  item_id, hall_id, name,
  CASE category
    WHEN 'coffee_drinks' THEN 'coffee_beverages'
    WHEN 'bread' THEN 'breakfast'
    WHEN 'staples' THEN 'pantry'
    WHEN 'custom' THEN 'other'
    ELSE category
  END,
  status, is_default, sort_order, note,
  preferred_brand, package_size, par_level, estimated_qty,
  COALESCE(reorder_qty, 1),
  storage_location, preferred_retailer, costco_search_term, product_url,
  last_restocked_at, COALESCE(recurrence, 'none'), next_review_at, COALESCE(is_test, 0),
  submitted_by_shift_id, submitted_by_user_id, last_updated_by_shift_id,
  last_updated_by_user_id, picked_up_by_user_id, picked_up_at, archived,
  created_at, updated_at
FROM hall_canteen_items;

DROP TABLE hall_canteen_items;
ALTER TABLE hall_canteen_items_v2 RENAME TO hall_canteen_items;

CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_hall ON hall_canteen_items(hall_id);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_status ON hall_canteen_items(hall_id, status);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_archived ON hall_canteen_items(hall_id, archived);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_pickup ON hall_canteen_items(hall_id, picked_up_at);
CREATE INDEX IF NOT EXISTS idx_hall_canteen_items_test ON hall_canteen_items(hall_id, is_test);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hall_canteen_items_unique_name
  ON hall_canteen_items(hall_id, lower(name)) WHERE archived = 0;

CREATE TABLE IF NOT EXISTS hall_canteen_shortage_reports (
  report_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES hall_canteen_items(item_id) ON DELETE CASCADE,
  reporter_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('good', 'running_low', 'out')),
  note TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolved_at TEXT,
  resolved_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_shortage_hall ON hall_canteen_shortage_reports(hall_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_canteen_shortage_item ON hall_canteen_shortage_reports(hall_id, item_id, resolved);

CREATE TABLE IF NOT EXISTS hall_canteen_suggestions (
  suggestion_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  note TEXT,
  suggested_by_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TEXT,
  resulting_item_id TEXT REFERENCES hall_canteen_items(item_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_suggestions_hall ON hall_canteen_suggestions(hall_id, status);

CREATE TABLE IF NOT EXISTS hall_canteen_weekly_orders (
  order_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'This Week''s Order',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'being_shopped', 'out_for_delivery', 'delivered', 'cancelled'
  )),
  retailer TEXT NOT NULL DEFAULT 'costco',
  external_order_number TEXT,
  ordered_at TEXT,
  scheduled_delivery_date TEXT,
  scheduled_delivery_window TEXT,
  subtotal_cents INTEGER,
  delivery_fee_cents INTEGER,
  tax_cents INTEGER,
  tip_cents INTEGER,
  total_cents INTEGER,
  purchaser_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  receipt_path TEXT,
  notes TEXT,
  is_test INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_orders_hall ON hall_canteen_weekly_orders(hall_id, status);
CREATE INDEX IF NOT EXISTS idx_canteen_orders_active ON hall_canteen_weekly_orders(hall_id, completed_at);

CREATE TABLE IF NOT EXISTS hall_canteen_order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES hall_canteen_weekly_orders(order_id) ON DELETE CASCADE,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  staple_item_id TEXT REFERENCES hall_canteen_items(item_id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT,
  requested_qty REAL NOT NULL DEFAULT 1,
  package_size TEXT,
  preferred_brand TEXT,
  retailer TEXT DEFAULT 'costco',
  costco_search_term TEXT,
  product_url TEXT,
  notes TEXT,
  estimated_price_cents INTEGER,
  assigned_buyer_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_at TEXT,
  status TEXT NOT NULL DEFAULT 'needed' CHECK (status IN (
    'needed', 'buying_this', 'added_to_costco', 'ordered', 'delivered', 'unavailable', 'substituted'
  )),
  substitute_name TEXT,
  receive_status TEXT CHECK (receive_status IN (
    'pending', 'received_full', 'partial', 'substituted', 'missing', 'damaged'
  )),
  received_qty REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_canteen_order_items_unique_staple
  ON hall_canteen_order_items(order_id, staple_item_id) WHERE staple_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canteen_order_items_order ON hall_canteen_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_canteen_order_items_hall ON hall_canteen_order_items(hall_id);

CREATE TABLE IF NOT EXISTS hall_canteen_manager_notes (
  note_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_by_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_mgr_notes_hall ON hall_canteen_manager_notes(hall_id, archived);

CREATE TABLE IF NOT EXISTS hall_canteen_activity (
  activity_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  summary TEXT NOT NULL,
  meta_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_canteen_activity_hall ON hall_canteen_activity(hall_id, created_at DESC);
