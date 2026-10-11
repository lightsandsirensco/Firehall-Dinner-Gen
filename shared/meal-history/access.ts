/**
 * Meal History Free/Premium access policy — pure, shared by server + client.
 *
 * Storage is identical for every signed-in user: every cooked event is kept
 * in user_meal_history forever (until the user deletes it or their account).
 * Tier only decides what is VISIBLE / EDITABLE / USED right now, computed at
 * read time from the current entitlement. Downgrading therefore never deletes
 * anything, and upgrading re-exposes older rows immediately.
 */
import { hasFeature, type BillingFeature } from "../billing/types.js";

export const FREE_HISTORY_WINDOW_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export type MealHistoryTier = "none" | "free" | "premium";

export interface MealHistoryAccess {
  tier: MealHistoryTier;
  /** Durable logging, import, and feedback on visible rows. */
  canLog: boolean;
  /** null = full history. */
  windowDays: number | null;
  /** Long-horizon ratings/make-again signals + crew-favorite recall. */
  fullHistory: boolean;
}

export function resolveMealHistoryAccess(features: Record<BillingFeature, boolean>): MealHistoryAccess {
  if (hasFeature(features, "meal_memory")) {
    return { tier: "premium", canLog: true, windowDays: null, fullHistory: true };
  }
  if (hasFeature(features, "meal_history")) {
    return { tier: "free", canLog: true, windowDays: FREE_HISTORY_WINDOW_DAYS, fullHistory: false };
  }
  return { tier: "none", canLog: false, windowDays: null, fullHistory: false };
}

/** Earliest visible cooked_at, or null when the whole history is visible. */
export function visibleSince(access: MealHistoryAccess, now: Date = new Date()): Date | null {
  if (access.windowDays == null) return null;
  return new Date(now.getTime() - access.windowDays * DAY_MS);
}

export function isCookedAtVisible(access: MealHistoryAccess, cookedAt: string | Date, now: Date = new Date()): boolean {
  if (!access.canLog) return false;
  const since = visibleSince(access, now);
  if (!since) return true;
  const ms = cookedAt instanceof Date ? cookedAt.getTime() : Date.parse(cookedAt);
  return Number.isFinite(ms) && ms >= since.getTime();
}

/** Free users may rate/annotate only meals inside their visible window; long-term edits are Premium. */
export function canEditFeedbackFor(
  access: MealHistoryAccess,
  cookedAt: string | Date,
  now: Date = new Date(),
): boolean {
  return isCookedAtVisible(access, cookedAt, now);
}

// ---------------------------------------------------------------------------
// Legacy device-local import planning
// ---------------------------------------------------------------------------

/**
 * Rows recorded live before client_entry_id existed have no key, so an
 * imported local entry for the same recipe within this window of a keyless
 * row is treated as that same cooked event.
 */
export const IMPORT_MATCH_WINDOW_MS = 15 * 60_000;
const IMPORT_EARLIEST_MS = Date.UTC(2020, 0, 1);
const IMPORT_FUTURE_SKEW_MS = DAY_MS;

export interface MealHistoryImportCandidate {
  client_entry_id: string;
  recipe_slug: string;
  cooked_at: string;
  crew_size?: number;
}

export interface ExistingHistoryKey {
  client_entry_id: string | null;
  recipe_slug: string;
  cooked_at_ms: number;
}

export interface PlannedImportRow {
  client_entry_id: string;
  recipe_slug: string;
  cooked_at: string;
  crew_size: number | null;
}

export interface MealHistoryImportPlan {
  toInsert: PlannedImportRow[];
  duplicates: number;
  skipped: number;
}

/**
 * Decides which device-local entries become new rows. An entry is a duplicate
 * when its client id is already stored, appeared earlier in the same batch, or
 * matches an unclaimed keyless row (same recipe, within IMPORT_MATCH_WINDOW_MS).
 * Each keyless row can absorb at most one imported entry.
 */
export function planMealHistoryImport(
  entries: readonly MealHistoryImportCandidate[],
  existing: readonly ExistingHistoryKey[],
  isValidSlug: (slug: string) => boolean,
  now: Date = new Date(),
): MealHistoryImportPlan {
  const knownIds = new Set<string>();
  const keyless: Array<ExistingHistoryKey & { claimed: boolean }> = [];
  for (const row of existing) {
    if (row.client_entry_id) knownIds.add(row.client_entry_id);
    else keyless.push({ ...row, claimed: false });
  }

  const toInsert: PlannedImportRow[] = [];
  let duplicates = 0;
  let skipped = 0;
  const nowMs = now.getTime();

  for (const entry of entries) {
    const slug = entry.recipe_slug.trim().toLowerCase();
    const cookedMs = Date.parse(entry.cooked_at);
    if (
      !isValidSlug(slug) ||
      !Number.isFinite(cookedMs) ||
      cookedMs < IMPORT_EARLIEST_MS ||
      cookedMs > nowMs + IMPORT_FUTURE_SKEW_MS
    ) {
      skipped += 1;
      continue;
    }
    if (knownIds.has(entry.client_entry_id)) {
      duplicates += 1;
      continue;
    }
    const legacy = keyless.find(
      (row) =>
        !row.claimed && row.recipe_slug === slug && Math.abs(row.cooked_at_ms - cookedMs) <= IMPORT_MATCH_WINDOW_MS,
    );
    if (legacy) {
      legacy.claimed = true;
      knownIds.add(entry.client_entry_id);
      duplicates += 1;
      continue;
    }
    knownIds.add(entry.client_entry_id);
    toInsert.push({
      client_entry_id: entry.client_entry_id,
      recipe_slug: slug,
      cooked_at: new Date(cookedMs).toISOString(),
      crew_size: entry.crew_size ?? null,
    });
  }

  return { toInsert, duplicates, skipped };
}
