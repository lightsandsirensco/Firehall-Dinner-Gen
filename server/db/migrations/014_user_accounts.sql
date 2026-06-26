-- Lightweight accounts: users, profiles, preferences, sessions, saves, halls

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('guest', 'email', 'google', 'apple')),
  provider_subject TEXT,
  is_guest INTEGER NOT NULL DEFAULT 0,
  device_session_id TEXT,
  hall_pro_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_device_session ON users(device_session_id);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  profile_photo_url TEXT,
  department TEXT,
  hall_name TEXT,
  shift_label TEXT,
  crew_size INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  preferred_proteins_json TEXT NOT NULL DEFAULT '[]',
  dietary_restrictions_json TEXT NOT NULL DEFAULT '[]',
  appliance_preferences_json TEXT NOT NULL DEFAULT '[]',
  shift_reminders_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_magic_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_magic_links_email ON auth_magic_links(email);

CREATE TABLE IF NOT EXISTS user_saved_recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  recipe_key TEXT NOT NULL,
  recipe_json TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, recipe_key)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_recipes_user ON user_saved_recipes(user_id);

CREATE TABLE IF NOT EXISTS halls (
  hall_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(user_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hall_memberships (
  hall_id TEXT NOT NULL REFERENCES halls(hall_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (hall_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hall_memberships_user ON hall_memberships(user_id);
