/**
 * Shift Planner v2 — a plan for one real scheduled shift.
 *
 * Meal slots are NOT stored: they are generated from the shift by
 * shared/schedule/meal-slots.ts. Only per-slot user decisions are persisted,
 * keyed by the stable slot key. A slot with no stored state is an empty,
 * unlocked default slot.
 */
import type { MealSlot } from "../schedule/meal-slots.js";
import type { ShiftInstance } from "../schedule/types.js";
import type { ShoppingList } from "../shopping/types.js";

export type ShiftPlanSelectionSource = "auto" | "manual";

/** The only persisted per-slot data. */
export interface ShiftPlanSlotState {
  slotKey: string;
  recipeSlug: string | null;
  selectionSource: ShiftPlanSelectionSource | null;
  /** Auto-fill never replaces a locked slot. Manual picks lock automatically. */
  locked: boolean;
  skipped: boolean;
  byo: boolean;
  /** One-meal crew size; null = use the shift's crew size. */
  crewSizeOverride: number | null;
}

export interface PlannedRecipe {
  slug: string;
  title: string;
  imageUrl: string | null;
  totalMinutes: number | null;
  /** Public recipe detail route. */
  path: string;
}

/** A generated meal slot with the user's plan state applied. `crewSize` is the effective size. */
export interface PlannedMealSlot extends MealSlot {
  shiftCrewSize: number;
  crewSizeOverride: number | null;
  locked: boolean;
  selectionSource: ShiftPlanSelectionSource | null;
  recipe: PlannedRecipe | null;
}

export interface ShiftPlanView {
  hasSchedule: boolean;
  timezone: string | null;
  /** Current shift if one is under way, otherwise the next scheduled one. */
  shift: ShiftInstance | null;
  slots: PlannedMealSlot[];
  /** True once any decision has been saved for this shift. */
  started: boolean;
  complete: boolean;
}

export type ShiftPlanFillMode = "fill" | "swap";

export interface ShiftPlanFillResult {
  slotKey: string;
  ok: boolean;
  recipeSlug?: string;
  previousSlug?: string | null;
  error?: string;
}

export interface ShiftPlanFillResponse {
  plan: ShiftPlanView;
  results: ShiftPlanFillResult[];
  /** True when this request created the plan (first saved decision for the shift). */
  created: boolean;
}

export interface ShiftPlanSlotResponse {
  plan: ShiftPlanView;
  created: boolean;
}

/** A planned meal feeding the shift's shopping list. */
export interface ShiftListMeal {
  slotKey: string;
  label: string;
  dayIndex: number;
  recipeTitle: string;
  crewSize: number;
}

/** The consolidated shopping list for the shift being planned. */
export interface ShiftShoppingListView {
  shiftKey: string;
  list: ShoppingList;
  meals: ShiftListMeal[];
  canUndo: boolean;
  /** Planned recipes that couldn't be added (no shopping data). */
  unavailable: string[];
  updatedAt: string;
}

export interface ShiftShoppingListResponse {
  /** Null until the list has been built for the current shift. */
  list: ShiftShoppingListView | null;
  /** True when this request built the list for the first time. */
  created?: boolean;
}
