import type { ExploreRecipeCard } from "../../../shared/explore-recipe.js";
import { inferVisualSignalsFromTitle, type MealVisualSignal } from "../../../shared/meal-image-title-match.js";

function dominantSignal(card: ExploreRecipeCard): MealVisualSignal {
  const sigs = inferVisualSignalsFromTitle(card.title, undefined);
  return [...sigs].find((s) => s !== "generic") || "generic";
}

function normalizeProtein(p?: string): string {
  const t = (p || "").toLowerCase().trim();
  if (!t) return "unknown";
  if (t === "fish") return "fish";
  if (t === "seafood") return "seafood";
  return t;
}

function cuisineKey(card: ExploreRecipeCard): string {
  // Prefer explicit cuisines array, else fall back to summary fragments.
  const c = (card.cuisines?.[0] || "").toLowerCase().trim();
  if (c) return c;
  const s = (card.summary || "").toLowerCase();
  if (s.includes("mexican")) return "mexican";
  if (s.includes("italian")) return "italian";
  if (s.includes("korean")) return "korean";
  if (s.includes("thai")) return "thai";
  if (s.includes("indian")) return "indian";
  if (s.includes("bbq") || s.includes("barbecue")) return "bbq";
  return "";
}

function penalty(candidate: ExploreRecipeCard, recent: ExploreRecipeCard[]): number {
  if (recent.length === 0) return 0;
  let score = 0;

  const candProtein = normalizeProtein(candidate.primaryProtein);
  const candSignal = dominantSignal(candidate);
  const candCuisine = cuisineKey(candidate);

  for (let i = 0; i < recent.length; i++) {
    const prev = recent[recent.length - 1 - i]!;
    const weight = i === 0 ? 1.0 : 0.6; // immediate neighbor matters more

    if (normalizeProtein(prev.primaryProtein) === candProtein && candProtein !== "unknown") {
      score += 22 * weight;
    }
    if (dominantSignal(prev) === candSignal && candSignal !== "generic") {
      score += 16 * weight;
    }
    if (candCuisine && cuisineKey(prev) === candCuisine) {
      score += 10 * weight;
    }
    if (prev.image && candidate.image && prev.image === candidate.image) {
      score += 60 * weight;
    }
    // Avoid “bowl block” runs.
    if (candSignal === "bowl" && dominantSignal(prev) === "bowl") {
      score += 18 * weight;
    }
  }

  return score;
}

/**
 * Greedy diversity re-ranker for a single rail.
 * Keeps strong cards near the top but avoids repetitive runs (protein/bowl/cuisine/image).
 */
export function diversifyExploreRail(cards: ExploreRecipeCard[], opts?: { window?: number }): ExploreRecipeCard[] {
  const window = Math.max(1, Math.min(4, opts?.window ?? 2));
  const remaining = [...cards];
  const out: ExploreRecipeCard[] = [];

  while (remaining.length) {
    const recent = out.slice(-window);
    let bestIdx = 0;
    let bestScore = Number.POSITIVE_INFINITY;
    // Only look at a small top band so we don’t destroy overall relevance.
    const band = Math.min(10, remaining.length);
    for (let i = 0; i < band; i++) {
      const c = remaining[i]!;
      const p = penalty(c, recent);
      if (p < bestScore) {
        bestScore = p;
        bestIdx = i;
        if (p === 0) break;
      }
    }
    out.push(remaining.splice(bestIdx, 1)[0]!);
  }

  return out;
}

