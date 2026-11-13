import { hasPendingSync, runCloudSync } from "./coordinator";

/**
 * Account-owned data cached on this device. Cleared on sign-out so a shared
 * station tablet never merges one firefighter's meals, history or restrictions
 * into the next account that signs in. Device settings (units, install prompt,
 * onboarding/analytics ids) are intentionally kept.
 */
export const ACCOUNT_LOCAL_KEYS = [
  "firehall_saved_meals",
  "firehall_saved_meals_removed_v1",
  "firehall_hall_profile_v1",
  "firehall_hall_id_v1",
  "firehall_generator_v2",
  "firehall_generator_personal_v1",
  "firehall_filters",
  "firehall_shopping_session_v1",
  "firehall_shopping_history_v1",
  "firehall_pantry_profile_v1",
  "firehall_shopping_undo_v1",
  "firehall_tonight_selection_v1",
  "firehall_recent_meal_slugs_v1",
  "firehall_hall_history_v1",
  "firehall_hall_favorites_v1",
  "firehall_hall_favorites_imported_v1",
  "firehall_wheel_streak_v1",
  "firehall_wheel_streak_backfilled_v1",
  "firehall_hall_pantry_v1",
  "fh_sync_dirty_v1",
] as const;

export const SIGNED_OUT_FLAG = "fh_signed_out";

/** Push anything not yet synced so signing out never loses the user's own changes. */
export async function flushPendingSync(timeoutMs = 5000): Promise<void> {
  if (!hasPendingSync()) return;
  await Promise.race([runCloudSync("manual"), new Promise((resolve) => setTimeout(resolve, timeoutMs))]);
}

export function clearLocalAccountData(storage: Pick<Storage, "removeItem"> = localStorage): void {
  for (const key of ACCOUNT_LOCAL_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
