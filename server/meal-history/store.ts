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
  type MealHistoryFavorite,
  type MealLogContext,
} from "../../shared/meal-history/types.js";
import { planMealHistoryImport, type MealHistoryImportCandidate } from "../../shared/meal-history/access.js";

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

export type ImportMealHistoryResult =
  | { ok: true; imported: number; duplicates: number; skipped: number }
  | { ok: false; reason: "not_migrated" };

/**
 * Idempotent import of device-local cooked events into the canonical table.
 * Never updates or deletes existing rows — see planMealHistoryImport for the
 * dedupe rules. The partial unique index on (user_id, client_entry_id) is the
 * final guard when two devices import the same entries concurrently.
 */
export async function importMealHistoryForUser(
  userId: string,
  entries: MealHistoryImportCandidate[],
): Promise<ImportMealHistoryResult> {
  if (!(await hasClientEntryIdColumn())) return { ok: false, reason: "not_migrated" };

  const existingRows = await pgAll<{ client_entry_id: string | null; recipe_slug: string; cooked_at: Date }>(
    `SELECT client_entry_id, recipe_slug, cooked_at FROM user_meal_history WHERE user_id = $1`,
    [userId],
  );
  const plan = planMealHistoryImport(
    entries,
    existingRows.map((r) => ({
      client_entry_id: r.client_entry_id,
      recipe_slug: r.recipe_slug,
      cooked_at_ms: new Date(r.cooked_at).getTime(),
    })),
    isApprovedCatalogSlug,
  );

  let imported = 0;
  let duplicates = plan.duplicates;
  for (const row of plan.toInsert) {
    const inserted = await pgOne<{ id: number }>(
      `INSERT INTO user_meal_history (user_id, recipe_slug, cooked_at, crew_size, client_entry_id, source)
       VALUES ($1, $2, $3, $4, $5, 'local_import')
       ON CONFLICT (user_id, client_entry_id) WHERE client_entry_id IS NOT NULL DO NOTHING
       RETURNING id`,
      [userId, row.recipe_slug, row.cooked_at, row.crew_size, row.client_entry_id],
    );
    if (inserted) imported += 1;
    else duplicates += 1;
  }

  if (imported > 0) invalidateHistorySignalsCache(userId);
  return { ok: true, imported, duplicates, skipped: plan.skipped };
}

/** Most recent cooked events for a user, newest first — for account UI. */
export async function listMealHistoryForUser(userId: string, limit = 20): Promise<MealHistoryEntry[]> {
  const rows = await pgAll<MealHistoryRow>(
    `SELECT * FROM user_meal_history WHERE user_id = $1 ORDER BY cooked_at DESC, id DESC LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, 50))],
  );
  return rows.map(toEntry);
}

export const MEAL_HISTORY_PAGE_MAX = 100;

/** One page of entries cooked at/after `since` (null = all), newest first. */
export async function listMealHistoryPage(
  userId: string,
  opts: { since: Date | null; limit: number; offset: number },
): Promise<MealHistoryEntry[]> {
  const limit = Math.max(1, Math.min(opts.limit, MEAL_HISTORY_PAGE_MAX));
  const offset = Math.max(0, opts.offset);
  const rows = opts.since
    ? await pgAll<MealHistoryRow>(
        `SELECT * FROM user_meal_history WHERE user_id = $1 AND cooked_at >= $2
         ORDER BY cooked_at DESC, id DESC LIMIT $3 OFFSET $4`,
        [userId, opts.since.toISOString(), limit, offset],
      )
    : await pgAll<MealHistoryRow>(
        `SELECT * FROM user_meal_history WHERE user_id = $1
         ORDER BY cooked_at DESC, id DESC LIMIT $2 OFFSET $3`,
        [userId, limit, offset],
      );
  return rows.map(toEntry);
}

/** Total stored rows and how many fall before `since` (hidden for Free, never deleted). */
export async function countMealHistoryForUser(
  userId: string,
  since: Date | null,
): Promise<{ total: number; older: number }> {
  const row = await pgOne<{ total: string | number; older: string | number }>(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE $2::timestamptz IS NOT NULL AND cooked_at < $2::timestamptz) AS older
     FROM user_meal_history WHERE user_id = $1`,
    [userId, since ? since.toISOString() : null],
  );
  return { total: Number(row?.total ?? 0), older: Number(row?.older ?? 0) };
}

/** Single owned row, or null — used to check the visible window before feedback edits. */
export async function getMealHistoryEntryForUser(userId: string, id: number): Promise<MealHistoryEntry | null> {
  const row = await pgOne<MealHistoryRow>(`SELECT * FROM user_meal_history WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
  return row ? toEntry(row) : null;
}

/** Premium recall: recipes rated 4+ or marked make-again, across the user's full history. */
export async function listFavoriteMealsForUser(userId: string, limit = 6): Promise<MealHistoryFavorite[]> {
  const rows = await pgAll<{
    recipe_slug: string;
    times_cooked: string | number;
    last_cooked_at: Date;
    best_rating: number | null;
  }>(
    `SELECT recipe_slug, COUNT(*) AS times_cooked, MAX(cooked_at) AS last_cooked_at, MAX(rating) AS best_rating
     FROM user_meal_history
     WHERE user_id = $1
     GROUP BY recipe_slug
     HAVING BOOL_OR(make_again = 1) OR MAX(rating) >= 4
     ORDER BY MAX(rating) DESC NULLS LAST, MAX(cooked_at) DESC
     LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, 20))],
  );
  return rows
    .filter((r) => isApprovedCatalogSlug(r.recipe_slug))
    .map((r) => ({
      recipe_slug: r.recipe_slug,
      title: getCatalogTitle(r.recipe_slug),
      recipe_path: approvedCatalogRecipePath(r.recipe_slug),
      hero_image: resolveCatalogHeroPath(r.recipe_slug),
      times_cooked: Number(r.times_cooked),
      last_cooked_at: new Date(r.last_cooked_at).toISOString(),
      best_rating: (r.best_rating as 1 | 2 | 3 | 4 | 5 | null) ?? null,
    }));
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
export async function listRecentCookedSlugsOldestFirst(
  userId: string,
  limit = 10,
  since: Date | null = null,
): Promise<string[]> {
  const cap = Math.max(1, Math.min(limit, 32));
  const rows = since
    ? await pgAll<{ recipe_slug: string }>(
        `SELECT recipe_slug FROM user_meal_history WHERE user_id = $1 AND cooked_at >= $2
         ORDER BY cooked_at DESC, id DESC LIMIT $3`,
        [userId, since.toISOString(), cap],
      )
    : await pgAll<{ recipe_slug: string }>(
        `SELECT recipe_slug FROM user_meal_history WHERE user_id = $1 ORDER BY cooked_at DESC, id DESC LIMIT $2`,
        [userId, cap],
      );
  // rows come back newest-first; reverse for oldest-first.
  return rows.map((r) => r.recipe_slug).reverse();
}
