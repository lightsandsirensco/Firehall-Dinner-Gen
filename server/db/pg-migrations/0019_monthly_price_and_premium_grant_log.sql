-- Monthly launch price is $4.99 (shared/billing/pricing.ts); annual stays $39.99.
UPDATE plan_catalog
SET price_label = '$4.99/mo · $39.99/yr'
WHERE plan_id = 'firefighter_plus';

-- Append-only record of admin Premium grants/revokes. No FK to users so the
-- history survives account deletion; previous_json holds the user_subscriptions
-- row the action replaced, so any grant can be reverted exactly.
CREATE TABLE IF NOT EXISTS admin_premium_grant_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  plan_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  reason TEXT,
  actor TEXT NOT NULL,
  actor_ip TEXT,
  previous_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_premium_grant_log_user
  ON admin_premium_grant_log(user_id, created_at DESC);

-- When a Stripe renewal first failed; bounds the past_due grace period
-- (RENEWAL_GRACE_DAYS in shared/billing/types.ts). NULL for every existing row.
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;
