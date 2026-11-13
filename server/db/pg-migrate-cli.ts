/**
 * CLI entry — `npm run db:pg:migrate`. Applies pending server/db/pg-migrations/*.sql
 * to DATABASE_URL and exits. Does not touch SQLite or any production DATABASE_URL
 * unless you explicitly point this at one.
 *
 *   npm run db:pg:migrate -- --to=21   # apply pending migrations up to and including 0021
 */
import { loadProjectEnv } from "../lib/load-project-env.js";
loadProjectEnv();
import { runPgMigrations } from "./pg-migrate.js";
import { closePgPool } from "./pg-client.js";

function parseToVersion(argv: string[]): number | undefined {
  const arg = argv.find((a) => a.startsWith("--to="));
  if (!arg) return undefined;
  const version = Number(arg.slice("--to=".length));
  if (!Number.isInteger(version) || version < 1) throw new Error(`invalid ${arg}`);
  return version;
}

async function main(): Promise<void> {
  try {
    const toVersion = parseToVersion(process.argv.slice(2));
    if (toVersion !== undefined) console.log(`[pg-migrate] capped at v${toVersion}`);
    const result = await runPgMigrations({ toVersion });
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
