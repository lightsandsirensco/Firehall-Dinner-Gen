-- Hall Identity V1: location fields, structured shifts, member shift assignment

ALTER TABLE halls ADD COLUMN city TEXT;
ALTER TABLE halls ADD COLUMN province_state TEXT;

CREATE TABLE IF NOT EXISTS hall_shifts (
  shift_id TEXT PRIMARY KEY,
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  shift_key TEXT NOT NULL CHECK (shift_key IN ('a', 'b', 'c', 'd')),
  name TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hall_id, shift_key)
);

CREATE INDEX IF NOT EXISTS idx_hall_shifts_hall ON hall_shifts(hall_id);

ALTER TABLE hall_memberships ADD COLUMN shift_id TEXT REFERENCES hall_shifts(shift_id) ON DELETE SET NULL;

-- Backfill default shifts for existing halls
INSERT OR IGNORE INTO hall_shifts (shift_id, hall_id, shift_key, name, enabled, sort_order)
SELECT
  hall_id || '-shift-a',
  hall_id,
  'a',
  COALESCE(NULLIF(json_extract(shift_names_json, '$[0]'), ''), 'A Shift'),
  1,
  0
FROM halls;

INSERT OR IGNORE INTO hall_shifts (shift_id, hall_id, shift_key, name, enabled, sort_order)
SELECT
  hall_id || '-shift-b',
  hall_id,
  'b',
  COALESCE(NULLIF(json_extract(shift_names_json, '$[1]'), ''), 'B Shift'),
  CASE WHEN json_array_length(shift_names_json) >= 2 THEN 1 WHEN shift_names_json = '[]' THEN 1 ELSE 1 END,
  1
FROM halls;

INSERT OR IGNORE INTO hall_shifts (shift_id, hall_id, shift_key, name, enabled, sort_order)
SELECT
  hall_id || '-shift-c',
  hall_id,
  'c',
  COALESCE(NULLIF(json_extract(shift_names_json, '$[2]'), ''), 'C Shift'),
  CASE WHEN json_array_length(shift_names_json) >= 3 THEN 1 WHEN shift_names_json = '[]' THEN 1 ELSE 0 END,
  2
FROM halls;

INSERT OR IGNORE INTO hall_shifts (shift_id, hall_id, shift_key, name, enabled, sort_order)
SELECT
  hall_id || '-shift-d',
  hall_id,
  'd',
  COALESCE(NULLIF(json_extract(shift_names_json, '$[3]'), ''), 'D Shift'),
  CASE WHEN json_array_length(shift_names_json) >= 4 THEN 1 WHEN shift_names_json = '[]' THEN 1 ELSE 0 END,
  3
FROM halls;
