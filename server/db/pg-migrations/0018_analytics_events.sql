-- Durable product analytics events. The SQLite analytics_events table lives
-- on the deploy's local disk, which Replit Autoscale does not persist across
-- deploys/scale-downs and does not share between instances — so the admin
-- dashboard reads traffic/engagement from this table instead
-- (server/analytics/analytics-store.ts mirrors every accepted event here).
-- No PII: visitor_id is a random browser UUID; metadata never carries email.

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT,
  visitor_id TEXT,
  route TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_pg_analytics_events_occurred ON analytics_events (occurred_at);
CREATE INDEX IF NOT EXISTS idx_pg_analytics_events_type_time ON analytics_events (event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_pg_analytics_events_visitor ON analytics_events (visitor_id);
