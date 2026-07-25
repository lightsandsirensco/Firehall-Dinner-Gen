import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import { normalizeHallRole, type HallRole } from "../../shared/hall-membership/types.js";
import { emitHallEvent } from "../hall-events/store.js";
import { HallEventTypes } from "../../shared/hall-events/types.js";
import type {
  HallBoardNote,
  HallBoardPayload,
  HallBoardPulse,
  HallBoardTonight,
  BoardNoteIntent,
} from "../../shared/hall-board/types.js";

let db: SqliteDatabase;

export async function initHallBoardStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallBoardDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) throw new Error("Hall board store not initialized");
  return db;
}

function memberRole(hallId: string, userId: string): HallRole | null {
  const member = getHallMember(hallId, userId);
  return member ? normalizeHallRole(member.role) : null;
}

function canManageBoard(role: HallRole): boolean {
  return role === "captain" || role === "canteen_manager";
}

function ensureTonightRow(hallId: string): void {
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO hall_board_tonight (hall_id, status) VALUES (?, 'empty')`,
    )
    .run(hallId);
}

function getTonight(hallId: string): HallBoardTonight {
  ensureTonightRow(hallId);
  const row = getDb()
    .prepare(`SELECT * FROM hall_board_tonight WHERE hall_id = ?`)
    .get(hallId) as Record<string, unknown>;
  return {
    dinner_title: row.dinner_title ? String(row.dinner_title) : null,
    dinner_slug: row.dinner_slug ? String(row.dinner_slug) : null,
    status: String(row.status) as HallBoardTonight["status"],
    hold_note: row.hold_note ? String(row.hold_note) : null,
    cook_user_id: row.cook_user_id ? String(row.cook_user_id) : null,
    runner_user_id: row.runner_user_id ? String(row.runner_user_id) : null,
    you_are_cook: false,
    you_are_runner: false,
  };
}

function listPulses(hallId: string): HallBoardPulse[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM hall_board_pulses
       WHERE hall_id = ?
         AND cleared_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY priority DESC, created_at DESC
       LIMIT 3`,
    )
    .all(hallId) as Record<string, unknown>[];

  return rows.map((row) => ({
    pulse_id: String(row.pulse_id),
    pulse_kind: String(row.pulse_kind),
    title: String(row.title),
    href: row.href ? String(row.href) : null,
    priority: Number(row.priority ?? 50),
  }));
}

function listPins(hallId: string): HallBoardNote[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM hall_board_notes
       WHERE hall_id = ?
         AND archived_at IS NULL
         AND pinned = 1
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND (intent != 'broken' OR fixed_at IS NULL)
       ORDER BY pinned_order ASC, created_at DESC
       LIMIT 3`,
    )
    .all(hallId) as Record<string, unknown>[];
  return rows.map(rowToNote);
}

function listComingUp(hallId: string): HallBoardNote[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM hall_board_notes
       WHERE hall_id = ?
         AND archived_at IS NULL
         AND pinned = 0
         AND fixed_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY
         CASE WHEN event_at IS NULL THEN 1 ELSE 0 END,
         event_at ASC,
         created_at DESC
       LIMIT 5`,
    )
    .all(hallId) as Record<string, unknown>[];
  return rows.map(rowToNote);
}

function rowToNote(row: Record<string, unknown>): HallBoardNote {
  return {
    note_id: String(row.note_id),
    intent: String(row.intent) as BoardNoteIntent,
    title: String(row.title),
    body: row.body ? String(row.body) : null,
    pinned: Number(row.pinned) === 1,
    event_at: row.event_at ? String(row.event_at) : null,
    expires_at: row.expires_at ? String(row.expires_at) : null,
    author_user_id: String(row.author_user_id),
    fixed_at: row.fixed_at ? String(row.fixed_at) : null,
    created_at: String(row.created_at),
  };
}

function duesPulse(hallId: string): HallBoardPulse | null {
  try {
    const row = getDb()
      .prepare(
        `SELECT COUNT(*) AS c FROM hall_canteen_dues_members
         WHERE hall_id = ?
           AND date(next_due_date) < date('now')
           AND (status_override IS NULL OR status_override NOT IN ('leave', 'exempt', 'inactive'))`,
      )
      .get(hallId) as { c: number } | undefined;
    const overdue = Number(row?.c ?? 0);
    if (overdue <= 0) return null;
    return {
      pulse_id: `dues-overdue-${hallId}`,
      pulse_kind: "dues",
      title: `${overdue} overdue on dues`,
      href: "/hall/dues",
      priority: 70,
    };
  } catch {
    return null;
  }
}

export function getHallBoardPayload(hallId: string, userId: string): HallBoardPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  const tonight = getTonight(hallId);
  tonight.you_are_cook = tonight.cook_user_id === userId;
  tonight.you_are_runner = tonight.runner_user_id === userId;

  const pulses = listPulses(hallId);
  const dues = duesPulse(hallId);
  if (dues && !pulses.some((p) => p.pulse_kind === "dues")) {
    pulses.push(dues);
    pulses.sort((a, b) => b.priority - a.priority);
    while (pulses.length > 3) pulses.pop();
  }

  return {
    hall_id: hallId,
    tonight,
    pulses,
    pins: listPins(hallId),
    coming_up: listComingUp(hallId),
    can_manage: canManageBoard(role),
  };
}

export function updateBoardTonight(
  hallId: string,
  userId: string,
  patch: {
    dinner_title?: string | null;
    dinner_slug?: string | null;
    status?: HallBoardTonight["status"];
    hold_note?: string | null;
    cook_user_id?: string | null;
    runner_user_id?: string | null;
  },
): HallBoardPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  ensureTonightRow(hallId);
  const current = getTonight(hallId);
  const nextStatus = patch.status ?? current.status;
  const nextTitle =
    patch.dinner_title !== undefined ? patch.dinner_title : current.dinner_title;
  const nextSlug =
    patch.dinner_slug !== undefined ? patch.dinner_slug : current.dinner_slug;
  const nextHold =
    nextStatus === "on_hold"
      ? patch.hold_note !== undefined
        ? patch.hold_note
        : current.hold_note
      : null;
  const nextCook =
    patch.cook_user_id !== undefined ? patch.cook_user_id : current.cook_user_id;
  const nextRunner =
    patch.runner_user_id !== undefined ? patch.runner_user_id : current.runner_user_id;

  getDb()
    .prepare(
      `UPDATE hall_board_tonight
       SET dinner_title = ?,
           dinner_slug = ?,
           status = ?,
           hold_note = ?,
           cook_user_id = ?,
           runner_user_id = ?,
           updated_at = datetime('now')
       WHERE hall_id = ?`,
    )
    .run(nextTitle, nextSlug, nextStatus, nextHold, nextCook, nextRunner, hallId);

  if (patch.status === "locked") {
    emitHallEvent({
      hall_id: hallId,
      event_type: HallEventTypes.MEAL_LOCKED,
      actor_user_id: userId,
      aggregate_type: "dinner",
      aggregate_id: hallId,
      payload: { dinner_title: nextTitle, dinner_slug: nextSlug },
    });
  }

  return getHallBoardPayload(hallId, userId);
}

export function createBoardNote(
  hallId: string,
  userId: string,
  input: {
    intent: BoardNoteIntent;
    title: string;
    body?: string | null;
    pinned?: boolean;
    event_at?: string | null;
    expires_at?: string | null;
  },
): HallBoardPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  const pinned = Boolean(input.pinned) && canManageBoard(role);
  if (pinned) {
    const pinCount = getDb()
      .prepare(
        `SELECT COUNT(*) AS c FROM hall_board_notes
         WHERE hall_id = ? AND pinned = 1 AND archived_at IS NULL`,
      )
      .get(hallId) as { c: number };
    if (Number(pinCount.c) >= 3) return null;
  }

  const noteId = nanoid();
  getDb()
    .prepare(
      `INSERT INTO hall_board_notes
        (note_id, hall_id, intent, title, body, pinned, event_at, expires_at, author_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      noteId,
      hallId,
      input.intent,
      input.title.trim(),
      input.body?.trim() || null,
      pinned ? 1 : 0,
      input.event_at ?? null,
      input.expires_at ?? null,
      userId,
    );

  emitHallEvent({
    hall_id: hallId,
    event_type: HallEventTypes.BOARD_NOTE_POSTED,
    actor_user_id: userId,
    aggregate_type: "board_note",
    aggregate_id: noteId,
    payload: { intent: input.intent, title: input.title.trim() },
  });

  return getHallBoardPayload(hallId, userId);
}

export function fixBoardNote(
  hallId: string,
  userId: string,
  noteId: string,
): HallBoardPayload | null {
  const role = memberRole(hallId, userId);
  if (!role) return null;

  getDb()
    .prepare(
      `UPDATE hall_board_notes
       SET fixed_at = datetime('now'), updated_at = datetime('now'), archived_at = datetime('now')
       WHERE note_id = ? AND hall_id = ? AND intent = 'broken' AND fixed_at IS NULL`,
    )
    .run(noteId, hallId);

  const fixed = getDb()
    .prepare(
      `SELECT note_id FROM hall_board_notes
       WHERE note_id = ? AND hall_id = ? AND fixed_at IS NOT NULL`,
    )
    .get(noteId, hallId);
  if (!fixed) return null;

  emitHallEvent({
    hall_id: hallId,
    event_type: HallEventTypes.BOARD_NOTE_FIXED,
    actor_user_id: userId,
    aggregate_type: "board_note",
    aggregate_id: noteId,
  });

  return getHallBoardPayload(hallId, userId);
}

export function setBoardNotePinned(
  hallId: string,
  userId: string,
  noteId: string,
  pinned: boolean,
): HallBoardPayload | null {
  const role = memberRole(hallId, userId);
  if (!role || !canManageBoard(role)) return null;

  if (pinned) {
    const pinCount = getDb()
      .prepare(
        `SELECT COUNT(*) AS c FROM hall_board_notes
         WHERE hall_id = ? AND pinned = 1 AND archived_at IS NULL AND note_id != ?`,
      )
      .get(hallId, noteId) as { c: number };
    if (Number(pinCount.c) >= 3) return null;
  }

  getDb()
    .prepare(
      `UPDATE hall_board_notes SET pinned = ?, updated_at = datetime('now')
       WHERE note_id = ? AND hall_id = ? AND archived_at IS NULL`,
    )
    .run(pinned ? 1 : 0, noteId, hallId);

  return getHallBoardPayload(hallId, userId);
}
