/**
 * Firehall Meals — cinematic editorial image style presets.
 * Single visual identity across Golden 100, Hall Classics, and Explore heroes.
 */

export const IMAGE_STYLE_PRESET_VERSION = "2.0" as const;

/** Every preset shares this photographic baseline — category only changes mood/lighting nuance. */
const PRESET_PHOTO_CORE =
  "Photorealistic DSLR menu photograph, natural color, same dark firehall plate styling, locked camera angle from shot preset";

export const IMAGE_STYLE_PRESET_IDS = [
  "hall_bbq_dark",
  "comfort_firehall",
  "healthy_performance",
  "breakfast_shift",
  "pizza_night",
  "post_call_comfort",
] as const;

export type ImageStylePresetId = (typeof IMAGE_STYLE_PRESET_IDS)[number];

export type ImageCropPreference = "center" | "top" | "left" | "right";

export interface ImageStylePreset {
  id: ImageStylePresetId;
  displayName: string;
  /** One-line identity for prompt assembly */
  identity: string;
  lighting: string;
  cameraAngle: string;
  mood: string;
  atmosphere: string;
  composition: string;
  colorGrading: string;
  cropPreference: ImageCropPreference;
  textureEmphasis: string;
  /** Extra negative prompt fragments for this preset */
  avoid: string[];
}

export const IMAGE_STYLE_PRESETS: Record<ImageStylePresetId, ImageStylePreset> = {
  hall_bbq_dark: {
    id: "hall_bbq_dark",
    displayName: "Hall BBQ — Dark & Charred",
    identity: `${PRESET_PHOTO_CORE} — smoky grill night`,
    lighting:
      "low-key warm key from grill side, subtle smoke haze, real char highlights on protein, no fantasy ember glow",
    cameraAngle: "45° three-quarter hero angle, eye-level, slight off-center for depth",
    mood: "confident BBQ hall night — indulgent, smoky, crew-scale appetite",
    atmosphere: "dark station kitchen after grill service, embers and cast iron implied",
    composition:
      "protein forward on dark wood or slate, generous portion, char marks visible, 12% safe margin for mobile crop",
    colorGrading:
      "deep amber highlights, chocolate shadows, controlled orange in char, no neon, not oversaturated",
    cropPreference: "center",
    textureEmphasis: "real char crust, smoke-kissed surface, natural fat sheen, no plastic shine",
    avoid: ["daylight flat lighting", "salad-forward framing", "pastel props", "AI gloss", "CGI smoke"],
  },

  comfort_firehall: {
    id: "comfort_firehall",
    displayName: "Comfort Firehall",
    identity: `${PRESET_PHOTO_CORE} — station-house comfort`,
    lighting:
      "warm tungsten key from camera-left, soft fill, gentle steam when hot, golden highlights on cheese and sauce",
    cameraAngle: "slightly elevated 40° angle, intimate plate-forward framing",
    mood: "post-shift comfort — familiar, generous, emotionally warm",
    atmosphere: "cozy hall kitchen warmth, evening service, inviting not fussy",
    composition:
      "single generous plate or bowl, melted cheese and sauce gloss where appropriate, center-weighted for 4:5 mobile",
    colorGrading: "cinematic warm amber, rich midtones, soft roll-off in shadows",
    cropPreference: "center",
    textureEmphasis: "natural melted cheese, controlled sauce sheen, gentle steam, hearty portion density",
    avoid: ["clinical white plates", "diet portions", "cold blue cast", "sparse minimalist plating"],
  },

  healthy_performance: {
    id: "healthy_performance",
    displayName: "Healthy Performance",
    identity: `${PRESET_PHOTO_CORE} — lean hall fuel`,
    lighting:
      "bright natural-window key with soft diffusion, clean shadows, fresh herb speculars",
    cameraAngle: "45° angle, bowl or plate with clear protein zone, slight overhead hint",
    mood: "recovery and performance — satisfied, energized, still craveable",
    atmosphere: "fresh modern kitchen light, disciplined but not sad",
    composition:
      "bowl or plate with distinct protein and veg zones, colorful but natural, mobile-safe center crop",
    colorGrading: "balanced warmth with lifted greens, no oversaturated neon health glow",
    cropPreference: "top",
    textureEmphasis: "grill marks on lean protein, fresh veg moisture, grain or rice separation",
    avoid: ["sad diet bowls", "raw-only aesthetic", "supplement shaker props", "grey mush"],
  },

  breakfast_shift: {
    id: "breakfast_shift",
    displayName: "Breakfast Shift",
    identity: `${PRESET_PHOTO_CORE} — morning shift breakfast`,
    lighting:
      "soft morning window light from side, golden yolk highlights, gentle steam from hot elements",
    cameraAngle: "slightly above 35° — classic breakfast editorial, approachable",
    mood: "early shift or breakfast-for-dinner — bright, welcoming, hearty",
    atmosphere: "morning station light, coffee-adjacent warmth without showing cups as hero",
    composition: "stacked pancakes, hash, eggs, or burrito cross-section — generous, not dainty",
    colorGrading: "soft golden highlights, creamy whites, warm shadows, no harsh contrast",
    cropPreference: "top",
    textureEmphasis: "crispy bacon edges, runny yolk where appropriate, fluffy pancake texture",
    avoid: ["moody dark BBQ lighting", "tiny brunch portions", "sterile hotel buffet"],
  },

  pizza_night: {
    id: "pizza_night",
    displayName: "Pizza Night",
    identity: `${PRESET_PHOTO_CORE} — hall pizza night`,
    lighting:
      "warm oven-side key from behind-left, natural cheese highlight speculars, rustic board or peel edge",
    cameraAngle: "low 30° angle emphasizing crust edge — same preset family as catalog pizza shots",
    mood: "Friday hall pizza — fun, communal, craveable not greasy",
    atmosphere: "neighborhood pizzeria meets fire station — warm, lively, authentic",
    composition:
      "whole pie or controlled slice pull, leopard crust visible, center crop safe for cheese focus",
    colorGrading: "warm red-gold cheese tones, toasted crust browns, controlled oil sheen",
    cropPreference: "center",
    textureEmphasis: "bubbling mozzarella, blistered crust, natural oil sheen—not soggy center",
    avoid: ["delivery box", "frozen pizza look", "flat overhead only", "neon cheese", "AI cheese stretch"],
  },

  post_call_comfort: {
    id: "post_call_comfort",
    displayName: "Post-Call Comfort",
    identity: `${PRESET_PHOTO_CORE} — post-call comfort`,
    lighting:
      "low warm key, deep shadows, steam rising from bowl, candle-adjacent warmth without showing flame",
    cameraAngle: "eye-level bowl-forward or deep plate, intimate and heavy",
    mood: "post-call gravity — restorative, heavy, trustworthy",
    atmosphere: "quiet hall kitchen late night, earned meal, emotional warmth",
    composition: "deep bowl or loaded plate, toppings centered, steam visible, dark surround",
    colorGrading: "rich chocolate shadows, amber steam highlights, subdued palette",
    cropPreference: "center",
    textureEmphasis: "thick stew viscosity, steam, loaded toppings, hearty depth",
    avoid: ["bright summer salad energy", "airy fine dining", "tiny portions"],
  },
};

/** Map master category → default editorial preset */
export const MASTER_CATEGORY_TO_IMAGE_PRESET: Record<string, ImageStylePresetId> = {
  firehall_classics: "comfort_firehall",
  bbq_grill_nights: "hall_bbq_dark",
  quick_shift_meals: "comfort_firehall",
  comfort_food: "post_call_comfort",
  healthy_performance: "healthy_performance",
  pizza_night: "pizza_night",
  big_crew_feeders: "comfort_firehall",
  breakfast_brunch: "breakfast_shift",
  global_flavors: "comfort_firehall",
  game_day_watch_party: "hall_bbq_dark",
  meal_prep_leftovers: "comfort_firehall",
  rookie_friendly: "comfort_firehall",
};

export function isImageStylePresetId(value: string): value is ImageStylePresetId {
  return (IMAGE_STYLE_PRESET_IDS as readonly string[]).includes(value);
}

/** Legacy preset ids from older imagery pipeline — normalize before DB validation. */
const LEGACY_IMAGE_STYLE_PRESET_MAP: Record<string, ImageStylePresetId> = {
  firehall_editorial_v1: "comfort_firehall",
};

export function normalizeImageStylePresetId(value: string | undefined): ImageStylePresetId {
  if (!value) return "comfort_firehall";
  if (isImageStylePresetId(value)) return value;
  return LEGACY_IMAGE_STYLE_PRESET_MAP[value] ?? "comfort_firehall";
}

export function getImageStylePreset(id: ImageStylePresetId): ImageStylePreset {
  return IMAGE_STYLE_PRESETS[id];
}

export function resolveImageStylePreset(
  categoryId?: string,
  moodTags: string[] = [],
): ImageStylePresetId {
  if (categoryId && MASTER_CATEGORY_TO_IMAGE_PRESET[categoryId]) {
    return MASTER_CATEGORY_TO_IMAGE_PRESET[categoryId];
  }
  const blob = moodTags.join(" ").toLowerCase();
  if (/pizza|pie|pepperoni/.test(blob)) return "pizza_night";
  if (/bbq|grill|smoke|rib|brisket/.test(blob)) return "hall_bbq_dark";
  if (/breakfast|pancake|hash|brunch|morning/.test(blob)) return "breakfast_shift";
  if (/healthy|lean|salmon|performance|recovery/.test(blob)) return "healthy_performance";
  if (/chili|stew|comfort|post/.test(blob)) return "post_call_comfort";
  return "comfort_firehall";
}
