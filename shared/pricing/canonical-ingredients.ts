/**
 * Canonical ingredient pricing registry.
 *
 * Recipes keep their original human-readable ingredient text. This table is
 * ONLY consulted by the pricing engine to map that free text to a stable
 * canonical id with known pricing-unit + conversion metadata.
 *
 * Matching is deterministic: lowercase the ingredient name, then find the
 * LONGEST alias that appears in it as a whole phrase. No AI/ML at runtime.
 * If nothing matches, the ingredient is reported unpriced — never guessed.
 */
import type { CanonicalIngredient } from "./types.js";

export const CANONICAL_INGREDIENTS: CanonicalIngredient[] = [
  // ---- protein ----
  {
    id: "chicken_breast",
    name: "Chicken Breast",
    aliases: [
      "boneless skinless chicken breasts",
      "boneless skinless chicken breast",
      "boneless chicken breast",
      "skinless chicken breast",
      "chicken breasts",
      "chicken breast",
    ],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "chicken_thigh",
    name: "Chicken Thighs",
    aliases: ["boneless chicken thighs", "chicken thighs", "chicken thigh"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "ground_beef",
    name: "Ground Beef",
    aliases: ["lean ground beef", "ground beef", "beef mince", "minced beef"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "ground_pork",
    name: "Ground Pork",
    aliases: ["ground pork", "pork mince"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "ground_turkey",
    name: "Ground Turkey",
    aliases: ["ground turkey", "lean ground turkey"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "bacon",
    name: "Bacon",
    aliases: ["bacon strips", "bacon"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "pork_chop",
    name: "Pork Chops",
    aliases: ["boneless pork chops", "pork chops", "pork chop"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "salmon",
    name: "Salmon",
    aliases: ["salmon fillets", "salmon fillet", "salmon"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "shrimp",
    name: "Shrimp",
    aliases: ["shrimp", "prawns"],
    category: "protein",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "egg",
    name: "Eggs",
    aliases: ["large eggs", "eggs", "egg"],
    category: "protein",
    pricingUnit: "piece",
    pieceWeightG: 50,
    defaultPantryStatus: "normal",
  },

  // ---- dairy ----
  {
    id: "cheddar_cheese",
    name: "Cheddar Cheese",
    aliases: ["shredded cheddar cheese", "shredded cheddar", "cheddar cheese", "cheddar"],
    category: "dairy",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "mozzarella_cheese",
    name: "Mozzarella Cheese",
    aliases: ["shredded mozzarella", "mozzarella cheese", "mozzarella"],
    category: "dairy",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "sour_cream",
    name: "Sour Cream",
    aliases: ["sour cream"],
    category: "dairy",
    pricingUnit: "ml",
    defaultPantryStatus: "normal",
  },
  {
    id: "butter",
    name: "Butter",
    aliases: ["unsalted butter", "salted butter", "butter"],
    category: "dairy",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "milk",
    name: "Milk",
    aliases: ["whole milk", "2% milk", "milk"],
    category: "dairy",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },

  // ---- starch ----
  {
    id: "white_rice",
    name: "White Rice",
    aliases: ["jasmine rice", "long grain white rice", "white rice", "rice"],
    category: "starch",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "pasta",
    name: "Pasta",
    aliases: ["penne pasta", "spaghetti", "pasta"],
    category: "starch",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "flour_tortilla",
    name: "Flour Tortillas",
    aliases: ["flour tortillas", "flour tortilla"],
    category: "starch",
    pricingUnit: "piece",
    pieceWeightG: 45,
    defaultPantryStatus: "normal",
  },
  {
    id: "corn_tortilla",
    name: "Corn Tortillas",
    aliases: ["corn tortillas", "corn tortilla"],
    category: "starch",
    pricingUnit: "piece",
    pieceWeightG: 30,
    defaultPantryStatus: "normal",
  },
  {
    id: "burger_bun",
    name: "Burger Buns",
    aliases: ["hamburger buns", "burger buns", "burger bun"],
    category: "starch",
    pricingUnit: "piece",
    pieceWeightG: 60,
    defaultPantryStatus: "normal",
  },
  {
    id: "potato",
    name: "Potatoes",
    aliases: ["russet potatoes", "yukon gold potatoes", "potatoes", "potato"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },

  // ---- produce ----
  {
    id: "onion",
    name: "Onion",
    aliases: ["yellow onion", "white onion", "red onion", "onions", "onion"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 150,
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "garlic",
    name: "Garlic",
    aliases: ["garlic cloves", "garlic clove", "minced garlic", "garlic"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 5,
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "bell_pepper",
    name: "Bell Pepper",
    aliases: ["red bell pepper", "green bell pepper", "bell peppers", "bell pepper"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 150,
    defaultPantryStatus: "normal",
  },
  {
    id: "tomato",
    name: "Tomato",
    aliases: ["roma tomatoes", "tomatoes", "tomato"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 120,
    defaultPantryStatus: "normal",
  },
  {
    id: "canned_diced_tomato",
    name: "Canned Diced Tomatoes",
    aliases: ["canned diced tomatoes", "diced tomatoes", "canned tomatoes"],
    category: "pantry",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "broccoli",
    name: "Broccoli",
    aliases: ["broccoli florets", "broccoli"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "carrot",
    name: "Carrot",
    aliases: ["carrots", "carrot"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "corn",
    name: "Corn",
    aliases: ["corn kernels", "frozen corn", "corn"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "black_beans",
    name: "Black Beans",
    aliases: ["canned black beans", "black beans"],
    category: "pantry",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "pinto_beans",
    name: "Pinto Beans",
    aliases: ["canned pinto beans", "pinto beans"],
    category: "pantry",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "lettuce",
    name: "Lettuce",
    aliases: ["romaine lettuce", "iceberg lettuce", "shredded lettuce", "lettuce"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "cucumber",
    name: "Cucumber",
    aliases: ["cucumbers", "cucumber"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 300,
    defaultPantryStatus: "normal",
  },
  {
    id: "lime",
    name: "Lime",
    aliases: ["limes", "lime"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 70,
    defaultPantryStatus: "normal",
  },
  {
    id: "lemon",
    name: "Lemon",
    aliases: ["lemons", "lemon"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 100,
    defaultPantryStatus: "normal",
  },
  {
    id: "cilantro",
    name: "Cilantro",
    aliases: ["fresh cilantro", "cilantro"],
    category: "produce",
    pricingUnit: "g",
    defaultPantryStatus: "normal",
  },
  {
    id: "jalapeno",
    name: "Jalapeño",
    aliases: ["jalapenos", "jalapeño", "jalapeno"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 14,
    defaultPantryStatus: "normal",
  },
  {
    id: "avocado",
    name: "Avocado",
    aliases: ["avocados", "avocado"],
    category: "produce",
    pricingUnit: "piece",
    pieceWeightG: 200,
    defaultPantryStatus: "normal",
  },

  // ---- pantry / sauce / spice ----
  {
    id: "olive_oil",
    name: "Olive Oil",
    aliases: ["extra virgin olive oil", "olive oil"],
    category: "pantry",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "vegetable_oil",
    name: "Vegetable Oil",
    aliases: ["vegetable oil", "canola oil", "cooking oil"],
    category: "pantry",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "salt",
    name: "Salt",
    aliases: ["kosher salt", "sea salt", "table salt", "salt"],
    category: "spice",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "black_pepper",
    name: "Black Pepper",
    aliases: ["ground black pepper", "black pepper", "pepper"],
    category: "spice",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "sugar",
    name: "Sugar",
    aliases: ["granulated sugar", "brown sugar", "sugar"],
    category: "pantry",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "flour",
    name: "All-Purpose Flour",
    aliases: ["all-purpose flour", "all purpose flour", "flour"],
    category: "pantry",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "soy_sauce",
    name: "Soy Sauce",
    aliases: ["low sodium soy sauce", "soy sauce"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "bbq_sauce",
    name: "BBQ Sauce",
    aliases: ["bbq sauce", "barbecue sauce"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "normal",
  },
  {
    id: "hot_sauce",
    name: "Hot Sauce",
    aliases: ["hot sauce"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "mayo",
    name: "Mayonnaise",
    aliases: ["mayonnaise", "mayo"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "ketchup",
    name: "Ketchup",
    aliases: ["ketchup"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "mustard",
    name: "Mustard",
    aliases: ["dijon mustard", "yellow mustard", "mustard"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "salsa",
    name: "Salsa",
    aliases: ["salsa"],
    category: "sauce",
    pricingUnit: "ml",
    defaultPantryStatus: "normal",
  },
  {
    id: "cumin",
    name: "Cumin",
    aliases: ["ground cumin", "cumin"],
    category: "spice",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "chili_powder",
    name: "Chili Powder",
    aliases: ["chili powder"],
    category: "spice",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
  {
    id: "paprika",
    name: "Paprika",
    aliases: ["smoked paprika", "paprika"],
    category: "spice",
    pricingUnit: "g",
    defaultPantryStatus: "likely_staple",
  },
];

const BY_ID: Map<string, CanonicalIngredient> = new Map(
  CANONICAL_INGREDIENTS.map((c) => [c.id, c]),
);

export function getCanonicalIngredient(id: string): CanonicalIngredient | undefined {
  return BY_ID.get(id);
}

export interface CanonicalMatch {
  ingredient: CanonicalIngredient;
  matchedAlias: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word/phrase containment — "corn" must not match inside "unicorn". */
function containsAliasPhrase(name: string, alias: string): boolean {
  return new RegExp(`(?:^|[^a-z])${escapeRegExp(alias)}(?:[^a-z]|$)`).test(name);
}

/**
 * Deterministic longest-alias-match against a free-text ingredient name.
 * Returns null (never a guess) when nothing matches.
 */
export function resolveCanonicalIngredient(rawName: string): CanonicalMatch | null {
  const name = ` ${rawName.trim().toLowerCase().replace(/\s+/g, " ")} `;
  if (!name.trim()) return null;

  let best: CanonicalMatch | null = null;
  for (const ingredient of CANONICAL_INGREDIENTS) {
    for (const alias of ingredient.aliases) {
      if (!containsAliasPhrase(name, alias)) continue;
      if (!best || alias.length > best.matchedAlias.length) {
        best = { ingredient, matchedAlias: alias };
      }
    }
  }
  return best;
}
