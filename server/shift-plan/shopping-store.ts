/**
 * Shift shopping list persistence (Postgres: user_shift_shopping_lists).
 * One current list per user; payloads are the canonical Smart Shopping
 * session, re-validated on every read.
 */
import { pgOne, pgTx } from "../db/pg-sql.js";
import {
  restorePantryProfile,
  restoreShoppingSession,
  type PantryContext,
  type ShoppingList,
  type ShoppingSession,
} from "../../shared/shopping/index.js";

export interface ShiftListRecord {
  shiftKey: string;
  session: ShoppingSession;
  /** Prior lists, newest first. */
  undo: ShoppingList[];
  pantry: PantryContext | null;
}

export interface ShiftListUpdate<T> {
  /** Record to write, or null to leave storage unchanged. */
  save: ShiftListRecord | null;
  result: T;
}

/** Storage seam — Postgres in production, in-memory in tests. */
export interface ShiftListRepo {
  get(userId: string): Promise<ShiftListRecord | null>;
  /** Read-modify-write under a row lock so two devices can't overwrite each other. */
  update<T>(userId: string, fn: (current: ShiftListRecord | null) => ShiftListUpdate<T>): Promise<T>;
}

export function restorePantryContext(raw: unknown): PantryContext | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  const personal = v.personal ? restorePantryProfile(v.personal) : null;
  const hall = v.hall ? restorePantryProfile(v.hall) : null;
  if (!personal && !hall) return null;
  return { ...(personal ? { personal } : {}), ...(hall ? { hall } : {}) };
}

function restoreUndo(raw: unknown, session: ShoppingSession): ShoppingList[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((list) => restoreShoppingSession({ ...session, recipes: [], list })?.list ?? null)
    .filter((l): l is ShoppingList => l !== null);
}

/** Validated record from stored JSON; null when the session itself is unusable. */
export function restoreShiftListRecord(raw: {
  shiftKey: string;
  session: unknown;
  undo: unknown;
  pantry: unknown;
}): ShiftListRecord | null {
  const session = restoreShoppingSession(raw.session);
  if (!session) return null;
  return {
    shiftKey: raw.shiftKey,
    session,
    undo: restoreUndo(raw.undo, session),
    pantry: restorePantryContext(raw.pantry),
  };
}

interface Row {
  shift_key: string;
  session_json: unknown;
  undo_json: unknown;
  pantry_json: unknown;
}

const fromRow = (row: Row) =>
  restoreShiftListRecord({ shiftKey: row.shift_key, session: row.session_json, undo: row.undo_json, pantry: row.pantry_json });

const SELECT = `SELECT shift_key, session_json, undo_json, pantry_json FROM user_shift_shopping_lists WHERE user_id = $1`;

export const pgShiftListRepo: ShiftListRepo = {
  async get(userId) {
    const row = await pgOne<Row>(SELECT, [userId]);
    return row ? fromRow(row) : null;
  },

  async update(userId, fn) {
    return pgTx(async (exec) => {
      const row = await exec.one<Row>(`${SELECT} FOR UPDATE`, [userId]);
      const { save, result } = fn(row ? fromRow(row) : null);
      if (save) {
        await exec.run(
          `INSERT INTO user_shift_shopping_lists (user_id, shift_key, session_json, undo_json, pantry_json)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb)
           ON CONFLICT (user_id) DO UPDATE SET
             created_at = CASE WHEN user_shift_shopping_lists.shift_key = excluded.shift_key
                               THEN user_shift_shopping_lists.created_at ELSE now() END,
             shift_key = excluded.shift_key,
             session_json = excluded.session_json,
             undo_json = excluded.undo_json,
             pantry_json = excluded.pantry_json,
             updated_at = now()`,
          [
            userId,
            save.shiftKey,
            JSON.stringify(save.session),
            JSON.stringify(save.undo),
            save.pantry ? JSON.stringify(save.pantry) : null,
          ],
        );
      }
      return result;
    });
  },
};

/** Same contract as the Postgres repo (JSON round-trip included); used by tests. */
export function createMemoryShiftListRepo(): ShiftListRepo {
  const rows = new Map<string, string>();
  const read = (userId: string) => {
    const raw = rows.get(userId);
    return raw ? restoreShiftListRecord(JSON.parse(raw)) : null;
  };
  return {
    async get(userId) {
      return read(userId);
    },
    async update(userId, fn) {
      const { save, result } = fn(read(userId));
      if (save) rows.set(userId, JSON.stringify(save));
      return result;
    },
  };
}
