import type { UserBillingState } from "@shared/billing/types";
import { BILLING_FEATURES } from "@shared/billing/types";

function allFeaturesFalse(): Record<(typeof BILLING_FEATURES)[number], boolean> {
  return Object.fromEntries(BILLING_FEATURES.map((f) => [f, false])) as Record<
    (typeof BILLING_FEATURES)[number],
    boolean
  >;
}

/** Guest billing when /api/auth/me has not loaded yet. */
export const GUEST_BILLING: UserBillingState = {
  plan_id: "guest",
  effective_plan_id: "guest",
  subscription: null,
  features: {
    ...allFeaturesFalse(),
    generator: true,
    wheel: true,
    browse: true,
  },
  hall_pro_hall_ids: [],
  hall_subscriptions: [],
  catalog: [],
};

export { hasFeature, requiredPlanForFeature } from "@shared/billing/types";
