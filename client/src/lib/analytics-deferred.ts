import { trackAnalyticsPageViewInternal } from "@/lib/analytics";
import {
  logGaMeasurementIdLoaded,
  resolveGaMeasurementId,
} from "@/lib/ga-config";
import { scheduleNonCriticalScripts } from "@/lib/performance";

let analyticsInitialized = false;
let gaMeasurementId: string | undefined;
let gaScriptInjected = false;
const pendingPageViews: string[] = [];

function flushPendingPageViews(): void {
  if (!gaMeasurementId || typeof window === "undefined" || !window.gtag) return;
  while (pendingPageViews.length > 0) {
    const pagePath = pendingPageViews.shift();
    if (!pagePath) continue;
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: `${window.location.origin}${pagePath}`,
      page_title: document.title,
    });
    trackAnalyticsPageViewInternal(pagePath, document.title);
  }
}

/** SPA route changes — queues until gtag is ready. */
export function trackAnalyticsPageView(pagePath: string): void {
  const path = pagePath || "/";
  if (gaMeasurementId && window.gtag) {
    window.gtag("event", "page_view", {
      page_path: path,
      page_location: `${window.location.origin}${path}`,
      page_title: document.title,
    });
    trackAnalyticsPageViewInternal(path, document.title);
    return;
  }
  pendingPageViews.push(path);
}

function injectGtagScript(measurementId: string): void {
  if (gaScriptInjected || typeof document === "undefined") return;
  gaScriptInjected = true;

  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(gtagScript);
}

function initGoogleAnalytics(measurementId: string): void {
  const w = window as Window & { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];

  if (!window.gtag) {
    function gtag(...args: unknown[]) {
      w.dataLayer?.push(args);
    }
    window.gtag = gtag;
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
  injectGtagScript(measurementId);
  gaMeasurementId = measurementId;
  flushPendingPageViews();
}

function initClarityIfConfigured(): void {
  const clarityId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();
  if (!clarityId || clarityId === "CLARITY_PROJECT_ID") return;

  const clarityScript = document.createElement("script");
  clarityScript.async = true;
  clarityScript.text = `
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "${clarityId}");
  `;
  document.head.appendChild(clarityScript);
}

/** Load gtag (+ optional Clarity) after first paint — single init, no duplicates. */
export function initDeferredAnalytics(): void {
  if (analyticsInitialized || typeof window === "undefined") return;
  analyticsInitialized = true;

  const measurementId = resolveGaMeasurementId();
  logGaMeasurementIdLoaded(Boolean(measurementId));

  if (!measurementId) return;

  scheduleNonCriticalScripts(() => {
    initGoogleAnalytics(measurementId);
    initClarityIfConfigured();
  });
}
