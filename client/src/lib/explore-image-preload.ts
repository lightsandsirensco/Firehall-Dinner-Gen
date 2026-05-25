import { normalizeMediaUrl } from "@/lib/media-url";

/** Preload hero images for faster Explore paint — deduped link tags */
const preloaded = new Set<string>();

function runPreload(urls: string[], limit: number): void {
  const unique = [...new Set(urls.map((u) => normalizeMediaUrl(u)).filter(Boolean))].slice(0, limit);
  for (const href of unique) {
    if (preloaded.has(href)) continue;
    preloaded.add(href);
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = href;
    document.head.appendChild(link);
  }
}

export function preloadExploreImages(urls: string[], limit = 8): void {
  if (typeof window === "undefined") return;
  const run = () => runPreload(urls, limit);
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    setTimeout(run, 0);
  }
}

export function resetExploreImagePreload(): void {
  preloaded.clear();
}
