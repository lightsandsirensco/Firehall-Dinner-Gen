import type { RecipeDislike, RecipeDislikesResponse } from "@shared/meal-memory/types";
import { apiRequest } from "@/lib/queryClient";

export const RECIPE_DISLIKES_QUERY_KEY = ["/api/recipe-dislikes"] as const;

/** "Not for us": never auto-pick this meal again (signed-in users). */
export async function hideRecipeFromPicks(slug: string): Promise<void> {
  await apiRequest("POST", "/api/recipe-dislikes", { slug });
}

export async function unhideRecipe(slug: string): Promise<void> {
  await apiRequest("DELETE", `/api/recipe-dislikes/${encodeURIComponent(slug)}`);
}

export async function fetchRecipeDislikes(): Promise<RecipeDislike[]> {
  const res = await apiRequest("GET", "/api/recipe-dislikes");
  return ((await res.json()) as RecipeDislikesResponse).dislikes;
}
