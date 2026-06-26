import { randomUUID } from "node:crypto";
import type { Database } from "better-sqlite3";
import { getHallMember, listHallMembers } from "../hall-membership/store.js";
import {
  addFrequencyPeriod,
  canManageCanteenPayments,
  computePaymentStatus,
  initialDueDate,
  memberDisplayLabel,
  summarizePaymentMembers,
  type CanteenDuesHistoryEntry,
  type CanteenDuesMemberRecord,
  type CanteenDuesMemberView,
  type CanteenPaymentFrequency,
  type CanteenPaymentsPayload,
} from "../../shared/hall-canteen-payments/types.js";
import {
  CANTEEN_PAYMENT_FREQUENCY_LABELS,
  CANTEEN_PAYMENT_STATUS_LABELS,
} from "../../shared/hall-canteen-payments/types.js";

let db: Database | null = null;

export function bindHallCanteenPaymentsDb(database: Database): void {
  db = database;
}

function getDb(): Database {
  if (!db) throw new Error("Hall canteen payments store not initialized");
  return db;
}

export async function initHallCanteenPaymentsStore(): Promise<void> {
  getDb();
}

function memberDisplayName(hallId: string, userId: string): string {
  const member = getHallMember(hallId, userId);
  return memberDisplayLabel(member?.display_name ?? null, member?.email ?? null);
}

function rowToRecord(row: Record<string, unknown>): CanteenDuesMemberRecord {
  return {
    enrollment_id: String(row.enrollment_id),
    hall_id: String(row.hall_id),
    user_id: String(row.user_id),
    frequency: String(row.frequency) as CanteenPaymentFrequency,
    next_due_date: String(row.next_due_date).slice(0, 10),
    last_paid_at: row.last_paid_at ? String(row.last_paid_at) : null,
    enrolled_at: String(row.enrolled_at),
    enrolled_by_user_id: row.enrolled_by_user_id ? String(row.enrolled_by_user_id) : null,
  };
}

function toMemberView(hallId: string, record: CanteenDuesMemberRecord): CanteenDuesMemberView {
  const member = getHallMember(hallId, record.user_id);
  const status = computePaymentStatus(record.next_due_date, record.last_paid_at);
  return {
    enrollment_id: record.enrollment_id,
    user_id: record.user_id,
    display_name: memberDisplayLabel(member?.display_name ?? null, member?.email ?? null),
    role: member?.role ?? "member",
    shift_name: member?.shift_name ?? null,
    frequency: record.frequency,
    frequency_label: CANTEEN_PAYMENT_FREQUENCY_LABELS[record.frequency],
    next_due_date: record.next_due_date,
    last_paid_at: record.last_paid_at,
    status,
    status_label: CANTEEN_PAYMENT_STATUS_LABELS[status],
  };
}

function listEnrollments(hallId: string): CanteenDuesMemberRecord[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT enrollment_id, hall_id, user_id, frequency, next_due_date, last_paid_at, enrolled_at, enrolled_by_user_id
       FROM hall_canteen_dues_members
       WHERE hall_id = ?
       ORDER BY next_due_date ASC`,
    )
    .all(hallId) as Array<Record<string, unknown>>;
  return rows.map(rowToRecord);
}

function listRecentHistory(hallId: string, limit = 8): CanteenDuesHistoryEntry[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT h.history_id, h.user_id, h.paid_at, h.marked_by_user_id, h.due_date_at_payment, h.frequency
       FROM hall_canteen_dues_history h
       WHERE h.hall_id = ?
       ORDER BY h.paid_at DESC
       LIMIT ?`,
    )
    .all(hallId, limit) as Array<Record<string, unknown>>;

  return rows.map((row) => {
    const frequency = String(row.frequency) as CanteenPaymentFrequency;
    return {
      history_id: String(row.history_id),
      user_id: String(row.user_id),
      display_name: memberDisplayName(hallId, String(row.user_id)),
      paid_at: String(row.paid_at),
      marked_by_display_name: memberDisplayName(hallId, String(row.marked_by_user_id)),
      due_date_at_payment: String(row.due_date_at_payment).slice(0, 10),
      frequency,
      frequency_label: CANTEEN_PAYMENT_FREQUENCY_LABELS[frequency],
    };
  });
}

export function getCanteenPaymentsPayload(
  hallId: string,
  userId: string,
): CanteenPaymentsPayload | null {
  const member = getHallMember(hallId, userId);
  if (!member) return null;

  const enrollments = listEnrollments(hallId);
  const members = enrollments.map((record) => toMemberView(hallId, record));
  const hallMembers = listHallMembers(hallId);

  return {
    hall_id: hallId,
    can_manage: canManageCanteenPayments(member.role),
    enrolled_count: members.length,
    hall_member_count: hallMembers.length,
    summary: summarizePaymentMembers(members),
    members,
    recent_history: listRecentHistory(hallId),
  };
}

export function enrollAllCanteenMembers(
  hallId: string,
  actorUserId: string,
): CanteenPaymentsPayload | null {
  const actor = getHallMember(hallId, actorUserId);
  if (!actor || !canManageCanteenPayments(actor.role)) return null;

  const d = getDb();
  const hallMembers = listHallMembers(hallId);
  const insert = d.prepare(
    `INSERT OR IGNORE INTO hall_canteen_dues_members
      (enrollment_id, hall_id, user_id, frequency, next_due_date, enrolled_by_user_id)
     VALUES (?, ?, ?, 'monthly', ?, ?)`,
  );

  for (const hallMember of hallMembers) {
    insert.run(
      randomUUID(),
      hallId,
      hallMember.user_id,
      initialDueDate(new Date(), "monthly"),
      actorUserId,
    );
  }

  return getCanteenPaymentsPayload(hallId, actorUserId);
}

export function updateCanteenMemberFrequency(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
  frequency: CanteenPaymentFrequency,
): CanteenPaymentsPayload | null {
  const actor = getHallMember(hallId, actorUserId);
  if (!actor || !canManageCanteenPayments(actor.role)) return null;

  const d = getDb();
  const existing = d
    .prepare(
      `SELECT enrollment_id FROM hall_canteen_dues_members WHERE hall_id = ? AND user_id = ?`,
    )
    .get(hallId, targetUserId) as { enrollment_id: string } | undefined;
  if (!existing) return null;

  d.prepare(
    `UPDATE hall_canteen_dues_members SET frequency = ? WHERE hall_id = ? AND user_id = ?`,
  ).run(frequency, hallId, targetUserId);

  return getCanteenPaymentsPayload(hallId, actorUserId);
}

export function markCanteenMemberPaid(
  hallId: string,
  actorUserId: string,
  targetUserId: string,
): CanteenPaymentsPayload | null {
  const actor = getHallMember(hallId, actorUserId);
  if (!actor || !canManageCanteenPayments(actor.role)) return null;

  const d = getDb();
  const row = d
    .prepare(
      `SELECT enrollment_id, frequency, next_due_date FROM hall_canteen_dues_members
       WHERE hall_id = ? AND user_id = ?`,
    )
    .get(hallId, targetUserId) as
    | { enrollment_id: string; frequency: string; next_due_date: string }
    | undefined;
  if (!row) return null;

  const frequency = String(row.frequency) as CanteenPaymentFrequency;
  const dueDateAtPayment = String(row.next_due_date).slice(0, 10);
  const paidAt = new Date();
  const nextDue = addFrequencyPeriod(paidAt, frequency);
  const nextDueIso = `${nextDue.getFullYear()}-${String(nextDue.getMonth() + 1).padStart(2, "0")}-${String(nextDue.getDate()).padStart(2, "0")}`;

  d.prepare(
    `UPDATE hall_canteen_dues_members
     SET last_paid_at = datetime('now'), next_due_date = ?
     WHERE hall_id = ? AND user_id = ?`,
  ).run(nextDueIso, hallId, targetUserId);

  d.prepare(
    `INSERT INTO hall_canteen_dues_history
      (history_id, hall_id, user_id, paid_at, marked_by_user_id, due_date_at_payment, frequency)
     VALUES (?, ?, ?, datetime('now'), ?, ?, ?)`,
  ).run(randomUUID(), hallId, targetUserId, actorUserId, dueDateAtPayment, frequency);

  return getCanteenPaymentsPayload(hallId, actorUserId);
}
