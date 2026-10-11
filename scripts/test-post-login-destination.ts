#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { postLoginDestination } from "../client/src/lib/auth/post-login-destination.ts";

function main(): void {
  // Signed-in home is Shift.
  assert.equal(postLoginDestination({ hasHall: true, authReturnTo: null }), "/shift");
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: null }), "/shift");
  assert.equal(
    postLoginDestination({ hasHall: false, authReturnTo: "/generator" }),
    "/generator",
  );
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: "/list" }), "/list");
  assert.equal(postLoginDestination({ hasHall: true, authReturnTo: "/" }), "/shift");
  // Legacy /home and /tonight returnTo also land on Shift.
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: "/home" }), "/shift");
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: "/tonight" }), "/shift");
  console.log("[test-post-login-destination] OK");
}

main();
