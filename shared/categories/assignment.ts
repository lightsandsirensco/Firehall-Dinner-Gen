/**
 * Rule-based category assignment + curated starter mappings.
 */

import type { GenerateResponse } from "../schema.js";
import type { ClassicHallMealMeta } from "../classic-hall-meals.js";
import { CLASSIC_HALL_MEALS } from "../classic-hall-meals.js";
import type { MasterCategoryId } from "./constants.js";
import { MASTER_CATEGORIES_BY_ID } from "./definitions.js";
import {
  rankCategoriesForRecipe,
  pickPrimaryAndSecondary,
  type CategoryScoreInput,
} from "./scoring.js";
import type { CategoryAssignment, RecipeCategoryClassification } from "./types.js";
import { categoryAssignmentSchema } from "./schema.js";

export interface AssignRecipeInput extends CategoryScoreInput {
  recipeKey: string;
  /** Force curated mapping (hall classics) */
  curatedSlug?: string;
}

/** Curated hall classic → primary/secondary categories */
export const CURATED_STARTER_ASSIGNMENTS: Record<
  string,
  { primary: MasterCategoryId; secondary: MasterCategoryId[]; subcategories: string[] }
> = {
  "chicken-parm": {
    primary: "firehall_classics",
    secondary: ["comfort_food", "global_flavors"],
    subcategories: ["parm-pasta-nights"],
  },
  "steak-tacos": {
    primary: "firehall_classics",
    secondary: ["bbq_grill_nights", "global_flavors"],
    subcategories: ["line-specials", "latin-night"],
  },
  "pulled-pork": {
    primary: "bbq_grill_nights",
    secondary: ["firehall_classics", "game_day_watch_party"],
    subcategories: ["sandwich-line"],
  },
  "smash-burgers": {
    primary: "firehall_classics",
    secondary: ["game_day_watch_party", "bbq_grill_nights"],
    subcategories: ["line-specials"],
  },
  "big-chili": {
    primary: "comfort_food",
    secondary: ["big_crew_feeders", "firehall_classics"],
    subcategories: ["bowls-stews"],
  },
  "chicken-caesar": {
    primary: "healthy_performance",
    secondary: ["quick_shift_meals", "global_flavors"],
    subcategories: ["grill-lean"],
  },
  "jerk-chicken": {
    primary: "global_flavors",
    secondary: ["bbq_grill_nights", "firehall_classics"],
    subcategories: ["latin-night"],
  },
  "beef-dip": {
    primary: "firehall_classics",
    secondary: ["comfort_food", "game_day_watch_party"],
    subcategories: ["line-specials"],
  },
  "bbq-chicken-mac-and-cheese": {
    primary: "comfort_food",
    secondary: ["bbq_grill_nights", "firehall_classics"],
    subcategories: ["baked-pasta"],
  },
  "steak-sandwiches": {
    primary: "firehall_classics",
    secondary: ["bbq_grill_nights", "quick_shift_meals"],
    subcategories: ["line-specials"],
  },
};

function inferSubcategories(
  primary: MasterCategoryId,
  blob: string,
): string[] {
  const def = MASTER_CATEGORIES_BY_ID[primary];
  if (!def) return [];
  const hits: string[] = [];
  for (const sub of def.subcategories) {
    if (sub.matchTags.some((t) => blob.includes(t.toLowerCase()))) {
      hits.push(sub.id);
    }
  }
  return hits.slice(0, 3);
}

export function assignMasterCategories(input: AssignRecipeInput): RecipeCategoryClassification {
  if (input.curatedSlug && CURATED_STARTER_ASSIGNMENTS[input.curatedSlug]) {
    const c = CURATED_STARTER_ASSIGNMENTS[input.curatedSlug];
    const assignment: CategoryAssignment = {
      recipeKey: input.recipeKey,
      primaryCategoryId: c.primary,
      secondaryCategoryIds: c.secondary,
      subcategoryIds: c.subcategories,
      confidence: 98,
      source: "curated",
    };
    return {
      primary: c.primary,
      secondary: c.secondary,
      subcategories: c.subcategories,
      scores: rankCategoriesForRecipe(input),
      assignment: categoryAssignmentSchema.parse(assignment),
    };
  }

  const scores = rankCategoriesForRecipe(input);
  const { primary, secondary } = pickPrimaryAndSecondary(scores);
  const blob = `${input.title || ""} ${(input.tags || []).join(" ")}`.toLowerCase();
  const subcategories = inferSubcategories(primary, blob);
  const top = scores[0]?.score ?? 0;

  const assignment: CategoryAssignment = {
    recipeKey: input.recipeKey,
    primaryCategoryId: primary,
    secondaryCategoryIds: secondary,
    subcategoryIds: subcategories,
    confidence: Math.min(100, Math.round(top)),
    source: "rules",
  };

  return {
    primary,
    secondary,
    subcategories,
    scores,
    assignment: categoryAssignmentSchema.parse(assignment),
  };
}

export function assignFromGenerateResponse(
  recipe: GenerateResponse,
  recipeKey: string,
  opts?: { curatedSlug?: string; crewSize?: number },
): RecipeCategoryClassification {
  return assignMasterCategories({
    recipeKey,
    curatedSlug: opts?.curatedSlug,
    title: recipe.title,
    summary: recipe.why_it_fits_tonight,
    mealFormat: recipe.meal_style,
    protein: recipe.chosen_protein,
    cuisine: recipe.tags?.cuisine,
    totalMinutes: recipe.timing?.total_minutes,
    crewSize: opts?.crewSize ?? 6,
    tags: [
      ...(recipe.tags?.key_ingredients || []),
      recipe.tags?.cuisine || "",
      recipe.tags?.cooking_method || "",
    ].filter(Boolean),
    recipe,
  });
}

export function buildStarterAssignmentsForClassics(): Array<{
  meal: ClassicHallMealMeta;
  classification: RecipeCategoryClassification;
}> {
  return CLASSIC_HALL_MEALS.map((meal) => ({
    meal,
    classification: assignMasterCategories({
      recipeKey: `curated:${meal.slug}`,
      curatedSlug: meal.slug,
      title: meal.title,
      mealFormat: meal.mealFormat,
      protein: meal.protein,
      cuisine: meal.cuisine,
      tags: meal.tags,
    }),
  }));
}
