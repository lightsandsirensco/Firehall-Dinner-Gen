#!/usr/bin/env tsx
/**
 * Magic link email transport — URL building + configured-state checks.
 */
import assert from "node:assert/strict";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

async function loadMailModule() {
  return import("../server/auth/magic-link-mail.js");
}

async function main(): Promise<void> {
  process.env.PUBLIC_SITE_URL = "https://firehallmeals.com";
  const mod1 = await loadMailModule();
  const link = mod1.buildMagicLinkUrl("test-token-abc");
  assert.equal(
    link,
    "https://www.firehallmeals.com/api/auth/verify-magic?token=test-token-abc",
    "apex origin normalizes to www canonical",
  );

  restoreEnv();
  process.env.NODE_ENV = "production";
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  const mod2 = await loadMailModule();
  assert.equal(mod2.isMagicLinkEmailConfigured(), false);
  const blocked = await mod2.sendMagicLinkEmail("crew@firehall.test", "token-1");
  assert.equal(blocked.sent, false);
  assert.equal(blocked.error, "not_configured");

  restoreEnv();
  process.env.NODE_ENV = "development";
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  const mod3 = await loadMailModule();
  const dev = await mod3.sendMagicLinkEmail("crew@firehall.test", "token-dev");
  assert.equal(dev.sent, false);
  assert.equal(dev.mode, "development");
  assert.ok(dev.devLink.includes("token-dev"));

  restoreEnv();
  console.log("[test-magic-link-mail] OK");
}

main().catch((err) => {
  console.error(err);
  restoreEnv();
  process.exit(1);
});
