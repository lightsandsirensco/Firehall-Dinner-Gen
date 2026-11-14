/**
 * In-process test database for suites that touch the Postgres-only stores
 * (auth, billing, meal history, cloud sync, marketing consent). Runs every
 * real Postgres migration against PGlite and every SQLite migration against a
 * temp file, so tests exercise production schemas without any network
 * database. Import this module FIRST — it sets env before stores load.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Pool } from "pg";
import { PGlite } from "@electric-sql/pglite";
import { loadProjectEnv } from "../../server/lib/load-project-env.js";

loadProjectEnv();
export const TEST_TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "fh-pglite-test-"));
process.env.LOCAL_SQLITE_DB_PATH = path.join(TEST_TMP_DIR, "cache.db");
process.env.DATABASE_URL = "postgres://pglite.invalid/never-connect";
process.env.FIREHALL_OFFLINE = "1";
// Tests must never reach real marketing or payment accounts.
delete process.env.KLAVIYO_API_KEY;
delete process.env.KLAVIYO_WEBHOOK_SECRET;
delete process.env.STRIPE_SECRET_KEY;

const pg = new PGlite();
const pglitePool = {
  async query(text: string, params?: unknown[]) {
    if (params === undefined) {
      const results = await pg.exec(text);
      return results[results.length - 1] ?? { rows: [] };
    }
    return pg.query(text, params);
  },
  async connect() {
    return { query: pglitePool.query, release() {} };
  },
  async end() {},
  on() {},
};

const { setPgPoolForTests } = await import("../../server/db/pg-client.js");
setPgPoolForTests(pglitePool as unknown as Pool);

const { runPgMigrations } = await import("../../server/db/pg-migrate.js");
const { runDbMigrations } = await import("../../server/db/migrate.js");
await runPgMigrations();
await runDbMigrations();

export const testPg = pg;
