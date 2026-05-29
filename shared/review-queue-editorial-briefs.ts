/**
 * Targeted editorial briefs for Explore review-queue imagery.
 * One slug → explicit visual direction (not keyword/embedding assignment).
 */

export interface ReviewQueueEditorialBrief {
  /** Display title override if needed */
  mealName?: string;
  mealFormat: string;
  cuisine: string;
  protein: string;
  category?: string;
  ingredientHints: string[];
  hookLine: string;
  /** Extra lines appended to the model prompt */
  shotDirectives: string[];
  /** Hard negatives for this dish */
  avoid: string[];
}

export const REVIEW_QUEUE_EDITORIAL_BRIEFS: Record<string, ReviewQueueEditorialBrief> = {
  "baked-ziti-casserole": {
    mealFormat: "pasta",
    cuisine: "Italian-American",
    protein: "vegetarian",
    category: "firehall_classics",
    ingredientHints: [
      "ziti pasta tubes",
      "tomato marinara",
      "melted mozzarella",
      "parmesan",
      "basil garnish",
      "baked casserole dish",
    ],
    hookLine:
      "Family-style baked ziti in a rectangular glass or ceramic casserole — bubbling cheese, visible pasta tubes, station dinner scale.",
    shotDirectives: [
      "Show clearly baked ziti pasta — tubular ziti, NOT lasagna layers, NOT eggplant parmesan",
      "3/4 angle into casserole dish with serving spoon, portion scooped to show interior",
      "Hearty hall portion — feeds a crew, not a single restaurant plate",
    ],
    avoid: [
      "eggplant",
      "lasagna layers",
      "soup bowl",
      "raw pasta",
      "fine dining micro garnish",
    ],
  },
  "crock-pot-asian-style-country-ribs-with-black-bean-garlic-sauce": {
    mealFormat: "plated_main",
    cuisine: "Chinese-American",
    protein: "pork",
    category: "firehall_classics",
    ingredientHints: [
      "bone-in country-style pork ribs",
      "glossy black bean garlic sauce",
      "green onion",
      "sesame",
      "white rice on side",
    ],
    hookLine:
      "Slow-cooker country pork ribs glazed in black bean garlic sauce — messy-real BBQ-adjacent firehall tray dinner.",
    shotDirectives: [
      "Ribs must read as pork country ribs with bone — NOT chicken, NOT beef brisket",
      "Dark glossy black bean garlic sauce — slow-braised indoor look, NOT outdoor grill grates",
      "Piled on oval platter or sheet tray — NO grill marks from grate, NO flame background",
      "Optional small bowl of rice at edge — protein-forward",
    ],
    avoid: [
      "chicken wings",
      "beef steak",
      "tacos",
      "noodle soup",
      "outdoor grill",
      "grill grates",
      "BBQ smoke flame",
      "bright studio white background",
    ],
  },
  "easy-slow-cooker-chicken-tortilla-soup": {
    mealFormat: "soup_chili",
    cuisine: "Mexican",
    protein: "chicken",
    category: "firehall_classics",
    ingredientHints: [
      "chicken tortilla soup",
      "tortilla strips",
      "avocado",
      "lime",
      "cilantro",
      "corn",
      "brothy bowl",
    ],
    hookLine:
      "Chicken tortilla soup in deep bowls — clear brothy soup identity, tortilla strips and avocado on top.",
    shotDirectives: [
      "Must read as SOUP in a bowl — not tacos, not enchilada casserole, not dumplings",
      "Garnish with tortilla strips, cilantro, lime wedge",
      "Steam subtle, practical station bowl",
    ],
    avoid: ["tacos on plate", "casserole", "dry chicken plate", "cream-only chowder without tortilla cues"],
  },
  "enchilada-stuffed-spaghetti-squash": {
    mealFormat: "plated_main",
    cuisine: "Mexican",
    protein: "chicken",
    category: "firehall_classics",
    ingredientHints: [
      "roasted spaghetti squash boat",
      "shredded chicken",
      "enchilada sauce",
      "melted cheese",
      "cilantro",
    ],
    hookLine:
      "Roasted spaghetti squash half stuffed with enchilada chicken filling — squash strands visible at edges.",
    shotDirectives: [
      "Spaghetti squash boat shape must be obvious — yellow squash flesh strands",
      "Enchilada filling with melted cheese on top — NOT whole tacos, NOT pasta ziti",
      "Single composed half-squash on rustic plate, approachable not diet-food sterile",
    ],
    avoid: ["ziti pasta", "taco shells", "generic stuffed pepper only", "mushy unidentifiable mash"],
  },
  "fish-pie-with-fresh-and-smoked-salmon": {
    mealFormat: "plated_main",
    cuisine: "British",
    protein: "fish",
    category: "firehall_classics",
    ingredientHints: [
      "fish pie",
      "mashed potato topping",
      "golden baked crust",
      "peas",
      "salmon chunks in filling",
      "baking dish",
    ],
    hookLine:
      "British-style fish pie in oven dish — mashed potato lid scored and golden, scoop shows creamy fish filling.",
    shotDirectives: [
      "Must read as FISH PIE with mashed potato topping — NOT salmon fillet on plate, NOT fish tacos",
      "Baking dish or deep plate, fork scoop revealing creamy fish layer under potato crust",
      "Hearty pub/firehall comfort — not fine dining fillet",
    ],
    avoid: [
      "grilled salmon fillet only",
      "fish and chips",
      "tacos",
      "raw fish fillet",
      "sushi",
    ],
  },
  "moroccan-kofte-and-sausage-stew": {
    mealFormat: "stew",
    cuisine: "Moroccan",
    protein: "beef",
    mealName: "Moroccan Kofte and Sausage Stew",
    category: "firehall_classics",
    ingredientHints: [
      "meatballs kofte",
      "sliced sausage",
      "rich tomato stew",
      "chickpeas",
      "cilantro",
      "deep bowl or shallow wide pot",
    ],
    hookLine:
      "Moroccan kofte meatballs and sausage in spiced stew — tagine-adjacent but practical hall pot.",
    shotDirectives: [
      "Round kofte meatballs clearly visible with sausage coins in thick stew",
      "NOT Italian meatballs in red sauce only — North African spice cues subtle",
      "Serving spoon, family pot or deep bowl",
    ],
    avoid: ["tacos", "dry grilled sausage only", "plain American chili", "couscous-only plate without stew"],
  },
  "simple-skillet-lasagna": {
    mealName: "Simple Skillet Lasagna",
    mealFormat: "skillet",
    cuisine: "Italian-American",
    protein: "beef",
    category: "firehall_classics",
    ingredientHints: [
      "skillet lasagna",
      "layered pasta",
      "melted cheese top",
      "meat sauce",
      "cast iron or large skillet",
    ],
    hookLine:
      "Skillet lasagna in large cast-iron pan — cheesy top, visible layers at edge where cut.",
    shotDirectives: [
      "Must show SKILLET/PAN format — not baked ziti tubes only, not soup",
      "Lasagna layers or wide noodles with cheese — cut wedge optional",
      "Station-scale pan, rugged not restaurant",
    ],
    avoid: ["ziti tubes only", "soup bowl", "single burger", "fine dining stack"],
  },
  "veggie-egg-casserole-tray": {
    mealFormat: "sheet_pan",
    cuisine: "American",
    protein: "vegetarian",
    category: "firehall_classics",
    ingredientHints: [
      "egg casserole",
      "rectangular baking tray",
      "cheese top",
      "bell peppers",
      "cut square portion",
    ],
    hookLine:
      "Vegetable egg casserole in sheet tray — cut square on spatula, feeds a crew for breakfast.",
    shotDirectives: [
      "Rectangular tray bake clearly — NOT pancake stack, NOT salad bowl",
      "Golden baked egg texture visible in cut piece",
      "Morning hall breakfast — practical foil or glass tray",
    ],
    avoid: ["pancake stack", "oatmeal bowl", "burger", "dinner steak plate"],
  },
};

export const REVIEW_QUEUE_SLUGS = Object.keys(REVIEW_QUEUE_EDITORIAL_BRIEFS);
