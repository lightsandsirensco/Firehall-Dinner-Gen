import type { PlanId } from "../billing/types.js";
import type { HallRole } from "../hall-membership/types.js";
import type { MagicLinkFunnelStats } from "../analytics/events.js";

export type AdminSignupFilter =
  | "all"
  | "registered_users"
  | "email_leads_only"
  | "joined_hall"
  | "no_hall_yet"
  | "hall_admins"
  | "canteen_managers"
  | "hall_pro_trial"
  | "active_last_7_days"
  | "inactive";

export type AdminSignupRowType = "user" | "lead";

export interface AdminSignupRow {
  row_id: string;
  row_type: AdminSignupRowType;
  user_id: string | null;
  lead_id: string | null;
  hall_id: string | null;
  email: string;
  name: string;
  signup_date: string;
  signup_source: string;
  account_type: "registered" | "lead_only";
  last_active: string | null;
  hall_linked: boolean;
  hall_name: string | null;
  shift: string | null;
  role: HallRole | null;
  plan: PlanId | "guest" | "lead";
  hall_pro: boolean;
  hall_pro_trial: boolean;
  meals_generated: number;
  votes_created: number;
  recipes_saved: number;
  lead_source: string | null;
  klaviyo_synced: boolean;
  is_pilot_lead: boolean;
}

export interface AdminSignupListResponse {
  signups: AdminSignupRow[];
  total: number;
  filter: AdminSignupFilter;
  source_filter: string | null;
  query: string | null;
  magic_link_funnel?: MagicLinkFunnelStats;
}

export type AdminUserFilter =
  | "all"
  | "new_users"
  | "active_users"
  | "hall_members"
  | "hall_admins"
  | "personal_plan"
  | "hall_pro"
  | "no_hall"
  | "email_leads_only"
  | "pilot_leads";

export type AdminLeadFilter =
  | "all"
  | "homepage"
  | "generator"
  | "red_lead"
  | "hall_program"
  | "pricing"
  | "pilot"
  | "converted"
  | "not_converted"
  | "hall_created"
  | "shopping_list"
  | "klaviyo_only";

export type EmailLeadSource =
  | "homepage"
  | "generator"
  | "red_lead"
  | "hall_program"
  | "pricing"
  | "pilot"
  | "shopping_list"
  | "unknown";

export interface AdminUserRow {
  user_id: string;
  name: string;
  email: string | null;
  signup_date: string;
  last_active: string | null;
  plan: PlanId | "guest";
  hall_pro: boolean;
  hall_name: string | null;
  shift: string | null;
  hall_role: HallRole | null;
  meals_generated: number;
  votes_created: number;
  saved_recipes: number;
  email_capture_source: string | null;
  is_pilot_lead: boolean;
  auth_provider: string;
  is_guest: boolean;
}

export interface AdminUserListResponse {
  users: AdminUserRow[];
  total: number;
  filter: AdminUserFilter;
}

export interface AdminUserMembership {
  hall_id: string;
  hall_name: string;
  role: HallRole;
  shift_name: string | null;
  joined_at: string;
  hall_pro_active: boolean;
}

export interface AdminUserActivityItem {
  occurred_at: string;
  event_type: string;
  label: string;
  detail?: string;
}

export interface AdminUserSavedRecipe {
  recipe_slug: string;
  recipe_title: string;
  saved_at: string;
}

export interface AdminUserDetail {
  user: AdminUserRow;
  profile: {
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    department: string | null;
    profile_hall_name: string | null;
    shift_label: string | null;
    crew_size: number | null;
  } | null;
  memberships: AdminUserMembership[];
  billing: {
    personal_plan: PlanId | "guest";
    personal_status: string | null;
    hall_pro_halls: Array<{ hall_id: string; hall_name: string; status: string }>;
  };
  saved_recipes: AdminUserSavedRecipe[];
  activity: AdminUserActivityItem[];
  klaviyo: {
    on_list: boolean;
    lead_sources: string[];
    last_lead_at: string | null;
  };
  internal_notes: string;
  is_pilot_lead: boolean;
}

export interface AdminLeadRow {
  lead_id: string;
  email: string;
  source: EmailLeadSource;
  signup_form: string | null;
  captured_at: string;
  converted_to_user: boolean;
  converted_user_id: string | null;
  hall_created: boolean;
  last_activity: string | null;
  klaviyo_synced: boolean;
}

export interface AdminLeadListResponse {
  leads: AdminLeadRow[];
  total: number;
  filter: AdminLeadFilter;
}
