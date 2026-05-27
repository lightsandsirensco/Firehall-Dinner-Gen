/**
 * Normalize image paths to either:
 * - absolute https? URL (unchanged)
 * - site-root /images/* path
 *
 * Rules:
 * - "burger.webp" -> "/images/burger.webp"
 * - "catalog/thumbs/burger.webp" -> "/images/catalog/thumbs/burger.webp"
 * - "/images/burger.webp" -> unchanged
 * - "https://..." -> unchanged
 * - prevent duplicate slashes like "//images"
 */
export function normalizeImagePath(input: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";

  // Absolute URL: keep as-is (but trim whitespace already handled).
  if (/^https?:\/\//i.test(raw)) return raw;

  // Strip any leading "./" (common from JSON-LD and scraped sources)
  let p = raw.replace(/^\.\/+/, "");

  // Collapse duplicate slashes anywhere (but keep URL case above).
  p = p.replace(/\/{2,}/g, "/");

  // If already /images/... keep (after collapsing).
  if (p.startsWith("/images/")) return p;

  // If it starts with "images/..." treat as missing leading slash.
  if (p.startsWith("images/")) return `/${p}`;

  // If it starts with "/image" or other site-root but not /images, do NOT rewrite.
  // Caller can decide if that is acceptable; curated validation requires /images/.
  if (p.startsWith("/")) return p;

  // Otherwise, treat as relative file path that should live under /images/.
  return `/images/${p}`;
}

export function normalizeImagePathOptional(input: string | undefined | null): string | undefined {
  if (!input?.trim()) return undefined;
  const normalized = normalizeImagePath(input);
  return normalized || undefined;
}

