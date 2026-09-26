#!/usr/bin/env tsx
/**
 * GOOGLE SIGN-IN PRE-FLIGHT — READ-ONLY duplicate check.
 *
 * Runs exactly one SELECT against the SAME database file the running app
 * uses (server/sqlite.ts getSharedLocalDb() -> <cwd>/data/cache.db) and
 * prints ONLY whether any (auth_provider, provider_subject) pair on `users`
 * is claimed by more than one account, plus the count of such pairs.
 *
 * Safety:
 *  - No migrations are run.
 *  - No INSERT/UPDATE/DELETE statements exist in this file.
 *  - provider_subject values are NEVER printed, logged, or persisted —
 *    only counts.
 *  - Opens the DB file, reads, and exits. sql.js only persists to disk on a
 *    write (see server/sqlite.ts schedulePersist()), and this script never
 *    calls .run(), so the on-disk file is never touched.
 *
 * Run this from the SAME working directory / environment the production
 * server actually runs in (e.g. the Replit Shell attached to the live
 * deployment, cwd = repo root), so that <cwd>/data/cache.db resolves to the
 * real production file rather than a local dev copy:
 *
 *   npx tsx scripts/check-oauth-identity-duplicates.ts
 */
import fs from "node:fs";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";

async function main() {
  const dbPath = path.join(process.cwd(), "data", "cache.db");

  if (!fs.existsSync(dbPath)) {
    console.log(`[check] No database file found at ${dbPath}`);
    console.log("[check] Nothing to check — this looks like an empty/new environment.");
    return;
  }

  const db = await openSqliteDatabase(dbPath);

  // Confirm the users table + expected columns exist before querying, so a
  // missing/older schema fails loudly instead of silently reporting "no
  // duplicates" for a table that was never checked.
  const cols = db.prepare("PRAGMA table_info(users)").all();
  const colNames = new Set(cols.map((c) => String(c.name)));
  if (!colNames.has("auth_provider") || !colNames.has("provider_subject")) {
    console.error(
      "[check] ABORTED — users table is missing auth_provider/provider_subject columns. " +
        "This does not look like the expected schema; refusing to guess.",
    );
    process.exitCode = 1;
    return;
  }

  const rows = db
    .prepare(
      `SELECT auth_provider, provider_subject, COUNT(*) AS n
       FROM users
       WHERE auth_provider IN ('google','apple')
         AND provider_subject IS NOT NULL
       GROUP BY auth_provider, provider_subject
       HAVING COUNT(*) > 1`,
    )
    .all();

  console.log(`[check] DB file: ${dbPath}`);

  if (rows.length === 0) {
    console.log("[check] RESULT: No duplicate (auth_provider, provider_subject) pairs found.");
    console.log("[check] Safe with respect to this specific pre-existing-duplicate risk.");
  } else {
    const byProvider = new Map<string, number>();
    let totalExtraRows = 0;
    for (const r of rows) {
      const provider = String(r.auth_provider);
      const n = Number(r.n);
      byProvider.set(provider, (byProvider.get(provider) ?? 0) + 1);
      totalExtraRows += n - 1; // rows beyond the first "owner" of that pair
    }
    console.log(
      `[check] RESULT: Found ${rows.length} conflicting (auth_provider, provider_subject) pair(s) ` +
        `across ${totalExtraRows} extra user row(s) beyond the first owner.`,
    );
    for (const [provider, count] of byProvider) {
      console.log(`  - provider=${provider}: ${count} conflicting pair(s)`);
    }
    console.log(
      "[check] provider_subject values are intentionally not printed. " +
        "Investigate manually with direct DB access before enabling Google sign-in broadly; " +
        "migration 048 will only backfill an auth_identities row for the FIRST scanned user in " +
        "each conflicting pair (documented, non-destructive) — the other user(s) keep working off " +
        "the legacy users.auth_provider/provider_subject columns until resolved by hand.",
    );
  }

  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error("[check] FAILED:", err);
  process.exitCode = 1;
});
