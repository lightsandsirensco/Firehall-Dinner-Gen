-- Admin CRM: email leads + per-user admin metadata

CREATE TABLE IF NOT EXISTS email_leads (
  lead_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT NOT NULL,
  signup_form TEXT,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  converted_user_id TEXT,
  hall_created INTEGER NOT NULL DEFAULT 0,
  last_activity_at TEXT,
  klaviyo_synced INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_leads_email ON email_leads(email);
CREATE INDEX IF NOT EXISTS idx_email_leads_captured_at ON email_leads(captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_leads_source ON email_leads(source);

CREATE TABLE IF NOT EXISTS admin_user_meta (
  user_id TEXT PRIMARY KEY,
  is_pilot_lead INTEGER NOT NULL DEFAULT 0,
  internal_notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
