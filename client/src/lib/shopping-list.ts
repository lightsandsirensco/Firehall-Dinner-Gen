import type { GenerateResponse, PizzaResponse, IngredientItem, ClientRecipeResponse, ClientIngredient } from "@shared/schema";
import type { GoldenRecipePageIngredient } from "@shared/golden-100/recipe-page-schema";
import {
  inferShoppingCategory,
  isSeasoningOrGarnish,
  isRequiredForMeal,
} from "@shared/meal-semantics";
import { ingredientNameMatchesRecipeTitle } from "@shared/meal-format-contract";
import {
  convertShoppingAmountString,
  formatIngredientAmount,
  formatIngredientDisplayName,
  type MeasurementSystem,
} from "@shared/measurements";

export interface ShoppingItem {
  name: string;
  amount: string;
  notes: string;
}

export interface ShoppingSection {
  title: string;
  items: ShoppingItem[];
}

export interface ShoppingListResult {
  sections: ShoppingSection[];
  fridge_used?: string[];
  need_to_grab?: string[];
  veg_option?: { items: ShoppingItem[] };
  budget_swaps?: string[];
}

const PROTEIN_KEYWORDS = [
  "chicken", "beef", "pork", "turkey", "salmon", "shrimp", "sausage", "bacon",
  "steak", "ground", "meatball", "pepperoni", "ham", "prosciutto", "lamb",
  "fish", "tuna", "cod", "tilapia", "crab", "lobster", "scallop", "anchov",
  "chorizo", "salami", "brisket", "ribs", "thigh", "breast", "wing", "drumstick",
  "plant-based crumble", "beyond", "impossible",
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

const FROZEN_KEYWORDS = [
  "frozen", "ice cream", "frozen vegetable", "frozen fruit",
];

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

function categorize(itemName: string, notes = ""): string {
  if (isSeasoningOrGarnish(itemName, notes)) return "Pantry & Spices";
  const semantic = inferShoppingCategory(itemName, notes);
  if (semantic !== "Other") return semantic;

  const lower = itemName.toLowerCase();
  if (PROTEIN_KEYWORDS.some(k => lower.includes(k))) return "Proteins";
  if (FROZEN_KEYWORDS.some(k => lower.includes(k))) return "Frozen";
  if (DAIRY_KEYWORDS.some(k => lower.includes(k))) return "Dairy / Dairy Alternatives";
  if (BAKERY_KEYWORDS.some(k => lower.includes(k))) return "Bakery / Dough";
  if (PRODUCE_KEYWORDS.some(k => lower.includes(k)) && !/\b(black pepper|white pepper|ground pepper)\b/i.test(lower)) {
    return "Produce";
  }
  if (CONDIMENT_KEYWORDS.some(k => lower.includes(k))) return "Condiments & Sauces";
  if (PANTRY_KEYWORDS.some(k => lower.includes(k))) return "Pantry & Spices";

  return "Other";
}

const SECTION_ORDER = [
  "Required for tonight's meal",
  "Proteins",
  "Produce",
  "Dairy / Dairy Alternatives",
  "Pantry & Spices",
  "Bakery / Dough",
  "Frozen",
  "Condiments & Sauces",
  "Other",
];

const REQUIRED_SECTION = "Required for tonight's meal";

function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

function parseAmount(amount: string): { value: number; unit: string } | null {
  const match = amount.trim().match(/^([\d.\/]+)\s*(.*)$/);
  if (!match) return null;
  let value: number;
  if (match[1].includes("/")) {
    const parts = match[1].split("/");
    value = parseFloat(parts[0]) / parseFloat(parts[1]);
  } else {
    value = parseFloat(match[1]);
  }
  if (isNaN(value)) return null;
  const unit = match[2].toLowerCase().trim();
  return { value, unit };
}

function normalizeUnit(unit: string): string {
  const aliases: Record<string, string> = {
    "cup": "cup", "cups": "cup",
    "tbsp": "tbsp", "tablespoon": "tbsp", "tablespoons": "tbsp",
    "tsp": "tsp", "teaspoon": "tsp", "teaspoons": "tsp",
    "oz": "oz", "ounce": "oz", "ounces": "oz",
    "lb": "lb", "lbs": "lb", "pound": "lb", "pounds": "lb",
    "g": "g", "gram": "g", "grams": "g",
    "kg": "kg", "kilogram": "kg", "kilograms": "kg",
    "ml": "ml", "milliliter": "ml", "milliliters": "ml",
    "l": "l", "liter": "l", "liters": "l",
    "clove": "clove", "cloves": "clove",
    "slice": "slice", "slices": "slice",
    "can": "can", "cans": "can",
    "bunch": "bunch", "bunches": "bunch",
    "head": "head", "heads": "head",
    "stalk": "stalk", "stalks": "stalk",
    "sprig": "sprig", "sprigs": "sprig",
  };
  return aliases[unit] || unit;
}

function formatAmount(value: number, unit: string): string {
  const rounded = Math.round(value * 100) / 100;
  const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  return unit ? `${display} ${unit}` : display;
}

function mergeItems(items: ShoppingItem[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem & { amounts: string[] }>();

  for (const item of items) {
    const key = normalizeItemName(item.name);
    const existing = map.get(key);
    if (existing) {
      if (item.amount && !existing.amounts.includes(item.amount)) {
        existing.amounts.push(item.amount);
      }
      if (item.notes && !existing.notes.includes(item.notes)) {
        existing.notes = existing.notes ? `${existing.notes}; ${item.notes}` : item.notes;
      }
    } else {
      map.set(key, { ...item, amounts: item.amount ? [item.amount] : [] });
    }
  }

  return Array.from(map.values()).map(({ amounts, ...rest }) => {
    if (amounts.length <= 1) {
      return { ...rest, amount: amounts[0] || "" };
    }

    const parsed = amounts.map(a => ({ raw: a, parsed: parseAmount(a) }));
    const allParsed = parsed.every(p => p.parsed !== null);

    if (allParsed) {
      const units = parsed.map(p => normalizeUnit(p.parsed!.unit));
      const allSameUnit = units.every(u => u === units[0]);
      if (allSameUnit) {
        const total = parsed.reduce((sum, p) => sum + p.parsed!.value, 0);
        return { ...rest, amount: formatAmount(total, parsed[0].parsed!.unit) };
      }
    }

    return { ...rest, amount: `(${amounts.join(" + ")})` };
  });
}

export type ShoppingListBuildOptions = {
  recipeTitle?: string;
  measurementSystem?: MeasurementSystem;
};

function formatShoppingItemAmount(
  amount: string,
  system: MeasurementSystem = "us",
): string {
  if (!amount.trim() || system === "us") return amount;
  return convertShoppingAmountString(amount, system);
}

function ingredientToShoppingItem(
  ing: IngredientItem,
  system: MeasurementSystem = "us",
): ShoppingItem {
  return {
    name: formatIngredientDisplayName(ing.item),
    amount: formatShoppingItemAmount(ing.amount, system),
    notes: ing.notes,
  };
}

function fmtShoppingQty(qty: number, unit: string, system: MeasurementSystem = "us"): string {
  if (system === "metric" && unit) {
    return formatIngredientAmount(String(qty), unit, system);
  }
  const rounded = Math.round(qty * 100) / 100;
  const display = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace(/\.0$/, "");
  return unit ? `${display} ${unit}` : display;
}

function clientIngredientToShoppingItem(
  ing: ClientIngredient,
  system: MeasurementSystem = "us",
): ShoppingItem {
  let amount = "";
  if (ing.qty > 0) {
    amount = fmtShoppingQty(ing.qty, ing.unit, system);
  }
  const notes =
    ing.category && ing.category !== "other" ? `category: ${ing.category}` : "";
  return { name: formatIngredientDisplayName(ing.name), amount, notes };
}

function catalogIngredientToShoppingItem(
  ing: GoldenRecipePageIngredient,
  system: MeasurementSystem = "us",
): ShoppingItem {
  const amount = formatIngredientAmount(ing.quantity, ing.unit, system);
  return {
    name: formatIngredientDisplayName(ing.name),
    amount,
    notes: ing.notes || (ing.optional ? "optional" : ""),
  };
}

function filterTitleIngredients(items: ShoppingItem[], recipeTitle?: string): ShoppingItem[] {
  if (!recipeTitle?.trim()) return items;
  return items.filter((item) => !ingredientNameMatchesRecipeTitle(item.name, recipeTitle));
}

/** Shopping list from scaled catalog recipe ingredients (Golden, breakfast, performance, etc.). */
export function buildShoppingListFromCatalogIngredients(
  ingredients: GoldenRecipePageIngredient[],
  options?: ShoppingListBuildOptions,
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const allItems = filterTitleIngredients(
    ingredients
      .filter((ing) => !ing.optional)
      .map((ing) => catalogIngredientToShoppingItem(ing, system)),
    options?.recipeTitle,
  );

  const merged = mergeItems(allItems);
  const sectionMap = new Map<string, ShoppingItem[]>();

  for (const item of merged) {
    const category = categorize(item.name, item.notes);
    if (!sectionMap.has(category)) sectionMap.set(category, []);
    sectionMap.get(category)!.push(item);
  }

  const sections: ShoppingSection[] = SECTION_ORDER.filter((title) => sectionMap.has(title)).map(
    (title) => ({ title, items: sectionMap.get(title)! }),
  );

  if (sections.length === 0 && options?.recipeTitle) {
    sections.push({ title: "Ingredients", items: merged });
  }

  return { sections };
}

function plateLineMatchesIngredient(plateName: string, ingName: string): boolean {
  const p = plateName.toLowerCase().trim();
  const n = ingName.toLowerCase().trim();
  if (p === n) return true;
  if (n.includes(p) && p.length >= 5) return true;
  const pWords = p.split(/\s+/).filter((w) => w.length > 4);
  if (pWords.length === 0) return false;
  return pWords.every((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(n));
}

function collectRequiredPlateItems(recipe: ClientRecipeResponse, merged: ShoppingItem[]): ShoppingItem[] {
  const plate = recipe.meal_plate;
  if (!plate) return [];

  const plateLines = [...(plate.main || []), ...(plate.sides || [])];
  const required: ShoppingItem[] = [];
  const used = new Set<string>();

  for (const line of plateLines) {
    const match = merged.find(
      (item) =>
        !isSeasoningOrGarnish(item.name, item.notes) &&
        plateLineMatchesIngredient(line.name, item.name),
    );
    if (match && !used.has(normalizeItemName(match.name))) {
      used.add(normalizeItemName(match.name));
      required.push({ ...match, notes: "Required for this meal" });
    }
  }

  for (const item of merged) {
    if (isRequiredForMeal(item.notes) && !used.has(normalizeItemName(item.name))) {
      used.add(normalizeItemName(item.name));
      required.push({ ...item, notes: "Required for this meal" });
    }
  }

  return required;
}

const BUDGET_SWAPS: Record<string, string> = {
  "ribeye": "Use chuck steak or sirloin instead of ribeye",
  "salmon": "Swap salmon for canned tuna or tilapia",
  "shrimp": "Use frozen shrimp instead of fresh for savings",
  "prosciutto": "Swap prosciutto for deli ham",
  "brie": "Use cream cheese instead of brie",
  "goat cheese": "Swap goat cheese for feta or cream cheese",
  "pine nut": "Use sunflower seeds instead of pine nuts",
  "truffle": "Skip truffle oil; use extra garlic and olive oil",
  "lobster": "Use imitation crab or canned crab instead",
  "scallop": "Use large shrimp instead of scallops",
  "fresh mozzarella": "Use shredded mozzarella instead of fresh",
  "burrata": "Swap burrata for fresh mozzarella",
  "saffron": "Use turmeric for color instead of saffron",
  "avocado": "Use less avocado or skip if budget is tight",
};

function getBudgetSwaps(items: ShoppingItem[]): string[] {
  const swaps: string[] = [];
  for (const item of items) {
    const lower = item.name.toLowerCase();
    for (const [keyword, swap] of Object.entries(BUDGET_SWAPS)) {
      if (lower.includes(keyword) && !swaps.includes(swap)) {
        swaps.push(swap);
      }
    }
  }
  return swaps;
}

export function buildShoppingListFromClientMeal(
  recipe: ClientRecipeResponse,
  options?: { useWhatWeHave?: boolean; budgetLevel?: string; measurementSystem?: MeasurementSystem },
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const allItems = filterTitleIngredients(
    recipe.ingredients.map((ing) => clientIngredientToShoppingItem(ing, system)),
    recipe.title,
  );

  const existingNames = new Set(allItems.map((i) => normalizeItemName(i.name)));
  if (recipe.extra_items_needed) {
    for (const extra of recipe.extra_items_needed) {
      const key = normalizeItemName(extra);
      if (!key || existingNames.has(key)) continue;
      existingNames.add(key);
      allItems.push({ name: extra, amount: "", notes: "" });
    }
  }

  const merged = mergeItems(allItems);

  const requiredItems = collectRequiredPlateItems(recipe, merged);
  const requiredKeys = new Set(requiredItems.map((i) => normalizeItemName(i.name)));

  const sectionMap = new Map<string, ShoppingItem[]>();
  if (requiredItems.length > 0) {
    sectionMap.set(REQUIRED_SECTION, requiredItems);
  }

  for (const item of merged) {
    if (requiredKeys.has(normalizeItemName(item.name))) continue;
    const category = categorize(item.name, item.notes);
    if (!sectionMap.has(category)) sectionMap.set(category, []);
    sectionMap.get(category)!.push(item);
  }

  const sections: ShoppingSection[] = SECTION_ORDER
    .filter(title => sectionMap.has(title))
    .map(title => ({ title, items: sectionMap.get(title)! }));

  const result: ShoppingListResult = { sections };

  if (options?.useWhatWeHave && recipe.ingredients_used && recipe.ingredients_used.length > 0) {
    result.fridge_used = recipe.ingredients_used;
    result.need_to_grab = recipe.extra_items_needed || [];
  }

  if (recipe.veg_option?.enabled && recipe.veg_option.ingredients.length > 0) {
    const vegItems = recipe.veg_option.ingredients
      .filter(ing => !ing.item.toLowerCase().includes("tofu"))
      .map((ing) => ingredientToShoppingItem(ing, system));
    if (vegItems.length > 0) {
      result.veg_option = { items: mergeItems(vegItems) };
    }
  }

  if (options?.budgetLevel === "low") {
    const allShoppingItems = [...merged, ...(result.veg_option?.items || [])];
    result.budget_swaps = getBudgetSwaps(allShoppingItems);
  }

  return result;
}

export function buildShoppingListFromMeal(
  recipe: GenerateResponse,
  options?: { useWhatWeHave?: boolean; budgetLevel?: string; measurementSystem?: MeasurementSystem },
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const allItems = filterTitleIngredients(
    recipe.ingredients.map((ing) => ingredientToShoppingItem(ing, system)),
    recipe.title,
  );

  if (recipe.extra_items_needed) {
    for (const extra of recipe.extra_items_needed) {
      allItems.push({ name: extra, amount: "", notes: "" });
    }
  }

  const merged = mergeItems(allItems);

  const requiredItems = merged.filter((item) => isRequiredForMeal(item.notes));
  const requiredKeys = new Set(requiredItems.map((i) => normalizeItemName(i.name)));

  const sectionMap = new Map<string, ShoppingItem[]>();
  if (requiredItems.length > 0) {
    sectionMap.set(REQUIRED_SECTION, requiredItems.map((i) => ({ ...i, notes: "Required for this meal" })));
  }

  for (const item of merged) {
    if (requiredKeys.has(normalizeItemName(item.name))) continue;
    const category = categorize(item.name, item.notes);
    if (!sectionMap.has(category)) sectionMap.set(category, []);
    sectionMap.get(category)!.push(item);
  }

  const sections: ShoppingSection[] = SECTION_ORDER
    .filter(title => sectionMap.has(title))
    .map(title => ({ title, items: sectionMap.get(title)! }));

  const result: ShoppingListResult = { sections };

  if (options?.useWhatWeHave && recipe.ingredients_used && recipe.ingredients_used.length > 0) {
    result.fridge_used = recipe.ingredients_used;
    result.need_to_grab = recipe.extra_items_needed || [];
  }

  if (recipe.veg_option?.enabled && recipe.veg_option.ingredients.length > 0) {
    const vegItems = recipe.veg_option.ingredients
      .filter(ing => !ing.item.toLowerCase().includes("tofu"))
      .map((ing) => ingredientToShoppingItem(ing, system));
    if (vegItems.length > 0) {
      result.veg_option = { items: mergeItems(vegItems) };
    }
  }

  if (options?.budgetLevel === "low") {
    const allShoppingItems = [...merged, ...(result.veg_option?.items || [])];
    result.budget_swaps = getBudgetSwaps(allShoppingItems);
  }

  return result;
}

export function buildShoppingListFromPizza(
  recipe: PizzaResponse,
  options?: { budgetLevel?: string; measurementSystem?: MeasurementSystem },
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const allItems: ShoppingItem[] = [];

  const groups = [
    recipe.ingredients.dough,
    recipe.ingredients.sauce,
    recipe.ingredients.cheese,
    recipe.ingredients.toppings,
    recipe.ingredients.drizzles,
  ];

  for (const group of groups) {
    if (group) {
      for (const ing of group) {
        allItems.push(ingredientToShoppingItem(ing, system));
      }
    }
  }

  const merged = mergeItems(allItems);

  const sectionMap = new Map<string, ShoppingItem[]>();
  for (const item of merged) {
    const category = categorize(item.name);
    if (!sectionMap.has(category)) sectionMap.set(category, []);
    sectionMap.get(category)!.push(item);
  }

  const sections: ShoppingSection[] = SECTION_ORDER
    .filter(title => sectionMap.has(title))
    .map(title => ({ title, items: sectionMap.get(title)! }));

  const result: ShoppingListResult = { sections };

  if (recipe.veg_option?.enabled && recipe.veg_option.swap_toppings.length > 0) {
    const vegItems = recipe.veg_option.swap_toppings
      .filter(ing => !ing.item.toLowerCase().includes("tofu"))
      .map((ing) => ingredientToShoppingItem(ing, system));
    if (vegItems.length > 0) {
      result.veg_option = { items: mergeItems(vegItems) };
    }
  }

  return result;
}

export function shoppingListToText(result: ShoppingListResult, recipeTitle: string): string {
  const lines: string[] = [];
  lines.push(`Shopping List — ${recipeTitle}`);
  lines.push("═".repeat(40));

  if (result.fridge_used && result.fridge_used.length > 0) {
    lines.push("");
    lines.push("USING WHAT'S IN THE FRIDGE:");
    for (const item of result.fridge_used) {
      lines.push(`  ✓ ${item}`);
    }
  }

  if (result.need_to_grab && result.need_to_grab.length > 0) {
    lines.push("");
    lines.push("YOU MAY NEED TO GRAB:");
    for (const item of result.need_to_grab) {
      lines.push(`  • ${item}`);
    }
  }

  for (const section of result.sections) {
    lines.push("");
    lines.push(`${section.title.toUpperCase()}`);
    lines.push("─".repeat(30));
    for (const item of section.items) {
      let line = `  □ ${item.name}`;
      if (item.amount) line += ` — ${item.amount}`;
      if (item.notes) line += ` (${item.notes})`;
      lines.push(line);
    }
  }

  if (result.veg_option && result.veg_option.items.length > 0) {
    lines.push("");
    lines.push("VEG OPTION (1 SERVING)");
    lines.push("─".repeat(30));
    for (const item of result.veg_option.items) {
      let line = `  □ ${item.name}`;
      if (item.amount) line += ` — ${item.amount}`;
      if (item.notes) line += ` (${item.notes})`;
      lines.push(line);
    }
  }

  if (result.budget_swaps && result.budget_swaps.length > 0) {
    lines.push("");
    lines.push("BUDGET SWAPS");
    lines.push("─".repeat(30));
    for (const swap of result.budget_swaps) {
      lines.push(`  💡 ${swap}`);
    }
  }

  lines.push("");
  lines.push("www.lightsandsirensco.com");

  return lines.join("\n");
}
