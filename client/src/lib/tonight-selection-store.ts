import type { ClientRecipeResponse } from "@shared/schema";

/**
 * Tonight's meal — the one dinner the user deliberately chose for this shift.
 *
 * Only intentional actions write here (a generator result, a wheel landing,
 * "Cook it again"). Hall history is a log of everything ever cooked/spun and
 * must never be read back as "tonight's meal".
 */

const STORAGE_KEY = "firehall_tonight_selection_v1";
const SCHEMA_VERSION = 1;
/** A pick made at 11pm is still "tonight" at 1am; it expires at 4am local. */
const SHIFT_DAY_ROLLOVER_HOUR = 4;

export const TONIGHT_SELECTION_CHANGED_EVENT = "tonight-selection-changed";

export type TonightSelectionSource = "generator" | "wheel" | "cook_again";

export type TonightSelection = {
  version: typeof SCHEMA_VERSION;
  shiftDate: string;
  selectedAt: string;
  source: TonightSelectionSource;
  title: string;
  recipeSlug?: string;
  /** Catalog recipe page — cooking happens there via `?cook=1`. */
  recipePath?: string;
  imageUrl?: string;
  description?: string;
  crewSize?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  /** Generator result with no catalog page — kept so Tonight can open Cook Mode. */
  generatedRecipe?: ClientRecipeResponse;
  cookingStartedAt?: string;
};

export type TonightSelectionInput = Omit<
  TonightSelection,
  "version" | "shiftDate" | "selectedAt" | "cookingStartedAt"
>;

export function tonightShiftDate(now = new Date()): string {
  const shifted = new Date(now.getTime() - SHIFT_DAY_ROLLOVER_HOUR * 60 * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dispatchChanged(): void {
  window.dispatchEvent(new Event(TONIGHT_SELECTION_CHANGED_EVENT));
}

function write(selection: TonightSelection | null): void {
  try {
    if (selection) localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* quota / private mode */
  }
  dispatchChanged();
}

export function getTonightSelection(now = new Date()): TonightSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TonightSelection;
    if (parsed?.version !== SCHEMA_VERSION) return null;
    if (typeof parsed.title !== "string" || !parsed.title.trim()) return null;
    if (parsed.shiftDate !== tonightShiftDate(now)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setTonightSelection(input: TonightSelectionInput, now = new Date()): TonightSelection {
  const selection: TonightSelection = {
    ...input,
    title: input.title.trim(),
    recipeSlug: input.recipeSlug?.trim().toLowerCase() || undefined,
    version: SCHEMA_VERSION,
    shiftDate: tonightShiftDate(now),
    selectedAt: now.toISOString(),
  };
  write(selection);
  return selection;
}

export function markTonightCookingStarted(now = new Date()): void {
  const current = getTonightSelection(now);
  if (!current || current.cookingStartedAt) return;
  write({ ...current, cookingStartedAt: now.toISOString() });
}

export function stopTonightCooking(): void {
  const current = getTonightSelection();
  if (!current) return;
  const { cookingStartedAt: _ignored, ...rest } = current;
  write(rest);
}

export function clearTonightSelection(): void {
  write(null);
}
