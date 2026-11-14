-- Pro early-access waitlist. One row per email; joining is an explicit request
-- to be told when Pro launches (consent_scope) and is NOT newsletter consent,
-- which stays in user_marketing_consent. The klaviyo_* columns are the
-- durable sync/retry state so a signup survives a Klaviyo outage.

CREATE TABLE IF NOT EXISTS pro_waitlist_signups (
  email TEXT PRIMARY KEY,
  user_id TEXT,
  source TEXT NOT NULL,
  consent_scope TEXT NOT NULL DEFAULT 'pro_launch_notifications',
  consent_text TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  klaviyo_status TEXT NOT NULL DEFAULT 'pending',
  klaviyo_attempts INTEGER NOT NULL DEFAULT 0,
  klaviyo_last_error TEXT,
  klaviyo_next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  klaviyo_synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pro_waitlist_user ON pro_waitlist_signups (user_id);
CREATE INDEX IF NOT EXISTS idx_pro_waitlist_klaviyo_due
  ON pro_waitlist_signups (klaviyo_next_attempt_at) WHERE klaviyo_status = 'pending';
