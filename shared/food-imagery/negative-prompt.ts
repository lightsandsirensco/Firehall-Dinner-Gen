/**
 * Shared negative prompt — one brand-wide rejection list for all models.
 */

export const NEGATIVE_PROMPT_CATEGORIES = {
  style: [
    "cartoon",
    "illustration",
    "3d render",
    "cgi",
    "painterly",
    "AI art style",
    "anime",
    "sketch",
    "watercolor",
    "low resolution",
    "blurry",
    "oversharpened halos",
  ],
  lighting: [
    "flat overhead only",
    "harsh flash",
    "neon lighting",
    "cold blue color cast",
    "oversaturated",
    "blown highlights",
    "HDR look",
  ],
  composition: [
    "floating ingredients",
    "levitating food",
    "duplicate plates",
    "mirror symmetry errors",
    "extreme fisheye",
    "busy cluttered background",
    "garnish explosion",
    "microgreen avalanche",
    "random herbs scattered everywhere",
  ],
  texture: [
    "plastic-looking cheese",
    "waxy meat",
    "rubbery textures",
    "uncanny smooth surfaces",
    "fake grill marks",
    "melting objects incorrectly",
  ],
  content: [
    "text overlay",
    "watermark",
    "logo",
    "brand packaging",
    "hands",
    "faces",
    "utensils in focus",
    "human fingers",
    "stock photo watermark",
    "fast food chain branding",
    "generic buffet steam table",
    "deformed food",
    "extra limbs on food",
    "wrong dish type",
  ],
} as const;

export function buildMasterNegativePrompt(extra: string[] = []): string {
  const all = [
    ...NEGATIVE_PROMPT_CATEGORIES.style,
    ...NEGATIVE_PROMPT_CATEGORIES.lighting,
    ...NEGATIVE_PROMPT_CATEGORIES.composition,
    ...NEGATIVE_PROMPT_CATEGORIES.texture,
    ...NEGATIVE_PROMPT_CATEGORIES.content,
    ...extra,
  ];
  return [...new Set(all.map((s) => s.trim()).filter(Boolean))].join(", ");
}

/** @deprecated use buildMasterNegativePrompt */
export const FIREHALL_NEGATIVE_PROMPT = buildMasterNegativePrompt();
