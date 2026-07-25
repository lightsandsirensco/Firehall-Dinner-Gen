-- Hall Ops foundation: event engine, board (whiteboard v2), logbook, inventory facets, dues v2 fields

-- ─── Event store (append-only) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hall_events (
  event_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  actor_kind TEXT NOT NULL DEFAULT 'member',
  actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  correlation_id TEXT,
  causation_id TEXT,
  aggregate_type TEXT,
  aggregate_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'hall',
  idempotency_key TEXT
);

CREATE INDEX IF NOT EXISTS idx_hall_events_hall_time
  ON hall_events(hall_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hall_events_type
  ON hall_events(hall_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_hall_events_aggregate
  ON hall_events(hall_id, aggregate_type, aggregate_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hall_events_idempotency
  ON hall_events(hall_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ─── Board (Whiteboard v2 projections) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS hall_board_tonight (
  hall_id TEXT PRIMARY KEY REFERENCES halls(hall_id) ON DELETE CASCADE,
  dinner_title TEXT,
  dinner_slug TEXT,
  status TEXT NOT NULL DEFAULT 'empty'
    CHECK (status IN ('empty', 'voting', 'locked', 'on_hold', 'fed')),
  hold_note TEXT,
  cook_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  runner_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hall_board_pulses (
  pulse_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  pulse_kind TEXT NOT NULL,
  title TEXT NOT NULL,
  href TEXT,
  priority INTEGER NOT NULL DEFAULT 50,
  source_event_id TEXT,
  source_aggregate_type TEXT,
  source_aggregate_id TEXT,
  clears_on TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  cleared_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hall_board_pulses_active
  ON hall_board_pulses(hall_id, cleared_at, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS hall_board_notes (
  note_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  intent TEXT NOT NULL CHECK (intent IN ('broken', 'reminder', 'announcement', 'event')),
  title TEXT NOT NULL,
  body TEXT,
  pinned INTEGER NOT NULL DEFAULT 0,
  pinned_order INTEGER NOT NULL DEFAULT 0,
  event_at TEXT,
  expires_at TEXT,
  author_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  fixed_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_board_notes_active
  ON hall_board_notes(hall_id, archived_at, pinned, expires_at);

-- ─── Logbook ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hall_logbook_entries (
  entry_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  source TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'human')),
  author_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  source_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_hall_logbook_hall_time
  ON hall_logbook_entries(hall_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hall_logbook_reads (
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  last_read_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hall_id, user_id)
);

-- ─── Inventory facets on canteen items ───────────────────────────────────────
ALTER TABLE hall_canteen_items ADD COLUMN ownership TEXT DEFAULT 'canteen';
ALTER TABLE hall_canteen_items ADD COLUMN stock_target REAL;
ALTER TABLE hall_canteen_items ADD COLUMN buying_notes TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN manager_notes TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN known_issues TEXT;
ALTER TABLE hall_canteen_items ADD COLUMN preferred_buyer_user_id TEXT;

CREATE TABLE IF NOT EXISTS hall_inventory_ledger (
  event_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES hall_canteen_items(item_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  qty_delta REAL,
  qty_after REAL,
  status_after TEXT,
  actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  note TEXT,
  hall_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_inventory_ledger_item
  ON hall_inventory_ledger(hall_id, item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hall_inventory_relations (
  relation_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  from_item_id TEXT NOT NULL REFERENCES hall_canteen_items(item_id) ON DELETE CASCADE,
  to_item_id TEXT REFERENCES hall_canteen_items(item_id) ON DELETE CASCADE,
  to_recipe_slug TEXT,
  relation_type TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hall_inventory_relations_from
  ON hall_inventory_relations(hall_id, from_item_id);

-- ─── Dues v2 optional fields ─────────────────────────────────────────────────
ALTER TABLE hall_canteen_dues_members ADD COLUMN amount REAL;
ALTER TABLE hall_canteen_dues_members ADD COLUMN status_override TEXT;
ALTER TABLE hall_canteen_dues_members ADD COLUMN member_notes TEXT;

ALTER TABLE hall_canteen_dues_history ADD COLUMN amount REAL;
ALTER TABLE hall_canteen_dues_history ADD COLUMN method TEXT DEFAULT 'cash';
ALTER TABLE hall_canteen_dues_history ADD COLUMN note TEXT;

CREATE TABLE IF NOT EXISTS hall_dues_settings (
  hall_id TEXT PRIMARY KEY REFERENCES halls(hall_id) ON DELETE CASCADE,
  default_frequency TEXT NOT NULL DEFAULT 'monthly',
  default_amount REAL,
  due_day INTEGER DEFAULT 1,
  grace_days INTEGER DEFAULT 5,
  currency TEXT DEFAULT 'CAD',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
