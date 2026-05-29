/**
 * Future community features — types only (not wired to UI yet).
 *
 * Planned: hall submissions, voting, regional meals, firefighter stories.
 */

export type CommunityContentStatus = "draft" | "pending_review" | "published" | "archived";

export interface HallSubmissionDraft {
  id: string;
  hallName?: string;
  region?: string;
  title: string;
  slug?: string;
  story?: string;
  submittedBy?: string;
  status: CommunityContentStatus;
  createdAt: string;
}

export interface HallVoteRecord {
  recipeSlug: string;
  hallId?: string;
  vote: "up" | "legendary";
  createdAt: string;
}

export interface RegionalMealTag {
  region: string;
  label: string;
  slug: string;
}

export interface FirefighterStory {
  id: string;
  title: string;
  body: string;
  hallName?: string;
  relatedRecipeSlugs?: string[];
  status: CommunityContentStatus;
  publishedAt?: string;
}

/** API contract placeholder — implement when community launches */
export interface CommunityApiV1 {
  submitMeal: (draft: Omit<HallSubmissionDraft, "id" | "status" | "createdAt">) => Promise<{ id: string }>;
  voteRecipe: (vote: Omit<HallVoteRecord, "createdAt">) => Promise<void>;
  listHallFavorites: (region?: string) => Promise<{ slug: string; votes: number }[]>;
}
