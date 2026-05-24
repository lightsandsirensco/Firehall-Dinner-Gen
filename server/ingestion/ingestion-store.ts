/**
 * SQLite persistence for ingestion pipeline (staging — not served live to Explore).
 */

import { log } from "../logger.js";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import type {
  IngestRecipeDraft,
  IngestRunRecord,
  IngestRunStats,
  IngestStagingStatus,
  TrendSignal,
} from "../../shared/ingestion/recipe-ingest-schema.js";

let db: SqliteDatabase | null = null;

export async function initIngestionStore(): Promise<void> {
  db = await getSharedLocalDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ingestion_runs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      stats_json TEXT NOT NULL DEFAULT '{}',
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS ingestion_trend_signals (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      keyword TEXT NOT NULL,
      trend_score REAL NOT NULL DEFAULT 0,
      pin_url TEXT,
      destination_url TEXT,
      title_hint TEXT,
      image_url TEXT,
      discovered_at TEXT NOT NULL,
      run_id TEXT,
      raw_json TEXT,
      FOREIGN KEY (run_id) REFERENCES ingestion_runs(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ingestion_trends_run ON ingestion_trend_signals(run_id);
    CREATE INDEX IF NOT EXISTS idx_ingestion_trends_keyword ON ingestion_trend_signals(keyword);

    CREATE TABLE IF NOT EXISTS ingestion_staging (
      id TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      source TEXT NOT NULL,
      spoonacular_id INTEGER,
      trend_score REAL NOT NULL DEFAULT 0,
      quality_score INTEGER NOT NULL DEFAULT 0,
      rejection_reason TEXT,
      run_id TEXT,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ingestion_staging_status ON ingestion_staging(status);
    CREATE INDEX IF NOT EXISTS idx_ingestion_staging_quality ON ingestion_staging(quality_score DESC);
    CREATE INDEX IF NOT EXISTS idx_ingestion_staging_spoonacular ON ingestion_staging(spoonacular_id);
  `);
  log("Ingestion store initialized", "ingestion");
}

function requireDb(): SqliteDatabase {
  if (!db) throw new Error("Ingestion store not initialized — call initIngestionStore()");
  return db;
}

export function createIngestionRun(id: string, source: string): void {
  const database = requireDb();
  database
    .prepare(
      `INSERT INTO ingestion_runs (id, source, status, started_at, stats_json)
       VALUES (?, ?, 'running', datetime('now'), '{}')`,
    )
    .run(id, source);
}

export function finishIngestionRun(
  id: string,
  status: "completed" | "failed",
  stats: IngestRunStats,
  error?: string,
): void {
  const database = requireDb();
  database
    .prepare(
      `UPDATE ingestion_runs
       SET status = ?, finished_at = datetime('now'), stats_json = ?, error = ?
       WHERE id = ?`,
    )
    .run(status, JSON.stringify(stats), error || null, id);
}

export function getLatestIngestionRun(): IngestRunRecord | null {
  const database = requireDb();
  const row = database
    .prepare(
      `SELECT id, source, status, started_at, finished_at, stats_json, error
       FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`,
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) return null;
  return rowToRun(row);
}

function rowToRun(row: Record<string, unknown>): IngestRunRecord {
  let stats: IngestRunStats = {
    signalsIn: 0,
    draftsStaged: 0,
    validated: 0,
    rejected: 0,
    promoted: 0,
    duplicatesSkipped: 0,
  };
  try {
    stats = { ...stats, ...JSON.parse(String(row.stats_json || "{}")) };
  } catch {
    /* keep defaults */
  }
  return {
    id: String(row.id),
    source: String(row.source),
    status: row.status as IngestRunRecord["status"],
    startedAt: String(row.started_at),
    finishedAt: row.finished_at ? String(row.finished_at) : undefined,
    stats,
    error: row.error ? String(row.error) : undefined,
  };
}

export function insertTrendSignals(signals: TrendSignal[], runId: string): number {
  const database = requireDb();
  const stmt = database.prepare(
    `INSERT OR IGNORE INTO ingestion_trend_signals
     (id, source, keyword, trend_score, pin_url, destination_url, title_hint, image_url, discovered_at, run_id, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  let inserted = 0;
  for (const s of signals) {
    try {
      stmt.run(
        s.id,
        s.source,
        s.keyword,
        s.trendScore,
        s.pinUrl || null,
        s.destinationUrl || null,
        s.titleHint || null,
        s.imageUrl || null,
        s.discoveredAt,
        runId,
        s.raw ? JSON.stringify(s.raw) : null,
      );
      inserted++;
    } catch {
      /* duplicate id */
    }
  }
  return inserted;
}

export function stageRecipeDraft(draft: IngestRecipeDraft, runId: string, status: IngestStagingStatus = "pending"): boolean {
  const database = requireDb();
  const id = `stage_${draft.fingerprint.replace(/[^a-z0-9]/gi, "_").slice(0, 80)}`;
  try {
    database
      .prepare(
        `INSERT INTO ingestion_staging
         (id, fingerprint, status, source, spoonacular_id, trend_score, quality_score, run_id, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        draft.fingerprint,
        status,
        draft.source,
        draft.spoonacularId ?? null,
        draft.trendScore,
        draft.qualityScore,
        runId,
        JSON.stringify(draft),
      );
    return true;
  } catch {
    return false;
  }
}

export function updateStagingStatus(
  fingerprint: string,
  status: IngestStagingStatus,
  rejectionReason?: string,
): void {
  const database = requireDb();
  database
    .prepare(
      `UPDATE ingestion_staging
       SET status = ?, rejection_reason = ?, updated_at = datetime('now')
       WHERE fingerprint = ?`,
    )
    .run(status, rejectionReason || null, fingerprint);
}

export interface StagingReviewRow {
  fingerprint: string;
  status: IngestStagingStatus;
  qualityScore: number;
  trendScore: number;
  rejectionReason?: string;
  updatedAt: string;
  draft: IngestRecipeDraft;
}

export function listStagingForReview(
  status?: IngestStagingStatus,
  limit = 40,
): StagingReviewRow[] {
  const database = requireDb();
  const rows = status
    ? (database
        .prepare(
          `SELECT fingerprint, status, quality_score, trend_score, rejection_reason, updated_at, payload_json
           FROM ingestion_staging WHERE status = ?
           ORDER BY quality_score DESC, trend_score DESC LIMIT ?`,
        )
        .all(status, limit) as Record<string, unknown>[])
    : (database
        .prepare(
          `SELECT fingerprint, status, quality_score, trend_score, rejection_reason, updated_at, payload_json
           FROM ingestion_staging
           WHERE status IN ('pending', 'validated', 'rejected')
           ORDER BY quality_score DESC LIMIT ?`,
        )
        .all(limit) as Record<string, unknown>[]);

  const out: StagingReviewRow[] = [];
  for (const row of rows) {
    try {
      out.push({
        fingerprint: String(row.fingerprint),
        status: row.status as IngestStagingStatus,
        qualityScore: Number(row.quality_score) || 0,
        trendScore: Number(row.trend_score) || 0,
        rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
        updatedAt: String(row.updated_at),
        draft: JSON.parse(String(row.payload_json)) as IngestRecipeDraft,
      });
    } catch {
      /* skip */
    }
  }
  return out;
}

export function getStagingByFingerprint(fingerprint: string): IngestRecipeDraft | null {
  const database = requireDb();
  const row = database
    .prepare(`SELECT payload_json FROM ingestion_staging WHERE fingerprint = ?`)
    .get(fingerprint) as { payload_json: string } | undefined;
  if (!row?.payload_json) return null;
  try {
    return JSON.parse(row.payload_json) as IngestRecipeDraft;
  } catch {
    return null;
  }
}

/** Re-open rows that failed during promote so --promote can retry. */
export function requeuePromoteFailedStaging(): number {
  const database = requireDb();
  const pending = Number(
    (
      database
        .prepare(
          `SELECT COUNT(*) AS c FROM ingestion_staging
           WHERE status = 'rejected' AND rejection_reason LIKE 'promote_failed%'`,
        )
        .get() as { c: number }
    ).c,
  );
  if (pending === 0) return 0;
  database
    .prepare(
      `UPDATE ingestion_staging
       SET status = 'validated', rejection_reason = NULL, updated_at = datetime('now')
       WHERE status = 'rejected' AND rejection_reason LIKE 'promote_failed%'`,
    )
    .run();
  return pending;
}

export function listStagingByStatus(status: IngestStagingStatus, limit = 50): IngestRecipeDraft[] {
  const database = requireDb();
  const rows = database
    .prepare(
      `SELECT payload_json FROM ingestion_staging
       WHERE status = ?
       ORDER BY quality_score DESC, trend_score DESC
       LIMIT ?`,
    )
    .all(status, limit) as { payload_json: string }[];

  const out: IngestRecipeDraft[] = [];
  for (const row of rows) {
    try {
      out.push(JSON.parse(row.payload_json) as IngestRecipeDraft);
    } catch {
      /* skip */
    }
  }
  return out;
}

export function getIngestionSummary(): {
  stagingPending: number;
  stagingValidated: number;
  stagingPromoted: number;
  catalogBackedExplore: boolean;
} {
  const database = requireDb();
  const count = (status: string) => {
    const row = database
      .prepare(`SELECT COUNT(*) as c FROM ingestion_staging WHERE status = ?`)
      .get(status) as { c: number } | undefined;
    return row?.c ?? 0;
  };
  return {
    stagingPending: count("pending"),
    stagingValidated: count("validated"),
    stagingPromoted: count("promoted"),
    catalogBackedExplore: true,
  };
}
