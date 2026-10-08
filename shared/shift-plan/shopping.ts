/**
 * One consolidated shopping list for a planned shift.
 *
 * Thin orchestration over the canonical Smart Shopping engine
 * (shared/shopping): every quantity, merge, unit conversion, optional
 * exclusion and pantry decision comes from there. This module only decides
 * WHICH recipes feed the list (planned slots at their own crew size) and
 * applies list operations with undo.
 */
import {
  addManualItem,
  addRecipeToSession,
  applyPantryContext,
  clearCheckedItems,
  removeItem,
  removeRecipeFromSession,
  setRecipeCrewSize,
  toggleItemChecked,
  type PantryContext,
  type ShoppingList,
  type ShoppingRecipeInput,
  type ShoppingSession,
} from "../shopping/index.js";
import type { PlannedMealSlot } from "./types.js";

export const SHIFT_LIST_UNDO_DEPTH = 10;

/** One planned meal feeding the list. */
export interface ShiftShoppingTarget {
  slotKey: string;
  recipeSlug: string;
  crewSize: number;
}

/** Recipes from every slot that has one and isn't skipped or BYO, at that slot's own crew size. */
export function shiftShoppingTargets(slots: readonly PlannedMealSlot[]): ShiftShoppingTarget[] {
  return slots
    .filter((s) => s.recipe && !s.skipped && !s.byo)
    .map((s) => ({ slotKey: s.key, recipeSlug: s.recipe!.slug, crewSize: s.crewSize }));
}

/**
 * Session recipe id for a slot's recipe. Per slot (the same recipe planned
 * twice counts twice), and it changes when the slot's recipe changes.
 */
export function shiftShoppingRecipeId(target: Pick<ShiftShoppingTarget, "slotKey" | "recipeSlug">): string {
  return `${target.slotKey}#${target.recipeSlug}`;
}

export interface ReconcileResult {
  session: ShoppingSession;
  /** True when the recipes feeding the list changed. */
  changed: boolean;
  /** Planned recipes with no shopping data. */
  unavailable: string[];
}

/**
 * Bring a session in line with the current plan. Checked state and manual
 * items are kept; items the user cleared or removed stay off the list unless
 * a meal that just changed needs them.
 */
export function reconcileShiftShoppingSession(
  session: ShoppingSession,
  targets: readonly ShiftShoppingTarget[],
  resolveRecipe: (slug: string) => ShoppingRecipeInput | null,
  pantry?: PantryContext,
): ReconcileResult {
  const wanted = new Map(targets.map((t) => [shiftShoppingRecipeId(t), t] as const));
  const listedKeys = new Set(session.list.items.filter((i) => !i.isManual).map((i) => i.canonicalKey));
  const touched = new Set<string>();
  const unavailable: string[] = [];
  let next = session;
  let changed = false;

  for (const recipe of session.recipes) {
    if (wanted.has(recipe.slug)) continue;
    next = removeRecipeFromSession(next, recipe.slug, pantry);
    changed = true;
  }

  for (const [id, target] of wanted) {
    const existing = next.recipes.find((r) => r.slug === id);
    if (existing) {
      if (existing.crewSize === target.crewSize) continue;
      next = setRecipeCrewSize(next, id, target.crewSize, pantry);
    } else {
      const input = resolveRecipe(target.recipeSlug);
      if (!input) {
        unavailable.push(target.recipeSlug);
        continue;
      }
      next = addRecipeToSession(next, { ...input, slug: id }, target.crewSize, pantry);
    }
    touched.add(id);
    changed = true;
  }

  if (!changed) return { session, changed: false, unavailable };

  const items = next.list.items.filter(
    (i) => i.isManual || listedKeys.has(i.canonicalKey) || i.contributions.some((c) => touched.has(c.recipeSlug)),
  );
  return { session: { ...next, list: { ...next.list, items } }, changed: true, unavailable };
}

export type ShiftListOp =
  | { type: "check"; itemId: string; checked: boolean }
  | { type: "add_manual"; name: string; quantity?: string }
  | { type: "remove"; itemId: string }
  | { type: "clear_checked" }
  | { type: "undo" };

export interface ShiftListState {
  session: ShoppingSession;
  /** Prior lists, newest first. Cleared whenever the plan changes the recipes. */
  undo: ShoppingList[];
}

export interface ShiftListOpResult extends ShiftListState {
  changed: boolean;
}

function withUndo(state: ShiftListState, next: ShoppingSession): ShiftListOpResult {
  if (next === state.session) return { ...state, changed: false };
  return {
    session: next,
    undo: [state.session.list, ...state.undo].slice(0, SHIFT_LIST_UNDO_DEPTH),
    changed: true,
  };
}

/** Apply one user action. Check is idempotent (sets a value) so retries and two devices agree. */
export function applyShiftListOp(state: ShiftListState, op: ShiftListOp, pantry?: PantryContext): ShiftListOpResult {
  const { session } = state;
  switch (op.type) {
    case "check": {
      const item = session.list.items.find((i) => i.id === op.itemId);
      if (!item || item.checked === op.checked) return { ...state, changed: false };
      return withUndo(state, toggleItemChecked(session, op.itemId));
    }
    case "add_manual": {
      const next = addManualItem(session, { name: op.name, quantityLabel: op.quantity }, pantry);
      return withUndo(state, next);
    }
    case "remove": {
      if (!session.list.items.some((i) => i.id === op.itemId)) return { ...state, changed: false };
      return withUndo(state, removeItem(session, op.itemId));
    }
    case "clear_checked": {
      if (!session.list.items.some((i) => i.checked)) return { ...state, changed: false };
      return withUndo(state, clearCheckedItems(session));
    }
    case "undo": {
      const [previous, ...rest] = state.undo;
      if (!previous) return { ...state, changed: false };
      const list: ShoppingList = { ...previous };
      if (session.list.excludedOptional) list.excludedOptional = session.list.excludedOptional;
      else delete list.excludedOptional;
      const restored = { ...session, list, updatedAt: new Date().toISOString() };
      return { session: pantry ? applyPantryContext(restored, pantry) : restored, undo: rest, changed: true };
    }
  }
}
