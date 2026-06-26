#!/usr/bin/env tsx
/**
 * Validates Hall Staples V2 — collaborative status for all members, list management for canteen manager.
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
  bindHallCanteenDb,
  addDefaultCanteenItem,
  claimCanteenPickup,
  getOrSeedHallCanteen,
  manageCanteenItem,
  releaseCanteenPickup,
  reportCanteenItem,
  setCanteenItemStatus,
} from "../server/hall-canteen/store.js";
import {
  bindHallNotesDb,
  createHallNote,
  deleteHallNote,
  listHallNotes,
  updateHallNote,
} from "../server/hall-notes/store.js";
import {
  canManageCanteenList,
  canUpdateCanteenStatus,
  DEFAULT_HALL_CANTEEN_ITEMS,
  getShoppingThisWeekItems,
  isBeingPickedUpStatus,
  isProteinStapleName,
} from "../shared/hall-canteen/types.js";

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
].map((name) =>
  fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"),
);

const tmpDb = path.join(os.tmpdir(), `fh-hall-staples-v2-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.equal(DEFAULT_HALL_CANTEEN_ITEMS.length, 20);
  assert.equal(canUpdateCanteenStatus("member"), true);
  assert.equal(canManageCanteenList("member"), false);
  assert.equal(canManageCanteenList("canteen_manager"), true);
  assert.equal(isProteinStapleName("Chicken"), true);

  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindHallCanteenDb(db);
  bindHallNotesDb(db);

  const captain = upsertEmailUser("captain@firehall.test").user;
  const memberA = upsertEmailUser("member-a@firehall.test").user;
  const memberB = upsertEmailUser("member-b@firehall.test").user;

  const detail = createHall(captain.user_id, {
    hall_name: "Engine 12",
    station_number: "12",
    department: "City Fire",
    crew_size: 8,
    shift_names: ["A Shift"],
    appliances: ["stove"],
  });
  const hallId = detail.hall.hall_id;
  joinHall(memberA.user_id, { join_code: detail.hall.join_code });
  joinHall(memberB.user_id, { join_code: detail.hall.join_code });

  const seeded = getOrSeedHallCanteen(hallId, captain.user_id);
  assert.ok(seeded);
  assert.equal(seeded!.items.length, 20);
  assert.equal(seeded!.can_update, true);
  assert.equal(seeded!.can_manage_list, true);

  const coffee = seeded!.items.find((i) => i.name === "Coffee");
  assert.ok(coffee);

  const memberUpdate = setCanteenItemStatus(hallId, memberB.user_id, coffee!.item_id, "out");
  assert.ok(memberUpdate);
  assert.equal(memberUpdate!.payload.needs_attention_count, 1);
  assert.equal(getShoppingThisWeekItems(memberUpdate!.payload).length, 1);
  assert.equal(getShoppingThisWeekItems(memberUpdate!.payload)[0]?.name, "Coffee");

  const bread = memberUpdate!.payload.items.find((i) => i.name === "Bread");
  assert.ok(bread);
  const twoShort = setCanteenItemStatus(hallId, memberA.user_id, bread!.item_id, "running_low");
  assert.ok(twoShort);
  assert.equal(getShoppingThisWeekItems(twoShort!.payload).length, 2);

  const purchased = setCanteenItemStatus(hallId, memberB.user_id, coffee!.item_id, "good");
  assert.ok(purchased);
  assert.equal(purchased!.payload.needs_attention_count, 1);
  assert.equal(getShoppingThisWeekItems(purchased!.payload).length, 1);
  assert.equal(getShoppingThisWeekItems(purchased!.payload)[0]?.name, "Bread");
  assert.equal(
    purchased!.payload.items.find((i) => i.item_id === coffee!.item_id)?.status,
    "good",
  );

  const claimCoffee = setCanteenItemStatus(hallId, memberB.user_id, coffee!.item_id, "running_low");
  assert.ok(claimCoffee);
  const claimed = claimCanteenPickup(hallId, memberA.user_id, coffee!.item_id);
  assert.ok(claimed);
  assert.equal(claimed!.item.status, "being_picked_up");
  assert.equal(claimed!.item.picked_up_by_user_id, memberA.user_id);
  assert.ok(claimed!.item.picked_up_at);
  assert.equal(claimed!.payload.needs_attention_count, 1);
  assert.equal(getShoppingThisWeekItems(claimed!.payload).length, 2);
  assert.equal(isBeingPickedUpStatus(claimed!.item.status), true);

  const duplicateClaim = claimCanteenPickup(hallId, memberB.user_id, coffee!.item_id);
  assert.equal(duplicateClaim, null);

  const restocked = setCanteenItemStatus(hallId, memberA.user_id, coffee!.item_id, "good");
  assert.ok(restocked);
  assert.equal(
    restocked!.payload.items.find((i) => i.item_id === coffee!.item_id)?.picked_up_by_user_id,
    null,
  );
  assert.equal(getShoppingThisWeekItems(restocked!.payload).length, 1);

  const claimAgain = setCanteenItemStatus(hallId, memberB.user_id, coffee!.item_id, "out");
  assert.ok(claimAgain);
  const memberClaim = claimCanteenPickup(hallId, memberB.user_id, coffee!.item_id);
  assert.ok(memberClaim);

  const released = releaseCanteenPickup(hallId, captain.user_id, coffee!.item_id);
  assert.ok(released);
  assert.equal(released!.item.status, "running_low");
  assert.equal(released!.item.picked_up_by_user_id, null);

  db.prepare(
    `UPDATE hall_canteen_items
     SET status = 'being_picked_up', picked_up_by_user_id = ?, picked_up_at = ?
     WHERE item_id = ?`,
  ).run(
    memberB.user_id,
    new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    coffee!.item_id,
  );
  const expired = getOrSeedHallCanteen(hallId, captain.user_id);
  assert.ok(expired);
  const expiredCoffee = expired!.items.find((i) => i.item_id === coffee!.item_id);
  assert.equal(expiredCoffee?.status, "running_low");
  assert.equal(expiredCoffee?.picked_up_by_user_id, null);

  const memberAdd = reportCanteenItem(hallId, memberB.user_id, {
    name: "Paper Towels",
    status: "running_low",
  });
  assert.equal(memberAdd, null);

  updateMemberRole(hallId, captain.user_id, memberA.user_id, "canteen_manager");
  const managerPayload = getOrSeedHallCanteen(hallId, memberA.user_id);
  assert.ok(managerPayload?.can_manage_list);

  const added = addDefaultCanteenItem(hallId, memberA.user_id, { name: "Paper Towels" });
  assert.ok(added?.items.some((i) => i.name === "Paper Towels"));

  const duplicate = addDefaultCanteenItem(hallId, memberA.user_id, { name: "paper towels" });
  assert.ok(duplicate);
  assert.equal(
    duplicate!.items.filter((i) => i.name.toLowerCase() === "paper towels").length,
    1,
  );

  const paper = added!.items.find((i) => i.name === "Paper Towels");
  assert.ok(paper);
  const archived = manageCanteenItem(hallId, memberA.user_id, paper!.item_id, { archived: true });
  assert.ok(archived);
  assert.equal(archived!.payload.items.find((i) => i.item_id === paper!.item_id), undefined);

  const note = createHallNote(hallId, memberB.user_id, "Grab Costco coffee.");
  assert.ok(note);
  assert.equal(note!.payload.notes[0]?.message, "Grab Costco coffee.");

  const notesForA = listHallNotes(hallId, memberA.user_id);
  assert.ok(notesForA);
  assert.equal(notesForA!.notes.length, 1);

  const edited = updateHallNote(hallId, memberB.user_id, note!.note.note_id, "Costco coffee please.");
  assert.ok(edited);
  assert.equal(edited!.note.message, "Costco coffee please.");

  const deleted = deleteHallNote(hallId, memberA.user_id, note!.note.note_id);
  assert.ok(deleted);
  assert.equal(deleted!.notes.length, 0);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-canteen] OK");
}

main().catch((err) => {
  console.error("[test-hall-canteen] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
