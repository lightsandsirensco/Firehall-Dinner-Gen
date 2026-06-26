import type { SqliteDatabase } from "../sqlite.js";
import type { HallRole } from "../../shared/hall-membership/types.js";

export function syncCanteenManagerFromRole(
  d: SqliteDatabase,
  hallId: string,
  targetUserId: string,
  newRole: HallRole,
): void {
  if (newRole === "canteen_manager") {
    d.prepare(
      `UPDATE hall_memberships SET role = 'member'
       WHERE hall_id = ? AND role = 'canteen_manager' AND user_id != ?`,
    ).run(hallId, targetUserId);
    d.prepare(
      `UPDATE halls SET canteen_manager_user_id = ?, updated_at = datetime('now') WHERE hall_id = ?`,
    ).run(targetUserId, hallId);
    return;
  }

  const row = d
    .prepare(`SELECT canteen_manager_user_id FROM halls WHERE hall_id = ?`)
    .get(hallId) as { canteen_manager_user_id: string | null } | undefined;
  if (row?.canteen_manager_user_id === targetUserId) {
    d.prepare(
      `UPDATE halls SET canteen_manager_user_id = NULL, updated_at = datetime('now') WHERE hall_id = ?`,
    ).run(hallId);
  }
}
