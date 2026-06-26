import type { HallRole } from "../hall-membership/types.js";
import { canManageCanteenList } from "../hall-canteen/types.js";

export const CANTEEN_PAYMENT_FREQUENCIES = ["monthly", "semi_annual", "annual"] as const;
export type CanteenPaymentFrequency = (typeof CANTEEN_PAYMENT_FREQUENCIES)[number];

export const CANTEEN_PAYMENT_STATUSES = ["paid", "due", "overdue"] as const;
export type CanteenPaymentStatus = (typeof CANTEEN_PAYMENT_STATUSES)[number];

export const CANTEEN_PAYMENT_STATUS_FILTERS = ["all", ...CANTEEN_PAYMENT_STATUSES] as const;
export type CanteenPaymentStatusFilter = (typeof CANTEEN_PAYMENT_STATUS_FILTERS)[number];

export const CANTEEN_PAYMENT_FREQUENCY_LABELS: Record<CanteenPaymentFrequency, string> = {
  monthly: "Monthly",
  semi_annual: "Semi-Annual",
  annual: "Annual",
};

export const CANTEEN_PAYMENT_STATUS_LABELS: Record<CanteenPaymentStatus, string> = {
  paid: "Paid",
  due: "Due",
  overdue: "Overdue",
};

export interface CanteenDuesMemberRecord {
  enrollment_id: string;
  hall_id: string;
  user_id: string;
  frequency: CanteenPaymentFrequency;
  next_due_date: string;
  last_paid_at: string | null;
  enrolled_at: string;
  enrolled_by_user_id: string | null;
}

export interface CanteenDuesMemberView {
  enrollment_id: string;
  user_id: string;
  display_name: string;
  role: HallRole;
  shift_name: string | null;
  frequency: CanteenPaymentFrequency;
  frequency_label: string;
  next_due_date: string;
  last_paid_at: string | null;
  status: CanteenPaymentStatus;
  status_label: string;
}

export interface CanteenDuesHistoryEntry {
  history_id: string;
  user_id: string;
  display_name: string;
  paid_at: string;
  marked_by_display_name: string;
  due_date_at_payment: string;
  frequency: CanteenPaymentFrequency;
  frequency_label: string;
}

export interface CanteenDuesSummary {
  total_members: number;
  paid: number;
  outstanding: number;
  overdue: number;
}

export interface CanteenPaymentsPayload {
  hall_id: string;
  can_manage: boolean;
  enrolled_count: number;
  hall_member_count: number;
  summary: CanteenDuesSummary;
  members: CanteenDuesMemberView[];
  recent_history: CanteenDuesHistoryEntry[];
}

export function canManageCanteenPayments(role: HallRole): boolean {
  return canManageCanteenList(role);
}

function parseIsoDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addFrequencyPeriod(from: Date, frequency: CanteenPaymentFrequency): Date {
  const next = new Date(from);
  switch (frequency) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "semi_annual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export function initialDueDate(from = new Date(), frequency: CanteenPaymentFrequency = "monthly"): string {
  return formatIsoDate(addFrequencyPeriod(from, frequency));
}

export function computePaymentStatus(
  nextDueDate: string,
  lastPaidAt: string | null,
  today = new Date(),
): CanteenPaymentStatus {
  const due = parseIsoDate(nextDueDate);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (todayStart.getTime() > due.getTime()) return "overdue";
  if (lastPaidAt) return "paid";
  return "due";
}

export function summarizePaymentMembers(
  members: Pick<CanteenDuesMemberView, "status">[],
): CanteenDuesSummary {
  let paid = 0;
  let outstanding = 0;
  let overdue = 0;
  for (const member of members) {
    if (member.status === "paid") paid += 1;
    else if (member.status === "due") outstanding += 1;
    else overdue += 1;
  }
  return {
    total_members: members.length,
    paid,
    outstanding,
    overdue,
  };
}

export function filterMembersByStatus<T extends { status: CanteenPaymentStatus }>(
  members: T[],
  filter: CanteenPaymentStatusFilter,
): T[] {
  if (filter === "all") return members;
  return members.filter((member) => member.status === filter);
}

export function memberDisplayLabel(displayName: string | null, email: string | null): string {
  if (displayName?.trim()) return displayName.trim();
  if (email?.trim()) return email.split("@")[0] ?? "Member";
  return "Member";
}
