#!/usr/bin/env tsx
/**
 * Restore data/cache.db from a backup file.
 * Usage: npm run restore -- data/backups/cache-2026-06-22T12-00-00-000Z.db [--force]
 */
import path from "path";
import { restoreDatabaseBackup, resolveDbPath } from "../server/db-backup.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const force = args.includes("--force");
  const backupArg = args.find((a) => !a.startsWith("--"));

  if (!backupArg) {
    console.error("Usage: npm run restore -- <backup-file> [--force]");
    console.error("Example: npm run restore -- data/backups/cache-2026-06-22T12-00-00-000Z.db --force");
    process.exit(1);
  }

  const backupPath = path.isAbsolute(backupArg) ? backupArg : path.join(process.cwd(), backupArg);
  const result = await restoreDatabaseBackup(backupPath, { force });

  if (!result.ok) {
    console.error(`[restore] FAILED: ${result.message}`);
    process.exit(1);
  }

  console.log(`[restore] OK restored=${result.restoredTo} from=${result.backupPath}`);
  if (result.preRestorePath) {
    console.log(`[restore] Previous DB saved at ${result.preRestorePath}`);
  }
  console.log(`[restore] Restart the server to load the restored database.`);
  console.log(`[restore] Target: ${resolveDbPath()}`);
}

main().catch((err) => {
  console.error("[restore] Fatal:", err);
  process.exit(1);
});
