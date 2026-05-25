export type { ExploreRecipeCard, SpoonacularImageSize } from "@shared/explore-recipe";
export type { ExploreBadge, ExploreCardPresentation } from "@shared/explore-card-presentation";
export {
  normalizeExploreRecipeCard,
  normalizeExploreRecipeList,
  normalizeExploreRecipeDetail,
  filterDisplayableExploreCards,
  spoonacularImageUrl,
  extractRecipeIdFromSpoonacularImage,
  upgradeSpoonacularImageSize,
} from "@shared/explore-recipe";
export {
  computeCardPresentation,
  isDisplayableExploreCard,
  exploreImageSrcSet,
} from "@shared/explore-card-presentation";

import type { ExploreRecipeCard } from "@shared/explore-recipe";
import { spoonacularImageUrl } from "@shared/explore-recipe";

/** In-memory registry: id → card snapshot (survives detail fetch / query transitions). */
export class ExploreRecipeCardRegistry {
  private map = new Map<number, ExploreRecipeCard>();

  register(cards: ExploreRecipeCard[]): void {
    for (const card of cards) {
      this.map.set(card.id, card);
    }
  }

  get(id: number): ExploreRecipeCard | undefined {
    return this.map.get(id);
  }

  clear(): void {
    this.map.clear();
  }
}

export function mergeDetailWithCardPreview<D extends { id: number; title: string; image?: string; imageAlt?: string }>(
  detail: D,
  preview: ExploreRecipeCard | null | undefined,
): D {
  if (!preview || preview.id !== detail.id) {
    return detail;
  }
  return {
    ...detail,
    title: detail.title || preview.title,
    image: detail.image || preview.image,
    imageAlt: detail.imageAlt || preview.title,
  };
}

export function imageUrlForRecipeCard(card: Pick<ExploreRecipeCard, "id" | "image">): string {
  const custom = (card.image || "").trim();
  if (custom && !custom.includes("spoonacular.com")) {
    return custom;
  }
  if (custom.includes("spoonacular.com")) {
    return custom;
  }
  if (card.id > 0) {
    return spoonacularImageUrl(card.id);
  }
  return "";
}
