/**
 * Firehall Meals — single editorial identity for ALL AI food photography.
 * Bump FOOD_IMAGERY_STYLE_VERSION to invalidate cached prompts/assets.
 */

import {
  getFirehallKitchenPhotoStandardLines,
  FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION,
} from "./firehall-kitchen-photo-standard.js";

export const FOOD_IMAGERY_STYLE_VERSION = "5.0";

/** Shared photographic baseline — identical look on every hero (angles vary by shot preset only). */
export const FIREHALL_PHOTO_BASELINE =
  "Photorealistic professional food photograph shot on a full-frame DSLR in an active Canadian firehall kitchen — natural color, believable imperfections, not CGI or generative AI";

/** Fixed master block — identical on every generation (consistency > creativity). */
export const FIREHALL_MASTER_EDITORIAL_STYLE = {
  brand: "Firehall Meals editorial food photography",
  reference:
    "Firehall kitchen realism — crew-sized family-style portions in a busy Canadian station kitchen, documentary food photography not restaurant marketing",
  camera:
    "50mm prime lens, f/2.8, full-frame sensor, natural depth of field, subtle film grain, no fisheye, no HDR processing",
  lighting:
    "single warm key light from camera-left at 45°, soft fill from right, believable shadow falloff, steam only when the dish is genuinely hot",
  shadows:
    "one consistent shadow direction under the plate, contact shadows where food meets surface, no floating elements",
  background:
    "active Canadian firehall kitchen — commercial stainless prep tables, steam tables, sheet pans, industrial lighting, brushed steel and pantry shelving softly out of focus",
  colorGrade:
    "natural true-to-food color — restrained saturation, no neon, no cold blue cast, no oversharpened HDR glow, no AI color pop",
  realism:
    "photorealistic — natural moisture, real char and sear, believable cheese melt, slight asymmetry in plating, micro-imperfections on garnish, no plastic shine, no waxy skin, no airbrushed smoothness",
  depthOfField:
    "shallow depth of field like a real camera — hero dish tack sharp, background bokeh organic not synthetic",
  framing:
    "center-weighted hero subject with 12% safe margin for mobile vertical crop, no extreme wide-angle distortion",
  mood: "served to a hungry fire crew after calls — hearty, generous, appetizing and real, not fast-food commercial, not fantasy food art",
  props:
    "serving trays, hotel pans, cutting boards, sheet pans, carving boards — crew-sized presentation, no garnish explosions",
  restrictions:
    "no text, no logos, no watermarks, no fire trucks or firefighting gear, no recruitment imagery, no hands or faces in focus, no utensils dominating frame; blurred background kitchen staff in navy station shirts or aprons optional",
} as const;

/** Ordered lines injected into every positive prompt in this exact sequence. */
export function getMasterStylePromptLines(): string[] {
  const s = FIREHALL_MASTER_EDITORIAL_STYLE;
  return [
    s.brand,
    FIREHALL_PHOTO_BASELINE,
    ...getFirehallKitchenPhotoStandardLines(),
    s.reference,
    `Camera: ${s.camera}`,
    `Lighting: ${s.lighting}`,
    `Shadows: ${s.shadows}`,
    `Background: ${s.background}`,
    `Color grade: ${s.colorGrade}`,
    `Realism: ${s.realism}`,
    `Depth of field: ${s.depthOfField}`,
    `Framing: ${s.framing}`,
    `Mood: ${s.mood}`,
    `Props: ${s.props}`,
    s.restrictions,
    `Style system ${FOOD_IMAGERY_STYLE_VERSION} (kitchen standard ${FIREHALL_KITCHEN_PHOTO_STANDARD_VERSION})`,
  ];
}

/** Legacy export — consumers should use master-style, not ad-hoc strings. */
export const FIREHALL_FOOD_BRAND = {
  name: "Firehall Meals",
  lighting: FIREHALL_MASTER_EDITORIAL_STYLE.lighting,
  background: FIREHALL_MASTER_EDITORIAL_STYLE.background,
  mood: FIREHALL_MASTER_EDITORIAL_STYLE.mood,
  realism: FIREHALL_MASTER_EDITORIAL_STYLE.realism,
  camera: FIREHALL_MASTER_EDITORIAL_STYLE.camera,
  colorGrade: FIREHALL_MASTER_EDITORIAL_STYLE.colorGrade,
  avoid: [] as string[],
} as const;
