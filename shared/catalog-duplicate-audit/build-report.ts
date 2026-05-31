import {
  EXPANSION_OPPORTUNITY_SEEDS,
  REJECTED_EXPANSION_PATTERNS,
  archetypeLabel,
} from "./meal-archetypes.js";
import { loadCatalogRecipes } from "./load-catalog.js";
import { findAllPairs, worstCategoryForRecipe } from "./score-pair.js";
import type { DuplicateCategory, DuplicateReport, DuplicateReportEntry, MealArchetypeId } from "./types.js";

function countByCategory(entries: DuplicateReportEntry[]): Record<DuplicateCategory, number> {
  return {
    EXACT_DUPLICATE: entries.filter((e) => e.category === "EXACT_DUPLICATE").length,
    NEAR_DUPLICATE: entries.filter((e) => e.category === "NEAR_DUPLICATE").length,
    SAME_MEAL_DIFFERENT_NAME: entries.filter((e) => e.category === "SAME_MEAL_DIFFERENT_NAME").length,
    UNIQUE: entries.filter((e) => e.category === "UNIQUE").length,
  };
}

function buildArchetypeCounts(recipes: ReturnType<typeof loadCatalogRecipes>) {
  const counts = new Map<MealArchetypeId, { count: number; examples: string[] }>();
  for (const r of recipes) {
    for (const arch of r.archetypes) {
      const cur = counts.get(arch) ?? { count: 0, examples: [] };
      cur.count++;
      if (cur.examples.length < 5) cur.examples.push(r.title);
      counts.set(arch, cur);
    }
  }
  return [...counts.entries()]
    .filter(([id]) => id !== "other")
    .sort((a, b) => b[1].count - a[1].count)
    .map(([archetype, data]) => ({
      archetype,
      label: archetypeLabel(archetype),
      count: data.count,
      examples: data.examples,
    }));
}

function buildRejectionPatterns(recipes: ReturnType<typeof loadCatalogRecipes>) {
  return REJECTED_EXPANSION_PATTERNS.map((rule) => {
    const matches = recipes.filter((r) => r.archetypes.includes(rule.archetype));
    return {
      pattern: rule.pattern,
      count: matches.length,
      saturated: matches.length >= rule.threshold,
      examples: matches.slice(0, 6).map((r) => r.title),
    };
  });
}

function cuisineCoverage(recipes: ReturnType<typeof loadCatalogRecipes>) {
  const counts = new Map<string, number>();
  for (const r of recipes) {
    counts.set(r.cuisine, (counts.get(r.cuisine) ?? 0) + 1);
  }
  return counts;
}

function formatCoverage(recipes: ReturnType<typeof loadCatalogRecipes>) {
  const counts = new Map<string, number>();
  for (const r of recipes) {
    counts.set(r.mealFormat, (counts.get(r.mealFormat) ?? 0) + 1);
  }
  return counts;
}

function buildExpansionOpportunities(recipes: ReturnType<typeof loadCatalogRecipes>) {
  const cuisines = cuisineCoverage(recipes);
  const formats = formatCoverage(recipes);
  const titleBlob = recipes.map((r) => `${r.title} ${r.slug}`).join(" ").toLowerCase();

  const underrepresentedCuisines = [
    "indian",
    "korean",
    "vietnamese",
    "japanese",
    "hungarian",
    "portuguese",
    "middle_eastern",
    "cajun",
    "spanish",
    "canadian",
  ].filter((c) => (cuisines.get(c) ?? 0) < 3);

  const underrepresentedFormats = ["curry", "skewer", "stew", "pie", "broth", "platter", "braise"].filter(
    (f) => (formats.get(f) ?? 0) < 3,
  );

  const seeds = EXPANSION_OPPORTUNITY_SEEDS.filter((seed) => {
    const needle = seed.name.toLowerCase().split(" ")[0]!;
    return !titleBlob.includes(needle);
  });

  const opportunities = [
    {
      opportunity: "Global one-pot and rice traditions",
      rationale: `${underrepresentedCuisines.length} cuisines have fewer than 3 recipes; jambalaya, paella, and gumbo add distinct techniques.`,
      noveltyExamples: seeds.filter((s) => ["Jambalaya", "Paella", "Gumbo"].includes(s.name)).map((s) => s.name),
      underrepresentedCuisines: ["cajun", "spanish"].filter((c) => (cuisines.get(c) ?? 0) < 3),
      underrepresentedFormats: ["one_pot", "skillet"],
    },
    {
      opportunity: "Curries and braised stews",
      rationale: "Butter chicken, paprikash, and cacciatore introduce simmered sauces unlike existing creamy pasta clusters.",
      noveltyExamples: seeds
        .filter((s) => ["Butter Chicken", "Chicken Paprikash", "Chicken Cacciatore", "Beef Barbacoa"].includes(s.name))
        .map((s) => s.name),
      underrepresentedCuisines: ["indian", "hungarian"],
      underrepresentedFormats: ["curry", "stew", "braise"],
    },
    {
      opportunity: "Broth bowls and noodle service",
      rationale: "Ramen and pho are materially different from existing chicken-rice bowl archetype.",
      noveltyExamples: seeds.filter((s) => ["Ramen", "Pho"].includes(s.name)).map((s) => s.name),
      underrepresentedCuisines: ["japanese", "vietnamese"],
      underrepresentedFormats: ["bowl", "broth"],
    },
    {
      opportunity: "Canadian hall classics",
      rationale: "Tourtière, Montreal smoked meat, and donair platters are absent and culturally distinct for Canadian fire halls.",
      noveltyExamples: seeds
        .filter((s) => ["Tourtière", "Montreal Smoked Meat", "Donair Platters"].includes(s.name))
        .map((s) => s.name),
      underrepresentedCuisines: ["canadian"],
      underrepresentedFormats: ["pie", "sandwich", "platter"],
    },
    {
      opportunity: "Skewer and platter grilling",
      rationale: "Souvlaki, shawarma, and peri peri add grill-forward formats without repeating sheet-pan chicken.",
      noveltyExamples: seeds
        .filter((s) =>
          ["Chicken Souvlaki", "Shawarma Platters", "Peri Peri Chicken", "Greek Chicken Skewers", "Korean Bulgogi"].includes(
            s.name,
          ),
        )
        .map((s) => s.name),
      underrepresentedCuisines: ["greek", "middle_eastern", "korean", "portuguese"],
      underrepresentedFormats: ["skewer", "platter", "grill"],
    },
    {
      opportunity: "British comfort bakes",
      rationale: "Cottage and shepherd's pie introduce mashed-top bakes not represented in the catalog.",
      noveltyExamples: seeds.filter((s) => ["Cottage Pie", "Shepherd's Pie"].includes(s.name)).map((s) => s.name),
      underrepresentedCuisines: ["british"],
      underrepresentedFormats: ["bake", "pie"],
    },
  ];

  return opportunities;
}

export function buildDuplicateReport(): DuplicateReport {
  const recipes = loadCatalogRecipes();
  const pairs = findAllPairs(recipes);

  const byCollection: Record<string, number> = {};
  for (const r of recipes) {
    byCollection[r.collection] = (byCollection[r.collection] ?? 0) + 1;
  }

  const entries: DuplicateReportEntry[] = recipes.map((r) => {
    const { category, bestPair } = worstCategoryForRecipe(r.slug, pairs);
    const relatedPairs = pairs
      .filter((p) => p.slugA === r.slug || p.slugB === r.slug)
      .slice(0, 5);
    return {
      slug: r.slug,
      title: r.title,
      collection: r.collection,
      category,
      primaryMatchSlug: bestPair
        ? bestPair.slugA === r.slug
          ? bestPair.slugB
          : bestPair.slugA
        : null,
      primaryMatchTitle: bestPair
        ? bestPair.slugA === r.slug
          ? bestPair.titleB
          : bestPair.titleA
        : null,
      similarity: bestPair?.overall ?? 0,
      archetypes: r.archetypes,
      pairs: relatedPairs,
    };
  });

  const categoryCounts = countByCategory(entries);
  const rejectionPatterns = buildRejectionPatterns(recipes);

  return {
    generatedAt: new Date().toISOString(),
    catalogSummary: {
      totalRecipes: recipes.length,
      byCollection,
      exactDuplicateRecipes: categoryCounts.EXACT_DUPLICATE,
      nearDuplicateRecipes: categoryCounts.NEAR_DUPLICATE,
      sameMealDifferentNameRecipes: categoryCounts.SAME_MEAL_DIFFERENT_NAME,
      uniqueRecipes: categoryCounts.UNIQUE,
      duplicatePairCount: pairs.length,
    },
    topOverrepresentedMealTypes: buildArchetypeCounts(recipes).slice(0, 12),
    recommendedExpansionOpportunities: buildExpansionOpportunities(recipes),
    rejectionPatterns: rejectionPatterns.map(({ pattern, count, examples }) => ({ pattern, count, examples })),
    noveltyGate: {
      minimumScore: 8,
      description:
        "New recipes must score >= 8/10 novelty vs the full catalog (10 - maxSimilarity/10). Reject burrito bowls, chicken rice bowls, creamy chicken pasta, minor taco/burger/sheet-pan variants.",
    },
    recipes: entries,
    significantPairs: pairs.slice(0, 150),
  };
}
