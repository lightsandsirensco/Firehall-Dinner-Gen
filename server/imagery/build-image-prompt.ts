/**
 * Editorial image prompt builder — brand-consistent cinematic food photography.
 */

import { createHash } from "node:crypto";
import {
  getImageStylePreset,
  resolveImageStylePreset,
  IMAGE_STYLE_PRESET_VERSION,
  type ImageStylePresetId,
} from "../../shared/image-style-presets.js";
import {
  FIREHALL_MASTER_EDITORIAL_STYLE,
  getMasterStylePromptLines,
} from "../../shared/food-imagery/master-style.js";
import { buildMasterNegativePrompt } from "../../shared/food-imagery/negative-prompt.js";
import { getVisualLockPromptLines, getVisualLockNegatives } from "../../shared/visual-lock.js";
import { getMobileCropPromptLines } from "../../shared/mobile-crop-rules.js";
import {
  composeEditorialMealPrompt,
  getEditorialNegativePromptBlock,
  EDITORIAL_IMAGE_STYLE_VERSION,
} from "../prompts/editorial-image-style.js";

export interface BuildEditorialImagePromptInput {
  mealName: string;
  category?: string;
  cuisine?: string;
  protein?: string;
  mealFormat?: string;
  stylePreset?: ImageStylePresetId;
  moodTags?: string[];
  ingredientHints?: string[];
  hookLine?: string;
}

export interface EditorialImagePromptResult {
  positive: string;
  negative: string;
  promptSeed: string;
  promptHash: string;
  stylePreset: ImageStylePresetId;
  styleVersion: string;
}

const EDITORIAL_QUALITY_RULES = [
  "Ultra realistic food photography only — believable geometry, natural portion scale",
  "Premium editorial menu quality — Bon Appétit / Serious Eats hero shot discipline",
  "Cinematic but truthful — no AI slop, no waxy textures, no oversaturated neon food",
  "Consistent camera discipline — same brand look across every image in the set",
  "Mobile-first hero crop — subject centered with safe margins for 4:5 vertical cards",
  "No text, logos, watermarks, people, hands, faces, or delivery packaging",
] as const;

function stablePromptSeed(input: BuildEditorialImagePromptInput, presetId: ImageStylePresetId): string {
  const key = [
    input.mealName,
    presetId,
    input.category || "",
    input.cuisine || "",
    IMAGE_STYLE_PRESET_VERSION,
  ].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

function dishPlatingLine(mealFormat?: string, title?: string): string {
  const fmt = (mealFormat || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (fmt === "burger" || /burger|smash/.test(t)) {
    return "stacked handheld on glossy bun, visible layers, napkin at edge only";
  }
  if (fmt === "tacos" || /taco/.test(t)) return "street-style tacos on dark plate, charred edges visible";
  if (fmt === "pasta" || /pasta|spaghetti|lasagna|ziti/.test(t)) {
    return "twirled pasta in wide bowl, restrained garnish, generous portion";
  }
  if (fmt === "pizza" || /pizza|pie/.test(t)) return "whole pie or controlled slice, cheese bubble and crust char";
  if (fmt === "soup_chili" || /chili|stew|soup/.test(t)) return "deep bowl, toppings centered, visible steam";
  if (fmt === "bowl" || /bowl/.test(t)) return "generous bowl, distinct zones, protein forward";
  if (fmt === "grill" || /grill|bbq|smoked/.test(t)) return "protein on rustic platter, grill marks visible";
  return "single generous plate, sides soft at edges, firehall portion scale";
}

/**
 * Build premium cinematic editorial prompt for OpenAI Images API.
 */
export function buildEditorialImagePrompt(
  input: BuildEditorialImagePromptInput,
): EditorialImagePromptResult {
  const presetId =
    input.stylePreset ||
    resolveImageStylePreset(input.category, [
      ...(input.moodTags || []),
      input.mealFormat || "",
      input.protein || "",
    ]);

  const preset = getImageStylePreset(presetId);
  const promptSeed = stablePromptSeed(input, presetId);
  const dish = input.mealName.trim();
  const cuisine = input.cuisine?.trim() || "American comfort";
  const protein = input.protein?.trim() || "mixed";

  const ingredientLine =
    input.ingredientHints?.filter(Boolean).slice(0, 8).join(", ") ||
    "key ingredients visible and appetizing";

  const mealSpecific = [
    `Editorial menu photograph of "${dish}"`,
    `Firehall Meals — ${preset.identity}`,
    `Cuisine: ${cuisine}. Protein: ${protein}`,
    dishPlatingLine(input.mealFormat, dish),
    `Visible ingredients: ${ingredientLine}`,
    `Texture: ${preset.textureEmphasis}`,
    `Lighting: ${preset.lighting}`,
    `Camera: ${preset.cameraAngle}`,
    `Composition: ${preset.composition}`,
    `Atmosphere: ${preset.atmosphere}`,
    `Mood: ${preset.mood}`,
    `Color grade: ${preset.colorGrading}`,
    `Crop discipline: ${preset.cropPreference}-weighted for mobile vertical hero`,
    ...getVisualLockPromptLines(presetId),
    ...getMobileCropPromptLines(presetId),
    ...EDITORIAL_QUALITY_RULES,
    `Preset ${presetId} v${IMAGE_STYLE_PRESET_VERSION}`,
  ].join(". ");

  const positiveParts = [
    composeEditorialMealPrompt(mealSpecific),
    ...getMasterStylePromptLines(),
  ];

  if (input.hookLine?.trim()) {
    positiveParts.push(`Story: ${input.hookLine.trim()}`);
  }

  const negativeParts = [
    getEditorialNegativePromptBlock([buildMasterNegativePrompt()]),
    ...getVisualLockNegatives(presetId),
    ...preset.avoid,
    "oversaturated colors",
    "fake plastic food",
    "unrealistic geometry",
    "inconsistent camera angle",
    "random props",
    "fast food commercial glare",
    "stock photo sterility",
  ];

  const positive = positiveParts.join(". ");
  const negative = negativeParts.join(". ");
  const promptHash = createHash("sha256")
    .update(positive)
    .digest("hex")
    .slice(0, 24);

  return {
    positive,
    negative: negative.slice(0, 1200),
    promptSeed,
    promptHash,
    stylePreset: presetId,
    styleVersion: `${IMAGE_STYLE_PRESET_VERSION}+${EDITORIAL_IMAGE_STYLE_VERSION}`,
  };
}

/** Final model prompt — negative cues inlined (Images API has no negative field). */
export function buildEditorialModelPrompt(input: BuildEditorialImagePromptInput): string {
  const { positive, negative } = buildEditorialImagePrompt(input);
  return `${positive} Avoid: ${negative}`;
}
