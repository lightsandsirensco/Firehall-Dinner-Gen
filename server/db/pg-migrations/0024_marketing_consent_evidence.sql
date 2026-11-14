-- Append-only consent evidence: one row per opt-in or withdrawal, with the
-- exact disclosure wording the person saw. user_marketing_consent stays the
-- current-state table; this is the audit trail behind it.
CREATE TABLE IF NOT EXISTS marketing_consent_events (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  source TEXT NOT NULL,
  disclosure_version TEXT,
  disclosure_text TEXT,
  context_json TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_consent_events_email
  ON marketing_consent_events (email, captured_at);

-- Unsubscribe links in site-sent marketing email carry this random token
-- instead of the address. klaviyo_unsubscribe_pending marks site-side
-- unsubscribes still to be pushed to Klaviyo (retried by the Klaviyo worker).
ALTER TABLE user_marketing_consent ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_marketing_consent_unsub_token
  ON user_marketing_consent (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;
ALTER TABLE user_marketing_consent
  ADD COLUMN IF NOT EXISTS klaviyo_unsubscribe_pending INTEGER NOT NULL DEFAULT 0;
