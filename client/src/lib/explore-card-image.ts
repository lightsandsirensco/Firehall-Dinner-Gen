import type { ApprovedCatalogEntry } from "@shared/approved-catalog";
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

/** Primary Explore grid thumb — always /images/thumbs/{slug}.jpg */
export function exploreCardThumbSrc(entry: Pick<ApprovedCatalogEntry, "slug" | "thumbImage">): string {
  const slug = entry.slug.trim().toLowerCase();
  const canonical = `/images/thumbs/${slug}.jpg`;
  const fromEntry = entry.thumbImage?.trim();
  if (fromEntry && isAllowedExploreThumbSrc(fromEntry)) {
    return fromEntry;
  }
  return canonical;
}

/** Explore grid — thumb paths only (no hero, mobile, or golden-100). */
export function exploreCardImageCandidates(
  entry: Pick<ApprovedCatalogEntry, "slug" | "thumbImage">,
): string[] {
  const slug = entry.slug.trim().toLowerCase();
  const primary = exploreCardThumbSrc(entry);
  const fallback = `/images/thumbs/${slug}.jpg`;
  const candidates = [primary, fallback].filter(
    (src, i, arr) => isAllowedExploreThumbSrc(src) && arr.indexOf(src) === i,
  );
  return candidates.length > 0 ? candidates : [fallback];
}

export function exploreCardImageUsesHero(
  src: string,
  entry: Pick<ApprovedCatalogEntry, "heroImage">,
): boolean {
  const hero = entry.heroImage?.trim();
  return Boolean(hero && src === hero);
}

export { exploreCatalogPageSize };
