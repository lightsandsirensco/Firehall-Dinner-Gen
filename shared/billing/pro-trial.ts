/**
 * Personal Pro reverse trial — PRO_TRIAL_DAYS of Firehall Meals Pro with no
 * card, once per account. It starts at the EARLIER of:
 *   - the user completing their first Shift Plan (every required meal slot
 *     has a meal, is skipped, or is BYO — optional Late Night may stay open;
 *     see isPlanComplete in shared/shift-plan/plan.ts), or
 *   - the user explicitly starting it from a Premium paywall.
 * Schedule setup alone never starts it.
 *
 * The trial row is durable server state (personal_pro_trials). Its existence
 * IS the "trial used" flag — it is never deleted on expiry, so a second trial
 * is impossible for the same account on any device or browser.
 *
 * All timing is absolute (UTC instants), never local calendar dates, so a
 * trial lasts exactly PRO_TRIAL_DAYS × 24h in every timezone and across DST.
 */
import {
  PRO_TRIAL_DAYS,
  subscriptionIsEntitled,
  type PlanId,
  type UserSubscription,
} from "./types.js";

export const PRO_TRIAL_START_SOURCES = ["first_shift_plan", "paywall"] as const;
export type ProTrialStartSource = (typeof PRO_TRIAL_START_SOURCES)[number];

/** Show the one "trial ends soon" notice once this many days (or fewer) remain. */
export const PRO_TRIAL_ENDING_NOTICE_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Stored row (personal_pro_trials). */
export interface ProTrialRecord {
  user_id: string;
  trial_started_at: string;
  trial_expires_at: string;
  start_source: ProTrialStartSource;
  /** Paywall surface when start_source === "paywall". */
  paywall_source: string | null;
  /** "Trial ends soon" notice already shown (shown at most once per account). */
  ending_notice_seen_at: string | null;
  /** "Your trial ended" notice already shown (shown at most once per account). */
  expired_notice_seen_at: string | null;
  /** premium_trial_expired already recorded (server-side, at most once). */
  expired_recorded_at: string | null;
}

/** What the client sees in UserBillingState.pro_trial. */
export interface ProTrialState {
  status: "active" | "expired";
  started_at: string;
  expires_at: string;
  /** Whole days left, rounded up (0 once expired). */
  days_left: number;
  start_source: ProTrialStartSource;
  show_ending_notice: boolean;
  show_expired_notice: boolean;
}

export function proTrialWindow(startedAt: Date): { trial_started_at: string; trial_expires_at: string } {
  return {
    trial_started_at: startedAt.toISOString(),
    trial_expires_at: new Date(startedAt.getTime() + PRO_TRIAL_DAYS * DAY_MS).toISOString(),
  };
}

/** Active until the exact expiry instant. An unparseable expiry fails closed. */
export function isProTrialActive(
  record: Pick<ProTrialRecord, "trial_expires_at"> | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!record) return false;
  const expiresMs = Date.parse(record.trial_expires_at);
  if (Number.isNaN(expiresMs)) return false;
  return expiresMs > now.getTime();
}

export function proTrialDaysLeft(expiresAt: string, now: Date = new Date()): number {
  const ms = Date.parse(expiresAt) - now.getTime();
  if (Number.isNaN(ms) || ms <= 0) return 0;
  return Math.ceil(ms / DAY_MS);
}

export function proTrialState(record: ProTrialRecord | null, now: Date = new Date()): ProTrialState | null {
  if (!record) return null;
  const active = isProTrialActive(record, now);
  const daysLeft = active ? proTrialDaysLeft(record.trial_expires_at, now) : 0;
  return {
    status: active ? "active" : "expired",
    started_at: record.trial_started_at,
    expires_at: record.trial_expires_at,
    days_left: daysLeft,
    start_source: record.start_source,
    show_ending_notice: active && daysLeft <= PRO_TRIAL_ENDING_NOTICE_DAYS && !record.ending_notice_seen_at,
    show_expired_notice: !active && !record.expired_notice_seen_at,
  };
}

/** "Pro trial · 9 days left" */
export function proTrialStatusLabel(state: Pick<ProTrialState, "days_left">): string {
  return `Pro trial · ${state.days_left} day${state.days_left === 1 ? "" : "s"} left`;
}

/** Pro through a real subscription/grant (not the trial). */
export function hasSubscribedPro(subscription: UserSubscription | null, now: Date = new Date()): boolean {
  return Boolean(
    subscription && subscription.plan_id === "firefighter_plus" && subscriptionIsEntitled(subscription, now),
  );
}

export type ProTrialIneligibleReason = "trial_used" | "already_pro";

export function proTrialEligibility(input: {
  record: ProTrialRecord | null;
  subscription: UserSubscription | null;
  now?: Date;
}): { eligible: true } | { eligible: false; reason: ProTrialIneligibleReason } {
  if (input.record) return { eligible: false, reason: "trial_used" };
  if (hasSubscribedPro(input.subscription, input.now)) return { eligible: false, reason: "already_pro" };
  return { eligible: true };
}

/**
 * The personal plan a signed-in user gets before catalog enable checks:
 * subscribed Pro, else an active trial, else whatever their (entitled) row
 * says, else Free ("personal"). Expiry needs no write — it's just time.
 */
export function personalPlanFromSources(input: {
  subscription: UserSubscription | null;
  trial: ProTrialRecord | null;
  now?: Date;
}): PlanId {
  const now = input.now ?? new Date();
  if (hasSubscribedPro(input.subscription, now)) return "firefighter_plus";
  if (isProTrialActive(input.trial, now)) return "firefighter_plus";
  if (input.subscription && subscriptionIsEntitled(input.subscription, now)) return input.subscription.plan_id;
  return "personal";
}
