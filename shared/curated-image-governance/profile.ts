import { inferMealShotCategory } from "../food-imagery/shot-presets.js";
import { inferPlatingType } from "../plating-type.js";
import {
  allowedHeroSignals,
  inferVisualSignalsFromTitle,
  type MealVisualSignal,
} from "../meal-image-title-match.js";
import type { CuratedMealImageProfile } from "./types.js";

export function buildCuratedMealImageProfile(input: {
  slug: string;
  title: string;
  protein?: string;
  cuisine?: string;
  mealFormat?: string;
  mealArchetype?: string;
}): CuratedMealImageProfile {
  const title = input.title.trim();
  const mealFormat = (input.mealFormat || "plated_main").trim();
  const protein = (input.protein || "any").trim().toLowerCase();
  const cuisine = (input.cuisine || "american").trim().toLowerCase();
  const shotCategory = inferMealShotCategory(mealFormat, title, cuisine);
  const visualSignals = inferVisualSignalsFromTitle(title, mealFormat);
  const platingType = inferPlatingType(title, mealFormat);

  return {
    slug: input.slug,
    title,
    protein,
    cuisine,
    mealFormat,
    mealArchetype: input.mealArchetype,
    shotCategory,
    visualSignals,
    platingType,
  };
}

export function profileAllowsSignal(
  profile: CuratedMealImageProfile,
  signal: MealVisualSignal,
): boolean {
  const allowed = allowedHeroSignals(profile.title, profile.mealFormat);
  return allowed.has(signal) || signal === "generic";
}
