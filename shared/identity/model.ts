/**
 * Personal-first identity model.
 *
 * Users own accounts. Hall membership is optional (zero or more halls).
 * Device-local data uses `client_id` — never confuse with membership `hall_id`.
 */

/** Product-facing actor — drives feature matrix and gating copy. */
export type ProductPersona =
  | "guest"
  | "signed_in_individual"
  | "hall_member"
  | "hall_admin";

/** Who owns a row or snapshot in storage. */
export type DataScope = "device" | "user" | "hall";

/** Membership hall role (server-backed). */
export type HallRole = "member" | "canteen_manager" | "captain";

export function isHallAdmin(role: HallRole): boolean {
  return role === "captain" || role === "canteen_manager";
}

/**
 * Stable device/client identifier for local snapshots.
 * NOT the same as `membership_hall_id` from `/api/halls`.
 */
export type ClientId = string;

/** Server hall entity id from `halls.hall_id`. */
export type MembershipHallId = string;

export interface UserIdentity {
  user_id: string | null;
  authenticated: boolean;
  persona: ProductPersona;
  membership_hall_ids: MembershipHallId[];
  hall_pro_hall_ids: MembershipHallId[];
}

export function resolveProductPersona(input: {
  authenticated: boolean;
  halls: Array<{ hall_id: string; my_role?: HallRole }>;
  activeHallId?: string | null;
}): ProductPersona {
  if (!input.authenticated) return "guest";
  if (input.halls.length === 0) return "signed_in_individual";
  const active =
    input.halls.find((h) => h.hall_id === input.activeHallId) ?? input.halls[0];
  if (active?.my_role === "captain" || active?.my_role === "canteen_manager") {
    return "hall_admin";
  }
  return "hall_member";
}

/** Feature domain — personal unless marked collaboration. */
export type FeatureDomain =
  | "authentication"
  | "profile"
  | "saved_meals"
  | "meal_history"
  | "favorites"
  | "shopping_personal"
  | "shopping_shared"
  | "votes"
  | "canteen"
  | "hall_grocery_planning"
  | "subscriptions_personal"
  | "subscriptions_hall";

export interface FeatureOwnership {
  domain: FeatureDomain;
  scope: DataScope;
  requires_membership_hall: boolean;
  requires_hall_pro: boolean;
  guest: "full" | "local" | "none";
  signed_in_individual: "full" | "local" | "none";
  hall_member: "full" | "local" | "none";
  hall_admin: "full" | "local" | "none";
  notes?: string;
}

export const FEATURE_OWNERSHIP: FeatureOwnership[] = [
  {
    domain: "authentication",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "local",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "Guest = no session; magic link / OAuth creates user account.",
  },
  {
    domain: "profile",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "local",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
  },
  {
    domain: "saved_meals",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "local",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "user_saved_recipes + firehall_saved_meals localStorage.",
  },
  {
    domain: "meal_history",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "local",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "Personal activity log; sync key personal_meal_history (legacy hall_history).",
  },
  {
    domain: "favorites",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "local",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "Pinned classics; sync key personal_favorites (legacy hall_favorites).",
  },
  {
    domain: "shopping_personal",
    scope: "device",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "full",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "Per-recipe modal export; no server list required.",
  },
  {
    domain: "shopping_shared",
    scope: "hall",
    requires_membership_hall: true,
    requires_hall_pro: true,
    guest: "none",
    signed_in_individual: "none",
    hall_member: "full",
    hall_admin: "full",
    notes: "hall_shopping_lists — collaboration only.",
  },
  {
    domain: "votes",
    scope: "hall",
    requires_membership_hall: true,
    requires_hall_pro: false,
    guest: "full",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "Basic Hall Vote free on Tonight. Advanced vote (history, deadlines, shift scope) = Hall Pro.",
  },
  {
    domain: "canteen",
    scope: "hall",
    requires_membership_hall: true,
    requires_hall_pro: true,
    guest: "none",
    signed_in_individual: "none",
    hall_member: "local",
    hall_admin: "full",
    notes: "View teaser possible; manage requires Pro + role.",
  },
  {
    domain: "hall_grocery_planning",
    scope: "hall",
    requires_membership_hall: true,
    requires_hall_pro: true,
    guest: "none",
    signed_in_individual: "none",
    hall_member: "full",
    hall_admin: "full",
    notes: "Crew grocery run + flyer deals — Hall Pro. Personal deals = Firefighter Plus.",
  },
  {
    domain: "subscriptions_personal",
    scope: "user",
    requires_membership_hall: false,
    requires_hall_pro: false,
    guest: "none",
    signed_in_individual: "full",
    hall_member: "full",
    hall_admin: "full",
    notes: "guest | personal plan on user_subscriptions.",
  },
  {
    domain: "subscriptions_hall",
    scope: "hall",
    requires_membership_hall: true,
    requires_hall_pro: false,
    guest: "none",
    signed_in_individual: "none",
    hall_member: "local",
    hall_admin: "full",
    notes: "hall_subscriptions; captain manages billing.",
  },
];
