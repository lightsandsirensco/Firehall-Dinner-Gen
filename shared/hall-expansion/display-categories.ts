/**
 * Customer-facing master category for every Hall Expansion recipe.
 *
 * "hall_expansion" is a collection id (folder, slug set, image paths) and must
 * never be published as a recipe's `category` — cards and detail pages render
 * that field directly. Assignments are per dish, not per source batch.
 */

import type { MasterCategoryId } from "../categories/constants.js";

export const HALL_EXPANSION_DISPLAY_CATEGORY: Record<string, MasterCategoryId> = {
  // Smoker / grill mains
  "smoked-turkey-breast": "bbq_grill_nights",
  "smoked-meatloaf": "bbq_grill_nights",
  "pork-belly-burnt-ends": "bbq_grill_nights",
  "smoked-sausage-platter": "bbq_grill_nights",
  "hickory-turkey-legs": "bbq_grill_nights",
  "smoked-tri-tip": "bbq_grill_nights",
  "smoked-corned-beef": "bbq_grill_nights",
  "pellet-smoked-chicken-quarters": "bbq_grill_nights",
  "mesquite-chuck-roast": "bbq_grill_nights",
  "molasses-bourbon-pork-ribs": "bbq_grill_nights",
  "applewood-pork-shoulder-steaks": "bbq_grill_nights",
  "weeknight-bbq-ribs-crew": "bbq_grill_nights",
  "burnt-ends-chili-crew": "bbq_grill_nights",
  "grilled-flank-fajita-bar": "bbq_grill_nights",
  "maple-cured-salmon-plank": "bbq_grill_nights",

  // Game-day snacks and shareables
  "smoked-queso-fundido": "game_day_watch_party",
  "smoker-nachos-crew": "game_day_watch_party",
  "loaded-potato-skins": "game_day_watch_party",
  "game-day-pizza-sliders": "game_day_watch_party",
  "pretzel-bite-platter": "game_day_watch_party",
  "jalapeno-popper-dip": "game_day_watch_party",
  "philly-cheesesteak-sliders": "game_day_watch_party",
  "chicken-wing-bar-night": "game_day_watch_party",
  "bbq-meatball-skewers": "game_day_watch_party",
  "soft-pretzel-dogs": "game_day_watch_party",
  "firehall-charcuterie-board": "game_day_watch_party",
  "cheesy-beef-nacho-bake": "game_day_watch_party",
  "loaded-nacho-bar-night": "game_day_watch_party",

  // Build-your-own bar nights
  "shawarma-bar-night": "big_crew_feeders",
  "fajita-bar-night": "big_crew_feeders",
  "hall-burger-bar": "big_crew_feeders",
  "pasta-bar-night": "big_crew_feeders",
  "rice-bowl-bar-night": "big_crew_feeders",
  "sandwich-board-night": "big_crew_feeders",
  "mediterranean-feast-night": "big_crew_feeders",
  "burrito-bowl-bar-night": "big_crew_feeders",
  "build-your-own-pho-bar": "big_crew_feeders",
  "chicken-thigh-stretch-dinner": "big_crew_feeders",

  // Station staples
  "hall-sloppy-joe-feed": "firehall_classics",
  "classic-patty-melt-for-the-crew": "firehall_classics",
  "best-tuna-melt-for-the-hall": "firehall_classics",
  "hall-blt-sandwich-feed": "firehall_classics",
  "sausage-peppers-on-buns": "firehall_classics",
  "italian-beef-slow-cooker": "firehall_classics",
  "firehall-taco-bowls": "firehall_classics",
  "firehall-donair-platter": "firehall_classics",
  "montreal-smoked-meat-platter": "firehall_classics",
  "buffalo-chicken-wraps": "firehall_classics",
  "chicken-caesar-wraps": "firehall_classics",

  // Comfort food
  "honey-mustard-oven-chicken-thighs": "comfort_food",
  "spatchcock-lemon-roast-chicken": "comfort_food",
  "paprika-roasted-chicken-quarters": "comfort_food",
  "mushroom-swiss-steak-pan": "comfort_food",
  "dutch-oven-pot-roast": "comfort_food",
  "mississippi-pot-roast-crew": "comfort_food",
  "mostaccioli-sausage-bake": "comfort_food",
  "creamy-chicken-penne-alfredo": "comfort_food",
  "rigatoni-meat-sauce-batch": "comfort_food",
  "sheet-pan-meatball-marinara": "comfort_food",
  "hall-chicken-noodle-soup": "comfort_food",
  "green-chile-chicken-stew": "comfort_food",
  "white-chicken-chili-crock": "comfort_food",
  "loaded-baked-potato-soup-crock": "comfort_food",
  "kielbasa-cabbage-potato-skillet": "comfort_food",
  "cheesy-chicken-broccoli-rice": "comfort_food",
  "tourtiere-for-the-crew": "comfort_food",
  "classic-poutine-feed-crew": "comfort_food",
  "cottage-pie-for-the-crew": "comfort_food",
  "bbq-pulled-pork-bowls": "comfort_food",
  "pasta-e-fagioli-hall": "comfort_food",
  "sausage-gnocchi-skillet": "comfort_food",
  "dirty-rice-crew-skillet": "comfort_food",

  // Global flavors
  "beef-gyros-for-the-hall": "global_flavors",
  "firehall-gyro-bowls": "global_flavors",
  "greek-chicken-pitas": "global_flavors",
  "firehall-greek-chicken-bowls": "global_flavors",
  "chicken-shawarma-pitas": "global_flavors",
  "chicken-paprikash-hall": "global_flavors",
  "chicken-cacciatore-crew": "global_flavors",
  "coq-au-vin-batch": "global_flavors",
  "hungarian-goulash-crew": "global_flavors",
  "tonkotsu-ramen-crew": "global_flavors",
  "miso-ramen-bar": "global_flavors",
  "malaysian-laksa-soup": "global_flavors",
  "bun-bo-hue-noodle-soup": "global_flavors",
  "wonton-noodle-soup-crew": "global_flavors",
  "peri-peri-chicken-platter": "global_flavors",
  "korean-bulgogi-grill-night": "global_flavors",
  "lamb-kofta-skewer-platter": "global_flavors",
  "moroccan-chicken-kebab-platter": "global_flavors",
  "lebanese-chicken-shish-platter": "global_flavors",
  "firehall-korean-beef-bowls": "global_flavors",
  "thai-peanut-chicken-crock": "global_flavors",
  "salsa-verde-chicken-crock": "global_flavors",
  "spanish-rice-chicken-one-pot": "global_flavors",

  // Quick weeknight skillets and bowls
  "cajun-chicken-rice-skillet": "quick_shift_meals",
  "cast-iron-chicken-fajitas": "quick_shift_meals",
  "pepper-steak-onions": "quick_shift_meals",
  "enchilada-beef-skillet": "quick_shift_meals",
  "ginger-soy-chicken-rice-bowls": "quick_shift_meals",
  "teriyaki-chicken-rice-bowls": "quick_shift_meals",
  "cajun-shrimp-rice-bowls": "quick_shift_meals",
  "southwest-steak-bowls": "quick_shift_meals",
  "chipotle-chicken-burrito-bowls": "quick_shift_meals",
  "turkey-taco-bowls": "quick_shift_meals",
  "peanut-chicken-rice-bowls": "quick_shift_meals",
  "egg-roll-in-a-bowl-crew": "quick_shift_meals",
  "salmon-rice-bowls-crew": "quick_shift_meals",
  "korean-turkey-rice-bowls": "quick_shift_meals",

  // Meal prep and leftovers
  "high-protein-chicken-quinoa-meal-prep-bowls": "meal_prep_leftovers",
  "leftover-roast-beef-bowls": "meal_prep_leftovers",
  "costco-rotisserie-remix": "meal_prep_leftovers",

  // Purpose-built high-protein / lighter meals
  "station-cobb-salad": "healthy_performance",
  "warm-spinach-chicken-salad": "healthy_performance",
  "mediterranean-chicken-farro-bowls": "healthy_performance",
  "buffalo-chicken-sweet-potato-bowls": "healthy_performance",
  "mediterranean-beef-bowls": "healthy_performance",
  "firehouse-sweet-potato-beef-protein-bowls": "healthy_performance",
  "firehouse-dense-bean-salad": "healthy_performance",
  "loaded-firehouse-sweet-potatoes": "healthy_performance",
  "firehouse-diner-burger-bowls": "healthy_performance",
  "blackened-salmon-sweet-potato-bowls": "healthy_performance",
  "firehouse-chicken-black-bean-bowls": "healthy_performance",
  "sesame-ginger-tofu-bowls": "healthy_performance",
  "firehouse-lentil-chili": "healthy_performance",
  "chickpea-pasta-primavera-white-beans": "healthy_performance",
  "southwest-black-bean-corn-bowls": "healthy_performance",
  "firehouse-turkey-white-bean-soup": "healthy_performance",
  "sheet-pan-lemon-chicken-broccoli-sweet-potatoes": "healthy_performance",
  "lemon-herb-cod-roasted-vegetables": "healthy_performance",
  "garlic-steak-broccoli-cottage-cheese-bowls": "healthy_performance",
  "honey-mustard-turkey-meatball-bowls": "healthy_performance",
  "cajun-lime-shrimp-black-bean-bowls": "healthy_performance",
  "tempeh-peanut-buddha-bowls": "healthy_performance",
  "paneer-tikka-masala-bowls": "healthy_performance",
  "black-bean-cottage-cheese-enchilada-bake": "healthy_performance",
  "red-lentil-paneer-dal": "healthy_performance",
  "greek-yogurt-white-bean-power-bowls": "healthy_performance",
  "cottage-cheese-spinach-stuffed-shells": "healthy_performance",
};

export function hallExpansionDisplayCategory(slug: string): MasterCategoryId {
  const category = HALL_EXPANSION_DISPLAY_CATEGORY[slug];
  if (!category) {
    throw new Error(`Hall Expansion recipe "${slug}" has no customer-facing category`);
  }
  return category;
}
