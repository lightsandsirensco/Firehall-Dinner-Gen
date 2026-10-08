/**
 * Shift plan persistence (Postgres: user_shift_plans, user_shift_plan_slots).
 * Only per-slot decisions are stored — slots themselves are generated.
 */
import { pgAll, pgOne, pgTx } from "../db/pg-sql.js";
import type { ShiftPlanSelectionSource, ShiftPlanSlotState } from "../../shared/shift-plan/types.js";

export interface ShiftPlanRecord {
  exists: boolean;
  slots: ShiftPlanSlotState[];
}

/** Storage seam — Postgres in production, in-memory in tests. */
export interface ShiftPlanRepo {
  getPlan(userId: string, shiftKey: string): Promise<ShiftPlanRecord>;
  /** Writes slot states (creating the plan if needed). Returns true when the plan was created. */
  saveSlots(userId: string, shiftKey: string, slots: readonly ShiftPlanSlotState[]): Promise<boolean>;
}

interface SlotRow {
  slot_key: string;
  recipe_slug: string | null;
  selection_source: ShiftPlanSelectionSource | null;
  locked: boolean;
  skipped: boolean;
  byo: boolean;
  crew_size_override: number | null;
}

function toState(row: SlotRow): ShiftPlanSlotState {
  return {
    slotKey: row.slot_key,
    recipeSlug: row.recipe_slug,
    selectionSource: row.selection_source,
    locked: row.locked,
    skipped: row.skipped,
    byo: row.byo,
    crewSizeOverride: row.crew_size_override,
  };
}

export const pgShiftPlanRepo: ShiftPlanRepo = {
  async getPlan(userId, shiftKey) {
    const plan = await pgOne(`SELECT 1 FROM user_shift_plans WHERE user_id = $1 AND shift_key = $2`, [
      userId,
      shiftKey,
    ]);
    if (!plan) return { exists: false, slots: [] };
    const rows = await pgAll<SlotRow>(
      `SELECT slot_key, recipe_slug, selection_source, locked, skipped, byo, crew_size_override
       FROM user_shift_plan_slots WHERE user_id = $1 AND shift_key = $2`,
      [userId, shiftKey],
    );
    return { exists: true, slots: rows.map(toState) };
  },

  async saveSlots(userId, shiftKey, slots) {
    return pgTx(async (exec) => {
      const plan = await exec.one<{ created: boolean }>(
        `INSERT INTO user_shift_plans (user_id, shift_key) VALUES ($1, $2)
         ON CONFLICT (user_id, shift_key) DO UPDATE SET updated_at = now()
         RETURNING (xmax = 0) AS created`,
        [userId, shiftKey],
      );
      for (const s of slots) {
        await exec.run(
          `INSERT INTO user_shift_plan_slots
             (user_id, shift_key, slot_key, recipe_slug, selection_source, locked, skipped, byo, crew_size_override)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (user_id, slot_key) DO UPDATE SET
             shift_key = excluded.shift_key,
             recipe_slug = excluded.recipe_slug,
             selection_source = excluded.selection_source,
             locked = excluded.locked,
             skipped = excluded.skipped,
             byo = excluded.byo,
             crew_size_override = excluded.crew_size_override,
             updated_at = now()`,
          [
            userId,
            shiftKey,
            s.slotKey,
            s.recipeSlug,
            s.selectionSource,
            s.locked,
            s.skipped,
            s.byo,
            s.crewSizeOverride,
          ],
        );
      }
      return Boolean(plan?.created);
    });
  },
};

/** Same contract as the Postgres repo; used by tests. */
export function createMemoryShiftPlanRepo(): ShiftPlanRepo & { snapshot(): Map<string, ShiftPlanRecord> } {
  const plans = new Map<string, Map<string, ShiftPlanSlotState>>();
  const key = (userId: string, shiftKey: string) => `${userId}\u0000${shiftKey}`;
  return {
    async getPlan(userId, shiftKey) {
      const plan = plans.get(key(userId, shiftKey));
      return plan ? { exists: true, slots: [...plan.values()].map((s) => ({ ...s })) } : { exists: false, slots: [] };
    },
    async saveSlots(userId, shiftKey, slots) {
      const k = key(userId, shiftKey);
      const created = !plans.has(k);
      const plan = plans.get(k) ?? new Map<string, ShiftPlanSlotState>();
      for (const s of slots) plan.set(s.slotKey, { ...s });
      plans.set(k, plan);
      return created;
    },
    snapshot() {
      return new Map([...plans].map(([k, v]) => [k, { exists: true, slots: [...v.values()] }]));
    },
  };
}
