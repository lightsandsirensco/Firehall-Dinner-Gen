#!/usr/bin/env tsx
/**
 * Verify backup integrity (PRAGMA integrity_check).
 * Usage: npm run verify-backup -- [backup-file]
 * Without args, verifies the newest backup in BACKUP_DIR.
 */
import fs from "fs";
import path from "path";
import { resolveBackupDir, verifyDatabaseIntegrity } from "../server/db-backup.js";

function newestBackup(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((n) => n.startsWith("cache-") && n.endsWith(".db"))
    .map((n) => ({ name: n, mtime: fs.statSync(path.join(dir, n)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return files[0] ? path.join(dir, files[0].name) : null;
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  const backupPath = arg
    ? path.isAbsolute(arg)
      ? arg
      : path.join(process.cwd(), arg)
    : newestBackup(resolveBackupDir());

  if (!backupPath) {
    console.error("[verify-backup] No backup file found. Run npm run backup first.");
    process.exit(1);
  }

  const result = await verifyDatabaseIntegrity(backupPath);
  console.log(`[verify-backup] file=${backupPath}`);
  if (!result.ok) {
    console.error(`[verify-backup] FAILED detail=${result.detail}`);
    process.exit(1);
  }
  console.log(`[verify-backup] OK integrity=${result.detail}`);
}

main().catch((err) => {
  console.error("[verify-backup] Fatal:", err);
  process.exit(1);
});
