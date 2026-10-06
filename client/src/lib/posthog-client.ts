/**
 * PostHog — product analytics + session replay. Separate from GA4
 * (analytics-deferred.ts) and internal SQLite product analytics
 * (product-analytics.ts) — do not merge with either.
 *
 * Initialized exactly once (guarded), called from main.tsx. The SDK is
 * dynamically imported after first paint so it stays off the critical render
 * path. No-ops (safe) if VITE_POSTHOG_PROJECT_TOKEN/VITE_POSTHOG_HOST are
 * unset, e.g. in local dev.
 */
import type { PostHog } from "posthog-js";
import { scheduleNonCriticalScripts } from "@/lib/performance";

let initialized = false;
let client: PostHog | null = null;
const pending: Array<(ph: PostHog) => void> = [];

function withPostHog(fn: (ph: PostHog) => void): void {
  if (client) fn(client);
  else if (initialized) pending.push(fn);
}

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
  const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
  if (!key || !host) return;
  initialized = true;

  scheduleNonCriticalScripts(() => {
    void import("posthog-js")
      .then(({ default: posthog }) => {
        posthog.init(key, {
          api_host: host,
          // Autocapture + pageviews stay on; "history_change" tracks wouter's SPA
          // route changes (plain `true` only fires on the initial hard load).
          autocapture: true,
          capture_pageview: "history_change",
          // Everything else (session replay if enabled in the PostHog project,
          // anonymous distinct_id, UTM/referrer capture) uses SDK defaults.
        });
        client = posthog;

        // TEMPORARY DIAGNOSTIC — remove once PostHog Activity shows events again.
        // Confirms the init above actually reaches PostHog (vs. silently no-op'd
        // by CSP/ad-block/etc.).
        posthog.capture("posthog_test");

        for (const fn of pending.splice(0)) fn(posthog);
      })
      .catch(() => {
        pending.length = 0;
      });
  });
}

export function posthogIdentify(userId: string): void {
  withPostHog((ph) => ph.identify(userId));
}

export function posthogReset(): void {
  withPostHog((ph) => ph.reset());
}
