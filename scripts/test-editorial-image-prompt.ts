/**
 * Editorial imagery preset + prompt builder smoke test.
 */

import assert from "node:assert/strict";
import { IMAGE_STYLE_PRESET_IDS, resolveImageStylePreset } from "../shared/image-style-presets.js";
import { buildEditorialImagePrompt, buildEditorialModelPrompt } from "../server/imagery/build-image-prompt.js";
import { golden100HeroPath, mobileHeroPath, thumbImagePath, railPreviewPath } from "../server/imagery/paths.js";
import { getVisualLockPromptLines } from "../shared/visual-lock.js";

for (const id of IMAGE_STYLE_PRESET_IDS) {
  const p = buildEditorialImagePrompt({
    mealName: "Double Smash Burgers",
    category: id === "pizza_night" ? "pizza_night" : "bbq_grill_nights",
    cuisine: "American",
    protein: "beef",
    mealFormat: "burger",
    stylePreset: id,
  });
  assert.ok(p.positive.length > 200, `${id} prompt length`);
  assert.equal(p.stylePreset, id);
}

const resolved = resolveImageStylePreset("healthy_performance", ["lean", "salmon"]);
assert.equal(resolved, "healthy_performance");

const model = buildEditorialModelPrompt({
  mealName: "Firehall Chili",
  category: "comfort_food",
  cuisine: "American",
  protein: "beef",
  mealFormat: "soup_chili",
});
assert.ok(model.includes("Avoid:"));
assert.ok(!/oversaturated neon|AI slop/i.test(model) || model.includes("Avoid"));

assert.equal(golden100HeroPath("smash-burgers"), "/images/golden-100/smash-burgers.jpg");
assert.equal(mobileHeroPath("smash-burgers"), "/images/mobile/smash-burgers.jpg");
assert.equal(thumbImagePath("smash-burgers"), "/images/thumbs/smash-burgers.jpg");
assert.equal(railPreviewPath("smash-burgers"), "/images/rails/smash-burgers.jpg");
assert.ok(getVisualLockPromptLines("hall_bbq_dark")[0].includes("VISUAL LOCK"));

console.log("[test-editorial-image-prompt] OK", IMAGE_STYLE_PRESET_IDS.length, "presets");
