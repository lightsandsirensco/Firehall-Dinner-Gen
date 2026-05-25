-- AI-generated food imagery — asset cache, jobs, versioning

CREATE TABLE IF NOT EXISTS food_imagery_assets (
  asset_id TEXT PRIMARY KEY,
  recipe_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  public_path TEXT NOT NULL,
  file_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  bytes INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'succeeded'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'rejected')),
  validation_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_food_imagery_recipe_key
  ON food_imagery_assets(recipe_key, version DESC);

CREATE INDEX IF NOT EXISTS idx_food_imagery_prompt_hash
  ON food_imagery_assets(prompt_hash);

CREATE TABLE IF NOT EXISTS food_imagery_jobs (
  job_id TEXT PRIMARY KEY,
  recipe_key TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'rejected')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  asset_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_food_imagery_jobs_status
  ON food_imagery_jobs(status, created_at);
