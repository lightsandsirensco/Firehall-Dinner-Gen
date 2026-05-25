/**
 * URL/path conventions for owned Firehall food imagery.
 */

export const GENERATED_IMAGE_URL_PREFIX = "/images/generated/";
export const EDITORIAL_IMAGE_URL_PREFIX = "/images/explore/";

export function isFirehallOwnedHeroUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  if (u.startsWith(GENERATED_IMAGE_URL_PREFIX) || u.startsWith(EDITORIAL_IMAGE_URL_PREFIX)) {
    return true;
  }
  if (/^https?:\/\//i.test(u)) {
    try {
      const path = new URL(u).pathname;
      return path.startsWith(GENERATED_IMAGE_URL_PREFIX) || path.startsWith(EDITORIAL_IMAGE_URL_PREFIX);
    } catch {
      return false;
    }
  }
  return false;
}

export function generatedImagePublicPath(recipeKey: string, version = 1): string {
  const safe = recipeKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const suffix = version > 1 ? `-v${version}` : "";
  return `${GENERATED_IMAGE_URL_PREFIX}${safe}${suffix}.jpg`;
}

/** Strip localhost (or loopback) absolute URLs to site-root /images/ paths only. */
export function normalizeOwnedMediaPath(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  if (raw.startsWith("/")) return raw;
  try {
    const parsed = new URL(raw);
    const isLoopback = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (isLoopback && path.startsWith("/images/")) return path;
  } catch {
    /* ignore */
  }
  return raw;
}

export function slugifyRecipeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/^spoonacular:/, "")
    .replace(/^curated:/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
