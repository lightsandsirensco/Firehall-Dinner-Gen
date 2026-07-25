#!/usr/bin/env tsx
/**
 * Validates Canteen Manager V2 — reports, weekly orders, claims, delivery receive.
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
  updateMemberRole,
} from "../server/hall-membership/store.js";
import { bindBillingDb } from "../server/billing/store.js";
import {
  addItemToWeeklyOrder,
  bindHallCanteenDb,
  claimOrderItem,
  getOrSeedHallCanteen,
  manageCanteenItem,
  receiveOrderItem,
  reportCanteenItem,
  setCanteenItemStatus,
} from "../server/hall-canteen/store.js";
import { FREE_HALL_ACTIVE_STAPLE_LIMIT, moreSevereStatus } from "../shared/hall-canteen/types.js";

const MIGRATIONS = [
  "014_user_accounts.sql",
  "015_hall_membership.sql",
  "016_billing.sql",
  "019_hall_supplies.sql",
  "022_hall_identity.sql",
  "024_hall_canteen.sql",
  "031_canteen_staples.sql",
  "032_canteen_staples_trim.sql",
  "034_hall_notes.sql",
  "035_canteen_pickup_claims.sql",
  "040_canteen_manager_v2.sql",
].map((name) =>
  fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"),
);

const tmpDb = path.join(os.tmpdir(), `fh-canteen-manager-v2-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.equal(moreSevereStatus("running_low", "out"), "out");
  assert.equal(moreSevereStatus("out", "running_low"), "out");
  assert.equal(FREE_HALL_ACTIVE_STAPLE_LIMIT, 25);

  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindHallCanteenDb(db);

  const captain = upsertEmailUser("captain@canteen-mgr.test").user;
  const manager = upsertEmailUser("manager@canteen-mgr.test").user;
  const memberA = upsertEmailUser("member-a@canteen-mgr.test").user;
  const memberB = upsertEmailUser("member-b@canteen-mgr.test").user;

  const detail = createHall(captain.user_id, {
    hall_name: "Firehall Meals Test Hall",
    station_number: "99",
    department: "Test Fire",
    crew_size: 8,
    shift_names: ["A Shift"],
    appliances: ["stove"],
  });
  const hallId = detail.hall.hall_id;
  joinHall(manager.user_id, { join_code: detail.hall.join_code });
  joinHall(memberA.user_id, { join_code: detail.hall.join_code });
  joinHall(memberB.user_id, { join_code: detail.hall.join_code });
  updateMemberRole(hallId, captain.user_id, manager.user_id, "canteen_manager");

  const seeded = getOrSeedHallCanteen(hallId, captain.user_id);
  assert.ok(seeded);
  assert.ok(seeded!.current_order);
  const coffee = seeded!.items.find((i) => i.name === "Coffee");
  assert.ok(coffee);

  // 1) Member cannot edit master list fields (name)
  const memberRename = manageCanteenItem(hallId, memberA.user_id, coffee!.item_id, {
    name: "Hacked Coffee",
  });
  assert.equal(memberRename, null);
  const stillCoffee = getOrSeedHallCanteen(hallId, captain.user_id);
  assert.equal(
    stillCoffee!.items.find((i) => i.item_id === coffee!.item_id)?.name,
    "Coffee",
  );

  // Manager can rename
  const managerRename = manageCanteenItem(hallId, manager.user_id, coffee!.item_id, {
    name: "Station Coffee",
  });
  assert.ok(managerRename);
  assert.equal(
    managerRename!.payload.items.find((i) => i.item_id === coffee!.item_id)?.name,
    "Station Coffee",
  );
  // Restore name for clarity
  manageCanteenItem(hallId, manager.user_id, coffee!.item_id, { name: "Coffee" });

  // 2) Duplicate reports do not duplicate weekly-order rows
  const firstReport = setCanteenItemStatus(hallId, memberA.user_id, coffee!.item_id, "out", "all out");
  assert.ok(firstReport);
  const orderAfterFirst = firstReport!.payload.current_order!;
  const coffeeOrderRows = orderAfterFirst.items.filter((i) => i.staple_item_id === coffee!.item_id);
  assert.equal(coffeeOrderRows.length, 1);
  assert.ok((firstReport!.item.report_count ?? 0) >= 1);

  const secondReport = reportCanteenItem(hallId, memberB.user_id, {
    item_id: coffee!.item_id,
    status: "running_low",
    note: "still low",
  });
  assert.ok(secondReport);
  // Most severe wins — stays out
  assert.equal(
    secondReport!.payload.items.find((i) => i.item_id === coffee!.item_id)?.status,
    "out",
  );
  const coffeeOrderRows2 = secondReport!.payload.current_order!.items.filter(
    (i) => i.staple_item_id === coffee!.item_id,
  );
  assert.equal(coffeeOrderRows2.length, 1, "duplicate reports must not duplicate order rows");

  // Explicit add again is also idempotent
  const addAgain = addItemToWeeklyOrder(hallId, memberA.user_id, coffee!.item_id);
  assert.ok(addAgain);
  assert.equal(
    addAgain!.current_order!.items.filter((i) => i.staple_item_id === coffee!.item_id).length,
    1,
  );

  const orderItemId = addAgain!.current_order!.items.find(
    (i) => i.staple_item_id === coffee!.item_id,
  )!.order_item_id;

  // 3) Claim buying_this exclusivity
  const claimA = claimOrderItem(hallId, memberA.user_id, orderItemId);
  assert.ok(claimA);
  const claimed = claimA!.current_order!.items.find((i) => i.order_item_id === orderItemId);
  assert.equal(claimed?.status, "buying_this");
  assert.equal(claimed?.assigned_buyer_user_id, memberA.user_id);

  const claimB = claimOrderItem(hallId, memberB.user_id, orderItemId);
  assert.equal(claimB, null, "second member cannot steal buying_this claim");

  // Same member can re-claim
  const reclaimA = claimOrderItem(hallId, memberA.user_id, orderItemId);
  assert.ok(reclaimA);

  // 4) receive_full updates staple to good and clears reports
  const received = receiveOrderItem(hallId, memberA.user_id, orderItemId, {
    receive_status: "received_full",
    received_qty: 2,
  });
  assert.ok(received);
  const coffeeAfter = received!.items.find((i) => i.item_id === coffee!.item_id);
  assert.equal(coffeeAfter?.status, "good");
  assert.equal(coffeeAfter?.report_count, 0);
  assert.ok(coffeeAfter?.last_restocked_at);

  // 5) Partial receive leaves shortage unresolved
  const milk = received!.items.find((i) => i.name === "Milk");
  assert.ok(milk);
  setCanteenItemStatus(hallId, memberB.user_id, milk!.item_id, "out", "no milk");
  const milkOrder = addItemToWeeklyOrder(hallId, memberB.user_id, milk!.item_id);
  assert.ok(milkOrder);
  const milkOrderItem = milkOrder!.current_order!.items.find(
    (i) => i.staple_item_id === milk!.item_id,
  );
  assert.ok(milkOrderItem);

  const partial = receiveOrderItem(hallId, memberB.user_id, milkOrderItem!.order_item_id, {
    receive_status: "partial",
    received_qty: 0.5,
  });
  assert.ok(partial);
  const milkAfter = partial!.items.find((i) => i.item_id === milk!.item_id);
  assert.equal(milkAfter?.status, "out");
  assert.ok((milkAfter?.report_count ?? 0) >= 1, "partial must leave reports unresolved");

  const milkLine = partial!.current_order!.items.find(
    (i) => i.order_item_id === milkOrderItem!.order_item_id,
  );
  assert.equal(milkLine?.receive_status, "partial");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-canteen-manager] OK");
}

main().catch((err) => {
  console.error("[test-canteen-manager] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
