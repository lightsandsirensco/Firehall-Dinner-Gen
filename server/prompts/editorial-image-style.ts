/**
 * Central Firehall editorial image style — single source for all meal imagery prompts.
 * Every generated image: MASTER_STYLE + meal-specific prompt.
 */

import {
  FIREHALL_MASTER_EDITORIAL_STYLE,
  FOOD_IMAGERY_STYLE_VERSION,
  getMasterStylePromptLines,
} from "../../shared/food-imagery/master-style.js";

export const EDITORIAL_IMAGE_STYLE_VERSION = `editorial-prompts-${FOOD_IMAGERY_STYLE_VERSION}`;

/** One master visual identity — gritty firehall kitchen, cinematic food photography. */
export const MASTER_EDITORIAL_VISUAL_STYLE = {
  aesthetic:
    "gritty firefighter kitchen aesthetic, cinematic commercial food photography, masculine hearty firehall portions",
  lighting:
    "warm tungsten key light from camera-left 45°, controlled fill from right, moody contrast, subtle steam only when dish is hot",
  grade:
    "cinematic warm grade — amber highlights, rich chocolate shadows, restrained saturation, no cold blue cast",
  plating: "realistic plating on dark surfaces, believable portion scale for hungry crew",
  textures:
    "stainless steel and weathered firehall kitchen textures in soft background bokeh, cast iron accents when natural",
  lens:
    "consistent 50mm equivalent perspective, center-weighted hero, 12% safe margin for mobile vertical crop, no fisheye",
  realism:
    "highly realistic commercial photography — natural moisture, real char, no plastic shine, no AI gloss",
  restrictions:
    "no Pinterest aesthetic, no bright white seamless backgrounds, no blog-style flat lay, no lifestyle influencer staging",
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
  "oversaturated Instagram filter",
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
  "utensils dominating the frame",
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
  cameraAngle: "three-quarter hero angle, eye-level to slightly above, dish centered",
  lightingDirection: "key from camera-left 45°, fill from right, single shadow direction",
  saturation: "moderate — rich but not oversaturated, natural food colors",
  contrast: "moody mid-high contrast, readable shadows, no crushed blacks",
  backgroundStyle:
    "dark matte firehall surface — weathered wood or slate, brushed steel blurred behind, shallow depth of field",
} as const;

export function getMasterEditorialStyleBlock(): string {
  const s = MASTER_EDITORIAL_VISUAL_STYLE;
  const n = NORMALIZED_CAPTURE;
  return [
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
