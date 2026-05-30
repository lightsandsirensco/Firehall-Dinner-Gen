/**
 * Trust-first Explore hero donors — meal accuracy over uniqueness.
 * Applied by remediate scripts and audit trust resolution.
 * Keys: explore curated_recipes.slug → golden/breakfast/hall donor slug.
 */
export const TRUST_FIRST_EXPLORE_DONORS: Record<string, string> = {
  // Hall / smokehouse
  "smoked-corned-beef": "bbq-brisket-burnt-ends",
  "burrito-bowl-bar-night": "bbq-chicken-bowls",
  "loaded-nacho-skillet": "game-day-nachos",

  // Tray / pasta / skillet content fixes
  "lemon-garlic-chicken-tray": "honey-lime-chicken-tray",
  "cottage-cheese-protein-pasta": "baked-ziti",
  "chili-mac": "big-chili",

  // Cajun / pork clusters
  jambalaya: "turkey-chili",
  "pulled-pork": "carolina-mustard-pork",

  // Mass chicken-parm cluster — split to semantically accurate golden heroes
  "chicken-parm": "crispy-chicken-cutlets",
  "pellet-smoked-chicken-quarters": "greek-lemon-chicken-potatoes",
  "chicken-wing-bar-night": "buffalo-chicken-dip",
  "shawarma-bar-night": "chicken-souvlaki",
  "fajita-bar-night": "cast-iron-chicken-fajitas",
  "rice-bowl-bar-night": "greek-chicken-bowls",
  "mediterranean-feast-night": "greek-chicken-bowls",
  "honey-mustard-oven-chicken-thighs": "honey-lime-chicken-tray",
  "spatchcock-lemon-roast-chicken": "greek-lemon-chicken-potatoes",
  "cajun-chicken-rice-skillet": "cajun-chicken-rice-bowl",
  "paprika-roasted-chicken-quarters": "greek-lemon-chicken-potatoes",
  "creamy-chicken-penne-alfredo": "caprese-chicken-bake",
  "station-cobb-salad": "hummus-chicken-platter",
  "warm-spinach-chicken-salad": "greek-chicken-bowls",
  "hall-chicken-noodle-soup": "lemon-chicken-orzo-soup",
  "green-chile-chicken-stew": "one-pot-chicken-rice",
  "ginger-soy-chicken-rice-bowls": "honey-garlic-chicken-rice-bowls",
  "mediterranean-chicken-farro-bowls": "greek-chicken-bowls",
  "cheesy-chicken-broccoli-rice": "one-pot-chicken-rice",

  // Pulled-pork / pork platter cluster
  "pork-belly-burnt-ends": "bbq-brisket-burnt-ends",
  "smoked-sausage-platter": "carolina-mustard-pork",
  "molasses-bourbon-pork-ribs": "carolina-mustard-pork",
  "applewood-pork-shoulder-steaks": "carolina-mustard-pork",
  "kielbasa-cabbage-potato-skillet": "sausage-peppers-onions",

  // Smoked beef cluster
  "smoked-meatloaf": "meatloaf-mashed",
  "smoked-tri-tip": "bbq-brisket-burnt-ends",
  "mesquite-chuck-roast": "dutch-oven-pot-roast",
  "dutch-oven-pot-roast": "meatloaf-mashed",
  "beef-dip": "steak-sandwiches",
};
