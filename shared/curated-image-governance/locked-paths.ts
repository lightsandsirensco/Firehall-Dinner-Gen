import {
  buildEditorialDeliveryPaths,
  editorialPathForRole,
} from "../editorial-image-delivery.js";
import type { LockedCuratedImages } from "./types.js";

/** Canonical locked paths for hall catalog slugs (Golden 100 / Performance). */
export function resolveLockedEditorialPaths(slug: string): LockedCuratedImages {
  const paths = buildEditorialDeliveryPaths(slug);
  return {
    hero: paths.hero,
    thumb: paths.thumb,
    mobile: paths.mobile,
    rail: paths.rail,
    imageApproved: false,
    locked: true,
  };
}

export function pathsMatchSlugConvention(
  slug: string,
  hero: string,
  thumb?: string,
  mobile?: string,
): boolean {
  const expected = resolveLockedEditorialPaths(slug);
  const h = hero.trim();
  if (!h) return false;
  if (h !== expected.hero && !h.includes(slug)) return false;
  if (thumb && thumb.trim() && thumb !== expected.thumb && !thumb.includes(slug)) return false;
  if (mobile && mobile.trim() && mobile !== expected.mobile && !mobile.includes(slug)) return false;
  return h.startsWith("/images/");
}

export function editorialRolePath(slug: string, role: "hero" | "thumb" | "mobile" | "rail"): string {
  const map = {
    hero: "hero" as const,
    thumb: "thumb" as const,
    mobile: "mobile" as const,
    rail: "rail" as const,
  };
  return editorialPathForRole(map[role], slug, "jpg");
}
