-- Marketing consent tracking for email leads.
-- Additive only: existing rows default to marketing_consent = 0 (NOT consented).
-- Historical leads must never be treated as affirmatively opted in.

ALTER TABLE email_leads ADD COLUMN marketing_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE email_leads ADD COLUMN consent_captured_at TEXT;
