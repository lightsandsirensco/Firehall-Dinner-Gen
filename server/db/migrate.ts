/**
 * SQLite schema migrations — versioned, idempotent, safe on startup.
 */

import fs from "fs";
import path from "path";
import { log } from "../logger.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";

const MIGRATIONS_DIR = path.join(process.cwd(), "server", "db", "migrations");

interface MigrationFile {
  version: number;
  name: string;
  sql: string;
}

function listMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d+_.+\.sql$/i.test(f))
    .sort();

  return files.map((filename) => {
    const match = filename.match(/^(\d+)_(.+)\.sql$/i);
    const version = match ? parseInt(match[1], 10) : 0;
    const name = match ? match[2] : filename;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
    return { version, name, sql };
  });
}

function ensureMigrationsTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getAppliedVersions(db: SqliteDatabase): Set<number> {
  const rows = db.prepare("SELECT version FROM schema_migrations ORDER BY version").all();
  return new Set(rows.map((r) => Number(r.version)));
}

function applyMigration(db: SqliteDatabase, migration: MigrationFile): void {
  log(`[db] Applying migration ${migration.version}: ${migration.name}`, "catalog");
  try {
    db.exec(migration.sql);
    db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)").run(
      migration.version,
      migration.name,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${msg}`);
  }
}

let migrated = false;

/** Run pending migrations once per process. */
export async function runDbMigrations(): Promise<{ applied: number; current: number }> {
  if (migrated) {
    const db = await getSharedLocalDb();
    const row = db
      .prepare("SELECT MAX(version) AS v FROM schema_migrations")
      .get() as { v: number | null } | undefined;
    return { applied: 0, current: row?.v ?? 0 };
  }

  const db = await getSharedLocalDb();
  ensureMigrationsTable(db);
  const applied = getAppliedVersions(db);
  const pending = listMigrationFiles().filter((m) => !applied.has(m.version));

  for (const migration of pending) {
    try {
      applyMigration(db, migration);
    } catch (err: unknown) {
      log(`[db] Migration halted at v${migration.version}: ${(err as Error).message}`, "catalog");
      throw err;
    }
  }

  migrated = true;
  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_migrations")
    .get() as { v: number | null } | undefined;
  const current = row?.v ?? 0;

  if (pending.length > 0) {
    log(`[db] Migrations complete — applied ${pending.length}, at v${current}`, "catalog");
  }

  return { applied: pending.length, current };
}
