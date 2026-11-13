#!/usr/bin/env tsx
/**
 * Validates PRE-LEGAL PRIVACY + CONSENT PRODUCT FIXES:
 * - marketing consent recording on email_leads (default false, escalate-only,
 *   never backfilled/inferred)
 * - self-service account deletion (deletes private data, revokes sessions,
 *   preserves shared Hall content)
 * - nutrition + dietary/allergen disclaimer copy is present and consistent
 */
import { testPg } from "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import { getSharedLocalDb, releaseSqliteTimersForTests, type SqliteDatabase } from "../server/sqlite.js";
import { createAuthSession, deleteUserAccount, updateUserProfile, upsertEmailUser } from "../server/auth/auth-store.js";
import { createHall, initHallMembershipStore, joinHall } from "../server/hall-membership/store.js";
import {
  adminSetUserPlan,
  getUserSubscription,
  initBillingStore,
  linkStripeCustomer,
  markStripeSubscriptionCancelledBySubscriptionId,
  upsertStripeSubscription,
} from "../server/billing/store.js";
import {
  decideStripeDeletionAction,
  ensureStripeSubscriptionCancelledForDeletion,
  isAlreadyCancelledStripeError,
} from "../server/billing/account-deletion-guard.js";
import { initAdminLeadsStore, recordEmailLead } from "../server/admin-users/leads-store.js";

/** Accounts, sessions and subscriptions live in Postgres (PGlite here). */
async function pgGet(text: string, params: unknown[] = []): Promise<unknown> {
  return (await testPg.query(text, params)).rows[0];
}

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
  const db = await getSharedLocalDb();
  await initHallMembershipStore();
  await initBillingStore();
  await initAdminLeadsStore();

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
  const { user } = await upsertEmailUser("deleteme@firehall.test");
  await updateUserProfile(user.user_id, { first_name: "Test", crew_size: 4 });
  const session = await createAuthSession(user.user_id, false);
  assert.ok(session.token);

  const hall = createHall(user.user_id, {
    hall_name: "Station 99",
    station_number: "99",
    department: "Test City",
    crew_size: 6,
    shift_names: ["A"],
    appliances: ["stove"],
  });
  const { user: teammate } = await upsertEmailUser("teammate@firehall.test");
  joinHall(teammate.user_id, { hall_id: hall.hall.hall_id });

  recordEmailLead({ email: "deleteme@firehall.test", source: "generator" });

  // Internal analytics linked to the account, and a Postgres marketing-consent record.
  await testPg.query(
    `INSERT INTO analytics_events (event_type, visitor_id, route, user_id, metadata)
     VALUES ('page_view', 'v-deleteme', '/', $1, '{}'::jsonb)`,
    [user.user_id],
  );
  await testPg.query(
    `INSERT INTO user_marketing_consent (id, email, user_id, marketing_consent, consent_source, consent_captured_at)
     VALUES ('mc-deleteme', 'deleteme@firehall.test', $1, 1, 'signup', now())`,
    [user.user_id],
  );

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
  assert.ok((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [user.user_id])));
  assert.ok((await pgGet(`SELECT 1 FROM user_profiles WHERE user_id = $1`, [user.user_id])));
  assert.ok((await pgGet(`SELECT 1 FROM auth_sessions WHERE user_id = $1`, [user.user_id])));
  assert.ok(db.prepare(`SELECT 1 FROM hall_memberships WHERE user_id = ?`).get(user.user_id));
  assert.ok(db.prepare(`SELECT 1 FROM email_leads WHERE lower(email) = 'deleteme@firehall.test'`).get());
  assert.equal(
    (db.prepare(`SELECT canteen_manager_user_id FROM halls WHERE hall_id = ?`).get(hallId) as any)
      .canteen_manager_user_id,
    user.user_id,
    "sanity: canteen manager should be set before deletion",
  );

  const result = await deleteUserAccount(user.user_id);
  assert.equal(result.ok, true);
  assert.equal(result.email, "deleteme@firehall.test");

  // Privacy policy §9: analytics stay only as anonymous history; consent record is kept.
  assert.deepEqual(
    (await testPg.query(`SELECT visitor_id, user_id FROM analytics_events WHERE visitor_id = 'v-deleteme'`)).rows,
    [{ visitor_id: "v-deleteme", user_id: null }],
    "analytics events must survive without the account link",
  );
  assert.deepEqual(
    (await testPg.query(`SELECT user_id, marketing_consent FROM user_marketing_consent WHERE id = 'mc-deleteme'`)).rows,
    [{ user_id: null, marketing_consent: 1 }],
    "the marketing-consent record is retained (unlinked) so the opt-in/unsubscribe can be honoured",
  );

  // Private data is gone.
  assert.equal((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [user.user_id])), undefined, "user row must be deleted");
  assert.equal((await pgGet(`SELECT 1 FROM user_profiles WHERE user_id = $1`, [user.user_id])), undefined, "profile must be deleted");
  assert.equal(
    (await pgGet(`SELECT 1 FROM auth_sessions WHERE user_id = $1`, [user.user_id])),
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
  const secondDelete = await deleteUserAccount(user.user_id);
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
    const { user: proUser } = await upsertEmailUser("stripe-active@firehall.test");
    await linkStripeCustomer(proUser.user_id, "cus_active_1");
    await upsertStripeSubscription({
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

    const deleted = await deleteUserAccount(proUser.user_id);
    assert.equal(deleted.ok, true);
    assert.equal((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [proUser.user_id])), undefined);
    assert.equal(
      (await pgGet(`SELECT 1 FROM user_subscriptions WHERE user_id = $1`, [proUser.user_id])),
      undefined,
      "user_subscriptions row must be gone after deletion",
    );
  }

  // 2) Past-due Stripe subscription — still considered live/billable, must be cancelled.
  {
    const { user: pastDueUser } = await upsertEmailUser("stripe-pastdue@firehall.test");
    await linkStripeCustomer(pastDueUser.user_id, "cus_pastdue_1");
    await upsertStripeSubscription({
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

    const deleted = await deleteUserAccount(pastDueUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 2b) cancel_at_period_end Stripe subscription — still `active`/billable
  // right up until the scheduled period end, so account deletion must
  // terminate it NOW rather than trusting the future scheduled cancellation
  // (nobody will be around after deletion to see that period end arrive).
  {
    const { user: capeUser } = await upsertEmailUser("stripe-cancel-at-period-end@firehall.test");
    await linkStripeCustomer(capeUser.user_id, "cus_cape_1");
    await upsertStripeSubscription({
      userId: capeUser.user_id,
      stripeCustomerId: "cus_cape_1",
      stripeSubscriptionId: "sub_cape_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: true, // customer already scheduled cancellation via Portal
      currentPeriodEnd: "2027-06-01T00:00:00.000Z",
    });
    assert.equal((await getUserSubscription(capeUser.user_id))?.cancel_at_period_end, true, "sanity: still scheduled, not yet lapsed");

    const cancelCalls: string[] = [];
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(capeUser.user_id, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "cancelled");
    assert.deepEqual(
      cancelCalls,
      ["sub_cape_1"],
      "cancel_at_period_end must not be treated as 'already handled' — it is still billable until the period actually ends",
    );

    const deleted = await deleteUserAccount(capeUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 3) Already-cancelled Stripe subscription — no Stripe call needed, deletion proceeds.
  {
    const { user: cancelledUser } = await upsertEmailUser("stripe-cancelled@firehall.test");
    await linkStripeCustomer(cancelledUser.user_id, "cus_cancelled_1");
    await upsertStripeSubscription({
      userId: cancelledUser.user_id,
      stripeCustomerId: "cus_cancelled_1",
      stripeSubscriptionId: "sub_cancelled_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });
    await testPg.query(`UPDATE user_subscriptions SET status = 'cancelled' WHERE user_id = $1`, [cancelledUser.user_id]);

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(cancelledUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "already_lapsed");
    assert.equal(cancelCalled, false, "an already-cancelled Stripe subscription must not trigger another cancel call");

    const deleted = await deleteUserAccount(cancelledUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 4) Admin-granted Pro — never a Stripe subscription, must never call Stripe.
  {
    const { user: grantedUser } = await upsertEmailUser("stripe-admingrant@firehall.test");
    await adminSetUserPlan(grantedUser.user_id, "firefighter_plus");
    assert.equal((await getUserSubscription(grantedUser.user_id))?.source, "admin_grant");

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(grantedUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "none");
    assert.equal(cancelCalled, false, "admin_grant subscriptions must never be sent to Stripe for cancellation");

    const deleted = await deleteUserAccount(grantedUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 5) Free user (no subscription row at all) — must never call Stripe.
  {
    const { user: freeUser } = await upsertEmailUser("stripe-free@firehall.test");
    assert.equal((await getUserSubscription(freeUser.user_id)), null);

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(freeUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, true);
    assert.equal((guardResult as { action: string }).action, "none");
    assert.equal(cancelCalled, false, "a free user with no subscription row must never call Stripe");

    const deleted = await deleteUserAccount(freeUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 6) Stripe API cancellation failure — deletion must be BLOCKED, account preserved.
  {
    const { user: failUser } = await upsertEmailUser("stripe-failure@firehall.test");
    await linkStripeCustomer(failUser.user_id, "cus_failure_1");
    await upsertStripeSubscription({
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
    assert.ok((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [failUser.user_id])), "account must NOT be deleted when Stripe cancellation fails");
    assert.ok(
      (await pgGet(`SELECT 1 FROM user_subscriptions WHERE user_id = $1`, [failUser.user_id])),
      "the Stripe-linked subscription row must still be present so a retry can find it",
    );

    // Retry after the transient failure clears — must succeed and proceed.
    const retryResult = await ensureStripeSubscriptionCancelledForDeletion(failUser.user_id, {
      cancel: async () => undefined,
    });
    assert.equal(retryResult.ok, true, "retrying after a transient Stripe failure must succeed");
    const deleted = await deleteUserAccount(failUser.user_id);
    assert.equal(deleted.ok, true);
  }

  // 8) Stripe cancellation succeeds, but the subsequent LOCAL deletion step
  // fails (e.g. a DB error) before the account is actually removed. The
  // subscription row is still present locally (still says 'active' — the
  // guard never rewrites local state), so retrying must not re-bill: a
  // second real Stripe call would hit "already canceled", which is treated
  // as success, and deletion can then complete.
  {
    const { user: partialUser } = await upsertEmailUser("stripe-partial-failure@firehall.test");
    await linkStripeCustomer(partialUser.user_id, "cus_partial_1");
    await upsertStripeSubscription({
      userId: partialUser.user_id,
      stripeCustomerId: "cus_partial_1",
      stripeSubscriptionId: "sub_partial_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    // Attempt 1: Stripe cancellation succeeds...
    const firstAttempt = await ensureStripeSubscriptionCancelledForDeletion(partialUser.user_id, {
      cancel: async () => undefined,
    });
    assert.equal(firstAttempt.ok, true);
    assert.equal((firstAttempt as { action: string }).action, "cancelled");

    // ...but local deletion itself fails (simulated — e.g. a DB error mid-transaction).
    // The subscription row is untouched (guard doesn't rewrite local state),
    // so it still reads 'active' for a retry.
    assert.equal((await getUserSubscription(partialUser.user_id))?.status, "active", "local row is unchanged by a successful Stripe cancel alone");
    assert.ok((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [partialUser.user_id])), "account still exists — the simulated local failure never ran deleteUserAccount");

    // Attempt 2 (retry): Stripe now correctly reports the subscription is
    // already canceled — must be treated as success, not a hard failure,
    // and must NOT re-bill (no new subscription is created/charged).
    const retryAttempt = await ensureStripeSubscriptionCancelledForDeletion(partialUser.user_id, {
      cancel: async () => {
        throw { code: "resource_missing", message: "No such subscription: 'sub_partial_1'" };
      },
    });
    assert.equal(retryAttempt.ok, true, "retry after Stripe already succeeded must not fail");
    assert.equal((retryAttempt as { action: string }).action, "already_cancelled_at_stripe");

    const deleted = await deleteUserAccount(partialUser.user_id);
    assert.equal(deleted.ok, true, "retry must be able to complete local deletion");
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

    const { user: raceUser } = await upsertEmailUser("stripe-already-at-stripe@firehall.test");
    await linkStripeCustomer(raceUser.user_id, "cus_race_1");
    await upsertStripeSubscription({
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
    const deleted = await deleteUserAccount(raceUser.user_id);
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
    const { user: corruptUser } = await upsertEmailUser("stripe-corrupt-row@firehall.test");
    await testPg.query(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, source, selected_at, updated_at)
       VALUES ($1, 'firefighter_plus', 'active', 'stripe', now(), now())`,
      [corruptUser.user_id],
    );

    let cancelCalled = false;
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(corruptUser.user_id, {
      cancel: async () => {
        cancelCalled = true;
      },
    });
    assert.equal(guardResult.ok, false, "a source='stripe' row with no subscription id must fail closed");
    assert.equal(cancelCalled, false, "there is no subscription id to call Stripe with");
    assert.ok(
      (await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [corruptUser.user_id])),
      "account must NOT be deleted when the Stripe subscription can't be identified/verified",
    );
  }

  // --- Webhook race: customer.subscription.updated arriving AFTER account
  // deletion must not resurrect a user_subscriptions row for a deleted user --
  {
    const { user: webhookRaceUser } = await upsertEmailUser("stripe-webhook-race@firehall.test");
    const deletedUserId = webhookRaceUser.user_id;
    const deleted = await deleteUserAccount(deletedUserId);
    assert.equal(deleted.ok, true);
    assert.equal((await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [deletedUserId])), undefined);

    // Simulates the webhook handler resolving user_id straight from Stripe
    // subscription metadata (as it does for customer.subscription.updated /
    // checkout.session.completed) — bypassing any DB lookup — for a user_id
    // that no longer exists.
    await assert.doesNotReject(() =>
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
      (await pgGet(`SELECT 1 FROM user_subscriptions WHERE user_id = $1`, [deletedUserId])),
      undefined,
      "a late webhook must NOT resurrect a user_subscriptions row for a deleted user",
    );
    assert.equal(
      (await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [deletedUserId])),
      undefined,
      "a late webhook must NOT resurrect the deleted users row either",
    );
  }

  // 9) customer.subscription.deleted webhook arrives AFTER local user deletion
  // for a user who genuinely had a live Stripe subscription — must handle the
  // missing user/row safely (no throw, no recreation), matching the existing
  // idempotent no-op behavior markStripeSubscriptionCancelledBySubscriptionId
  // already has for an unknown subscription id.
  {
    const { user: postDeleteWebhookUser } = await upsertEmailUser("stripe-webhook-after-delete@firehall.test");
    await linkStripeCustomer(postDeleteWebhookUser.user_id, "cus_postdelete_1");
    await upsertStripeSubscription({
      userId: postDeleteWebhookUser.user_id,
      stripeCustomerId: "cus_postdelete_1",
      stripeSubscriptionId: "sub_postdelete_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    // Full deletion flow: cancel at Stripe, then delete locally (row is gone
    // afterward, same as deleteUserAccount's real DELETE FROM user_subscriptions).
    const guardResult = await ensureStripeSubscriptionCancelledForDeletion(postDeleteWebhookUser.user_id, {
      cancel: async () => undefined,
    });
    assert.equal(guardResult.ok, true);
    const deleted = await deleteUserAccount(postDeleteWebhookUser.user_id);
    assert.equal(deleted.ok, true);
    assert.equal(
      (await pgGet(`SELECT 1 FROM user_subscriptions WHERE stripe_subscription_id = 'sub_postdelete_1'`)),
      undefined,
    );

    // Stripe's real customer.subscription.deleted webhook (fired async after
    // our own cancel() call above) arrives once the account is already gone.
    await assert.doesNotReject(async () => {
      const result = await markStripeSubscriptionCancelledBySubscriptionId("sub_postdelete_1");
      assert.equal(result, null, "no user/subscription to update — must no-op, not throw or recreate anything");
    });
    assert.equal(
      (await pgGet(`SELECT 1 FROM users WHERE user_id = $1`, [postDeleteWebhookUser.user_id])),
      undefined,
      "the late webhook must not resurrect the deleted user",
    );

    // Stripe redelivering the exact same event id a second time (duplicate
    // delivery) must also stay a safe no-op via the existing idempotency table.
    await assert.doesNotReject(() => markStripeSubscriptionCancelledBySubscriptionId("sub_postdelete_1"));
  }

  // 10) Duplicate deletion request (e.g. a double-click, or a client retry
  // after the first request actually succeeded server-side) must be a safe,
  // idempotent no-op end-to-end — both the Stripe guard and deleteUserAccount.
  {
    const { user: dupUser } = await upsertEmailUser("stripe-duplicate-delete@firehall.test");
    await linkStripeCustomer(dupUser.user_id, "cus_dup_1");
    await upsertStripeSubscription({
      userId: dupUser.user_id,
      stripeCustomerId: "cus_dup_1",
      stripeSubscriptionId: "sub_dup_1",
      stripePriceId: "price_monthly",
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: "2027-01-01T00:00:00.000Z",
    });

    const cancelCalls: string[] = [];
    const firstGuard = await ensureStripeSubscriptionCancelledForDeletion(dupUser.user_id, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    assert.equal(firstGuard.ok, true);
    const firstDelete = await deleteUserAccount(dupUser.user_id);
    assert.equal(firstDelete.ok, true);

    // Duplicate request for the same (now-deleted) user: the guard sees no
    // subscription row at all (user_id no longer exists) — 'none', no Stripe
    // call — and deleteUserAccount's own pre-existing early-return handles
    // the missing user row as a safe no-op.
    const secondGuard = await ensureStripeSubscriptionCancelledForDeletion(dupUser.user_id, {
      cancel: async (subId) => {
        cancelCalls.push(subId);
      },
    });
    assert.equal(secondGuard.ok, true);
    assert.equal((secondGuard as { action: string }).action, "none");
    const secondDelete = await deleteUserAccount(dupUser.user_id);
    assert.equal(secondDelete.ok, true);
    assert.equal(secondDelete.email, null, "second deletion finds no user row — matches existing idempotent behavior");
    assert.deepEqual(cancelCalls, ["sub_dup_1"], "Stripe must be called exactly once across both requests, never twice");
  }

  console.log("[test-privacy-consent] OK");
  releaseSqliteTimersForTests();
}

main().catch((err) => {
  console.error("[test-privacy-consent] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
