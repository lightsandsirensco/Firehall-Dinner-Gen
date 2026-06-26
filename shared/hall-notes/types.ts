import type { HallRole } from "../hall-membership/types.js";
import { hallRoleHasPermission } from "../hall-membership/types.js";

export interface HallNote {
  note_id: string;
  hall_id: string;
  author_user_id: string;
  author_display_name: string;
  message: string;
  created_at: string;
  updated_at: string;
}

export interface HallNotesPayload {
  notes: HallNote[];
  can_delete_any: boolean;
}

export function canViewHallNotes(role: HallRole): boolean {
  return hallRoleHasPermission(role, "view_hall_dashboard");
}

export function canDeleteAnyHallNote(role: HallRole): boolean {
  return (
    hallRoleHasPermission(role, "manage_settings") ||
    hallRoleHasPermission(role, "manage_supplies")
  );
}

export function canEditHallNote(
  role: HallRole,
  authorUserId: string,
  currentUserId: string,
): boolean {
  return authorUserId === currentUserId;
}
