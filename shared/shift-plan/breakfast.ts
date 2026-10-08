/**
 * Breakfast slot selection.
 *
 * The generator pool deliberately excludes breakfast dishes and the
 * breakfast catalog can't be hydrated into a generator response, so
 * breakfast slots pick from the approved catalog's breakfast entries with the
 * same hard rules Explore uses (high-confidence dietary flags incl. allergens,
 * Foods to Avoid tags), the slot's time budget, and the same recency penalty
 * and seeded weighted draw as the generator. Deterministic; no AI.
 */
import type { GenerateRequest } from "../schema.js";
import type { DietaryFilterKey, DietarySummary } from "../dietary/schema.js";
import { ALLERGEN_TO_DIETARY_FLAG, type SimplifiedAllergen } from "../generator-simplified.js";
import { recipeHasAnyAvoidedTag } from "../ingredient-preferences/match.js";
import { recipeFitsTimeBucket } from "../generation/time-buckets.js";
import { recentSlugPenalty, weightedPickIndex } from "../meal-rotation/weighted-pick.js";

export interface BreakfastCandidate {
  slug: string;
  totalMinutes: number;
  dietarySummary?: DietarySummary;
  avoidTags: string[];
  /** Curated quality score when known. */
  quality?: number;
}

const DEFAULT_QUALITY = 80;
/** Same spread the generator uses: the best match is ~WEIGHT_SPREAD× likelier than one this many points lower. */
const WEIGHT_SPREAD = 80;

function requiredDietaryFlags(request: GenerateRequest): DietaryFilterKey[] {
  const flags = new Set<DietaryFilterKey>(request.dietary_restrictions ?? []);
  for (const allergen of request.allergens_to_avoid ?? []) {
    const flag = ALLERGEN_TO_DIETARY_FLAG[allergen as SimplifiedAllergen];
    if (flag) flags.add(flag);
  }
  if (request.protein === "vegetarian") flags.add("vegetarian");
  return [...flags];
}

export function breakfastPassesHardFilters(c: BreakfastCandidate, request: GenerateRequest): boolean {
  const flags = requiredDietaryFlags(request);
  if (flags.length > 0) {
    if (!c.dietarySummary || c.dietarySummary.confidence !== "high") return false;
    if (flags.some((f) => !c.dietarySummary!.flags[f])) return false;
  }
  return !recipeHasAnyAvoidedTag(c.avoidTags, request.foods_to_avoid ?? []);
}

export function pickBreakfast(
  candidates: readonly BreakfastCandidate[],
  request: GenerateRequest,
  options: { avoid: { hard: readonly string[]; soft: readonly string[] }; recentSlugs?: string[]; seed: string },
): string | null {
  const hard = new Set(options.avoid.hard);
  const soft = new Set(options.avoid.soft);
  const eligible = candidates.filter((c) => !hard.has(c.slug) && breakfastPassesHardFilters(c, request));
  if (eligible.length === 0) return null;

  // Relax in the generator's order: shift duplicates first, then the time budget.
  const inTime = (c: BreakfastCandidate) => recipeFitsTimeBucket(c.totalMinutes, request.time_available);
  const tiers = [
    eligible.filter((c) => !soft.has(c.slug) && inTime(c)),
    eligible.filter((c) => inTime(c)),
    eligible.filter((c) => !soft.has(c.slug)),
    eligible,
  ];
  const pool = tiers.find((t) => t.length > 0)!;

  const ranked = pool
    .map((c) => ({ slug: c.slug, score: (c.quality ?? DEFAULT_QUALITY) - recentSlugPenalty(c.slug, options.recentSlugs) }))
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug));
  const floor = ranked[0]!.score - WEIGHT_SPREAD;
  const idx = weightedPickIndex(
    ranked.map((r) => Math.max(1, r.score - floor)),
    options.seed,
  );
  return ranked[idx]!.slug;
}
