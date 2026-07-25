/**
 * Local SQLite via sql.js (WASM) — no native node-gyp build required (Windows-friendly).
 */
import _sqlJsImport from "sql.js";
// sql.js ships as module.exports = initFn (CJS). When bundled externally by esbuild
// the interop wraps it as { default: fn }, but when required directly the fn is the
// module root. Normalise so initSqlJs is always the callable initialiser function.
const initSqlJs: typeof _sqlJsImport =
  (typeof (_sqlJsImport as any).default === "function"
    ? (_sqlJsImport as any).default
    : _sqlJsImport) as typeof _sqlJsImport;
import fs from "fs";
import path from "path";

/** sql.js bind array elements and Statement#get() cell values */
type SqlBindValue = number | string | Uint8Array | null;

type SqlJsStatic = Awaited<ReturnType<typeof initSqlJs>>;
type SqlJsDatabase = InstanceType<SqlJsStatic["Database"]>;
type SqlJsStatement = ReturnType<SqlJsDatabase["prepare"]>;

export interface SqliteStatement {
  get(...params: SqlBindValue[]): Record<string, unknown> | undefined;
  all(...params: SqlBindValue[]): Record<string, unknown>[];
  run(...params: SqlBindValue[]): void;
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

export function wasmPath(): string {
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

function bindParams(stmt: SqlJsStatement, params: SqlBindValue[]): void {
  if (params.length === 0) return;
  stmt.bind(params);
}

function rowToObject(
  columns: string[],
  values: SqlBindValue[],
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
        get(...params: SqlBindValue[]) {
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
        all(...params: SqlBindValue[]) {
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
        run(...params: SqlBindValue[]) {
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
      try {
        const fileBuffer = fs.readFileSync(filePath);
        rawDb = new SQL.Database(fileBuffer);
      } catch (openErr) {
        const corruptPath = `${filePath}.corrupt.${Date.now()}`;
        try {
          fs.renameSync(filePath, corruptPath);
          console.error(`[sqlite] Corrupt database moved to ${corruptPath}`);
        } catch {
          console.error("[sqlite] Corrupt database — could not rename, creating fresh DB");
        }
        rawDb = new SQL.Database();
      }
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

/** Sync accessor when DB is already open (e.g. mid-request after migrate). */
export function tryGetSharedLocalDb(): SqliteDatabase | null {
  return sharedDb;
}

export function flushSqliteToDisk(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  persistToDisk();
}

/** Release pending persist timers so CLI test scripts can exit cleanly. */
export function releaseSqliteTimersForTests(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}
