/**
 * Single-recipe shopping list (copy/print/email dialog and recipe pages).
 *
 * A thin adapter over the canonical engine in `shared/shopping/*`: parsing,
 * merging, unit conversion, departments and purchase amounts all come from
 * there, so this dialog and the Shift Planner list always agree. This module
 * only maps app recipe shapes in and the dialog's section shape out, plus the
 * dialog-only extras (required-for-the-plate, veg option, budget swaps).
 */
import type { GenerateResponse, PizzaResponse, IngredientItem, ClientRecipeResponse, ClientIngredient } from "@shared/schema";
import type { GoldenRecipePageIngredient } from "@shared/golden-100/recipe-page-schema";
import { isSeasoningOrGarnish, isRequiredForMeal } from "@shared/meal-semantics";
import { ingredientNameMatchesRecipeTitle } from "@shared/meal-format-contract";
import { formatIngredientDisplayName, type MeasurementSystem } from "@shared/measurements";
import {
  addRecipeToSession,
  createShoppingSession,
  DEPARTMENT_ORDER,
  formatAisleListText,
  formatShoppingItemQuantity,
  type AisleExportDocument,
  type RawRecipeIngredient,
} from "@shared/shopping";

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

const REQUIRED_SECTION = "Required for tonight's meal";

interface DepartmentItem extends ShoppingItem {
  department: string;
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
}

/** Run already-scaled ingredient lines through the shared engine (no further scaling). */
function buildItems(ingredients: RawRecipeIngredient[], system: MeasurementSystem): DepartmentItem[] {
  if (ingredients.length === 0) return [];
  const session = addRecipeToSession(
    createShoppingSession(),
    { slug: "recipe", title: "", baseServings: 1, ingredients, prescaled: true },
    1,
  );
  return session.list.items.map((item) => ({
    name: formatIngredientDisplayName(item.displayName),
    amount: formatShoppingItemQuantity(item, system === "metric" ? "metric" : undefined),
    notes: item.notes?.trim() ?? "",
    department: item.department,
  }));
}

function toSections(items: DepartmentItem[], leading?: ShoppingSection): ShoppingSection[] {
  const sections: ShoppingSection[] = leading && leading.items.length > 0 ? [leading] : [];
  for (const department of DEPARTMENT_ORDER) {
    const inDept = items.filter((i) => i.department === department);
    if (inDept.length > 0) sections.push({ title: department, items: inDept.map(stripDepartment) });
  }
  return sections;
}

function stripDepartment({ name, amount, notes }: DepartmentItem): ShoppingItem {
  return { name, amount, notes };
}

export type ShoppingListBuildOptions = {
  recipeTitle?: string;
  measurementSystem?: MeasurementSystem;
};

function fromIngredientItem(ing: IngredientItem): RawRecipeIngredient {
  return { name: ing.item, quantity: ing.amount, notes: ing.notes };
}

function fromClientIngredient(ing: ClientIngredient): RawRecipeIngredient {
  const quantity = ing.qty > 0 ? String(Math.round(ing.qty * 10000) / 10000) : "";
  return { name: ing.name, ...(quantity ? { quantity } : {}), ...(ing.unit ? { unit: ing.unit } : {}) };
}

function fromCatalogIngredient(ing: GoldenRecipePageIngredient): RawRecipeIngredient {
  return {
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    notes: ing.notes,
    ...(ing.optional ? { optional: true } : {}),
  };
}

function withoutTitleLines<T extends { name: string }>(items: T[], recipeTitle?: string): T[] {
  if (!recipeTitle?.trim()) return items;
  return items.filter((item) => !ingredientNameMatchesRecipeTitle(item.name, recipeTitle));
}

/** Shopping list from scaled catalog recipe ingredients (Golden, breakfast, performance, etc.). */
export function buildShoppingListFromCatalogIngredients(
  ingredients: GoldenRecipePageIngredient[],
  options?: ShoppingListBuildOptions,
): ShoppingListResult {
  const items = withoutTitleLines(
    buildItems(ingredients.map(fromCatalogIngredient), options?.measurementSystem ?? "us"),
    options?.recipeTitle,
  );
  const sections = toSections(items);
  if (sections.length === 0 && options?.recipeTitle && items.length > 0) {
    sections.push({ title: "Ingredients", items: items.map(stripDepartment) });
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

function collectRequiredPlateItems(recipe: ClientRecipeResponse, merged: DepartmentItem[]): DepartmentItem[] {
  const plate = recipe.meal_plate;
  if (!plate) return [];

  const plateLines = [...(plate.main || []), ...(plate.sides || [])];
  const required: DepartmentItem[] = [];
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

/** Extra "need to grab" names not already covered by an ingredient line. */
function extraItems(extras: string[] | undefined, existing: RawRecipeIngredient[]): RawRecipeIngredient[] {
  if (!extras?.length) return [];
  const seen = new Set(existing.map((i) => normalizeItemName(i.name)));
  const out: RawRecipeIngredient[] = [];
  for (const extra of extras) {
    const key = normalizeItemName(extra);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name: extra });
  }
  return out;
}

function vegOptionItems(
  ingredients: IngredientItem[] | undefined,
  system: MeasurementSystem,
): ShoppingListResult["veg_option"] | undefined {
  const raw = (ingredients ?? []).filter((ing) => !ing.item.toLowerCase().includes("tofu")).map(fromIngredientItem);
  const items = buildItems(raw, system).map(stripDepartment);
  return items.length > 0 ? { items } : undefined;
}

type MealOptions = { useWhatWeHave?: boolean; budgetLevel?: string; measurementSystem?: MeasurementSystem };

function finishMealResult(
  merged: DepartmentItem[],
  required: DepartmentItem[],
  recipe: Pick<GenerateResponse, "ingredients_used" | "extra_items_needed" | "veg_option">,
  options: MealOptions | undefined,
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const requiredKeys = new Set(required.map((i) => normalizeItemName(i.name)));
  const rest = merged.filter((i) => !requiredKeys.has(normalizeItemName(i.name)));
  const result: ShoppingListResult = {
    sections: toSections(rest, { title: REQUIRED_SECTION, items: required.map(stripDepartment) }),
  };

  if (options?.useWhatWeHave && recipe.ingredients_used && recipe.ingredients_used.length > 0) {
    result.fridge_used = recipe.ingredients_used;
    result.need_to_grab = recipe.extra_items_needed || [];
  }

  if (recipe.veg_option?.enabled && recipe.veg_option.ingredients.length > 0) {
    const veg = vegOptionItems(recipe.veg_option.ingredients, system);
    if (veg) result.veg_option = veg;
  }

  if (options?.budgetLevel === "low") {
    result.budget_swaps = getBudgetSwaps([...merged, ...(result.veg_option?.items || [])]);
  }

  return result;
}

export function buildShoppingListFromClientMeal(
  recipe: ClientRecipeResponse,
  options?: MealOptions,
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const raw = recipe.ingredients.map(fromClientIngredient);
  const merged = withoutTitleLines(
    buildItems([...raw, ...extraItems(recipe.extra_items_needed, raw)], system),
    recipe.title,
  );
  return finishMealResult(merged, collectRequiredPlateItems(recipe, merged), recipe, options);
}

export function buildShoppingListFromMeal(
  recipe: GenerateResponse,
  options?: MealOptions,
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const raw = recipe.ingredients.map(fromIngredientItem);
  const merged = withoutTitleLines(
    buildItems([...raw, ...extraItems(recipe.extra_items_needed, raw)], system),
    recipe.title,
  );
  const required = merged
    .filter((item) => isRequiredForMeal(item.notes))
    .map((i) => ({ ...i, notes: "Required for this meal" }));
  return finishMealResult(merged, required, recipe, options);
}

export function buildShoppingListFromPizza(
  recipe: PizzaResponse,
  options?: { budgetLevel?: string; measurementSystem?: MeasurementSystem },
): ShoppingListResult {
  const system = options?.measurementSystem ?? "us";
  const groups = [
    recipe.ingredients.dough,
    recipe.ingredients.sauce,
    recipe.ingredients.cheese,
    recipe.ingredients.toppings,
    recipe.ingredients.drizzles,
  ];
  const merged = buildItems(groups.flatMap((g) => g ?? []).map(fromIngredientItem), system);
  const result: ShoppingListResult = { sections: toSections(merged) };

  if (recipe.veg_option?.enabled && recipe.veg_option.swap_toppings.length > 0) {
    const veg = vegOptionItems(recipe.veg_option.swap_toppings, system);
    if (veg) result.veg_option = veg;
  }

  if (options?.budgetLevel === "low") {
    result.budget_swaps = getBudgetSwaps([...merged, ...(result.veg_option?.items || [])]);
  }

  return result;
}

export const VEG_OPTION_SECTION = "Veg Option (1 Serving)";
export { REQUIRED_SECTION };

/** Stable per-line key for checkbox persistence (survives re-renders and re-scaling). */
export function shoppingLineKey(sectionTitle: string, itemName: string): string {
  return `${sectionTitle}|${normalizeItemName(itemName)}`;
}

/** The dialog's list in the shared aisle export shape (copy, print, share, email). */
export function shoppingListToExportDocument(
  result: ShoppingListResult,
  recipeTitle: string,
  checked: ReadonlySet<string> = new Set(),
): AisleExportDocument {
  const toSection = (title: string, items: ShoppingItem[]) => ({
    title,
    lines: items.map((i) => ({
      name: i.name,
      amount: i.amount || undefined,
      notes: i.notes || undefined,
      checked: checked.has(shoppingLineKey(title, i.name)),
    })),
  });
  const sections = result.sections.map((s) => toSection(s.title, s.items));
  if (result.veg_option?.items.length) sections.push(toSection(VEG_OPTION_SECTION, result.veg_option.items));
  const extras: { title: string; lines: string[] }[] = [];
  if (result.fridge_used?.length) extras.push({ title: "Using what's in the fridge", lines: result.fridge_used });
  if (result.need_to_grab?.length) extras.push({ title: "You may need to grab", lines: result.need_to_grab });
  if (result.budget_swaps?.length) extras.push({ title: "Budget swaps", lines: result.budget_swaps });
  return {
    title: "Shopping List",
    subtitle: `Based on: ${recipeTitle}`,
    sections,
    extras,
    footer: "Firefighter-owned — built for the fire service.",
  };
}

export function shoppingListToText(result: ShoppingListResult, recipeTitle: string): string {
  return formatAisleListText(shoppingListToExportDocument(result, recipeTitle));
}
