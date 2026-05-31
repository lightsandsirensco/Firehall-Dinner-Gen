import { ingredientSimilarity, tokenJaccard, levenshteinRatio } from "../curated-recipe/qa-engine/similarity.js";
import { titleKey } from "./load-catalog.js";
import type { CatalogRecipeAuditRecord, DuplicateCategory, RecipePairSimilarity } from "./types.js";

function jaccardSets(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function ingredientOverlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let sum = 0;
  for (const na of a) {
    let best = 0;
    for (const nb of b) {
      best = Math.max(best, ingredientSimilarity(na, nb));
    }
    sum += best;
  }
  return Math.round((sum / Math.max(a.length, b.length)) * 100);
}

function sideDishScore(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  return Math.round(jaccardSets(setA, setB) * 100);
}

function categoricalMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 75;
  return 0;
}

export const NOVELTY_GATE_MINIMUM = 8;

export function scoreMaterialDistinctness(
  a: CatalogRecipeAuditRecord,
  b: CatalogRecipeAuditRecord,
): number {
  const titleScore = Math.round(tokenJaccard(a.title, b.title) * 100);
  const proteinScore = categoricalMatch(a.protein, b.protein);
  const cuisineScore = categoricalMatch(a.cuisine, b.cuisine);
  const cookingMethodScore = categoricalMatch(a.cookingMethod, b.cookingMethod);
  const mealFormatScore = categoricalMatch(a.mealFormat, b.mealFormat);
  const ingredientScore = ingredientOverlapScore(a.ingredientNames, b.ingredientNames);
  const sideDishScoreVal = sideDishScore(a.sideDishes, b.sideDishes);

  return Math.round(
    ingredientScore * 0.4 +
      titleScore * 0.2 +
      cookingMethodScore * 0.15 +
      mealFormatScore * 0.1 +
      sideDishScoreVal * 0.1 +
      proteinScore * 0.025 +
      cuisineScore * 0.025,
  );
}

/** Phase 5 gate — material distinctness vs catalog (ingredient/technique weighted). */
export function materialNoveltyScoreAgainstCatalog(
  candidate: CatalogRecipeAuditRecord,
  catalog: CatalogRecipeAuditRecord[],
  opts: { excludeSlugs?: Set<string> } = {},
): number {
  if (catalog.length === 0) return 10;
  let maxSimilarity = 0;
  for (const existing of catalog) {
    if (existing.slug === candidate.slug) continue;
    if (opts.excludeSlugs?.has(existing.slug)) continue;
    maxSimilarity = Math.max(maxSimilarity, scoreMaterialDistinctness(candidate, existing));
  }
  const score = Math.round((10 - maxSimilarity / 10) * 10) / 10;
  return Math.max(0, Math.min(10, score));
}

export function passesMaterialNoveltyGate(
  candidate: CatalogRecipeAuditRecord,
  catalog: CatalogRecipeAuditRecord[],
  opts: { excludeSlugs?: Set<string> } = {},
): boolean {
  return materialNoveltyScoreAgainstCatalog(candidate, catalog, opts) >= NOVELTY_GATE_MINIMUM;
}

function sharedArchetypes(a: CatalogRecipeAuditRecord, b: CatalogRecipeAuditRecord) {
  return a.archetypes.filter((x) => b.archetypes.includes(x) && x !== "other");
}

export function scoreRecipePair(a: CatalogRecipeAuditRecord, b: CatalogRecipeAuditRecord): RecipePairSimilarity {
  const titleJaccard = Math.round(tokenJaccard(a.title, b.title) * 100);
  const titleLev = Math.round(levenshteinRatio(titleKey(a.title), titleKey(b.title)) * 100);
  const titleScore = Math.max(titleJaccard, titleLev);

  const proteinScore = categoricalMatch(a.protein, b.protein);
  const cuisineScore = categoricalMatch(a.cuisine, b.cuisine);
  const cookingMethodScore = categoricalMatch(a.cookingMethod, b.cookingMethod);
  const mealFormatScore = categoricalMatch(a.mealFormat, b.mealFormat);
  const ingredientScore = ingredientOverlapScore(a.ingredientNames, b.ingredientNames);
  const sideDishScoreVal = sideDishScore(a.sideDishes, b.sideDishes);
  const archetypeOverlap = sharedArchetypes(a, b);

  let overall = Math.round(
    titleScore * 0.2 +
      proteinScore * 0.15 +
      cuisineScore * 0.1 +
      cookingMethodScore * 0.15 +
      mealFormatScore * 0.15 +
      ingredientScore * 0.15 +
      sideDishScoreVal * 0.1,
  );

  if (archetypeOverlap.length > 0 && a.protein === b.protein) {
    overall = Math.min(100, overall + 8 * archetypeOverlap.length);
  }

  const category = classifyPair(a, b, overall, titleScore, archetypeOverlap);

  return {
    slugA: a.slug,
    slugB: b.slug,
    titleA: a.title,
    titleB: b.title,
    overall,
    titleScore,
    proteinScore,
    cuisineScore,
    cookingMethodScore,
    mealFormatScore,
    ingredientScore,
    sideDishScore: sideDishScoreVal,
    sharedArchetypes: archetypeOverlap,
    category,
  };
}

function classifyPair(
  a: CatalogRecipeAuditRecord,
  b: CatalogRecipeAuditRecord,
  overall: number,
  titleScore: number,
  sharedArchetype: ReturnType<typeof sharedArchetypes>,
): DuplicateCategory {
  const sameTitleKey = titleKey(a.title) === titleKey(b.title);
  const sameSlugStem =
    a.slug.replace(/-/g, "") === b.slug.replace(/-/g, "") ||
    a.slug.includes(b.slug) ||
    b.slug.includes(a.slug);

  if (sameTitleKey || sameSlugStem || overall >= 95) {
    return "EXACT_DUPLICATE";
  }
  if (overall >= 82) {
    return "NEAR_DUPLICATE";
  }
  if (
    overall >= 72 ||
    (titleScore >= 55 && a.protein === b.protein && a.mealFormat === b.mealFormat) ||
    (sharedArchetype.length > 0 && overall >= 65 && a.protein === b.protein)
  ) {
    return "SAME_MEAL_DIFFERENT_NAME";
  }
  return "UNIQUE";
}

export function noveltyScoreAgainstCatalog(
  candidate: CatalogRecipeAuditRecord,
  catalog: CatalogRecipeAuditRecord[],
  opts: { excludeSlugs?: Set<string> } = {},
): number {
  if (catalog.length === 0) return 10;
  let maxSimilarity = 0;
  for (const existing of catalog) {
    if (existing.slug === candidate.slug) continue;
    if (opts.excludeSlugs?.has(existing.slug)) continue;
    maxSimilarity = Math.max(maxSimilarity, scoreRecipePair(candidate, existing).overall);
  }
  const score = Math.round((10 - maxSimilarity / 10) * 10) / 10;
  return Math.max(0, Math.min(10, score));
}

export function passesNoveltyGate(
  candidate: CatalogRecipeAuditRecord,
  catalog: CatalogRecipeAuditRecord[],
  opts: { excludeSlugs?: Set<string> } = {},
): boolean {
  return noveltyScoreAgainstCatalog(candidate, catalog, opts) >= NOVELTY_GATE_MINIMUM;
}

export function findAllPairs(recipes: CatalogRecipeAuditRecord[]): RecipePairSimilarity[] {
  const pairs: RecipePairSimilarity[] = [];
  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const pair = scoreRecipePair(recipes[i]!, recipes[j]!);
      if (pair.category !== "UNIQUE") {
        pairs.push(pair);
      }
    }
  }
  return pairs.sort((x, y) => y.overall - x.overall);
}

export function worstCategoryForRecipe(
  slug: string,
  pairs: RecipePairSimilarity[],
): { category: DuplicateCategory; bestPair: RecipePairSimilarity | null } {
  const related = pairs.filter((p) => p.slugA === slug || p.slugB === slug);
  if (related.length === 0) return { category: "UNIQUE", bestPair: null };

  const priority: DuplicateCategory[] = [
    "EXACT_DUPLICATE",
    "NEAR_DUPLICATE",
    "SAME_MEAL_DIFFERENT_NAME",
    "UNIQUE",
  ];
  let worst: DuplicateCategory = "UNIQUE";
  for (const cat of priority) {
    if (related.some((p) => p.category === cat)) {
      worst = cat;
      break;
    }
  }
  const bestPair = related.sort((a, b) => b.overall - a.overall)[0] ?? null;
  return { category: worst, bestPair };
}
