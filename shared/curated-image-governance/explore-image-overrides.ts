/**
 * Manual Explore image slug locks — high-trust hall heroes for catalog mismatches.
 * Keys: explore curated_recipes.slug → hall/golden image slug (NOT keyword assignment).
 */
export const EXPLORE_IMAGE_SLUG_OVERRIDES: Record<string, string> = {
  "the-secret-to-easy-skillet-filet-mignon-steak-tacos": "beef-stroganoff",
  "firehall-beef-plates": "beef-stroganoff",
  "cheesy-chicken-enchilada-quinoa-casserole": "enchilada-casserole",
  "chicken-enchilada-casserole": "enchilada-casserole",
  "chicken-enchilada-skillet-light": "enchilada-casserole",
  "easy-slow-cooker-chicken-tortilla-soup": "chicken-dumpling-soup",
  "enchilada-stuffed-spaghetti-squash": "enchilada-casserole",
  "enchilada-casserole": "enchilada-casserole",
  "turkey-taco-skillet": "turkey-taco-skillet",
  "loaded-nacho-skillet": "game-day-nachos",
  "chili-garlic-bread": "big-chili",
  "bacon-egg-hash": "bacon-egg-hash",
  "fish-pie-with-fresh-and-smoked-salmon": "cedar-plank-salmon",
  "oven-baked-salmon-with-broccoli-sheet-pan": "lemon-herb-salmon",
  "sweet-n-smoky-salmon-with-ginger-mahogany-rice": "ginger-salmon-bowls",
  "shrimp-and-asparagus-foil-packs-with-garlic-lemon-butter-sauce": "garlic-butter-shrimp",
  "super-easy-sheet-pan-shrimp-boil-that-you-ll-make-over-and-over-again": "garlic-butter-shrimp",
  "cheesy-baked-pasta-with-sausage-and-ricotta": "baked-ziti",
  "4-ingredient-chicken-pot-pie": "chicken-pot-pie",
  "crock-pot-chicken-pot-pie": "chicken-pot-pie",
  "turkey-pot-pie": "chicken-pot-pie",
  "turkey-pot-pie-with-cornbread-crust": "chicken-pot-pie",
  "chicken-caesar-salad": "chicken-caesar",
  "asian-salmon-burgers-with-tangy-ginger-lime-sauce": "lemon-herb-salmon",
  "baked-ziti-casserole": "mac-and-cheese-bake",
  "baked-ziti-or-rigatoni": "baked-ziti",
  "crock-pot-asian-style-country-ribs-with-black-bean-garlic-sauce": "crock-barbacoa-chicken",
  "grilled-ham-and-cheese-french-toast-for-a-quick-weeknight-dinner": "french-toast-casserole",
  "moroccan-kofte-and-sausage-stew": "moroccan-meatballs",
  "veggie-egg-casserole-tray": "pancake-short-stack",
  "sheet-pan-dinner-hanger-steak-with-mushrooms-and-carrots": "beef-broccoli",
  "simple-skillet-lasagna": "skillet-chicken-alfredo",
};

/** Meal format corrections for Explore imports (metadata). */
export const EXPLORE_MEAL_FORMAT_FIXES: Record<string, string> = {
  "bacon-egg-hash": "breakfast",
  "instant-pot-chicken-tacos": "tacos",
  "smoky-chicken-tacos": "tacos",
  "cilantro-lime-fish-tacos": "tacos",
  "kk-s-fish-tacos": "tacos",
};

/** Correct mis-tagged protein on Explore imports (metadata only). */
export const EXPLORE_PROTEIN_FIXES: Record<string, string> = {
  "fish-pie-with-fresh-and-smoked-salmon": "fish",
  "oven-baked-salmon-with-broccoli-sheet-pan": "fish",
  "sweet-n-smoky-salmon-with-ginger-mahogany-rice": "fish",
  "shrimp-and-asparagus-foil-packs-with-garlic-lemon-butter-sauce": "seafood",
  "super-easy-sheet-pan-shrimp-boil-that-you-ll-make-over-and-over-again": "seafood",
  "cheesy-baked-pasta-with-sausage-and-ricotta": "pork",
  "grilled-ham-and-cheese-french-toast-for-a-quick-weeknight-dinner": "pork",
  "moroccan-kofte-and-sausage-stew": "beef",
  "asian-salmon-burgers-with-tangy-ginger-lime-sauce": "fish",
  "baked-ziti-casserole": "vegetarian",
};

/** Rename Explore slugs that break slug/title trust (old slug → new slug). */
export const EXPLORE_SLUG_RENAMES: Record<string, string> = {
  "the-secret-to-easy-skillet-filet-mignon-steak-tacos": "firehall-beef-plates",
};
