#!/usr/bin/env tsx
import assert from "node:assert/strict";
import {
  PRIMARY_TABS,
  SIGNED_IN_TABS,
  appHomeFor,
  primaryTabsFor,
  resolveAppTab,
  resolveHallTab,
  resolveMealsTab,
  resolveWorkspace,
  shouldShowAppShell,
  workspaceHomeHref,
} from "../client/src/lib/app-nav.ts";
import { PICK_TONIGHT_LEAD_MS, tonightShortcut } from "../client/src/lib/shift-home.ts";

function signedOut(): void {
  // Hall is deliberately left out of the primary tab bar (private beta /
  // coming soon) — see app-nav.ts. Routing to /hall still works below.
  assert.deepEqual(
    PRIMARY_TABS.map((t) => t.id),
    ["tonight", "explore", "me"],
  );
  assert.equal(primaryTabsFor(false), PRIMARY_TABS);
  assert.equal(appHomeFor(false), "/tonight");

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
  // Signed-out visitors on signed-in surfaces never get tabs they can't see.
  assert.equal(resolveAppTab("/shift"), "tonight");
  assert.equal(resolveAppTab("/list"), "tonight");

  assert.equal(resolveWorkspace("/tonight"), "meals");
  assert.equal(resolveWorkspace("/hall"), "hall");
  assert.equal(resolveWorkspace("/"), null);

  assert.equal(workspaceHomeHref("hall"), "/tonight");
  assert.equal(workspaceHomeHref("meals"), "/tonight");

  assert.equal(resolveMealsTab("/generator"), "pick");
  assert.equal(resolveHallTab("/hall/canteen"), "tools");
}

function signedIn(): void {
  assert.deepEqual(
    SIGNED_IN_TABS.map((t) => [t.id, t.href]),
    [
      ["shift", "/shift"],
      ["explore", "/explore"],
      ["list", "/list"],
      ["me", "/me"],
    ],
  );
  assert.equal(primaryTabsFor(true), SIGNED_IN_TABS);
  assert.equal(appHomeFor(true), "/shift");

  assert.equal(resolveAppTab("/shift", true), "shift");
  assert.equal(resolveAppTab("/shift-planner", true), "shift");
  assert.equal(resolveAppTab("/tonight", true), "shift");
  assert.equal(resolveAppTab("/home", true), "shift");
  assert.equal(resolveAppTab("/generator", true), "shift");
  assert.equal(resolveAppTab("/list", true), "list");
  assert.equal(resolveAppTab("/shift-planner/shop", true), "list");
  assert.equal(resolveAppTab("/explore", true), "explore");
  assert.equal(resolveAppTab("/wheel", true), "explore");
  assert.equal(resolveAppTab("/guides", true), "explore");
  assert.equal(resolveAppTab("/recipes/x", true), "explore");
  assert.equal(resolveAppTab("/me", true), "me");
  assert.equal(resolveAppTab("/me/schedule", true), "me");
  assert.equal(resolveAppTab("/me/shopping-list", true), "me");
}

function shell(): void {
  assert.equal(shouldShowAppShell("/tonight"), true);
  assert.equal(shouldShowAppShell("/home"), true);
  assert.equal(shouldShowAppShell("/hall"), true);
  assert.equal(shouldShowAppShell("/shift"), true);
  assert.equal(shouldShowAppShell("/list"), true);
  // The one true Home — the landing page — never shows app chrome.
  assert.equal(shouldShowAppShell("/"), false);
  // Public legal and SEO pages render as plain marketing pages — no bottom tab bar.
  assert.equal(shouldShowAppShell("/privacy"), false);
  assert.equal(shouldShowAppShell("/terms"), false);
  assert.equal(shouldShowAppShell("/firefighter-meals"), false);
}

function shortcut(): void {
  const now = Date.parse("2026-10-09T20:00:00Z");
  const at = (offsetMs: number, lengthMs = 24 * 3_600_000) => ({
    start: new Date(now + offsetMs).toISOString(),
    end: new Date(now + offsetMs + lengthMs).toISOString(),
  });

  // A deliberate pick for tonight always wins.
  assert.equal(tonightShortcut({ hasTonightPick: true, planAhead: true, shift: at(5 * 86_400_000), now }), "current_meal");
  // No schedule / no upcoming shift.
  assert.equal(tonightShortcut({ hasTonightPick: false, planAhead: false, shift: null, now }), "pick");
  // Current shift.
  assert.equal(tonightShortcut({ hasTonightPick: false, planAhead: false, shift: at(-3_600_000), now }), "pick");
  // Next shift starts soon.
  assert.equal(tonightShortcut({ hasTonightPick: false, planAhead: false, shift: at(PICK_TONIGHT_LEAD_MS - 1), now }), "pick");
  // Future shift — still days off.
  assert.equal(tonightShortcut({ hasTonightPick: false, planAhead: false, shift: at(3 * 86_400_000), now }), null);
  // Plan Ahead on a later shift.
  assert.equal(tonightShortcut({ hasTonightPick: false, planAhead: true, shift: at(3_600_000), now }), null);
}

signedOut();
signedIn();
shell();
shortcut();
console.log("[test-app-nav] OK");
