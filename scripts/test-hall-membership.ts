#!/usr/bin/env tsx
/**
 * Validates hall membership store — roles, invites, permissions, join flows.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb } from "../server/auth/auth-store.js";
import {
  bindHallMembershipDb,
  createHall,
  createHallInvite,
  getHallDetail,
  getJoinPreview,
  joinHall,
  listUserHallSummaries,
  memberHasPermission,
  updateMemberRole,
} from "../server/hall-membership/store.js";
import { upsertEmailUser } from "../server/auth/auth-store.js";
import { bindBillingDb } from "../server/billing/store.js";
import { hallRoleHasPermission } from "../shared/hall-membership/types.js";

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

const tmpDb = path.join(os.tmpdir(), `fh-hall-membership-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_022);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);

  assert.equal(hallRoleHasPermission("member", "participate_votes"), true);
  assert.equal(hallRoleHasPermission("member", "view_hall_dashboard"), true);
  assert.equal(hallRoleHasPermission("member", "save_hall_favorites"), true);
  assert.equal(hallRoleHasPermission("member", "manage_members"), false);
  assert.equal(hallRoleHasPermission("member", "manage_supplies"), false);
  assert.equal(hallRoleHasPermission("captain", "manage_settings"), true);
  assert.equal(hallRoleHasPermission("captain", "manage_supplies"), false);
  assert.equal(hallRoleHasPermission("canteen_manager", "manage_shopping_lists"), true);
  assert.equal(hallRoleHasPermission("canteen_manager", "manage_members"), false);

  const captain = upsertEmailUser("captain@firehall.test").user;
  const member = upsertEmailUser("member@firehall.test").user;

  const detail = createHall(captain.user_id, {
    hall_name: "Engine 12",
    station_number: "12",
    department: "City Fire",
    crew_size: 8,
    shift_names: ["A Shift", "B Shift"],
    appliances: ["stove", "oven", "grill"],
  });

  assert.equal(detail.my_role, "captain");
  assert.equal(detail.hall.join_code.length, 6);
  assert.deepEqual(detail.hall.shift_names, ["A Shift", "B Shift"]);
  assert.equal(detail.shifts.length, 4);
  assert.equal(detail.shifts.filter((shift) => shift.enabled).length, 2);

  const joinByCode = joinHall(member.user_id, { join_code: detail.hall.join_code });
  assert.equal(joinByCode.ok, true);
  if (joinByCode.ok) {
    assert.equal(joinByCode.hall.role, "member");
  }

  const linkInvite = createHallInvite(detail.hall.hall_id, captain.user_id, "link");
  assert.ok(linkInvite?.invite_token);
  assert.ok(linkInvite?.invite_url?.includes("/hall/join"));

  const codeInvite = createHallInvite(detail.hall.hall_id, captain.user_id, "code");
  assert.ok(codeInvite?.invite_code);

  const recruit = upsertEmailUser("recruit@firehall.test").user;
  const joinInvite = joinHall(recruit.user_id, { invite_token: linkInvite!.invite_token! });
  assert.equal(joinInvite.ok, true);

  const preview = getJoinPreview({ invite_token: linkInvite!.invite_token! });
  assert.equal(preview?.hall_name, "Engine 12");

  assert.ok(memberHasPermission(detail.hall.hall_id, captain.user_id, "manage_members"));
  assert.ok(memberHasPermission(detail.hall.hall_id, captain.user_id, "view_hall_dashboard"));
  assert.ok(!memberHasPermission(detail.hall.hall_id, member.user_id, "manage_members"));
  assert.ok(memberHasPermission(detail.hall.hall_id, member.user_id, "participate_votes"));

  const promoted = updateMemberRole(
    detail.hall.hall_id,
    captain.user_id,
    member.user_id,
    "canteen_manager",
  );
  assert.equal(promoted, true);

  const halls = listUserHallSummaries(member.user_id);
  assert.equal(halls.length, 1);
  assert.equal(halls[0].role, "canteen_manager");
  assert.equal(halls[0].department_name, "City Fire");

  assert.ok(
    memberHasPermission(detail.hall.hall_id, member.user_id, "manage_supplies"),
  );
  assert.ok(
    memberHasPermission(detail.hall.hall_id, member.user_id, "manage_shopping_lists"),
  );

  const refreshed = getHallDetail(detail.hall.hall_id, captain.user_id);
  assert.equal(refreshed?.members.length, 3);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-membership] OK");
}

main().catch((err) => {
  console.error("[test-hall-membership] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
