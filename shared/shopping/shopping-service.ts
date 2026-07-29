/**
 * Smart Shopping — ShoppingService.
 *
 * Pure, storage-agnostic domain logic for turning one or more recipes into a
 * single, deduplicated, department-grouped shopping list. Every function
 * takes a session (or list) and returns a *new* one — no hidden state, no
 * network calls, no retailer awareness. This is the "engine" that any UI
 * (web today, a native app or a server sync job later) can drive.
 */

import { scaleGoldenIngredients } from "../golden-100/recipe-quality/crew-scale";
import type { GoldenRecipePageIngredient } from "../golden-100/recipe-page-schema";
import { classifyDepartment, DEPARTMENT_ORDER } from "./departments";
import { generateId } from "./id";
import {
  canonicalizeIngredientName,
  mergeContributions,
  normalizeIngredient,
} from "./ingredient-normalizer";
import { getStockLevel } from "./pantry-profile";
import {
  SHOPPING_SCHEMA_VERSION,
  stockLevelHidesItem,
  type Department,
  type GroupedShoppingList,
  type PantryContext,
  type ShoppingHistory,
  type ShoppingHistoryEntry,
  type ShoppingList,
  type ShoppingListItem,
  type ShoppingMode,
  type ShoppingRecipeInput,
  type ShoppingSession,
  type ShoppingSessionRecipe,
  type ShoppingItemContribution,
  type StockLevel,
} from "./types";

const MAX_UNDO_DEPTH = 20;
const MAX_HISTORY_ENTRIES = 25;

export function createShoppingSession(): ShoppingSession {
  const now = new Date().toISOString();
  return {
    id: generateId("session"),
    schemaVersion: SHOPPING_SCHEMA_VERSION,
    mode: "planning",
    recipes: [],
    list: { items: [], generatedAt: now },
    createdAt: now,
    updatedAt: now,
  };
}

function sortItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return [...items].sort((a, b) => {
    const da = DEPARTMENT_ORDER.indexOf(a.department);
    const db = DEPARTMENT_ORDER.indexOf(b.department);
    if (da !== db) return da - db;
    return a.displayName.localeCompare(b.displayName);
  });
}

interface AggregatedIngredient {
  displayName: string;
  department: Department;
  notes?: string;
  contributions: ShoppingItemContribution[];
}

/**
 * Personal Pantry wins when the firefighter has an explicit opinion; otherwise
 * fall back to the Hall Pantry (the hall already stocks it, so no one needs
 * to buy it); untracked in both means "never seen it, must buy."
 */
export function resolvePantryStatus(
  pantry: PantryContext | undefined,
  canonicalKey: string,
): { level: StockLevel; source?: "personal" | "hall" } {
  const personalLevel = pantry?.personal ? getStockLevel(pantry.personal, canonicalKey) : undefined;
  if (personalLevel !== undefined && canonicalKey in (pantry?.personal?.items ?? {})) {
    return { level: personalLevel, source: "personal" };
  }
  const hallLevel = pantry?.hall ? getStockLevel(pantry.hall, canonicalKey) : undefined;
  if (hallLevel !== undefined && canonicalKey in (pantry?.hall?.items ?? {})) {
    return { level: hallLevel, source: "hall" };
  }
  return { level: "never" };
}

/** Recompute the derived (non-manual) part of the list from current recipes + crew sizes. */
function rebuildList(
  recipes: ShoppingSessionRecipe[],
  previousItems: ShoppingListItem[],
  pantry?: PantryContext,
): ShoppingList {
  const manualItems = previousItems.filter((i) => i.isManual).map((item) => applyPantryToItem(item, pantry));
  const previousDerivedByKey = new Map(
    previousItems.filter((i) => !i.isManual).map((i) => [i.canonicalKey, i] as const),
  );

  const aggregate = new Map<string, AggregatedIngredient>();

  for (const recipe of recipes) {
    const eligible = recipe.ingredients.filter((ing) => !ing.optional);
    const scaled = scaleGoldenIngredients(
      eligible as GoldenRecipePageIngredient[],
      recipe.baseServings,
      recipe.crewSize,
    );

    for (const ing of scaled) {
      const normalized = normalizeIngredient(ing);
      const key = normalized.canonicalKey;
      if (!key) continue;

      const contribution: ShoppingItemContribution = {
        recipeSlug: recipe.slug,
        recipeTitle: recipe.title,
        value: normalized.parsed?.value ?? 0,
        unit: normalized.parsed?.unit ?? "",
        rawQuantity: normalized.rawQuantity,
      };

      const existing = aggregate.get(key);
      if (existing) {
        existing.contributions.push(contribution);
      } else {
        aggregate.set(key, {
          displayName: normalized.displayName,
          department: normalized.department,
          notes: normalized.notes,
          contributions: [contribution],
        });
      }
    }
  }

  const derivedItems: ShoppingListItem[] = [...aggregate.entries()].map(([key, agg]) => {
    const prior = previousDerivedByKey.get(key);
    const { level, source } = resolvePantryStatus(pantry, key);
    return {
      id: prior?.id ?? generateId("item"),
      canonicalKey: key,
      displayName: agg.displayName,
      department: agg.department,
      quantityLabel: mergeContributions(agg.contributions),
      contributions: agg.contributions,
      notes: agg.notes,
      isManual: false,
      checked: prior?.checked ?? false,
      inPantry: pantry ? stockLevelHidesItem(level) : (prior?.inPantry ?? false),
      pantryStockLevel: pantry ? (level === "never" ? undefined : level) : prior?.pantryStockLevel,
      pantrySource: pantry ? (level === "never" ? undefined : source) : prior?.pantrySource,
      addedAt: prior?.addedAt ?? new Date().toISOString(),
    };
  });

  return { items: sortItems([...derivedItems, ...manualItems]), generatedAt: new Date().toISOString() };
}

function applyPantryToItem(item: ShoppingListItem, pantry?: PantryContext): ShoppingListItem {
  if (!pantry) return item;
  const { level, source } = resolvePantryStatus(pantry, item.canonicalKey);
  return {
    ...item,
    inPantry: stockLevelHidesItem(level),
    pantryStockLevel: level === "never" ? undefined : level,
    pantrySource: level === "never" ? undefined : source,
  };
}

function finalize(
  session: ShoppingSession,
  recipes: ShoppingSessionRecipe[],
  previousItems: ShoppingListItem[],
  pantry?: PantryContext,
): ShoppingSession {
  return {
    ...session,
    recipes,
    list: rebuildList(recipes, previousItems, pantry),
    updatedAt: new Date().toISOString(),
  };
}

/** Add a recipe (or update it if already in this session) at a given crew size. */
export function addRecipeToSession(
  session: ShoppingSession,
  recipe: ShoppingRecipeInput,
  crewSize?: number,
  pantry?: PantryContext,
): ShoppingSession {
  const existingIndex = session.recipes.findIndex((r) => r.slug === recipe.slug);
  const sessionRecipe: ShoppingSessionRecipe = {
    slug: recipe.slug,
    title: recipe.title,
    recipePath: recipe.recipePath,
    baseServings: recipe.baseServings,
    crewSize: crewSize ?? (existingIndex >= 0 ? session.recipes[existingIndex].crewSize : recipe.baseServings),
    ingredients: recipe.ingredients,
    addedAt: existingIndex >= 0 ? session.recipes[existingIndex].addedAt : new Date().toISOString(),
  };

  const recipes =
    existingIndex >= 0
      ? session.recipes.map((r, i) => (i === existingIndex ? sessionRecipe : r))
      : [...session.recipes, sessionRecipe];

  return finalize(session, recipes, session.list.items, pantry);
}

export function removeRecipeFromSession(
  session: ShoppingSession,
  slug: string,
  pantry?: PantryContext,
): ShoppingSession {
  const recipes = session.recipes.filter((r) => r.slug !== slug);
  return finalize(session, recipes, session.list.items, pantry);
}

/** Changing crew size instantly recalculates every quantity this recipe contributes. */
export function setRecipeCrewSize(
  session: ShoppingSession,
  slug: string,
  crewSize: number,
  pantry?: PantryContext,
): ShoppingSession {
  const clamped = Math.max(1, Math.round(crewSize));
  const recipes = session.recipes.map((r) => (r.slug === slug ? { ...r, crewSize: clamped } : r));
  return finalize(session, recipes, session.list.items, pantry);
}

export interface AddManualItemInput {
  name: string;
  quantityLabel?: string;
  department?: Department;
  notes?: string;
}

export function addManualItem(
  session: ShoppingSession,
  input: AddManualItemInput,
  pantry?: PantryContext,
): ShoppingSession {
  const name = input.name.trim();
  if (!name) return session;

  const canonicalKey = canonicalizeIngredientName(name);
  const { level, source } = resolvePantryStatus(pantry, canonicalKey);

  const item: ShoppingListItem = {
    id: generateId("item"),
    canonicalKey,
    displayName: name,
    department: input.department ?? classifyDepartment(name, input.notes || ""),
    quantityLabel: input.quantityLabel?.trim() ?? "",
    contributions: [],
    notes: input.notes,
    isManual: true,
    checked: false,
    inPantry: stockLevelHidesItem(level),
    pantryStockLevel: level === "never" ? undefined : level,
    pantrySource: level === "never" ? undefined : source,
    addedAt: new Date().toISOString(),
  };

  return {
    ...session,
    list: {
      items: sortItems([...session.list.items, item]),
      generatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function removeItem(session: ShoppingSession, itemId: string): ShoppingSession {
  return {
    ...session,
    list: { ...session.list, items: session.list.items.filter((i) => i.id !== itemId) },
    updatedAt: new Date().toISOString(),
  };
}

export function toggleItemChecked(session: ShoppingSession, itemId: string): ShoppingSession {
  return {
    ...session,
    list: {
      ...session.list,
      items: session.list.items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)),
    },
    updatedAt: new Date().toISOString(),
  };
}

export function clearCheckedItems(session: ShoppingSession): ShoppingSession {
  return {
    ...session,
    list: { ...session.list, items: session.list.items.filter((i) => !i.checked) },
    updatedAt: new Date().toISOString(),
  };
}

export function setSessionMode(session: ShoppingSession, mode: ShoppingMode): ShoppingSession {
  return {
    ...session,
    mode,
    completedAt: mode === "completed" ? new Date().toISOString() : session.completedAt,
    updatedAt: new Date().toISOString(),
  };
}

/** Re-run pantry matching (e.g. after the user edits Personal or Hall Pantry). */
export function applyPantryContext(session: ShoppingSession, pantry: PantryContext): ShoppingSession {
  return finalize(session, session.recipes, session.list.items, pantry);
}

export function groupByDepartment(items: ShoppingListItem[]): GroupedShoppingList {
  const map = new Map<Department, ShoppingListItem[]>();
  for (const item of items) {
    if (!map.has(item.department)) map.set(item.department, []);
    map.get(item.department)!.push(item);
  }
  return DEPARTMENT_ORDER.filter((d) => map.has(d)).map((department) => ({
    department,
    items: map.get(department)!,
  }));
}

/**
 * Split a list into what still needs shopping vs. what Personal/Hall Pantry
 * already covers — pantry items should "automatically disappear" from the
 * active checklist, not just get dimmed inline.
 */
export function splitPantryItems(items: ShoppingListItem[]): {
  active: ShoppingListItem[];
  skipped: ShoppingListItem[];
} {
  return {
    active: items.filter((i) => !i.inPantry),
    skipped: items.filter((i) => i.inPantry),
  };
}

export function archiveSessionToHistory(session: ShoppingSession): {
  entry: ShoppingHistoryEntry;
  session: ShoppingSession;
} {
  const completed = setSessionMode(session, "completed");
  const entry: ShoppingHistoryEntry = {
    id: generateId("history"),
    sessionId: completed.id,
    completedAt: completed.completedAt ?? new Date().toISOString(),
    recipeTitles: completed.recipes.map((r) => r.title),
    itemCount: completed.list.items.length,
    checkedCount: completed.list.items.filter((i) => i.checked).length,
    session: completed,
  };
  return { entry, session: completed };
}

export function createEmptyHistory(): ShoppingHistory {
  return { schemaVersion: SHOPPING_SCHEMA_VERSION, entries: [] };
}

export function addHistoryEntry(
  history: ShoppingHistory,
  entry: ShoppingHistoryEntry,
  maxEntries = MAX_HISTORY_ENTRIES,
): ShoppingHistory {
  return { ...history, entries: [entry, ...history.entries].slice(0, maxEntries) };
}

/**
 * Rebuild a fresh session's recipe list from a past history entry, so the
 * crew can "shop this again" — the caller re-supplies current ingredient
 * data per recipe (recipes may have changed since), keeping the domain
 * layer decoupled from any specific data-fetching mechanism.
 */
export function startNewSessionFromHistory(entry: ShoppingHistoryEntry): ShoppingSession {
  const fresh = createShoppingSession();
  return entry.session.recipes.reduce(
    (session, recipe) =>
      addRecipeToSession(
        session,
        {
          slug: recipe.slug,
          title: recipe.title,
          recipePath: recipe.recipePath,
          baseServings: recipe.baseServings,
          ingredients: recipe.ingredients,
        },
        recipe.crewSize,
      ),
    fresh,
  );
}

/** Bounded undo stack primitives — caller (store/hook) pushes before each mutation. */
export function pushUndoSnapshot(stack: ShoppingSession[], session: ShoppingSession): ShoppingSession[] {
  return [session, ...stack].slice(0, MAX_UNDO_DEPTH);
}

export function popUndoSnapshot(stack: ShoppingSession[]): {
  previous: ShoppingSession | null;
  rest: ShoppingSession[];
} {
  if (stack.length === 0) return { previous: null, rest: stack };
  const [previous, ...rest] = stack;
  return { previous, rest };
}
