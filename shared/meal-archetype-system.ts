/**
 * Hall meal archetype families — curated dinner "nights" with variation slots.
 * Recipes map to a family + optional variation label for Explore / Hall Vote / personalization.
 */

import type { MealArchetype } from "./canonical-recipe.js";

/** Editorial dinner-night families (broader than legacy MealArchetype) */
export type HallArchetypeFamily =
  | "taco_night"
  | "chicken_parm_night"
  | "bbq_night"
  | "chili_night"
  | "pasta_night"
  | "sandwich_night"
  | "pizza_night"
  | "slow_cooker_night"
  | "grill_night"
  | "healthy_bowl_night"
  | "comfort_night"
  | "breakfast_night"
  | "soup_stew_night"
  | "game_day_spread"
  | "station_plated";

export interface HallArchetypeDefinition {
  id: HallArchetypeFamily;
  displayName: string;
  tagline: string;
  /** Legacy meal_archetype column value */
  legacyArchetype: MealArchetype;
  explorePools: string[];
  /** Typical proteins for balance planning */
  proteins: string[];
  /** Title/summary patterns for inference */
  patterns: RegExp[];
  /** Variation examples shown in UI / vote */
  variations: string[];
}

export const HALL_ARCHETYPE_DEFINITIONS: HallArchetypeDefinition[] = [
  {
    id: "taco_night",
    displayName: "Taco Night",
    tagline: "Build-your-own crew spread",
    legacyArchetype: "taco_night",
    explorePools: ["handheld", "beef", "chicken"],
    proteins: ["beef", "chicken", "pork"],
    patterns: [/taco|fajita|burrito|enchilada|quesadilla|carnitas/i],
    variations: ["Street Tacos", "Loaded Burrito Bowls", "Carnitas Spread", "Chicken Tinga"],
  },
  {
    id: "chicken_parm_night",
    displayName: "Chicken Parm Night",
    tagline: "Crispy cutlets, melted cheese, hall pasta",
    legacyArchetype: "comfort_night",
    explorePools: ["comfort", "pasta", "chicken"],
    proteins: ["chicken"],
    patterns: [/chicken parm|parmesan chicken|chicken parmesan|cutlet/i],
    variations: ["Classic Cutlets", "Meatball Parm", "Eggplant Parm", "Parm Subs"],
  },
  {
    id: "bbq_night",
    displayName: "BBQ Night",
    tagline: "Smoky, saucy, grill energy",
    legacyArchetype: "bbq_night",
    explorePools: ["bbq", "beef", "comfort"],
    proteins: ["beef", "pork", "chicken"],
    patterns: [/bbq|barbecue|pulled pork|ribs|brisket|smoked/i],
    variations: ["Pulled Pork", "BBQ Chicken", "Smoked Ribs", "Brisket Sandwiches"],
  },
  {
    id: "chili_night",
    displayName: "Chili Night",
    tagline: "Big pot, big crew, big flavor",
    legacyArchetype: "comfort_night",
    explorePools: ["hearty", "comfort", "slow", "beef"],
    proteins: ["beef", "turkey", "mixed"],
    patterns: [/chili|chilli|chowder|stew(?!ed)/i],
    variations: ["Beef Chili", "Turkey Chili", "White Chicken Chili", "Texas Chili"],
  },
  {
    id: "pasta_night",
    displayName: "Pasta Night",
    tagline: "Crowd-pleasing carbs and sauce",
    legacyArchetype: "pasta_night",
    explorePools: ["pasta", "comfort", "chicken"],
    proteins: ["beef", "chicken", "pork"],
    patterns: [/pasta|spaghetti|lasagna|penne|rigatoni|alfredo|bolognese|macaroni/i],
    variations: ["Baked Ziti", "Meat Sauce", "Alfredo", "Sausage & Peppers"],
  },
  {
    id: "sandwich_night",
    displayName: "Sandwich Night",
    tagline: "Handheld hall classics",
    legacyArchetype: "sandwich_night",
    explorePools: ["handheld", "beef", "chicken"],
    proteins: ["beef", "chicken", "pork"],
    patterns: [/sandwich|burger|sub|hoagie|philly|slider|wrap/i],
    variations: ["Philly Cheesesteak", "Sloppy Joes", "Chicken Melts", "Italian Subs"],
  },
  {
    id: "pizza_night",
    displayName: "Pizza Night",
    tagline: "Oven-fired crew fuel",
    legacyArchetype: "comfort_night",
    explorePools: ["comfort", "game_day", "handheld"],
    proteins: ["beef", "chicken", "pork"],
    patterns: [/pizza|flatbread|stromboli|calzone/i],
    variations: ["Pepperoni", "BBQ Chicken", "Supreme", "Buffalo Chicken"],
  },
  {
    id: "slow_cooker_night",
    displayName: "Slow Cooker Night",
    tagline: "Set it during downtime",
    legacyArchetype: "slow_cooker",
    explorePools: ["slow", "comfort", "hearty"],
    proteins: ["beef", "pork", "chicken"],
    patterns: [/slow cooker|crockpot|crock pot|pot roast|braised/i],
    variations: ["Pot Roast", "Pulled Pork", "Chicken Tortilla Soup", "Beef Stew"],
  },
  {
    id: "grill_night",
    displayName: "Grill Night",
    tagline: "Char, smoke, crew portions",
    legacyArchetype: "grill_night",
    explorePools: ["bbq", "beef", "chicken"],
    proteins: ["beef", "chicken", "pork", "seafood"],
    patterns: [/grill|grilled|charred|skirt steak|kebab/i],
    variations: ["Burgers", "Grilled Chicken", "Steak Tips", "Kabobs"],
  },
  {
    id: "healthy_bowl_night",
    displayName: "Healthy Bowl Night",
    tagline: "Lighter plates, still satisfying",
    legacyArchetype: "healthy_bowl",
    explorePools: ["healthy", "bowl", "chicken"],
    proteins: ["chicken", "seafood", "vegetarian"],
    patterns: [/bowl|grain bowl|salmon|sheet pan.*veg|lean/i],
    variations: ["Chicken Rice Bowl", "Salmon Sheet Pan", "Burrito Bowls", "Stir-Fry Bowls"],
  },
  {
    id: "comfort_night",
    displayName: "Comfort Night",
    tagline: "Mac, casseroles, crew nostalgia",
    legacyArchetype: "comfort_night",
    explorePools: ["comfort", "one_pot"],
    proteins: ["beef", "chicken", "pork"],
    patterns: [/mac and cheese|meatloaf|pot pie|casserole|shepherd/i],
    variations: ["Mac & Cheese", "Meatloaf", "Shepherd's Pie", "Tater Tot Hotdish"],
  },
  {
    id: "breakfast_night",
    displayName: "Breakfast for Dinner",
    tagline: "Eggs, bacon, hall hash",
    legacyArchetype: "breakfast_dinner",
    explorePools: ["breakfast", "comfort"],
    proteins: ["pork", "chicken", "mixed"],
    patterns: [/breakfast|pancake|waffle|hash|omelet|biscuit/i],
    variations: ["Breakfast Burritos", "Sheet Pan Hash", "Biscuits & Gravy", "Egg Bake"],
  },
  {
    id: "soup_stew_night",
    displayName: "Soup & Stew Night",
    tagline: "Ladle-friendly crew meals",
    legacyArchetype: "comfort_night",
    explorePools: ["hearty", "slow", "comfort"],
    proteins: ["beef", "chicken", "mixed"],
    patterns: [/soup|stew|gumbo|bisque/i],
    variations: ["Chicken Noodle", "Beef Stew", "Tortilla Soup", "Minestrone"],
  },
  {
    id: "game_day_spread",
    displayName: "Game Day Spread",
    tagline: "Wings, dips, feed-the-crowd",
    legacyArchetype: "station_classic",
    explorePools: ["game_day", "handheld", "chicken"],
    proteins: ["chicken", "beef", "pork"],
    patterns: [/wings|nachos|dip|sliders|game day|finger food/i],
    variations: ["Buffalo Wings", "Nachos", "Sliders", "Queso Dip"],
  },
  {
    id: "station_plated",
    displayName: "Plated Dinner",
    tagline: "Classic protein + sides",
    legacyArchetype: "plated_main",
    explorePools: ["trending", "chicken", "beef"],
    proteins: ["chicken", "beef", "pork", "seafood"],
    patterns: [/./],
    variations: ["Roast Chicken", "Pork Chops", "Pan-Seared Salmon", "Steak Night"],
  },
];

const BY_ID = new Map(HALL_ARCHETYPE_DEFINITIONS.map((d) => [d.id, d]));

export function getArchetypeDefinition(id: HallArchetypeFamily): HallArchetypeDefinition {
  return BY_ID.get(id) ?? BY_ID.get("station_plated")!;
}

export function inferHallArchetypeFamily(input: {
  title: string;
  summary?: string;
  mealFormat?: string;
  tags?: string[];
  protein?: string;
}): HallArchetypeFamily {
  const text = `${input.title} ${input.summary || ""} ${(input.tags || []).join(" ")} ${input.mealFormat || ""}`;

  for (const def of HALL_ARCHETYPE_DEFINITIONS) {
    if (def.id === "station_plated") continue;
    if (def.patterns.some((re) => re.test(text))) return def.id;
  }

  const fmt = (input.mealFormat || "").toLowerCase();
  if (fmt === "tacos") return "taco_night";
  if (fmt === "pasta") return "pasta_night";
  if (fmt === "burger" || fmt === "sandwich") return "sandwich_night";
  if (fmt === "soup_chili") return "chili_night";
  if (fmt === "grill") return "grill_night";
  if (fmt === "one_pot" || fmt === "casserole") return "slow_cooker_night";
  if (fmt === "bowl") return "healthy_bowl_night";

  return "station_plated";
}

export function archetypeExplorePools(family: HallArchetypeFamily): string[] {
  return getArchetypeDefinition(family).explorePools;
}

export function archetypeToLegacyMealArchetype(family: HallArchetypeFamily): MealArchetype {
  return getArchetypeDefinition(family).legacyArchetype;
}

/** Pick a variation label for editorial display (deterministic from title) */
export function pickArchetypeVariation(family: HallArchetypeFamily, title: string): string {
  const def = getArchetypeDefinition(family);
  if (def.variations.length === 0) return def.displayName;
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (Math.imul(31, h) + title.charCodeAt(i)) | 0;
  return def.variations[Math.abs(h) % def.variations.length];
}
