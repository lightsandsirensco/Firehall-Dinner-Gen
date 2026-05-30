/** Canonical path helpers — always lowercase, no trailing slash. */

import { SEO_CANONICAL_ORIGIN } from "./constants.js";

const CANONICAL_HOST = new URL(SEO_CANONICAL_ORIGIN).hostname.toLowerCase();

/** Force firehallmeals.com hostnames to the preferred www HTTPS origin. */
export function normalizePublicSiteOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname.toLowerCase().endsWith("firehallmeals.com")) {
      return SEO_CANONICAL_ORIGIN;
    }
    return url.origin;
  } catch {
    return SEO_CANONICAL_ORIGIN;
  }
}

export function normalizePublicSiteHost(host: string | undefined): string | undefined {
  if (!host) return host;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  if (hostname.endsWith("firehallmeals.com") && hostname !== CANONICAL_HOST) {
    return CANONICAL_HOST;
  }
  return host;
}

export function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.replace(/\/+$/, "") || "/";
}

export function absoluteUrl(origin: string, path: string): string {
  const base = origin.replace(/\/+$/, "");
  const p = normalizePath(path);
  return p === "/" ? `${base}/` : `${base}${p}`;
}

export function recipePath(slug: string): string {
  return `/recipes/${slug.trim().toLowerCase()}`;
}

export function absoluteImageUrl(origin: string, imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  const rel = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return absoluteUrl(origin, rel);
}
