-- Retailer flyer deals (scraped + manual) with per-postal cache

CREATE TABLE IF NOT EXISTS retailer_deals (
  id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('manual', 'nofrills', 'foodbasics', 'provider')),
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

CREATE INDEX IF NOT EXISTS idx_retailer_deals_hall ON retailer_deals(hall_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_postal ON retailer_deals(postal_code);
CREATE INDEX IF NOT EXISTS idx_retailer_deals_protein ON retailer_deals(hall_id, protein_type);

CREATE TABLE IF NOT EXISTS retailer_deals_cache (
  id TEXT PRIMARY KEY,
  postal_code TEXT NOT NULL,
  provider TEXT NOT NULL,
  store_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  normalized_item TEXT NOT NULL,
  category TEXT NOT NULL,
  protein_type TEXT,
  price REAL,
  unit TEXT,
  valid_from TEXT,
  valid_to TEXT,
  source_url TEXT,
  image_url TEXT,
  fetched_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_retailer_deals_cache_unique
  ON retailer_deals_cache(postal_code, provider, item_name, COALESCE(valid_to, ''));

CREATE INDEX IF NOT EXISTS idx_retailer_deals_cache_lookup
  ON retailer_deals_cache(postal_code, provider, fetched_at DESC);

CREATE TABLE IF NOT EXISTS retailer_deals_provider_status (
  postal_code TEXT NOT NULL,
  provider TEXT NOT NULL,
  last_fetch_at TEXT,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'ok', 'error', 'disabled')),
  error_message TEXT,
  deals_found INTEGER NOT NULL DEFAULT 0,
  protein_matches INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  PRIMARY KEY (postal_code, provider)
);

CREATE TABLE IF NOT EXISTS retailer_deals_fetch_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  postal_code TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  deals_found INTEGER,
  protein_matches INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_retailer_deals_fetch_log_created
  ON retailer_deals_fetch_log(created_at DESC);

-- Migrate existing grocery_deals rows when present
INSERT OR IGNORE INTO retailer_deals (
  id, hall_id, provider, store_name, postal_code, item_name, normalized_item, category,
  protein_type, price, unit, valid_from, valid_to, source_url, image_url, fetched_at
)
SELECT
  deal_id,
  hall_id,
  CASE source WHEN 'manual' THEN 'manual' ELSE 'provider' END,
  store_name,
  postal_code,
  item_name,
  normalized_item,
  category,
  CASE
    WHEN category = 'protein' AND normalized_item IN ('chicken','beef','pork','sausage','fish','turkey')
      THEN normalized_item
    ELSE NULL
  END,
  price,
  unit,
  valid_from,
  valid_to,
  flyer_url,
  NULL,
  fetched_at
FROM grocery_deals
WHERE EXISTS (SELECT 1 FROM grocery_deals LIMIT 1);
