-- Local grocery store selection per hall

ALTER TABLE halls ADD COLUMN country TEXT DEFAULT 'CA';

CREATE TABLE IF NOT EXISTS grocery_stores (
  id TEXT PRIMARY KEY,
  banner TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province_state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'CA',
  lat REAL,
  lng REAL,
  supports_deals INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grocery_stores_country_province
  ON grocery_stores(country, province_state);
CREATE INDEX IF NOT EXISTS idx_grocery_stores_banner ON grocery_stores(banner);

CREATE TABLE IF NOT EXISTS hall_grocery_preferences (
  hall_id TEXT PRIMARY KEY REFERENCES halls(hall_id) ON DELETE CASCADE,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'CA',
  max_distance_km REAL NOT NULL DEFAULT 15,
  default_store_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hall_preferred_stores (
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  banner TEXT NOT NULL,
  address TEXT,
  distance_km REAL,
  priority INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (hall_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_hall_preferred_stores_hall
  ON hall_preferred_stores(hall_id, priority);

-- Link deals to stores
ALTER TABLE retailer_deals ADD COLUMN store_id TEXT;

CREATE INDEX IF NOT EXISTS idx_retailer_deals_store ON retailer_deals(hall_id, store_id);

-- Expand provider enum to include demo deals
CREATE TABLE IF NOT EXISTS retailer_deals_v2 (
  id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  store_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('manual', 'demo', 'nofrills', 'foodbasics', 'provider')),
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

INSERT INTO retailer_deals_v2 (
  id, hall_id, store_id, provider, store_name, postal_code, item_name, normalized_item, category,
  protein_type, price, unit, valid_from, valid_to, source_url, image_url, fetched_at
)
SELECT
  id, hall_id, store_id, provider, store_name, postal_code, item_name, normalized_item, category,
  protein_type, price, unit, valid_from, valid_to, source_url, image_url, fetched_at
FROM retailer_deals;

DROP TABLE retailer_deals;
ALTER TABLE retailer_deals_v2 RENAME TO retailer_deals;

CREATE INDEX IF NOT EXISTS idx_retailer_deals_hall ON retailer_deals(hall_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_postal ON retailer_deals(postal_code);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_protein ON retailer_deals(hall_id, protein_type);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_store ON retailer_deals(hall_id, store_id);
