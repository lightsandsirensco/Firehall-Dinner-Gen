/**
 * Server-side "already subscribed" guard for /api/billing/checkout.
 *
 * Split out as a small pure function (same pattern as
 * server/generation/foods-to-avoid-gate.ts) so it's directly unit-testable —
 * see scripts/test-stripe-billing.ts. The Firehall Meals Pro card on /plans
 * already disables its own button once the user is on firefighter_plus
 * (see client/src/components/billing/plan-card.tsx `isCurrent`), but that is
 * a UX nicety only — this is the actual enforcement point, since the client
 * button being disabled never stops a hand-crafted POST to the route.
 *
 * Applies regardless of subscription `source` (admin_grant OR stripe): the
 * goal is simply "does this user already have working Pro access right
 * now?", not "do they already have a Stripe subscription specifically" —
 * either way, creating a brand-new paid Stripe subscription on top of
 * existing access would be an unwanted duplicate charge.
 *
 * A Stripe subscription that is still open in Stripe (including `past_due`
 * after the renewal grace period has run out) also blocks checkout: the
 * subscriber must fix payment in the Portal rather than start a second one.
 */
import {
  subscriptionGrantsAccess,
  subscriptionIsEntitled,
  type UserSubscription,
} from "../../shared/billing/types.js";

export function userAlreadyHasProAccess(
  subscription:
    | (Pick<UserSubscription, "plan_id" | "status"> &
        Partial<Pick<UserSubscription, "source" | "expires_at" | "past_due_since">>)
    | null
    | undefined,
): boolean {
  if (!subscription || subscription.plan_id !== "firefighter_plus") return false;
  if (subscription.source === "stripe" && subscriptionGrantsAccess(subscription.status)) return true;
  return subscriptionIsEntitled(subscription);
}
