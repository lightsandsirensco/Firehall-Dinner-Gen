-- Durable record of every email submitted through a public capture form
-- (homepage, generator, shopping list, Red Lead, waitlist, ...). The legacy
-- SQLite email_leads table is instance-local and wiped on every publish, so
-- it cannot be the admin dashboard's source of truth.
--
-- This table records that an email was COLLECTED, never that it CONSENTED:
-- marketing consent lives only in user_marketing_consent. Rows are never
-- deleted or rewritten by the app; a repeat submission from the same form
-- source only bumps last_submitted_at / submission_count.

CREATE TABLE IF NOT EXISTS email_lead_captures (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  signup_form TEXT,
  first_captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submission_count INTEGER NOT NULL DEFAULT 1,
  imported_from TEXT,
  UNIQUE (email, source)
);

CREATE INDEX IF NOT EXISTS idx_email_lead_captures_email ON email_lead_captures (email);
