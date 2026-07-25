#!/usr/bin/env tsx
import assert from "node:assert/strict";
import {
  PRIMARY_TABS,
  resolveAppTab,
  resolveHallTab,
  resolveMealsTab,
  resolveWorkspace,
  shouldShowAppShell,
  workspaceHomeHref,
} from "../client/src/lib/app-nav.ts";

function main(): void {
  assert.deepEqual(
    PRIMARY_TABS.map((t) => t.id),
    ["tonight", "explore", "hall", "me"],
  );

  assert.equal(resolveAppTab("/tonight"), "tonight");
  // Legacy /home redirects to /tonight but still resolves to the tonight tab.
  assert.equal(resolveAppTab("/home"), "tonight");
  assert.equal(resolveAppTab("/explore"), "explore");
  assert.equal(resolveAppTab("/generator"), "explore");
  assert.equal(resolveAppTab("/me/saved"), "me");
  assert.equal(resolveAppTab("/hall"), "hall");
  assert.equal(resolveAppTab("/hall/tools"), "hall");
  assert.equal(resolveAppTab("/vote/x"), "hall");
  assert.equal(resolveAppTab("/hall-of-fame"), "explore");

  assert.equal(resolveWorkspace("/tonight"), "meals");
  assert.equal(resolveWorkspace("/hall"), "hall");
  assert.equal(resolveWorkspace("/"), null);

  assert.equal(workspaceHomeHref("hall"), "/tonight");
  assert.equal(workspaceHomeHref("meals"), "/tonight");

  assert.equal(resolveMealsTab("/generator"), "pick");
  assert.equal(resolveHallTab("/hall/canteen"), "tools");

  assert.equal(shouldShowAppShell("/tonight"), true);
  assert.equal(shouldShowAppShell("/home"), true);
  assert.equal(shouldShowAppShell("/hall"), true);
  // The one true Home — the landing page — never shows app chrome.
  assert.equal(shouldShowAppShell("/"), false);

  console.log("[test-app-nav] OK");
}

main();
