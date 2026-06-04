/**
 * Single source of truth for the 10 Firehall Classic Wheel meals.
 * Hero images use verified Spoonacular recipe IDs — titles checked against the API.
 */

import { isDevRuntime } from "./runtime-env.js";
import { resolveClassicWheelImagery } from "./classic-wheel-imagery.js";

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
  /**
   * Optional site-root hero image when Spoonacular CDN does not match the hall classic.
   * Served from client/public (e.g. /images/explore/jerk-chicken-hero.jpg).
   */
  heroImagePath?: string;
  /** Explore Crew Favorites rail — overrides generic hook/summary when set */
  exploreHookLine?: string;
  exploreSummary?: string;
  exploreReadyMinutes?: number;
  exploreServings?: number;
  spiceLevelLabel?: string;
  /**
   * When not using heroImagePath, Spoonacular title must include at least one of these
   * (prevents Mexican bowl / salad photos on BBQ hall classics, etc.).
   */
  spoonacularTitleMustInclude?: string[];
}

export function spoonacularHeroImage(
  recipeId: number,
  size: SpoonacularImageSize = "636x393",
): string {
  return `https://img.spoonacular.com/recipes/${recipeId}-${size}.jpg`;
}

export type { ClassicWheelImagery } from "./classic-wheel-imagery.js";
export {
  resolveClassicWheelImagery,
  isOwnedCatalogHeroPath,
  isSpoonacularOrExternalHeroUrl,
} from "./classic-wheel-imagery.js";

/** Resolve Explore / wheel hero URL — owned catalog paths only (no Spoonacular CDN). */
export function resolveClassicHeroImage(
  meal: ClassicHallMealMeta,
  _size: SpoonacularImageSize = "636x393",
): string {
  return resolveClassicWheelImagery(meal).heroImage;
}

/** Verified Spoonacular IDs (titles confirmed via API, May 2026). */
export const CLASSIC_HALL_MEALS: ClassicHallMealMeta[] = [
  {
    id: "chicken-parm",
    slug: "chicken-parm",
    title: "Chicken Parmesan",
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
    heroImagePath: "/images/golden-100/chicken-parm.jpg",
  },
  {
    id: "steak-tacos",
    slug: "steak-tacos",
    title: "Steak Tacos",
    shortLabel: "Steak Tacos",
    displayTitle: "Street-Style Chimichurri Steak Tacos",
    description:
      "Charred tortillas, sliced skirt steak, bright chimichurri, pickled onions, cotija, and lime crema — no rice, just taco-line energy.",
    tagline: "Char, acid, and melty cotija",
    emoji: "🌮",
    spoonacularRecipeId: 716426,
    spoonacularTitle: "Flank Steak Tacos with Chimichurri",
    heroImagePath: "/images/golden-100/steak-tacos.jpg",
    imageAlt:
      "Street-style steak tacos with charred tortillas, chimichurri, pickled onions, cotija, and lime crema",
    imageKeywords: ["steak", "taco", "chimichurri", "charred", "cotija", "street", "mexican"],
    cuisine: "Mexican",
    mealFormat: "tacos",
    protein: "Beef",
    tags: ["Mexican", "Hall classic", "Tacos", "Beef", "Crew Favorite", "Grill Night"],
    recipeSource: { type: "curated", spoonacularId: 716426 },
    segmentColor: "#6B3A1F",
    segmentColorAlt: "#E65100",
    searchQuery: "flank steak tacos chimichurri",
    generatorFilters: { meal_format: "tacos", proteins: ["beef"], cuisine_style: "mexican" },
    exploreHookLine: "Charred steak · bright chimichurri · taco-line build",
    exploreSummary:
      "Crew Favorite · Grill Night · Medium spice · Street tacos (no rice sides)",
    exploreReadyMinutes: 55,
    exploreServings: 8,
    spiceLevelLabel: "Medium",
  },
  {
    id: "pulled-pork",
    slug: "pulled-pork",
    title: "Pulled Pork Sandwiches",
    shortLabel: "Pulled Pork",
    displayTitle: "Pulled Pork Sandwiches — Hall Line Special",
    description: "Low-and-slow vibes without the lecture.",
    tagline: "Sandwich line for the whole hall",
    emoji: "🐖",
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
    heroImagePath: "/images/golden-100/pulled-pork.jpg",
  },
  {
    id: "smash-burgers",
    slug: "smash-burgers",
    title: "Double Smash Burgers",
    shortLabel: "Double Smash",
    displayTitle: "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
    description:
      "Two thin patties, lacy crispy edges, potato buns, American cheese, caramelized onions, pickles, shredded lettuce, and homemade dirty sauce — optional bacon for the crew.",
    tagline: "Diner griddle · melty · viral stack",
    emoji: "🍔",
    spoonacularRecipeId: 645680,
    spoonacularTitle: "Smash Burgers with American Cheese",
    heroImagePath: "/images/golden-100/smash-burgers.jpg",
    imageAlt:
      "Double smash burger stack on a glossy potato bun with melted American cheese, caramelized onions, pickles, and crispy beef edges",
    imageKeywords: ["smash", "burger", "double", "cheese", "onion", "potato", "bun", "diner"],
    cuisine: "American",
    mealFormat: "burger",
    protein: "Beef",
    tags: ["American", "Hall classic", "Burger", "Beef", "Crew Favorite", "Comfort Food"],
    recipeSource: { type: "curated", spoonacularId: 645680 },
    segmentColor: "#4A3728",
    segmentColorAlt: "#D84315",
    searchQuery: "double smash burger caramelized onions",
    generatorFilters: { meal_format: "burger", proteins: ["beef"], cuisine_style: "any" },
    exploreHookLine: "Lacy edges · dirty sauce · potato bun stack",
    exploreSummary:
      "Crew Favorite · Comfort Food · Diner griddle night · Feeds 8+",
    exploreReadyMinutes: 50,
    exploreServings: 8,
  },
  {
    id: "big-chili",
    slug: "big-chili",
    title: "Firehall Chili",
    shortLabel: "Smoked Chili Night",
    displayTitle: "Firehouse Smoked Beef Chili with Cheesy Garlic Bread",
    description:
      "Deep, smoky beef chili with sweet caramelized onions and fire-roasted tomatoes — ladled hot with cheddar-mozzarella garlic bread for the whole hall.",
    tagline: "Viral comfort-food hall night",
    emoji: "🌶️",
    spoonacularRecipeId: 660273,
    spoonacularTitle: "Slow Cooked Beef Chili",
    heroImagePath: "/images/golden-100/big-chili.jpg",
    imageAlt:
      "Dark bowl of smoky beef chili with visible steam beside cheesy golden garlic bread on a rustic board",
    imageKeywords: ["chili", "beef", "smoked", "garlic", "bread", "cheese", "comfort", "bowl"],
    cuisine: "American",
    mealFormat: "soup_chili",
    protein: "Beef",
    tags: [
      "American",
      "Hall classic",
      "Chili",
      "Comfort Food",
      "Crew Favorite",
      "Cold Nights",
      "Feeds 8+",
    ],
    recipeSource: { type: "curated", spoonacularId: 660273 },
    segmentColor: "#7F1D1D",
    segmentColorAlt: "#E65100",
    searchQuery: "smoky beef chili cheesy garlic bread",
    generatorFilters: { meal_format: "soup_chili", proteins: ["beef"], cuisine_style: "any" },
    exploreHookLine: "Smoky beef · cheesy garlic pull · feeds the hall",
    exploreSummary:
      "Crew Favorite · Best for Cold Nights · Medium spice · Feeds 8+ firefighters",
    exploreReadyMinutes: 75,
    exploreServings: 8,
    spiceLevelLabel: "Medium",
  },
  {
    id: "chicken-caesar",
    slug: "chicken-caesar",
    title: "Chicken Caesar Salad",
    shortLabel: "Caesar Night",
    displayTitle: "Chicken Caesar Salad",
    description:
      "Grilled chicken over a mountain of romaine — garlic bread, bacon, croutons, parmesan, and fries for the crew.",
    tagline: "Big bowls, hot chicken, all the fixings",
    emoji: "🥗",
    spoonacularRecipeId: 636682,
    spoonacularTitle: "Chicken Caesar Salad",
    imageAlt:
      "Hearty chicken Caesar salad with sliced grilled chicken pieces, romaine, parmesan, and croutons",
    imageKeywords: ["caesar", "chicken", "salad", "grilled", "romaine", "sliced", "diced"],
    cuisine: "American",
    mealFormat: "salad",
    protein: "Chicken",
    tags: ["American", "Hall classic", "Chicken", "Comfort Food"],
    recipeSource: { type: "curated", spoonacularId: 636682 },
    segmentColor: "#1B4332",
    segmentColorAlt: "#40916C",
    searchQuery: "grilled chicken caesar salad",
    generatorFilters: { meal_format: "salad", proteins: ["chicken"], cuisine_style: "any" },
    heroImagePath: "/images/golden-100/chicken-caesar.jpg",
  },
  {
    id: "jerk-chicken",
    slug: "jerk-chicken",
    title: "Jerk Chicken & Rice and Peas",
    shortLabel: "Jerk & Rice",
    displayTitle: "Jerk Chicken & Peas and Rice — Fire on the Grill",
    description: "Charred jerk thighs, coconut rice and peas, island sides for eight.",
    tagline: "Fire on the grill",
    emoji: "🍗",
    spoonacularRecipeId: 637103,
    spoonacularTitle: "Caribbean Chicken Thighs",
    heroImagePath: "/images/golden-100/jerk-chicken.jpg",
    imageAlt:
      "Charred jerk chicken thighs with coconut rice and peas, grilled pineapple, and cabbage slaw on a firehall prep line",
    imageKeywords: [
      "jerk",
      "chicken",
      "rice",
      "peas",
      "coconut",
      "caribbean",
      "grill",
      "pineapple",
      "slaw",
      "thigh",
    ],
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
    emoji: "🥪",
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
    heroImagePath: "/images/golden-100/beef-dip.jpg",
  },
  {
    id: "bbq-chicken-mac-and-cheese",
    slug: "bbq-chicken-mac-and-cheese",
    title: "BBQ Chicken Mac and Cheese",
    shortLabel: "BBQ Mac",
    displayTitle: "BBQ Chicken Mac and Cheese — Hall Comfort Tray",
    description:
      "Shredded BBQ chicken folded into creamy baked mac and cheese — smoky, cheesy, and built for a hungry shift.",
    tagline: "BBQ meets mac on the line",
    emoji: "🧀",
    spoonacularRecipeId: 715420,
    spoonacularTitle: "BBQ Chicken Mac and Cheese",
    heroImagePath: "/images/golden-100/bbq-chicken-mac-and-cheese.jpg",
    imageAlt:
      "Creamy baked mac and cheese with shredded BBQ chicken, melted cheddar and mozzarella, and BBQ sauce glaze in a firehall hotel pan",
    imageKeywords: [
      "bbq",
      "barbecue",
      "chicken",
      "mac",
      "cheese",
      "baked",
      "shredded",
      "creamy",
      "hotel pan",
    ],
    cuisine: "American",
    mealFormat: "bake",
    protein: "Chicken",
    tags: ["BBQ", "Hall classic", "Comfort Food", "Chicken", "Pasta"],
    recipeSource: { type: "curated", spoonacularId: 715420 },
    segmentColor: "#B45309",
    segmentColorAlt: "#D97706",
    searchQuery: "bbq chicken mac and cheese bake",
    generatorFilters: { meal_format: "pasta", proteins: ["chicken"], cuisine_style: "bbq" },
    exploreHookLine: "Shredded BBQ chicken · creamy mac · cheese pull",
    exploreSummary: "Crew Favorite · Comfort Food · Tray bake for eight · Feeds hard",
    exploreReadyMinutes: 65,
    exploreServings: 8,
    spiceLevelLabel: "Mild",
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
    heroImagePath: "/images/golden-100/steak-sandwiches.jpg",
  },
];

const META_BY_SLUG = new Map(CLASSIC_HALL_MEALS.map((m) => [m.slug, m]));

export function getClassicHallMeal(slug: string): ClassicHallMealMeta | undefined {
  return META_BY_SLUG.get(slug.toLowerCase().trim());
}

export function getClassicHeroImage(slug: string, size: SpoonacularImageSize = "636x393"): string {
  const meta = getClassicHallMeal(slug);
  if (!meta) return "";
  return resolveClassicHeroImage(meta, size);
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
  if (!isDevRuntime()) return;

  const image = heroImage ?? resolveClassicHeroImage(meal);
  const urlId = extractSpoonacularIdFromImageUrl(image);
  if (
    urlId !== null &&
    urlId !== meal.spoonacularRecipeId &&
    !meal.heroImagePath?.trim()
  ) {
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

  const mustInclude = meal.spoonacularTitleMustInclude || [];
  if (mustInclude.length > 0 && !meal.heroImagePath?.trim()) {
    const spoonLower = meal.spoonacularTitle.toLowerCase();
    const ok = mustInclude.some((k) => spoonLower.includes(k.toLowerCase()));
    if (!ok) {
      console.warn(
        `[classic-meal:${context}] Spoonacular title "${meal.spoonacularTitle}" missing required keywords [${mustInclude.join(", ")}] for "${meal.slug}"`,
      );
    }
  }

  const hallLower = `${meal.title} ${meal.displayTitle}`.toLowerCase();
  if (
    (hallLower.includes("bbq") || hallLower.includes("barbecue")) &&
    !meal.heroImagePath?.trim()
  ) {
    const spoonLower = meal.spoonacularTitle.toLowerCase();
    if (!/bbq|barbecue/.test(spoonLower)) {
      console.warn(
        `[classic-meal:${context}] Hall classic "${meal.slug}" is BBQ-themed but Spoonacular title is "${meal.spoonacularTitle}" — add heroImagePath or fix recipe id`,
      );
    }
  }
}

/** Detect duplicate Spoonacular hero ids across wheel meals (dev guard). */
export function findDuplicateClassicHeroIds(): { id: number; slugs: string[] }[] {
  const byId = new Map<number, string[]>();
  for (const meal of CLASSIC_HALL_MEALS) {
    if (meal.heroImagePath?.trim()) continue;
    const id = meal.spoonacularRecipeId;
    if (!id) continue;
    const list = byId.get(id) || [];
    list.push(meal.slug);
    byId.set(id, list);
  }
  return [...byId.entries()]
    .filter(([, slugs]) => slugs.length > 1)
    .map(([id, slugs]) => ({ id, slugs }));
}

/** Run validation for all classics once (client dev boot or server import). */
export function validateAllClassicMeals(context = "init"): void {
  for (const meal of CLASSIC_HALL_MEALS) {
    validateClassicMealConsistency(meal, context);
  }
  const dups = findDuplicateClassicHeroIds();
  for (const dup of dups) {
    console.warn(
      `[classic-meal:${context}] Duplicate Spoonacular hero id ${dup.id} on slugs: ${dup.slugs.join(", ")}`,
    );
  }
}
