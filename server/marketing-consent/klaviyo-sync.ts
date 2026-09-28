/**
 * Thin glue between the Postgres consent/profile-data store and
 * server/klaviyo.ts's upsertKlaviyoProfile(). Used by Pro plan-change and
 * shop-purchase call sites so those files don't need their own Klaviyo
 * property-building logic. Never touches list membership/consent — see
 * upsertKlaviyoProfile()'s own docs for why that separation matters.
 */
import { logError } from "../logger.js";
import { upsertKlaviyoProfile } from "../klaviyo.js";
import { getKlaviyoProfilePropertiesForUser } from "./store.js";

/** Best-effort, non-blocking — a Klaviyo hiccup must never fail the caller's real operation. */
export async function syncKlaviyoProfileForUser(userId: string): Promise<void> {
  try {
    const props = await getKlaviyoProfilePropertiesForUser(userId);
    if (!props) return;
    await upsertKlaviyoProfile(props.email, props);
  } catch (err) {
    logError("klaviyo", "profile sync for user failed", err);
  }
}

/** For shop customers with no linked account (guest checkout) — profile-only, no PII beyond email. */
export async function syncKlaviyoProfileForEmail(email: string): Promise<void> {
  try {
    await upsertKlaviyoProfile(email, {});
  } catch (err) {
    logError("klaviyo", "profile sync for email failed", err);
  }
}
