import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import type { HallRole } from "../../shared/hall-membership/types.js";
import { normalizeHallRole } from "../../shared/hall-membership/types.js";
import type { HallNote, HallNotesPayload } from "../../shared/hall-notes/types.js";
import {
  canDeleteAnyHallNote,
  canEditHallNote,
  canViewHallNotes,
} from "../../shared/hall-notes/types.js";

let db: SqliteDatabase;

export async function initHallNotesStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallNotesDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall notes store not initialized");
  }
  return db;
}

function memberRole(hallId: string, userId: string): HallRole | null {
  const member = getHallMember(hallId, userId);
  return member ? normalizeHallRole(member.role) : null;
}

function authorDisplayName(userId: string): string {
  const row = getDb()
    .prepare(
      `SELECT p.display_name, p.first_name, u.email
       FROM user_profiles p
       JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as
    | { display_name: string | null; first_name: string | null; email: string | null }
    | undefined;
  if (!row) return "Crew member";
  return (
    row.display_name?.trim() ||
    row.first_name?.trim() ||
    row.email?.split("@")[0] ||
    "Crew member"
  );
}

function rowToNote(row: Record<string, unknown>): HallNote {
  return {
    note_id: String(row.note_id),
    hall_id: String(row.hall_id),
    author_user_id: String(row.author_user_id),
    author_display_name: String(row.author_display_name),
    message: String(row.message),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function listHallNotes(hallId: string, userId: string, limit = 50): HallNotesPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewHallNotes(role)) return null;

  const rows = getDb()
    .prepare(
      `SELECT n.note_id, n.hall_id, n.author_user_id, n.message, n.created_at, n.updated_at
       FROM hall_notes n
       WHERE n.hall_id = ?
       ORDER BY n.created_at DESC
       LIMIT ?`,
    )
    .all(hallId, limit) as Record<string, unknown>[];

  const notes = rows.map((row) =>
    rowToNote({
      ...row,
      author_display_name: authorDisplayName(String(row.author_user_id)),
    }),
  );

  return {
    notes,
    can_delete_any: canDeleteAnyHallNote(role),
  };
}

export function createHallNote(
  hallId: string,
  userId: string,
  message: string,
): { payload: HallNotesPayload; note: HallNote } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewHallNotes(role)) return null;

  const trimmed = message.trim();
  if (!trimmed) return null;

  const now = new Date().toISOString();
  const noteId = nanoid();
  getDb()
    .prepare(
      `INSERT INTO hall_notes (note_id, hall_id, author_user_id, message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(noteId, hallId, userId, trimmed, now, now);

  const note = rowToNote({
    note_id: noteId,
    hall_id: hallId,
    author_user_id: userId,
    author_display_name: authorDisplayName(userId),
    message: trimmed,
    created_at: now,
    updated_at: now,
  });

  const payload = listHallNotes(hallId, userId);
  if (!payload) return null;
  return { payload, note };
}

export function updateHallNote(
  hallId: string,
  userId: string,
  noteId: string,
  message: string,
): { payload: HallNotesPayload; note: HallNote } | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewHallNotes(role)) return null;

  const row = getDb()
    .prepare(`SELECT * FROM hall_notes WHERE note_id = ? AND hall_id = ?`)
    .get(noteId, hallId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const authorUserId = String(row.author_user_id);
  if (!canEditHallNote(role, authorUserId, userId)) return null;

  const trimmed = message.trim();
  if (!trimmed) return null;

  const now = new Date().toISOString();
  getDb()
    .prepare(`UPDATE hall_notes SET message = ?, updated_at = ? WHERE note_id = ?`)
    .run(trimmed, now, noteId);

  const note = rowToNote({
    ...row,
    message: trimmed,
    updated_at: now,
    author_display_name: authorDisplayName(authorUserId),
  });
  const payload = listHallNotes(hallId, userId);
  if (!payload) return null;
  return { payload, note };
}

export function deleteHallNote(
  hallId: string,
  userId: string,
  noteId: string,
): HallNotesPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canViewHallNotes(role)) return null;

  const row = getDb()
    .prepare(`SELECT author_user_id FROM hall_notes WHERE note_id = ? AND hall_id = ?`)
    .get(noteId, hallId) as { author_user_id: string } | undefined;
  if (!row) return null;

  const canDelete =
    canDeleteAnyHallNote(role) || canEditHallNote(role, row.author_user_id, userId);
  if (!canDelete) return null;

  getDb().prepare(`DELETE FROM hall_notes WHERE note_id = ? AND hall_id = ?`).run(noteId, hallId);
  return listHallNotes(hallId, userId);
}
