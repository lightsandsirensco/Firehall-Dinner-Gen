import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { shouldSendShiftReminder } from "../../shared/shift-reminder/scheduling.js";
import { normalizeShiftDays } from "../../shared/shift-reminder/schema.js";
import type {
  ShiftReminderAction,
  ShiftReminderSettings,
  ShiftWeekday,
} from "../../shared/shift-reminder/types.js";
import {
  DEFAULT_SHIFT_REMINDER_TIME,
  DEFAULT_SHIFT_REMINDER_TIMEZONE,
} from "../../shared/shift-reminder/types.js";

let db: SqliteDatabase;

export async function initShiftReminderStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindShiftReminderDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Shift reminder store not initialized");
  }
  return db;
}

function parseJsonArray(raw: unknown): number[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    return normalizeShiftDays(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function rowToShiftReminderSettings(row: Record<string, unknown>): ShiftReminderSettings {
  return {
    shift_reminders_enabled: Number(row.shift_reminders_enabled) === 1,
    shift_days: parseJsonArray(row.shift_days_json) as ShiftWeekday[],
    shift_reminder_time:
      typeof row.shift_reminder_time === "string" && row.shift_reminder_time
        ? row.shift_reminder_time
        : DEFAULT_SHIFT_REMINDER_TIME,
    shift_reminder_timezone:
      typeof row.shift_reminder_timezone === "string" && row.shift_reminder_timezone
        ? row.shift_reminder_timezone
        : DEFAULT_SHIFT_REMINDER_TIMEZONE,
  };
}

export interface ShiftReminderCandidate {
  user_id: string;
  email: string;
  display_name: string | null;
  settings: ShiftReminderSettings;
  shift_date: string;
}

export function listDueShiftReminders(now = new Date()): ShiftReminderCandidate[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT u.user_id, u.email, p.display_name, pref.*
       FROM users u
       INNER JOIN user_preferences pref ON pref.user_id = u.user_id
       LEFT JOIN user_profiles p ON p.user_id = u.user_id
       WHERE u.is_guest = 0
         AND u.email IS NOT NULL
         AND pref.shift_reminders_enabled = 1
         AND pref.shift_days_json IS NOT NULL
         AND pref.shift_days_json != '[]'`,
    )
    .all() as Record<string, unknown>[];

  const due: ShiftReminderCandidate[] = [];

  for (const row of rows) {
    const email = row.email ? String(row.email) : "";
    if (!email) continue;

    const settings = rowToShiftReminderSettings(row);
    if (!settings.shift_days.length) continue;

    const userId = String(row.user_id);
    const decision = shouldSendShiftReminder({
      shiftDays: settings.shift_days,
      reminderTime: settings.shift_reminder_time,
      timeZone: settings.shift_reminder_timezone,
      now,
    });
    if (!decision.send || !decision.shiftDate) continue;

    const existing = d
      .prepare(`SELECT send_id FROM shift_reminder_sends WHERE user_id = ? AND shift_date = ?`)
      .get(userId, decision.shiftDate) as { send_id: string } | undefined;
    if (existing) continue;

    due.push({
      user_id: userId,
      email,
      display_name: row.display_name ? String(row.display_name) : null,
      settings,
      shift_date: decision.shiftDate,
    });
  }

  return due;
}

export function createShiftReminderSend(userId: string, shiftDate: string): string {
  const d = getDb();
  const sendId = nanoid();
  d.prepare(
    `INSERT INTO shift_reminder_sends (send_id, user_id, shift_date, sent_at)
     VALUES (?, ?, ?, datetime('now'))`,
  ).run(sendId, userId, shiftDate);
  return sendId;
}

export function markShiftReminderOpened(sendId: string): boolean {
  const d = getDb();
  const row = d
    .prepare(`SELECT send_id, opened_at FROM shift_reminder_sends WHERE send_id = ?`)
    .get(sendId) as { send_id: string; opened_at: string | null } | undefined;
  if (!row) return false;
  if (!row.opened_at) {
    d.prepare(`UPDATE shift_reminder_sends SET opened_at = datetime('now') WHERE send_id = ?`).run(sendId);
    return true;
  }
  return false;
}

export function markShiftReminderClicked(
  sendId: string,
  action: ShiftReminderAction,
): { user_id: string; shift_date: string; firstClick: boolean } | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT send_id, user_id, shift_date, last_clicked_at FROM shift_reminder_sends WHERE send_id = ?`)
    .get(sendId) as
    | { send_id: string; user_id: string; shift_date: string; last_clicked_at: string | null }
    | undefined;
  if (!row) return null;

  const firstClick = !row.last_clicked_at;
  d.prepare(
    `UPDATE shift_reminder_sends
     SET last_clicked_action = ?, last_clicked_at = datetime('now'),
         opened_at = COALESCE(opened_at, datetime('now'))
     WHERE send_id = ?`,
  ).run(action, sendId);

  return { user_id: row.user_id, shift_date: row.shift_date, firstClick };
}

export function getShiftReminderSend(sendId: string): {
  send_id: string;
  user_id: string;
  shift_date: string;
} | null {
  const d = getDb();
  const row = d
    .prepare(`SELECT send_id, user_id, shift_date FROM shift_reminder_sends WHERE send_id = ?`)
    .get(sendId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return {
    send_id: String(row.send_id),
    user_id: String(row.user_id),
    shift_date: String(row.shift_date),
  };
}

export function evaluateShiftReminderForUser(
  userId: string,
  now = new Date(),
): ShiftReminderCandidate | null {
  const d = getDb();
  const row = d
    .prepare(
      `SELECT u.user_id, u.email, p.display_name, pref.*
       FROM users u
       INNER JOIN user_preferences pref ON pref.user_id = u.user_id
       LEFT JOIN user_profiles p ON p.user_id = u.user_id
       WHERE u.user_id = ?`,
    )
    .get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const email = row.email ? String(row.email) : "";
  if (!email) return null;

  const settings = rowToShiftReminderSettings(row);
  if (!settings.shift_reminders_enabled || !settings.shift_days.length) return null;

  const decision = shouldSendShiftReminder({
    shiftDays: settings.shift_days,
    reminderTime: settings.shift_reminder_time,
    timeZone: settings.shift_reminder_timezone,
    now,
  });
  if (!decision.send || !decision.shiftDate) return null;

  const existing = d
    .prepare(`SELECT send_id FROM shift_reminder_sends WHERE user_id = ? AND shift_date = ?`)
    .get(userId, decision.shiftDate) as { send_id: string } | undefined;
  if (existing) return null;

  return {
    user_id: userId,
    email,
    display_name: row.display_name ? String(row.display_name) : null,
    settings,
    shift_date: decision.shiftDate,
  };
}
