/**
 * Firefighter crew recipe ratings — thumbs up/down social proof (not star reviews).
 */

export type CrewRatingVote = "up" | "down";

export type CrewRatingComplaintCategory =
  | "too_complicated"
  | "too_expensive"
  | "not_enough_food"
  | "instructions_unclear"
  | "didnt_taste_great"
  | "image_mismatch"
  | "other";

export type RecipeCrewRatingBadgeId =
  | "crew_favourite"
  | "hall_favourite"
  | "top_rated"
  | "trending"
  | "rookie_approved"
  | "firehall_classic";

export interface RecipeCrewRatingStats {
  recipeSlug: string;
  thumbsUpCount: number;
  thumbsDownCount: number;
  totalVotes: number;
  /** 0–1 when totalVotes > 0 */
  approvalScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCrewRatingPublicView {
  recipeSlug: string;
  thumbsUpCount: number;
  thumbsDownCount: number;
  totalVotes: number;
  approvalScore: number | null;
  /** e.g. "92% Would Cook Again" */
  approvalLabel: string;
  /** null when totalVotes < 25 */
  ratingsLabel: string | null;
  badges: RecipeCrewRatingBadgeId[];
  userVote: CrewRatingVote | null;
}

export interface RecipeCrewRatingCollectionEntry {
  recipeSlug: string;
  title?: string;
  approvalScore: number | null;
  totalVotes: number;
  approvalLabel: string;
  badges: RecipeCrewRatingBadgeId[];
}

export interface RecipeCrewRatingCollectionsResponse {
  crewFavourites: RecipeCrewRatingCollectionEntry[];
  topRated: RecipeCrewRatingCollectionEntry[];
  trending: RecipeCrewRatingCollectionEntry[];
  rookieApproved: RecipeCrewRatingCollectionEntry[];
  firehallClassics: RecipeCrewRatingCollectionEntry[];
}

export const RECIPE_CREW_RATING_COLLECTION_KEYS = [
  "crewFavourites",
  "topRated",
  "trending",
  "rookieApproved",
  "firehallClassics",
] as const satisfies ReadonlyArray<keyof RecipeCrewRatingCollectionsResponse>;

export type RecipeCrewRatingCollectionKey = (typeof RECIPE_CREW_RATING_COLLECTION_KEYS)[number];

export const EMPTY_RECIPE_CREW_RATING_COLLECTIONS: RecipeCrewRatingCollectionsResponse = {
  crewFavourites: [],
  topRated: [],
  trending: [],
  rookieApproved: [],
  firehallClassics: [],
};

/** Ensure every collection key exists — missing or non-array values become []. */
export function normalizeRecipeCrewRatingCollections(
  input: Partial<RecipeCrewRatingCollectionsResponse> | null | undefined,
): RecipeCrewRatingCollectionsResponse {
  return {
    crewFavourites: Array.isArray(input?.crewFavourites) ? input.crewFavourites : [],
    topRated: Array.isArray(input?.topRated) ? input.topRated : [],
    trending: Array.isArray(input?.trending) ? input.trending : [],
    rookieApproved: Array.isArray(input?.rookieApproved) ? input.rookieApproved : [],
    firehallClassics: Array.isArray(input?.firehallClassics) ? input.firehallClassics : [],
  };
}

export const CREW_RATING_COMPLAINT_LABELS: Record<CrewRatingComplaintCategory, string> = {
  too_complicated: "Too complicated",
  too_expensive: "Too expensive",
  not_enough_food: "Not enough food",
  instructions_unclear: "Instructions unclear",
  didnt_taste_great: "Didn't taste great",
  image_mismatch: "Image didn't match recipe",
  other: "Other",
};

export const RECIPE_CREW_RATING_BADGE_LABELS: Record<RecipeCrewRatingBadgeId, string> = {
  crew_favourite: "Crew Favourite",
  hall_favourite: "Hall Favourite",
  top_rated: "Top Rated",
  trending: "Trending",
  rookie_approved: "Rookie Approved",
  firehall_classic: "Firehall Classic",
};

export const RECIPE_CREW_RATING_BADGE_EMOJI: Record<RecipeCrewRatingBadgeId, string> = {
  crew_favourite: "🔥",
  hall_favourite: "🥇",
  top_rated: "⭐",
  trending: "📈",
  rookie_approved: "👨‍🚒",
  firehall_classic: "🏆",
};
