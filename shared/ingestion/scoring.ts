import type { IngestRecipeDraft } from "./recipe-ingest-schema.js";
import { scoreRecipeQuality, qualityInputFromIngestDraft } from "../recipe-quality-score.js";

export function scoreTrendSignal(signal: { trendScore?: number; source?: string }): number {
  let score = signal.trendScore ?? 50;
  if (signal.source === "pinterest") score += 5;
  if (signal.source === "hall_classic") score += 15;
  return Math.min(100, Math.max(0, score));
}

export function scoreFirehallSuitability(draft: Pick<IngestRecipeDraft, "title" | "totalMinutes" | "mealFormat" | "servingsBase" | "steps">): number {
  let score = 60;
  if ((draft.servingsBase || 0) >= 6) score += 10;
  if (draft.totalMinutes > 0 && draft.totalMinutes <= 45) score += 10;
  if (draft.totalMinutes > 75) score -= 12;
  const text = `${draft.title} ${draft.mealFormat}`.toLowerCase();
  if (/one[- ]?pot|sheet pan|casserole|slow|chili|stew|pasta|taco|burger/.test(text)) score += 8;
  if (/molecular|sous vide|truffle foam/i.test(text)) score -= 25;
  if ((draft.steps?.length || 0) > 14) score -= 8;
  return Math.min(100, Math.max(0, score));
}

export function scoreComfort(title: string, mealArchetype: string): number {
  const t = title.toLowerCase();
  if (mealArchetype === "comfort_night" || /mac and cheese|chili|meatloaf|pot pie/.test(t)) return 88;
  if (mealArchetype === "healthy_bowl") return 35;
  return 55;
}

export function scoreHealthy(title: string, tags: string[]): number {
  const blob = `${title} ${tags.join(" ")}`.toLowerCase();
  if (/keto|low carb|detox|skinny/.test(blob)) return 80;
  if (/salad|grilled|lean|vegetable/.test(blob)) return 70;
  if (/cheesy|fried|bacon|loaded/.test(blob)) return 25;
  return 50;
}

export function computeIngestQualityScores(
  draft: Pick<
    IngestRecipeDraft,
    | "title"
    | "heroImage"
    | "totalMinutes"
    | "mealFormat"
    | "mealArchetype"
    | "servingsBase"
    | "steps"
    | "tags"
    | "spoonacularId"
    | "source"
    | "sourceUrl"
    | "ingredients"
  > & { summary?: string },
  trendScore: number,
): Pick<IngestRecipeDraft, "appetiteScore" | "comfortScore" | "healthyScore" | "firehallSuitabilityScore" | "qualityScore"> {
  const q = scoreRecipeQuality({
    ...qualityInputFromIngestDraft(draft as IngestRecipeDraft),
    trendScore,
  });
  const healthyScore = scoreHealthy(draft.title, draft.tags || []);

  return {
    appetiteScore: q.appetite,
    comfortScore: q.comfort,
    healthyScore,
    firehallSuitabilityScore: q.hallSuitability,
    qualityScore: q.composite,
  };
}
