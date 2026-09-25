-- Stripe billing plumbing for Firehall Meals Pro (firefighter_plus).
--
-- Adds the columns needed to link a user_subscriptions row to a real Stripe
-- Customer/Subscription, and widens the 'source'/'status' CHECK constraints
-- (SQLite can't ALTER a CHECK constraint in-place, so we rebuild the table —
-- same pattern as 006_editorial_workflow.sql / 044_user_data_snapshots_canonical_keys.sql).
-- All existing rows are preserved as-is; new columns default to NULL/0 for them.
--
-- Also adds a small idempotency table for Stripe webhook delivery — Stripe
-- can and will redeliver the same event, so handlers must be safe to no-op
-- on a repeat event id.
--
-- This migration does NOT enable payments. billing_global_flags.payments_enabled
-- stays 0 until explicitly flipped (see 016_billing.sql / admin billing dashboard).

PRAGMA foreign_keys=OFF;
BEGIN;

CREATE TABLE user_subscriptions_new (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plan_catalog(plan_id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'self_select' CHECK (source IN ('self_select', 'admin_grant', 'stripe')),
  selected_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  current_period_end TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO user_subscriptions_new (
  user_id, plan_id, status, source, selected_at, expires_at, updated_at
)
SELECT user_id, plan_id, status, source, selected_at, expires_at, updated_at
FROM user_subscriptions;

DROP TABLE user_subscriptions;
ALTER TABLE user_subscriptions_new RENAME TO user_subscriptions;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer
  ON user_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_subscription
  ON user_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO billing_global_flags (flag_key, enabled, description) VALUES
  ('payments_enabled', 0, 'Stripe/checkout — off until launch');

COMMIT;
PRAGMA foreign_keys=ON;
