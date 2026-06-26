#!/usr/bin/env tsx

/**

 * Validates legacy hall supplies adapter over staples canteen store.

 */

import assert from "node:assert/strict";

import fs from "node:fs";

import os from "node:os";

import path from "node:path";

import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";

import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";

import {

  bindHallMembershipDb,

  createHall,

  joinHall,

} from "../server/hall-membership/store.js";

import { bindBillingDb } from "../server/billing/store.js";

import {

  addCustomSupply,

  bindHallSuppliesDb,

  getOrSeedHallSupplies,

  updateSupplyStatus,

} from "../server/hall-supplies/store.js";

import {

  canManageSuppliesRestock,

  canReportSupplyShortage,

  canSetSupplyStatus,

  isSupplyShortage,

} from "../shared/hall-supplies/types.js";



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

const MIGRATION_019 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "019_hall_supplies.sql"),

  "utf8",

);

const MIGRATION_022 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "022_hall_identity.sql"),

  "utf8",

);

const MIGRATION_024 = fs.readFileSync(

  path.join(process.cwd(), "server", "db", "migrations", "024_hall_canteen.sql"),

  "utf8",

);

const MIGRATION_031 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "031_canteen_staples.sql"),
  "utf8",
);
const MIGRATION_032 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "032_canteen_staples_trim.sql"),
  "utf8",
);
const MIGRATION_035 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "035_canteen_pickup_claims.sql"),
  "utf8",
);



const tmpDb = path.join(os.tmpdir(), `fh-hall-supplies-${Date.now()}.db`);



async function main(): Promise<void> {

  assert.equal(canReportSupplyShortage("member"), true);

  assert.equal(canManageSuppliesRestock("member"), true);

  assert.equal(canSetSupplyStatus("member", "low"), true);

  assert.equal(canSetSupplyStatus("member", "good"), true);

  assert.equal(isSupplyShortage("low"), true);

  assert.equal(isSupplyShortage("good"), false);



  const db = await openSqliteDatabase(tmpDb);

  db.exec(MIGRATION_014);

  db.exec(MIGRATION_015);

  db.exec(MIGRATION_016);

  db.exec(MIGRATION_019);

  db.exec(MIGRATION_022);

  db.exec(MIGRATION_024);

  db.exec(MIGRATION_031);
  db.exec(MIGRATION_032);
  db.exec(MIGRATION_035);

  bindAuthDb(db);

  bindHallMembershipDb(db);

  bindBillingDb(db);

  bindHallSuppliesDb(db);



  const captain = upsertEmailUser("captain@firehall.test").user;

  const member = upsertEmailUser("member@firehall.test").user;



  const detail = createHall(captain.user_id, {

    hall_name: "Engine 12",

    station_number: "12",

    department: "City Fire",

    crew_size: 8,

    shift_names: ["A Shift"],

    appliances: ["stove"],

  });

  const hallId = detail.hall.hall_id;

  joinHall(member.user_id, { join_code: detail.hall.join_code });



  const seeded = getOrSeedHallSupplies(hallId, captain.user_id);

  assert.ok(seeded);

  assert.equal(seeded!.items.length, 20);

  assert.equal(seeded!.can_manage, true);



  const coffee = seeded!.items.find((i) => i.name === "Coffee");

  assert.ok(coffee);



  const memberLow = updateSupplyStatus(hallId, member.user_id, coffee!.supply_id, "low");

  assert.ok(memberLow);

  assert.equal(memberLow!.payload.shortages.length, 1);



  const restocked = updateSupplyStatus(hallId, member.user_id, coffee!.supply_id, "good");

  assert.ok(restocked);

  assert.equal(restocked!.restocked, true);

  assert.equal(restocked!.payload.shortages.length, 0);



  const custom = addCustomSupply(hallId, captain.user_id, {

    name: "Aluminum Foil",

    category: "custom",

  });

  assert.ok(custom);

  assert.ok(custom!.items.some((i) => i.name === "Aluminum Foil"));



  try {

    fs.unlinkSync(tmpDb);

  } catch {

    /* ignore */

  }



  releaseSqliteTimersForTests();

  console.log("[test-hall-supplies] OK");

}



main().catch((err) => {

  console.error("[test-hall-supplies] FAILED", err);

  releaseSqliteTimersForTests();

  process.exit(1);

});


