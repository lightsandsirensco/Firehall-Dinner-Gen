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
  formatShoppingQuantities,
  isNotPurchased,
  isOptionalIngredient,
  mergeContributionQuantities,
  normalizeIngredient,
  withPurchaseForm,
} from "./ingredient-normalizer";
import { getStockLevel } from "./pantry-profile";
import { purchaseSuggestion, type PurchaseSuggestion } from "./purchase";
import { canonicalizeQuantityForScaling } from "./quantity-parser";
import { pantryLookupKeys, splitCompoundKey } from "./staple-aliases";
import {
  SHOPPING_SCHEMA_VERSION,
  stockLevelHidesItem,
  type Department,
  type ExcludedOptionalIngredient,
  type GroupedShoppingList,
  type PantryContext,
  type PantryProfile,
  type RawRecipeIngredient,
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
import type { ShoppingUnitSystem } from "./units";

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
  contributions: ShoppingItemContribution[];
}

type PantryStatus = { level: StockLevel; source?: "personal" | "hall" };

function explicitLevel(profile: PantryProfile | undefined, keys: string[]): StockLevel | undefined {
  if (!profile) return undefined;
  for (const key of keys) {
    if (key in profile.items) return getStockLevel(profile, key);
  }
  return undefined;
}

function resolveSingleKey(pantry: PantryContext | undefined, canonicalKey: string): PantryStatus | null {
  const keys = pantryLookupKeys(canonicalKey);
  const personal = explicitLevel(pantry?.personal, keys);
  if (personal !== undefined) return { level: personal, source: "personal" };
  const hall = explicitLevel(pantry?.hall, keys);
  if (hall !== undefined) return { level: hall, source: "hall" };
  return null;
}

/**
 * Personal Pantry wins when the firefighter has an explicit opinion; otherwise
 * fall back to the Hall Pantry (the hall already stocks it, so no one needs
 * to buy it); untracked in both means "never seen it, must buy."
 *
 * Lookups try the exact key first, then its staple alias ("kosher salt" ->
 * "salt"). A compound line ("kosher salt and black pepper") is covered only
 * when every part is covered.
 */
export function resolvePantryStatus(
  pantry: PantryContext | undefined,
  canonicalKey: string,
): PantryStatus {
  const direct = resolveSingleKey(pantry, canonicalKey);
  if (direct) return direct;

  const parts = splitCompoundKey(canonicalKey);
  if (parts) {
    const statuses = parts.map((p) => resolveSingleKey(pantry, p));
    if (statuses.every((s) => s && stockLevelHidesItem(s.level))) {
      const weakest = statuses.find((s) => s!.level === "usually") ?? statuses[0]!;
      return { level: weakest.level, source: weakest.source };
    }
  }
  return { level: "never" };
}

interface AggregationResult {
  aggregate: Map<string, AggregatedIngredient>;
  excludedOptional: ExcludedOptionalIngredient[];
}

/** Put range/fraction/split-unit quantities into the form the crew scaler parses reliably. */
function prepareForScaling(ing: RawRecipeIngredient): RawRecipeIngredient {
  const { quantity, unit } = canonicalizeQuantityForScaling(ing.quantity, ing.unit);
  if (quantity === ing.quantity && unit === ing.unit) return ing;
  const next: RawRecipeIngredient = { ...ing, quantity };
  if (unit) next.unit = unit;
  else delete next.unit;
  return next;
}

/** Scale every recipe to its crew size and merge contributions by canonical key. */
function aggregateRecipes(recipes: ShoppingSessionRecipe[]): AggregationResult {
  const aggregate = new Map<string, AggregatedIngredient>();
  const excludedOptional: ExcludedOptionalIngredient[] = [];

  for (const recipe of recipes) {
    const eligible: RawRecipeIngredient[] = [];
    for (const ing of recipe.ingredients) {
      if (isNotPurchased(ing.name)) continue;
      if (isOptionalIngredient(ing)) {
        excludedOptional.push({
          recipeSlug: recipe.slug,
          recipeTitle: recipe.title,
          name: ing.name.trim(),
          canonicalKey: canonicalizeIngredientName(ing.name),
        });
      } else {
        eligible.push(prepareForScaling(ing));
      }
    }

    const scaled = recipe.prescaled
      ? eligible
      : scaleGoldenIngredients(eligible as GoldenRecipePageIngredient[], recipe.baseServings, recipe.crewSize);

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
      if (normalized.parsed?.min !== undefined) contribution.min = normalized.parsed.min;
      const prep = normalized.notes?.trim();
      if (prep) contribution.prep = prep;

      const existing = aggregate.get(key);
      if (existing) {
        existing.contributions.push(contribution);
      } else {
        aggregate.set(key, {
          displayName: normalized.displayName,
          department: normalized.department,
          contributions: [contribution],
        });
      }
    }
  }

  return { aggregate, excludedOptional };
}

/**
 * Prep notes for a merged line. One prep (or the same prep everywhere) reads
 * as-is; different preps are listed per recipe so "diced" for the chili and
 * "sliced" for the fajitas both survive the merge.
 */
export function mergePrepNotes(contributions: ShoppingItemContribution[]): string | undefined {
  const withPrep = contributions.filter((c) => c.prep);
  const distinct = [...new Set(withPrep.map((c) => c.prep!.toLowerCase()))];
  if (distinct.length === 0) return undefined;
  if (distinct.length === 1) return withPrep[0]!.prep;
  const recipes = new Set(withPrep.map((c) => c.recipeSlug));
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const c of withPrep) {
    const label = recipes.size > 1 && c.recipeTitle ? `${c.prep} (${c.recipeTitle})` : c.prep!;
    if (seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    parts.push(label);
  }
  return parts.join("; ");
}

/** quantityLabel + structured quantities, always in the units the recipes used. */
function deriveQuantityFields(contributions: ShoppingItemContribution[]): {
  quantityLabel: string;
  quantities: ShoppingListItem["quantities"];
} {
  const { quantities, textOnly } = mergeContributionQuantities(contributions);
  return { quantityLabel: formatShoppingQuantities(quantities, textOnly), quantities };
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

  const { aggregate, excludedOptional } = aggregateRecipes(recipes);

  const derivedItems: ShoppingListItem[] = [...aggregate.entries()].map(([key, agg]) => {
    const prior = previousDerivedByKey.get(key);
    const { level, source } = resolvePantryStatus(pantry, key);
    const notes = mergePrepNotes(agg.contributions);
    return {
      id: prior?.id ?? generateId("item"),
      canonicalKey: key,
      displayName: agg.displayName,
      department: prior?.departmentOverride ? prior.department : agg.department,
      ...(prior?.departmentOverride ? { departmentOverride: true } : {}),
      ...deriveQuantityFields(agg.contributions),
      contributions: agg.contributions,
      ...(notes ? { notes } : {}),
      isManual: false,
      checked: prior?.checked ?? false,
      inPantry: pantry ? stockLevelHidesItem(level) : (prior?.inPantry ?? false),
      pantryStockLevel: pantry ? (level === "never" ? undefined : level) : prior?.pantryStockLevel,
      pantrySource: pantry ? (level === "never" ? undefined : source) : prior?.pantrySource,
      addedAt: prior?.addedAt ?? new Date().toISOString(),
    };
  });

  const list: ShoppingList = {
    items: sortItems([...derivedItems, ...manualItems]),
    generatedAt: new Date().toISOString(),
  };
  if (excludedOptional.length > 0) list.excludedOptional = excludedOptional;
  return list;
}

/** The current key for an item saved under older merge rules. */
function currentKey(item: ShoppingListItem, aggregate: Map<string, AggregatedIngredient>): string {
  if (aggregate.has(item.canonicalKey)) return item.canonicalKey;
  for (const [key, agg] of aggregate) {
    if (agg.displayName === item.displayName) return key;
  }
  return withPurchaseForm(canonicalizeIngredientName(item.displayName), classifyDepartment(item.displayName, item.notes ?? ""));
}

/**
 * Bring the items already on a saved list up to the current engine: merge
 * keys, aisles, quantities and prep notes — without re-adding items the user
 * cleared, and keeping checked/pantry state and any section the user chose.
 * Lines that now merge collapse into one (checked only if all were checked).
 */
export function refreshDerivedQuantities(session: ShoppingSession): ShoppingSession {
  const { aggregate, excludedOptional } = aggregateRecipes(session.recipes);
  const items: ShoppingListItem[] = [];
  const byKey = new Map<string, number>();
  for (const item of session.list.items) {
    if (item.isManual) {
      items.push(item.departmentOverride ? item : { ...item, department: classifyDepartment(item.displayName, item.notes ?? "") });
      continue;
    }
    const key = currentKey(item, aggregate);
    const agg = aggregate.get(key);
    if (!agg) {
      items.push(item);
      continue;
    }
    const existing = byKey.get(key);
    if (existing !== undefined) {
      if (!item.checked) items[existing] = { ...items[existing]!, checked: false };
      continue;
    }
    byKey.set(key, items.length);
    const { notes: _oldNotes, ...rest } = item;
    const notes = mergePrepNotes(agg.contributions);
    items.push({
      ...rest,
      canonicalKey: key,
      department: item.departmentOverride ? item.department : agg.department,
      ...deriveQuantityFields(agg.contributions),
      contributions: agg.contributions,
      ...(notes ? { notes } : {}),
    });
  }
  const list: ShoppingList = { ...session.list, items: sortItems(items) };
  if (excludedOptional.length > 0) list.excludedOptional = excludedOptional;
  else delete list.excludedOptional;
  return { ...session, list };
}

/** The exact merged cooking amount, re-derived from contributions so older saved lists read the same way. */
export function formatShoppingItemCookAmount(item: ShoppingListItem, system?: ShoppingUnitSystem): string {
  if (item.isManual || item.contributions.length === 0) return item.quantityLabel;
  const { quantities, textOnly } = mergeContributionQuantities(item.contributions, system);
  return formatShoppingQuantities(quantities, textOnly);
}

/** Package sizes in purchase labels are US grocery sizes. */
const US_PACKAGE_UNIT = /\b(lb|oz|quart|gallon|pint)\b/;

/** What to pick up at the store, or null when that's just the cooking amount. */
export function shoppingItemPurchase(item: ShoppingListItem, system?: ShoppingUnitSystem): PurchaseSuggestion | null {
  if (item.isManual) return null;
  const suggestion = purchaseSuggestion({
    canonicalKey: item.canonicalKey,
    displayName: item.displayName,
    department: item.department,
    quantities: mergeContributionQuantities(item.contributions).quantities,
  });
  if (!suggestion || suggestion.label === formatShoppingItemCookAmount(item, system)) return null;
  if (system === "metric" && US_PACKAGE_UNIT.test(suggestion.label)) return null;
  return suggestion;
}

/**
 * Display a list item's quantity: the practical purchase amount first, with
 * the exact cooking total alongside ("about 3 lemons (need ⅜ cup)"). Manual
 * items keep exactly what the user typed.
 */
export function formatShoppingItemQuantity(item: ShoppingListItem, system?: ShoppingUnitSystem): string {
  const cook = formatShoppingItemCookAmount(item, system);
  const buy = shoppingItemPurchase(item, system);
  if (!buy) return cook;
  return cook ? `${buy.label} (need ${cook})` : buy.label;
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
    ...(recipe.prescaled ? { prescaled: true } : {}),
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
    ...(input.department ? { departmentOverride: true } : {}),
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
      ...session.list,
      items: sortItems([...session.list.items, item]),
      generatedAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
  };
}

/** File an item under a different aisle. The choice sticks through crew changes and plan updates. */
export function moveItemToDepartment(session: ShoppingSession, itemId: string, department: Department): ShoppingSession {
  const item = session.list.items.find((i) => i.id === itemId);
  if (!item || (item.department === department && item.departmentOverride)) return session;
  return {
    ...session,
    list: {
      ...session.list,
      items: sortItems(
        session.list.items.map((i) => (i.id === itemId ? { ...i, department, departmentOverride: true } : i)),
      ),
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

/**
 * Re-run pantry matching (e.g. after the user edits Personal or Hall Pantry).
 * Only pantry flags change — items the user cleared or removed stay gone.
 */
export function applyPantryContext(session: ShoppingSession, pantry: PantryContext): ShoppingSession {
  return {
    ...session,
    list: { ...session.list, items: session.list.items.map((item) => applyPantryToItem(item, pantry)) },
    updatedAt: new Date().toISOString(),
  };
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
  const carriedManual = entry.session.list.items
    .filter((i) => i.isManual)
    .map((i) => ({ ...i, id: generateId("item"), checked: false }));
  const fresh = createShoppingSession();
  fresh.list = { ...fresh.list, items: carriedManual };
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
