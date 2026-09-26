/**
 * Postgres schema migrations — versioned, idempotent, hand-written SQL files
 * (server/db/pg-migrations/*.sql), applied in order and tracked in a
 * `schema_migrations` table. Mirrors server/db/migrate.ts's SQLite pattern.
 *
 * Deliberately NOT `drizzle-kit push` — push diffs live schema automatically
 * and can run destructive changes unattended; reviewable numbered SQL files
 * applied by this runner are the safer choice for production.
 */
import fs from "fs";
import path from "path";
import { getPgPool } from "./pg-client.js";

const MIGRATIONS_DIR = path.join(process.cwd(), "server", "db", "pg-migrations");

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

async function ensureMigrationsTable(): Promise<void> {
  await getPgPool().query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedVersions(): Promise<Set<number>> {
  const result = await getPgPool().query("SELECT version FROM schema_migrations ORDER BY version");
  return new Set(result.rows.map((r) => Number(r.version)));
}

async function applyMigration(migration: MigrationFile): Promise<void> {
  const client = await getPgPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(migration.sql);
    await client.query("INSERT INTO schema_migrations (version, name) VALUES ($1, $2)", [
      migration.version,
      migration.name,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Postgres migration ${migration.version} (${migration.name}) failed: ${msg}`);
  } finally {
    client.release();
  }
}

/** Run pending Postgres migrations. Safe to call repeatedly (no-op once caught up). */
export async function runPgMigrations(): Promise<{ applied: number; current: number }> {
  await ensureMigrationsTable();
  const applied = await getAppliedVersions();
  const pending = listMigrationFiles().filter((m) => !applied.has(m.version));

  for (const migration of pending) {
    console.log(`[pg-migrate] Applying ${migration.version}_${migration.name}`);
    await applyMigration(migration);
  }

  const result = await getPgPool().query("SELECT MAX(version) AS v FROM schema_migrations");
  const current = Number(result.rows[0]?.v ?? 0);

  if (pending.length > 0) {
    console.log(`[pg-migrate] Complete — applied ${pending.length}, at v${current}`);
  } else {
    console.log(`[pg-migrate] Up to date — at v${current}`);
  }

  return { applied: pending.length, current };
}
