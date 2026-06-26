-- Protein deals — protein-only sale items per hall
CREATE TABLE IF NOT EXISTS protein_deals (
  id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  protein_type TEXT NOT NULL CHECK (
    protein_type IN ('chicken', 'beef', 'pork', 'sausage', 'turkey', 'fish', 'seafood')
  ),
  protein_cut TEXT,
  price REAL,
  unit TEXT,
  valid_from TEXT,
  valid_to TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (hall_id) REFERENCES halls(hall_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_protein_deals_hall ON protein_deals(hall_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_protein_deals_type ON protein_deals(hall_id, protein_type);

-- Migrate existing protein rows from retailer_deals when present
INSERT OR IGNORE INTO protein_deals (
  id, hall_id, store_name, protein_type, protein_cut, price, unit, valid_from, valid_to, fetched_at
)
SELECT
  id,
  hall_id,
  store_name,
  COALESCE(protein_type, normalized_item),
  NULL,
  price,
  unit,
  valid_from,
  valid_to,
  fetched_at
FROM retailer_deals
WHERE (category = 'protein' OR protein_type IS NOT NULL)
  AND COALESCE(protein_type, normalized_item) IN (
    'chicken', 'beef', 'pork', 'sausage', 'turkey', 'fish', 'seafood'
  );
