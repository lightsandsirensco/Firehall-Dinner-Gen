/**
 * Client-side product analytics — queues events to internal SQLite via API.
 * GA4 traffic is handled separately in analytics.ts / analytics-deferred.ts.
 */

import { fetchWithCsrf } from "@/lib/csrf-fetch";
import type { AnalyticsEventType } from "@shared/analytics/events";

const VISITOR_KEY = "fh_visitor_id";
const QUEUE_KEY = "fh_analytics_queue_v1";

type QueuedEvent = {
  event_type: AnalyticsEventType;
  route?: string;
  visitor_id?: string;
  metadata?: Record<string, string | number | boolean>;
};

let memoryQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

export function getAnalyticsVisitorId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function persistQueue(): void {
  try {
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue.slice(-50)));
  } catch {
    /* ignore */
  }
}

function restoreQueue(): void {
  try {
    const raw = sessionStorage.getItem(QUEUE_KEY);
    if (raw) memoryQueue = JSON.parse(raw) as QueuedEvent[];
  } catch {
    memoryQueue = [];
  }
}

if (typeof window !== "undefined") {
  restoreQueue();
  window.addEventListener("beforeunload", () => {
    void flushProductAnalytics(true);
  });
}

export function resolveTrafficSource(): string {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const utm = params.get("utm_source")?.trim().toLowerCase();
  if (utm) return utm;
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes("google.")) return "google";
    if (host.includes("instagram.")) return "instagram";
    if (host.includes("facebook.") || host.includes("fb.")) return "facebook";
    if (host.includes("reddit.")) return "reddit";
    if (host.includes("t.co") || host.includes("twitter.") || host.includes("x.com")) return "twitter";
    return host.replace(/^www\./, "");
  } catch {
    return "other";
  }
}

export function inferPageName(path: string): string {
  if (path === "/" || path === "") return "homepage";
  if (path.startsWith("/explore")) return "explore";
  if (path.startsWith("/classics-wheel") || path.startsWith("/wheel")) return "wheel";
  if (path.startsWith("/recipes/")) return "recipe";
  if (path.startsWith("/generator")) return "generator";
  if (path.startsWith("/pizza")) return "pizza_night";
  if (path.startsWith("/breakfast")) return "breakfast";
  if (path.startsWith("/smoothies")) return "smoothies";
  if (path.startsWith("/firefighter-red-lead")) return "red_lead";
  if (path.startsWith("/hall-of-fame")) return "hall_of_fame";
  if (path.startsWith("/hall")) return "hall";
  return path.split("/").filter(Boolean)[0] ?? "other";
}

export function trackProductEvent(
  eventType: AnalyticsEventType,
  metadata?: Record<string, string | number | boolean>,
  route?: string,
): void {
  if (typeof window === "undefined") return;
  const event: QueuedEvent = {
    event_type: eventType,
    route: route ?? `${window.location.pathname}${window.location.search}`,
    visitor_id: getAnalyticsVisitorId(),
    metadata,
  };
  memoryQueue.push(event);
  if (memoryQueue.length > 100) memoryQueue = memoryQueue.slice(-100);
  persistQueue();
  scheduleFlush();
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushProductAnalytics();
  }, 1200);
}

function readCsrfTokenSync(): string {
  try {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

export async function flushProductAnalytics(onUnload = false): Promise<void> {
  if (flushing || memoryQueue.length === 0) return;
  flushing = true;
  const batch = memoryQueue.splice(0, 25);
  persistQueue();
  try {
    const body = JSON.stringify({ events: batch });
    if (onUnload) {
      const csrf = readCsrfTokenSync();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrf) headers["X-CSRF-Token"] = csrf;
      fetch("/api/analytics/events", {
        method: "POST",
        headers,
        body,
        credentials: "include",
        keepalive: true,
      });
    } else {
      await fetchWithCsrf("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    }
  } catch {
    memoryQueue = [...batch, ...memoryQueue].slice(-100);
    persistQueue();
  } finally {
    flushing = false;
    if (memoryQueue.length > 0) scheduleFlush();
  }
}
