/**
 * Editorial quality signals for curated Explore — down-rank generic / weak content.
 */

import { getTrustedPublisher, publisherQualityBonus } from "./ingestion/trusted-publishers.js";

const GENERIC_TITLE_PATTERNS: RegExp[] = [
  /^easy\s+/i,
  /^simple\s+/i,
  /^quick\s+chicken\s+and\s+rice/i,
  /^chicken\s+and\s+rice$/i,
  /^baked\s+chicken\s+breast$/i,
  /^ground\s+beef\s+and\s+/i,
];

const WEAK_IMAGE_HINTS: RegExp[] = [
  /placeholder|default-recipe|no-image|1x1/i,
  /emoji|icon\.png/i,
];

const LOW_QUALITY_HOST_FRAGMENTS = [
  "foodista.com",
  "blogspot.com",
  "wordpress.com",
  "wixsite.com",
  "recipegirl.com",
];

export interface EditorialQualityInput {
  title: string;
  summary?: string;
  heroImage?: string;
  sourceUrl?: string;
  sourceKind?: string;
  protein?: string;
  qualityScore?: number;
  appetiteScore?: number;
}

export function isLowQualityRecipeHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return LOW_QUALITY_HOST_FRAGMENTS.some((f) => host.includes(f));
  } catch {
    return true;
  }
}

export function isPublisherHeroImage(url: string): boolean {
  if (!url?.trim()) return false;
  return !url.includes("spoonacular.com");
}

export function scoreEditorialQuality(input: EditorialQualityInput): number {
  let score = input.qualityScore ?? 50;
  const text = `${input.title} ${input.summary || ""}`.toLowerCase();

  if (input.sourceKind === "publisher" || input.sourceKind === "partner") score += 18;
  if (isPublisherHeroImage(input.heroImage || "")) score += 14;
  if (input.sourceUrl) {
    score += publisherQualityBonus(input.sourceUrl);
    if (isLowQualityRecipeHost(input.sourceUrl)) score -= 25;
  }

  for (const re of GENERIC_TITLE_PATTERNS) {
    if (re.test(input.title)) {
      score -= 12;
      break;
    }
  }

  if (/crispy|smoked|charred|glazed|slow cooker|braised|loaded|cheesy/i.test(text)) score += 6;
  if (/comfort|hearty|crowd|batch|feeds a crowd/i.test(text)) score += 5;

  const img = input.heroImage || "";
  if (!img.trim()) score -= 35;
  else if (WEAK_IMAGE_HINTS.some((re) => re.test(img))) score -= 20;

  if (getTrustedPublisher(input.sourceUrl || "")) score += 4;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function buildPublisherAttribution(
  publisherName: string,
  sourceKind?: string,
): string {
  const name = publisherName?.trim();
  if (!name) return "Curated for the hall";
  if (sourceKind === "publisher" || sourceKind === "partner") {
    return `Curated from ${name}`;
  }
  return `Via ${name}`;
}
