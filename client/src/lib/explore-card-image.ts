import type { ApprovedCatalogGridEntry } from "@shared/approved-catalog";
import { cacheSafeImageUrl } from "@shared/editorial-image-delivery";
import {
  EXPLORE_CATALOG_PAGE_SIZE_MOBILE,
  exploreCatalogPageSize,
} from "@/lib/explore-mobile-page-size";

/** @deprecated use EXPLORE_CATALOG_PAGE_SIZE_MOBILE or exploreCatalogPageSize() */
export const EXPLORE_CATALOG_PAGE_SIZE = EXPLORE_CATALOG_PAGE_SIZE_MOBILE;

const FORBIDDEN_GRID_IMAGE_RE =
  /\/images\/(?:golden-100|mobile|explore)\/|(?:^|\/)hero(?:\/|$|-)/i;

function isAllowedExploreThumbSrc(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  if (FORBIDDEN_GRID_IMAGE_RE.test(s)) return false;
  return s.includes("/images/thumbs/") || s.startsWith("/images/thumbs/");
}

type ExploreCardImageEntry = Pick<
  ApprovedCatalogGridEntry,
  "slug" | "thumbImage" | "thumbCacheVersion"
>;

function bustExploreThumb(path: string, cacheVersion: number): string {
  return cacheSafeImageUrl(path, cacheVersion);
}

/** Primary Explore grid thumb — slug-locked path with ?v=mtime cache busting. */
export function exploreCardThumbSrc(entry: ExploreCardImageEntry): string {
  const slug = entry.slug.trim().toLowerCase();
  const version = entry.thumbCacheVersion ?? 0;
  const canonical = bustExploreThumb(`/images/thumbs/${slug}.jpg`, version);
  const fromEntry = entry.thumbImage?.trim();
  if (fromEntry && isAllowedExploreThumbSrc(fromEntry)) {
    return bustExploreThumb(fromEntry, version);
  }
  return canonical;
}

/** Explore grid — thumb paths only (no hero, mobile, or golden-100). */
export function exploreCardImageCandidates(entry: ExploreCardImageEntry): string[] {
  const slug = entry.slug.trim().toLowerCase();
  const version = entry.thumbCacheVersion ?? 0;
  const primary = exploreCardThumbSrc(entry);
  const fallback = bustExploreThumb(`/images/thumbs/${slug}.jpg`, version);
  const candidates = [primary, fallback].filter(
    (src, i, arr) => isAllowedExploreThumbSrc(src.split("?")[0] ?? src) && arr.indexOf(src) === i,
  );
  return candidates.length > 0 ? candidates : [fallback];
}

export function exploreCardImageUsesHero(
  src: string,
  entry: { heroImage?: string; heroCacheVersion?: number },
): boolean {
  const hero = entry.heroImage?.trim();
  if (!hero) return false;
  const version = entry.heroCacheVersion ?? 0;
  return src === hero || src === cacheSafeImageUrl(hero, version);
}

export { exploreCatalogPageSize };
