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

/** Classify a raw ingredient name (+ optional notes) into a canonical department. */
export function classifyDepartment(name: string, notes = ""): Department {
  if (isSeasoningOrGarnish(name, notes)) return "Pantry & Spices";

  const semantic = inferShoppingCategory(name, notes);
  if ((DEPARTMENTS as readonly string[]).includes(semantic) && semantic !== "Other") {
    return semantic as Department;
  }

  const lower = name.toLowerCase();
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
