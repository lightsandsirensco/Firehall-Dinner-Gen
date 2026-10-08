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
  MealHistoryImportResponse,
  MealHistoryListResponse,
  MealLogContext,
} from "@shared/meal-history/types";

export async function fetchMealHistory(): Promise<MealHistoryListResponse> {
  const res = await apiRequest("GET", "/api/meal-history");
  return res.json();
}

/**
 * Records a "Made This" / Cook Mode completion event with whatever real context is on hand.
 * `clientEntryId` is the matching local history entry id, so a later import never duplicates it.
 */
export async function postMealCooked(
  recipeSlug: string,
  context?: MealLogContext,
  clientEntryId?: string,
): Promise<MealHistoryCreateResponse> {
  const res = await apiRequest("POST", "/api/meal-history", {
    recipe_slug: recipeSlug,
    ...(clientEntryId ? { client_entry_id: clientEntryId } : {}),
    ...context,
  });
  return res.json();
}

export async function postMealHistoryImport(
  entries: MealHistoryImportRequestEntry[],
): Promise<MealHistoryImportResponse> {
  const res = await apiRequest("POST", "/api/meal-history/import", { entries });
  return res.json();
}

export interface MealHistoryImportRequestEntry {
  client_entry_id: string;
  recipe_slug: string;
  cooked_at: string;
  crew_size?: number;
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
