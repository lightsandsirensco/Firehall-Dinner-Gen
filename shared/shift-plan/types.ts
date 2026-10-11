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
import type { ShiftPlanStatus } from "./plan-ahead.js";

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
  /** Current shift if one is under way, otherwise the next scheduled one — or the requested Plan Ahead shift. */
  shift: ShiftInstance | null;
  slots: PlannedMealSlot[];
  /** True once any decision has been saved for this shift. */
  started: boolean;
  complete: boolean;
  /** True when `shift` is beyond the free current/next shift (opened with Plan Ahead). */
  planAhead: boolean;
  /** The earlier plan Run It Back would copy into this shift, if any (shown to every user; running it is Pro). */
  runItBack: RunItBackPreview | null;
}

/** same_type = same length and start time; same_length = same length, different start. */
export type RunItBackMatch = "same_type" | "same_length" | "different_length";

export interface RunItBackPreview {
  sourceShiftKey: string;
  sourceStartLocal: string;
  sourceScheduledMinutes: number;
  match: RunItBackMatch;
  /** Meals decided in the source plan (picked, skipped or BYO). */
  decidedCount: number;
}

/** A source meal that was NOT copied. */
export interface RunItBackFlag {
  slotKey: string;
  label: string;
  recipeSlug: string;
  recipeTitle: string | null;
  reason: string;
  /** restriction = fails a current hard restriction; unavailable = no longer in the catalog. */
  kind: "restriction" | "unavailable";
}

export interface RunItBackSummary {
  sourceShiftKey: string;
  sourceStartLocal: string;
  match: RunItBackMatch;
  mode: "copy" | "refresh";
  copiedMeals: number;
  copiedSkipped: number;
  copiedByo: number;
  crewOverridesKept: number;
  crewOverridesReset: number;
  flagged: RunItBackFlag[];
  newSlotKeys: string[];
  droppedMeals: number;
  /** Refresh only: unlocked meals re-picked / that found nothing. */
  refreshed: number;
  refreshFailed: number;
}

export interface RunItBackResponse {
  plan: ShiftPlanView;
  summary: RunItBackSummary;
  created: boolean;
  /** True when this save completed the user's first plan and started their Pro trial. */
  proTrialStarted?: boolean;
}

/** One row of the upcoming-shifts view: a real calculated shift and its plan state. */
export interface UpcomingShift {
  shift: ShiftInstance;
  status: ShiftPlanStatus;
  /** Meals decided (picked, skipped or BYO) out of mealCount. */
  plannedCount: number;
  mealCount: number;
  /** The free current/next shift. */
  isNext: boolean;
  /** This user may open and plan it. False = beyond the free boundary (Pro lock). */
  actionable: boolean;
}

export interface UpcomingShiftsView {
  hasSchedule: boolean;
  timezone: string | null;
  canPlanAhead: boolean;
  windowDays: number;
  shifts: UpcomingShift[];
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
  /** True when this save completed the user's first plan and started their Pro trial. */
  proTrialStarted?: boolean;
}

export interface ShiftPlanSlotResponse {
  plan: ShiftPlanView;
  created: boolean;
  /** True when this save completed the user's first plan and started their Pro trial. */
  proTrialStarted?: boolean;
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
