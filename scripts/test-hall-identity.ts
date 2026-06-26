#!/usr/bin/env tsx
/**
 * Validates Hall Identity V1 — structured shifts, location fields, member shift assignment.
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
  getHallDetail,
  updateHall,
  updateMemberShift,
} from "../server/hall-membership/store.js";
import { bindBillingDb } from "../server/billing/store.js";
import {
  formatMemberCountLabel,
  formatStationLabel,
  getHallPhotoUrl,
  resolveCanteenManagerDisplayName,
} from "../shared/hall-identity/display.js";
import { HALL_SHIFT_KEYS } from "../shared/hall-identity/shifts.js";

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
const MIGRATION_036 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "036_hall_identity_profile.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-hall-identity-${Date.now()}.db`);

async function main(): Promise<void> {
  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_015);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_022);
  db.exec(MIGRATION_036);
  bindAuthDb(db);
  bindHallMembershipDb(db);
  bindBillingDb(db);

  const captain = upsertEmailUser("captain@identity.test").user;
  const member = upsertEmailUser("member@identity.test").user;

  assert.equal(formatStationLabel("312"), "Station 312");
  assert.equal(formatStationLabel(""), null);
  assert.equal(formatMemberCountLabel(18), "18 Members");
  assert.equal(getHallPhotoUrl(null), null);
  assert.equal(getHallPhotoUrl("  https://example.com/a.jpg "), "https://example.com/a.jpg");
  assert.equal(
    resolveCanteenManagerDisplayName(null, "user-1", [
      { user_id: "user-1", role: "member", display_name: "Alex R." },
    ]),
    "Alex R.",
  );

  const detail = createHall(captain.user_id, {
    hall_name: "Engine 12",
    station_number: "12",
    department: "City Fire",
    city: "Springfield",
    province_state: "Ontario",
    motto: "Feed the crew.",
    crew_size: 24,
    shifts: HALL_SHIFT_KEYS.map((shift_key) => ({
      shift_key,
      name: `${shift_key.toUpperCase()} Shift`,
      enabled: shift_key === "a" || shift_key === "b",
    })),
    appliances: ["stove", "grill"],
  });

  assert.equal(detail.shifts.length, 4);
  assert.equal(detail.hall.city, "Springfield");
  assert.equal(detail.hall.motto, "Feed the crew.");
  assert.equal(detail.hall.province_state, "Ontario");
  assert.deepEqual(detail.hall.shift_names, ["A Shift", "B Shift"]);

  const aShift = detail.shifts.find((shift) => shift.shift_key === "a");
  assert.ok(aShift?.enabled);
  assert.equal(aShift?.name, "A Shift");

  const updated = updateHall(detail.hall.hall_id, captain.user_id, {
    city: "Metro City",
    hall_photo_url: "https://example.com/hall.jpg",
    motto: "Always ready.",
    shifts: HALL_SHIFT_KEYS.map((shift_key) => ({
      shift_key,
      name: shift_key === "a" ? "Day Crew" : `${shift_key.toUpperCase()} Shift`,
      enabled: shift_key === "a" || shift_key === "b",
    })),
  });
  assert.ok(updated);
  assert.equal(updated?.city, "Metro City");
  assert.equal(updated?.hall_photo_url, "https://example.com/hall.jpg");
  assert.equal(updated?.motto, "Always ready.");
  assert.equal(updated?.shift_names[0], "Day Crew");

  const assigned = updateMemberShift(
    detail.hall.hall_id,
    captain.user_id,
    member.user_id,
    aShift!.shift_id,
  );
  assert.equal(assigned, false, "member must join before shift assignment");

  const { joinHall } = await import("../server/hall-membership/store.js");
  const joined = joinHall(member.user_id, { join_code: detail.hall.join_code });
  assert.equal(joined.ok, true);

  const shiftAssigned = updateMemberShift(
    detail.hall.hall_id,
    member.user_id,
    member.user_id,
    aShift!.shift_id,
  );
  assert.equal(shiftAssigned, true);

  const refreshed = getHallDetail(detail.hall.hall_id, captain.user_id);
  const crewMember = refreshed?.members.find((m) => m.user_id === member.user_id);
  assert.equal(crewMember?.shift_id, aShift!.shift_id);
  assert.equal(crewMember?.shift_name, "Day Crew");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-hall-identity] OK");
}

main().catch((err) => {
  console.error("[test-hall-identity] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
