#!/usr/bin/env tsx
/**
 * Validates user auth store — magic links, sessions, profile, saves — against
 * the real Postgres migrations (PGlite) plus SQLite Firehouse membership.
 */
import "./lib/pglite-test-db.js";
import assert from "node:assert/strict";
import { releaseSqliteTimersForTests } from "../server/sqlite.js";
import {
  consumeMagicLink,
  createAuthSession,
  createMagicLink,
  getAuthMe,
  getUserIdFromSessionToken,
  listSavedRecipes,
  syncSavedRecipes,
  updateUserProfile,
  upsertEmailUser,
} from "../server/auth/auth-store.js";
import { createHall, initHallMembershipStore, joinHall } from "../server/hall-membership/store.js";

async function main(): Promise<void> {
  await initHallMembershipStore();

  const { rawToken } = await createMagicLink("crew@firehall.test");
  const consumed = await consumeMagicLink(rawToken);
  assert.equal(consumed.ok, true);
  if (consumed.ok) assert.equal(consumed.email, "crew@firehall.test");
  const reused = await consumeMagicLink(rawToken);
  assert.equal(reused.ok, false, "a magic link works only once");

  const { user, isNew } = await upsertEmailUser("crew@firehall.test");
  assert.ok(isNew);
  assert.equal(user.email, "crew@firehall.test");
  const again = await upsertEmailUser("CREW@firehall.test");
  assert.equal(again.isNew, false, "email matching is case-insensitive");
  assert.equal(again.user.user_id, user.user_id);

  const session = await createAuthSession(user.user_id, isNew);
  assert.ok(session.token.length > 20);
  assert.equal(await getUserIdFromSessionToken(session.token), user.user_id);
  assert.equal(await getUserIdFromSessionToken("not-a-real-token"), null);

  const me = await getAuthMe(user.user_id);
  assert.equal(me.authenticated, true);
  assert.ok(me.profile);
  const anon = await getAuthMe(null);
  assert.equal(anon.authenticated, false);

  await updateUserProfile(user.user_id, {
    first_name: "Mike",
    display_name: "Engine 12",
    preferred_proteins: ["chicken", "beef"],
    shift_reminders_enabled: true,
  });
  const updated = await getAuthMe(user.user_id);
  assert.equal(updated.profile?.first_name, "Mike");
  assert.deepEqual(updated.preferences?.preferred_proteins, ["chicken", "beef"]);
  assert.equal(updated.preferences?.shift_reminders_enabled, true);

  await syncSavedRecipes(user.user_id, [
    { recipe_key: "test:meal", recipe_json: { title: "Test Meal" }, saved_at: new Date().toISOString() },
  ]);
  const saves = await listSavedRecipes(user.user_id);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].recipe_key, "test:meal");

  const hall = createHall(user.user_id, { hall_name: "Station 12" });
  assert.ok(hall.hall.hall_id);
  const joined = joinHall(user.user_id, { hall_id: hall.hall.hall_id });
  assert.equal(joined.ok, true);

  releaseSqliteTimersForTests();
  console.log("[test-auth] OK");
}

main().catch((err) => {
  console.error("[test-auth] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
