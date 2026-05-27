/**
 * Editorial image quality scoring — regeneration flags.
 */

export const EDITORIAL_QUALITY_VERSION = "1.0" as const;

export interface EditorialImageQualityScore {
  version: typeof EDITORIAL_QUALITY_VERSION;
  realism: number;
  lightingQuality: number;
  foodClarity: number;
  appetiteAppeal: number;
  framingConsistency: number;
  textureRealism: number;
  visualCleanliness: number;
  mobileReadability: number;
  /** Weighted composite 0–10 */
  composite: number;
  pass: boolean;
  needsRegeneration: boolean;
  flags: string[];
  scoredAt: string;
  method: "heuristic" | "vision" | "combined";
}

export const EDITORIAL_QUALITY_THRESHOLDS = {
  compositeMin: 7.0,
  dimensionMin: 6.0,
  regenerationBelow: 6.5,
} as const;

const DIMENSION_WEIGHTS = {
  realism: 0.18,
  lightingQuality: 0.12,
  foodClarity: 0.14,
  appetiteAppeal: 0.16,
  framingConsistency: 0.12,
  textureRealism: 0.12,
  visualCleanliness: 0.08,
  mobileReadability: 0.08,
} as const;

export function computeEditorialComposite(
  scores: Omit<EditorialImageQualityScore, "composite" | "pass" | "needsRegeneration" | "version" | "scoredAt" | "method" | "flags">,
): number {
  let sum = 0;
  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS)) {
    sum += (scores[key as keyof typeof DIMENSION_WEIGHTS] as number) * weight;
  }
  return Math.round(sum * 10) / 10;
}

export type EditorialQualityInput = Omit<
  EditorialImageQualityScore,
  "composite" | "pass" | "needsRegeneration" | "version"
> & { composite?: number };

export function evaluateEditorialQualityScore(
  partial: EditorialQualityInput,
): EditorialImageQualityScore {
  const composite =
    partial.composite ??
    computeEditorialComposite(partial);

  const flags = [...(partial.flags || [])];
  const dims: (keyof typeof DIMENSION_WEIGHTS)[] = [
    "realism",
    "lightingQuality",
    "foodClarity",
    "appetiteAppeal",
    "framingConsistency",
    "textureRealism",
    "visualCleanliness",
    "mobileReadability",
  ];

  for (const d of dims) {
    if (partial[d] < EDITORIAL_QUALITY_THRESHOLDS.dimensionMin) {
      flags.push(`low_${d}`);
    }
  }

  const pass = composite >= EDITORIAL_QUALITY_THRESHOLDS.compositeMin && flags.length === 0;
  const needsRegeneration =
    !pass || composite < EDITORIAL_QUALITY_THRESHOLDS.regenerationBelow;

  return {
    ...partial,
    version: EDITORIAL_QUALITY_VERSION,
    composite,
    pass,
    needsRegeneration,
    flags,
  };
}

export const EDITORIAL_VISION_QA_RUBRIC = `Score this Firehall Meals editorial food photograph.
Return JSON only:
{
  "realism": 1-10,
  "lightingQuality": 1-10,
  "foodClarity": 1-10,
  "appetiteAppeal": 1-10,
  "framingConsistency": 1-10,
  "textureRealism": 1-10,
  "visualCleanliness": 1-10,
  "mobileReadability": 1-10,
  "issues": string[]
}
Criteria: cinematic warm food photography, realistic textures, center-weighted hero, no text/logos/hands, mobile-safe framing, premium editorial not AI slop.`;
