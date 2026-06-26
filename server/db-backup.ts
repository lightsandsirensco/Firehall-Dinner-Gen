/**
 * SQLite backup utilities for data/cache.db — manual CLI + optional daily scheduler.
 */
import fs from "fs";
import path from "path";
import _sqlJsImport from "sql.js";

const initSqlJs: typeof _sqlJsImport =
  (typeof (_sqlJsImport as { default?: typeof _sqlJsImport }).default === "function"
    ? (_sqlJsImport as { default: typeof _sqlJsImport }).default
    : _sqlJsImport) as typeof _sqlJsImport;

import { wasmPath } from "./sqlite.js";

export const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "cache.db");
export const DEFAULT_BACKUP_DIR = path.join(process.cwd(), "data", "backups");
export const DEFAULT_RETENTION_DAYS = 30;

export function resolveDbPath(): string {
  return process.env.SQLITE_DB_PATH?.trim() || DEFAULT_DB_PATH;
}

export function resolveBackupDir(): string {
  return process.env.BACKUP_DIR?.trim() || DEFAULT_BACKUP_DIR;
}

export function resolveRetentionDays(): number {
  const raw = process.env.BACKUP_RETENTION_DAYS?.trim();
  const n = raw ? parseInt(raw, 10) : DEFAULT_RETENTION_DAYS;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

function backupFileName(date = new Date()): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `cache-${stamp}.db`;
}

export interface BackupResult {
  ok: boolean;
  backupPath: string;
  sourcePath: string;
  sizeBytes: number;
  integrity: "ok" | "failed";
  pruned: number;
  message?: string;
}

async function openSqlJsDatabase(filePath: string): Promise<InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]>> {
  const SQL = await initSqlJs({ locateFile: () => wasmPath() });
  const buffer = fs.readFileSync(filePath);
  return new SQL.Database(buffer);
}

/** Run PRAGMA integrity_check — returns true when SQLite reports ok. */
export async function verifyDatabaseIntegrity(filePath: string): Promise<{ ok: boolean; detail: string }> {
  if (!fs.existsSync(filePath)) {
    return { ok: false, detail: "file not found" };
  }
  let db: InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]> | null = null;
  try {
    db = await openSqlJsDatabase(filePath);
    const stmt = db.prepare("PRAGMA integrity_check");
    let detail = "unknown";
    if (stmt.step()) {
      const row = stmt.get();
      detail = String(row[0] ?? row);
    }
    stmt.free();
    return { ok: detail.toLowerCase() === "ok", detail };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, detail: msg };
  } finally {
    db?.close();
  }
}

export function pruneOldBackups(
  backupDir = resolveBackupDir(),
  retentionDays = resolveRetentionDays(),
): number {
  if (!fs.existsSync(backupDir)) return 0;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let pruned = 0;
  for (const name of fs.readdirSync(backupDir)) {
    if (!name.startsWith("cache-") || !name.endsWith(".db")) continue;
    const full = path.join(backupDir, name);
    try {
      const stat = fs.statSync(full);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        pruned++;
      }
    } catch {
      /* skip unreadable entries */
    }
  }
  return pruned;
}

export async function createDatabaseBackup(options?: {
  sourcePath?: string;
  backupDir?: string;
  prune?: boolean;
}): Promise<BackupResult> {
  const sourcePath = options?.sourcePath ?? resolveDbPath();
  const backupDir = options?.backupDir ?? resolveBackupDir();

  if (!fs.existsSync(sourcePath)) {
    return {
      ok: false,
      backupPath: "",
      sourcePath,
      sizeBytes: 0,
      integrity: "failed",
      pruned: 0,
      message: `Source database not found: ${sourcePath}`,
    };
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, backupFileName());
  fs.copyFileSync(sourcePath, backupPath);
  const sizeBytes = fs.statSync(backupPath).size;

  const integrityResult = await verifyDatabaseIntegrity(backupPath);
  const pruned = options?.prune !== false ? pruneOldBackups(backupDir) : 0;

  return {
    ok: integrityResult.ok,
    backupPath,
    sourcePath,
    sizeBytes,
    integrity: integrityResult.ok ? "ok" : "failed",
    pruned,
    message: integrityResult.ok ? undefined : `Integrity check failed: ${integrityResult.detail}`,
  };
}

export interface RestoreResult {
  ok: boolean;
  restoredTo: string;
  backupPath: string;
  preRestorePath?: string;
  message?: string;
}

export async function restoreDatabaseBackup(
  backupPath: string,
  options?: { targetPath?: string; force?: boolean },
): Promise<RestoreResult> {
  const targetPath = options?.targetPath ?? resolveDbPath();

  if (!fs.existsSync(backupPath)) {
    return {
      ok: false,
      restoredTo: targetPath,
      backupPath,
      message: `Backup not found: ${backupPath}`,
    };
  }

  const integrity = await verifyDatabaseIntegrity(backupPath);
  if (!integrity.ok) {
    return {
      ok: false,
      restoredTo: targetPath,
      backupPath,
      message: `Backup failed integrity check: ${integrity.detail}`,
    };
  }

  if (fs.existsSync(targetPath) && !options?.force) {
    return {
      ok: false,
      restoredTo: targetPath,
      backupPath,
      message: `Target exists (${targetPath}). Pass --force to overwrite.`,
    };
  }

  let preRestorePath: string | undefined;
  if (fs.existsSync(targetPath)) {
    preRestorePath = `${targetPath}.pre-restore.${Date.now()}`;
    fs.copyFileSync(targetPath, preRestorePath);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(backupPath, targetPath);

  const postIntegrity = await verifyDatabaseIntegrity(targetPath);
  if (!postIntegrity.ok) {
    return {
      ok: false,
      restoredTo: targetPath,
      backupPath,
      preRestorePath,
      message: `Restore copy failed integrity: ${postIntegrity.detail}`,
    };
  }

  return { ok: true, restoredTo: targetPath, backupPath, preRestorePath };
}

function todayBackupExists(backupDir: string): boolean {
  if (!fs.existsSync(backupDir)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return fs.readdirSync(backupDir).some((name) => name.startsWith(`cache-${today}`));
}

let schedulerStarted = false;

/** Production daily backup — runs at most once per calendar day (UTC). */
export function startDailyBackupScheduler(): void {
  if (schedulerStarted) return;
  if (process.env.ENABLE_DAILY_BACKUP === "false") return;
  schedulerStarted = true;

  const run = async () => {
    const dir = resolveBackupDir();
    if (todayBackupExists(dir)) return;
    try {
      const result = await createDatabaseBackup({ prune: true });
      if (result.ok) {
        console.log(`[backup] Daily backup ok path=${result.backupPath} pruned=${result.pruned}`);
      } else {
        console.error(`[backup] Daily backup failed: ${result.message ?? "unknown"}`);
      }
    } catch (err) {
      console.error("[backup] Daily backup error:", err);
    }
  };

  void run();
  setInterval(() => void run(), 60 * 60 * 1000).unref();
}
