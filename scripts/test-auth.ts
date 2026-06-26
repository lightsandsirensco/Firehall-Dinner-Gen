#!/usr/bin/env tsx

/**

 * Validates user auth store — schema, sessions, profile, saves.

 */

import assert from "node:assert/strict";

import fs from "node:fs";

import os from "node:os";

import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";

import {

  consumeMagicLink,

  createAuthSession,

  createMagicLink,

  getAuthMe,

  bindAuthDb,

  listSavedRecipes,

  syncSavedRecipes,

  updateUserProfile,

  upsertEmailUser,

} from "../server/auth/auth-store.js";

import { bindHallMembershipDb, createHall, joinHall } from "../server/hall-membership/store.js";
import { bindBillingDb } from "../server/billing/store.js";



const MIGRATION_014 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),

  "utf8",

);

const MIGRATION_015 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "015_hall_membership.sql"),

  "utf8",

);

const MIGRATION_016 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "016_billing.sql"),

  "utf8",

);

const MIGRATION_022 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "022_hall_identity.sql"),

  "utf8",

);



const tmpDb = path.join(os.tmpdir(), `fh-auth-validate-${Date.now()}.db`);



async function bindTestDb(): Promise<void> {

  const db = await openSqliteDatabase(tmpDb);

  db.exec(MIGRATION_014);

  db.exec(MIGRATION_015);

  db.exec(MIGRATION_016);

  db.exec(MIGRATION_022);

  bindAuthDb(db);

  bindHallMembershipDb(db);

  bindBillingDb(db);

}



async function main(): Promise<void> {

  await bindTestDb();



  const { rawToken } = createMagicLink("crew@firehall.test");

  const consumed = consumeMagicLink(rawToken);

  assert.ok(consumed);

  assert.equal(consumed!.email, "crew@firehall.test");



  const { user, isNew } = upsertEmailUser("crew@firehall.test");

  assert.ok(isNew);

  assert.equal(user.email, "crew@firehall.test");



  const session = createAuthSession(user.user_id, isNew);

  assert.ok(session.token.length > 20);



  const me = getAuthMe(user.user_id);

  assert.equal(me.authenticated, true);

  assert.ok(me.profile);



  updateUserProfile(user.user_id, {

    first_name: "Mike",

    display_name: "Engine 12",

    preferred_proteins: ["chicken", "beef"],

    shift_reminders_enabled: true,

  });



  const updated = getAuthMe(user.user_id);

  assert.equal(updated.profile?.first_name, "Mike");

  assert.deepEqual(updated.preferences?.preferred_proteins, ["chicken", "beef"]);

  assert.equal(updated.preferences?.shift_reminders_enabled, true);



  syncSavedRecipes(user.user_id, [

    {

      recipe_key: "test:meal",

      recipe_json: { title: "Test Meal" },

      saved_at: new Date().toISOString(),

    },

  ]);

  const saves = listSavedRecipes(user.user_id);

  assert.equal(saves.length, 1);

  assert.equal(saves[0].recipe_key, "test:meal");



  const hall = createHall(user.user_id, { hall_name: "Station 12" });

  assert.ok(hall.hall.hall_id);

  const joined = joinHall(user.user_id, { hall_id: hall.hall.hall_id });

  assert.equal(joined.ok, true);



  try {

    fs.unlinkSync(tmpDb);

  } catch {

    /* ignore */

  }



  releaseSqliteTimersForTests();

  console.log("[test-auth] OK");

}



main().catch((err) => {

  console.error("[test-auth] FAILED", err);

  releaseSqliteTimersForTests();

  process.exit(1);

});

