import assert from "node:assert/strict";
import { trackReplitEvent } from "../client/src/lib/replit-analytics";

async function main() {
  const globals = globalThis as unknown as { window?: Window };
  const original = globals.window;
  try {
    delete globals.window;
    assert.doesNotThrow(() => trackReplitEvent("recipe_save"));
    globals.window = {} as Window;
    assert.doesNotThrow(() => trackReplitEvent("recipe_save"));
    const calls: Array<{ name: string; data: unknown }> = [];
    globals.window.umami = {
      track(name, data) { calls.push({ name, data }); },
    };
    trackReplitEvent("recipe_save", {
      recipe_slug: "big-chili", email: "private@example.com", recipe_title: "Private text",
    });
    assert.deepEqual(calls, [{ name: "recipe_save", data: { recipe_slug: "big-chili" } }]);
    trackReplitEvent("profile_updated", { user_id: "private" });
    assert.equal(calls.length, 1);
    trackReplitEvent("meal_generated", { crew_size: 8, time_available: Infinity, recipe_slug: "free form text" });
    assert.deepEqual(calls[1].data, { crew_size: 8 });
    globals.window.umami.track = () => { throw new Error("Tracker unavailable"); };
    assert.doesNotThrow(() => trackReplitEvent("wheel_spin"));
    globals.window.umami.track = () => Promise.reject(new Error("Network unavailable"));
    trackReplitEvent("wheel_spin");
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.log("[test-replit-analytics] PASS: safe no-op, event/property allowlists, sync/async failure isolation");
  } finally {
    if (original === undefined) delete globals.window;
    else globals.window = original;
  }
}
void main();
