/**
 * Ensures any live Stripe-billed subscription is actually cancelled BEFORE a
 * Firehall Meals account is deleted — see PRE-LAUNCH STRIPE ACCOUNT-DELETION
 * BILLING GAP. Without this, deleteUserAccount() deletes the only local
 * record linking the user to a Stripe subscription (user_subscriptions),
 * leaving nothing to identify — let alone cancel — the subscription
 * afterward, while Stripe keeps billing the card on file indefinitely.
 *
 * Split out as a small, mostly-pure module (same pattern as
 * checkout-guard.ts) so the "what should happen" decision is unit-testable
 * without a live Stripe call — see scripts/test-privacy-consent.ts. The one
 * real network call (stripe.subscriptions.cancel) is injectable via
 * `deps.cancel` for the same reason, and so retries are exercised without
 * real Stripe credentials.
 *
 * Deliberately fails CLOSED: if Stripe cancellation cannot be confirmed, the
 * caller (DELETE /api/auth/account) must NOT proceed with deleteUserAccount —
 * an account must never be deleted while silently leaving an active Stripe
 * subscription still billing behind it. Callers must surface only a generic,
 * safe retry-later message to the client — never the underlying Stripe
 * error, customer id, or subscription id (see auth-routes.ts).
 *
 * Only ever considers `source === 'stripe'` rows. admin_grant and
 * self_select subscriptions were never billed through Stripe, so there is
 * nothing to cancel there, and Hall Pro lives entirely in the separate
 * hall_subscriptions table (keyed by hall_id, not user_id) — this module
 * never reads or writes it.
 */
import { logError } from "../logger.js";
import { getSubscriptionInfoForAccountDeletion, type SubscriptionInfoForAccountDeletion } from "./store.js";
import { getStripeClient } from "./stripe-client.js";

export type StripeDeletionAction =
  | { kind: "none" } // no subscription row, or not Stripe-sourced (admin_grant/self_select/free) — nothing to cancel
  | { kind: "already_lapsed" } // source='stripe' but already fully cancelled locally — nothing to cancel
  | { kind: "cancel"; stripeSubscriptionId: string }; // active/trialing/past_due Stripe subscription — must be cancelled now

/**
 * Pure decision logic — never touches the network or the database, so it's
 * trivially unit-testable. `status` values that still grant access
 * (active/trialing/past_due — see subscriptionGrantsAccess) all mean Stripe
 * still considers the subscription live and will keep charging the card on
 * file, regardless of `cancel_at_period_end`: that flag only means the
 * customer scheduled a *future* cancellation, which is moot once the whole
 * account is being deleted right now — we cancel immediately instead of
 * waiting for a period end nobody will be around to see.
 */
export function decideStripeDeletionAction(
  info: SubscriptionInfoForAccountDeletion | null,
): StripeDeletionAction {
  if (!info || info.source !== "stripe" || !info.stripeSubscriptionId) {
    return { kind: "none" };
  }
  if (info.status === "cancelled") {
    return { kind: "already_lapsed" };
  }
  return { kind: "cancel", stripeSubscriptionId: info.stripeSubscriptionId };
}

/**
 * True for the specific "this subscription is already gone at Stripe" error
 * shape (e.g. local status drifted from Stripe's actual state, or a retry
 * after a prior attempt that actually succeeded before the response was
 * lost) — treated as success, not failure, so retries stay idempotent.
 */
export function isAlreadyCancelledStripeError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const anyErr = err as { code?: unknown; message?: unknown };
  if (anyErr.code === "resource_missing") return true;
  const message = typeof anyErr.message === "string" ? anyErr.message : "";
  return /already\s*(been\s*)?cancel(l)?ed/i.test(message) || /no such subscription/i.test(message);
}

export type StripeSubscriptionCancelFn = (stripeSubscriptionId: string) => Promise<unknown>;

async function cancelViaLiveStripeClient(stripeSubscriptionId: string): Promise<unknown> {
  const stripe = getStripeClient();
  return stripe.subscriptions.cancel(stripeSubscriptionId);
}

export type StripeDeletionGuardResult =
  | { ok: true; action: "none" | "already_lapsed" | "cancelled" | "already_cancelled_at_stripe" }
  | { ok: false };

/**
 * Called from DELETE /api/auth/account BEFORE deleteUserAccount(). Resolves
 * the user's current subscription row itself (rather than trusting a value
 * passed in by the caller) so it always reflects the latest state at the
 * moment of deletion, and so a retry after a prior failure re-checks from
 * scratch rather than replaying stale state.
 */
export async function ensureStripeSubscriptionCancelledForDeletion(
  userId: string,
  deps: { cancel?: StripeSubscriptionCancelFn } = {},
): Promise<StripeDeletionGuardResult> {
  const info = getSubscriptionInfoForAccountDeletion(userId);
  const decision = decideStripeDeletionAction(info);

  if (decision.kind === "none") return { ok: true, action: "none" };
  if (decision.kind === "already_lapsed") return { ok: true, action: "already_lapsed" };

  const cancel = deps.cancel ?? cancelViaLiveStripeClient;
  try {
    await cancel(decision.stripeSubscriptionId);
    return { ok: true, action: "cancelled" };
  } catch (err) {
    if (isAlreadyCancelledStripeError(err)) {
      return { ok: true, action: "already_cancelled_at_stripe" };
    }
    // Fail closed — never expose Stripe error details/ids to the caller;
    // the route surfaces only a generic retry-later message to the client.
    logError("billing", `failed to cancel Stripe subscription before account deletion (user ${userId})`, err);
    return { ok: false };
  }
}
