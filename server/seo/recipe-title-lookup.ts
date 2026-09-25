/**
 * Full slug -> real recipe title lookup, across every catalog served at
 * `/recipes/:slug` (and its cross-catalog siblings) — Golden 100,
 * Performance Meals, Hall Expansion, Breakfast, BBQ, Smoothies (all via the
 * already-cached `approved-catalog`), plus Pizza Night (intentionally
 * excluded from the approved catalog — see
 * `server/meal-catalog/load-index.ts`'s `loadRecipeLinkGraphCatalogIndex`).
 *
 * Why this exists: several server-rendered ("pre-hydration") content
 * snapshots only ever had a bare `slug` for a related/linked recipe and
 * fell back to `titleCaseFromSlug(slug)` to build clickable anchor text —
 * a readable guess, but not always the *real* title (e.g. slugs with
 * abbreviations, acronyms, or word choices that differ from the title's
 * actual casing/spacing). This gives every snapshot builder a cheap way to
 * resolve the real title first, only falling back to the slug-derived guess
 * for a slug that truly isn't in any known catalog.
 */
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { readPizzaNightCatalogIndexFromDisk } from "../pizza-night/page-store.js";

let cachedMap: Map<string, string> | null = null;
let cachedRevision: string | null = null;

function buildMap(): Map<string, string> {
  const approved = getApprovedCatalog();
  const map = new Map<string, string>();
  for (const r of approved.recipes) {
    map.set(r.slug, r.title);
  }
  const pizza = readPizzaNightCatalogIndexFromDisk();
  for (const r of pizza?.recipes ?? []) {
    if (!map.has(r.slug)) map.set(r.slug, r.title);
  }
  return map;
}

/** Cached slug -> title map — invalidated whenever the approved catalog's
 * own cache-busting revision changes (same signal it already uses). */
export function getRecipeTitleLookup(): Map<string, string> {
  const revision = getApprovedCatalog().assetRevision;
  if (cachedMap && cachedRevision === revision) return cachedMap;
  cachedMap = buildMap();
  cachedRevision = revision;
  return cachedMap;
}

/** Real catalog title for `slug`, or `null` if it isn't a known recipe. */
export function resolveKnownRecipeTitle(slug: string): string | null {
  return getRecipeTitleLookup().get(slug.trim().toLowerCase()) ?? null;
}
