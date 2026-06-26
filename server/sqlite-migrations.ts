/**
 * SQLite schema version tracking via schema_migrations table.
 */
import type { SqliteDatabase } from "./sqlite.js";
import { log, logError } from "./logger.js";

const MIGRATIONS: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: "schema_migrations_bootstrap",
    sql: `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  },
];

export interface MigrationStatus {
  currentVersion: number;
  applied: { version: number; name: string; applied_at: string }[];
  pending: number[];
}

function ensureMigrationsTable(db: SqliteDatabase): void {
  db.exec(MIGRATIONS[0].sql);
}

export function getMigrationStatus(db: SqliteDatabase): MigrationStatus {
  ensureMigrationsTable(db);
  const applied = db
    .prepare(`SELECT version, name, applied_at FROM schema_migrations ORDER BY version`)
    .all() as { version: number; name: string; applied_at: string }[];
  const appliedVersions = new Set(applied.map((r) => r.version));
  const pending = MIGRATIONS.filter((m) => !appliedVersions.has(m.version)).map((m) => m.version);
  const currentVersion = applied.length ? applied[applied.length - 1].version : 0;
  return { currentVersion, applied, pending };
}

export function runPendingMigrations(db: SqliteDatabase): MigrationStatus {
  ensureMigrationsTable(db);
  const status = getMigrationStatus(db);

  for (const migration of MIGRATIONS) {
    if (status.applied.some((a) => a.version === migration.version)) continue;
    db.exec(migration.sql);
    db.prepare(`INSERT INTO schema_migrations (version, name) VALUES (?, ?)`).run(
      migration.version,
      migration.name,
    );
    log(`[sqlite] Applied migration v${migration.version} ${migration.name}`, "sqlite");
  }

  return getMigrationStatus(db);
}

export async function verifyDatabaseHealth(
  db: SqliteDatabase,
): Promise<{ ok: boolean; integrity: string; migrations: MigrationStatus }> {
  const integrityRow = db.prepare(`PRAGMA integrity_check`).get() as
    | { integrity_check: string }
    | undefined;
  const integrity =
    integrityRow?.integrity_check ??
    (Object.values(integrityRow ?? {})[0] as string | undefined) ??
    "unknown";
  const migrations = runPendingMigrations(db);
  const ok = String(integrity).toLowerCase() === "ok";
  if (!ok) {
    logError("sqlite", `Integrity check failed: ${integrity}`);
  }
  return { ok, integrity: String(integrity), migrations };
}
