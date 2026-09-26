/**
 * PostHog — product analytics + session replay. Separate from GA4
 * (analytics-deferred.ts) and internal SQLite product analytics
 * (product-analytics.ts) — do not merge with either.
 *
 * Initialized exactly once (guarded), called from main.tsx before the app
 * renders. No-ops (safe) if VITE_PUBLIC_POSTHOG_KEY/HOST are unset, e.g. in
 * local dev.
 */
import posthog from "posthog-js";

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === "undefined") return;

  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY?.trim();
  const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST?.trim();
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
}

export { posthog };
