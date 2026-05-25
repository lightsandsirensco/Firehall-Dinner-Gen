/**
 * Lightweight client performance instrumentation (production-safe).
 * Enable verbose marks: localStorage.setItem("firehall_perf", "1")
 */

const PERF_FLAG = "firehall_perf";

export function isPerfDebugEnabled(): boolean {
  try {
    return (
      import.meta.env.DEV ||
      localStorage.getItem(PERF_FLAG) === "1"
    );
  } catch {
    return import.meta.env.DEV;
  }
}

export function perfMark(name: string): void {
  if (!isPerfDebugEnabled()) return;
  try {
    performance.mark(name);
  } catch {
    /* ignore */
  }
}

export function perfMeasure(name: string, startMark: string, endMark?: string): number | undefined {
  if (!isPerfDebugEnabled()) return;
  try {
    const end = endMark ?? `${startMark}-end`;
    if (!performance.getEntriesByName(end).length) {
      performance.mark(end);
    }
    performance.measure(name, startMark, end);
    const entry = performance.getEntriesByName(name).pop();
    return entry?.duration;
  } catch {
    return undefined;
  }
}

export function perfLog(label: string, detail?: Record<string, string | number | boolean>): void {
  if (!isPerfDebugEnabled()) return;
  const extra = detail
    ? Object.entries(detail)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  console.info(`[perf] ${label}${extra ? ` ${extra}` : ""}`);
}

/** Boot + route transition timing */
export function initClientPerformance(): void {
  if (typeof window === "undefined") return;

  perfMark("app-boot");

  window.addEventListener("load", () => {
    perfMark("app-load");
    const bootMs = perfMeasure("app-boot-duration", "app-boot", "app-load");
    if (bootMs != null) perfLog("boot", { ms: Math.round(bootMs) });
  }, { once: true });

  if ("PerformanceObserver" in window) {
    try {
      const lcp = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last && isPerfDebugEnabled()) {
          perfLog("lcp", { ms: Math.round(last.startTime) });
        }
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* unsupported */
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (isPerfDebugEnabled()) {
      perfLog("visibility", { hidden: document.hidden });
    }
  });
}

/** Defer non-critical third-party scripts (analytics) until idle */
export function scheduleNonCriticalScripts(load: () => void): void {
  if (typeof window === "undefined") return;
  const run = () => {
    try {
      load();
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[perf] deferred script failed", err);
    }
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    globalThis.addEventListener("load", run, { once: true });
  }
}
