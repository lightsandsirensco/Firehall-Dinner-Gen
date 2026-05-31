/**
 * Central Firehall editorial image style — single source for all meal imagery prompts.
 * Every generated image: MASTER_STYLE + meal-specific prompt + locked shot preset.
 */

import {
  FIREHALL_MASTER_EDITORIAL_STYLE,
  FIREHALL_PHOTO_BASELINE,
  FOOD_IMAGERY_STYLE_VERSION,
  getMasterStylePromptLines,
} from "../../shared/food-imagery/master-style.js";
import {
  getFirehallKitchenNegativePromptLines,
  FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION,
} from "../../shared/food-imagery/firehall-kitchen-photo-standard.js";

export const EDITORIAL_IMAGE_STYLE_VERSION = `editorial-prompts-${FOOD_IMAGERY_STYLE_VERSION}`;

/** One master visual identity — real kitchen, photoreal menu photography. */
export const MASTER_EDITORIAL_VISUAL_STYLE = {
  aesthetic:
    "photorealistic professional food photography in an active Canadian firehall kitchen — not illustration, not 3D, not AI fantasy food, not restaurant marketing",
  lighting:
    "single warm practical key from camera-left 45°, soft fill, believable contrast, steam only when dish is hot",
  grade:
    "natural color grade — true food tones, restrained saturation, soft shadow roll-off, no cold blue cast",
  plating: "crew-sized family-style portions on prep surfaces, serving trays, or hotel pans — believable scale, slight natural asymmetry",
  textures:
    "commercial stainless prep tables, steam tables, sheet pans, brushed steel and pantry shelving in soft background bokeh",
  lens:
    "50mm full-frame perspective, center-weighted hero, 12% safe margin for mobile crop, no fisheye",
  realism:
    "looks like a professional food photographer shot it in a busy station kitchen — natural moisture, real char, documentary realism, no plastic shine, no AI gloss",
  restrictions:
    "no Pinterest flat lay blog aesthetic, no bright white seamless studio, no influencer brunch staging, no firefighter recruitment imagery, no oversaturated social filter",
} as const;

export const BANNED_AESTHETICS = [
  "Pinterest food blog",
  "bright white seamless studio",
  "pastel minimalist kitchen",
  "fast food commercial glare",
  "stock photo sterility",
  "influencer brunch aesthetic",
  "neon cyberpunk grading",
  "cartoon or illustration",
  "3D render or CGI",
  "generative AI food art",
  "oversaturated Instagram filter",
  "hyperreal CGI food",
] as const;

export const BANNED_COMPOSITIONS = [
  "top-down flat lay only",
  "extreme wide angle distortion",
  "floating ingredients",
  "duplicate plates",
  "busy garnish explosion",
  "microgreen avalanche",
  "hands or faces in frame",
  "text overlays or watermarks",
  "utensiles dominating the frame",
  "perfectly symmetrical AI plating",
] as const;

export const BANNED_PROPS = [
  "marble countertop influencer props",
  "excessive fairy lights",
  "random vintage cutlery clutter",
  "brand packaging visible",
  "fast food chain cups",
  "plastic garnish flowers",
  "fire trucks or pumpers",
  "bunker gear or turnout gear",
  "SCBA packs or helmets",
  "firefighter recruitment posters",
  "department logos or station patches",
  "Halligan bars axes hoses",
] as const;

/** Normalized capture parameters — keep Golden 100 catalog visually cohesive. */
export const NORMALIZED_CAPTURE = {
  cameraAngle: "three-quarter hero angle per locked shot preset — eye-level to slightly above",
  lightingDirection: "key from camera-left 45°, fill from right, single shadow direction",
  saturation: "moderate — rich but natural, true ingredient colors",
  contrast: "realistic mid contrast, readable shadows, not crushed blacks or HDR halos",
  backgroundStyle:
    "active Canadian firehall kitchen — commercial stainless, prep tables, steam tables, sheet pans, industrial lighting, shallow depth of field",
} as const;

export function getMasterEditorialStyleBlock(): string {
  const s = MASTER_EDITORIAL_VISUAL_STYLE;
  const n = NORMALIZED_CAPTURE;
  return [
    FIREHALL_PHOTO_BASELINE,
    s.aesthetic,
    `Lighting: ${s.lighting}`,
    `Color grade: ${s.grade}`,
    `Plating: ${s.plating}`,
    `Textures: ${s.textures}`,
    `Lens: ${s.lens}`,
    `Realism: ${s.realism}`,
    `Camera: ${n.cameraAngle}`,
    `Lighting direction: ${n.lightingDirection}`,
    `Saturation: ${n.saturation}`,
    `Contrast: ${n.contrast}`,
    `Background: ${n.backgroundStyle}`,
    s.restrictions,
    ...getMasterStylePromptLines(),
    `Editorial style system ${EDITORIAL_IMAGE_STYLE_VERSION} (kitchen standard ${FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION})`,
  ].join(". ");
}

export function getEditorialNegativePromptBlock(extra: string[] = []): string {
  return [
    ...BANNED_AESTHETICS,
    ...BANNED_COMPOSITIONS,
    ...BANNED_PROPS,
    ...getFirehallKitchenNegativePromptLines(),
    FIREHALL_MASTER_EDITORIAL_STYLE.restrictions,
    ...extra,
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

/** Compose final positive prompt: master style + meal-specific description. */
export function composeEditorialMealPrompt(mealSpecificPrompt: string): string {
  const meal = mealSpecificPrompt.trim();
  return `${getMasterEditorialStyleBlock()}. Dish: ${meal}`;
}
