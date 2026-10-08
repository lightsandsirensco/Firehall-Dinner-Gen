/**
 * Backfills device-local cooked meals (lib/hall-history-store) into the
 * canonical Postgres user_meal_history via POST /api/meal-history/import.
 *
 * Local history is never modified or deleted — it stays as the offline /
 * Free-tier cache. The server dedupes on (user_id, client_entry_id), so a
 * retry or a second device can never double-insert; the per-account sent-id
 * set below only avoids re-sending entries the server already accepted.
 */
import { getHallHistoryEntries } from "@/lib/hall-history-store";
import { postMealHistoryImport, type MealHistoryImportRequestEntry } from "@/lib/meal-history-api";
import { MEAL_HISTORY_IMPORT_MAX } from "@shared/meal-history/schema";

const SENT_KEY_PREFIX = "firehall_meal_history_imported_v1:";
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const attemptedThisSession = new Set<string>();

function sentKey(userId: string): string {
  return `${SENT_KEY_PREFIX}${userId}`;
}

function readSentIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(sentKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSentIds(userId: string, ids: Set<string>): void {
  try {
    localStorage.setItem(sentKey(userId), JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

/** Local cooked entries that are eligible for the canonical table and not yet accepted for this account. */
export function pendingLocalMealHistory(userId: string): MealHistoryImportRequestEntry[] {
  const sent = readSentIds(userId);
  const pending: MealHistoryImportRequestEntry[] = [];
  for (const entry of getHallHistoryEntries()) {
    if (entry.type !== "meal_cooked") continue;
    const slug = entry.recipeSlug?.trim().toLowerCase();
    if (!slug || !SLUG_PATTERN.test(slug)) continue;
    if (!CLIENT_ID_PATTERN.test(entry.id) || sent.has(entry.id)) continue;
    pending.push({
      client_entry_id: entry.id,
      recipe_slug: slug,
      cooked_at: entry.at,
      ...(entry.crewSize && Number.isInteger(entry.crewSize) && entry.crewSize >= 1 && entry.crewSize <= 200
        ? { crew_size: entry.crewSize }
        : {}),
    });
  }
  return pending.slice(0, MEAL_HISTORY_IMPORT_MAX);
}

/**
 * Runs at most once per page session per account. Returns the number of rows
 * newly written server-side. Never throws — this is a best-effort backfill.
 */
export async function importLocalMealHistory(userId: string): Promise<number> {
  if (!userId || attemptedThisSession.has(userId)) return 0;
  attemptedThisSession.add(userId);

  const pending = pendingLocalMealHistory(userId);
  if (pending.length === 0) return 0;

  try {
    const result = await postMealHistoryImport(pending);
    if (!result.entitled) return 0;
    const sent = readSentIds(userId);
    for (const entry of pending) sent.add(entry.client_entry_id);
    const stillLocal = new Set(getHallHistoryEntries().map((e) => e.id));
    writeSentIds(userId, new Set([...sent].filter((id) => stillLocal.has(id))));
    return result.imported;
  } catch {
    attemptedThisSession.delete(userId);
    return 0;
  }
}
