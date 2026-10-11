/**
 * Firehall Meals Pro — saved "Nutrition Goal" for Pick Tonight and Shift Planner.
 *
 * The goal is read from the account profile server-side (never client-submitted),
 * so a Free/guest session cannot spoof it. The entitlement check is always the
 * final word: a non-entitled or downgraded account gets `null` even if a goal is
 * still stored from a previous Pro period.
 */
import { hasFeature, type UserBillingState } from "../../shared/billing/types.js";
import {
  sanitizeProfileNutritionGoal,
  type ProfileGoalRecipeFacts,
  type ProfileNutritionGoalKey,
} from "../../shared/nutrition/profile-goals.js";
import { getApprovedCatalog } from "../approved-catalog-cache.js";
import { pgOne } from "../db/pg-sql.js";

export function gateNutritionGoalByEntitlement(
  billing: Pick<UserBillingState, "features">,
  saved: readonly unknown[],
): ProfileNutritionGoalKey | null {
  return hasFeature(billing.features, "nutrition_goals") ? sanitizeProfileNutritionGoal(saved) : null;
}

export async function loadEntitledNutritionGoal(
  userId: string,
  billing: Pick<UserBillingState, "features">,
): Promise<ProfileNutritionGoalKey | null> {
  if (!hasFeature(billing.features, "nutrition_goals")) return null;
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
  return gateNutritionGoalByEntitlement(billing, saved);
}

let catalogFacts: { source: unknown; bySlug: Map<string, ProfileGoalRecipeFacts> } | null = null;

/**
 * Ranking facts for one recipe — only the approved catalog's integrity-verified
 * per-serving macros (present only when `numericFilterEligible`). Recipes without
 * them get no facts and score neutral (0): catalog flags, the curated-store
 * `macros_per_serving`, and the macro-derived nutritionCategory have not passed
 * shared/nutrition/filter-eligibility.ts.
 */
export function nutritionGoalFactsForSlug(slug: string): ProfileGoalRecipeFacts {
  const catalog = getApprovedCatalog();
  if (catalogFacts?.source !== catalog) {
    catalogFacts = {
      source: catalog,
      bySlug: new Map(
        catalog.recipes
          .filter((r) => r.numericFilterEligible && r.macros)
          .map((r) => [
            r.slug,
            {
              calories: r.macros!.calories,
              protein_g: r.macros!.protein,
              carbs_g: r.macros!.carbs,
              fat_g: r.macros!.fat,
            },
          ]),
      ),
    };
  }
  return catalogFacts.bySlug.get(slug) ?? {};
}
