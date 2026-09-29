/**
 * Firehall Meals recipe image standard — one cookbook, one art direction.
 *
 * Generation enforces this through master-style.ts, the kitchen photo
 * standard, and the style presets; the offline QA audit
 * (server/imagery/recipe-image-qa.ts) judges every image against the same
 * rules below. Change the standard here and bump the version so cached
 * audit verdicts are re-checked.
 */

export const RECIPE_IMAGE_STANDARD_VERSION = "1.0" as const;

export const RECIPE_IMAGE_STANDARD = {
  camera: {
    default: "45° three-quarter hero angle (30–45° family)",
    overhead: "overhead only for bowls, pizza, sheet pans, boards, and spreads that read better flat",
    lowSide: "low side angle only for stacked sandwiches and burgers so the cut face/fillings show",
    rule: "similar meals share the same angle — no random angles across a category",
  },
  composition: [
    "food is the hero and fills most of the frame",
    "crew-sized tray or single plate matching the recipe's serving style",
    "clean crop with safe margins for 4:5 mobile cards",
    "no people, hands, or faces — including blurred background staff",
    "no text, logos, or watermarks",
    "no props beyond the vessel, a board, or a single utensil",
  ],
  lighting: [
    "natural-looking directional side light",
    "warm-neutral true-to-food colour",
    "one consistent shadow direction with contact shadows",
    "no HDR glow, no neon saturation, no murky under-exposed food",
  ],
  background: [
    "dark brushed stainless or warm worn wood prep surface",
    "empty station kitchen softly out of focus",
    "no white studio seamless, no fine-dining restaurant, no outdoor scenes",
  ],
  plating: [
    "generous and approachable — not Michelin, not cafeteria slop",
    "every major ingredient visually identifiable",
    "only foods from the recipe's ingredients and serving instructions",
  ],
  quality: [
    "crisp food with believable textures",
    "correct geometry — no duplicated or fused ingredients, no impossible utensils",
    "no melted/waxy AI artifacts, no inconsistent shadows, no generated text",
  ],
  technical: {
    heroMinSidePx: 1024,
    variants: ["hero", "hero.webp", "mobile", "thumb", "rail"],
  },
} as const;

/** Flat bullet list for prompts and the vision audit rubric. */
export function recipeImageStandardLines(): string[] {
  const s = RECIPE_IMAGE_STANDARD;
  return [
    `Camera: ${s.camera.default}; ${s.camera.overhead}; ${s.camera.lowSide}; ${s.camera.rule}`,
    `Composition: ${s.composition.join("; ")}`,
    `Lighting: ${s.lighting.join("; ")}`,
    `Background: ${s.background.join("; ")}`,
    `Plating: ${s.plating.join("; ")}`,
    `Quality: ${s.quality.join("; ")}`,
  ];
}
