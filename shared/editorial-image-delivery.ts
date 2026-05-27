/**
 * CDN-ready editorial image delivery — WebP, responsive srcSet, cache-safe URLs.
 */

import type { EditorialVariantRole } from "./mobile-crop-rules.js";

export const EDITORIAL_DELIVERY_VERSION = "1.0" as const;

export const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1080, 1280] as const;

export type EditorialImageFormat = "jpg" | "webp";

export interface EditorialDeliveryPaths {
  hero: string;
  mobile: string;
  thumb: string;
  rail: string;
  heroWebp?: string;
  mobileWebp?: string;
  thumbWebp?: string;
  railWebp?: string;
}

export interface EditorialImageDelivery {
  version: typeof EDITORIAL_DELIVERY_VERSION;
  paths: EditorialDeliveryPaths;
  /** Precomputed srcSet for mobile hero (Explore cards) */
  mobileSrcSet?: string;
  mobileSizes?: string;
  /** Precomputed srcSet for full hero */
  heroSrcSet?: string;
  heroSizes?: string;
  /** CDN base — null = same-origin /images */
  cdnBaseUrl: string | null;
  cacheVersion: number;
}

/** Deterministic slug filename — never random hashes in path */
export function cacheSafeSlugFilename(slug: string, ext: EditorialImageFormat = "jpg"): string {
  const safe = slug.replace(/[^a-z0-9-]/gi, "-").replace(/-+/g, "-").slice(0, 80);
  return `${safe}.${ext}`;
}

export function editorialPathForRole(
  role: EditorialVariantRole,
  slug: string,
  format: EditorialImageFormat = "jpg",
): string {
  const file = cacheSafeSlugFilename(slug, format);
  const dir =
    role === "hero"
      ? "golden-100"
      : role === "mobile"
        ? "mobile"
        : role === "thumb"
          ? "thumbs"
          : "rails";
  return `/images/${dir}/${file}`;
}

export function buildEditorialDeliveryPaths(slug: string): EditorialDeliveryPaths {
  return {
    hero: editorialPathForRole("hero", slug, "jpg"),
    mobile: editorialPathForRole("mobile", slug, "jpg"),
    thumb: editorialPathForRole("thumb", slug, "jpg"),
    rail: editorialPathForRole("rail", slug, "jpg"),
    heroWebp: editorialPathForRole("hero", slug, "webp"),
    mobileWebp: editorialPathForRole("mobile", slug, "webp"),
    thumbWebp: editorialPathForRole("thumb", slug, "webp"),
    railWebp: editorialPathForRole("rail", slug, "webp"),
  };
}

/** Cache-bust via query param — path stays deterministic for CDN */
export function cacheSafeImageUrl(path: string, cacheVersion: number, cdnBaseUrl?: string | null): string {
  const base = (cdnBaseUrl || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = base ? `${base}${normalized}` : normalized;
  if (cacheVersion <= 0) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${cacheVersion}`;
}

function buildSrcSetForPath(
  path: string,
  widths: readonly number[],
  cacheVersion: number,
  cdnBaseUrl?: string | null,
): string {
  const ext = path.endsWith(".webp") ? "webp" : "jpg";
  const basePath = path.replace(/\.\w+$/, "");
  return widths
    .map((w) => `${cacheSafeImageUrl(`${basePath}@${w}w.${ext}`, cacheVersion, cdnBaseUrl)} ${w}w`)
    .join(", ");
}

/** Same-origin responsive srcSet from primary asset (width descriptors for future CDN transforms) */
export function buildResponsiveSrcSet(
  primaryPath: string,
  cacheVersion: number,
  cdnBaseUrl?: string | null,
  widths: readonly number[] = RESPONSIVE_WIDTHS,
): string {
  if (!primaryPath) return "";
  const ext = primaryPath.endsWith(".webp") ? "webp" : "jpg";
  const base = primaryPath.replace(/\.\w+$/, "");
  return widths
    .map((w) => `${cacheSafeImageUrl(`${base}`, cacheVersion, cdnBaseUrl)} ${w}w`)
    .join(", ");
}

export function buildEditorialDelivery(
  slug: string,
  cacheVersion: number,
  cdnBaseUrl: string | null = null,
): EditorialImageDelivery {
  const paths = buildEditorialDeliveryPaths(slug);
  return {
    version: EDITORIAL_DELIVERY_VERSION,
    paths,
    mobileSrcSet: buildResponsiveSrcSet(paths.mobile, cacheVersion, cdnBaseUrl, [320, 480, 640, 768, 1080]),
    mobileSizes: "(max-width: 640px) 88vw, (max-width: 1024px) 45vw, 320px",
    heroSrcSet: buildResponsiveSrcSet(paths.hero, cacheVersion, cdnBaseUrl, [640, 768, 1080, 1280, 1536]),
    heroSizes: "100vw",
    cdnBaseUrl,
    cacheVersion,
  };
}

/** Server/runtime CDN base — client uses VITE_EDITORIAL_CDN_BASE_URL via editorial-image.ts */
export function resolveCdnBaseUrl(): string | null {
  const raw = typeof process !== "undefined" ? process.env?.EDITORIAL_CDN_BASE_URL || "" : "";
  const trimmed = String(raw || "").trim();
  return trimmed || null;
}
