/**
 * Smart Shopping — serialization / restoration.
 *
 * Storage-agnostic: localStorage today, an account-sync payload later. Restore
 * never trusts its input — malformed entries are dropped individually rather
 * than discarding the whole session, and recipe-derived quantities are
 * refreshed with the current engine so lists saved by older parsers heal.
 */

import { classifyDepartment } from "./departments";
import { migratePantryProfileKeys } from "./pantry-profile";
import { refreshDerivedQuantities } from "./shopping-service";
import {
  DEPARTMENTS,
  PANTRY_SCHEMA_VERSION,
  SHOPPING_SCHEMA_VERSION,
  type Department,
  type PantryProfile,
  type RawRecipeIngredient,
  type ShoppingHistory,
  type ShoppingHistoryEntry,
  type ShoppingItemContribution,
  type ShoppingListItem,
  type ShoppingMode,
  type ShoppingSession,
  type ShoppingSessionRecipe,
  type StockLevel,
} from "./types";

type Obj = Record<string, unknown>;

const MODES: ShoppingMode[] = ["planning", "shopping", "completed"];
const STOCK_LEVELS: StockLevel[] = ["always", "usually", "never"];

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function parseInput(input: unknown): unknown {
  if (typeof input !== "string") return input;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function restoreIngredient(v: unknown): RawRecipeIngredient | null {
  if (!isObj(v)) return null;
  const name = str(v.name)?.trim();
  if (!name) return null;
  const ing: RawRecipeIngredient = { name };
  const quantity = str(v.quantity);
  const unit = str(v.unit);
  const notes = str(v.notes);
  if (quantity !== undefined) ing.quantity = quantity;
  if (unit !== undefined) ing.unit = unit;
  if (notes !== undefined) ing.notes = notes;
  if (v.optional === true) ing.optional = true;
  return ing;
}

function restoreRecipe(v: unknown): ShoppingSessionRecipe | null {
  if (!isObj(v)) return null;
  const slug = str(v.slug);
  const title = str(v.title);
  const baseServings = num(v.baseServings);
  const crewSize = num(v.crewSize);
  if (!slug || title === undefined || !baseServings || baseServings <= 0 || !crewSize || crewSize <= 0) return null;
  if (!Array.isArray(v.ingredients)) return null;
  const recipe: ShoppingSessionRecipe = {
    slug,
    title,
    baseServings,
    crewSize,
    ingredients: v.ingredients.map(restoreIngredient).filter((i): i is RawRecipeIngredient => i !== null),
    addedAt: str(v.addedAt) ?? new Date().toISOString(),
  };
  const recipePath = str(v.recipePath);
  if (recipePath !== undefined) recipe.recipePath = recipePath;
  return recipe;
}

function restoreContribution(v: unknown): ShoppingItemContribution | null {
  if (!isObj(v)) return null;
  const recipeSlug = str(v.recipeSlug);
  const value = num(v.value);
  if (!recipeSlug || value === undefined) return null;
  const c: ShoppingItemContribution = {
    recipeSlug,
    recipeTitle: str(v.recipeTitle) ?? "",
    value,
    unit: str(v.unit) ?? "",
    rawQuantity: str(v.rawQuantity) ?? "",
  };
  const min = num(v.min);
  if (min !== undefined) c.min = min;
  return c;
}

function restoreItem(v: unknown): ShoppingListItem | null {
  if (!isObj(v)) return null;
  const id = str(v.id);
  const canonicalKey = str(v.canonicalKey);
  const displayName = str(v.displayName);
  if (!id || !canonicalKey || !displayName) return null;
  const notes = str(v.notes);
  const department = DEPARTMENTS.includes(v.department as Department)
    ? (v.department as Department)
    : classifyDepartment(displayName, notes ?? "");
  const item: ShoppingListItem = {
    id,
    canonicalKey,
    displayName,
    department,
    quantityLabel: str(v.quantityLabel) ?? "",
    contributions: Array.isArray(v.contributions)
      ? v.contributions.map(restoreContribution).filter((c): c is ShoppingItemContribution => c !== null)
      : [],
    isManual: v.isManual === true,
    checked: v.checked === true,
    inPantry: v.inPantry === true,
    addedAt: str(v.addedAt) ?? new Date().toISOString(),
  };
  if (notes !== undefined) item.notes = notes;
  if (STOCK_LEVELS.includes(v.pantryStockLevel as StockLevel)) item.pantryStockLevel = v.pantryStockLevel as StockLevel;
  if (v.pantrySource === "personal" || v.pantrySource === "hall") item.pantrySource = v.pantrySource;
  return item;
}

/** Stable wire format for a session (localStorage today, account sync later). */
export function serializeShoppingSession(session: ShoppingSession): string {
  return JSON.stringify(session);
}

/**
 * Rebuild a trustworthy session from persisted data (a JSON string or an
 * already-parsed object). Returns null when the payload isn't a current-schema
 * session at all; otherwise drops only the malformed parts.
 */
export function restoreShoppingSession(input: unknown): ShoppingSession | null {
  const v = parseInput(input);
  if (!isObj(v) || v.schemaVersion !== SHOPPING_SCHEMA_VERSION) return null;
  const id = str(v.id);
  if (!id || !Array.isArray(v.recipes) || !isObj(v.list) || !Array.isArray(v.list.items)) return null;

  const now = new Date().toISOString();
  const session: ShoppingSession = {
    id,
    schemaVersion: SHOPPING_SCHEMA_VERSION,
    mode: MODES.includes(v.mode as ShoppingMode) ? (v.mode as ShoppingMode) : "planning",
    recipes: v.recipes.map(restoreRecipe).filter((r): r is ShoppingSessionRecipe => r !== null),
    list: {
      items: v.list.items.map(restoreItem).filter((i): i is ShoppingListItem => i !== null),
      generatedAt: str(v.list.generatedAt) ?? now,
    },
    createdAt: str(v.createdAt) ?? now,
    updatedAt: str(v.updatedAt) ?? now,
  };
  const completedAt = str(v.completedAt);
  if (completedAt !== undefined) session.completedAt = completedAt;

  return refreshDerivedQuantities(session);
}

export function restoreShoppingHistory(input: unknown): ShoppingHistory | null {
  const v = parseInput(input);
  if (!isObj(v) || v.schemaVersion !== SHOPPING_SCHEMA_VERSION || !Array.isArray(v.entries)) return null;
  const entries: ShoppingHistoryEntry[] = [];
  for (const e of v.entries) {
    if (!isObj(e)) continue;
    const session = restoreShoppingSession(e.session);
    const id = str(e.id);
    if (!session || !id) continue;
    entries.push({
      id,
      sessionId: str(e.sessionId) ?? session.id,
      completedAt: str(e.completedAt) ?? session.completedAt ?? session.updatedAt,
      recipeTitles: Array.isArray(e.recipeTitles)
        ? e.recipeTitles.filter((t): t is string => typeof t === "string")
        : session.recipes.map((r) => r.title),
      itemCount: num(e.itemCount) ?? session.list.items.length,
      checkedCount: num(e.checkedCount) ?? session.list.items.filter((i) => i.checked).length,
      session,
    });
  }
  return { schemaVersion: SHOPPING_SCHEMA_VERSION, entries };
}

export function restoreUndoStack(input: unknown): ShoppingSession[] {
  const v = parseInput(input);
  if (!Array.isArray(v)) return [];
  return v.map((s) => restoreShoppingSession(s)).filter((s): s is ShoppingSession => s !== null);
}

/** Validate a stored pantry and migrate keys written under older canonicalization rules. */
export function restorePantryProfile(input: unknown): PantryProfile | null {
  const v = parseInput(input);
  if (!isObj(v) || v.schemaVersion !== PANTRY_SCHEMA_VERSION || !isObj(v.items)) return null;
  const items: Record<string, StockLevel> = {};
  for (const [key, level] of Object.entries(v.items)) {
    if (key.trim() && STOCK_LEVELS.includes(level as StockLevel)) items[key] = level as StockLevel;
  }
  return migratePantryProfileKeys({
    schemaVersion: PANTRY_SCHEMA_VERSION,
    items,
    updatedAt: str(v.updatedAt) ?? new Date().toISOString(),
  });
}
