#!/usr/bin/env tsx
/**
 * Validates PRE-LEGAL PRIVACY + CONSENT PRODUCT FIXES:
 * - marketing consent recording on email_leads (default false, escalate-only,
 *   never backfilled/inferred)
 * - self-service account deletion (deletes private data, revokes sessions,
 *   preserves shared Hall content)
 * - nutrition + dietary/allergen disclaimer copy is present and consistent
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests, type SqliteDatabase } from "../server/sqlite.js";
import { bindAuthDb, createAuthSession, deleteUserAccount, updateUserProfile, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall, joinHall } from "../server/hall-membership/store.js";
import {
  adminSetUserPlan,
  bindBillingDb,
  getUserSubscription,
  linkStripeCustomer,
  upsertStripeSubscription,
} from "../server/billing/store.js";
import {
  decideStripeDeletionAction,
  ensureStripeSubscriptionCancelledForDeletion,
  isAlreadyCancelledStripeError,
} from "../server/billing/account-deletion-guard.js";
import { bindAdminLeadsDb, recordEmailLead } from "../server/admin-users/leads-store.js";
import { bindAdminUsersDb } from "../server/admin-users/store.js";

// Full 014-047 chain (in order) so every Hall/canteen table referenced by
// deleteUserAccount's reference-integrity cleanup actually exists, matching
// the real migration history (later migrations rename/recreate several
// canteen tables, so partial subsets can produce a schema that doesn't match
// production). Also includes 042/046 (Firehall Meals Pro + Stripe billing
// columns) so the PRE-LAUNCH STRIPE ACCOUNT-DELETION BILLING GAP fix can be
// exercised against a real user_subscriptions schema below.
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
  "046_stripe_billing.sql",
  "047_user_meal_history.sql",
].map((name) => fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"));

const tmpDb = path.join(os.tmpdir(), `fh-privacy-consent-${Date.now()}.db`);

function getLeadConsent(
  db: SqliteDatabase,
  email: string,
  source: string,
): { marketing_consent: number; consent_captured_at: string | null } | undefined {
  return db
    .prepare(
      `SELECT marketing_consent, consent_captured_at FROM email_leads WHERE email = ? AND source = ?`,
    )
    .get(email, source) as { marketing_consent: number; consent_captured_at: string | null } | undefined;
}

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  // Several migration files (006, 044, 046, ...) end with a raw
  // `PRAGMA foreign_keys=ON;` statement used only to let them rebuild a
  // table mid-migration (SQLite can't ALTER a CHECK constraint in place).
  // db.exec() runs that literal SQL against the real engine (unlike the
  // app's own no-op SqliteDatabase#pragma() wrapper), so it has a real,
  // persistent side effect on this connection. Restored to OFF here to
  // match this suite's long-standing behavior/scope — real FK-cascade
  // interaction with shared Hall content (e.g. hall_notes.author_user_id
  // ON DELETE CASCADE) is a separate, pre-existing concern outside this
  // task and is intentionally not addressed here.
  db.exec(`PRAGMA foreign_keys=OFF;`);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindAdminUsersDb(db);
  bindAdminLeadsDb(db);

  // --- Marketing consent: defaults to false ---------------------------------
  recordEmailLead({ email: "norecipe@firehall.test", source: "generator" });
  const noConsent = getLeadConsent(db, "norecipe@firehall.test", "generator");
  assert.ok(noConsent, "lead should be recorded even without consent");
  assert.equal(noConsent!.marketing_consent, 0, "consent must default to false/0");
  assert.equal(noConsent!.consent_captured_at, null, "no consent timestamp without affirmative consent");

  // --- Marketing consent: affirmative consent recorded ----------------------
  recordEmailLead({ email: "optedin@firehall.test", source: "generator", marketing_consent: true });
  const consented = getLeadConsent(db, "optedin@firehall.test", "generator");
  assert.equal(consented!.marketing_consent, 1, "affirmative consent must be stored as 1");
  assert.ok(consented!.consent_captured_at, "consent timestamp must be recorded when consent is given");

  // --- Marketing consent: escalate-only, never silently revoked -------------
  const firstTimestamp = consented!.consent_captured_at;
  recordEmailLead({ email: "optedin@firehall.test", source: "generator" }); // no consent field this time
  const stillConsented = getLeadConsent(db, "optedin@firehall.test", "generator");
  assert.equal(stillConsented!.marketing_consent, 1, "a later submission without consent must not revoke prior consent");
  assert.equal(stillConsented!.consent_captured_at, firstTimestamp, "first consent timestamp must not be overwritten");

  // --- Marketing consent: historical/unknown leads are NOT treated as yes ---
  // Simulates a pre-existing row from before this migration (no marketing_consent
  // recorded) — the additive ALTER TABLE default must leave it at 0, not backfilled.
  db.prepare(
    `INSERT INTO email_leads (lead_id, email, source, captured_at, last_activity_at, klaviyo_synced, metadata_json)
     VALUES ('legacy1', 'legacy@firehall.test', 'homepage', datetime('now'), datetime('now'), 1, NULL)`,
  ).run();
  const legacy = getLeadConsent(db, "legacy@firehall.test", "homepage");
  assert.equal(legacy!.marketing_consent, 0, "pre-existing/historical leads must not be treated as consented");

  // --- Account deletion: deletes private data, preserves shared Hall data ---
  const { user } = upsertEmailUser("deleteme@firehall.test");
  updateUserProfile(user.user_id, { first_name: "Test", crew_size: 4 });
  const session = createAuthSession(user.user_id, false);
  assert.ok(session.token);

  const hall = createHall(user.user_id, {
    hall_name: "Station 99",
    station_number: "99",
    department: "Test City",
    crew_size: 6,
    shift_names: ["A"],
    appliances: ["stove"],
  });
  const { user: teammate } = upsertEmailUser("teammate@firehall.test");
  joinHall(teammate.user_id, { hall_id: hall.hall.hall_id });

  recordEmailLead({ email: "deleteme@firehall.test", source: "generator" });

  // --- Set up every kind of Hall/canteen user-reference that could dangle --
  const hallId = hall.hall.hall_id;

  // Nullable "who did this" attribution references (should be cleared to NULL).
  db.prepare(`UPDATE halls SET canteen_manager_user_id = ? WHERE hall_id = ?`).run(user.user_id, hallId);
  db.prepare(
    `INSERT INTO hall_invites (invite_id, hall_id, method, created_by_user_id, expires_at)
     VALUES ('inv1', ?, 'link', ?, datetime('now', '+3 days'))`,
  ).run(hallId, user.user_id);
  db.prepare(
    `INSERT INTO hall_shopping_lists (list_id, hall_id, runner_user_id, created_by_user_id)
     VALUES ('list1', ?, ?, ?)`,
  ).run(hallId, user.user_id, user.user_id);
  db.prepare(
    `INSERT INTO hall_canteen_items (item_id, hall_id, name, category, submitted_by_user_id, last_updated_by_user_id, picked_up_by_user_id, preferred_buyer_user_id)
     VALUES ('item1', ?, 'Coffee', 'pantry', ?, ?, ?, ?)`,
  ).run(hallId, user.user_id, user.user_id, user.user_id, user.user_id);

  // NOT NULL "own row" references (row should be deleted entirely, like hall_memberships).
  db.prepare(
    `INSERT INTO hall_canteen_dues_members (enrollment_id, hall_id, user_id, frequency, next_due_date)
     VALUES ('enroll1', ?, ?, 'monthly', date('now', '+30 days'))`,
  ).run(hallId, user.user_id);
  db.prepare(`INSERT INTO hall_logbook_reads (hall_id, user_id) VALUES (?, ?)`).run(hallId, user.user_id);

  // Shared/historical NOT NULL content — intentionally left dangling (reported constraint).
  db.prepare(
    `INSERT INTO hall_notes (note_id, hall_id, author_user_id, message, created_at, updated_at)
     VALUES ('note1', ?, ?, 'Grab more coffee', datetime('now'), datetime('now'))`,
  ).run(hallId, user.user_id);
  db.prepare(
    `INSERT INTO hall_canteen_dues_history (history_id, hall_id, user_id, marked_by_user_id, due_date_at_payment, frequency)
     VALUES ('paid1', ?, ?, ?, date('now'), 'monthly')`,
  ).run(hallId, user.user_id, user.user_id);

  // Sanity: rows exist before deletion.
  assert.ok(db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(user.user_id));
  assert.ok(db.prepare(`SELECT 1 FROM user_profiles WHERE user_id = ?`).get(user.user_id));
  assert.ok(db.prepare(`SELECT 1 FROM auth_sessions WHERE user_id = ?`).get(user.user_id));
  assert.ok(db.prepare(`SELECT 1 FROM hall_memberships WHERE user_id = ?`).get(user.user_id));
  assert.ok(db.prepare(`SELECT 1 FROM email_leads WHERE lower(email) = 'deleteme@firehall.test'`).get());
  assert.equal(
    (db.prepare(`SELECT canteen_manager_user_id FROM halls WHERE hall_id = ?`).get(hallId) as any)
      .canteen_manager_user_id,
    user.user_id,
    "sanity: canteen manager should be set before deletion",
  );

  const result = deleteUserAccount(user.user_id);
  assert.equal(result.ok, true);
  assert.equal(result.email, "deleteme@firehall.test");

  // Private data is gone.
  assert.equal(db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(user.user_id), undefined, "user row must be deleted");
  assert.equal(db.prepare(`SELECT 1 FROM user_profiles WHERE user_id = ?`).get(user.user_id), undefined, "profile must be deleted");
  assert.equal(
    db.prepare(`SELECT 1 FROM auth_sessions WHERE user_id = ?`).get(user.user_id),
    undefined,
    "sessions must be revoked (deleted)",
  );
  assert.equal(
    db.prepare(`SELECT 1 FROM hall_memberships WHERE user_id = ?`).get(user.user_id),
    undefined,
    "this user's hall membership must be removed",
  );
  assert.equal(
    db.prepare(`SELECT 1 FROM email_leads WHERE lower(email) = 'deleteme@firehall.test'`).get(),
    undefined,
    "matching email_leads row must be removed",
  );

  // Shared Hall content and other members are untouched.
  assert.ok(
    db.prepare(`SELECT 1 FROM halls WHERE hall_id = ?`).get(hallId),
    "the Hall itself must NOT be deleted when its creator deletes their account",
  );
  assert.ok(
    db.prepare(`SELECT 1 FROM hall_memberships WHERE user_id = ?`).get(teammate.user_id),
    "other members' hall memberships must be unaffected",
  );

  // --- No Hall user-reference points to the deleted user --------------------
  const hallRow = db
    .prepare(`SELECT created_by_user_id, canteen_manager_user_id FROM halls WHERE hall_id = ?`)
    .get(hallId) as { created_by_user_id: string | null; canteen_manager_user_id: string | null };
  assert.equal(hallRow.created_by_user_id, null, "halls.created_by_user_id must be cleared, not dangling");
  assert.equal(hallRow.canteen_manager_user_id, null, "halls.canteen_manager_user_id must be cleared, not dangling");

  const inviteRow = db.prepare(`SELECT created_by_user_id FROM hall_invites WHERE invite_id = 'inv1'`).get() as {
    created_by_user_id: string | null;
  };
  assert.equal(inviteRow.created_by_user_id, null, "hall_invites.created_by_user_id must be cleared");

  const listRow = db
    .prepare(`SELECT runner_user_id, created_by_user_id FROM hall_shopping_lists WHERE list_id = 'list1'`)
    .get() as { runner_user_id: string | null; created_by_user_id: string | null };
  assert.equal(listRow.runner_user_id, null, "hall_shopping_lists.runner_user_id must be cleared");
  assert.equal(listRow.created_by_user_id, null, "hall_shopping_lists.created_by_user_id must be cleared");

  const itemRow = db
    .prepare(
      `SELECT submitted_by_user_id, last_updated_by_user_id, picked_up_by_user_id, preferred_buyer_user_id
       FROM hall_canteen_items WHERE item_id = 'item1'`,
    )
    .get() as Record<string, string | null>;
  assert.equal(itemRow.submitted_by_user_id, null, "hall_canteen_items.submitted_by_user_id must be cleared");
  assert.equal(itemRow.last_updated_by_user_id, null, "hall_canteen_items.last_updated_by_user_id must be cleared");
  assert.equal(itemRow.picked_up_by_user_id, null, "hall_canteen_items.picked_up_by_user_id must be cleared");
  assert.equal(itemRow.preferred_buyer_user_id, null, "hall_canteen_items.preferred_buyer_user_id must be cleared");

  // The deleted user's own dues enrollment / logbook-read rows are removed (not left dangling).
  assert.equal(
    db.prepare(`SELECT 1 FROM hall_canteen_dues_members WHERE user_id = ?`).get(user.user_id),
    undefined,
    "the deleted user's own dues enrollment row must be removed",
  );
  assert.equal(
    db.prepare(`SELECT 1 FROM hall_logbook_reads WHERE user_id = ?`).get(user.user_id),
    undefined,
    "the deleted user's own logbook-read marker must be removed",
  );

  // --- Canteen/shared Hall data is not accidentally destroyed ----------------
  assert.ok(
    db.prepare(`SELECT 1 FROM hall_canteen_items WHERE item_id = 'item1'`).get(),
    "the canteen item itself (shared Hall inventory) must survive — only attribution is cleared",
  );
  assert.ok(
    db.prepare(`SELECT 1 FROM hall_shopping_lists WHERE list_id = 'list1'`).get(),
    "the shared shopping list itself must survive",
  );
  // Shared/historical content with a NOT NULL author/user column is a known,
  // reported constraint — left dangling rather than guessing at a deletion
  // or anonymization policy for shared Hall content.
  assert.ok(
    db.prepare(`SELECT 1 FROM hall_notes WHERE note_id = 'note1'`).get(),
    "shared hall_notes content must be preserved (author reference intentionally left dangling)",
  );
  assert.ok(
    db.prepare(`SELECT 1 FROM hall_canteen_dues_history WHERE history_id = 'paid1'`).get(),
    "historical dues payment record must be preserved for Hall accounting integrity",
  );

  // Deleting again is a safe no-op (idempotent, no throw).
  const secondDelete = deleteUserAccount(user.user_id);
  assert.equal(secondDelete.ok, true);
  assert.equal(secondDelete.email, null);
  assert.ok(
    db.prepare(`SELECT 1 FROM halls WHERE hall_id = ?`).get(hallId),
    "idempotent second deletion must not affect the Hall either",
  );

  // --- PRE-LAUNCH STRIPE ACCOUNT-DELETION BILLING GAP -----------------------
  // deleteUserAccount() must never run while an active Stripe subscription
  // is left uncancelled — see billing/account-deletion-guard.ts. These cases
  // exercise the guard itself (pure decision + injectable Stripe call) and
  // its wiring in front of deleteUserAccount for every relevant local state.

  // 1) Active Stripe subscription — must be cancelled, deletion proceeds.
  {
    const { user: proUser } = upsertEmailUser("stripe-active@firehall.test");
    linkStripeCustomer(proUser.user_id, "cus_active_1");
    upsertStripeSubscription({
      userId: proUser.user_id,
      stripeCustomerId: "cus_active_1",
      stripeSubscriptionId: "sub_active_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    const cancelCalls: string[] = [];
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(proUser.user_id, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "cancelled");
    assert.deepEqual(cancelCalls, ["sub_active_1"], "an active Stripe subscription must be cancelled immediately");

    const deleted = deleteUserAccount(proUser.user_id);
    assert.equal(deleted.ok, true);
    assert.equal(db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(proUser.user_id), undefined);
    assert.equal(
      db.prepare(`SELECT 1 FROM user_subscriptions WHERE user_id = ?`).get(proUser.user_id),
      undefined,
      "user_subscriptions row must be gone after deletion",
    );
  }

  // 2) Past-due Stripe subscription — still considered live/billable, must be cancelled.
  {
    const { user: pastDueUser } = upsertEmailUser("stripe-pastdue@firehall.test");
    linkStripeCustomer(pastDueUser.user_id, "cus_pastdue_1");
    upsertStripeSubscription({
      userId: pastDueUser.user_id,
      stripeCustomerId: "cus_pastdue_1",
      stripeSubscriptionId: "sub_pastdue_1",
      stripePriceId: "price_monthly",
      status: "past_due",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    const cancelCalls: string[] = [];
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(pastDueUser.user_id, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "cancelled");
    assert.deepEqual(cancelCalls, ["sub_pastdue_1"], "past_due is still a live/billable Stripe subscription");

    const deleted = deleteUserAccount(pastDueUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 3) Already-cancelled Stripe subscription — no Stripe call needed, deletion proceeds.
  {
    const { user: cancelledUser } = upsertEmailUser("stripe-cancelled@firehall.test");
    linkStripeCustomer(cancelledUser.user_id, "cus_cancelled_1");
    upsertStripeSubscription({
      userId: cancelledUser.user_id,
      stripeCustomerId: "cus_cancelled_1",
      stripeSubscriptionId: "sub_cancelled_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });
    db.prepare(`UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = ?`).run(cancelledUser.user_id);

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(cancelledUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "already_lapsed");
    assert.equal(cancelCalled, false, "an already-cancelled Stripe subscription must not trigger another cancel call");

    const deleted = deleteUserAccount(cancelledUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 4) Admin-granted Pro — never a Stripe subscription, must never call Stripe.
  {
    const { user: grantedUser } = upsertEmailUser("stripe-admingrant@firehall.test");
    adminSetUserPlan(grantedUser.user_id, "firefighter_plus");
    assert.equal(getUserSubscription(grantedUser.user_id)?.source, "admin_grant");

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(grantedUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "none");
    assert.equal(cancelCalled, false, "admin_grant subscriptions must never be sent to Stripe for cancellation");

    const deleted = deleteUserAccount(grantedUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 5) Free user (no subscription row at all) — must never call Stripe.
  {
    const { user: freeUser } = upsertEmailUser("stripe-free@firehall.test");
    assert.equal(getUserSubscription(freeUser.user_id), null);

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(freeUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "none");
    assert.equal(cancelCalled, false, "a free user with no subscription row must never call Stripe");

    const deleted = deleteUserAccount(freeUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 6) Stripe API cancellation failure — deletion must be BLOCKED, account preserved.
  {
    const { user: failUser } = upsertEmailUser("stripe-failure@firehall.test");
    linkStripeCustomer(failUser.user_id, "cus_failure_1");
    upsertStripeSubscription({
      userId: failUser.user_id,
      stripeCustomerId: "cus_failure_1",
      stripeSubscriptionId: "sub_failure_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(failUser.user_id, {
      cancel: async () => {
        throw new Error("stripe_test: simulated network/API failure");
      },
    });
    assert.equal(guardResult.ok, false, "a genuine Stripe API failure must fail the guard, not be swallowed");

    // The route never calls deleteUserAccount() when the guard fails — assert
    // the account/subscription are both still fully intact afterward.
    assert.ok(db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(failUser.user_id), "account must NOT be deleted when Stripe cancellation fails");
    assert.ok(
      db.prepare(`SELECT 1 FROM user_subscriptions WHERE user_id = ?`).get(failUser.user_id),
      "the Stripe-linked subscription row must still be present so a retry can find it",
    );

    // Retry after the transient failure clears — must succeed and proceed.
    const retryResult = await ensureStripeSubscriptionCancelledForDeletion(failUser.user_id, {
      cancel: async () => undefined,
    });
    assert.equal(retryResult.ok, true, "retrying after a transient Stripe failure must succeed");
    const deleted = deleteUserAccount(failUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // --- Retry idempotency: a prior attempt that actually succeeded at Stripe
  // (response lost locally) must not be treated as a hard failure on retry ---
  {
    assert.equal(isAlreadyCancelledStripeError({ code: "resource_missing", message: "No such subscription" }), true);
    assert.equal(
      isAlreadyCancelledStripeError({ message: "This subscription has already been canceled." }),
      true,
    );
    assert.equal(isAlreadyCancelledStripeError({ message: "Rate limit exceeded" }), false);
    assert.equal(isAlreadyCancelledStripeError(new Error("network timeout")), false);

    const { user: raceUser } = upsertEmailUser("stripe-already-at-stripe@firehall.test");
    linkStripeCustomer(raceUser.user_id, "cus_race_1");
    upsertStripeSubscription({
      userId: raceUser.user_id,
      stripeCustomerId: "cus_race_1",
      stripeSubscriptionId: "sub_race_1",
      stripePriceId: "price_monthly",
      status: "active", // local state hasn't caught up to Stripe yet
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(raceUser.user_id, {
      cancel: async () => {
        throw { code: "resource_missing", message: "No such subscription: 'sub_race_1'" };
      },
    });
    assert.equal(guardResult.ok, true, "Stripe already having no such subscription must be treated as success");
    assert.equal((guardResult as { action: string }).action, "already_cancelled_at_stripe");
    const deleted = deleteUserAccount(raceUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // --- Pure decision function coverage (no network/DB involved) -------------
  assert.deepEqual(decideStripeDeletionAction(null), { kind: "none" });
  assert.deepEqual(
    decideStripeDeletionAction({ source: "admin_grant", status: "active", stripeSubscriptionId: null }),
    { kind: "none" },
    "admin_grant must never be sent to Stripe, even if a stray subscription id existed",
  );
  assert.deepEqual(
    decideStripeDeletionAction({ source: "self_select", status: "active", stripeSubscriptionId: null }),
    { kind: "none" },
  );
  assert.deepEqual(
    decideStripeDeletionAction({ source: "stripe", status: "trialing", stripeSubscriptionId: "sub_x" }),
    { kind: "cancel", stripeSubscriptionId: "sub_x" },
    "trialing Stripe subscriptions must still be cancelled on deletion",
  );
  assert.deepEqual(
    decideStripeDeletionAction({ source: "stripe", status: "cancelled", stripeSubscriptionId: "sub_x" }),
    { kind: "already_lapsed" },
  );
  assert.deepEqual(
    decideStripeDeletionAction({ source: "stripe", status: "active", stripeSubscriptionId: null }),
    { kind: "unresolvable" },
    "a corrupt/incomplete source='stripe' row with no subscription id must fail closed, not be treated as 'none'",
  );

  // 7) Corrupt/incomplete Stripe row (source='stripe', still-billable status,
  // but no stripe_subscription_id on file) — deletion must be BLOCKED, since
  // there is no id to verify/cancel by and the subscription may still be live.
  {
    const { user: corruptUser } = upsertEmailUser("stripe-corrupt-row@firehall.test");
    db.prepare(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, source, selected_at, updated_at)
       VALUES (?, 'firefighter_plus', 'active', 'stripe', datetime('now'), datetime('now'))`,
    ).run(corruptUser.user_id);

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(corruptUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, false, "a source='stripe' row with no subscription id must fail closed");
    assert.equal(cancelCalled, false, "there is no subscription id to call Stripe with");
    assert.ok(
      db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(corruptUser.user_id),
      "account must NOT be deleted when the Stripe subscription can't be identified/verified",
    );
  }

  // --- Webhook race: customer.subscription.updated arriving AFTER account
  // deletion must not resurrect a user_subscriptions row for a deleted user --
  {
    const { user: webhookRaceUser } = upsertEmailUser("stripe-webhook-race@firehall.test");
    const deletedUserId = webhookRaceUser.user_id;
    const deleted = deleteUserAccount(deletedUserId);
    assert.equal(deleted.ok, true);
    assert.equal(db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(deletedUserId), undefined);

    // Simulates the webhook handler resolving user_id straight from Stripe
    // subscription metadata (as it does for customer.subscription.updated /
    // checkout.session.completed) — bypassing any DB lookup — for a user_id
    // that no longer exists.
    assert.doesNotThrow(() =>
      upsertStripeSubscription({
        userId: deletedUserId,
        stripeCustomerId: "cus_late_webhook",
        stripeSubscriptionId: "sub_late_webhook",
        stripePriceId: "price_monthly",
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: "2027-01-01T00:00:00.000Z",
      }),
    );
    assert.equal(
      db.prepare(`SELECT 1 FROM user_subscriptions WHERE user_id = ?`).get(deletedUserId),
      undefined,
      "a late webhook must NOT resurrect a user_subscriptions row for a deleted user",
    );
    assert.equal(
      db.prepare(`SELECT 1 FROM users WHERE user_id = ?`).get(deletedUserId),
      undefined,
      "a late webhook must NOT resurrect the deleted users row either",
    );
  }

  console.log("[test-privacy-consent] OK");
  releaseSqliteTimersForTests();
  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error("[test-privacy-consent] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
