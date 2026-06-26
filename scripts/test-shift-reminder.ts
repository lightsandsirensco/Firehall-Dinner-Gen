#!/usr/bin/env tsx
/**
 * Validates shift reminder scheduling and send deduplication.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, upsertEmailUser, updateUserProfile } from "../server/auth/auth-store.js";
import { bindBillingDb } from "../server/billing/store.js";
import {
  bindShiftReminderDb,
  createShiftReminderSend,
  evaluateShiftReminderForUser,
  listDueShiftReminders,
  markShiftReminderClicked,
  markShiftReminderOpened,
} from "../server/shift-reminder/store.js";
import { shouldSendShiftReminder } from "../shared/shift-reminder/scheduling.js";
import { buildShiftReminderEmailHtml } from "../server/shift-reminder/mail.js";

const MIGRATION_014 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),
  "utf8",
);
const MIGRATION_016 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "016_billing.sql"),
  "utf8",
);
const MIGRATION_020 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "020_shift_reminders.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-shift-reminder-${Date.now()}.db`);

function utcAt(iso: string): Date {
  return new Date(iso);
}

async function main(): Promise<void> {
  const decision = shouldSendShiftReminder({
    shiftDays: [1],
    reminderTime: "18:00",
    timeZone: "America/New_York",
    now: utcAt("2026-06-21T22:00:00.000Z"), // Sunday 6pm EDT
  });
  assert.equal(decision.send, true);
  assert.ok(decision.shiftDate);

  const skip = shouldSendShiftReminder({
    shiftDays: [1],
    reminderTime: "18:00",
    timeZone: "America/New_York",
    now: utcAt("2026-06-21T15:00:00.000Z"),
  });
  assert.equal(skip.send, false);

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_016);
  db.exec(MIGRATION_020);
  bindAuthDb(db);
  bindBillingDb(db);
  bindShiftReminderDb(db);

  const user = upsertEmailUser("shift@firehall.test").user;
  updateUserProfile(user.user_id, {
    display_name: "Mike",
    shift_reminders_enabled: true,
    shift_days: [1],
    shift_reminder_time: "18:00",
    shift_reminder_timezone: "America/New_York",
  });

  const candidate = evaluateShiftReminderForUser(user.user_id, utcAt("2026-06-21T22:00:00.000Z"));
  assert.ok(candidate);
  assert.equal(candidate!.email, "shift@firehall.test");

  const due = listDueShiftReminders(utcAt("2026-06-21T22:00:00.000Z"));
  assert.equal(due.length, 1);

  const sendId = createShiftReminderSend(user.user_id, candidate!.shift_date);
  const html = buildShiftReminderEmailHtml({
    sendId,
    displayName: "Mike",
    shiftDateLabel: "Mon 6/22",
  });
  assert.ok(html.includes("Tomorrow is shift day"));
  assert.ok(html.includes("Generate Meal"));
  assert.ok(html.includes("Start Vote"));

  assert.equal(listDueShiftReminders(utcAt("2026-06-21T22:00:00.000Z")).length, 0);

  assert.equal(markShiftReminderOpened(sendId), true);
  assert.equal(markShiftReminderOpened(sendId), false);

  const click = markShiftReminderClicked(sendId, "generate");
  assert.ok(click);
  assert.equal(click!.firstClick, true);

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-shift-reminder] OK");
}

main().catch((err) => {
  console.error("[test-shift-reminder] FAILED", err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
