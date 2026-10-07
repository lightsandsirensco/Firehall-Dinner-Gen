/**
 * Firehall Meals Pro — saved "Nutrition Goals" for the Generator.
 *
 * Goals are read from the account profile server-side (never client-submitted),
 * so a Free/guest session cannot spoof them. The entitlement check is always the
 * final word: a non-entitled or downgraded account gets `[]` even if goals are
 * still stored from a previous Pro period.
 */
import { hasFeature, type UserBillingState } from "../../shared/billing/types.js";
import {
  sanitizeProfileNutritionGoals,
  type ProfileNutritionGoalKey,
} from "../../shared/nutrition/profile-goals.js";
import { pgOne } from "../db/pg-sql.js";

export function gateNutritionGoalsByEntitlement(
  billing: Pick<UserBillingState, "features">,
  saved: readonly unknown[],
): ProfileNutritionGoalKey[] {
  if (saved.length === 0) return [];
  return hasFeature(billing.features, "nutrition_goals") ? sanitizeProfileNutritionGoals(saved) : [];
}

export async function loadEntitledNutritionGoals(
  userId: string,
  billing: Pick<UserBillingState, "features">,
): Promise<ProfileNutritionGoalKey[]> {
  if (!hasFeature(billing.features, "nutrition_goals")) return [];
  const row = await pgOne<{ nutrition_goals_json: string | null }>(
    `SELECT nutrition_goals_json FROM user_preferences WHERE user_id = $1`,
    [userId],
  );
  let saved: unknown[] = [];
  try {
    const parsed = JSON.parse(row?.nutrition_goals_json ?? "[]");
    if (Array.isArray(parsed)) saved = parsed;
  } catch {
    saved = [];
  }
  return gateNutritionGoalsByEntitlement(billing, saved);
}
