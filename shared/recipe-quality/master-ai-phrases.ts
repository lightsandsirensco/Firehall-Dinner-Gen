/**
 * AI / marketing fluff phrases — fail Phase 1 master audit.
 * Replace with plain firefighter kitchen language during copy fixes.
 */

export const MASTER_AI_PHRASE_PATTERNS: Array<{ id: string; pattern: RegExp; message: string }> = [
  { id: "flavor_explosion", pattern: /\bflavor explosion\b/i, message: "AI phrase: flavor explosion" },
  { id: "post_shift_hug", pattern: /\bpost-?shift hug\b/i, message: "AI phrase: post-shift hug" },
  { id: "culinary_masterpiece", pattern: /\bculinary masterpiece\b/i, message: "AI phrase: culinary masterpiece" },
  { id: "weeknight_wonder", pattern: /\bweeknight wonder\b/i, message: "AI phrase: weeknight wonder" },
  { id: "protein_powerhouse", pattern: /\bprotein-?packed powerhouse\b/i, message: "AI phrase: protein-packed powerhouse" },
  { id: "crowd_sensation", pattern: /\bcrowd-?pleasing sensation\b/i, message: "AI phrase: crowd-pleasing sensation" },
  { id: "game_changer", pattern: /\bgame-?changer\b/i, message: "AI phrase: game-changer" },
  { id: "elevated", pattern: /\belevated?\b/i, message: "AI phrase: elevated" },
  { id: "restaurant_quality", pattern: /\brestaurant-?quality\b/i, message: "AI phrase: restaurant-quality" },
  { id: "mouth_watering", pattern: /\bmouth-?watering\b/i, message: "AI phrase: mouth-watering" },
  { id: "to_perfection", pattern: /\bto perfection\b/i, message: "AI phrase: to perfection" },
  { id: "serve_and_enjoy", pattern: /\bserve and enjoy\b/i, message: "AI phrase: serve and enjoy" },
];

export function findMasterAiPhrases(text: string): string[] {
  const hits: string[] = [];
  for (const { id, pattern, message } of MASTER_AI_PHRASE_PATTERNS) {
    if (pattern.test(text)) hits.push(`${id}: ${message}`);
  }
  return hits;
}
