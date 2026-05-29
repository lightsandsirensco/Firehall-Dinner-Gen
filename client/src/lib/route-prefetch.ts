/**
 * Prefetch lazy route chunks + warm likely navigations (mobile Safari perceived speed).
 */

const PREFETCH_ROUTES = ["/generator", "/explore", "/pizza", "/favorites", "/wheel"] as const;

type Prefetchable = (typeof PREFETCH_ROUTES)[number];

const loaders: Record<Prefetchable, () => Promise<unknown>> = {
  "/generator": () => import("@/pages/generator"),
  "/explore": () => import("@/pages/explore"),
  "/pizza": () => import("@/pages/pizza-night"),
  "/favorites": () => import("@/pages/favorites"),
  "/wheel": () => import("@/pages/classics-wheel"),
};

const warmed = new Set<Prefetchable>();

export function prefetchRoute(path: Prefetchable): void {
  if (warmed.has(path)) return;
  warmed.add(path);
  const load = loaders[path];
  if (!load) return;
  void load().catch(() => {
    warmed.delete(path);
  });
}

export function prefetchLikelyRoutes(currentPath = "/"): void {
  let order: Prefetchable[];
  if (currentPath === "/") {
    order = ["/generator", "/explore", "/pizza"];
  } else if (currentPath === "/generator") {
    order = ["/explore", "/favorites", "/pizza"];
  } else if (currentPath.startsWith("/explore")) {
    order = ["/generator", "/pizza", "/favorites", "/wheel"];
  } else if (currentPath.startsWith("/pizza")) {
    order = ["/generator", "/explore", "/favorites", "/wheel"];
  } else {
    order = ["/generator", "/explore", "/pizza", "/favorites"];
  }

  const run = () => {
    for (const p of order) prefetchRoute(p);
  };

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 4000 });
  } else {
    globalThis.setTimeout(run, 1200);
  }
}

export function initRoutePrefetch(): void {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  prefetchLikelyRoutes(path);

  const onHover = (e: MouseEvent) => {
    const anchor = (e.target as Element)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!anchor?.href || anchor.target === "_blank") return;
    try {
      const url = new URL(anchor.href);
      if (url.origin !== window.location.origin) return;
      const p = url.pathname as Prefetchable;
      if (PREFETCH_ROUTES.includes(p)) prefetchRoute(p);
    } catch {
      /* ignore */
    }
  };

  document.addEventListener("mouseover", onHover, { passive: true, capture: true });

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;

  globalThis.setTimeout(() => {
    prefetchRoute("/generator");
    prefetchRoute("/explore");
  }, 2500);
}
