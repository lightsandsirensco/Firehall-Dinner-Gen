import { PERFORMANCE_MEAL_SLUG_REDIRECTS } from "./performance-meals/legacy-slug-redirects.js";
import { PHASE5_REDIRECT_MAP } from "./catalog-consolidation/phase5-redirects.js";

const ALL_REDIRECTS: Record<string, string> = {
  ...PERFORMANCE_MEAL_SLUG_REDIRECTS,
  ...PHASE5_REDIRECT_MAP,
};

/** Resolve legacy / consolidated slug → canonical catalog slug (follows redirect chains). */
export function resolveCatalogSlug(slug: string): string {
  const key = slug.trim().toLowerCase();
  let current = key;
  const seen = new Set<string>();
  while (ALL_REDIRECTS[current] && !seen.has(current)) {
    seen.add(current);
    current = ALL_REDIRECTS[current]!;
  }
  return current;
}

export function getCatalogSlugRedirect(from: string): string | null {
  const key = from.trim().toLowerCase();
  const resolved = resolveCatalogSlug(key);
  return resolved !== key ? resolved : null;
}

export function isConsolidatedAwaySlug(slug: string): boolean {
  return Boolean(getCatalogSlugRedirect(slug));
}
