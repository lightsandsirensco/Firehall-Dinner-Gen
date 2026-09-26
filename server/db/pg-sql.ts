/**
 * Thin, low-risk query helpers over the shared pg Pool (server/db/pg-client.ts)
 * used by the migrated stores (auth, billing/personal-plan, meal-history,
 * cloud sync). Plain parameterized `$1/$2` node-postgres calls — chosen over
 * drizzle's query-builder/tagged-template APIs so each store's SQL can stay
 * close to the original SQLite statements (same shape, minimal behavioral
 * drift) with zero ambiguity about drizzle's exact execute()/sql`` surface.
 * drizzle-orm still owns the connection object (see getPgDb in pg-client.ts)
 * for future query-builder use; this module is the raw-SQL fast path.
 */
import type { PoolClient } from "pg";
import { getPgPool } from "./pg-client.js";

export interface PgExecutor {
  all<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  one<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T | undefined>;
  run(text: string, params?: unknown[]): Promise<void>;
}

function wrapClient(client: PoolClient): PgExecutor {
  return {
    async all<T>(text: string, params: unknown[] = []): Promise<T[]> {
      const result = await client.query(text, params);
      return result.rows as T[];
    },
    async one<T>(text: string, params: unknown[] = []): Promise<T | undefined> {
      const result = await client.query(text, params);
      return (result.rows as T[])[0];
    },
    async run(text: string, params: unknown[] = []): Promise<void> {
      await client.query(text, params);
    },
  };
}

/** Run a query against the shared pool, return all rows. */
export async function pgAll<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPgPool().query(text, params);
  return result.rows as T[];
}

/** Run a query against the shared pool, return the first row (or undefined). */
export async function pgOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const result = await getPgPool().query(text, params);
  return (result.rows as T[])[0];
}

/** Run a query against the shared pool for its side effects only. */
export async function pgRun(text: string, params: unknown[] = []): Promise<void> {
  await getPgPool().query(text, params);
}

/** Transaction wrapper — BEGIN/COMMIT/ROLLBACK on one dedicated connection. */
export async function pgTx<T>(fn: (exec: PgExecutor) => Promise<T>): Promise<T> {
  const client = await getPgPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(wrapClient(client));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}
