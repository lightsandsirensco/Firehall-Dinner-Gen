/**
 * Smart Shopping — department classification.
 *
 * Reuses the same semantic role detection already trusted by the single-recipe
 * shopping list (`shared/meal-semantics.ts`) so departments stay consistent
 * across the app, then falls back to a keyword scan for anything the role
 * detector calls "Other".
 */

import { inferShoppingCategory, isSeasoningOrGarnish } from "../meal-semantics";
import { DEPARTMENTS, type Department } from "./types";

export { DEPARTMENTS };
export type { Department };

/** Display order when rendering a grouped list. */
export const DEPARTMENT_ORDER: Department[] = [...DEPARTMENTS];

const PROTEIN_KEYWORDS = [
  "chicken", "beef", "pork", "turkey", "salmon", "shrimp", "sausage", "bacon",
  "steak", "ground", "meatball", "pepperoni", "ham", "prosciutto", "lamb",
  "fish", "tuna", "cod", "tilapia", "crab", "lobster", "scallop", "anchov",
  "chorizo", "salami", "brisket", "ribs", "thigh", "breast", "wing", "drumstick",
  "plant-based crumble", "beyond", "impossible", "tofu", "tempeh",
];

const PRODUCE_KEYWORDS = [
  "onion", "garlic", "pepper", "tomato", "lettuce", "spinach", "kale",
  "broccoli", "carrot", "celery", "potato", "sweet potato", "mushroom",
  "zucchini", "squash", "corn", "avocado", "lime", "lemon", "cilantro",
  "parsley", "basil", "jalape", "ginger", "scallion", "green onion",
  "bell pepper", "cabbage", "cucumber", "arugula", "radish", "beet",
  "asparagus", "eggplant", "pea", "bean sprout", "romaine", "shallot",
  "chive", "dill", "mint", "rosemary", "thyme", "oregano", "sage",
  "banana pepper", "serrano", "habanero", "poblano", "apple", "pineapple",
  "olive", "caper", "artichoke", "roasted veg", "roasted vegetable",
];

const DAIRY_KEYWORDS = [
  "cheese", "mozzarella", "cheddar", "parmesan", "cream", "milk", "butter",
  "yogurt", "sour cream", "ricotta", "provolone", "gouda", "feta",
  "cream cheese", "heavy cream", "half and half", "whipping cream",
  "monterey jack", "colby", "swiss", "brie", "goat cheese", "blue cheese",
  "paneer", "ghee", "dairy-free", "vegan cheese", "oat milk", "almond milk",
  "coconut milk", "coconut cream",
];

const BAKERY_KEYWORDS = [
  "bread", "bun", "roll", "tortilla", "pita", "naan", "dough", "pizza dough",
  "flatbread", "ciabatta", "baguette", "crouton", "breadcrumb", "panko",
  "flour tortilla", "corn tortilla", "wrap",
];

const FROZEN_KEYWORDS = ["frozen", "ice cream", "frozen vegetable", "frozen fruit"];

const CONDIMENT_KEYWORDS = [
  "ketchup", "mustard", "mayo", "mayonnaise", "hot sauce", "sriracha",
  "soy sauce", "worcestershire", "vinegar", "bbq sauce", "barbecue sauce",
  "ranch", "buffalo sauce", "teriyaki", "hoisin", "fish sauce", "salsa",
  "pesto", "marinara", "pizza sauce", "tomato sauce", "tomato paste",
  "hot honey", "honey", "maple syrup", "tahini", "hummus", "guacamole",
  "aioli", "chimichurri", "tzatziki", "balsamic", "drizzle", "glaze",
  "dressing", "relish", "chutney",
];

const PANTRY_KEYWORDS = [
  "oil", "olive oil", "salt", "pepper", "sugar", "flour", "rice",
  "pasta", "noodle", "spice", "cumin", "paprika", "chili powder",
  "garlic powder", "onion powder", "italian seasoning", "cayenne",
  "red pepper flakes", "bay leaf", "cinnamon", "nutmeg", "coriander",
  "turmeric", "curry", "stock", "broth", "bouillon", "can", "canned",
  "beans", "lentil", "chickpea", "corn starch", "cornstarch", "baking",
  "yeast", "sesame", "soy", "coconut oil", "vegetable oil", "canola",
  "cooking spray", "cornmeal", "semolina", "oats", "quinoa", "couscous",
  "crackers", "nuts", "almond", "walnut", "pecan", "cashew", "pine nut",
  "peanut", "dried", "sun-dried", "raisin", "breadcrumb",
];

/**
 * Names the keyword lists above miss or would misfile, checked before them.
 * Eggs shelve with dairy in US grocery stores; word boundaries keep
 * "eggplant" in Produce.
 */
const EXPLICIT_DEPARTMENTS: Array<[RegExp, Department]> = [
  [/\beggs?\b|\begg (?:whites?|yolks?)\b/, "Dairy / Dairy Alternatives"],
  [/\b(?:queso fresco|pecorino|cotija|halloumi|mascarpone|burrata|manchego|gruy[eè]re|fontina|asiago|labneh)\b/, "Dairy / Dairy Alternatives"],
  [/\b(?:chuck|tri-tip|short ribs?|burnt ends|roast|mortadella|kielbasa|linguica|pancetta|black pudding|andouille|pastrami|corned beef|veal|venison|bison|duck|clams?|mussels?|trout)\b/, "Proteins"],
  [/\b(?:pico de gallo|gochujang|sambal|adobo|mirin|sauerkraut|pickle[sd]?|giardiniera|doenjang|ssamjang|miso|chili paste|curry paste|laksa paste|recado|jam|preserves|chutney|vinaigrette|kitchen bouquet|harissa|enchilada sauce|alfredo|queso dip|crema|fish sauce|oyster sauce|kecap manis|shoyu|yuzu kosho|kimchi)\b/, "Condiments & Sauces"],
  [/\b(?:berries|blueberr\w*|strawberr\w*|raspberr\w*|grapes?|tomatillos?|fennel bulb|tarragon|epazote|galangal|shiso|fenugreek leaves|bird chil\w*|green chiles?|chiles?|red chilies|bok choy|leeks?|watercress|sprouts|mango|peach\w*|pears?|oranges?|plantains?|okra|jicama)\b/, "Produce"],
  [/\b(?:bagels?|english muffins?|tostada|taco shells?|pie crust|puff pastry|biscuits?|focaccia|croissants?|hoagie|sub rolls?|brioche|sourdough|texas toast)\b/, "Bakery / Dough"],
  [/\b(?:bay lea\w*|caraway|star anise|extract|seasoning|\brub\b|ras el hanout|urfa biber|saffron|nori|bulgur|gnocchi|garam masala|za.?atar|sumac|fennel (?:seeds?|pollen)|cocoa|masa harina|polenta|grits|molasses|tamarind|pancake mix|waffle mix|biscuit mix|ditalini|shells|ziti|rigatoni|penne|orzo|macaroni|pistachios?|seeds|chips|tortilla chips|totopos|stuffing|gelatin|chocolate chips)\b/, "Pantry & Spices"],
];

/**
 * Where an item is shelved, decided before the recipe-role classifier —
 * which reads "olive oil" as produce, "tomato paste" as a vegetable, and
 * "fresh thyme" as a seasoning.
 */
const SHELF_OVERRIDES: Array<[RegExp, Department]> = [
  [/\b(?:pickles?|pickled|dressing|vinaigrette|nam pla)\b/, "Condiments & Sauces"],
  [/\b(?:peanut|almond|cashew|sunflower(?: seed)?) butter\b|\bpowder\b/, "Pantry & Spices"],
  [/\bpomegranate (?:seeds|arils)\b/, "Produce"],
  [/\b(?:tortilla|potato|corn|pita|kettle) chips\b|\bbread ?crumbs\b|\bpanko\b/, "Pantry & Spices"],
  [/\b(?:tortillas?|bread|buns?|rolls?)\b/, "Bakery / Dough"],
  [/\b(?:oil|vinegar|cooking spray|bouillon|broth|stock|flour|cornstarch|baking (?:soda|powder)|dried|noodles?|pasta)\b/, "Pantry & Spices"],
  [/(?<!cauliflower )\brice\b/, "Pantry & Spices"],
  [/\b(?:tomato paste|crushed tomatoes|diced tomatoes|whole peeled tomatoes|san marzano|fire.roasted tomatoes|canned)\b/, "Pantry & Spices"],
  [/\bhash browns?\b|\btater tots?\b/, "Frozen"],
  [/\b(?:potato(?:es)?|sweet potato(?:es)?)\b/, "Produce"],
  [/\bfresh (?:thyme|rosemary|sage|oregano|dill|basil|mint|tarragon|chives|parsley|cilantro)\b/, "Produce"],
  [/\b(?:lemons?|limes?)\b(?! (?:pepper|zest|juice))/, "Produce"],
  [/\bcapers?\b/, "Condiments & Sauces"],
  [/\byogh?urt\b/, "Dairy / Dairy Alternatives"],
];

/** Classify a raw ingredient name into a canonical department. */
export function classifyDepartment(name: string, notes = ""): Department {
  const lower = name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const shelf = SHELF_OVERRIDES.find(([pattern]) => pattern.test(lower));
  if (shelf) return shelf[1];
  if (isSeasoningOrGarnish(lower, notes)) return "Pantry & Spices";

  const semantic = inferShoppingCategory(lower, notes);
  if ((DEPARTMENTS as readonly string[]).includes(semantic) && semantic !== "Other") {
    return semantic as Department;
  }

  for (const [pattern, department] of EXPLICIT_DEPARTMENTS) {
    if (pattern.test(lower)) return department;
  }
  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k))) return "Proteins";
  if (FROZEN_KEYWORDS.some((k) => lower.includes(k))) return "Frozen";
  if (DAIRY_KEYWORDS.some((k) => lower.includes(k))) return "Dairy / Dairy Alternatives";
  if (BAKERY_KEYWORDS.some((k) => lower.includes(k))) return "Bakery / Dough";
  if (
    PRODUCE_KEYWORDS.some((k) => lower.includes(k)) &&
    !/\b(black pepper|white pepper|ground pepper)\b/i.test(lower)
  ) {
    return "Produce";
  }
  if (CONDIMENT_KEYWORDS.some((k) => lower.includes(k))) return "Condiments & Sauces";
  if (PANTRY_KEYWORDS.some((k) => lower.includes(k))) return "Pantry & Spices";

  return "Other";
}
