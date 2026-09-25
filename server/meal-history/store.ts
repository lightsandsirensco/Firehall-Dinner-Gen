/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory durable store.
 *
 * Authoritative source of truth for explicit "Mark as Cooked" events.
 * Append-only event log — a recipe may be cooked, and recorded, any
 * number of times. Never upserts/dedupes by recipe_slug alone (except a
 * short accidental-double-click window — see DOUBLE_CLICK_WINDOW_MS).
 */
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getCatalogTitle, isApprovedCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import type { MealHistoryEntry } from "../../shared/meal-history/types.js";

let db: SqliteDatabase;

export async function initMealHistoryStore(): Promise<void> {
  db = await getSharedLocalDb();
}

/** Test hook — bind a specific SQLite database (validation scripts only). */
export function bindMealHistoryDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Meal history store not initialized — call initMealHistoryStore() first");
  }
  return db;
}

interface MealHistoryRow {
  id: number;
  user_id: string;
  recipe_slug: string;
  cooked_at: string;
  created_at: string;
}

/** Resolve display fields at read time — never duplicated into the row. Fails gracefully. */
function toEntry(row: MealHistoryRow): MealHistoryEntry {
  const title = isApprovedCatalogSlug(row.recipe_slug) ? getCatalogTitle(row.recipe_slug) : null;
  const recipe_path = isApprovedCatalogSlug(row.recipe_slug)
    ? approvedCatalogRecipePath(row.recipe_slug)
    : null;
  return {
    id: row.id,
    recipe_slug: row.recipe_slug,
    cooked_at: row.cooked_at,
    title,
    recipe_path,
  };
}

/** Accidental double-click / double-submit window — treated as one event, not two. */
const DOUBLE_CLICK_WINDOW_MS = 5_000;

export type RecordMealCookedResult =
  | { ok: true; entry: MealHistoryEntry; deduped: boolean }
  | { ok: false; reason: "invalid_slug" };

export function recordMealCookedForUser(userId: string, recipeSlugRaw: string): RecordMealCookedResult {
  const recipeSlug = recipeSlugRaw.trim().toLowerCase();
  if (!isApprovedCatalogSlug(recipeSlug)) {
    return { ok: false, reason: "invalid_slug" };
  }

  const d = getDb();

  // Idempotent double-click guard: if the exact same user+recipe was just
  // recorded a few seconds ago, return that same row instead of inserting
  // a duplicate. A deliberate re-cook (minutes/hours/days later) always
  // creates a new row — see migration doc comment.
  const recent = d
    .prepare(
      `SELECT * FROM user_meal_history
       WHERE user_id = ? AND recipe_slug = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(userId, recipeSlug) as unknown as MealHistoryRow | undefined;

  if (recent) {
    const recentMs = new Date(recent.created_at.replace(" ", "T") + "Z").getTime();
    if (Number.isFinite(recentMs) && Date.now() - recentMs < DOUBLE_CLICK_WINDOW_MS) {
      return { ok: true, entry: toEntry(recent), deduped: true };
    }
  }

  // sql.js's Statement#run() has no lastInsertRowid — re-select the row we
  // just inserted (single-connection, synchronous wrapper — see
  // server/sqlite.ts — so this is race-free within one process).
  d.prepare(`INSERT INTO user_meal_history (user_id, recipe_slug) VALUES (?, ?)`).run(
    userId,
    recipeSlug,
  );

  const row = d
    .prepare(
      `SELECT * FROM user_meal_history WHERE user_id = ? AND recipe_slug = ? ORDER BY id DESC LIMIT 1`,
    )
    .get(userId, recipeSlug) as unknown as MealHistoryRow;

  return { ok: true, entry: toEntry(row), deduped: false };
}

/** Most recent cooked events for a user, newest first — for account UI. */
export function listMealHistoryForUser(userId: string, limit = 20): MealHistoryEntry[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT * FROM user_meal_history WHERE user_id = ? ORDER BY cooked_at DESC, id DESC LIMIT ?`,
    )
    .all(userId, Math.max(1, Math.min(limit, 50))) as unknown as MealHistoryRow[];
  return rows.map(toEntry);
}

/** Ownership-checked delete. Returns true only if the row existed and belonged to this user. */
export function deleteMealHistoryEntryForUser(userId: string, id: number): boolean {
  const d = getDb();
  // sql.js's Statement#run() reports no affected-row count — check
  // ownership with a SELECT first (see recordMealCookedForUser comment).
  const existing = d
    .prepare(`SELECT id FROM user_meal_history WHERE id = ? AND user_id = ?`)
    .get(id, userId);
  if (!existing) return false;
  d.prepare(`DELETE FROM user_meal_history WHERE id = ? AND user_id = ?`).run(id, userId);
  return true;
}

/**
 * Recent cooked recipe slugs, OLDEST FIRST — the exact ordering contract the
 * Generator's existing recency mechanics expect (see
 * client/src/lib/meal-rotation-memory.ts recordMealSlug — the free/local
 * "recentSlugs" array is built the same way: push newest to the end).
 * Handed to the EXISTING recentSlugPenalty (shared/meal-rotation/weighted-pick.ts,
 * unmodified by this feature) exactly as the client's own device-local list
 * already is — no new ranking engine. `limit` is the exact recency window
 * (see server/routes.ts generate handler for the chosen policy).
 */
export function listRecentCookedSlugsOldestFirst(userId: string, limit = 10): string[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT recipe_slug FROM user_meal_history WHERE user_id = ? ORDER BY cooked_at DESC, id DESC LIMIT ?`,
    )
    .all(userId, Math.max(1, Math.min(limit, 32))) as Array<{ recipe_slug: string }>;
  // rows come back newest-first; reverse for oldest-first.
  return rows.map((r) => r.recipe_slug).reverse();
}
