import type { ApprovedCatalogEntry } from "@shared/approved-catalog";

/** Max recipe cards rendered on first Explore paint (mobile Safari safety). */
export const EXPLORE_CATALOG_PAGE_SIZE = 24;

/** Explore grid images — thumbs/rail/mobile only; never full hero paths. */
export function exploreCardImageCandidates(entry: ApprovedCatalogEntry): string[] {
  const slug = entry.slug.trim().toLowerCase();
  const candidates = [
    entry.thumbImage,
    `/images/thumbs/${slug}.jpg`,
    `/images/rails/${slug}.jpg`,
    `/images/mobile/${slug}.jpg`,
  ].filter((src): src is string => Boolean(src?.trim()));

  return candidates.filter((src, i) => candidates.indexOf(src) === i);
}

export function exploreCardImageUsesHero(src: string, entry: ApprovedCatalogEntry): boolean {
  const hero = entry.heroImage?.trim();
  return Boolean(hero && src === hero);
}
