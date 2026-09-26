/**
 * Firehall Meals Pro V1 Feature 3 — Meal Memory durable store.
 *
 * Authoritative source of truth for explicit "Mark as Cooked" events.
 * Append-only event log — a recipe may be cooked, and recorded, any
 * number of times. Never upserts/dedupes by recipe_slug alone (except a
 * short accidental-double-click window — see DOUBLE_CLICK_WINDOW_MS).
 *
 * Postgres-backed (see PRODUCTION DATABASE MIGRATION PLAN) — no SQLite
 * fallback; initMealHistoryStore() fails closed if DATABASE_URL is unset.
 */
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";
import { getCatalogTitle, isApprovedCatalogSlug } from "../../shared/hall-catalog/gate.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import type { MealHistoryEntry } from "../../shared/meal-history/types.js";

export async function initMealHistoryStore(): Promise<void> {
  await verifyPgConnection();
}

/**
 * @deprecated Meal history is Postgres-only now. No-op compatibility stub
 * kept only so existing test scripts that call bindMealHistoryDb() still
 * compile. Set DATABASE_URL to a test database to exercise this store.
 */
export function bindMealHistoryDb(_database: unknown): void {
  console.warn(
    "[meal-history/store] bindMealHistoryDb() is a no-op — meal history is Postgres-only now.",
  );
}

interface MealHistoryRow {
  id: number;
  user_id: string;
  recipe_slug: string;
  cooked_at: Date;
  created_at: Date;
}

/** Resolve display fields at read time — never duplicated into the row. Fails gracefully. */
function toEntry(row: MealHistoryRow): MealHistoryEntry {
  const title = isApprovedCatalogSlug(row.recipe_slug) ? getCatalogTitle(row.recipe_slug) : null;
  const recipe_path = isApprovedCatalogSlug(row.recipe_slug) ? approvedCatalogRecipePath(row.recipe_slug) : null;
  return {
    id: row.id,
    recipe_slug: row.recipe_slug,
    cooked_at: row.cooked_at instanceof Date ? row.cooked_at.toISOString() : String(row.cooked_at),
    title,
    recipe_path,
  };
}

/** Accidental double-click / double-submit window — treated as one event, not two. */
const DOUBLE_CLICK_WINDOW_MS = 5_000;

export type RecordMealCookedResult =
  | { ok: true; entry: MealHistoryEntry; deduped: boolean }
  | { ok: false; reason: "invalid_slug" };

export async function recordMealCookedForUser(
  userId: string,
  recipeSlugRaw: string,
): Promise<RecordMealCookedResult> {
  const recipeSlug = recipeSlugRaw.trim().toLowerCase();
  if (!isApprovedCatalogSlug(recipeSlug)) {
    return { ok: false, reason: "invalid_slug" };
  }

  // Idempotent double-click guard: if the exact same user+recipe was just
  // recorded a few seconds ago, return that same row instead of inserting
  // a duplicate. A deliberate re-cook (minutes/hours/days later) always
  // creates a new row.
  const recent = await pgOne<MealHistoryRow>(
    `SELECT * FROM user_meal_history WHERE user_id = $1 AND recipe_slug = $2 ORDER BY id DESC LIMIT 1`,
    [userId, recipeSlug],
  );

  if (recent) {
    const recentMs = new Date(recent.created_at).getTime();
    if (Number.isFinite(recentMs) && Date.now() - recentMs < DOUBLE_CLICK_WINDOW_MS) {
      return { ok: true, entry: toEntry(recent), deduped: true };
    }
  }

  const row = await pgOne<MealHistoryRow>(
    `INSERT INTO user_meal_history (user_id, recipe_slug) VALUES ($1, $2) RETURNING *`,
    [userId, recipeSlug],
  );

  return { ok: true, entry: toEntry(row!), deduped: false };
}

/** Most recent cooked events for a user, newest first — for account UI. */
export async function listMealHistoryForUser(userId: string, limit = 20): Promise<MealHistoryEntry[]> {
  const rows = await pgAll<MealHistoryRow>(
    `SELECT * FROM user_meal_history WHERE user_id = $1 ORDER BY cooked_at DESC, id DESC LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, 50))],
  );
  return rows.map(toEntry);
}

/** Ownership-checked delete. Returns true only if the row existed and belonged to this user. */
export async function deleteMealHistoryEntryForUser(userId: string, id: number): Promise<boolean> {
  const existing = await pgOne(`SELECT id FROM user_meal_history WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!existing) return false;
  await pgRun(`DELETE FROM user_meal_history WHERE id = $1 AND user_id = $2`, [id, userId]);
  return true;
}

/**
 * Recent cooked recipe slugs, OLDEST FIRST — the exact ordering contract the
 * Generator's existing recency mechanics expect (see
 * client/src/lib/meal-rotation-memory.ts recordMealSlug). Handed to the
 * existing recentSlugPenalty (shared/meal-rotation/weighted-pick.ts,
 * unmodified) exactly as the client's own device-local list already is.
 */
export async function listRecentCookedSlugsOldestFirst(userId: string, limit = 10): Promise<string[]> {
  const rows = await pgAll<{ recipe_slug: string }>(
    `SELECT recipe_slug FROM user_meal_history WHERE user_id = $1 ORDER BY cooked_at DESC, id DESC LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, 32))],
  );
  // rows come back newest-first; reverse for oldest-first.
  return rows.map((r) => r.recipe_slug).reverse();
}
