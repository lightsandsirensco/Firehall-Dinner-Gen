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

// Mobile browsers (iOS Safari especially) often skip beforeunload when a tab
// is backgrounded, switched away from or killed; pagehide and
// visibilitychange→hidden are the events that reliably fire last.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  restoreQueue();
  window.addEventListener("pagehide", () => sendQueuedOnPageHide());
  if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") sendQueuedOnPageHide();
    });
  }
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
    if (host === window.location.hostname.toLowerCase()) return "internal";
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

export function inferDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return window.innerWidth < 768 ? "mobile" : "desktop";
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
  // Admin tooling is not site traffic.
  if (window.location.pathname.startsWith("/admin")) return;
  const event: QueuedEvent = {
    event_type: eventType,
    route: route ?? window.location.pathname,
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

const INGEST_URL = "/api/analytics/events";
const BATCH_SIZE = 25;

/**
 * Hands every queued event to the browser before the page goes away.
 * sendBeacon is queued by the browser itself and survives the page being
 * frozen or closed; text/plain keeps it a simple request in every browser.
 * Falls back to fetch keepalive where sendBeacon is missing or refuses.
 */
function sendQueuedOnPageHide(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  while (memoryQueue.length > 0) {
    const batch = memoryQueue.splice(0, BATCH_SIZE);
    const body = JSON.stringify({ events: batch });
    let queued = false;
    try {
      queued = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(INGEST_URL, new Blob([body], { type: "text/plain;charset=UTF-8" }));
    } catch {
      queued = false;
    }
    if (!queued) {
      const csrf = readCsrfTokenSync();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrf) headers["X-CSRF-Token"] = csrf;
      try {
        void fetch(INGEST_URL, { method: "POST", headers, body, credentials: "include", keepalive: true }).catch(() => {});
      } catch {
        memoryQueue = [...batch, ...memoryQueue];
        break;
      }
    }
  }
  persistQueue();
}

export async function flushProductAnalytics(): Promise<void> {
  if (flushing || memoryQueue.length === 0) return;
  flushing = true;
  const batch = memoryQueue.splice(0, BATCH_SIZE);
  persistQueue();
  try {
    const res = await fetchWithCsrf(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`analytics ingest ${res.status}`);
  } catch {
    memoryQueue = [...batch, ...memoryQueue].slice(-100);
    persistQueue();
  } finally {
    flushing = false;
    if (memoryQueue.length > 0) scheduleFlush();
  }
}
