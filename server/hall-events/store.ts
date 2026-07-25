import { nanoid } from "nanoid";
import { getSharedLocalDb, tryGetSharedLocalDb, type SqliteDatabase } from "../sqlite.js";
import type { HallEventInput, HallEventRecord } from "../../shared/hall-events/types.js";
import { HallEventTypes } from "../../shared/hall-events/types.js";

let db: SqliteDatabase | null = null;

export async function initHallEventStore(): Promise<void> {
  db = await getSharedLocalDb();
}

export function bindHallEventDb(database: SqliteDatabase): void {
  db = database;
}

function getDb(): SqliteDatabase {
  if (!db) {
    db = tryGetSharedLocalDb();
  }
  if (!db) throw new Error("Hall event store not initialized");
  return db;
}

function tryDb(): SqliteDatabase | null {
  try {
    return getDb();
  } catch {
    return null;
  }
}

function parsePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function rowToEvent(row: Record<string, unknown>): HallEventRecord {
  return {
    event_id: String(row.event_id),
    hall_id: String(row.hall_id),
    event_type: String(row.event_type),
    version: Number(row.version ?? 1),
    occurred_at: String(row.occurred_at),
    recorded_at: String(row.recorded_at),
    actor_kind: String(row.actor_kind ?? "member") as HallEventRecord["actor_kind"],
    actor_user_id: row.actor_user_id ? String(row.actor_user_id) : null,
    correlation_id: row.correlation_id ? String(row.correlation_id) : null,
    causation_id: row.causation_id ? String(row.causation_id) : null,
    aggregate_type: row.aggregate_type ? String(row.aggregate_type) : null,
    aggregate_id: row.aggregate_id ? String(row.aggregate_id) : null,
    payload: parsePayload(String(row.payload_json ?? "{}")),
    visibility: (row.visibility === "role_restricted" ? "role_restricted" : "hall"),
    idempotency_key: row.idempotency_key ? String(row.idempotency_key) : null,
  };
}

function authorDisplayName(userId: string | null | undefined): string {
  if (!userId) return "System";
  const row = getDb()
    .prepare(
      `SELECT p.display_name, p.first_name, u.email
       FROM user_profiles p
       JOIN users u ON u.user_id = p.user_id
       WHERE p.user_id = ?`,
    )
    .get(userId) as
    | { display_name: string | null; first_name: string | null; email: string | null }
    | undefined;
  if (!row) return "Crew member";
  return (
    row.display_name?.trim() ||
    row.first_name?.trim() ||
    row.email?.split("@")[0] ||
    "Crew member"
  );
}

function upsertBoardPulse(input: {
  hall_id: string;
  pulse_kind: string;
  title: string;
  href?: string | null;
  priority: number;
  source_event_id: string;
  source_aggregate_type?: string | null;
  source_aggregate_id?: string | null;
  expires_at?: string | null;
}): void {
  const d = getDb();
  // Clear duplicate active pulse for same aggregate
  if (input.source_aggregate_type && input.source_aggregate_id) {
    d.prepare(
      `UPDATE hall_board_pulses
       SET cleared_at = datetime('now')
       WHERE hall_id = ?
         AND source_aggregate_type = ?
         AND source_aggregate_id = ?
         AND cleared_at IS NULL`,
    ).run(input.hall_id, input.source_aggregate_type, input.source_aggregate_id);
  }

  d.prepare(
    `INSERT INTO hall_board_pulses
      (pulse_id, hall_id, pulse_kind, title, href, priority, source_event_id,
       source_aggregate_type, source_aggregate_id, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    nanoid(),
    input.hall_id,
    input.pulse_kind,
    input.title,
    input.href ?? null,
    input.priority,
    input.source_event_id,
    input.source_aggregate_type ?? null,
    input.source_aggregate_id ?? null,
    input.expires_at ?? null,
  );

  // Cap at 3 active pulses — clear lowest priority excess
  const active = d
    .prepare(
      `SELECT pulse_id FROM hall_board_pulses
       WHERE hall_id = ? AND cleared_at IS NULL
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY priority ASC, created_at ASC`,
    )
    .all(input.hall_id) as Array<{ pulse_id: string }>;
  if (active.length > 3) {
    const toClear = active.slice(0, active.length - 3);
    const clear = d.prepare(
      `UPDATE hall_board_pulses SET cleared_at = datetime('now') WHERE pulse_id = ?`,
    );
    for (const row of toClear) clear.run(row.pulse_id);
  }
}

function clearBoardPulsesForAggregate(
  hallId: string,
  aggregateType: string,
  aggregateId: string,
): void {
  getDb()
    .prepare(
      `UPDATE hall_board_pulses
       SET cleared_at = datetime('now')
       WHERE hall_id = ?
         AND source_aggregate_type = ?
         AND source_aggregate_id = ?
         AND cleared_at IS NULL`,
    )
    .run(hallId, aggregateType, aggregateId);
}

function insertLogbookAuto(input: {
  hall_id: string;
  category: string;
  title: string;
  body?: string | null;
  author_user_id?: string | null;
  source_event_id: string;
}): void {
  getDb()
    .prepare(
      `INSERT INTO hall_logbook_entries
        (entry_id, hall_id, category, title, body, source, author_user_id, source_event_id)
       VALUES (?, ?, ?, ?, ?, 'auto', ?, ?)`,
    )
    .run(
      nanoid(),
      input.hall_id,
      input.category,
      input.title,
      input.body ?? null,
      input.author_user_id ?? null,
      input.source_event_id,
    );
}

function reactToEvent(event: HallEventRecord): void {
  const name =
    typeof event.payload.name === "string"
      ? event.payload.name
      : typeof event.payload.item_name === "string"
        ? event.payload.item_name
        : "Item";
  const who = authorDisplayName(event.actor_user_id);

  switch (event.event_type) {
    case HallEventTypes.INVENTORY_EMPTIED: {
      upsertBoardPulse({
        hall_id: event.hall_id,
        pulse_kind: "inventory_out",
        title: `${name} OUT`,
        href: "/hall/canteen",
        priority: 90,
        source_event_id: event.event_id,
        source_aggregate_type: event.aggregate_type,
        source_aggregate_id: event.aggregate_id,
      });
      insertLogbookAuto({
        hall_id: event.hall_id,
        category: "inventory",
        title: `${name} marked OUT by ${who}.`,
        source_event_id: event.event_id,
        author_user_id: event.actor_user_id,
      });
      break;
    }
    case HallEventTypes.INVENTORY_MARKED_LOW: {
      insertLogbookAuto({
        hall_id: event.hall_id,
        category: "inventory",
        title: `${name} running low (${who}).`,
        source_event_id: event.event_id,
        author_user_id: event.actor_user_id,
      });
      break;
    }
    case HallEventTypes.INVENTORY_RESTOCKED:
    case HallEventTypes.INVENTORY_RECEIVE: {
      if (event.aggregate_type && event.aggregate_id) {
        clearBoardPulsesForAggregate(event.hall_id, event.aggregate_type, event.aggregate_id);
      }
      insertLogbookAuto({
        hall_id: event.hall_id,
        category: "inventory",
        title: `Received: ${name}${who !== "System" ? ` — ${who}` : ""}.`,
        source_event_id: event.event_id,
        author_user_id: event.actor_user_id,
      });
      break;
    }
    case HallEventTypes.PAYMENT_RECEIVED: {
      const memberName =
        typeof event.payload.member_name === "string" ? event.payload.member_name : "Member";
      insertLogbookAuto({
        hall_id: event.hall_id,
        category: "dues",
        title: `Dues marked paid — ${memberName}.`,
        source_event_id: event.event_id,
        author_user_id: event.actor_user_id,
      });
      // Clear dues pulses when all clear is handled by board projection counts
      break;
    }
    case HallEventTypes.SHOPPING_RUN_COMPLETED: {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      upsertBoardPulse({
        hall_id: event.hall_id,
        pulse_kind: "delivery",
        title: "Shopping delivered",
        href: "/hall/canteen",
        priority: 40,
        source_event_id: event.event_id,
        expires_at: expires,
      });
      insertLogbookAuto({
        hall_id: event.hall_id,
        category: "shopping",
        title: `Shopping run completed${who !== "System" ? ` — ${who}` : ""}.`,
        source_event_id: event.event_id,
        author_user_id: event.actor_user_id,
      });
      break;
    }
    default:
      break;
  }
}

/**
 * Append a hall event and run sync reactions (Board pulses, Logbook).
 * Idempotent when idempotency_key is provided.
 */
export function emitHallEvent(input: HallEventInput): HallEventRecord | null {
  const d = tryDb();
  if (!d) return null;

  if (input.idempotency_key) {
    const existing = d
      .prepare(
        `SELECT * FROM hall_events WHERE hall_id = ? AND idempotency_key = ?`,
      )
      .get(input.hall_id, input.idempotency_key) as Record<string, unknown> | undefined;
    if (existing) return rowToEvent(existing);
  }

  const eventId = nanoid();
  const now = new Date().toISOString();
  const occurredAt = input.occurred_at ?? now;
  const payload = input.payload ?? {};

  d.prepare(
    `INSERT INTO hall_events
      (event_id, hall_id, event_type, version, occurred_at, recorded_at,
       actor_kind, actor_user_id, correlation_id, causation_id,
       aggregate_type, aggregate_id, payload_json, visibility, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    eventId,
    input.hall_id,
    input.event_type,
    input.version ?? 1,
    occurredAt,
    now,
    input.actor_kind ?? "member",
    input.actor_user_id ?? null,
    input.correlation_id ?? null,
    input.causation_id ?? null,
    input.aggregate_type ?? null,
    input.aggregate_id ?? null,
    JSON.stringify(payload),
    input.visibility ?? "hall",
    input.idempotency_key ?? null,
  );

  const event = rowToEvent(
    d.prepare(`SELECT * FROM hall_events WHERE event_id = ?`).get(eventId) as Record<
      string,
      unknown
    >,
  );

  try {
    reactToEvent(event);
  } catch {
    // Reactions must not roll back the fact
  }

  return event;
}

export function listHallEvents(
  hallId: string,
  opts?: { limit?: number; event_type?: string },
): HallEventRecord[] {
  const limit = opts?.limit ?? 50;
  const d = getDb();
  const rows = opts?.event_type
    ? (d
        .prepare(
          `SELECT * FROM hall_events
           WHERE hall_id = ? AND event_type = ?
           ORDER BY occurred_at DESC LIMIT ?`,
        )
        .all(hallId, opts.event_type, limit) as Record<string, unknown>[])
    : (d
        .prepare(
          `SELECT * FROM hall_events
           WHERE hall_id = ?
           ORDER BY occurred_at DESC LIMIT ?`,
        )
        .all(hallId, limit) as Record<string, unknown>[]);
  return rows.map(rowToEvent);
}

export function writeInventoryLedger(input: {
  hall_id: string;
  item_id: string;
  action: string;
  status_after?: string | null;
  actor_user_id?: string | null;
  note?: string | null;
  hall_event_id?: string | null;
  qty_delta?: number | null;
  qty_after?: number | null;
}): void {
  const d = tryDb();
  if (!d) return;
  try {
    d.prepare(
      `INSERT INTO hall_inventory_ledger
        (event_id, hall_id, item_id, action, qty_delta, qty_after, status_after,
         actor_user_id, note, hall_event_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      nanoid(),
      input.hall_id,
      input.item_id,
      input.action,
      input.qty_delta ?? null,
      input.qty_after ?? null,
      input.status_after ?? null,
      input.actor_user_id ?? null,
      input.note ?? null,
      input.hall_event_id ?? null,
    );
  } catch {
    /* table may not exist until migration 041 */
  }
}
