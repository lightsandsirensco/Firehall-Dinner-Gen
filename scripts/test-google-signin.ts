#!/usr/bin/env tsx
/**
 * GOOGLE SIGN-IN SAFETY — validates the auth_identities multi-identity model
 * added on top of the existing Google Identity Services (GIS) client/server
 * flow, without replacing it, adding passwords, or touching the session
 * system (auth_sessions) or Stripe billing architecture.
 *
 * Covers:
 *  1. Migration/backfill — idempotent, no duplicates, safe on a conflicting
 *     pre-existing data shape
 *  2. NEW GOOGLE USER — one user, one identity, one session
 *  3. RETURNING GOOGLE USER — resolves the same user_id, never a duplicate
 *  4. EXISTING EMAIL COLLISION — no silent merge, no duplicate, deliberate
 *     conflict result
 *  5. AUTHENTICATED LINK — same user_id, idempotent, ownership conflict
 *  6. IDENTITY OWNERSHIP — enforced by an actual database constraint
 *  7. DATA PRESERVATION — saves/preferences/Meal Memory/billing untouched by
 *     connecting Google to an existing account
 *  8. SECURITY — token verification hardening, CSRF, auth guards, and that
 *     the link route can never take a client-supplied user_id
 *  9. LOGOUT — provider-independent session revocation
 * 10. DELETION — auth_identities purged; a deleted Google user can sign up
 *     again as a genuinely new account; Stripe cancellation safety intact
 *
 *   npx tsx scripts/test-google-signin.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests, type SqliteDatabase } from "../server/sqlite.js";
import {
  bindAuthDb,
  createAuthSession,
  deleteUserAccount,
  findUserIdByIdentity,
  getAuthMe,
  getUserIdFromSessionToken,
  IdentityOwnershipConflictError,
  linkIdentity,
  listLinkedIdentityProviders,
  listSavedRecipes,
  resolveOAuthSignIn,
  revokeAuthSession,
  syncSavedRecipes,
  updateUserProfile,
  upsertEmailUser,
} from "../server/auth/auth-store.js";
import { verifyGoogleIdToken } from "../server/auth/oauth-verify.js";
import { requireCsrf } from "../server/csrf.js";
import { requireAuth, type AuthedRequest } from "../server/auth/auth-middleware.js";
import { bindHallMembershipDb } from "../server/hall-membership/store.js";
import {
  bindBillingDb,
  getUserSubscription,
  linkStripeCustomer,
  upsertStripeSubscription,
} from "../server/billing/store.js";
import { ensureStripeSubscriptionCancelledForDeletion } from "../server/billing/account-deletion-guard.js";
import { bindMealHistoryDb, recordMealCookedForUser, listMealHistoryForUser } from "../server/meal-history/store.js";
import { GOLDEN_100_RECIPES } from "../shared/golden-100/manifest.js";

// Full 014-048 chain (matches scripts/test-privacy-consent.ts) so every
// table deleteUserAccount() references actually exists, plus the new
// auth_identities migration under test.
const MIGRATIONS = [
  "014_user_accounts.sql",
  "015_hall_membership.sql",
  "016_billing.sql",
  "042_firefighter_plus_plan.sql",
  "017_user_cloud_sync.sql",
  "018_hall_shopping_lists.sql",
  "019_hall_supplies.sql",
  "020_shift_reminders.sql",
  "021_hall_analytics.sql",
  "022_hall_identity.sql",
  "023_hall_pro_subscription.sql",
  "024_hall_canteen.sql",
  "025_admin_users_leads.sql",
  "031_canteen_staples.sql",
  "032_canteen_staples_trim.sql",
  "033_hall_pro_collaboration.sql",
  "034_hall_notes.sql",
  "035_canteen_pickup_claims.sql",
  "036_hall_identity_profile.sql",
  "037_canteen_payment_tracker.sql",
  "039_founder_leads_meta.sql",
  "040_canteen_manager_v2.sql",
  "041_hall_ops_foundation.sql",
  "043_email_marketing_consent.sql",
  "045_ingredient_preferences.sql",
  "046_stripe_billing.sql",
  "047_user_meal_history.sql",
].map((name) => fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"));

const MIGRATION_048 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "048_auth_identities.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-google-signin-${Date.now()}.db`);

let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ok - ${name}`);
  } else {
    failed++;
    console.error(`  FAIL - ${name}${detail ? ` (${detail})` : ""}`);
  }
}

/** Minimal fake Express req/res for exercising middleware directly (no HTTP server needed) — same pattern as scripts/test-admin-billing.ts. */
function fakeReqRes(opts: { cookies?: Record<string, string>; headers?: Record<string, string> }) {
  let statusCode: number | undefined;
  let body: unknown;
  let nextCalled = false;
  const req = {
    cookies: opts.cookies ?? {},
    headers: opts.headers ?? {},
  } as unknown as AuthedRequest;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(payload: unknown) {
      body = payload;
      return this;
    },
  } as any;
  const next = () => {
    nextCalled = true;
  };
  return { req, res, next, getStatus: () => statusCode, getBody: () => body, wasNextCalled: () => nextCalled };
}

async function main(): Promise<void> {
  console.log("[test-google-signin] 1. Migration + backfill");
  {
    // Simulate a database with pre-existing (pre-auth_identities) users,
    // created the way the OLD upsertOAuthUser/upsertEmailUser code path did
    // — auth_provider + provider_subject on `users`, no auth_identities yet.
    const db = await openSqliteDatabase(tmpDb);
    for (const sql of MIGRATIONS) db.exec(sql);
    db.exec(`PRAGMA foreign_keys=OFF;`); // matches test-privacy-consent.ts precedent

    db.prepare(
      `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ('u_legacy_email', 'legacy-email@test.com', 'email', 0, 'legacy-email@test.com')`,
    ).run();
    db.prepare(
      `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ('u_legacy_google', 'legacy-google@test.com', 'google', 0, 'google-sub-legacy-1')`,
    ).run();
    db.prepare(
      `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ('u_legacy_apple', NULL, 'apple', 0, 'apple-sub-legacy-1')`,
    ).run();
    // A conflicting pre-existing data shape: two DIFFERENT users somehow
    // already share the same (auth_provider, provider_subject) pair. This
    // predates auth_identities and could only happen from a historical bug
    // — the backfill must not crash, must not duplicate, and must not
    // silently reassign ownership; only one of the two may end up backfilled.
    db.prepare(
      `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ('u_conflict_a', 'conflict-a@test.com', 'google', 0, 'dupe-sub')`,
    ).run();
    db.prepare(
      `INSERT INTO users (user_id, email, auth_provider, is_guest, provider_subject) VALUES ('u_conflict_b', 'conflict-b@test.com', 'google', 0, 'dupe-sub')`,
    ).run();

    assert.doesNotThrow(() => db.exec(MIGRATION_048), "migration 048 must not throw even with conflicting pre-existing data");

    const emailIdentity = db
      .prepare(`SELECT user_id FROM auth_identities WHERE provider = 'email' AND provider_subject = 'legacy-email@test.com'`)
      .get() as { user_id: string } | undefined;
    check("backfill: legacy email user gets an email identity", emailIdentity?.user_id === "u_legacy_email");

    const googleIdentity = db
      .prepare(`SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_subject = 'google-sub-legacy-1'`)
      .get() as { user_id: string } | undefined;
    check("backfill: legacy google user gets a google identity", googleIdentity?.user_id === "u_legacy_google");

    const appleIdentity = db
      .prepare(`SELECT user_id FROM auth_identities WHERE provider = 'apple' AND provider_subject = 'apple-sub-legacy-1'`)
      .get() as { user_id: string } | undefined;
    check("backfill: legacy apple user gets an apple identity", appleIdentity?.user_id === "u_legacy_apple");

    const conflictRows = db
      .prepare(`SELECT user_id FROM auth_identities WHERE provider = 'google' AND provider_subject = 'dupe-sub'`)
      .all() as Array<{ user_id: string }>;
    check(
      "backfill: conflicting pre-existing (provider, subject) pair never duplicates — exactly one row survives",
      conflictRows.length === 1 && (conflictRows[0].user_id === "u_conflict_a" || conflictRows[0].user_id === "u_conflict_b"),
      JSON.stringify(conflictRows),
    );

    const totalBefore = (db.prepare(`SELECT COUNT(*) AS c FROM auth_identities`).get() as { c: number }).c;
    assert.doesNotThrow(() => db.exec(MIGRATION_048), "re-running migration 048 must be safe (idempotent at the SQL level too)");
    const totalAfter = (db.prepare(`SELECT COUNT(*) AS c FROM auth_identities`).get() as { c: number }).c;
    check("backfill: re-applying the migration SQL never duplicates rows", totalBefore === totalAfter);

    releaseSqliteTimersForTests();
    try {
      fs.unlinkSync(tmpDb);
    } catch {
      /* ignore */
    }
  }

  // Fresh DB for all remaining sections — real production migration order.
  const tmpDb2 = path.join(os.tmpdir(), `fh-google-signin-2-${Date.now()}.db`);
  const db2 = await openSqliteDatabase(tmpDb2);
  for (const sql of MIGRATIONS) db2.exec(sql);
  db2.exec(`PRAGMA foreign_keys=OFF;`);
  db2.exec(MIGRATION_048);
  bindAuthDb(db2);
  bindHallMembershipDb(db2);
  bindBillingDb(db2);
  bindMealHistoryDb(db2);

  console.log("[test-google-signin] 2. NEW GOOGLE USER");
  let newGoogleUserId = "";
  {
    const result = resolveOAuthSignIn({
      provider: "google",
      subject: "google-sub-new-1",
      email: "newgoogle@test.com",
      firstName: "Sam",
      lastName: "Firefighter",
    });
    check("new google user: signed in", result.kind === "signed_in");
    if (result.kind === "signed_in") {
      check("new google user: isNew = true", result.isNew === true);
      newGoogleUserId = result.user.user_id;
      const userCount = (db2.prepare(`SELECT COUNT(*) AS c FROM users WHERE email = 'newgoogle@test.com'`).get() as { c: number }).c;
      check("new google user: exactly one user row created", userCount === 1);
      check(
        "new google user: identity row created and resolves to the same user_id",
        findUserIdByIdentity("google", "google-sub-new-1") === newGoogleUserId,
      );
      const me = getAuthMe(newGoogleUserId);
      check("new google user: session-eligible profile created", me.authenticated === true && me.profile?.first_name === "Sam");
    }
  }

  console.log("[test-google-signin] 3. RETURNING GOOGLE USER");
  {
    const result = resolveOAuthSignIn({
      provider: "google",
      subject: "google-sub-new-1",
      email: "newgoogle@test.com",
      firstName: "Sam",
      lastName: "Firefighter",
    });
    check("returning google user: signed in", result.kind === "signed_in");
    if (result.kind === "signed_in") {
      check("returning google user: isNew = false", result.isNew === false);
      check("returning google user: same user_id as before", result.user.user_id === newGoogleUserId);
      const userCount = (db2.prepare(`SELECT COUNT(*) AS c FROM users WHERE email = 'newgoogle@test.com'`).get() as { c: number }).c;
      check("returning google user: still exactly one user row (no duplicate)", userCount === 1);
    }
  }

  console.log("[test-google-signin] 4. EXISTING EMAIL ACCOUNT COLLISION");
  {
    const { user: emailUser } = upsertEmailUser("collide@test.com");
    const result = resolveOAuthSignIn({
      provider: "google",
      subject: "google-sub-collide-1",
      email: "collide@test.com",
    });
    check("email collision: deliberate conflict returned, not a sign-in", result.kind === "email_collision");
    if (result.kind === "email_collision") {
      check("email collision: existingEmail surfaced", result.existingEmail === "collide@test.com");
    }
    const userCount = (db2.prepare(`SELECT COUNT(*) AS c FROM users WHERE email = 'collide@test.com'`).get() as { c: number }).c;
    check("email collision: no duplicate user created", userCount === 1);
    check(
      "email collision: the Google subject is NOT linked to anyone",
      findUserIdByIdentity("google", "google-sub-collide-1") === null,
    );
    const stillEmailOwned = findUserIdByIdentity("email", "collide@test.com");
    check("email collision: original account ownership unchanged", stillEmailOwned === emailUser.user_id);
  }

  console.log("[test-google-signin] 5. AUTHENTICATED LINK (Connect Google)");
  let linkUserId = "";
  {
    const { user } = upsertEmailUser("linkme@test.com");
    linkUserId = user.user_id;
    assert.doesNotThrow(() => linkIdentity(linkUserId, "google", "google-sub-link-1", "linkme@test.com"));
    check(
      "connect google: identity resolves to the SAME user_id, not a new one",
      findUserIdByIdentity("google", "google-sub-link-1") === linkUserId,
    );
    const providers = listLinkedIdentityProviders(linkUserId);
    check("connect google: account now shows both email and google linked", providers.includes("email") && providers.includes("google"));

    // Idempotent re-link (e.g. double-click, or signing in again with the same Google account).
    assert.doesNotThrow(() => linkIdentity(linkUserId, "google", "google-sub-link-1", "linkme@test.com"));
    const rowCount = (
      db2
        .prepare(`SELECT COUNT(*) AS c FROM auth_identities WHERE provider = 'google' AND provider_subject = 'google-sub-link-1'`)
        .get() as { c: number }
    ).c;
    check("connect google: re-linking the same identity is idempotent (no duplicate row)", rowCount === 1);

    // Ownership conflict — a DIFFERENT user cannot claim an already-linked Google subject.
    const { user: otherUser } = upsertEmailUser("otherlinker@test.com");
    let threw = false;
    try {
      linkIdentity(otherUser.user_id, "google", "google-sub-link-1", "otherlinker@test.com");
    } catch (err) {
      threw = err instanceof IdentityOwnershipConflictError;
    }
    check("connect google: linking an already-owned Google subject to a different user throws a conflict", threw);
    check(
      "connect google: ownership was NOT reassigned by the failed attempt",
      findUserIdByIdentity("google", "google-sub-link-1") === linkUserId,
    );
  }

  console.log("[test-google-signin] 6. IDENTITY OWNERSHIP — database constraint");
  {
    let threw = false;
    try {
      // Bypass application logic entirely — raw INSERT of a second row for
      // an already-claimed (provider, subject) pair under a different
      // user_id. The PRIMARY KEY (provider, provider_subject) must reject
      // this at the database layer, independent of any application code.
      db2
        .prepare(
          `INSERT INTO auth_identities (provider, provider_subject, user_id) VALUES ('google', 'google-sub-link-1', 'some-other-user-id')`,
        )
        .run();
    } catch {
      threw = true;
    }
    check("database constraint: duplicate (provider, provider_subject) is rejected at the DB layer", threw);
  }

  console.log("[test-google-signin] 7. DATA PRESERVATION on Connect Google");
  {
    const { user } = upsertEmailUser("preserveme@test.com");
    const userId = user.user_id;
    updateUserProfile(userId, {
      first_name: "Preserve",
      crew_size: 5,
      preferred_proteins: ["chicken"],
      excluded_ingredients: [],
    });
    syncSavedRecipes(userId, [{ recipe_key: "test:preserve", recipe_json: { title: "Keep Me" }, saved_at: new Date().toISOString() }]);
    const slug = GOLDEN_100_RECIPES[0]!.slug;
    recordMealCookedForUser(userId, slug);
    linkStripeCustomer(userId, "cus_preserve_1");
    upsertStripeSubscription({
      userId,
      stripeCustomerId: "cus_preserve_1",
      stripeSubscriptionId: "sub_preserve_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    const before = {
      me: getAuthMe(userId),
      saves: listSavedRecipes(userId),
      history: listMealHistoryForUser(userId),
      sub: getUserSubscription(userId),
    };

    linkIdentity(userId, "google", "google-sub-preserve-1", "preserveme@test.com");

    const after = {
      me: getAuthMe(userId),
      saves: listSavedRecipes(userId),
      history: listMealHistoryForUser(userId),
      sub: getUserSubscription(userId),
    };

    check("data preservation: user_id unchanged", before.me.user?.user_id === after.me.user?.user_id);
    check("data preservation: account email unchanged", before.me.user?.email === after.me.user?.email);
    check("data preservation: profile unchanged", JSON.stringify(before.me.profile) === JSON.stringify(after.me.profile));
    check("data preservation: preferences unchanged", JSON.stringify(before.me.preferences) === JSON.stringify(after.me.preferences));
    check("data preservation: saved recipes unchanged", JSON.stringify(before.saves) === JSON.stringify(after.saves));
    check("data preservation: Meal Memory history unchanged", JSON.stringify(before.history) === JSON.stringify(after.history));
    check(
      "data preservation: Stripe subscription / Pro entitlement unchanged",
      JSON.stringify(before.sub) === JSON.stringify(after.sub) &&
        after.sub?.source === "stripe" &&
        after.sub?.status === "active",
    );
    check("data preservation: connecting google now shows up in linked_providers", after.me.linked_providers.includes("google"));
  }

  console.log("[test-google-signin] 8. SECURITY");
  {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    const originalFetch = global.fetch;
    const mockTokenInfo = (payload: Record<string, unknown>, ok = true) => {
      global.fetch = (async () =>
        ({
          ok,
          json: async () => payload,
        }) as unknown as Response) as typeof fetch;
    };
    const validBase = {
      sub: "sub-valid-1",
      aud: "test-client-id.apps.googleusercontent.com",
      iss: "https://accounts.google.com",
      exp: Math.floor(Date.now() / 1000) + 3600,
      email: "verified@test.com",
      email_verified: "true",
      given_name: "V",
      family_name: "User",
    };

    mockTokenInfo({}, false);
    await assert.rejects(() => verifyGoogleIdToken("bad"), undefined, "invalid token (non-ok response) must be rejected");
    check("security: invalid/non-ok token response rejected", true);

    mockTokenInfo({ ...validBase, aud: "some-other-client-id" });
    await assert.rejects(() => verifyGoogleIdToken("t"), /audience/i);
    check("security: wrong audience rejected", true);

    mockTokenInfo({ ...validBase, iss: "https://evil.example.com" });
    await assert.rejects(() => verifyGoogleIdToken("t"), /issuer/i);
    check("security: wrong issuer rejected", true);

    mockTokenInfo({ ...validBase, sub: undefined });
    await assert.rejects(() => verifyGoogleIdToken("t"), /subject/i);
    check("security: missing subject rejected", true);

    mockTokenInfo({ ...validBase, exp: Math.floor(Date.now() / 1000) - 3600 });
    await assert.rejects(() => verifyGoogleIdToken("t"), /expired/i);
    check("security: expired token rejected", true);

    mockTokenInfo({ ...validBase, email_verified: "false" });
    const unverified = await verifyGoogleIdToken("t");
    check("security: unverified email is treated as absent, not trusted", unverified.email === null);

    mockTokenInfo(validBase);
    const verified = await verifyGoogleIdToken("t");
    check("security: verified email is passed through", verified.email === "verified@test.com");
    check("security: valid token yields the expected subject", verified.subject === "sub-valid-1");

    global.fetch = originalFetch;
    delete process.env.GOOGLE_CLIENT_ID;

    // --- CSRF ---
    {
      const { req, res, next, getStatus, wasNextCalled } = fakeReqRes({});
      requireCsrf(req, res, next);
      check("security: missing CSRF token rejected (403)", getStatus() === 403 && !wasNextCalled());
    }
    {
      const { req, res, next, getStatus, wasNextCalled } = fakeReqRes({
        cookies: { csrf_token: "abc" },
        headers: { "x-csrf-token": "different" },
      });
      requireCsrf(req, res, next);
      check("security: mismatched CSRF cookie/header rejected (403)", getStatus() === 403 && !wasNextCalled());
    }
    {
      const { req, res, next, wasNextCalled } = fakeReqRes({
        cookies: { csrf_token: "abc" },
        headers: { "x-csrf-token": "abc" },
      });
      requireCsrf(req, res, next);
      check("security: matching CSRF cookie/header passes", wasNextCalled());
    }

    // --- Unauthenticated linking rejected ---
    {
      const { req, res, next, getStatus, wasNextCalled } = fakeReqRes({});
      requireAuth(req, res, next);
      check("security: unauthenticated request to an auth-required route rejected (401)", getStatus() === 401 && !wasNextCalled());
    }
    {
      const session = createAuthSession(linkUserId, false);
      const { req, res, next, wasNextCalled } = fakeReqRes({ cookies: { fh_auth: session.token } });
      requireAuth(req, res, next);
      check("security: valid session cookie passes requireAuth", wasNextCalled() && req._authUserId === linkUserId);
    }

    // --- Client-supplied user_id cannot redirect identity ownership ---
    // The /api/auth/google/link route handler must resolve its target
    // account ONLY from req._authUserId (the session), never from the
    // request body — verified directly against the route's own source, the
    // same "assert on route source text" pattern used by
    // scripts/test-admin-billing.ts for admin route ownership checks.
    {
      const routesSource = fs.readFileSync(path.join(process.cwd(), "server", "auth", "auth-routes.ts"), "utf8");
      const linkRouteMatch = routesSource.match(/"\/api\/auth\/google\/link"[\s\S]*?\n {2}\);/);
      check("security: /api/auth/google/link route is present in source", Boolean(linkRouteMatch));
      const routeBody = linkRouteMatch?.[0] ?? "";
      check(
        "security: link route resolves the target user ONLY from req._authUserId",
        /req\._authUserId/.test(routeBody),
      );
      check(
        "security: link route never reads a user id from the request body",
        !/body\.user_id/i.test(routeBody) && !/body\?\.user_id/i.test(routeBody),
      );
    }
  }

  console.log("[test-google-signin] 9. LOGOUT — provider-independent");
  {
    const session = createAuthSession(newGoogleUserId, false);
    check("logout: session resolves before logout", getUserIdFromSessionToken(session.token) === newGoogleUserId);
    revokeAuthSession(session.token);
    check("logout: session no longer resolves after logout, regardless of sign-in provider", getUserIdFromSessionToken(session.token) === null);
  }

  console.log("[test-google-signin] 10. DELETION");
  {
    const deletedGoogleSubject = "google-sub-to-delete-1";
    const first = resolveOAuthSignIn({ provider: "google", subject: deletedGoogleSubject, email: "deleteme-google@test.com" });
    assert.equal(first.kind, "signed_in");
    const firstUserId = first.kind === "signed_in" ? first.user.user_id : "";
    linkIdentity(firstUserId, "email", "deleteme-google-alt@test.com", "deleteme-google-alt@test.com");

    check(
      "deletion: identities exist before deletion",
      listLinkedIdentityProviders(firstUserId).length > 0,
    );

    // Stripe safety — an active Stripe subscription must still be cancelled
    // before deletion proceeds; auth_identities changes must not weaken this.
    linkStripeCustomer(firstUserId, "cus_delete_google_1");
    upsertStripeSubscription({
      userId: firstUserId,
      stripeCustomerId: "cus_delete_google_1",
      stripeSubscriptionId: "sub_delete_google_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });
    const cancelCalls: string[] = [];
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(firstUserId, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    check("deletion: Stripe guard cancels the live subscription before deletion", guardResult.ok && cancelCalls.length === 1);

    const deleted = deleteUserAccount(firstUserId);
    check("deletion: account deletion succeeds", deleted.ok === true);
    check(
      "deletion: auth_identities rows for this user are gone",
      (db2.prepare(`SELECT COUNT(*) AS c FROM auth_identities WHERE user_id = ?`).get(firstUserId) as { c: number }).c === 0,
    );
    check(
      "deletion: findUserIdByIdentity no longer resolves the deleted user's Google subject",
      findUserIdByIdentity("google", deletedGoogleSubject) === null,
    );

    // A deleted Google user can create a genuinely NEW account later.
    const second = resolveOAuthSignIn({ provider: "google", subject: deletedGoogleSubject, email: "deleteme-google@test.com" });
    check("deletion: signing in again with the same Google subject creates a genuinely new account", second.kind === "signed_in");
    if (second.kind === "signed_in") {
      check("deletion: the new account has a DIFFERENT user_id than the deleted one", second.user.user_id !== firstUserId);
      check("deletion: the new account is marked isNew", second.isNew === true);
    }
  }

  releaseSqliteTimersForTests();
  try {
    fs.unlinkSync(tmpDb2);
  } catch {
    /* ignore */
  }

  if (failed > 0) {
    console.error(`\n[test-google-signin] FAILED — ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\n[test-google-signin] OK");
}

main().catch((err) => {
  console.error("[test-google-signin] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
