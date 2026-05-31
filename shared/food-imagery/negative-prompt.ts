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
    "generative AI food",
    "Midjourney look",
    "DALL-E look",
    "Stable Diffusion look",
    "hyperrealistic CGI",
    "anime",
    "sketch",
    "watercolor",
    "low resolution",
    "blurry",
    "oversharpened halos",
    "HDR glow",
    "airbrushed food",
  ],
  lighting: [
    "flat overhead only",
    "harsh flash",
    "neon lighting",
    "cold blue color cast",
    "oversaturated",
    "blown highlights",
    "HDR look",
    "unnatural rim light",
    "studio strobe commercial",
  ],
  composition: [
    "floating ingredients",
    "levitating food",
    "duplicate plates",
    "mirror symmetry errors",
    "perfect bilateral symmetry",
    "extreme fisheye",
    "busy cluttered background",
    "garnish explosion",
    "microgreen avalanche",
    "random herbs scattered everywhere",
    "composite stock photo collage",
  ],
  texture: [
    "plastic-looking cheese",
    "waxy meat",
    "rubbery textures",
    "uncanny smooth surfaces",
    "fake grill marks",
    "melting objects incorrectly",
    "AI gloss on food",
    "synthetic bokeh",
    "porcelain-perfect sauce dots",
    "unnaturally uniform texture",
    "wax fruit sheen",
  ],
  content: [
    "text overlay",
    "watermark",
    "logo",
    "brand packaging",
    "hands in focus",
    "faces in focus",
    "utensils in focus",
    "human fingers",
    "stock photo watermark",
    "fast food chain branding",
    "deformed food",
    "extra limbs on food",
    "wrong dish type",
    "delivery box hero",
    "fire trucks or pumpers",
    "bunker gear or turnout gear",
    "SCBA packs or helmets",
    "firefighter recruitment imagery",
    "department logos or station patches",
    "firefighting equipment as hero props",
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
