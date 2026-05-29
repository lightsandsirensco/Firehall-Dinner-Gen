/**
 * Normalize hero/image URLs from API so they load on any host/port in dev and prod.
 */
export function normalizeMediaUrl(url: string | undefined | null): string {
  const raw = (url || "").trim();
  if (!raw) return "";

  // Common data sources sometimes store `/images/...` without the leading slash.
  // Treat `images/...` as a site-root path so it doesn't resolve relative to the current route.
  if (raw.startsWith("images/")) return `/${raw}`;

  if (raw.startsWith("/")) return raw;

  try {
    const parsed = new URL(raw);
    if (/^https?:$/i.test(parsed.protocol)) {
      const isLoopback = /^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname);
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      if (isLoopback && path.startsWith("/images/")) return path;
      return raw;
    }
  } catch {
    /* relative or invalid */
  }

  return raw;
}
