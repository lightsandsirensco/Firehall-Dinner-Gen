/**
 * Starting the personal Pro reverse trial. Dependencies are injected so the
 * start rules are testable without Postgres.
 */
import {
  proTrialEligibility,
  proTrialWindow,
  type ProTrialIneligibleReason,
  type ProTrialRecord,
  type ProTrialStartSource,
} from "../../shared/billing/pro-trial.js";
import type { UserSubscription } from "../../shared/billing/types.js";
import type { ProTrialRepo } from "./pro-trial-store.js";

export interface ProTrialDeps {
  repo: ProTrialRepo;
  getSubscription(userId: string): Promise<UserSubscription | null>;
  now(): Date;
  /** Records premium_trial_started (server-side, once per account). */
  onStarted?(record: ProTrialRecord): void;
}

export type StartProTrialResult =
  | { started: true; record: ProTrialRecord }
  | { started: false; reason: ProTrialIneligibleReason; record: ProTrialRecord | null };

export async function startProTrial(
  deps: ProTrialDeps,
  userId: string,
  source: ProTrialStartSource,
  paywallSource?: string | null,
): Promise<StartProTrialResult> {
  const now = deps.now();
  const [record, subscription] = await Promise.all([deps.repo.get(userId), deps.getSubscription(userId)]);
  const eligibility = proTrialEligibility({ record, subscription, now });
  if (!eligibility.eligible) return { started: false, reason: eligibility.reason, record };

  const result = await deps.repo.insertIfAbsent({
    user_id: userId,
    ...proTrialWindow(now),
    start_source: source,
    paywall_source: source === "paywall" ? (paywallSource ?? "").slice(0, 64) || null : null,
    ending_notice_seen_at: null,
    expired_notice_seen_at: null,
    expired_recorded_at: null,
  });
  // Lost a race with a concurrent start (another tab/device) — still only one trial.
  if (!result.created || !result.record) return { started: false, reason: "trial_used", record: result.record };
  deps.onStarted?.(result.record);
  return { started: true, record: result.record };
}
