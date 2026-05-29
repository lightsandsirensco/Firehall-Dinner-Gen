import type { FoodImageryQualityScores } from "./types.js";
import { FIREHALL_MASTER_EDITORIAL_STYLE } from "./master-style.js";

/** Minimum scores for generated image acceptance (vision QA). */
export const FOOD_IMAGERY_QUALITY_THRESHOLDS = {
  realismMin: 8,
  brandConsistencyMin: 7,
  titleMatchRequired: true,
} as const;

export const VISION_QA_RUBRIC = `Score this image against Firehall Meals brand standards:
- Must look like a REAL photograph (DSLR/menu editorial), NOT generative AI, NOT CGI, NOT illustration
- Dark firehall kitchen styling with warm directional light (not flat, not neon, not cold blue)
- Shallow natural depth of field, center-weighted hero dish
- Photorealistic textures (no plastic cheese, no waxy meat, no AI gloss, no airbrushed smoothness)
- Premium comfort food mood (not fast-food commercial, not fantasy food art)
- No floating ingredients, no garnish explosion, no text/logos/hands
- Reject if: obvious AI artifacts, hyper-saturated HDR, synthetic bokeh, uncanny symmetry
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
