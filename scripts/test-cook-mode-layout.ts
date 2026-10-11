#!/usr/bin/env tsx
/**
 * Split Cook Mode — the recipe photo is a header band and instruction text
 * lives on a solid panel below it, never on top of the photo.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const src = read("client/src/components/cook-mode/cook-mode.tsx");

const imageAt = src.indexOf('data-testid="cook-mode-image"');
const panelAt = src.indexOf('data-testid="cook-mode-instruction-panel"');
const instructionAt = src.indexOf('data-testid="cook-mode-step-instruction"');
assert.ok(imageAt > 0 && panelAt > imageAt && instructionAt > panelAt, "photo band, then panel, then instruction");

const imageBlock = src.slice(imageAt, panelAt);
assert.ok(!imageBlock.includes("instruction"), "nothing instructional inside the photo band");
assert.ok(!/absolute inset-0/.test(imageBlock.replace(/<img[\s\S]*?\/>/, "")), "no overlay layer on the photo");

const panelLine = src.slice(panelAt - 400, panelAt);
assert.match(panelLine, /bg-card/, "instruction panel is a solid surface");
assert.ok(!/backdrop-blur|bg-black\/|bg-gradient/.test(src), "no glass, scrims or gradients as the reading surface");

assert.match(src, /sm:basis-\[38%\]/, "tablet/desktop photo band ≈ 38% of the content area");
assert.match(src, /h-\[clamp\(6\.5rem,20dvh,10rem\)\]/, "short photo header on phones");
assert.match(src, /sheetOpen && "max-sm:hidden"/, "phones drop the photo while Calls/Ingredients are open");

const holding = src.slice(src.indexOf('data-testid="cook-mode-holding-panel"') - 300);
assert.match(holding.slice(0, 400), /bg-card/, "Calls panel is solid");

for (const id of ["button-cook-mode-prev", "button-cook-mode-ingredients", "button-cook-mode-next", "button-cook-mode-done"]) {
  assert.ok(src.includes(id), `${id} kept`);
}
assert.match(src, /useScreenWakeLock\(open && wakeLockEnabled\)/, "wake lock unchanged");
assert.match(src, /onComplete\?\.\(\);\s*onOpenChange\(false\);/, "completion unchanged");

const adapters = read("client/src/lib/cook-mode/adapters.ts");
assert.match(adapters, /recipe\.hero_image_status === "ready"/, "Pick Tonight photo only when the hero is ready");
assert.match(adapters, /imageryStatus \?\? "approved"\) === "approved"/, "Explore photo only when approved");

console.log("[test-cook-mode-layout] OK");
