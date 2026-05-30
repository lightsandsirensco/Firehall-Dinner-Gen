import type {
  RecipeCrewRatingCollectionsResponse,
  RecipeCrewRatingPublicView,
} from "@shared/recipe-crew-ratings/types";
import { normalizeRecipeCrewRatingCollections } from "@shared/recipe-crew-ratings/types";
import type { CastCrewRatingVoteInput } from "@shared/recipe-crew-ratings/schema";
import { apiRequest } from "@/lib/queryClient";

export const crewRatingQueryKey = (slug: string) => ["recipe-crew-rating", slug] as const;
export const crewRatingCollectionsKey = ["recipe-crew-rating-collections"] as const;

export async function fetchRecipeCrewRating(
  slug: string,
  category?: string,
): Promise<RecipeCrewRatingPublicView> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const qs = params.toString();
  const res = await fetch(
    `/api/recipe-ratings/${encodeURIComponent(slug)}${qs ? `?${qs}` : ""}`,
    { credentials: "same-origin" },
  );
  if (!res.ok) throw new Error(`Rating fetch ${res.status}`);
  return res.json();
}

export async function castRecipeCrewRatingVote(
  slug: string,
  body: CastCrewRatingVoteInput,
): Promise<RecipeCrewRatingPublicView> {
  const res = await apiRequest("POST", `/api/recipe-ratings/${encodeURIComponent(slug)}/vote`, body);
  return res.json();
}

export async function fetchRecipeCrewRatingCollections(): Promise<RecipeCrewRatingCollectionsResponse> {
  const res = await fetch("/api/recipe-ratings/collections", { credentials: "same-origin" });
  if (!res.ok) return normalizeRecipeCrewRatingCollections(null);
  const json = (await res.json()) as Partial<RecipeCrewRatingCollectionsResponse>;
  return normalizeRecipeCrewRatingCollections(json);
}

export type RecipeRatingSortMap = Record<
  string,
  { approvalScore: number | null; totalVotes: number; trendingScore: number }
>;

export async function fetchRecipeRatingSortMap(): Promise<RecipeRatingSortMap> {
  const res = await fetch("/api/recipe-ratings/sort-map", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Sort map ${res.status}`);
  const data = (await res.json()) as { slugs: RecipeRatingSortMap };
  return data.slugs;
}

export async function fetchAdminRecipeRatingAnalytics(): Promise<unknown> {
  const res = await fetch("/api/admin/recipe-ratings/analytics", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Analytics ${res.status}`);
  return res.json();
}
