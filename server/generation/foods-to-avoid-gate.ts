/**
 * Firehall Meals Pro — "Foods to Avoid" entitlement gate for the Generator.
 *
 * Split out as a small pure function (rather than inlined in server/routes.ts)
 * purely so it can be unit-tested directly — see scripts/test-ingredient-preferences.ts.
 * Canonical-key sanitization happens separately in server/sanitize-request.ts;
 * this is ONLY the Pro entitlement check, and it is always the final word: a
 * non-entitled user's requested list is forced back to `[]` regardless of what
 * the client sent (defense against a hand-crafted request body).
 */
import { hasFeature, type UserBillingState } from "../../shared/billing/types.js";

export function gateFoodsToAvoidByEntitlement(
  billing: Pick<UserBillingState, "features">,
  requested: readonly string[],
): string[] {
  if (requested.length === 0) return [];
  return hasFeature(billing.features, "ingredient_preferences") ? [...requested] : [];
}
