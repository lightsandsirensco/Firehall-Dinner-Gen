/**
 * Single source of truth for the 10 Firehall Classic Wheel meals.
 * Hero images use verified Spoonacular recipe IDs — titles checked against the API.
 */

export type SpoonacularImageSize = "556x370" | "636x393" | "312x231";

export interface ClassicHallMealMeta {
  /** Stable id (same as slug) */
  id: string;
  slug: string;
  title: string;
  shortLabel: string;
  displayTitle: string;
  description: string;
  tagline: string;
  emoji: string;
  spoonacularRecipeId: number;
  /** Expected Spoonacular recipe title — used for dev validation */
  spoonacularTitle: string;
  imageAlt: string;
  imageKeywords: string[];
  externalUrl?: string;
  cuisine: string;
  mealFormat: string;
  protein: string;
  tags: string[];
  recipeSource: {
    type: "curated";
    spoonacularId: number;
    externalUrl?: string;
  };
  segmentColor: string;
  segmentColorAlt: string;
  searchQuery: string;
  generatorFilters: {
    meal_format: string;
    proteins: string[];
    cuisine_style: string;
  };
}

export function spoonacularHeroImage(
  recipeId: number,
  size: SpoonacularImageSize = "636x393",
): string {
  return `https://img.spoonacular.com/recipes/${recipeId}-${size}.jpg`;
}

/** Verified Spoonacular IDs (titles confirmed via API, May 2026). */
export const CLASSIC_HALL_MEALS: ClassicHallMealMeta[] = [
  {
    id: "chicken-parm",
    slug: "chicken-parm",
    title: "Chicken Parm",
    shortLabel: "Chicken Parm",
    displayTitle: "Chicken Parm Night — Italian Hall Spread",
    description: "Breaded cutlets, red sauce, pasta, and garlic bread — the full hall spread.",
    tagline: "Italian night at the station",
    emoji: "🍝",
    spoonacularRecipeId: 638235,
    spoonacularTitle: "Chicken Parmesan With Pasta",
    imageAlt: "Chicken parmesan with pasta and melted cheese",
    imageKeywords: ["chicken", "parmesan", "pasta", "italian"],
    externalUrl: "https://www.allrecipes.com/recipe/223042/chicken-parmesan/",
    cuisine: "Italian",
    mealFormat: "pasta",
    protein: "Chicken",
    tags: ["Italian", "Hall classic", "Pasta", "Chicken"],
    recipeSource: { type: "curated", spoonacularId: 638235, externalUrl: "https://www.allrecipes.com/recipe/223042/chicken-parmesan/" },
    segmentColor: "#8B2500",
    segmentColorAlt: "#C62828",
    searchQuery: "chicken parmesan",
    generatorFilters: { meal_format: "pasta", proteins: ["chicken"], cuisine_style: "italian" },
  },
  {
    id: "taco-night",
    slug: "taco-night",
    title: "Taco Night",
    shortLabel: "Taco Night",
    displayTitle: "Taco Night — Build-Your-Own Hall Spread",
    description: "Shells, salsa, and a line out the bay door.",
    tagline: "Build-your-own crew favorite",
    emoji: "🌮",
    spoonacularRecipeId: 1505411,
    spoonacularTitle: "Ground Beef Street Tacos",
    imageAlt: "Ground beef street tacos with fresh toppings",
    imageKeywords: ["taco", "beef", "mexican", "street"],
    cuisine: "Mexican",
    mealFormat: "tacos",
    protein: "Beef",
    tags: ["Mexican", "Hall classic", "Tacos", "Beef"],
    recipeSource: { type: "curated", spoonacularId: 1505411 },
    segmentColor: "#6B3A1F",
    segmentColorAlt: "#E65100",
    searchQuery: "ground beef tacos",
    generatorFilters: { meal_format: "tacos", proteins: ["beef"], cuisine_style: "mexican" },
  },
  {
    id: "pulled-pork",
    slug: "pulled-pork",
    title: "Pulled Pork Sandwiches",
    shortLabel: "Pulled Pork",
    displayTitle: "Pulled Pork Sandwiches — Hall Line Special",
    description: "Low-and-slow vibes without the lecture.",
    tagline: "Sandwich line for the whole hall",
    emoji: "🥪",
    spoonacularRecipeId: 657226,
    spoonacularTitle: "Pulled Pork Sandwich with Mango BBQ sauce",
    imageAlt: "Pulled pork sandwich with barbecue sauce",
    imageKeywords: ["pulled", "pork", "sandwich", "bbq"],
    cuisine: "BBQ",
    mealFormat: "sandwich",
    protein: "Pork",
    tags: ["BBQ", "Hall classic", "Sandwich", "Pork"],
    recipeSource: { type: "curated", spoonacularId: 657226 },
    segmentColor: "#5C3D2E",
    segmentColorAlt: "#BF360C",
    searchQuery: "pulled pork sandwich",
    generatorFilters: { meal_format: "sandwich", proteins: ["pork"], cuisine_style: "bbq" },
  },
  {
    id: "smash-burgers",
    slug: "smash-burgers",
    title: "Smash Burgers",
    shortLabel: "Smash Burgers",
    displayTitle: "Smash Burgers — Griddle Night at the Hall",
    description: "Crispy edges, melty cheese — shift-approved.",
    tagline: "Griddle night energy",
    emoji: "🍔",
    spoonacularRecipeId: 645680,
    spoonacularTitle: "Grilled Chuck Burgers with Extra Sharp Cheddar and Lemon Garlic Aioli",
    imageAlt: "Grilled cheeseburgers with melted cheddar",
    imageKeywords: ["burger", "beef", "cheddar", "grill"],
    cuisine: "American",
    mealFormat: "burger",
    protein: "Beef",
    tags: ["American", "Hall classic", "Burger", "Beef"],
    recipeSource: { type: "curated", spoonacularId: 645680 },
    segmentColor: "#4A3728",
    segmentColorAlt: "#D84315",
    searchQuery: "smash burgers with fries",
    generatorFilters: { meal_format: "burger", proteins: ["beef"], cuisine_style: "any" },
  },
  {
    id: "chili-garlic-bread",
    slug: "chili-garlic-bread",
    title: "Chili & Garlic Bread",
    shortLabel: "Chili & Bread",
    displayTitle: "Chili & Garlic Bread — Stick-to-Your-Ribs Hall Fuel",
    description: "One pot, big ladle, zero complaints.",
    tagline: "Stick-to-your-ribs hall fuel",
    emoji: "🌶️",
    spoonacularRecipeId: 660273,
    spoonacularTitle: "Slow Cooked Beef Chili",
    imageAlt: "Hearty slow-cooked beef chili in a bowl",
    imageKeywords: ["chili", "beef", "slow", "hearty"],
    cuisine: "American",
    mealFormat: "soup_chili",
    protein: "Beef",
    tags: ["American", "Hall classic", "Chili", "One-Pot"],
    recipeSource: { type: "curated", spoonacularId: 660273 },
    segmentColor: "#7F1D1D",
    segmentColorAlt: "#B71C1C",
    searchQuery: "beef chili garlic bread",
    generatorFilters: { meal_format: "soup_chili", proteins: ["beef"], cuisine_style: "any" },
  },
  {
    id: "chicken-caesar",
    slug: "chicken-caesar",
    title: "Chicken Caesar Salad",
    shortLabel: "Caesar Night",
    displayTitle: "Chicken Caesar Salad — Hearty Hall Spread",
    description:
      "Grilled chicken over a mountain of romaine — garlic bread, bacon, croutons, parmesan, and fries for the crew.",
    tagline: "Big bowls, hot chicken, all the fixings",
    emoji: "🥗",
    spoonacularRecipeId: 636682,
    spoonacularTitle: "Chicken Caesar Salad",
    imageAlt: "Hearty grilled chicken caesar salad with romaine and parmesan",
    imageKeywords: ["caesar", "chicken", "salad", "grilled", "romaine"],
    cuisine: "American",
    mealFormat: "salad",
    protein: "Chicken",
    tags: ["American", "Hall classic", "Chicken", "Comfort Food"],
    recipeSource: { type: "curated", spoonacularId: 636682 },
    segmentColor: "#1B4332",
    segmentColorAlt: "#40916C",
    searchQuery: "grilled chicken caesar salad",
    generatorFilters: { meal_format: "salad", proteins: ["chicken"], cuisine_style: "any" },
  },
  {
    id: "jerk-chicken",
    slug: "jerk-chicken",
    title: "Jerk Chicken",
    shortLabel: "Jerk Chicken",
    displayTitle: "Jerk Chicken — Fire on the Grill",
    description: "Char, spice, and Caribbean hall swagger.",
    tagline: "Fire on the grill",
    emoji: "🔥",
    spoonacularRecipeId: 637103,
    spoonacularTitle: "Caribbean Chicken Thighs",
    imageAlt: "Caribbean spiced grilled chicken thighs",
    imageKeywords: ["caribbean", "chicken", "grill", "spice"],
    cuisine: "Caribbean",
    mealFormat: "grill",
    protein: "Chicken",
    tags: ["Caribbean", "Hall classic", "Grilled", "Chicken"],
    recipeSource: { type: "curated", spoonacularId: 637103 },
    segmentColor: "#4A148C",
    segmentColorAlt: "#6A1B9A",
    searchQuery: "jerk chicken",
    generatorFilters: { meal_format: "grill", proteins: ["chicken"], cuisine_style: "any" },
  },
  {
    id: "beef-dip",
    slug: "beef-dip",
    title: "Beef Dip Sandwiches",
    shortLabel: "Beef Dip",
    displayTitle: "Beef Dip Sandwiches — Canadian Hall Legend",
    description: "Au jus on the counter — dip like you mean it.",
    tagline: "Canadian hall legend",
    emoji: "🥖",
    spoonacularRecipeId: 643330,
    spoonacularTitle: "French Dips With Au Jus",
    imageAlt: "French dip beef sandwich with au jus for dipping",
    imageKeywords: ["french", "dip", "beef", "sandwich", "au jus"],
    cuisine: "Canadian",
    mealFormat: "sandwich",
    protein: "Beef",
    tags: ["Canadian", "Hall classic", "Sandwich", "Beef"],
    recipeSource: { type: "curated", spoonacularId: 643330 },
    segmentColor: "#5D4037",
    segmentColorAlt: "#8D6E63",
    searchQuery: "french dip beef sandwich",
    generatorFilters: { meal_format: "sandwich", proteins: ["beef"], cuisine_style: "canadian" },
  },
  {
    id: "bbq-chicken-bowls",
    slug: "bbq-chicken-bowls",
    title: "BBQ Chicken Bowls",
    shortLabel: "BBQ Bowls",
    displayTitle: "BBQ Chicken Bowls — Line Up the Bowls",
    description: "Sweet smoke, rice base, everyone eats happy.",
    tagline: "Line up the bowls",
    emoji: "🍗",
    spoonacularRecipeId: 1096017,
    spoonacularTitle: "Mexican Chicken & Rice Bowl",
    imageAlt: "Chicken and rice bowl with barbecue flavors",
    imageKeywords: ["chicken", "rice", "bowl", "bbq"],
    cuisine: "BBQ",
    mealFormat: "bowl",
    protein: "Chicken",
    tags: ["BBQ", "Hall classic", "Bowl", "Chicken"],
    recipeSource: { type: "curated", spoonacularId: 1096017 },
    segmentColor: "#1565C0",
    segmentColorAlt: "#1976D2",
    searchQuery: "bbq chicken rice bowl",
    generatorFilters: { meal_format: "bowl", proteins: ["chicken"], cuisine_style: "bbq" },
  },
  {
    id: "steak-sandwiches",
    slug: "steak-sandwiches",
    title: "Steak Sandwiches",
    shortLabel: "Steak Sand.",
    displayTitle: "Steak Sandwiches — Hall Line Classic",
    description:
      "Sliced sirloin on toasted buns with garlic fries, Caesar, and roasted veg — toppings bar for the crew.",
    tagline: "Grill marks, melted cheese, sandwich line",
    emoji: "🥩",
    spoonacularRecipeId: 663235,
    spoonacularTitle: "The Best Steak Sandwich",
    imageAlt: "Sliced steak sandwich with melted cheese on a toasted roll",
    imageKeywords: ["steak", "sandwich", "beef", "grilled", "cheese"],
    cuisine: "American",
    mealFormat: "sandwich",
    protein: "Beef",
    tags: ["American", "Hall classic", "Sandwich", "Beef", "Comfort Food"],
    recipeSource: { type: "curated", spoonacularId: 663235 },
    segmentColor: "#4A2C2A",
    segmentColorAlt: "#8B4513",
    searchQuery: "steak sandwich grilled",
    generatorFilters: { meal_format: "sandwich", proteins: ["beef"], cuisine_style: "any" },
  },
];

const META_BY_SLUG = new Map(CLASSIC_HALL_MEALS.map((m) => [m.slug, m]));

export function getClassicHallMeal(slug: string): ClassicHallMealMeta | undefined {
  return META_BY_SLUG.get(slug.toLowerCase().trim());
}

export function getClassicHeroImage(slug: string, size: SpoonacularImageSize = "636x393"): string {
  const meta = getClassicHallMeal(slug);
  if (!meta) return "";
  return spoonacularHeroImage(meta.spoonacularRecipeId, size);
}

/** Extract Spoonacular recipe id embedded in a CDN image URL. */
export function extractSpoonacularIdFromImageUrl(url: string): number | null {
  const m = url.match(/recipes\/(\d+)-/i);
  if (!m) return null;
  const id = parseInt(m[1], 10);
  return Number.isFinite(id) ? id : null;
}

function keywordHits(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k.toLowerCase())).length;
}

/**
 * Dev-only: warn when hero URL id, alt text, or title keywords look inconsistent.
 */
export function validateClassicMealConsistency(
  meal: ClassicHallMealMeta,
  context: string,
  heroImage?: string,
): void {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") return;
  const isDev =
    (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");
  if (!isDev) return;

  const image = heroImage ?? spoonacularHeroImage(meal.spoonacularRecipeId);
  const urlId = extractSpoonacularIdFromImageUrl(image);
  if (urlId !== null && urlId !== meal.spoonacularRecipeId) {
    console.warn(
      `[classic-meal:${context}] Image URL recipe id ${urlId} ≠ expected ${meal.spoonacularRecipeId} for "${meal.slug}"`,
    );
  }

  const altHits = keywordHits(meal.imageAlt, meal.imageKeywords);
  const titleHits = keywordHits(meal.title, meal.imageKeywords);
  const spoonHits = keywordHits(meal.spoonacularTitle, meal.imageKeywords);
  if (altHits === 0 && titleHits === 0 && spoonHits === 0) {
    console.warn(
      `[classic-meal:${context}] No imageKeywords match title/alt/spoonacularTitle for "${meal.slug}"`,
      { keywords: meal.imageKeywords, title: meal.title, imageAlt: meal.imageAlt },
    );
  }

  if (titleHits === 0 && spoonHits < 2) {
    console.warn(
      `[classic-meal:${context}] Title "${meal.title}" may not match Spoonacular "${meal.spoonacularTitle}" (${meal.slug})`,
    );
  }
}

/** Run validation for all classics once (client dev boot or server import). */
export function validateAllClassicMeals(context = "init"): void {
  for (const meal of CLASSIC_HALL_MEALS) {
    validateClassicMealConsistency(meal, context);
  }
}
