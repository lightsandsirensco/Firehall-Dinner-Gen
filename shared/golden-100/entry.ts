import type { MasterCategoryId } from "../categories/constants.js";
import { humanRecipeTitle } from "../recipe-human-titles.js";
import type { GoldenImageryMeta, GoldenRecipeDefinition, GoldenRecommendationMeta } from "./types.js";

type EntryInput = {
  slug: string;
  title: string;
  cat: MasterCategoryId;
  protein: string;
  cuisine: string;
  format: string;
  pools: string[];
  hook: string;
  search?: string;
  id?: number;
  classic?: string;
  inspiration?: string;
  rec?: Partial<GoldenRecommendationMeta>;
  img?: Partial<GoldenImageryMeta>;
  featured?: boolean;
};

const DEFAULT_IMG: GoldenImageryMeta = {
  shotPreset: "plated_main",
  promptFocus: "generous hall portion, warm editorial light, shallow depth of field",
  mobileCrop: "center",
  lightingStyle: "warm_editorial",
};

function defaultRec(cat: MasterCategoryId): GoldenRecommendationMeta {
  const quick = cat === "quick_shift_meals" || cat === "rookie_friendly";
  const comfort = cat === "comfort_food" || cat === "firehall_classics";
  const healthy = cat === "healthy_performance";
  const game = cat === "game_day_watch_party";
  const big = cat === "big_crew_feeders";
  return {
    feedsHardScore: big ? 9 : comfort ? 7 : 6,
    cleanupScore: quick ? 8 : 5,
    rookieFriendly: cat === "rookie_friendly" ? 9 : quick ? 7 : 5,
    comfortFoodScore: comfort ? 9 : healthy ? 3 : 6,
    healthyScore: healthy ? 9 : comfort ? 4 : 5,
    gameDayMeal: game,
    quickShiftMeal: quick,
    mealPrepFriendly: cat === "meal_prep_leftovers",
  };
}

export function goldenEntry(input: EntryInput): GoldenRecipeDefinition {
  const shot =
    input.img?.shotPreset ||
    (input.format === "burger"
      ? "burger"
      : input.format === "tacos"
        ? "tacos"
        : input.format === "pasta"
          ? "pasta"
          : input.format === "pizza"
            ? "pizza"
            : input.format === "soup_chili"
              ? "soup_chili"
              : input.format === "bowl"
                ? "bowl"
                : input.format === "grill"
                  ? "grill"
                  : "plated_main");

  return {
    slug: input.slug,
    title: humanRecipeTitle(input.slug, input.title),
    masterCategoryId: input.cat,
    protein: input.protein,
    cuisine: input.cuisine,
    mealFormat: input.format,
    explorePools: input.pools,
    hookLine: input.hook,
    sourceInspiration: input.inspiration,
    classicSlug: input.classic,
    spoonacularId: input.id,
    spoonacularSearch: input.search,
    recommendation: { ...defaultRec(input.cat), ...input.rec },
    imagery: { ...DEFAULT_IMG, shotPreset: shot, ...input.img },
    featured: input.featured ?? true,
  };
}
