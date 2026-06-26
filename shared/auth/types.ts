import type { HallSummary } from "../hall-membership/types.js";
import type { UserBillingState } from "../billing/types.js";

export type AuthProvider = "guest" | "email" | "google" | "apple";

export interface UserAccount {
  user_id: string;
  email: string | null;
  auth_provider: AuthProvider;
  is_guest: boolean;
  hall_pro_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  profile_photo_url: string | null;
  department: string | null;
  hall_name: string | null;
  shift_label: string | null;
  crew_size: number | null;
}

export interface UserPreferences {
  preferred_proteins: string[];
  dietary_restrictions: string[];
  appliance_preferences: string[];
  shift_reminders_enabled: boolean;
  shift_days: number[];
  shift_reminder_time: string;
  shift_reminder_timezone: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: UserAccount | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  halls: HallSummary[];
  billing: UserBillingState;
}

export interface UserSavedRecipeRow {
  recipe_key: string;
  recipe_json: unknown;
  saved_at: string;
}

export interface AuthCapabilities {
  sync_saves: boolean;
  sync_personal_data: boolean;
  personal_meal_history: boolean;
  join_halls: boolean;
  create_halls: boolean;
  hall_pro: boolean;
  shift_reminders: boolean;
}

export function authCapabilities(
  user: UserAccount | null,
  billing?: UserBillingState | null,
): AuthCapabilities {
  const authenticated = Boolean(user && !user.is_guest);
  const features = billing?.features;
  return {
    sync_saves: Boolean(features?.cross_device_saves ?? authenticated),
    sync_personal_data: Boolean(features?.cross_device_saves ?? authenticated),
    personal_meal_history: Boolean(features?.personal_meal_history ?? authenticated),
    join_halls: authenticated,
    create_halls: authenticated,
    hall_pro: Boolean(billing?.hall_pro_hall_ids?.length),
    shift_reminders: Boolean(features?.shift_reminders ?? authenticated),
  };
}
