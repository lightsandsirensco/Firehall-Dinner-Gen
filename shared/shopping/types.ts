/**
 * Smart Shopping — core domain types.
 *
 * This module is the shared vocabulary for turning recipes into grocery
 * shopping lists. It is intentionally retailer-agnostic: nothing here knows
 * about Instacart, Walmart, Costco, affiliate links, or delivery — it only
 * models "what do I need to buy, how much, and why."
 *
 * Kept isomorphic (no DOM/Node APIs) so it can run in the browser today and
 * be reused by a server-side sync layer later without changes.
 */

export const SHOPPING_SCHEMA_VERSION = 1 as const;

/** Separate from SHOPPING_SCHEMA_VERSION so a pantry shape change doesn't reset sessions/history. */
export const PANTRY_SCHEMA_VERSION = 2 as const;

/** Canonical grocery departments a shopping list can be grouped by. */
export const DEPARTMENTS = [
  "Proteins",
  "Produce",
  "Dairy / Dairy Alternatives",
  "Pantry & Spices",
  "Bakery / Dough",
  "Frozen",
  "Condiments & Sauces",
  "Other",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

/**
 * The lifecycle phase of a shopping session.
 * - planning: still adding recipes/items before heading to the store
 * - shopping: actively checking items off in-aisle
 * - completed: archived to history, read-only
 */
export type ShoppingMode = "planning" | "shopping" | "completed";

/** A single raw ingredient line as it appears on a recipe (pre-normalization). */
export interface RawRecipeIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  optional?: boolean;
}

/** The minimal recipe payload the engine needs — caller fetches this however it likes. */
export interface ShoppingRecipeInput {
  slug: string;
  title: string;
  /** Servings the ingredient quantities below are written for. */
  baseServings: number;
  ingredients: RawRecipeIngredient[];
  recipePath?: string;
}

/** One recipe's contribution of a single ingredient quantity to the merged list. */
export interface ShoppingItemContribution {
  recipeSlug: string;
  recipeTitle: string;
  value: number;
  unit: string;
  rawQuantity: string;
}

/** A recipe currently feeding this shopping session. */
export interface ShoppingSessionRecipe {
  slug: string;
  title: string;
  recipePath?: string;
  baseServings: number;
  crewSize: number;
  ingredients: RawRecipeIngredient[];
  addedAt: string;
}

/** A single line on the merged shopping list. */
export interface ShoppingListItem {
  id: string;
  /** Normalized key used to combine duplicates (e.g. "chicken thigh"). */
  canonicalKey: string;
  /** Human-friendly display name. */
  displayName: string;
  department: Department;
  /** Formatted, human-readable quantity (e.g. "2 lb" or "3 cups + 1 can"). */
  quantityLabel: string;
  /** Per-recipe breakdown that produced quantityLabel — empty for manual items. */
  contributions: ShoppingItemContribution[];
  notes?: string;
  isManual: boolean;
  checked: boolean;
  /** True if Personal or Hall Pantry marks this "always"/"usually" stocked — hidden from the active list. */
  inPantry: boolean;
  /** Which pantry tier produced inPantry=true, and whose pantry it came from — for the "already have" panel. */
  pantryStockLevel?: StockLevel;
  pantrySource?: "personal" | "hall";
  addedAt: string;
}

export interface ShoppingList {
  items: ShoppingListItem[];
  generatedAt: string;
}

export interface ShoppingSession {
  id: string;
  schemaVersion: typeof SHOPPING_SCHEMA_VERSION;
  mode: ShoppingMode;
  recipes: ShoppingSessionRecipe[];
  list: ShoppingList;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

/** One prior shopping run, kept for reuse and "shop this again" flows. */
export interface ShoppingHistoryEntry {
  id: string;
  sessionId: string;
  completedAt: string;
  recipeTitles: string[];
  itemCount: number;
  checkedCount: number;
  /** Full snapshot so a past run can be restored or duplicated. */
  session: ShoppingSession;
}

export interface ShoppingHistory {
  schemaVersion: typeof SHOPPING_SCHEMA_VERSION;
  entries: ShoppingHistoryEntry[];
}

/**
 * How confident we are that a staple is already on hand.
 * - always: never appears on a shopping list.
 * - usually: normally on hand — also skipped, but called out separately so it can be double-checked.
 * - never: a real, explicit "I don't keep this stocked" — always shows (same as being untracked).
 */
export type StockLevel = "always" | "usually" | "never";

export function stockLevelHidesItem(level: StockLevel): boolean {
  return level === "always" || level === "usually";
}

/**
 * A pantry — Personal or Hall — is just a map of canonical ingredient key to
 * StockLevel. Untracked keys are treated as "never" (must buy). Personal and
 * Hall pantries share this exact shape so the same helpers work on both.
 */
export interface PantryProfile {
  schemaVersion: typeof PANTRY_SCHEMA_VERSION;
  items: Record<string, StockLevel>;
  updatedAt: string;
}

/** Hall Pantry uses the identical shape — a fire hall's shared "we always have this" list. */
export type HallPantryProfile = PantryProfile;

export interface PantryContext {
  personal?: PantryProfile;
  hall?: PantryProfile;
}

export type GroupedShoppingList = {
  department: Department;
  items: ShoppingListItem[];
}[];
