/**
 * CLI entry — `npm run db:pg:migrate`. Applies pending server/db/pg-migrations/*.sql
 * to DATABASE_URL and exits. Does not touch SQLite or any production DATABASE_URL
 * unless you explicitly point this at one.
 */
import { loadProjectEnv } from "../lib/load-project-env.js";
loadProjectEnv();
import { runPgMigrations } from "./pg-migrate.js";
import { closePgPool } from "./pg-client.js";

async function main(): Promise<void> {
  try {
    const result = await runPgMigrations();
    console.log(`[pg-migrate] applied=${result.applied} current_version=${result.current}`);
    process.exitCode = 0;
  } catch (err) {
    console.error("[pg-migrate] FAILED:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await closePgPool();
  }
}

void main();
