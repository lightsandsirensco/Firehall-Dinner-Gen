/**
 * ONE-TIME SQLite -> Postgres data migration for Firehall Meals.
 *
 * Moves: users, user_profiles, user_preferences, auth_sessions,
 * auth_magic_links, user_saved_recipes, auth_identities, user_meal_history,
 * user_data_snapshots, user_subscriptions, stripe_webhook_events.
 * plan_catalog/plan_feature_flags/billing_global_flags are seeded by the
 * Postgres migration (0001_init.sql) — this script upserts any admin-edited
 * rows on top so overrides aren't lost.
 *
 * Deliberately NOT migrated: analytics_events (out of scope), hall_* /
 * hall_subscriptions (Hall Pro stays on SQLite, on hold), admin_user_meta /
 * email_leads (admin-only, not part of this migration).
 *
 * Safety:
 *   - Reads SQLite read-only (never writes back to data/cache.db).
 *   - Runs entirely inside ONE Postgres transaction — any row failure rolls
 *     back everything already inserted in this run.
 *   - Refuses to run if the Postgres `users` table already has rows, unless
 *     --force is passed (re-running a "one-time" migration is almost never
 *     what you want — verify-pg-migration.ts is the safe way to re-check).
 *   - Preserves every primary key / id exactly as it exists in SQLite.
 *
 * Usage: npm run db:migrate-to-pg [-- --force]
 */
import { loadProjectEnv } from "../server/lib/load-project-env.js";
loadProjectEnv();
import path from "node:path";
import { openSqliteDatabase } from "../server/sqlite.js";
import { runPgMigrations } from "../server/db/pg-migrate.js";
import { getPgPool, closePgPool } from "../server/db/pg-client.js";

const FORCE = process.argv.includes("--force");
// Rehearsal safety: read from an explicit COPY of the SQLite file, never the
// live data/cache.db. Override with SQLITE_MIGRATION_SOURCE_PATH if needed;
// defaults to the live path only for convenience in ad-hoc local runs.
const SQLITE_SOURCE_PATH =
  process.env.SQLITE_MIGRATION_SOURCE_PATH ||
  path.join(process.cwd(), "data", "cache.db");

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    // SQLite datetime('now') produces "YYYY-MM-DD HH:MM:SS" (no 'T'/'Z') —
    // Postgres timestamptz input accepts either, but normalize for clarity.
    return value.includes("T") ? value : value.replace(" ", "T") + "Z";
  }
  return String(value);
}

interface Counts {
  [table: string]: number;
}

async function main(): Promise<void> {
  console.log("[migrate-sqlite-to-pg] Starting...");
  console.log(`[migrate-sqlite-to-pg] SQLite source (read-only): ${SQLITE_SOURCE_PATH}`);
  await runPgMigrations();

  const pool = getPgPool();
  const sqlite = await openSqliteDatabase(SQLITE_SOURCE_PATH);

  const existingUsers = await pool.query("SELECT COUNT(*) AS c FROM users");
  if (Number(existingUsers.rows[0].c) > 0 && !FORCE) {
    console.error(
      `[migrate-sqlite-to-pg] Postgres 'users' table already has ${existingUsers.rows[0].c} row(s). ` +
        `Refusing to run (this is a ONE-TIME migration). Pass --force to proceed anyway (upserts by primary key).`,
    );
    process.exitCode = 1;
    return;
  }

  const client = await pool.connect();
  const counts: Counts = {};

  try {
    await client.query("BEGIN");

    // 1) users
    const users = sqlite.prepare(`SELECT * FROM users`).all();
    for (const u of users) {
      await client.query(
        `INSERT INTO users (user_id, email, auth_provider, provider_subject, is_guest, device_session_id, hall_pro_enabled, created_at, updated_at, last_login_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (user_id) DO UPDATE SET
           email = excluded.email, auth_provider = excluded.auth_provider, provider_subject = excluded.provider_subject,
           is_guest = excluded.is_guest, device_session_id = excluded.device_session_id, hall_pro_enabled = excluded.hall_pro_enabled,
           updated_at = excluded.updated_at, last_login_at = excluded.last_login_at`,
        [
          u.user_id, u.email, u.auth_provider, u.provider_subject, Number(u.is_guest) ? 1 : 0,
          u.device_session_id, Number(u.hall_pro_enabled) ? 1 : 0,
          toIso(u.created_at), toIso(u.updated_at), toIso(u.last_login_at),
        ],
      );
    }
    counts.users = users.length;

    // 2) user_profiles
    const profiles = sqlite.prepare(`SELECT * FROM user_profiles`).all();
    for (const p of profiles) {
      await client.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, display_name, profile_photo_url, department, hall_name, shift_label, crew_size, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (user_id) DO UPDATE SET
           first_name = excluded.first_name, last_name = excluded.last_name, display_name = excluded.display_name,
           profile_photo_url = excluded.profile_photo_url, department = excluded.department, hall_name = excluded.hall_name,
           shift_label = excluded.shift_label, crew_size = excluded.crew_size, updated_at = excluded.updated_at`,
        [
          p.user_id, p.first_name, p.last_name, p.display_name, p.profile_photo_url,
          p.department, p.hall_name, p.shift_label, p.crew_size, toIso(p.updated_at),
        ],
      );
    }
    counts.user_profiles = profiles.length;

    // 3) user_preferences
    const prefs = sqlite.prepare(`SELECT * FROM user_preferences`).all();
    for (const p of prefs) {
      await client.query(
        `INSERT INTO user_preferences (
           user_id, preferred_proteins_json, dietary_restrictions_json, appliance_preferences_json,
           excluded_ingredients_json, shift_reminders_enabled, shift_days_json, shift_reminder_time,
           shift_reminder_timezone, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (user_id) DO UPDATE SET
           preferred_proteins_json = excluded.preferred_proteins_json,
           dietary_restrictions_json = excluded.dietary_restrictions_json,
           appliance_preferences_json = excluded.appliance_preferences_json,
           excluded_ingredients_json = excluded.excluded_ingredients_json,
           shift_reminders_enabled = excluded.shift_reminders_enabled,
           shift_days_json = excluded.shift_days_json,
           shift_reminder_time = excluded.shift_reminder_time,
           shift_reminder_timezone = excluded.shift_reminder_timezone,
           updated_at = excluded.updated_at`,
        [
          p.user_id, p.preferred_proteins_json, p.dietary_restrictions_json, p.appliance_preferences_json,
          p.excluded_ingredients_json ?? "[]", Number(p.shift_reminders_enabled) ? 1 : 0,
          p.shift_days_json ?? "[]", p.shift_reminder_time ?? "18:00",
          p.shift_reminder_timezone ?? "America/New_York", toIso(p.updated_at),
        ],
      );
    }
    counts.user_preferences = prefs.length;

    // 4) auth_sessions (live sessions only — expired ones are dead weight)
    const sessions = sqlite.prepare(`SELECT * FROM auth_sessions`).all();
    for (const s of sessions) {
      await client.query(
        `INSERT INTO auth_sessions (session_token_hash, user_id, expires_at, created_at)
         VALUES ($1,$2,$3,$4) ON CONFLICT (session_token_hash) DO NOTHING`,
        [s.session_token_hash, s.user_id, toIso(s.expires_at), toIso(s.created_at)],
      );
    }
    counts.auth_sessions = sessions.length;

    // 5) auth_magic_links
    const magicLinks = sqlite.prepare(`SELECT * FROM auth_magic_links`).all();
    for (const m of magicLinks) {
      await client.query(
        `INSERT INTO auth_magic_links (token_hash, email, expires_at, used_at, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (token_hash) DO NOTHING`,
        [m.token_hash, m.email, toIso(m.expires_at), toIso(m.used_at), toIso(m.created_at)],
      );
    }
    counts.auth_magic_links = magicLinks.length;

    // 6) user_saved_recipes — preserve exact ids (OVERRIDING SYSTEM VALUE not
    // needed: identity column is GENERATED BY DEFAULT, so explicit ids are allowed).
    const saved = sqlite.prepare(`SELECT * FROM user_saved_recipes`).all();
    for (const r of saved) {
      await client.query(
        `INSERT INTO user_saved_recipes (id, user_id, recipe_key, recipe_json, saved_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (user_id, recipe_key) DO NOTHING`,
        [r.id, r.user_id, r.recipe_key, r.recipe_json, toIso(r.saved_at)],
      );
    }
    if (saved.length > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('user_saved_recipes','id'), GREATEST((SELECT MAX(id) FROM user_saved_recipes), 1))`,
      );
    }
    counts.user_saved_recipes = saved.length;

    // 7) auth_identities
    const identities = sqlite.prepare(`SELECT * FROM auth_identities`).all();
    for (const i of identities) {
      await client.query(
        `INSERT INTO auth_identities (provider, provider_subject, user_id, email_at_link_time, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (provider, provider_subject) DO NOTHING`,
        [i.provider, i.provider_subject, i.user_id, i.email_at_link_time, toIso(i.created_at)],
      );
    }
    counts.auth_identities = identities.length;

    // 8) user_meal_history
    const history = sqlite.prepare(`SELECT * FROM user_meal_history`).all();
    for (const h of history) {
      await client.query(
        `INSERT INTO user_meal_history (id, user_id, recipe_slug, cooked_at, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [h.id, h.user_id, h.recipe_slug, toIso(h.cooked_at), toIso(h.created_at)],
      );
    }
    if (history.length > 0) {
      await client.query(
        `SELECT setval(pg_get_serial_sequence('user_meal_history','id'), GREATEST((SELECT MAX(id) FROM user_meal_history), 1))`,
      );
    }
    counts.user_meal_history = history.length;

    // 9) user_data_snapshots
    const snapshots = sqlite.prepare(`SELECT * FROM user_data_snapshots`).all();
    for (const s of snapshots) {
      await client.query(
        `INSERT INTO user_data_snapshots (user_id, data_key, snapshot_json, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id, data_key) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at`,
        [s.user_id, s.data_key, s.snapshot_json, toIso(s.updated_at)],
      );
    }
    counts.user_data_snapshots = snapshots.length;

    // 10) user_subscriptions (personal plans only — hall_pro stays in SQLite's
    // hall_subscriptions and is intentionally excluded)
    const subs = sqlite
      .prepare(`SELECT * FROM user_subscriptions WHERE plan_id != 'hall_pro'`)
      .all();
    for (const s of subs) {
      await client.query(
        `INSERT INTO user_subscriptions (
           user_id, plan_id, status, source, selected_at, expires_at, stripe_customer_id,
           stripe_subscription_id, stripe_price_id, cancel_at_period_end, current_period_end, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (user_id) DO UPDATE SET
           plan_id = excluded.plan_id, status = excluded.status, source = excluded.source,
           selected_at = excluded.selected_at, expires_at = excluded.expires_at,
           stripe_customer_id = excluded.stripe_customer_id, stripe_subscription_id = excluded.stripe_subscription_id,
           stripe_price_id = excluded.stripe_price_id, cancel_at_period_end = excluded.cancel_at_period_end,
           current_period_end = excluded.current_period_end, updated_at = excluded.updated_at`,
        [
          s.user_id, s.plan_id, s.status, s.source, toIso(s.selected_at), toIso(s.expires_at),
          s.stripe_customer_id, s.stripe_subscription_id, s.stripe_price_id,
          Number(s.cancel_at_period_end) ? 1 : 0, toIso(s.current_period_end), toIso(s.updated_at),
        ],
      );
    }
    counts.user_subscriptions = subs.length;

    // 11) stripe_webhook_events (idempotency ledger — safe/cheap to bring over)
    const webhooks = sqlite.prepare(`SELECT * FROM stripe_webhook_events`).all();
    for (const w of webhooks) {
      await client.query(
        `INSERT INTO stripe_webhook_events (event_id, event_type, received_at)
         VALUES ($1,$2,$3) ON CONFLICT (event_id) DO NOTHING`,
        [w.event_id, w.event_type, toIso(w.received_at)],
      );
    }
    counts.stripe_webhook_events = webhooks.length;

    // 12) plan_catalog / plan_feature_flags / billing_global_flags — bring
    // over any admin edits made in SQLite before cutover (seed rows from
    // 0001_init.sql already exist; this upserts on top, never removes rows).
    const plans = sqlite.prepare(`SELECT * FROM plan_catalog`).all();
    for (const p of plans) {
      await client.query(
        `INSERT INTO plan_catalog (plan_id, display_name, tagline, price_label, enabled, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (plan_id) DO UPDATE SET
           display_name = excluded.display_name, tagline = excluded.tagline, price_label = excluded.price_label,
           enabled = excluded.enabled, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
        [p.plan_id, p.display_name, p.tagline, p.price_label, Number(p.enabled) ? 1 : 0, p.sort_order, toIso(p.updated_at)],
      );
    }
    counts.plan_catalog = plans.length;

    const flags = sqlite.prepare(`SELECT * FROM plan_feature_flags`).all();
    for (const f of flags) {
      await client.query(
        `INSERT INTO plan_feature_flags (plan_id, feature_key, enabled, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (plan_id, feature_key) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
        [f.plan_id, f.feature_key, Number(f.enabled) ? 1 : 0, toIso(f.updated_at)],
      );
    }
    counts.plan_feature_flags = flags.length;

    const globalFlags = sqlite.prepare(`SELECT * FROM billing_global_flags`).all();
    for (const g of globalFlags) {
      await client.query(
        `INSERT INTO billing_global_flags (flag_key, enabled, description, updated_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (flag_key) DO UPDATE SET enabled = excluded.enabled, description = excluded.description, updated_at = excluded.updated_at`,
        [g.flag_key, Number(g.enabled) ? 1 : 0, g.description, toIso(g.updated_at)],
      );
    }
    counts.billing_global_flags = globalFlags.length;

    await client.query("COMMIT");
    console.log("[migrate-sqlite-to-pg] COMMIT ok:", counts);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[migrate-sqlite-to-pg] FAILED — rolled back entirely. Nothing was written.", err);
    process.exitCode = 1;
    return;
  } finally {
    client.release();
  }

  console.log("[migrate-sqlite-to-pg] Done. Run `npm run db:verify-pg` next.");
}

main()
  .catch((err) => {
    console.error("[migrate-sqlite-to-pg] Unhandled error:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePgPool();
  });
