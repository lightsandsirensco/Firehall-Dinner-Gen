#!/usr/bin/env tsx
import assert from "node:assert/strict";
import { postLoginDestination } from "../client/src/lib/auth/post-login-destination.ts";

function main(): void {
  assert.equal(postLoginDestination({ hasHall: true, authReturnTo: null }), "/tonight");
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: null }), "/tonight");
  assert.equal(
    postLoginDestination({ hasHall: false, authReturnTo: "/generator" }),
    "/generator",
  );
  assert.equal(postLoginDestination({ hasHall: true, authReturnTo: "/" }), "/tonight");
  // Legacy /home returnTo also lands on Tonight.
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: "/home" }), "/tonight");
  assert.equal(postLoginDestination({ hasHall: false, authReturnTo: "/tonight" }), "/tonight");
  console.log("[test-post-login-destination] OK");
}

main();
