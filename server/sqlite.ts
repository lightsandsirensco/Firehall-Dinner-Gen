/**
 * Local SQLite via sql.js (WASM) — no native node-gyp build required (Windows-friendly).
 */
import initSqlJs, { type Database as SqlJsDatabase, type SqlValue } from "sql.js";
import fs from "fs";
import path from "path";
export interface SqliteStatement {
  get(...params: SqlValue[]): Record<string, unknown> | undefined;
  all(...params: SqlValue[]): Record<string, unknown>[];
  run(...params: SqlValue[]): void;
}

export interface SqliteDatabase {
  pragma(_statement: string): void;
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  transaction<T>(fn: () => T): () => T;
}

let rawDb: SqlJsDatabase | null = null;
let dbPath = "";
let openPromise: Promise<SqliteDatabase> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function wasmPath(): string {
  return path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm");
}

function persistToDisk(): void {
  if (!rawDb || !dbPath) return;
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = rawDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function schedulePersist(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      persistToDisk();
    } catch (err) {
      console.error("[sqlite] Failed to persist database:", err);
    }
  }, 100);
}

function bindParams(stmt: ReturnType<SqlJsDatabase["prepare"]>, params: SqlValue[]): void {
  if (params.length === 0) return;
  stmt.bind(params);
}

function rowToObject(
  columns: string[],
  values: SqlValue[],
): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) {
    row[columns[i]] = values[i];
  }
  return row;
}

function wrapDatabase(native: SqlJsDatabase): SqliteDatabase {
  return {
    pragma() {
      /* WAL/busy_timeout not supported in sql.js — no-op for compatibility */
    },
    exec(sql: string) {
      native.run(sql);
      schedulePersist();
    },
    prepare(sql: string): SqliteStatement {
      return {
        get(...params: SqlValue[]) {
          const stmt = native.prepare(sql);
          try {
            bindParams(stmt, params);
            if (stmt.step()) {
              return rowToObject(stmt.getColumnNames(), stmt.get());
            }
            return undefined;
          } finally {
            stmt.free();
          }
        },
        all(...params: SqlValue[]) {
          const stmt = native.prepare(sql);
          const rows: Record<string, unknown>[] = [];
          try {
            bindParams(stmt, params);
            while (stmt.step()) {
              rows.push(rowToObject(stmt.getColumnNames(), stmt.get()));
            }
            return rows;
          } finally {
            stmt.free();
          }
        },
        run(...params: SqlValue[]) {
          const stmt = native.prepare(sql);
          try {
            bindParams(stmt, params);
            while (stmt.step()) {
              /* consume rows for INSERT/UPDATE/DELETE */
            }
          } finally {
            stmt.free();
          }
          schedulePersist();
        },
      };
    },
    transaction<T>(fn: () => T): () => T {
      return () => {
        native.run("BEGIN IMMEDIATE");
        try {
          const result = fn();
          native.run("COMMIT");
          schedulePersist();
          return result;
        } catch (err) {
          try {
            native.run("ROLLBACK");
          } catch {
            /* ignore rollback errors */
          }
          throw err;
        }
      };
    },
  };
}

export async function openSqliteDatabase(filePath: string): Promise<SqliteDatabase> {
  if (openPromise && dbPath === filePath) {
    return openPromise;
  }

  dbPath = filePath;
  openPromise = (async () => {
    const wasm = wasmPath();
    const SQL = await initSqlJs({
      locateFile: () => wasm,
    });

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      rawDb = new SQL.Database(fileBuffer);
    } else {
      rawDb = new SQL.Database();
    }

    return wrapDatabase(rawDb);
  })();

  return openPromise;
}

/** Shared local DB used by cache + hall vote stores */
const DEFAULT_DB = path.join(process.cwd(), "data", "cache.db");

let sharedDb: SqliteDatabase | null = null;

export async function getSharedLocalDb(): Promise<SqliteDatabase> {
  if (!sharedDb) {
    sharedDb = await openSqliteDatabase(DEFAULT_DB);
  }
  return sharedDb;
}

export function flushSqliteToDisk(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  persistToDisk();
}
