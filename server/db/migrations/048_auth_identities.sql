-- GOOGLE SIGN-IN SAFETY — multi-identity foundation.
--
-- auth_identities maps a verified (provider, provider_subject) pair to a
-- single, existing Firehall Meals user_id. This becomes the lookup source
-- for OAuth sign-in (see server/auth/auth-store.ts resolveOAuthSignIn()) so
-- a single account can be reached via more than one sign-in method (email
-- magic link today; Google/Apple going forward) without ever creating a
-- second account for the same person or moving data between user_ids.
--
-- (provider, provider_subject) is the PRIMARY KEY: this is the actual
-- database-level guarantee that the same Google/Apple subject (or the same
-- normalized email) can never be claimed by two different user_ids — not
-- just an application-level check.
--
-- users.auth_provider / users.provider_subject are intentionally left
-- completely alone by this migration (not dropped, not rewritten). They
-- remain for backward compatibility / rollback safety; new OAuth resolution
-- logic reads auth_identities instead, going forward.
CREATE TABLE IF NOT EXISTS auth_identities (
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple')),
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  email_at_link_time TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (provider, provider_subject)
);

-- Lookup direction used by "Sign-in methods" (Account page) and account
-- deletion (remove every identity row for a user_id in one query).
CREATE INDEX IF NOT EXISTS idx_auth_identities_user_id ON auth_identities(user_id);

-- ---------------------------------------------------------------------------
-- Backfill — safe, idempotent, additive only.
--
-- INSERT OR IGNORE means: if a (provider, provider_subject) row already
-- exists (re-running this migration, or a row created by live traffic
-- between deploys), the backfill silently skips it rather than overwriting
-- or duplicating anything. It never creates a new user_id and never moves a
-- row from one user_id to another — it only ever inserts a NEW auth_identities
-- row pointing at the SAME user_id the source `users` row already has.
--
-- Email users: provider_subject = normalized (trimmed, lowercased) email,
-- matching exactly what upsertEmailUser()/findUserByEmail() already
-- normalize to, so future lookups line up with this backfilled key.
INSERT OR IGNORE INTO auth_identities (provider, provider_subject, user_id, email_at_link_time, created_at)
SELECT 'email', lower(trim(email)), user_id, lower(trim(email)), created_at
FROM users
WHERE auth_provider = 'email'
  AND email IS NOT NULL
  AND trim(email) != '';

-- Google/Apple users: provider_subject = the existing provider_subject
-- column captured at original sign-in (the real Google/Apple `sub`).
INSERT OR IGNORE INTO auth_identities (provider, provider_subject, user_id, email_at_link_time, created_at)
SELECT auth_provider, provider_subject, user_id, email, created_at
FROM users
WHERE auth_provider IN ('google', 'apple')
  AND provider_subject IS NOT NULL
  AND trim(provider_subject) != '';

-- NOTE on data shapes this backfill cannot safely handle (reported, not
-- silently guessed at): if two different `users` rows somehow already share
-- the same (auth_provider, provider_subject) — a pre-existing data bug, not
-- something this migration could have caused, since users.email is UNIQUE
-- and (auth_provider, provider_subject) was never previously constrained —
-- INSERT OR IGNORE means only the FIRST matching row (by SQLite's internal
-- scan order) gets an auth_identities row; the second is silently skipped
-- rather than crashing the migration or overwriting the first row's
-- ownership. That second user's OAuth sign-in would keep working off the
-- legacy users.auth_provider/provider_subject columns (unaffected by this
-- migration) until the conflict is investigated and resolved by hand.
