/**
 * Prefetch lazy route chunks + warm likely navigations (aligned to 4-tab IA).
 */

const PREFETCH_ROUTES = ["/tonight", "/generator", "/explore", "/pizza", "/hall", "/wheel"] as const;

type Prefetchable = (typeof PREFETCH_ROUTES)[number];

const loaders: Record<Prefetchable, () => Promise<unknown>> = {
  "/tonight": () => import("@/pages/app-home-page"),
  "/generator": () => import("@/pages/generator"),
  "/explore": () => import("@/pages/explore"),
  "/pizza": () => import("@/pages/pizza-night"),
  "/hall": () => import("@/pages/hall-page"),
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
    order = ["/tonight", "/generator", "/explore", "/hall"];
  } else if (
    currentPath === "/generator" ||
    currentPath.startsWith("/tonight") ||
    currentPath.startsWith("/home")
  ) {
    order = ["/explore", "/hall", "/wheel", "/generator"];
  } else if (currentPath.startsWith("/explore")) {
    order = ["/tonight", "/generator", "/pizza", "/hall", "/wheel"];
  } else if (currentPath.startsWith("/pizza")) {
    order = ["/tonight", "/generator", "/explore", "/hall", "/wheel"];
  } else if (currentPath.startsWith("/hall")) {
    order = ["/tonight", "/generator", "/explore", "/wheel"];
  } else {
    order = ["/tonight", "/generator", "/explore", "/hall"];
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
      if ((PREFETCH_ROUTES as readonly string[]).includes(p)) prefetchRoute(p);
    } catch {
      /* ignore */
    }
  };

  document.addEventListener("mouseover", onHover, { passive: true, capture: true });

  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return;

  globalThis.setTimeout(() => {
    prefetchRoute("/tonight");
    prefetchRoute("/generator");
  }, 2500);
}
