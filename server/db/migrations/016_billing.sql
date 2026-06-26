-- Monetization architecture: plans, subscriptions, feature flags (no payments yet)

CREATE TABLE IF NOT EXISTS plan_catalog (
  plan_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT 'Free',
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plan_feature_flags (
  plan_id TEXT NOT NULL REFERENCES plan_catalog(plan_id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plan_catalog(plan_id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'self_select' CHECK (source IN ('self_select', 'admin_grant')),
  selected_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);

CREATE TABLE IF NOT EXISTS hall_subscriptions (
  hall_id TEXT PRIMARY KEY REFERENCES halls(hall_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'hall_pro' REFERENCES plan_catalog(plan_id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'admin_grant',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS billing_global_flags (
  flag_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO plan_catalog (plan_id, display_name, tagline, price_label, enabled, sort_order) VALUES
  ('guest', 'Guest', 'Cook tonight — no account needed', 'Free', 1, 0),
  ('personal', 'Personal', 'Your meals, synced across devices', 'Free during preview', 1, 1),
  ('hall_pro', 'Hall Pro', 'Shared hall identity for your crew', 'Coming soon', 1, 2);

INSERT OR IGNORE INTO billing_global_flags (flag_key, enabled, description) VALUES
  ('monetization_enabled', 1, 'Master switch for plan selection UI'),
  ('payments_enabled', 0, 'Stripe/checkout — off until launch');
