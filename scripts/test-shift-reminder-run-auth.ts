#!/usr/bin/env tsx
/**
 * POST /api/shift-reminder/run — only reachable with SHIFT_REMINDER_RUN_KEY
 * configured, and only with that key in the x-shift-reminder-key header.
 *
 *   npx tsx scripts/test-shift-reminder-run-auth.ts
 */
import express from "express";
import type { AddressInfo } from "node:net";
import {
  SHIFT_REMINDER_RUN_KEY_HEADER,
  authorizeShiftReminderRun,
  createShiftReminderRunHandler,
} from "../server/shift-reminder/run-endpoint.js";

let failures = 0;
function check(name: string, ok: boolean): void {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}`);
  }
}

const SECRET = "test-run-key-7f3a9c";

async function callRun(opts: {
  configuredKey: string | undefined;
  header?: string;
  runDue?: () => Promise<number>;
}): Promise<{ status: number; body: string; runs: number }> {
  let runs = 0;
  const app = express();
  app.post(
    "/api/shift-reminder/run",
    createShiftReminderRunHandler({
      runDue: async () => {
        runs++;
        return opts.runDue ? opts.runDue() : 3;
      },
      getConfiguredKey: () => opts.configuredKey,
    }),
  );
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  try {
    const { port } = server.address() as AddressInfo;
    const headers: Record<string, string> = {};
    if (opts.header !== undefined) headers[SHIFT_REMINDER_RUN_KEY_HEADER] = opts.header;
    const res = await fetch(`http://127.0.0.1:${port}/api/shift-reminder/run`, { method: "POST", headers });
    return { status: res.status, body: await res.text(), runs };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function main(): Promise<void> {
  console.log("authorizeShiftReminderRun");
  check("no configured key → disabled", authorizeShiftReminderRun(SECRET, undefined) === "disabled");
  check("blank configured key → disabled", authorizeShiftReminderRun(SECRET, "   ") === "disabled");
  check("missing header → unauthorized", authorizeShiftReminderRun(undefined, SECRET) === "unauthorized");
  check("wrong key → unauthorized", authorizeShiftReminderRun("nope", SECRET) === "unauthorized");
  check("key prefix → unauthorized", authorizeShiftReminderRun(SECRET.slice(0, 6), SECRET) === "unauthorized");
  check("correct key → authorized", authorizeShiftReminderRun(SECRET, SECRET) === "authorized");

  console.log("HTTP behaviour");
  const noKey = await callRun({ configuredKey: undefined, header: SECRET });
  check("no key configured → 404", noKey.status === 404);
  check("no key configured → scheduler not run", noKey.runs === 0);

  const missing = await callRun({ configuredKey: SECRET });
  check("missing header → 401", missing.status === 401);
  check("missing header → scheduler not run", missing.runs === 0);

  const wrong = await callRun({ configuredKey: SECRET, header: "wrong-key" });
  check("wrong key → 401", wrong.status === 401);
  check("wrong key → scheduler not run", wrong.runs === 0);

  const correct = await callRun({ configuredKey: SECRET, header: SECRET });
  check("correct key → 200", correct.status === 200);
  check("correct key → scheduler run once", correct.runs === 1);
  check("correct key → reports sent count", JSON.parse(correct.body).sent === 3);

  const failing = await callRun({
    configuredKey: SECRET,
    header: SECRET,
    runDue: async () => {
      throw new Error("smtp down");
    },
  });
  check("scheduler failure → 500", failing.status === 500);

  const responses = [noKey, missing, wrong, correct, failing];
  check("secret never appears in any response", responses.every((r) => !r.body.includes(SECRET)));

  if (failures > 0) {
    console.error(`\n${failures} shift reminder run auth check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll shift reminder run auth checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
