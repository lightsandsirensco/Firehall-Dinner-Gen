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

export const EDITORIAL_IMAGE_STYLE_VERSION = `editorial-prompts-${FOOD_IMAGERY_STYLE_VERSION}`;

/** One master visual identity — real kitchen, photoreal menu photography. */
export const MASTER_EDITORIAL_VISUAL_STYLE = {
  aesthetic:
    "photorealistic restaurant food photography in a real firehall kitchen — not illustration, not 3D, not AI fantasy food",
  lighting:
    "single warm practical key from camera-left 45°, soft fill, believable contrast, steam only when dish is hot",
  grade:
    "natural color grade — true food tones, restrained saturation, soft shadow roll-off, no cold blue cast",
  plating: "realistic plating on dark surfaces, believable portion scale, slight natural asymmetry",
  textures:
    "weathered wood and brushed steel in soft background bokeh, cast iron accents when natural",
  lens:
    "50mm full-frame perspective, center-weighted hero, 12% safe margin for mobile crop, no fisheye",
  realism:
    "looks like a professional food photographer shot it on location — natural moisture, real char, no plastic shine, no AI gloss",
  restrictions:
    "no Pinterest flat lay blog aesthetic, no bright white seamless studio, no influencer brunch staging, no oversaturated social filter",
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
  "generic buffet steam tables",
  "plastic garnish flowers",
] as const;

/** Normalized capture parameters — keep Golden 100 catalog visually cohesive. */
export const NORMALIZED_CAPTURE = {
  cameraAngle: "three-quarter hero angle per locked shot preset — eye-level to slightly above",
  lightingDirection: "key from camera-left 45°, fill from right, single shadow direction",
  saturation: "moderate — rich but natural, true ingredient colors",
  contrast: "realistic mid contrast, readable shadows, not crushed blacks or HDR halos",
  backgroundStyle:
    "dark matte firehall surface — weathered wood or slate, brushed steel blurred behind, shallow depth of field",
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
    `Editorial style system ${EDITORIAL_IMAGE_STYLE_VERSION}`,
  ].join(". ");
}

export function getEditorialNegativePromptBlock(extra: string[] = []): string {
  return [
    ...BANNED_AESTHETICS,
    ...BANNED_COMPOSITIONS,
    ...BANNED_PROPS,
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
