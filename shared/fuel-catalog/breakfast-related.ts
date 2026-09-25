/**
 * Deterministic "related recipes by taxonomy overlap" — genuinely similar
 * recipes picked by shared-filter/tag overlap (highest overlap first,
 * alphabetical slug as a stable tiebreaker), never a random/arbitrary
 * sample. Originally built for breakfast recipes (which have no
 * precomputed `relatedSlugs`, unlike the dinner catalogs and smoothies) but
 * the catalog index already carries a taxonomy — "filters" for breakfast
 * (e.g. "quick_breakfasts", "breakfast_sandwiches"), "tags" for Pizza
 * Night — used for the real Explore/Breakfast filtering UI, so this is
 * reused wherever a catalog has taxonomy tags but no curated
 * `relatedSlugs`, keeping the server's pre-hydration content snapshot and
 * the client's hydrated page in sync on the exact same related set for a
 * given recipe.
 */

export interface FilterOverlapCandidate {
  slug: string;
  title: string;
  filters: readonly string[];
}

/** @deprecated kept as an alias for existing breakfast-specific call sites; identical shape to `FilterOverlapCandidate`. */
export type BreakfastRelatedCandidate = FilterOverlapCandidate;

export interface FilterOverlapResult<T extends FilterOverlapCandidate> {
  entry: T;
  overlap: number;
}

/** Highest shared-filter-count neighbors for `currentSlug`, excluding itself
 * and anything with zero overlap (no manufactured/irrelevant matches). */
export function pickRelatedByFilterOverlap<T extends FilterOverlapCandidate>(
  currentSlug: string,
  allEntries: readonly T[],
  count = 6,
): T[] {
  const current = allEntries.find((r) => r.slug === currentSlug);
  const currentFilters = new Set(current?.filters ?? []);
  if (currentFilters.size === 0) return [];

  return allEntries
    .filter((r) => r.slug !== currentSlug)
    .map((entry) => ({
      entry,
      overlap: entry.filters.filter((f) => currentFilters.has(f)).length,
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.entry.slug.localeCompare(b.entry.slug))
    .slice(0, count)
    .map((x) => x.entry);
}

/** @deprecated alias for `pickRelatedByFilterOverlap` kept so existing
 * breakfast call sites (server snapshot + client breakfast page) don't need
 * to change; identical algorithm. */
export function pickRelatedBreakfastEntries<T extends FilterOverlapCandidate>(
  currentSlug: string,
  allEntries: readonly T[],
  count = 6,
): T[] {
  return pickRelatedByFilterOverlap(currentSlug, allEntries, count);
}
