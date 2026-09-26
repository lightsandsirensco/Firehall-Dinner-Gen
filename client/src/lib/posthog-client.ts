/**
 * PostHog — product analytics + session replay. Separate from GA4
 * (analytics-deferred.ts) and internal SQLite product analytics
 * (product-analytics.ts) — do not merge with either.
 *
 * Initialized exactly once (guarded), called from main.tsx before the app
 * renders. No-ops (safe) if VITE_POSTHOG_PROJECT_TOKEN/VITE_POSTHOG_HOST are
 * unset, e.g. in local dev.
 */
import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
  const host = import.meta.env.VITE_POSTHOG_HOST?.trim();
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    // Autocapture + pageviews stay on; "history_change" tracks wouter's SPA
    // route changes (plain `true` only fires on the initial hard load).
    autocapture: true,
    capture_pageview: "history_change",
    // Everything else (session replay if enabled in the PostHog project,
    // anonymous distinct_id, UTM/referrer capture) uses SDK defaults.
  });
  initialized = true;

  // TEMPORARY DIAGNOSTIC — remove once PostHog Activity shows events again.
  // Confirms the init above actually reaches PostHog (vs. silently no-op'd
  // by CSP/ad-block/etc.). Safe no-op if init() above didn't run.
  posthog.capture("posthog_test");
}

export { posthog };
