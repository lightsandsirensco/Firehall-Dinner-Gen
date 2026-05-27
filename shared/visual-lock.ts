/**
 * Visual locking — deterministic consistency within each style preset universe.
 * Recipes sharing a preset must read as the same photography series.
 */

import type { ImageStylePresetId } from "./image-style-presets.js";

export interface VisualLockSpec {
  presetId: ImageStylePresetId;
  /** Locked camera angle range (degrees from horizontal) */
  cameraAngleDeg: { nominal: number; min: number; max: number };
  lensFeel: string;
  lightingRatio: string;
  contrastProfile: string;
  cropComposition: string;
  plateTableStyling: string;
  colorGradeLock: string;
  /** Hard negatives injected into every prompt in this preset */
  lockedNegatives: string[];
}

export const VISUAL_LOCK_VERSION = "1.0" as const;

export const VISUAL_LOCK_BY_PRESET: Record<ImageStylePresetId, VisualLockSpec> = {
  hall_bbq_dark: {
    presetId: "hall_bbq_dark",
    cameraAngleDeg: { nominal: 45, min: 40, max: 50 },
    lensFeel: "85mm equivalent, shallow depth of field f/2.8, subtle background falloff",
    lightingRatio: "3:1 key-to-fill, warm grill-side key, controlled rim at 2 stops under key",
    contrastProfile: "medium-high contrast, deep chocolate shadows, amber highlight roll-off",
    cropComposition:
      "protein forward center-weighted, 14% safe margin all sides for mobile 4:5, char zone in upper third",
    plateTableStyling: "dark slate or charred wood board, cast-iron edge optional, no white porcelain",
    colorGradeLock: "locked amber-char palette — no cool shift between images in set",
    lockedNegatives: [
      "overhead flat lay",
      "wide-angle distortion",
      "bright daylight key",
      "mixed plate styles in frame",
      "random zoom levels",
    ],
  },

  comfort_firehall: {
    presetId: "comfort_firehall",
    cameraAngleDeg: { nominal: 40, min: 35, max: 45 },
    lensFeel: "50–85mm natural perspective, gentle compression, plate intimacy",
    lightingRatio: "2.5:1 warm tungsten key camera-left, soft fill right, steam rim when hot",
    contrastProfile: "medium contrast, rich midtones, soft shadow roll-off",
    cropComposition:
      "single plate center-dominant, cheese/sauce hero zone center, 12% margin for text overlay bottom third",
    plateTableStyling: "warm ceramic plate or shallow bowl, wood table tone consistent across set",
    colorGradeLock: "cinematic warm amber grade — consistent saturation cap across set",
    lockedNegatives: [
      "extreme low angle",
      "clinical overhead",
      "tiny diet portions",
      "cold blue white balance",
    ],
  },

  healthy_performance: {
    presetId: "healthy_performance",
    cameraAngleDeg: { nominal: 45, min: 40, max: 50 },
    lensFeel: "60mm clean editorial, moderate depth, crisp protein zone",
    lightingRatio: "2:1 window key with soft diffusion, fill at -1.5 stops, natural speculars",
    contrastProfile: "balanced contrast, lifted shadows, controlled highlight ceiling",
    cropComposition:
      "bowl/plate zones distinct, protein in center-upper third, 12% margin, top-weighted for greens",
    plateTableStyling: "light neutral plate or bowl, matte surface, minimal props, consistent bowl scale",
    colorGradeLock: "natural warmth + true greens — no neon health glow drift between images",
    lockedNegatives: [
      "moody BBQ darkness",
      "sad grey diet aesthetic",
      "macro extreme close-up only",
      "inconsistent bowl sizes",
    ],
  },

  breakfast_shift: {
    presetId: "breakfast_shift",
    cameraAngleDeg: { nominal: 35, min: 30, max: 40 },
    lensFeel: "50mm approachable breakfast editorial, moderate depth",
    lightingRatio: "2:1 soft morning side light, golden fill, gentle steam highlights",
    contrastProfile: "soft contrast, creamy highlights, warm shadow floor",
    cropComposition:
      "stack or spread center-weighted, yolk/pancake hero in upper-center, 12% margin for mobile",
    plateTableStyling: "warm diner plate or board, consistent morning table tone, generous not dainty",
    colorGradeLock: "soft golden morning grade — consistent across breakfast set",
    lockedNegatives: [
      "dark grill night lighting",
      "tiny brunch portions",
      "overhead-only framing",
      "mixed dinner plate styling",
    ],
  },

  pizza_night: {
    presetId: "pizza_night",
    cameraAngleDeg: { nominal: 30, min: 25, max: 35 },
    lensFeel: "70mm low hero emphasis on crust edge, shallow DOF on cheese bubble zone",
    lightingRatio: "2.5:1 oven-glow back-left key, front fill -1 stop, cheese specular control",
    contrastProfile: "warm medium-high, toasted crust separation, controlled oil sheen",
    cropComposition:
      "pie or slice center, crust arc visible, cheese focus center, 12% margin for vertical cards",
    plateTableStyling: "rustic peel or wooden board edge only, consistent pizzeria surface tone",
    colorGradeLock: "warm red-gold cheese palette locked — no neon orange drift",
    lockedNegatives: [
      "delivery box visible",
      "flat overhead only",
      "random zoom on single slice macro",
      "frozen pizza aesthetic",
    ],
  },

  post_call_comfort: {
    presetId: "post_call_comfort",
    cameraAngleDeg: { nominal: 15, min: 10, max: 25 },
    lensFeel: "50mm intimate eye-level, shallow depth, bowl-forward intimacy",
    lightingRatio: "3.5:1 low warm key, deep shadows, steam as secondary highlight",
    contrastProfile: "high emotional contrast, chocolate shadows, amber steam accents",
    cropComposition:
      "deep bowl center, toppings stacked center-upper, steam in upper third, 14% margin",
    plateTableStyling: "heavy bowl or deep plate, dark surround consistent, no bright summer props",
    colorGradeLock: "rich subdued comfort grade — consistent late-night warmth across set",
    lockedNegatives: [
      "bright salad energy",
      "airy fine dining negative space",
      "wide overhead spread",
      "inconsistent bowl depth framing",
    ],
  },
};

export function getVisualLockSpec(presetId: ImageStylePresetId): VisualLockSpec {
  return VISUAL_LOCK_BY_PRESET[presetId];
}

/** Prompt lines enforcing preset visual universe lock */
export function getVisualLockPromptLines(presetId: ImageStylePresetId): string[] {
  const lock = getVisualLockSpec(presetId);
  return [
    `VISUAL LOCK [${lock.presetId} v${VISUAL_LOCK_VERSION}]: same universe as all images in this preset`,
    `Camera angle LOCKED ${lock.cameraAngleDeg.min}°–${lock.cameraAngleDeg.max}° (nominal ${lock.cameraAngleDeg.nominal}°) — no random perspectives`,
    `Lens: ${lock.lensFeel}`,
    `Lighting ratio: ${lock.lightingRatio}`,
    `Contrast: ${lock.contrastProfile}`,
    `Composition: ${lock.cropComposition}`,
    `Plate/table: ${lock.plateTableStyling}`,
    `Color grade LOCK: ${lock.colorGradeLock}`,
    "Do not change zoom level, plate style, or photography aesthetic between shots in this series",
  ];
}

export function getVisualLockNegatives(presetId: ImageStylePresetId): string[] {
  return [
    ...getVisualLockSpec(presetId).lockedNegatives,
    "random camera perspectives",
    "inconsistent zoom levels",
    "mixed photography aesthetics",
    "dramatically different plate compositions",
  ];
}
