export const HALL_ROLES = ["captain", "canteen_manager", "member"] as const;
export type HallRole = (typeof HALL_ROLES)[number];

export const HALL_INVITE_METHODS = ["link", "qr", "code"] as const;
export type HallInviteMethod = (typeof HALL_INVITE_METHODS)[number];

/** Hall Membership V1 permissions */
export const HALL_PERMISSIONS = [
  "view_hall_dashboard",
  "save_hall_favorites",
  "participate_votes",
  "manage_settings",
  "manage_members",
  "manage_billing",
  "manage_supplies",
  "manage_shopping_lists",
] as const;
export type HallPermission = (typeof HALL_PERMISSIONS)[number];

const MEMBER_PERMISSIONS: readonly HallPermission[] = [
  "view_hall_dashboard",
  "save_hall_favorites",
  "participate_votes",
];

const CANTEEN_PERMISSIONS: readonly HallPermission[] = [
  "manage_supplies",
  "manage_shopping_lists",
];

const CAPTAIN_PERMISSIONS: readonly HallPermission[] = [
  "manage_settings",
  "manage_members",
  "manage_billing",
];

const ROLE_PERMISSIONS: Record<HallRole, readonly HallPermission[]> = {
  member: MEMBER_PERMISSIONS,
  canteen_manager: [...MEMBER_PERMISSIONS, ...CANTEEN_PERMISSIONS],
  captain: [...MEMBER_PERMISSIONS, ...CAPTAIN_PERMISSIONS],
};

export const HALL_PERMISSION_LABELS: Record<HallPermission, string> = {
  view_hall_dashboard: "View hall dashboard",
  save_hall_favorites: "Save to hall favorites",
  participate_votes: "Participate in votes",
  manage_settings: "Manage settings",
  manage_members: "Manage members",
  manage_billing: "Manage Hall Pro subscription",
  manage_supplies: "Manage supplies",
  manage_shopping_lists: "Manage shopping lists",
};

export function hallRoleHasPermission(role: HallRole, permission: HallPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsForRole(role: HallRole): HallPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function normalizeHallRole(raw: string): HallRole {
  if (raw === "owner") return "captain";
  if (HALL_ROLES.includes(raw as HallRole)) return raw as HallRole;
  return "member";
}

import type { HallShiftKey } from "../hall-identity/shifts.js";
import { HALL_SHIFT_KEYS, DEFAULT_SHIFT_NAMES } from "../hall-identity/shifts.js";

export type { HallShiftKey, HallShiftInput } from "../hall-identity/shifts.js";
export { HALL_SHIFT_KEYS, DEFAULT_SHIFT_NAMES } from "../hall-identity/shifts.js";

export interface HallShiftRecord {
  shift_id: string;
  hall_id: string;
  shift_key: HallShiftKey;
  name: string;
  enabled: boolean;
  sort_order: number;
  member_count: number;
}

export interface HallRecord {
  hall_id: string;
  hall_name: string;
  station_number: string | null;
  /** Department name */
  department: string | null;
  department_name: string | null;
  city: string | null;
  province_state: string | null;
  postal_code: string | null;
  crew_size: number | null;
  hall_photo_url: string | null;
  motto: string | null;
  canteen_manager_user_id: string | null;
  canteen_manager_display_name: string | null;
  /** Enabled shift display names — derived from structured shifts */
  shift_names: string[];
  shifts: HallShiftRecord[];
  appliances: string[];
  join_code: string;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HallMemberRecord {
  hall_id: string;
  user_id: string;
  role: HallRole;
  shift_id: string | null;
  shift_name: string | null;
  shift_key: HallShiftKey | null;
  display_name: string | null;
  email: string | null;
  joined_at: string;
  permissions: HallPermission[];
}

export interface HallSummary {
  hall_id: string;
  hall_name: string;
  station_number: string | null;
  department: string | null;
  department_name: string | null;
  role: HallRole;
  member_count: number;
}

export interface HallInviteRecord {
  invite_id: string;
  hall_id: string;
  method: HallInviteMethod;
  invite_token: string | null;
  invite_code: string | null;
  invite_url: string | null;
  expires_at: string;
  max_uses: number | null;
  use_count: number;
  created_at: string;
}

export interface HallJoinPreview {
  hall_id: string;
  hall_name: string;
  station_number: string | null;
  department: string | null;
  department_name: string | null;
  city: string | null;
  province_state: string | null;
  member_count: number;
  invite_method?: HallInviteMethod;
}

export interface HallDetailPayload {
  hall: HallRecord;
  shifts: HallShiftRecord[];
  members: HallMemberRecord[];
  my_role: HallRole;
  my_permissions: HallPermission[];
  hall_pro: {
    active: boolean;
    status: "active" | "trialing" | "cancelled" | null;
    trial_started_at: string | null;
  };
}
