/**
 * Firehall Meals Meal History + Crew Feedback client API.
 * Thin wrappers around /api/meal-history — server is the sole source of
 * truth for entitlement; these calls simply surface its response.
 */
import { apiRequest } from "@/lib/queryClient";
import type {
  MealFeedbackInput,
  MealHistoryCreateResponse,
  MealHistoryFeedbackResponse,
  MealHistoryListResponse,
  MealLogContext,
} from "@shared/meal-history/types";

export async function fetchMealHistory(): Promise<MealHistoryListResponse> {
  const res = await apiRequest("GET", "/api/meal-history");
  return res.json();
}

/** Records a "Made This" / Cook Mode completion event with whatever real context is on hand. */
export async function postMealCooked(
  recipeSlug: string,
  context?: MealLogContext,
): Promise<MealHistoryCreateResponse> {
  const res = await apiRequest("POST", "/api/meal-history", {
    recipe_slug: recipeSlug,
    ...context,
  });
  return res.json();
}

/** Submits (or edits) post-meal crew feedback on an existing history row. Every field optional. */
export async function submitMealFeedback(
  id: number,
  feedback: MealFeedbackInput,
): Promise<MealHistoryFeedbackResponse> {
  const res = await apiRequest("PATCH", `/api/meal-history/${id}/feedback`, feedback);
  return res.json();
}

export async function deleteMealHistoryEntry(id: number): Promise<void> {
  await apiRequest("DELETE", `/api/meal-history/${id}`);
}
