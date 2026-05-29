import crypto from "crypto";
import { log } from "./logger.js";
import { getSharedLocalDb, type SqliteDatabase } from "./sqlite.js";
import type { HallFeedbackSubmitInput } from "../shared/hall-feedback/schema.js";

let db: SqliteDatabase | null = null;

export async function initHallFeedbackStore(): Promise<void> {
  db = await getSharedLocalDb();
  log("Hall feedback store ready", "feedback");
}

function requireDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall feedback store not initialized");
  }
  return db;
}

export function hashFeedbackIp(ip: string): string {
  return crypto.createHash("sha256").update(`hall-fb:${ip}`).digest("hex").slice(0, 32);
}

export function insertHallFeedback(
  input: HallFeedbackSubmitInput,
  meta: { sessionId?: string; ipHash?: string; userAgent?: string },
): void {
  const database = requireDb();
  database
    .prepare(
      `INSERT INTO hall_feedback (message, email, channel, source, page_path, session_id, ip_hash, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.message.trim(),
      input.email?.trim() || null,
      "general",
      input.source || "unknown",
      input.page_path?.trim() || null,
      meta.sessionId || null,
      meta.ipHash || null,
      (meta.userAgent || "").slice(0, 240) || null,
    );
}

export function countRecentFeedbackFromIp(ipHash: string, windowMinutes = 30): number {
  const database = requireDb();
  const row = database
    .prepare(
      `SELECT COUNT(*) AS c FROM hall_feedback
       WHERE ip_hash = ? AND datetime(created_at) > datetime('now', ?)`,
    )
    .get(ipHash, `-${windowMinutes} minutes`) as { c: number } | undefined;
  return row?.c ?? 0;
}
