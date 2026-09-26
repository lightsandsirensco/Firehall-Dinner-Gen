/**
 * Postgres connection for production-critical stores (auth, billing,
 * preferences, meal history, cloud sync).
 *
 * FAIL-CLOSED BY DESIGN: there is no SQLite fallback here. If DATABASE_URL
 * is missing, getPgPool()/getPgDb() throw immediately on first use instead
 * of silently degrading to local SQLite (see PRODUCTION DATABASE MIGRATION
 * PLAN — requirement 2). Analytics/LLM-cost/recipe caches are unaffected —
 * they keep using server/sqlite.ts.
 */
import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

let pool: Pool | null = null;
let db: NodePgDatabase | null = null;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Auth, billing, preferences, meal history, and " +
        "cloud sync are Postgres-only and never fall back to local SQLite. " +
        "Set DATABASE_URL (e.g. a Neon connection string) before starting the server.",
    );
  }
  return url;
}

function poolSslOption(connectionString: string): { rejectUnauthorized: boolean } | undefined {
  if (/sslmode=disable/i.test(connectionString)) return undefined;
  // Neon (and most managed Postgres) requires TLS; Node's default CA bundle
  // does not always include the managed provider's chain, so this matches
  // the common node-postgres + Neon setup. Connection string itself should
  // still include `sslmode=require`.
  return { rejectUnauthorized: false };
}

/** Lazily-created singleton pg Pool. Throws if DATABASE_URL is unset. */
export function getPgPool(): Pool {
  if (pool) return pool;
  const connectionString = requireDatabaseUrl();
  pool = new Pool({
    connectionString,
    max: 5,
    ssl: poolSslOption(connectionString),
  });
  pool.on("error", (err) => {
    // Idle client errors (e.g. connection reset) must never crash the
    // process — the pool recovers by opening new connections on demand.
    console.error("[pg] idle client error:", err instanceof Error ? err.message : err);
  });
  return pool;
}

/** Lazily-created singleton Drizzle instance over the shared pg Pool. */
export function getPgDb(): NodePgDatabase {
  if (db) return db;
  db = drizzle(getPgPool());
  return db;
}

/** Whether Postgres is configured at all — used by boot diagnostics only. */
export function isPgConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** Test/shutdown hook — closes the pool and clears cached handles. */
export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
  pool = null;
  db = null;
}

/** Boot-time smoke check — throws with a clear message on failure. */
export async function verifyPgConnection(): Promise<void> {
  await getPgPool().query("SELECT 1");
}
