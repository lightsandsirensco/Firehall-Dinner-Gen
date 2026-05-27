import type { IngestRecipeDraft } from "./recipe-ingest-schema.js";
import type { MealArchetype } from "../canonical-recipe.js";

/**
 * Legacy explore pool ids — maps to explore-discovery-catalog poolTag.
 * New editorial taxonomy: @shared/categories (12 master categories).
 */

/** Explore editorial pool ids — maps to explore-discovery-catalog poolTag */
export const EXPLORE_POOL_IDS = [
  "trending",
  "bbq",
  "comfort",
  "quick",
  "one_pot",
  "pasta",
  "hearty",
  "handheld",
  "chicken",
  "beef",
  "bowl",
  "slow",
  "healthy",
  "game_day",
  "breakfast",
] as const;

export type ExplorePoolId = (typeof EXPLORE_POOL_IDS)[number];

const ARCHETYPE_POOL: Partial<Record<MealArchetype, ExplorePoolId>> = {
  pasta_night: "pasta",
  taco_night: "handheld",
  bbq_night: "bbq",
  sandwich_night: "handheld",
  healthy_bowl: "bowl",
  slow_cooker: "slow",
  grill_night: "bbq",
  comfort_night: "comfort",
  breakfast_dinner: "breakfast",
  station_classic: "trending",
  plated_main: "trending",
};

export function assignExploreCategories(draft: Pick<IngestRecipeDraft, "title" | "summary" | "mealArchetype" | "protein" | "totalMinutes" | "tags"> & { summary?: string }): string[] {
  const categories = new Set<string>();
  const text = `${draft.title} ${draft.summary || ""} ${(draft.tags || []).join(" ")}`.toLowerCase();

  const archetypePool = ARCHETYPE_POOL[draft.mealArchetype];
  if (archetypePool) categories.add(archetypePool);

  if (draft.totalMinutes > 0 && draft.totalMinutes <= 30) categories.add("quick");
  if (/chili|stew|soup|chowder/.test(text)) categories.add("hearty");
  if (/bbq|grill|smoked|ribs/.test(text)) categories.add("bbq");
  if (/mac and cheese|comfort|cheesy|meatloaf/.test(text)) categories.add("comfort");
  if (/one pot|sheet pan|skillet|dutch oven/.test(text)) categories.add("one_pot");
  if (/pasta|spaghetti|lasagna/.test(text)) categories.add("pasta");
  if (/sandwich|burger|wrap|slider/.test(text)) categories.add("handheld");
  if (/slow cooker|crockpot|pot roast/.test(text)) categories.add("slow");
  if (/wings|nachos|game day/.test(text)) categories.add("game_day");
  if (/breakfast|pancake|hash|eggs/.test(text)) categories.add("breakfast");
  if (/healthy|salmon|grilled chicken|lean/.test(text)) categories.add("healthy");

  const protein = (draft.protein || "").toLowerCase();
  if (protein === "chicken") categories.add("chicken");
  if (protein === "beef") categories.add("beef");

  if (categories.size === 0) categories.add("trending");

  return [...categories].slice(0, 4);
}

/** Side dish / pairing tags for crew plating and recommendation */
export function inferSideDishTags(title: string, hints: string[] = []): string[] {
  const tags = new Set<string>();
  const text = `${title} ${hints.join(" ")}`.toLowerCase();

  if (/mashed potato|baked potato|roasted potato|fries/.test(text)) tags.add("side:potatoes");
  if (/rice|pilaf/.test(text)) tags.add("side:rice");
  if (/coleslaw|slaw/.test(text)) tags.add("side:slaw");
  if (/corn|cornbread/.test(text)) tags.add("side:corn");
  if (/salad|greens/.test(text)) tags.add("side:salad");
  if (/garlic bread|rolls|biscuit/.test(text)) tags.add("side:bread");
  if (/beans|baked beans/.test(text)) tags.add("side:beans");
  if (/grilled vegetable|roasted vegetable|asparagus|broccoli/.test(text))
    tags.add("side:vegetables");

  return [...tags];
}
