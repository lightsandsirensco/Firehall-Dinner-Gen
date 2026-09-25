/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory client API.
 * Thin wrappers around /api/meal-history — server is the sole source of
 * truth for entitlement; these calls simply surface its response.
 */
import { apiRequest } from "@/lib/queryClient";
import type {
  MealHistoryCreateResponse,
  MealHistoryListResponse,
} from "@shared/meal-history/types";

export async function fetchMealHistory(): Promise<MealHistoryListResponse> {
  const res = await apiRequest("GET", "/api/meal-history");
  return res.json();
}

export async function postMealCooked(recipeSlug: string): Promise<MealHistoryCreateResponse> {
  const res = await apiRequest("POST", "/api/meal-history", { recipe_slug: recipeSlug });
  return res.json();
}

export async function deleteMealHistoryEntry(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/meal-history/${id}`);
}
