#!/usr/bin/env tsx
/**
 * Validates Canteen Payment Tracker — enrollment, status, mark paid, Hall Pro gate.
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
import {
  bindBillingDb,
  enableHallPro,
  userHasFeature,
} from "../server/billing/store.js";
import {
  bindHallCanteenPaymentsDb,
  enrollAllCanteenMembers,
  getCanteenPaymentsPayload,
  markCanteenMemberPaid,
  updateCanteenMemberFrequency,
} from "../server/hall-canteen-payments/store.js";
import {
  computePaymentStatus,
  filterMembersByStatus,
  initialDueDate,
  summarizePaymentMembers,
} from "../shared/hall-canteen-payments/types.js";

const MIGRATIONS = [
  "014_user_accounts.sql",
  "015_hall_membership.sql",
  "016_billing.sql",
  "022_hall_identity.sql",
  "023_hall_pro_subscription.sql",
  "036_hall_identity_profile.sql",
  "037_canteen_payment_tracker.sql",
].map((name) =>
  fs.readFileSync(path.join(process.cwd(), "server", "db", "migrations", name), "utf8"),
);

const tmpDb = path.join(os.tmpdir(), `fh-canteen-payments-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.equal(computePaymentStatus("2099-01-01", null), "due");
  assert.equal(computePaymentStatus("2099-01-01", "2026-01-01"), "paid");
  assert.equal(computePaymentStatus("2020-01-01", null), "overdue");
  assert.ok(initialDueDate(new Date("2026-01-15"), "monthly").startsWith("2026-02"));

  const db = await openSqliteDatabase(tmpDb);
  for (const sql of MIGRATIONS) db.exec(sql);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);
  bindHallCanteenPaymentsDb(db);

  const captain = upsertEmailUser("captain@canteen.test").user;
  const manager = upsertEmailUser("manager@canteen.test").user;
  const member = upsertEmailUser("member@canteen.test").user;

  const detail = createHall(captain.user_id, {
    hall_name: "Engine 7",
    station_number: "7",
    department: "City Fire",
    crew_size: 12,
    shift_names: ["A Shift"],
    appliances: ["stove"],
  });
  const hallId = detail.hall.hall_id;
  joinHall(manager.user_id, { join_code: detail.hall.join_code });
  joinHall(member.user_id, { join_code: detail.hall.join_code });
  updateMemberRole(hallId, captain.user_id, manager.user_id, "canteen_manager");

  assert.equal(userHasFeature(captain.user_id, "canteen_payment_tracker", { hall_id: hallId }), false);

  enableHallPro(hallId, captain.user_id);
  assert.equal(userHasFeature(captain.user_id, "canteen_payment_tracker", { hall_id: hallId }), true);

  const beforeEnroll = getCanteenPaymentsPayload(hallId, captain.user_id);
  assert.ok(beforeEnroll);
  assert.equal(beforeEnroll!.enrolled_count, 0);
  assert.equal(beforeEnroll!.hall_member_count, 3);

  const enrolled = enrollAllCanteenMembers(hallId, manager.user_id);
  assert.ok(enrolled);
  assert.equal(enrolled!.enrolled_count, 3);
  assert.equal(enrolled!.summary.total_members, 3);
  assert.equal(enrolled!.summary.outstanding, 3);

  const target = enrolled!.members.find((m) => m.user_id === member.user_id);
  assert.ok(target);
  assert.equal(target!.frequency, "monthly");

  const semiAnnual = updateCanteenMemberFrequency(
    hallId,
    captain.user_id,
    member.user_id,
    "semi_annual",
  );
  assert.ok(semiAnnual);
  const updatedMember = semiAnnual!.members.find((m) => m.user_id === member.user_id);
  assert.equal(updatedMember?.frequency, "semi_annual");
  assert.equal(updatedMember?.frequency_label, "Semi-Annual");

  const paid = markCanteenMemberPaid(hallId, manager.user_id, member.user_id);
  assert.ok(paid);
  const paidMember = paid!.members.find((m) => m.user_id === member.user_id);
  assert.equal(paidMember?.status, "paid");
  assert.equal(paid!.summary.paid, 1);
  assert.equal(paid!.recent_history.length, 1);

  const dueOnly = filterMembersByStatus(paid!.members, "due");
  assert.equal(dueOnly.length, 2);
  assert.equal(summarizePaymentMembers(paid!.members).paid, 1);

  const memberView = getCanteenPaymentsPayload(hallId, member.user_id);
  assert.ok(memberView);
  assert.equal(memberView!.can_manage, false);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  console.log("[test-canteen-payments] OK");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    releaseSqliteTimersForTests();
  });
