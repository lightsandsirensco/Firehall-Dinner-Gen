-- Firefighter crew recipe ratings (thumbs up/down — not star reviews)

CREATE TABLE IF NOT EXISTS recipe_crew_ratings (
  recipe_slug TEXT PRIMARY KEY,
  thumbs_up_count INTEGER NOT NULL DEFAULT 0,
  thumbs_down_count INTEGER NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  approval_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- Future community expansion (unused in v1 UI)
  cooked_at_hall_count INTEGER NOT NULL DEFAULT 0,
  station_tested_count INTEGER NOT NULL DEFAULT 0,
  unique_cookers_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipe_crew_rating_ballots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_slug TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  fingerprint_hash TEXT NOT NULL,
  session_id TEXT,
  complaint_category TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (recipe_slug, fingerprint_hash),
  FOREIGN KEY (recipe_slug) REFERENCES recipe_crew_ratings(recipe_slug)
);

CREATE INDEX IF NOT EXISTS idx_recipe_crew_ballots_slug ON recipe_crew_rating_ballots(recipe_slug);
CREATE INDEX IF NOT EXISTS idx_recipe_crew_ballots_created ON recipe_crew_rating_ballots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_crew_ratings_approval ON recipe_crew_ratings(approval_score DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_crew_ratings_total ON recipe_crew_ratings(total_votes DESC);
