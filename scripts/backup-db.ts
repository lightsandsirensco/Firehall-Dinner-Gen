#!/usr/bin/env tsx
/**
 * Create a timestamped backup of data/cache.db with integrity verification.
 * Usage: npm run backup
 */
import { createDatabaseBackup, resolveBackupDir, resolveDbPath } from "../server/db-backup.js";

async function main(): Promise<void> {
  const result = await createDatabaseBackup({ prune: true });
  console.log(`[backup] source=${resolveDbPath()}`);
  console.log(`[backup] dir=${resolveBackupDir()}`);
  if (!result.ok) {
    console.error(`[backup] FAILED: ${result.message ?? "unknown error"}`);
    process.exit(1);
  }
  console.log(`[backup] OK path=${result.backupPath} size=${result.sizeBytes} integrity=${result.integrity} pruned=${result.pruned}`);
}

main().catch((err) => {
  console.error("[backup] Fatal:", err);
  process.exit(1);
});
