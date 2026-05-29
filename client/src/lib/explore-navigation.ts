import type { ExploreRecipeCard } from "@/lib/explore-recipe";
import { normalizeExploreRecipeId } from "@/lib/explore-api";
import { isApprovedCatalogSlug } from "@shared/hall-catalog/gate";
import { isHardHeldExploreCard } from "@shared/explore-imagery-status";

/**
 * Explore detail path — numeric explore id + optional DB hints for lookup fallback.
 * @deprecated Prefer `/recipes/:slug` for approved catalog cards.
 */
export function buildExploreRecipeDetailPath(card: ExploreRecipeCard): string | null {
  const slug = card._curatedSlug?.trim();
  if (slug && isApprovedCatalogSlug(slug)) {
    return `/recipes/${encodeURIComponent(slug)}`;
  }

  const id = normalizeExploreRecipeId(card.id);
  if (id === null) return null;

  const params = new URLSearchParams();
  if (card.curatedRecipeId?.trim()) {
    params.set("cid", card.curatedRecipeId.trim());
  } else if (slug) {
    params.set("slug", slug);
  }

  const qs = params.toString();
  return qs ? `/explore/recipe/${id}?${qs}` : `/explore/recipe/${id}`;
}

/** Route Explore card clicks — approved catalog slugs use `/recipes/:slug`. */
export function resolveExploreCardNavigation(card: ExploreRecipeCard): {
  kind: "catalog-recipe" | "explore-detail";
  path: string;
} | null {
  if (isHardHeldExploreCard(card)) return null;

  const slug = card._curatedSlug?.trim();
  if (slug && isApprovedCatalogSlug(slug)) {
    return { kind: "catalog-recipe", path: `/recipes/${encodeURIComponent(slug)}` };
  }

  const detailPath = buildExploreRecipeDetailPath(card);
  if (!detailPath) return null;
  return { kind: "explore-detail", path: detailPath };
}
