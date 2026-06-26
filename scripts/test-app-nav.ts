#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { resolveAppTab, shouldShowAppShell } from "../client/src/lib/app-nav.ts";

function main(): void {
  assert.equal(resolveAppTab("/home"), "home");
  assert.equal(resolveAppTab("/discover"), null);
  assert.equal(resolveAppTab("/generator"), "home");
  assert.equal(resolveAppTab("/wheel"), "home");
  assert.equal(resolveAppTab("/explore"), "explore");
  assert.equal(resolveAppTab("/tonight"), "tonight");
  assert.equal(resolveAppTab("/vote/abc"), "tonight");
  assert.equal(resolveAppTab("/hall"), "hall");
  assert.equal(resolveAppTab("/hall/features"), "hall");
  assert.equal(resolveAppTab("/hall/canteen"), "hall");
  assert.equal(resolveAppTab("/hall/history"), "hall");
  assert.equal(resolveAppTab("/me"), "me");
  assert.equal(resolveAppTab("/me/profile"), "me");
  assert.equal(resolveAppTab("/me/history"), "me");
  assert.equal(resolveAppTab("/me/settings"), "me");
  assert.equal(shouldShowAppShell("/"), false);
  assert.equal(shouldShowAppShell("/home"), true);
  assert.equal(shouldShowAppShell("/tonight"), true);
  assert.equal(shouldShowAppShell("/admin"), false);
  console.log("[test-app-nav] OK");
}

main();
