-- Firehall Meals Pro V1 Feature 3 — Meal Memory / Smarter Generator.
--
-- Durable, authoritative record of explicit "Mark as Cooked" events for
-- signed-in Firehall Meals Pro users (see shared/billing/types.ts
-- "meal_memory"). This is intentionally an append-only EVENT LOG, not a
-- one-row-per-recipe table — a user may cook the same recipe again on a
-- different date, and that must create a new row, never overwrite/upsert
-- an existing one.
--
-- Stores only what the product needs: which canonical recipe, and when.
-- No ratings/notes/photos/cost/station/Hall/calendar fields — those are
-- explicitly out of scope for V1 (see feature spec).
--
-- Recipe identity is the canonical catalog slug (shared/hall-catalog/gate.ts
-- isApprovedCatalogSlug) — never a title, Generator signature, or URL — so
-- history stays valid across normal UI navigation and survives catalog
-- reshuffles. No recipe content is duplicated into this table; title/hero
-- image/link are resolved at read time from the canonical catalog and fail
-- gracefully (recipe_slug still visible) if a slug is ever retired.

CREATE TABLE IF NOT EXISTS user_meal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recipe_slug TEXT NOT NULL,
  cooked_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Primary access pattern: "this user's most recent cooked events first."
CREATE INDEX IF NOT EXISTS idx_user_meal_history_user_cooked
  ON user_meal_history(user_id, cooked_at DESC, id DESC);
