-- Product analytics events (internal database; GA4 handles traffic separately)

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  session_id TEXT,
  visitor_id TEXT,
  route TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time
  ON analytics_events (event_type, occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_occurred
  ON analytics_events (occurred_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events (session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor
  ON analytics_events (visitor_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_route
  ON analytics_events (route);
