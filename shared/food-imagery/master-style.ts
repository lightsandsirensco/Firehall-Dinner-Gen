/**
 * Firehall Meals — single editorial identity for ALL AI food photography.
 * Bump FOOD_IMAGERY_STYLE_VERSION to invalidate cached prompts/assets.
 */

export const FOOD_IMAGERY_STYLE_VERSION = "3.0";

/** Fixed master block — identical on every generation (consistency > creativity). */
export const FIREHALL_MASTER_EDITORIAL_STYLE = {
  brand: "Firehall Meals editorial food photography",
  reference:
    "Premium restaurant menu photography and Uber Eats hero ads — one cohesive dark-brand look",
  lighting:
    "warm directional key light from camera-left at 45°, soft fill from right, controlled rim light, subtle steam only when dish is hot",
  shadows:
    "deep but readable shadows under plate, single consistent shadow direction, no floating food",
  background:
    "dark matte firehall kitchen surface — weathered wood or slate, brushed steel accents blurred in background, shallow depth of field",
  colorGrade:
    "cinematic warm grade — amber highlights, rich chocolate shadows, muted greens, no neon, no cold blue cast, not oversaturated",
  realism:
    "ultra realistic food textures — natural moisture, real char, believable cheese melt, no plastic shine, no waxy skin, no AI gloss",
  depthOfField:
    "shallow depth of field f/2.8 look — hero dish tack sharp, background softly bokeh",
  framing:
    "center-weighted hero subject with 12% safe margin for mobile vertical crop, no extreme wide angle distortion",
  mood: "masculine firehall comfort food — confident, indulgent, crew-night premium, not fast-food commercial",
  props:
    "minimal props — cast iron edge or linen napkin only if natural, no cluttered tabletop, no garnish explosions",
  restrictions:
    "no text, no logos, no watermarks, no people, no hands, no faces, no utensils dominating frame",
} as const;

/** Ordered lines injected into every positive prompt in this exact sequence. */
export function getMasterStylePromptLines(): string[] {
  const s = FIREHALL_MASTER_EDITORIAL_STYLE;
  return [
    s.brand,
    s.reference,
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
    `Style system ${FOOD_IMAGERY_STYLE_VERSION}`,
  ];
}

/** Legacy export — consumers should use master-style, not ad-hoc strings. */
export const FIREHALL_FOOD_BRAND = {
  name: "Firehall Meals",
  lighting: FIREHALL_MASTER_EDITORIAL_STYLE.lighting,
  background: FIREHALL_MASTER_EDITORIAL_STYLE.background,
  mood: FIREHALL_MASTER_EDITORIAL_STYLE.mood,
  realism: FIREHALL_MASTER_EDITORIAL_STYLE.realism,
  camera: "shot preset applied per meal category — see shot-presets.ts",
  colorGrade: FIREHALL_MASTER_EDITORIAL_STYLE.colorGrade,
  avoid: [] as string[],
} as const;
