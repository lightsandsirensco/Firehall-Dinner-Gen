/**
 * Editorial imagery system — visual lock, delivery, crops, quality scoring.
 */

import assert from "node:assert/strict";
import { IMAGE_STYLE_PRESET_IDS } from "../shared/image-style-presets.js";
import { getVisualLockSpec, getVisualLockPromptLines } from "../shared/visual-lock.js";
import { getMobileCropRule } from "../shared/mobile-crop-rules.js";
import {
  buildEditorialDelivery,
  cacheSafeImageUrl,
  editorialPathForRole,
} from "../shared/editorial-image-delivery.js";
import { buildSocialPackStub } from "../shared/editorial-image-social.js";
import {
  computeEditorialComposite,
  evaluateEditorialQualityScore,
} from "../shared/editorial-image-quality.js";
import { createEmptyEditorialImageMetadata } from "../shared/editorial-image-metadata.js";
import { buildEditorialImagePrompt } from "../server/imagery/build-image-prompt.js";
import { scoreEditorialImageQuality } from "../server/imagery/score-image-quality.js";

for (const id of IMAGE_STYLE_PRESET_IDS) {
  const lock = getVisualLockSpec(id);
  assert.ok(lock.cameraAngleDeg.max - lock.cameraAngleDeg.min <= 20, `${id} angle range`);
  const lines = getVisualLockPromptLines(id);
  assert.ok(lines.some((l) => l.includes("VISUAL LOCK")), id);

  const crop = getMobileCropRule(id);
  assert.equal(crop.variants.mobile.aspectLabel, "4:5 portrait");
  assert.ok(crop.variants.rail.width > crop.variants.thumb.width);

  const prompt = buildEditorialImagePrompt({
    mealName: "Test Dish",
    stylePreset: id,
    category: "bbq_grill_nights",
  });
  assert.ok(prompt.positive.includes("VISUAL LOCK"), `${id} prompt lock`);
  assert.ok(prompt.positive.includes("Mobile-first crop"), `${id} mobile crop`);
}

const delivery = buildEditorialDelivery("smash-burgers", 3);
assert.ok(delivery.mobileSrcSet?.includes("smash-burgers"));
assert.equal(
  cacheSafeImageUrl("/images/mobile/smash-burgers.jpg", 3),
  "/images/mobile/smash-burgers.jpg?v=3",
);

assert.equal(editorialPathForRole("rail", "chili"), "/images/rails/chili.jpg");

const meta = createEmptyEditorialImageMetadata("smash-burgers", "comfort_firehall", "abc123", 1);
assert.ok(meta.railPreviewImage.includes("/images/rails/"));
assert.ok(meta.delivery?.mobileSrcSet);

const social = buildSocialPackStub({
  slug: "smash-burgers",
  title: "Smash Burgers",
  stylePreset: "comfort_firehall",
  hookLine: "Hall-tested",
});
assert.ok(social.crops.instagramStory?.aspect === "9:16");
assert.equal(social.crops.instagramStory?.generated, false);

const composite = computeEditorialComposite({
  realism: 8,
  lightingQuality: 8,
  foodClarity: 8,
  appetiteAppeal: 8,
  framingConsistency: 8,
  textureRealism: 8,
  visualCleanliness: 8,
  mobileReadability: 8,
  flags: [],
  scoredAt: new Date().toISOString(),
  method: "heuristic",
});
assert.ok(composite >= 7.5);

const evaluated = evaluateEditorialQualityScore({
  realism: 5,
  lightingQuality: 5,
  foodClarity: 5,
  appetiteAppeal: 5,
  framingConsistency: 5,
  textureRealism: 5,
  visualCleanliness: 5,
  mobileReadability: 5,
  flags: [],
  scoredAt: new Date().toISOString(),
  method: "heuristic",
});
assert.equal(evaluated.needsRegeneration, true);

const tinyJpeg = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
]);
const scored = await scoreEditorialImageQuality({
  buffer: tinyJpeg,
  mealName: "Test",
  stylePreset: "comfort_firehall",
  useVision: false,
});
assert.ok(scored.composite > 0);

console.log("[test-editorial-imagery-system] OK");
