#!/usr/bin/env tsx
/**
 * Magic link UX — return path sanitization and consume flow.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  appendSignedInQuery,
  inboxUrlForEmail,
  maskEmailAddress,
  sanitizeReturnToPath,
} from "../shared/auth/return-to.js";
import { openSqliteDatabase, releaseSqliteTimersForTests } from "../server/sqlite.js";
import { bindAuthDb, consumeMagicLink, createMagicLink } from "../server/auth/auth-store.js";

const MIGRATION_014 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "014_user_accounts.sql"),
  "utf8",
);
const MIGRATION_038 = fs.readFileSync(
  path.join(process.cwd(), "server", "db", "migrations", "038_magic_link_return_to.sql"),
  "utf8",
);

const tmpDb = path.join(os.tmpdir(), `fh-magic-link-ux-${Date.now()}.db`);

async function main(): Promise<void> {
  assert.equal(sanitizeReturnToPath("/hall/join?token=abc"), "/hall/join?token=abc");
  assert.equal(sanitizeReturnToPath("https://evil.com/hack"), null);
  assert.equal(sanitizeReturnToPath("/admin/signups"), null);
  assert.equal(sanitizeReturnToPath("/api/auth/me"), null);
  assert.equal(
    appendSignedInQuery("/me/saved"),
    "/me/saved?signed_in=1",
  );
  assert.equal(maskEmailAddress("captain@firehall.org"), "c***@firehall.org");
  assert.ok(inboxUrlForEmail("crew@gmail.com").includes("mail.google.com"));

  const db = await openSqliteDatabase(tmpDb);
  db.exec(MIGRATION_014);
  db.exec(MIGRATION_038);
  bindAuthDb(db);

  const { rawToken } = createMagicLink("crew@firehall.test", "/hall/join?token=invite");
  const ok = consumeMagicLink(rawToken);
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.email, "crew@firehall.test");
    assert.equal(ok.returnTo, "/hall/join?token=invite");
  }

  const reused = consumeMagicLink(rawToken);
  assert.equal(reused.ok, false);
  if (!reused.ok) assert.equal(reused.reason, "used");

  const { rawToken: expiredToken } = createMagicLink("expired@firehall.test");
  db.prepare(`UPDATE auth_magic_links SET expires_at = ? WHERE email = ?`).run(
    new Date(Date.now() - 60_000).toISOString(),
    "expired@firehall.test",
  );
  const expired = consumeMagicLink(expiredToken);
  assert.equal(expired.ok, false);
  if (!expired.ok) assert.equal(expired.reason, "expired");

  try {
    fs.unlinkSync(tmpDb);
  } catch {
    /* ignore */
  }

  releaseSqliteTimersForTests();
  console.log("[test-magic-link-ux] OK");
}

main().catch((err) => {
  console.error(err);
  releaseSqliteTimersForTests();
  process.exit(1);
});
