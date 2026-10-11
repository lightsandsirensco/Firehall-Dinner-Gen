import { insertAnalyticsEvents } from "../analytics/analytics-store.js";
import { getUserSubscription } from "./store.js";
import { pgProTrialRepo } from "./pro-trial-store.js";
import type { ProTrialDeps } from "./pro-trial.js";

/** Production trial deps; premium_trial_started is recorded server-side so it can't be skipped or double-fired. */
export function proTrialDeps(sessionId?: string): ProTrialDeps {
  return {
    repo: pgProTrialRepo,
    getSubscription: getUserSubscription,
    now: () => new Date(),
    onStarted(record) {
      try {
        insertAnalyticsEvents(
          [
            {
              event_type: "premium_trial_started",
              route: "/api/billing/trial",
              metadata: {
                start_source: record.start_source,
                ...(record.paywall_source ? { paywall_source: record.paywall_source } : {}),
              },
            },
          ],
          sessionId,
        );
      } catch {
        /* optional */
      }
    },
  };
}
