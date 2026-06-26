-- Grocery flyer deals (Hall Pro) + hall postal code for local deals

ALTER TABLE halls ADD COLUMN postal_code TEXT;

CREATE TABLE IF NOT EXISTS grocery_deals (
  deal_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  postal_code TEXT NOT NULL,
  store_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  normalized_item TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('protein', 'produce', 'dairy', 'pantry')),
  price REAL,
  unit TEXT,
  valid_from TEXT,
  valid_to TEXT,
  flyer_url TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'provider'))
);

CREATE INDEX IF NOT EXISTS idx_grocery_deals_hall ON grocery_deals(hall_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_grocery_deals_postal ON grocery_deals(postal_code);
CREATE INDEX IF NOT EXISTS idx_grocery_deals_category ON grocery_deals(hall_id, category);
