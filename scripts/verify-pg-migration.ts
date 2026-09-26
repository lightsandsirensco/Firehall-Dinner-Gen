/**
 * SQLite <-> Postgres migration verification.
 *
 * Compares row counts, ids, auth identity ownership, Stripe customer/
 * subscription ids, subscription state, profiles/preferences, saved recipe
 * counts, meal history counts, and orphaned foreign keys. Any CRITICAL
 * mismatch -> non-zero exit. Read-only on both sides.
 *
 * Usage: npm run db:verify-pg
 */
import { loadProjectEnv } from "../server/lib/load-project-env.js";
loadProjectEnv();
import path from "node:path";
import { openSqliteDatabase } from "../server/sqlite.js";
import { getPgPool, closePgPool } from "../server/db/pg-client.js";

// Rehearsal safety: compare against the same explicit SQLite COPY the
// migration ran from, not the live data/cache.db.
const SQLITE_SOURCE_PATH =
  process.env.SQLITE_MIGRATION_SOURCE_PATH ||
  path.join(process.cwd(), "data", "cache.db");

let failures = 0;
let warnings = 0;

function fail(msg: string): void {
  failures++;
  console.error(`[FAIL] ${msg}`);
}

function warn(msg: string): void {
  warnings++;
  console.warn(`[WARN] ${msg}`);
}

function ok(msg: string): void {
  console.log(`[ OK ] ${msg}`);
}

async function main(): Promise<void> {
  console.log(`[verify-pg-migration] SQLite source (read-only): ${SQLITE_SOURCE_PATH}`);
  const sqlite = await openSqliteDatabase(SQLITE_SOURCE_PATH);
  const pool = getPgPool();

  // --- Row counts -----------------------------------------------------
  const tables = [
    "users",
    "user_profiles",
    "user_preferences",
    "auth_magic_links",
    "user_saved_recipes",
    "auth_identities",
    "user_meal_history",
    "user_data_snapshots",
    "stripe_webhook_events",
  ];

  for (const table of tables) {
    const sqliteRow = sqlite.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number };
    const pgRes = await pool.query(`SELECT COUNT(*) AS c FROM ${table}`);
    const sqliteCount = Number(sqliteRow.c);
    const pgCount = Number(pgRes.rows[0].c);
    if (pgCount < sqliteCount) {
      fail(`${table}: Postgres has fewer rows (pg=${pgCount}) than SQLite (sqlite=${sqliteCount})`);
    } else {
      ok(`${table}: sqlite=${sqliteCount} pg=${pgCount}`);
    }
  }

  // auth_sessions is expected to differ (only live sessions are migrated) —
  // report only, never fail.
  const sqliteSessions = sqlite.prepare(`SELECT COUNT(*) AS c FROM auth_sessions`).get() as { c: number };
  const pgSessions = await pool.query(`SELECT COUNT(*) AS c FROM auth_sessions`);
  console.log(`[INFO] auth_sessions: sqlite=${sqliteSessions.c} pg=${pgSessions.rows[0].c} (live sessions only, expected to differ)`);

  // --- Every SQLite user_id exists in Postgres -------------------------
  const sqliteUserIds = (sqlite.prepare(`SELECT user_id FROM users`).all() as Array<{ user_id: string }>).map(
    (r) => r.user_id,
  );
  if (sqliteUserIds.length > 0) {
    const pgUserIdsRes = await pool.query(`SELECT user_id FROM users`);
    const pgUserIds = new Set(pgUserIdsRes.rows.map((r) => r.user_id));
    const missing = sqliteUserIds.filter((id) => !pgUserIds.has(id));
    if (missing.length > 0) {
      fail(`${missing.length} user_id(s) present in SQLite but missing in Postgres (e.g. ${missing.slice(0, 5).join(", ")})`);
    } else {
      ok(`All ${sqliteUserIds.length} SQLite user_id(s) present in Postgres`);
    }
  }

  // --- auth_identities ownership matches ------------------------------
  const sqliteIdentities = sqlite
    .prepare(`SELECT provider, provider_subject, user_id FROM auth_identities`)
    .all() as Array<{ provider: string; provider_subject: string; user_id: string }>;
  if (sqliteIdentities.length > 0) {
    const pgIdentitiesRes = await pool.query(`SELECT provider, provider_subject, user_id FROM auth_identities`);
    const pgMap = new Map(pgIdentitiesRes.rows.map((r) => [`${r.provider}:${r.provider_subject}`, r.user_id]));
    let mismatches = 0;
    for (const row of sqliteIdentities) {
      const key = `${row.provider}:${row.provider_subject}`;
      const pgOwner = pgMap.get(key);
      if (pgOwner === undefined) {
        mismatches++;
        fail(`auth_identity ${key} missing in Postgres`);
      } else if (pgOwner !== row.user_id) {
        mismatches++;
        fail(`auth_identity ${key} owned by ${row.user_id} in SQLite but ${pgOwner} in Postgres`);
      }
    }
    if (mismatches === 0) ok(`All ${sqliteIdentities.length} auth_identities ownership rows match`);
  }

  // --- Stripe customer/subscription ids + status ----------------------
  const sqliteSubs = sqlite
    .prepare(`SELECT * FROM user_subscriptions WHERE plan_id != 'hall_pro'`)
    .all() as Array<Record<string, unknown>>;
  if (sqliteSubs.length > 0) {
    const pgSubsRes = await pool.query(`SELECT * FROM user_subscriptions`);
    const pgSubMap = new Map(pgSubsRes.rows.map((r) => [r.user_id as string, r]));
    let subMismatches = 0;
    for (const s of sqliteSubs) {
      const pgSub = pgSubMap.get(String(s.user_id));
      if (!pgSub) {
        subMismatches++;
        fail(`user_subscriptions: user ${s.user_id} missing in Postgres`);
        continue;
      }
      if (pgSub.stripe_customer_id !== s.stripe_customer_id) {
        subMismatches++;
        fail(`user_subscriptions: user ${s.user_id} stripe_customer_id mismatch (sqlite=${s.stripe_customer_id} pg=${pgSub.stripe_customer_id})`);
      }
      if (pgSub.stripe_subscription_id !== s.stripe_subscription_id) {
        subMismatches++;
        fail(`user_subscriptions: user ${s.user_id} stripe_subscription_id mismatch (sqlite=${s.stripe_subscription_id} pg=${pgSub.stripe_subscription_id})`);
      }
      if (pgSub.status !== s.status) {
        subMismatches++;
        fail(`user_subscriptions: user ${s.user_id} status mismatch (sqlite=${s.status} pg=${pgSub.status})`);
      }
      if (pgSub.plan_id !== s.plan_id) {
        subMismatches++;
        fail(`user_subscriptions: user ${s.user_id} plan_id mismatch (sqlite=${s.plan_id} pg=${pgSub.plan_id})`);
      }
    }
    if (subMismatches === 0) ok(`All ${sqliteSubs.length} user_subscriptions rows match (plan/status/Stripe ids)`);
  }

  // --- No duplicate auth identities in Postgres ------------------------
  const dupIdentities = await pool.query(
    `SELECT provider, provider_subject, COUNT(*) AS c FROM auth_identities
     GROUP BY provider, provider_subject HAVING COUNT(*) > 1`,
  );
  if (dupIdentities.rowCount && dupIdentities.rowCount > 0) {
    fail(`${dupIdentities.rowCount} duplicate (provider, provider_subject) pair(s) in auth_identities`);
  } else {
    ok("No duplicate auth_identities (provider, provider_subject)");
  }

  // --- No duplicate Stripe subscription ids in Postgres -----------------
  const dupStripeSubs = await pool.query(
    `SELECT stripe_subscription_id, COUNT(*) AS c FROM user_subscriptions
     WHERE stripe_subscription_id IS NOT NULL
     GROUP BY stripe_subscription_id HAVING COUNT(*) > 1`,
  );
  if (dupStripeSubs.rowCount && dupStripeSubs.rowCount > 0) {
    fail(`${dupStripeSubs.rowCount} duplicate stripe_subscription_id value(s) across user_subscriptions`);
  } else {
    ok("No duplicate stripe_subscription_id values in user_subscriptions");
  }

  // --- Saved recipe / meal history counts per user --------------------
  const savedCountMismatch = await countMismatchByUser(
    sqlite,
    pool,
    "user_saved_recipes",
    "user_saved_recipes",
  );
  if (savedCountMismatch === 0) ok("Saved recipe counts match per user");

  const historyCountMismatch = await countMismatchByUser(
    sqlite,
    pool,
    "user_meal_history",
    "user_meal_history",
  );
  if (historyCountMismatch === 0) ok("Meal history counts match per user");

  // --- Orphaned FKs in Postgres ----------------------------------------
  const orphanChecks: Array<[string, string]> = [
    ["user_profiles", "SELECT COUNT(*) AS c FROM user_profiles p LEFT JOIN users u ON u.user_id = p.user_id WHERE u.user_id IS NULL"],
    ["user_preferences", "SELECT COUNT(*) AS c FROM user_preferences p LEFT JOIN users u ON u.user_id = p.user_id WHERE u.user_id IS NULL"],
    ["auth_sessions", "SELECT COUNT(*) AS c FROM auth_sessions s LEFT JOIN users u ON u.user_id = s.user_id WHERE u.user_id IS NULL"],
    ["auth_identities", "SELECT COUNT(*) AS c FROM auth_identities i LEFT JOIN users u ON u.user_id = i.user_id WHERE u.user_id IS NULL"],
    ["user_saved_recipes", "SELECT COUNT(*) AS c FROM user_saved_recipes r LEFT JOIN users u ON u.user_id = r.user_id WHERE u.user_id IS NULL"],
    ["user_meal_history", "SELECT COUNT(*) AS c FROM user_meal_history h LEFT JOIN users u ON u.user_id = h.user_id WHERE u.user_id IS NULL"],
    ["user_data_snapshots", "SELECT COUNT(*) AS c FROM user_data_snapshots s LEFT JOIN users u ON u.user_id = s.user_id WHERE u.user_id IS NULL"],
    ["user_subscriptions", "SELECT COUNT(*) AS c FROM user_subscriptions s LEFT JOIN users u ON u.user_id = s.user_id WHERE u.user_id IS NULL"],
  ];
  // Note: Postgres enforces these FKs at insert time (unlike sql.js — see
  // server/sqlite.ts pragma() no-op) so orphans should be structurally
  // impossible; this is a defense-in-depth check, not the primary guarantee.
  for (const [table, query] of orphanChecks) {
    const res = await pool.query(query);
    const orphanCount = Number(res.rows[0].c);
    if (orphanCount > 0) {
      fail(`${table}: ${orphanCount} row(s) in Postgres reference a non-existent user_id`);
    } else {
      ok(`${table}: no orphaned user_id references`);
    }
  }

  // --- payments_enabled / monetization_enabled parity (informational) --
  const sqliteFlags = sqlite.prepare(`SELECT flag_key, enabled FROM billing_global_flags`).all() as Array<{
    flag_key: string;
    enabled: number;
  }>;
  const pgFlagsRes = await pool.query(`SELECT flag_key, enabled FROM billing_global_flags`);
  const pgFlagMap = new Map(pgFlagsRes.rows.map((r) => [r.flag_key as string, Number(r.enabled)]));
  for (const f of sqliteFlags) {
    const pgVal = pgFlagMap.get(f.flag_key);
    if (pgVal === undefined) {
      warn(`billing_global_flags.${f.flag_key} missing in Postgres`);
    } else if (pgVal !== Number(f.enabled)) {
      warn(`billing_global_flags.${f.flag_key} differs: sqlite=${f.enabled} pg=${pgVal} (admin may have changed one side post-cutover)`);
    } else {
      ok(`billing_global_flags.${f.flag_key} matches (${pgVal})`);
    }
  }

  console.log("\n----------------------------------------");
  console.log(`Verification complete: ${failures} critical failure(s), ${warnings} warning(s).`);
  if (failures > 0) {
    console.log("Result: FAIL");
    process.exitCode = 1;
  } else {
    console.log("Result: PASS");
    process.exitCode = 0;
  }
}

async function countMismatchByUser(
  sqlite: Awaited<ReturnType<typeof openSqliteDatabase>>,
  pool: ReturnType<typeof getPgPool>,
  sqliteTable: string,
  pgTable: string,
): Promise<number> {
  const sqliteCounts = sqlite
    .prepare(`SELECT user_id, COUNT(*) AS c FROM ${sqliteTable} GROUP BY user_id`)
    .all() as Array<{ user_id: string; c: number }>;
  if (sqliteCounts.length === 0) return 0;

  const pgCountsRes = await pool.query(`SELECT user_id, COUNT(*) AS c FROM ${pgTable} GROUP BY user_id`);
  const pgMap = new Map(pgCountsRes.rows.map((r) => [r.user_id as string, Number(r.c)]));

  let mismatches = 0;
  for (const row of sqliteCounts) {
    const pgCount = pgMap.get(row.user_id) ?? 0;
    if (pgCount < Number(row.c)) {
      mismatches++;
      fail(`${pgTable}: user ${row.user_id} has ${row.c} row(s) in SQLite but only ${pgCount} in Postgres`);
    }
  }
  return mismatches;
}

main()
  .catch((err) => {
    console.error("[verify-pg-migration] Unhandled error:", err);
    process.exitCode = 1;
  })
  .finally(() => {
    void closePgPool();
  });
