#!/usr/bin/env tsx
/**
 * Validates hall shared shopping list store — permissions, items, runner, complete.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser } from "../server/auth/auth-store.js";
import { bindHallMembershipDb, createHall, joinHall } from "../server/hall-membership/store.js";
import { bindBillingDb } from "../server/billing/store.js";
import {
  addManualItem,
  addRecipeIngredients,
  bindHallShoppingListDb,
  completeShoppingList,
  deleteShoppingListItem,
  getOrCreateActiveShoppingList,
  startNewShoppingList,
  updateShoppingListItem,
  updateShoppingListMeta,
} from "../server/hall-shopping-list/store.js";
import {
  canCompleteShoppingList,
  canContributeToShoppingList,
} from "../shared/hall-shopping-list/types.js";

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
const MIGRATION_018 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "018_hall_shopping_lists.sql"),
  "utf8",
);
const MIGRATION_022 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "022_hall_identity.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-hall-shopping-list-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.equal(canContributeToShoppingList("member"), true);
  assert.equal(canContributeToShoppingList("captain"), true);
  assert.equal(canCompleteShoppingList("member"), false);
  assert.equal(canCompleteShoppingList("captain"), true);
  assert.equal(canCompleteShoppingList("canteen_manager"), true);

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_018);
  db.exec(MIGRATION_022);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindHallShoppingListDb(db);

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

  const join = joinHall(member.user_id, { join_code: detail.hall.join_code });
  assert.equal(join.ok, true);

  const initial = getOrCreateActiveShoppingList(hallId, captain.user_id);
  assert.ok(initial);
  assert.equal(initial!.list.status, "active");
  assert.equal(initial!.items.length, 0);
  assert.equal(initial!.can_contribute, true);
  assert.equal(initial!.can_complete, true);

  const afterManual = addManualItem(hallId, member.user_id, {
    name: "Onions",
    quantity: "3 large",
    section: "Produce",
  });
  assert.ok(afterManual);
  assert.equal(afterManual!.items.length, 1);
  assert.equal(afterManual!.items[0].name, "Onions");
  assert.equal(afterManual!.can_complete, false);

  const afterRecipe = addRecipeIngredients(hallId, member.user_id, {
    recipe_title: "Chili",
    recipe_slug: "chili",
    sections: [
      {
        title: "Produce",
        items: [{ name: "Onions", amount: "2", notes: "diced" }],
      },
      {
        title: "Pantry",
        items: [{ name: "Kidney beans", amount: "2 cans" }],
      },
    ],
  });
  assert.ok(afterRecipe);
  assert.equal(afterRecipe!.items.length, 2);
  const onion = afterRecipe!.items.find((i) => i.name === "Onions");
  assert.ok(onion?.quantity.includes("3 large"));

  const marked = updateShoppingListItem(hallId, captain.user_id, onion!.item_id, {
    purchased: true,
  });
  assert.ok(marked);
  assert.equal(marked!.items.find((i) => i.item_id === onion!.item_id)?.purchased, true);

  const deniedMark = updateShoppingListItem(hallId, member.user_id, onion!.item_id, {
    purchased: false,
  });
  assert.equal(deniedMark, null);

  const beans = afterRecipe!.items.find((i) => i.name === "Kidney beans");
  assert.ok(beans);
  const assigned = updateShoppingListMeta(hallId, captain.user_id, {
    runner_user_id: member.user_id,
    runner_name: "Member",
  });
  assert.ok(assigned);
  assert.equal(assigned!.list.runner_user_id, member.user_id);

  const deniedRunner = updateShoppingListMeta(hallId, member.user_id, {
    runner_user_id: captain.user_id,
  });
  assert.equal(deniedRunner, null);

  const deleted = deleteShoppingListItem(hallId, member.user_id, beans!.item_id);
  assert.ok(deleted);
  assert.equal(deleted!.items.length, 1);

  const completed = completeShoppingList(hallId, captain.user_id);
  assert.ok(completed);
  assert.equal(completed!.list.status, "completed");

  const fresh = startNewShoppingList(hallId, captain.user_id, "Next run");
  assert.ok(fresh);
  assert.equal(fresh!.list.status, "active");
  assert.equal(fresh!.list.title, "Next run");
  assert.equal(fresh!.items.length, 0);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-shopping-list] OK");
}

main().catch((err) => {
  console.error("[test-hall-shopping-list] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
