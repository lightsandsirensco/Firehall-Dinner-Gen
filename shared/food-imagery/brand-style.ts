/**
 * Firehall Meals — global visual brand for AI food photography.
 */

export const FIREHALL_FOOD_BRAND = {
  name: "Firehall Meals",
  lighting:
    "warm cinematic side light with soft fill, subtle smoke or steam when appropriate, golden hour warmth",
  background:
    "dark moody firehall kitchen backdrop — matte wood, cast iron, brushed steel, shallow depth of field",
  mood: "indulgent comfort food, crew-night energy, premium editorial not fast-food commercial",
  realism:
    "ultra realistic professional food photography, natural textures, real moisture and char, no plastic shine",
  camera:
    "45-degree hero angle or tight 3/4 close-up, center-weighted composition safe for mobile crop, shallow depth of field",
  colorGrade: "warm tones, rich shadows, controlled highlights, not oversaturated",
  avoid: [
    "cartoon",
    "illustration",
    "3d render",
    "oversaturated",
    "neon",
    "text overlay",
    "watermark",
    "logo",
    "hands",
    "utensils in focus",
    "duplicate plates",
    "deformed food",
    "plastic-looking cheese",
    "uncanny faces",
    "busy cluttered background",
  ],
} as const;

export const FIREHALL_NEGATIVE_PROMPT = [
  ...FIREHALL_FOOD_BRAND.avoid,
  "stock photo watermark",
  "generic buffet",
  "fast food chain branding",
  "AI art style",
  "painterly",
  "low resolution",
  "blurry",
].join(", ");
