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
  isSoftHeldExploreCard,
  isHardHeldExploreCard,
  isExploreImageryPlaceholder,
  isHeldInReviewExploreCard,
  resolveSoftHeldImageryLabel,
  type ExploreImageryStatus,
  type ExploreHeldImageryLabel,
} from "@shared/explore-imagery-status";
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

export function mergeDetailWithCardPreview<
  D extends {
    id: number;
    title: string;
    image?: string;
    imageAlt?: string;
    imageryStatus?: ExploreRecipeCard["imageryStatus"];
    heldImageryLabel?: ExploreRecipeCard["heldImageryLabel"];
  },
>(detail: D, preview: ExploreRecipeCard | null | undefined): D {
  if (!preview || preview.id !== detail.id) {
    return detail;
  }
  const tier = preview.imageryStatus ?? detail.imageryStatus;
  const softHeld = tier === "soft_held";
  return {
    ...detail,
    title: detail.title || preview.title,
    image: softHeld ? "" : detail.image || preview.image,
    imageAlt: detail.imageAlt || preview.title,
    imageryStatus: tier,
    heldImageryLabel: preview.heldImageryLabel ?? detail.heldImageryLabel,
  };
}

export function imageUrlForRecipeCard(card: Pick<ExploreRecipeCard, "id" | "image">): string {
  const custom = (card.image || "").trim();
  if (custom && !custom.includes("spoonacular.com")) {
    return custom;
  }
  if (custom.includes("spoonacular.com")) {
    // Curated platform rule: never fall back to external Spoonacular images at runtime.
    // If a curated card still carries a Spoonacular URL, we treat it as missing so the UI
    // can use a local editorial fallback instead of pulling external content.
    return "";
  }
  return "";
}
