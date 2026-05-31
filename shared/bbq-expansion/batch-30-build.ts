/**
 * Compact builder for Phase 6 BBQ & grill recipes.
 */
import { bbqRecipe, manifestEntry, type IngLine, type StepLine } from "../bbq-30/recipe-build.js";
import type { BbqRecipe } from "../bbq-30/types.js";

export type GrillRecipeSpec = {
  slug: string;
  title: string;
  subtitle: string;
  protein: string;
  cuisine: string;
  format: string;
  pools?: string[];
  hook: string;
  prep: number;
  cook: number;
  diff?: "easy" | "medium" | "hard";
  desc: string;
  why: string;
  timing: string;
  allergy?: string;
  equipment: string[];
  ingredients: IngLine[];
  steps: StepLine[];
  tips: string[];
  spread: string[];
  leftovers: string[];
  related?: string[];
  searchTerms?: string[];
};

export function grillRecipe(s: GrillRecipeSpec): BbqRecipe {
  return bbqRecipe({
    manifest: manifestEntry({
      slug: s.slug,
      title: s.title,
      subtitle: s.subtitle,
      protein: s.protein,
      cuisine: s.cuisine,
      mealFormat: s.format,
      pools: s.pools ?? ["bbq", "grill", "firehall_bbq_30"],
      hook: s.hook,
      prep: s.prep,
      cook: s.cook,
      difficulty: s.diff ?? "medium",
    }),
    description: s.desc,
    whyCrewsLikeIt: s.why,
    stationTimingNotes: s.timing,
    allergyNotes: s.allergy ?? "Check labels for gluten, dairy, and shellfish allergens.",
    equipment: s.equipment,
    ingredients: s.ingredients,
    stepLines: s.steps,
    proTips: s.tips,
    tonightSpread: s.spread,
    leftovers: s.leftovers,
    relatedSlugs: s.related,
    searchTerms: s.searchTerms,
    cleanupDifficulty: s.format.includes("side") ? "easy" : "medium",
  });
}
