-- Single Postgres source of truth for marketing-CONSENT state — separate
-- from authentication (users) and from the legacy SQLite email_leads table
-- (server/admin-users/leads-store.ts), which remains a read-mostly CRM/audit
-- log after this migration but is no longer authoritative for consent (see
-- server/marketing-consent/store.ts).
--
-- One row per normalized email. Account creation, Pro purchase, and shop
-- purchase must NEVER set marketing_consent = true here — only an explicit,
-- unchecked-by-default opt-in action (signup checkbox, lead-capture
-- checkbox) may. Absence of a row means "not consented" (safe default).

CREATE TABLE IF NOT EXISTS user_marketing_consent (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
  marketing_consent INTEGER NOT NULL DEFAULT 0,
  consent_source TEXT,
  consent_captured_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_marketing_consent_user_id ON user_marketing_consent(user_id);

-- Idempotency for inbound Klaviyo webhook deliveries — Klaviyo retries on
-- non-2xx responses and batches up to 1000 events per request, so the same
-- event can arrive more than once. Mirrors stripe_webhook_events' pattern.
CREATE TABLE IF NOT EXISTS klaviyo_webhook_events (
  external_id TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Marketing checkbox captured at the moment a sign-in/signup link is
-- requested (email is the only account-creation form with a submittable UI
-- to attach a checkbox to). Defaults to 0 — requesting a sign-in link must
-- never imply marketing consent. Read once at verify-magic time, then the
-- link is consumed/expired as normal.
ALTER TABLE auth_magic_links ADD COLUMN IF NOT EXISTS wants_marketing INTEGER NOT NULL DEFAULT 0;
