import type { CanonicalRecipe } from "../canonical-recipe.js";
import type { MealArchetype } from "../canonical-recipe.js";

const ARCHETYPE_BY_POOL: Record<string, MealArchetype[]> = {
  trending: ["station_classic", "plated_main"],
  bbq: ["bbq_night", "grill_night"],
  comfort: ["comfort_night"],
  quick: ["plated_main", "healthy_bowl"],
  one_pot: ["comfort_night", "slow_cooker"],
  pasta: ["pasta_night"],
  hearty: ["slow_cooker", "comfort_night"],
  handheld: ["sandwich_night", "taco_night"],
  chicken: [],
  beef: [],
  bowl: ["healthy_bowl"],
  slow: ["slow_cooker"],
  healthy: ["healthy_bowl"],
  game_day: ["bbq_night"],
  breakfast: ["breakfast_dinner"],
};

export function canonicalMatchesExplorePool(recipe: CanonicalRecipe, poolTag: string): boolean {
  const pool = poolTag.toLowerCase();
  if (pool === "trending") return true;

  const archetypes = ARCHETYPE_BY_POOL[pool] || [];
  if (archetypes.includes(recipe.mealArchetype)) return true;

  const text = `${recipe.title} ${recipe.tags.join(" ")} ${recipe.mealFormat} ${recipe.protein}`.toLowerCase();

  if (pool === "chicken") return recipe.protein.toLowerCase() === "chicken";
  if (pool === "beef") return recipe.protein.toLowerCase() === "beef";

  const rules: Record<string, RegExp> = {
    bbq: /bbq|barbecue|grill|smoked|ribs|pulled pork/,
    comfort: /comfort|mac and cheese|meatloaf|pot pie|casserole|cheesy|chili/,
    quick: /quick|easy|30 minute|fast/,
    one_pot: /one pot|sheet pan|skillet|slow cooker|dutch oven/,
    pasta: /pasta|spaghetti|lasagna|ziti/,
    hearty: /chili|stew|soup|chowder/,
    handheld: /sandwich|wrap|slider|taco|burger/,
    bowl: /bowl|rice bowl|burrito bowl/,
    slow: /slow cooker|crockpot|pot roast/,
    healthy: /healthy|salmon|lean|grilled chicken/,
    game_day: /wings|nachos|sliders|party/,
    breakfast: /breakfast|pancake|hash|eggs/,
  };

  const rule = rules[pool];
  return rule ? rule.test(text) : true;
}
