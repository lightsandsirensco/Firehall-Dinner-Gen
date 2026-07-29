/**
 * Firefighter-native recipe titles — short names crews actually say at dinner.
 * Slugs unchanged; apply at manifest/build time.
 */

/** Golden 100 + Classics Wheel slug → human title */
export const HUMAN_RECIPE_TITLES: Record<string, string> = {
  // Classics wheel / firehall_classics
  "beef-dip": "Beef Dip Sandwiches",
  "chicken-caesar": "Chicken Caesar Salad",
  "loaded-nacho-skillet": "Nacho Skillet",
  "meatball-hoagies": "Meatball Hoagies",
  "hall-taco-bar": "Taco Bar",
  "parm-hero-subs": "Parm Hero Subs",
  "steak-tacos": "Steak Tacos",
  "smash-burgers": "Double Smash Burgers",
  "chili-garlic-bread": "Firehall Chili",
  "jerk-chicken": "Jerk Chicken & Rice and Peas",
  "chicken-parm": "Chicken Parmesan",

  // BBQ
  "ny-strip-herb-butter": "NY Strip with Herb Butter",
  "grilled-pork-chops": "Grilled Pork Chops",
  "smoked-wings-white-sauce": "Smoked Wings with White Sauce",
  "cedar-plank-salmon": "Cedar Plank Salmon",
  "honey-garlic-pork-tenderloin": "Honey Garlic Pork Tenderloin",
  "flank-chimichurri": "Flank Steak with Chimichurri",
  "grilled-corn-cotija": "Street Corn with Cotija",
  "teriyaki-salmon-grill": "Teriyaki Salmon",

  // Comfort
  "shepherds-pie": "Shepherd's Pie",
  "meatloaf-mashed": "Meatloaf and Mashed Potatoes",
  "loaded-baked-potato-bar": "Baked Potato Bar",
  "creamy-tuscan-chicken": "Tuscan Chicken",

  // Healthy / quick
  "lemon-herb-salmon": "Lemon Herb Salmon",
  "turkey-chili": "Turkey Chili",
  "sheet-pan-fajitas": "Chicken Fajitas",
  "chicken-souvlaki": "Chicken Souvlaki",
  "performance-burrito-bowls": "Chicken Burrito Bowls",
  "sheet-pan-sausage-peppers": "Sausage and Peppers",
  "skillet-chicken-alfredo": "Chicken Alfredo",
  "beef-broccoli": "Beef and Broccoli",
  "fast-philly-skillet": "Quick Philly Skillet",
  "pork-carnitas-tacos": "Pork Carnitas Tacos",
  "chicken-quesadillas": "Chicken Quesadillas",
  "pad-thai": "Pad Thai",

  // Pizza
  "pepperoni-pizza-night": "Pepperoni Pizza",
  "meat-lovers-sheet-pizza": "Meat Lover's Pizza",
  "margherita-pizza": "Margherita Pizza",

  // Big crew
  "batch-lasagna": "Batch Lasagna",
  "big-chili": "Beef and Bean Chili",
  "sausage-egg-bake": "Sausage Egg Bake",
  "jambalaya": "Jambalaya",
  "loaded-potato-feed": "Potato Bar Feed",

  // Breakfast
  "pancake-short-stack": "Pancake Short Stack",

  // Global / game day
  "thai-basil-chicken": "Thai Basil Chicken",
  "bulgogi-bowls": "Bulgogi Bowls",
  "street-corn-chicken": "Street Corn Chicken Bowls",
  "moroccan-meatballs": "Moroccan Lamb Meatballs",
  "game-day-nachos": "Game Day Nachos",
  "slider-bar": "Slider Bar",
  "sheet-pan-meal-prep": "Chicken Meal Prep Trays",
  "one-pot-chicken-rice": "Chicken and Rice",

  // Performance meals
  "sheet-pan-chicken-fajitas-lite": "Chicken Fajitas",
  "korean-beef-rice-bowls": "Beef Rice Bowls",
  "mediterranean-baked-fish-tray": "Baked Cod Tray",
  "moroccan-chicken-chickpea-tray": "Moroccan Chicken and Chickpeas",
  "grilled-shrimp-quinoa-bowls": "Shrimp and Quinoa Bowls",
  "boneless-chicken-thighs-sweet-potato-spinach": "Chicken Thighs with Sweet Potato and Spinach",
  "italian-sausage-veg-sheet-pan": "Sausage, Peppers & Zucchini Sheet Pan",
  "cottage-cheese-protein-pasta": "Protein Pasta Bake",
  "lemon-garlic-chicken-tray": "Lemon Garlic Chicken Tray",
  "herb-baked-salmon-tray": "Baked Salmon Tray",
  "honey-garlic-chicken-rice-bowls": "Honey Garlic Chicken Bowls",
  "crispy-fish-taco-night": "Fish Tacos",
  "smoky-lentil-kale-soup": "Lentil and Kale Soup",
  "crock-barbacoa-chicken": "Barbacoa Chicken",
  "shawarma-chicken-rice-bowls": "Shawarma Chicken Bowls",
  "asian-chicken-lettuce-cups": "Chicken Lettuce Cups",
  "greek-lemon-chicken-potatoes": "Lemon Chicken and Potatoes",
  "zaatar-roasted-chicken-thighs": "Za'atar Chicken Thighs",
  "lemon-salmon-orzo-skillet": "Lemon Salmon Orzo",
  "lean-beef-broccoli-rice": "Beef and Broccoli Rice",
  "turkey-lettuce-wrap-night": "Turkey Lettuce Wraps",
  "blackened-cod-taco-night": "Blackened Cod Tacos",
  "pesto-tomato-chicken-tray": "Pesto Chicken Tray",
  "spanish-chicken-chorizo-rice": "Chicken and Chorizo Rice",
  "yogurt-marinated-grill-chicken": "Yogurt Marinated Chicken",
  "lentil-mushroom-bolognese": "Lentil Bolognese",
  "chicken-enchilada-skillet-light": "Chicken Enchilada Skillet",
  "cajun-chicken-rice-bowl": "Cajun Chicken and Rice",
  "veggie-egg-casserole-tray": "Veggie Egg Casserole",
  "salsa-verde-crock-chicken": "Salsa Verde Crock Chicken",
  "turkey-quinoa-stuffed-peppers": "Turkey Stuffed Peppers",
  "turkey-shepherds-sweet-potato": "Turkey Shepherd's Pie",
  "baked-falafel-hall-bowls": "Falafel Bowls",
  "peri-peri-chicken-platter": "Peri Peri Chicken",
};

export function humanRecipeTitle(slug: string, fallback: string): string {
  return HUMAN_RECIPE_TITLES[slug] ?? fallback.trim();
}
