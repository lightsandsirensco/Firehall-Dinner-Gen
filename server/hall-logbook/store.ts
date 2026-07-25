import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import { normalizeHallRole, type HallRole } from "../../shared/hall-membership/types.js";
import type { HallLogbookEntry, HallLogbookPayload } from "../../shared/hall-logbook/types.js";

let db: SqliteDatabase;

export async function initHallLogbookStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallLogbookDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Hall logbook store not initialized");
  return db;
}

function memberRole(hallId: string, userId: string): HallRole | null {
  const member = getHallMember(hallId, userId);
  return member ? normalizeHallRole(member.role) : null;
}

function rowToEntry(row: Record<string, unknown>): HallLogbookEntry {
  return {
    entry_id: String(row.entry_id),
    category: String(row.category),
    title: String(row.title),
    body: row.body ? String(row.body) : null,
    source: row.source === "human" ? "human" : "auto",
    author_user_id: row.author_user_id ? String(row.author_user_id) : null,
    created_at: String(row.created_at),
  };
}

export function getHallLogbookPayload(
  hallId: string,
  userId: string,
  limit = 40,
): HallLogbookPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  const readRow = getDb()
    .prepare(
      `SELECT last_read_at FROM hall_logbook_reads WHERE hall_id = ? AND user_id = ?`,
    )
    .get(hallId, userId) as { last_read_at: string } | undefined;
  const lastReadAt = readRow?.last_read_at ?? null;

  const rows = getDb()
    .prepare(
      `SELECT * FROM hall_logbook_entries
       WHERE hall_id = ? AND archived_at IS NULL
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(hallId, limit) as Record<string, unknown>[];

  const entries = rows.map(rowToEntry);
  const unread_count = lastReadAt
    ? entries.filter((e) => e.created_at > lastReadAt).length
    : entries.length;

  return {
    hall_id: hallId,
    last_read_at: lastReadAt,
    unread_count,
    entries,
  };
}

export function markLogbookRead(hallId: string, userId: string): HallLogbookPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  getDb()
    .prepare(
      `INSERT INTO hall_logbook_reads (hall_id, user_id, last_read_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(hall_id, user_id) DO UPDATE SET last_read_at = datetime('now')`,
    )
    .run(hallId, userId);

  return getHallLogbookPayload(hallId, userId);
}

export function createLogbookEntry(
  hallId: string,
  userId: string,
  input: { title: string; body?: string | null; category?: string },
): HallLogbookPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  getDb()
    .prepare(
      `INSERT INTO hall_logbook_entries
        (entry_id, hall_id, category, title, body, source, author_user_id)
       VALUES (?, ?, ?, ?, ?, 'human', ?)`,
    )
    .run(
      nanoid(),
      hallId,
      input.category?.trim() || "general",
      input.title.trim(),
      input.body?.trim() || null,
      userId,
    );

  return getHallLogbookPayload(hallId, userId);
}
