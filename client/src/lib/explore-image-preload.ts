/** Preload hero images for faster Explore paint — deduped link tags */
const preloaded = new Set<string>();

export function preloadExploreImages(urls: string[], limit = 8): void {
  const unique = [...new Set(urls.filter(Boolean))].slice(0, limit);
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

export function resetExploreImagePreload(): void {
  preloaded.clear();
}
