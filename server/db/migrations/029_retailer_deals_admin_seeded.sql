-- Add admin_seeded provider value

CREATE TABLE IF NOT EXISTS retailer_deals_v3 (
  id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  store_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('manual', 'demo', 'admin_seeded', 'nofrills', 'foodbasics', 'provider')),
  store_name TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  normalized_item TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('protein', 'produce', 'dairy', 'pantry')),
  protein_type TEXT,
  price REAL,
  unit TEXT,
  valid_from TEXT,
  valid_to TEXT,
  source_url TEXT,
  image_url TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO retailer_deals_v3 SELECT * FROM retailer_deals;
DROP TABLE retailer_deals;
ALTER TABLE retailer_deals_v3 RENAME TO retailer_deals;

CREATE INDEX IF NOT EXISTS idx_retailer_deals_hall ON retailer_deals(hall_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_postal ON retailer_deals(postal_code);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_protein ON retailer_deals(hall_id, protein_type);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_store ON retailer_deals(hall_id, store_id);
