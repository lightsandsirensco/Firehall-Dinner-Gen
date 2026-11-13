-- Signed-in activity is linked to the account at ingest (server-resolved from
-- the auth cookie, never client-supplied) so a person who signs in on several
-- browsers counts once, and authenticated retention can be measured.
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pg_analytics_events_user
  ON analytics_events (user_id) WHERE user_id IS NOT NULL;

-- Server-side request counts per UTC day, kept separate from client page
-- views: every instance adds its in-memory counts here, so totals survive
-- restarts and are shared across Autoscale instances.
CREATE TABLE IF NOT EXISTS analytics_server_requests (
  day DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('page_human', 'page_bot', 'api', 'asset', 'health', 'other')),
  count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);

-- Durable retry queue for Klaviyo marketing subscriptions that failed inline.
-- The retry worker re-checks user_marketing_consent before every attempt, so
-- an unsubscribe recorded in the meantime always wins.
CREATE TABLE IF NOT EXISTS klaviyo_subscription_queue (
  email TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_klaviyo_subscription_queue_due
  ON klaviyo_subscription_queue (next_attempt_at) WHERE status = 'pending';

-- Launch without the founding discount: annual is $39.99 from the first year.
-- Re-enable from /admin/billing if a founding offer is ever wanted.
UPDATE billing_global_flags SET enabled = 0, updated_at = now()
WHERE flag_key = 'founding_offer_enabled' AND enabled <> 0;
