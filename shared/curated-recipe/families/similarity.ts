import { ingredientSimilarity, tokenJaccard } from "../qa-engine/similarity.js";
import { structureKey } from "../qa-engine/similarity.js";
import type { VariantSimilarityResult } from "./types.js";

export const VARIANT_NEAR_DUPLICATE_THRESHOLD = 82;
export const VARIANT_CLUSTER_THRESHOLD = 72;

export interface RecipeSimilarityInput {
  recipeId: string;
  slug: string;
  title: string;
  mealFormat?: string;
  equipment?: string[];
  ingredients: Array<{ name: string }>;
  steps: Array<{ heading?: string; body: string }>;
}

function jaccardSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function ingredientSet(names: string[]): Set<string> {
  return new Set(
    names
      .map((n) => n.toLowerCase().trim())
      .filter((n) => n.length > 2),
  );
}

function stepTokenSet(steps: RecipeSimilarityInput["steps"]): Set<string> {
  const tokens = new Set<string>();
  for (const s of steps) {
    const text = `${s.heading || ""} ${s.body}`.toLowerCase();
    for (const w of text.split(/\s+/)) {
      if (w.length > 4) tokens.add(w);
    }
  }
  return tokens;
}

export function scoreVariantSimilarity(
  a: RecipeSimilarityInput,
  b: RecipeSimilarityInput,
): VariantSimilarityResult {
  const namesA = a.ingredients.map((i) => i.name);
  const namesB = b.ingredients.map((i) => i.name);
  let ingPairs = 0;
  let ingSum = 0;
  for (const na of namesA) {
    let best = 0;
    for (const nb of namesB) {
      best = Math.max(best, ingredientSimilarity(na, nb));
    }
    if (best > 0) {
      ingSum += best;
      ingPairs++;
    }
  }
  const ingredients =
    namesA.length === 0 || namesB.length === 0
      ? 0
      : Math.round((ingSum / Math.max(namesA.length, namesB.length)) * 100);

  const steps = Math.round(jaccardSets(stepTokenSet(a.steps), stepTokenSet(b.steps)) * 100);
  const title = Math.round(tokenJaccard(a.title, b.title) * 100);

  const structA = structureKey({
    stepCount: a.steps.length,
    ingredientCount: a.ingredients.length,
    headings: a.steps.map((s) => s.heading || ""),
    mealFormat: a.mealFormat,
  });
  const structB = structureKey({
    stepCount: b.steps.length,
    ingredientCount: b.ingredients.length,
    headings: b.steps.map((s) => s.heading || ""),
    mealFormat: b.mealFormat,
  });
  const structureBonus = structA === structB ? 12 : 0;

  const eqA = new Set((a.equipment || []).map((e) => e.toLowerCase()));
  const eqB = new Set((b.equipment || []).map((e) => e.toLowerCase()));
  const equipment = Math.round(jaccardSets(eqA, eqB) * 100);

  const overall = Math.min(
    100,
    Math.round(ingredients * 0.35 + steps * 0.3 + title * 0.2 + equipment * 0.1 + structureBonus),
  );

  return {
    recipeIdA: a.recipeId,
    recipeIdB: b.recipeId,
    slugA: a.slug,
    slugB: b.slug,
    overall,
    ingredients,
    steps,
    title,
    equipment,
    isNearDuplicate: overall >= VARIANT_NEAR_DUPLICATE_THRESHOLD,
  };
}

export function findNearDuplicatePairs(
  recipes: RecipeSimilarityInput[],
  opts: { sameArchetypeOnly?: boolean; archetypeById?: Map<string, string> } = {},
): VariantSimilarityResult[] {
  const pairs: VariantSimilarityResult[] = [];
  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const a = recipes[i]!;
      const b = recipes[j]!;
      if (opts.sameArchetypeOnly && opts.archetypeById) {
        const archA = opts.archetypeById.get(a.recipeId);
        const archB = opts.archetypeById.get(b.recipeId);
        if (!archA || archA !== archB) continue;
      }
      const sim = scoreVariantSimilarity(a, b);
      if (sim.isNearDuplicate) pairs.push(sim);
    }
  }
  return pairs.sort((x, y) => y.overall - x.overall);
}
