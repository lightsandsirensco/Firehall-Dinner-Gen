import type { ExploreRecipeDetail } from "../shared/explore-recipe-detail.js";

export interface ExploreDetailLookupHints {
  slug?: string;
  curatedRecipeId?: string;
}

export interface ExploreRecipeDetailPayload extends ExploreRecipeDetail {
  imageAlt: string;
  _fromCurated?: boolean;
  _curatedRecipeId?: string;
  _publisherName?: string;
}
