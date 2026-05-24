import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { normalizeExploreRecipeId } from "@/lib/explore-api";
import { getClassicHallMeal } from "@shared/classic-hall-meals";
import { buildPackageUrl } from "@/lib/firehall-classics-wheel";

/** Slugs that map to `/package/:slug` (Classics Wheel hall packages only). */
export function isHallClassicPackageSlug(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return Boolean(getClassicHallMeal(slug.trim()));
}

/**
 * Explore detail path — numeric explore id + optional DB hints for lookup fallback.
 */
export function buildExploreRecipeDetailPath(card: ExploreRecipeCard): string | null {
  const id = normalizeExploreRecipeId(card.id);
  if (id === null) return null;

  const params = new URLSearchParams();
  if (card.curatedRecipeId?.trim()) {
    params.set("cid", card.curatedRecipeId.trim());
  } else if (card._curatedSlug?.trim() && !isHallClassicPackageSlug(card._curatedSlug)) {
    params.set("slug", card._curatedSlug.trim());
  }

  const qs = params.toString();
  return qs ? `/explore/recipe/${id}?${qs}` : `/explore/recipe/${id}`;
}

/** Route Explore card clicks — hall packages vs curated/publisher detail. */
export function resolveExploreCardNavigation(card: ExploreRecipeCard): {
  kind: "package" | "explore-detail";
  path: string;
} | null {
  if (card._curatedSlug && isHallClassicPackageSlug(card._curatedSlug)) {
    return { kind: "package", path: buildPackageUrl({ slug: card._curatedSlug }) };
  }

  const detailPath = buildExploreRecipeDetailPath(card);
  if (!detailPath) return null;
  return { kind: "explore-detail", path: detailPath };
}
