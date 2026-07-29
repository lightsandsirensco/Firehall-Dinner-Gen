import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addRecipeToSession,
  addManualItem as addManualItemService,
  applyPantryContext,
  archiveSessionToHistory,
  addHistoryEntry,
  clearCheckedItems as clearCheckedItemsService,
  cycleStockLevel,
  groupByDepartment,
  popUndoSnapshot,
  pushUndoSnapshot,
  removeItem as removeItemService,
  removeRecipeFromSession,
  removeStockLevel,
  setRecipeCrewSize as setRecipeCrewSizeService,
  setStockLevel,
  setSessionMode,
  splitPantryItems,
  startNewSessionFromHistory,
  toggleItemChecked as toggleItemCheckedService,
  type AddManualItemInput,
  type PantryContext,
  type ShoppingHistoryEntry,
  type ShoppingRecipeInput,
  type ShoppingSession,
  type StockLevel,
} from "@shared/shopping";
import {
  SHOPPING_SESSION_CHANGED_EVENT,
  getPantryProfile,
  getShoppingHistory,
  getShoppingSession,
  getUndoStack,
  resetPantryProfile,
  saveShoppingHistory,
  saveShoppingSession,
  savePantryProfile,
  saveUndoStack,
  startNewShoppingSession,
} from "@/lib/shopping/shopping-store";
import {
  HALL_PANTRY_CHANGED_EVENT,
  getHallPantry,
  resetHallPantry,
  saveHallPantry,
} from "@/lib/shopping/hall-pantry-store";

function currentPantryContext(): PantryContext {
  return { personal: getPantryProfile(), hall: getHallPantry() };
}

/** Single source of truth for the "My Shopping List" experience across the app. */
export function useShoppingSession() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(SHOPPING_SESSION_CHANGED_EVENT, bump);
    window.addEventListener(HALL_PANTRY_CHANGED_EVENT, bump);
    return () => {
      window.removeEventListener(SHOPPING_SESSION_CHANGED_EVENT, bump);
      window.removeEventListener(HALL_PANTRY_CHANGED_EVENT, bump);
    };
  }, []);

  const session = useMemo(() => getShoppingSession(), [version]);
  const history = useMemo(() => getShoppingHistory(), [version]);
  const pantryProfile = useMemo(() => getPantryProfile(), [version]);
  const hallPantry = useMemo(() => getHallPantry(), [version]);
  const { active: activeItems, skipped: pantrySkippedItems } = useMemo(
    () => splitPantryItems(session.list.items),
    [session],
  );
  const groupedList = useMemo(() => groupByDepartment(activeItems), [activeItems]);
  const canUndo = useMemo(() => getUndoStack().length > 0, [version]);

  const commit = useCallback((next: ShoppingSession, { recordUndo = true }: { recordUndo?: boolean } = {}) => {
    if (recordUndo) {
      saveUndoStack(pushUndoSnapshot(getUndoStack(), getShoppingSession()));
    }
    saveShoppingSession(next);
  }, []);

  const addRecipe = useCallback(
    (recipe: ShoppingRecipeInput, crewSize?: number) => {
      const current = getShoppingSession();
      commit(addRecipeToSession(current, recipe, crewSize, currentPantryContext()));
    },
    [commit],
  );

  const removeRecipe = useCallback(
    (slug: string) => {
      const current = getShoppingSession();
      commit(removeRecipeFromSession(current, slug, currentPantryContext()));
    },
    [commit],
  );

  const setRecipeCrewSize = useCallback(
    (slug: string, crewSize: number) => {
      const current = getShoppingSession();
      commit(setRecipeCrewSizeService(current, slug, crewSize, currentPantryContext()));
    },
    [commit],
  );

  const addManualItem = useCallback(
    (input: AddManualItemInput) => {
      const current = getShoppingSession();
      commit(addManualItemService(current, input, currentPantryContext()));
    },
    [commit],
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const current = getShoppingSession();
      commit(removeItemService(current, itemId));
    },
    [commit],
  );

  const toggleItemChecked = useCallback(
    (itemId: string) => {
      const current = getShoppingSession();
      commit(toggleItemCheckedService(current, itemId));
    },
    [commit],
  );

  const clearCheckedItems = useCallback(() => {
    const current = getShoppingSession();
    commit(clearCheckedItemsService(current));
  }, [commit]);

  const undo = useCallback(() => {
    const { previous, rest } = popUndoSnapshot(getUndoStack());
    if (!previous) return false;
    saveUndoStack(rest);
    saveShoppingSession(previous);
    return true;
  }, []);

  const startNewSession = useCallback(() => {
    startNewShoppingSession();
  }, []);

  const completeSession = useCallback(() => {
    const current = getShoppingSession();
    const { entry, session: completed } = archiveSessionToHistory(current);
    saveShoppingHistory(addHistoryEntry(getShoppingHistory(), entry));
    saveShoppingSession(completed);
    return entry;
  }, []);

  const setMode = useCallback(
    (mode: ShoppingSession["mode"]) => {
      commit(setSessionMode(getShoppingSession(), mode));
    },
    [commit],
  );

  const reuseHistoryEntry = useCallback((entry: ShoppingHistoryEntry) => {
    const fresh = startNewSessionFromHistory(entry);
    saveUndoStack([]);
    saveShoppingSession(fresh);
  }, []);

  /** Quick tap on a shopping-list item — cycles *Personal* pantry only (never -> always -> usually -> never). */
  const cyclePantryStockLevel = useCallback((canonicalKey: string) => {
    const next = cycleStockLevel(getPantryProfile(), canonicalKey);
    savePantryProfile(next);
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: next, hall: getHallPantry() }));
  }, []);

  const setPersonalStockLevel = useCallback((canonicalKey: string, level: StockLevel) => {
    const next = setStockLevel(getPantryProfile(), canonicalKey, level);
    savePantryProfile(next);
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: next, hall: getHallPantry() }));
  }, []);

  const setHallStockLevel = useCallback((canonicalKey: string, level: StockLevel) => {
    const next = setStockLevel(getHallPantry(), canonicalKey, level);
    saveHallPantry(next);
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: getPantryProfile(), hall: next }));
  }, []);

  const clearPersonalStockLevel = useCallback((canonicalKey: string) => {
    const next = removeStockLevel(getPantryProfile(), canonicalKey);
    savePantryProfile(next);
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: next, hall: getHallPantry() }));
  }, []);

  const clearHallStockLevel = useCallback((canonicalKey: string) => {
    const next = removeStockLevel(getHallPantry(), canonicalKey);
    saveHallPantry(next);
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: getPantryProfile(), hall: next }));
  }, []);

  const resetPersonalPantry = useCallback(() => {
    const next = resetPantryProfile();
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: next, hall: getHallPantry() }));
  }, []);

  const resetHallPantryProfile = useCallback(() => {
    const next = resetHallPantry();
    saveShoppingSession(applyPantryContext(getShoppingSession(), { personal: getPantryProfile(), hall: next }));
  }, []);

  return {
    session,
    activeItems,
    pantrySkippedItems,
    groupedList,
    history,
    pantryProfile,
    hallPantry,
    canUndo,
    addRecipe,
    removeRecipe,
    setRecipeCrewSize,
    addManualItem,
    removeItem,
    toggleItemChecked,
    clearCheckedItems,
    undo,
    startNewSession,
    completeSession,
    setMode,
    reuseHistoryEntry,
    cyclePantryStockLevel,
    setPersonalStockLevel,
    setHallStockLevel,
    clearPersonalStockLevel,
    clearHallStockLevel,
    resetPersonalPantry,
    resetHallPantry: resetHallPantryProfile,
  } as const;
}

export type UseShoppingSessionResult = ReturnType<typeof useShoppingSession>;
