/**
 * Firehall Meals Meal History + Crew Feedback — durable store.
 *
 * Authoritative source of truth for explicit "Made This" / "Mark as Cooked"
 * events. Append-only event log — a recipe may be cooked, and recorded, any
 * number of times. Never upserts/dedupes by recipe_slug alone (except a
 * short accidental-double-click window — see DOUBLE_CLICK_WINDOW_MS).
 *
 * ONE table (user_meal_history) — logging context (0003/0004 migrations)
 * and post-meal feedback both live on the same row as the original Meal
 * Memory columns. No second history system.
 *
 * Postgres-backed — no SQLite fallback; initMealHistoryStore() fails closed
 * if DATABASE_URL is unset.
 */
import { verifyPgConnection } from "../db/pg-client.js";
import { pgAll, pgOne, pgRun } from "../db/pg-sql.js";
import { invalidateHistorySignalsCache } from "../generation/history-personalization.js";
import { getCatalogTitle, isApprovedCatalogSlug, resolveCatalogHeroPath } from "../../shared/hall-catalog/gate.js";
import { approvedCatalogRecipePath } from "../../shared/approved-catalog.js";
import {
  isFeedbackTag,
  type FeedbackTag,
  type MealFeedbackInput,
  type MealHistoryEntry,
  type MealLogContext,
} from "../../shared/meal-history/types.js";

let clientEntryColumnReady: boolean | null = null;

/**
 * Whether 0011_meal_history_client_entry_id has been applied. Postgres
 * migrations run out-of-band (`npm run db:pg:migrate`), so live writes must
 * keep working on a database that has not been migrated yet.
 */
export async function hasClientEntryIdColumn(): Promise<boolean> {
  if (clientEntryColumnReady === true) return true;
  const row = await pgOne<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'user_meal_history' AND column_name = 'client_entry_id'
     ) AS present`,
  );
  clientEntryColumnReady = row?.present === true;
  return clientEntryColumnReady;
}

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
  is_high_protein: number | null;
  is_high_fiber: number | null;
  hall_id: string | null;
  meal_occasion: string | null;
  crew_size: number | null;
  nutrition_goal: string | null;
  cost_total_min: string | number | null;
  cost_total_max: string | number | null;
  cost_per_person_min: string | number | null;
  cost_per_person_max: string | number | null;
  cost_trustworthy: number | null;
  rating: number | null;
  make_again: number | null;
  feedback_tags_json: string | null;
  note: string | null;
  feedback_at: Date | null;
}

function toBool(v: number | null): boolean | null {
  return v == null ? null : v === 1;
}

function toNum(v: string | number | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function parseFeedbackTags(json: string | null): FeedbackTag[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is FeedbackTag => typeof t === "string" && isFeedbackTag(t));
  } catch {
    return [];
  }
}

/** Resolve display fields at read time — never duplicated into the row. Fails gracefully. */
function toEntry(row: MealHistoryRow): MealHistoryEntry {
  const approved = isApprovedCatalogSlug(row.recipe_slug);
  const title = approved ? getCatalogTitle(row.recipe_slug) : null;
  const recipe_path = approved ? approvedCatalogRecipePath(row.recipe_slug) : null;
  const hero_image = approved ? resolveCatalogHeroPath(row.recipe_slug) : null;

  const costTotalMin = toNum(row.cost_total_min);
  const costTotalMax = toNum(row.cost_total_max);
  const costPerPersonMin = toNum(row.cost_per_person_min);
  const costPerPersonMax = toNum(row.cost_per_person_max);
  const cost =
    costTotalMin != null && costTotalMax != null && costPerPersonMin != null && costPerPersonMax != null
      ? {
          totalMin: costTotalMin,
          totalMax: costTotalMax,
          perPersonMin: costPerPersonMin,
          perPersonMax: costPerPersonMax,
          trustworthy: row.cost_trustworthy === 1,
        }
      : null;

  return {
    id: row.id,
    recipe_slug: row.recipe_slug,
    cooked_at: row.cooked_at instanceof Date ? row.cooked_at.toISOString() : String(row.cooked_at),
    title,
    recipe_path,
    hero_image,
    hall_id: row.hall_id,
    meal_occasion: row.meal_occasion,
    crew_size: row.crew_size,
    nutrition_goal: row.nutrition_goal,
    is_high_protein: toBool(row.is_high_protein),
    is_high_fiber: toBool(row.is_high_fiber),
    cost,
    rating: (row.rating as 1 | 2 | 3 | 4 | 5 | null) ?? null,
    make_again: toBool(row.make_again),
    feedback_tags: parseFeedbackTags(row.feedback_tags_json),
    note: row.note,
    feedback_at: row.feedback_at instanceof Date ? row.feedback_at.toISOString() : row.feedback_at,
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
  context: MealLogContext = {},
  clientEntryId?: string,
): Promise<RecordMealCookedResult> {
  const recipeSlug = recipeSlugRaw.trim().toLowerCase();
  if (!isApprovedCatalogSlug(recipeSlug)) {
    return { ok: false, reason: "invalid_slug" };
  }
  const isHighProtein = context.is_high_protein === undefined ? null : context.is_high_protein ? 1 : 0;
  const isHighFiber = context.is_high_fiber === undefined ? null : context.is_high_fiber ? 1 : 0;
  const costTrustworthy = context.cost === undefined ? null : context.cost.trustworthy ? 1 : 0;
  const storeClientId = !!clientEntryId && (await hasClientEntryIdColumn());

  if (storeClientId) {
    const sameEvent = await pgOne<MealHistoryRow>(
      `SELECT * FROM user_meal_history WHERE user_id = $1 AND client_entry_id = $2`,
      [userId, clientEntryId],
    );
    if (sameEvent) return { ok: true, entry: toEntry(sameEvent), deduped: true };
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

  const values = [
    userId,
    recipeSlug,
    isHighProtein,
    isHighFiber,
    context.hall_id ?? null,
    context.meal_occasion ?? null,
    context.crew_size ?? null,
    context.nutrition_goal ?? null,
    context.cost?.totalMin ?? null,
    context.cost?.totalMax ?? null,
    context.cost?.perPersonMin ?? null,
    context.cost?.perPersonMax ?? null,
    costTrustworthy,
  ];
  const row = storeClientId
    ? await pgOne<MealHistoryRow>(
        `INSERT INTO user_meal_history (
           user_id, recipe_slug, is_high_protein, is_high_fiber,
           hall_id, meal_occasion, crew_size, nutrition_goal,
           cost_total_min, cost_total_max, cost_per_person_min, cost_per_person_max, cost_trustworthy,
           client_entry_id, source
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'live') RETURNING *`,
        [...values, clientEntryId],
      )
    : await pgOne<MealHistoryRow>(
        `INSERT INTO user_meal_history (
           user_id, recipe_slug, is_high_protein, is_high_fiber,
           hall_id, meal_occasion, crew_size, nutrition_goal,
           cost_total_min, cost_total_max, cost_per_person_min, cost_per_person_max, cost_trustworthy
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        values,
      );

  invalidateHistorySignalsCache(userId);
  return { ok: true, entry: toEntry(row!), deduped: false };
}

/**
 * Rows recorded live before client_entry_id existed have no key, so an
 * imported local entry matching the same recipe within this window of a
 * keyless row is treated as that same cooked event.
 */
export const IMPORT_MATCH_WINDOW_MS = 15 * 60_000;
const IMPORT_EARLIEST_MS = Date.UTC(2020, 0, 1);
const IMPORT_FUTURE_SKEW_MS = 24 * 60 * 60_000;

export interface MealHistoryImportEntry {
  client_entry_id: string;
  recipe_slug: string;
  cooked_at: string;
  crew_size?: number;
}

export type ImportMealHistoryResult =
  | { ok: true; imported: number; duplicates: number; skipped: number }
  | { ok: false; reason: "not_migrated" };

/**
 * Idempotent import of device-local cooked events into the canonical table.
 * Never updates or deletes existing rows. Each entry is inserted at most once
 * per (user_id, client_entry_id); legacy keyless rows are matched by recipe +
 * time window. Unknown slugs and implausible timestamps are skipped.
 */
export async function importMealHistoryForUser(
  userId: string,
  entries: MealHistoryImportEntry[],
): Promise<ImportMealHistoryResult> {
  if (!(await hasClientEntryIdColumn())) return { ok: false, reason: "not_migrated" };

  let imported = 0;
  let duplicates = 0;
  let skipped = 0;
  const now = Date.now();

  for (const entry of entries) {
    const slug = entry.recipe_slug.trim().toLowerCase();
    const cookedMs = new Date(entry.cooked_at).getTime();
    if (
      !isApprovedCatalogSlug(slug) ||
      !Number.isFinite(cookedMs) ||
      cookedMs < IMPORT_EARLIEST_MS ||
      cookedMs > now + IMPORT_FUTURE_SKEW_MS
    ) {
      skipped += 1;
      continue;
    }
    const cookedAt = new Date(cookedMs).toISOString();

    const legacyMatch = await pgOne<{ id: number }>(
      `SELECT id FROM user_meal_history
       WHERE user_id = $1 AND recipe_slug = $2 AND client_entry_id IS NULL
         AND cooked_at BETWEEN $3::timestamptz - make_interval(secs => $4)
                           AND $3::timestamptz + make_interval(secs => $4)
       LIMIT 1`,
      [userId, slug, cookedAt, IMPORT_MATCH_WINDOW_MS / 1000],
    );
    if (legacyMatch) {
      duplicates += 1;
      continue;
    }

    const inserted = await pgOne<{ id: number }>(
      `INSERT INTO user_meal_history (user_id, recipe_slug, cooked_at, crew_size, client_entry_id, source)
       VALUES ($1, $2, $3, $4, $5, 'local_import')
       ON CONFLICT (user_id, client_entry_id) WHERE client_entry_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [userId, slug, cookedAt, entry.crew_size ?? null, entry.client_entry_id],
    );
    if (inserted) imported += 1;
    else duplicates += 1;
  }

  if (imported > 0) invalidateHistorySignalsCache(userId);
  return { ok: true, imported, duplicates, skipped };
}

/** Most recent cooked events for a user, newest first — for account UI. */
export async function listMealHistoryForUser(userId: string, limit = 20): Promise<MealHistoryEntry[]> {
  const rows = await pgAll<MealHistoryRow>(
    `SELECT * FROM user_meal_history WHERE user_id = $1 ORDER BY cooked_at DESC, id DESC LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, 50))],
  );
  return rows.map(toEntry);
}

/**
 * Post-meal crew feedback — a partial, additive PATCH onto an existing row
 * the user already owns. Every field optional so a firefighter can submit
 * just a star rating and stop there. Re-callable (editing rating/note later
 * just re-submits) — feedback_at always reflects the most recent submit.
 */
export type SubmitMealFeedbackResult =
  | { ok: true; entry: MealHistoryEntry }
  | { ok: false; reason: "not_found" };

export async function submitMealFeedbackForUser(
  userId: string,
  id: number,
  feedback: MealFeedbackInput,
): Promise<SubmitMealFeedbackResult> {
  const existing = await pgOne<MealHistoryRow>(
    `SELECT * FROM user_meal_history WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  if (!existing) return { ok: false, reason: "not_found" };

  const nextRating = feedback.rating !== undefined ? feedback.rating : existing.rating;
  const nextMakeAgain =
    feedback.make_again !== undefined ? (feedback.make_again ? 1 : 0) : existing.make_again;
  const nextTagsJson =
    feedback.feedback_tags !== undefined
      ? JSON.stringify(feedback.feedback_tags)
      : existing.feedback_tags_json;
  const nextNote = feedback.note !== undefined ? feedback.note || null : existing.note;

  const row = await pgOne<MealHistoryRow>(
    `UPDATE user_meal_history
     SET rating = $1, make_again = $2, feedback_tags_json = $3, note = $4, feedback_at = now()
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [nextRating, nextMakeAgain, nextTagsJson, nextNote, id, userId],
  );

  invalidateHistorySignalsCache(userId);
  return { ok: true, entry: toEntry(row!) };
}

/** Ownership-checked delete. Returns true only if the row existed and belonged to this user. */
export async function deleteMealHistoryEntryForUser(userId: string, id: number): Promise<boolean> {
  const existing = await pgOne(`SELECT id FROM user_meal_history WHERE id = $1 AND user_id = $2`, [id, userId]);
  if (!existing) return false;
  await pgRun(`DELETE FROM user_meal_history WHERE id = $1 AND user_id = $2`, [id, userId]);
  invalidateHistorySignalsCache(userId);
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
