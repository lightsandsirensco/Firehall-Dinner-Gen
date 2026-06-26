import { nanoid } from "nanoid";
import { getSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import { getHallMember } from "../hall-membership/store.js";
import { buildHallAnalyticsPayload } from "../../shared/hall-analytics/aggregate.js";
import type {
  HallActivityEvent,
  HallActivitySyncEntry,
  HallActivityType,
  HallAnalyticsPayload,
} from "../../shared/hall-analytics/types.js";

let db: SqliteDatabase;

export async function initHallAnalyticsStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallAnalyticsDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    throw new Error("Hall analytics store not initialized");
  }
  return db;
}

function rowToEvent(row: Record<string, unknown>): HallActivityEvent {
  return {
    activity_id: String(row.activity_id),
    hall_id: String(row.hall_id),
    user_id: row.user_id ? String(row.user_id) : null,
    event_type: String(row.event_type) as HallActivityType,
    external_id: String(row.external_id),
    title: String(row.title ?? ""),
    recipe_slug: row.recipe_slug ? String(row.recipe_slug) : null,
    cuisine: row.cuisine ? String(row.cuisine) : null,
    category: row.category ? String(row.category) : null,
    shift_label: row.shift_label ? String(row.shift_label) : null,
    occurred_at: String(row.occurred_at),
  };
}

function listEvents(hallId: string): HallActivityEvent[] {
  const d = getDb();
  const rows = d
    .prepare(
      `SELECT * FROM hall_activity_events
       WHERE hall_id = ?
       ORDER BY occurred_at DESC`,
    )
    .all(hallId) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getHallAnalytics(hallId: string): HallAnalyticsPayload {
  return buildHallAnalyticsPayload(hallId, listEvents(hallId));
}

export function upsertHallActivity(
  hallId: string,
  userId: string | null,
  input: {
    event_type: HallActivityType;
    external_id: string;
    title?: string;
    recipe_slug?: string | null;
    cuisine?: string | null;
    category?: string | null;
    shift_label?: string | null;
    occurred_at: string;
  },
): void {
  const d = getDb();
  d.prepare(
    `INSERT INTO hall_activity_events
     (activity_id, hall_id, user_id, event_type, external_id, title, recipe_slug, cuisine, category, shift_label, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(hall_id, event_type, external_id) DO UPDATE SET
       title = excluded.title,
       recipe_slug = COALESCE(excluded.recipe_slug, hall_activity_events.recipe_slug),
       cuisine = COALESCE(excluded.cuisine, hall_activity_events.cuisine),
       category = COALESCE(excluded.category, hall_activity_events.category),
       shift_label = COALESCE(excluded.shift_label, hall_activity_events.shift_label),
       occurred_at = excluded.occurred_at,
       user_id = COALESCE(excluded.user_id, hall_activity_events.user_id)`,
  ).run(
    nanoid(),
    hallId,
    userId,
    input.event_type,
    input.external_id,
    input.title?.trim() || "",
    input.recipe_slug ?? null,
    input.cuisine ?? null,
    input.category ?? null,
    input.shift_label ?? null,
    input.occurred_at,
  );
}

export function syncHallActivity(
  hallId: string,
  userId: string,
  entries: HallActivitySyncEntry[],
  wheelSpinDays: string[],
): number {
  if (!getHallMember(hallId, userId)) return 0;

  let upserted = 0;
  for (const entry of entries) {
    upsertHallActivity(hallId, userId, {
      event_type: entry.event_type,
      external_id: entry.external_id,
      title: entry.title,
      recipe_slug: entry.recipe_slug ?? null,
      cuisine: entry.cuisine ?? null,
      category: entry.category ?? null,
      shift_label: entry.shift_label ?? null,
      occurred_at: entry.occurred_at,
    });
    upserted += 1;
  }

  for (const day of wheelSpinDays) {
    upsertHallActivity(hallId, userId, {
      event_type: "wheel_spin",
      external_id: `wheel_day:${day}`,
      title: "Wheel spin",
      occurred_at: `${day}T18:00:00.000Z`,
    });
    upserted += 1;
  }

  return upserted;
}

export function recordShoppingListCompleted(
  hallId: string,
  userId: string,
  listId: string,
  title: string,
): void {
  upsertHallActivity(hallId, userId, {
    event_type: "shopping_list_completed",
    external_id: listId,
    title: title.trim() || "Hall grocery run",
    occurred_at: new Date().toISOString(),
  });
}
