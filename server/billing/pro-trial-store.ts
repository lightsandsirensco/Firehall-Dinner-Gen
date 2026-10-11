/**
 * personal_pro_trials persistence. One row per user, never deleted on expiry
 * (the row is the durable "trial used" record) — see shared/billing/pro-trial.ts.
 */
import { pgOne, pgRun } from "../db/pg-sql.js";
import type { ProTrialRecord, ProTrialStartSource } from "../../shared/billing/pro-trial.js";

export type ProTrialNotice = "ending" | "expired";

export interface ProTrialRepo {
  get(userId: string): Promise<ProTrialRecord | null>;
  /** Inserts only if this user has never had a trial. Returns the stored row and whether it was created now. */
  insertIfAbsent(record: ProTrialRecord): Promise<{ created: boolean; record: ProTrialRecord | null }>;
  /** Marks premium_trial_expired as recorded. True only for the call that flipped it. */
  claimExpiredRecording(userId: string, at: Date): Promise<boolean>;
  markNoticeSeen(userId: string, notice: ProTrialNotice, at: Date): Promise<void>;
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
}

function rowToRecord(row: Record<string, unknown>): ProTrialRecord {
  return {
    user_id: String(row.user_id),
    trial_started_at: isoOrNull(row.trial_started_at)!,
    trial_expires_at: isoOrNull(row.trial_expires_at)!,
    start_source: String(row.start_source) as ProTrialStartSource,
    paywall_source: row.paywall_source == null ? null : String(row.paywall_source),
    ending_notice_seen_at: isoOrNull(row.ending_notice_seen_at),
    expired_notice_seen_at: isoOrNull(row.expired_notice_seen_at),
    expired_recorded_at: isoOrNull(row.expired_recorded_at),
  };
}

export const pgProTrialRepo: ProTrialRepo = {
  async get(userId) {
    const row = await pgOne(`SELECT * FROM personal_pro_trials WHERE user_id = $1`, [userId]);
    return row ? rowToRecord(row) : null;
  },
  async insertIfAbsent(record) {
    const inserted = await pgOne(
      `INSERT INTO personal_pro_trials (user_id, trial_started_at, trial_expires_at, start_source, paywall_source)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [record.user_id, record.trial_started_at, record.trial_expires_at, record.start_source, record.paywall_source],
    );
    if (inserted) return { created: true, record: rowToRecord(inserted) };
    return { created: false, record: await this.get(record.user_id) };
  },
  async claimExpiredRecording(userId, at) {
    const row = await pgOne(
      `UPDATE personal_pro_trials SET expired_recorded_at = $2
       WHERE user_id = $1 AND expired_recorded_at IS NULL AND trial_expires_at <= $2
       RETURNING user_id`,
      [userId, at.toISOString()],
    );
    return Boolean(row);
  },
  async markNoticeSeen(userId, notice, at) {
    const column = notice === "ending" ? "ending_notice_seen_at" : "expired_notice_seen_at";
    await pgRun(
      `UPDATE personal_pro_trials SET ${column} = COALESCE(${column}, $2) WHERE user_id = $1`,
      [userId, at.toISOString()],
    );
  },
};

/** In-memory repo with the same once-only semantics — for tests. */
export function createMemoryProTrialRepo(): ProTrialRepo & { rows: Map<string, ProTrialRecord> } {
  const rows = new Map<string, ProTrialRecord>();
  return {
    rows,
    async get(userId) {
      const row = rows.get(userId);
      return row ? { ...row } : null;
    },
    async insertIfAbsent(record) {
      const existing = rows.get(record.user_id);
      if (existing) return { created: false, record: { ...existing } };
      rows.set(record.user_id, { ...record });
      return { created: true, record: { ...record } };
    },
    async claimExpiredRecording(userId, at) {
      const row = rows.get(userId);
      if (!row || row.expired_recorded_at || Date.parse(row.trial_expires_at) > at.getTime()) return false;
      row.expired_recorded_at = at.toISOString();
      return true;
    },
    async markNoticeSeen(userId, notice, at) {
      const row = rows.get(userId);
      if (!row) return;
      if (notice === "ending") row.ending_notice_seen_at ??= at.toISOString();
      else row.expired_notice_seen_at ??= at.toISOString();
    },
  };
}
