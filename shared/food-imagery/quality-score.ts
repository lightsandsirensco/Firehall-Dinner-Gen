import type { FoodImageryQualityScores } from "./types.js";
import { FIREHALL_MASTER_EDITORIAL_STYLE } from "./master-style.js";

/** Minimum scores for generated image acceptance (vision QA). */
export const FOOD_IMAGERY_QUALITY_THRESHOLDS = {
  realismMin: 8,
  brandConsistencyMin: 7,
  titleMatchRequired: true,
} as const;

export const VISION_QA_RUBRIC = `Score this image against Firehall Meals GLOBAL FIREHALL KITCHEN PHOTO STANDARD:
- Must look like a REAL photograph (DSLR/documentary food photography), NOT generative AI, NOT CGI, NOT illustration
- Active Canadian firehall kitchen environment — commercial stainless, prep tables, steam tables, sheet pans, industrial lighting
- NOT firefighter marketing — no fire trucks, bunker gear, helmets, recruitment imagery, or posed firefighter portraits
- Food is primary subject — crew-sized family-style portions on serving trays, hotel pans, or prep surfaces
- Shallow natural depth of field, center-weighted hero dish, warm directional light (not flat, not neon, not cold blue)
- Photorealistic textures (no plastic cheese, no waxy meat, no AI gloss, no airbrushed smoothness)
- Documentary realism — served to a hungry fire crew, NOT restaurant fine dining or magazine cover staging
- No floating ingredients, no garnish explosion, no text/logos; blurred background kitchen staff optional
- Reject if: obvious AI artifacts, hyper-saturated HDR, synthetic bokeh, stock photo sterility, wrong dish, duplicate/generic feel
Return JSON only:
{
  "pass": boolean,
  "matchesTitle": boolean,
  "realismScore": 1-10,
  "brandConsistencyScore": 1-10,
  "issues": string[]
}`;

export function evaluateVisionQaResult(parsed: {
  pass?: boolean;
  matchesTitle?: boolean;
  realismScore?: number;
  brandConsistencyScore?: number;
  realism?: number;
  issues?: string[];
}): FoodImageryQualityScores {
  const realism = Number(parsed.realismScore ?? parsed.realism ?? 0);
  const brandConsistency = Number(parsed.brandConsistencyScore ?? parsed.realism ?? 0);
  const titleMatch = parsed.matchesTitle !== false;
  const issues = Array.isArray(parsed.issues) ? parsed.issues.map(String) : [];

  const pass =
    parsed.pass !== false &&
    realism >= FOOD_IMAGERY_QUALITY_THRESHOLDS.realismMin &&
    brandConsistency >= FOOD_IMAGERY_QUALITY_THRESHOLDS.brandConsistencyMin &&
    (!FOOD_IMAGERY_QUALITY_THRESHOLDS.titleMatchRequired || titleMatch);

  return {
    realism,
    brandConsistency,
    titleMatch,
    issues,
    pass,
  };
}

export function formatQualityNotes(scores: FoodImageryQualityScores): string {
  return [
    `realism=${scores.realism}`,
    `brand=${scores.brandConsistency}`,
    `title=${scores.titleMatch ? "ok" : "miss"}`,
    scores.issues.length ? scores.issues.join("; ").slice(0, 120) : "ok",
    `rubric=${FIREHALL_MASTER_EDITORIAL_STYLE.brand}`,
  ].join(" | ");
}
