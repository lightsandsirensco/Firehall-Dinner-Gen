/**
 * Build full Golden 100 static recipe pages from manifest + curated + hall packages.
 */

import { getCuratedPackageDef } from "../../shared/curated-hall-packages.js";
import { GOLDEN_100_RECIPES } from "../../shared/golden-100/manifest.js";
import {
  GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  type GoldenRecipePage,
  type GoldenRecipePageIngredient,
  type GoldenRecipePageStep,
} from "../../shared/golden-100/recipe-page-schema.js";
import { goldenPageImageSet } from "../../shared/golden-100/recipe-page-paths.js";
import { pickRelatedSlugs } from "../../shared/golden-100/related-recipes.js";
import type { GoldenRecipeDefinition } from "../../shared/golden-100/types.js";
import type { CuratedRecipe } from "../../shared/curated-recipe/types.js";
import { scoreRecipeTitle } from "../../shared/recipe-title-quality.js";
import {
  buildEquipmentList,
  buildLeftoversStrategy,
  buildProTips,
  buildTonightSpread,
  estimateNutrition,
  estimateTiming,
  inferDifficulty,
} from "./editorial-templates.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";

const CREW_SIZE_DEFAULT = 8;

function ingredientsFromCurated(curated: CuratedRecipe, crewSize: number): GoldenRecipePageIngredient[] {
  const scale = crewSize / Math.max(curated.servingsBase, 4);
  return curated.ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.amount > 0 ? String(Math.round(ing.amount * scale * 10) / 10) : undefined,
    unit: ing.unit || undefined,
    notes: ing.originalText && ing.originalText !== ing.name ? ing.originalText : undefined,
  }));
}

function stepsFromCurated(curated: CuratedRecipe): GoldenRecipePageStep[] {
  return curated.instructions.map((s, i) => ({
    stepNumber: s.stepNumber || i + 1,
    title: s.heading?.trim() || `Step ${i + 1}`,
    instruction: enrichInstruction(s.body),
    minutes: capStepMinutes(inferStepMinutes(s.body)),
    heatLevel: inferHeat(s.body),
  }));
}

function ingredientsFromPackage(
  pkg: ReturnType<typeof getCuratedPackageDef>,
  crewSize: number,
): GoldenRecipePageIngredient[] {
  if (!pkg) return [];
  const scale = crewSize / 6;
  return pkg.ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.qty > 0 ? String(Math.round(ing.qty * scale * 10) / 10) : undefined,
    unit: ing.unit || undefined,
  }));
}

function capStepMinutes(minutes: number | undefined): number | undefined {
  if (minutes == null || minutes <= 0) return undefined;
  return Math.min(180, minutes);
}

function stepsFromPackage(pkg: ReturnType<typeof getCuratedPackageDef>): GoldenRecipePageStep[] {
  if (!pkg) return [];
  return pkg.steps.map((s, i) => ({
    stepNumber: i + 1,
    title: s.title,
    instruction: enrichInstruction(s.instructions),
    minutes: capStepMinutes(s.minutes),
    heatLevel: mapHeatLabel(s.heat),
  }));
}

function mapHeatLabel(heat: string): GoldenRecipePageStep["heatLevel"] {
  const h = heat.toLowerCase();
  if (h.includes("high")) return "high";
  if (h.includes("medium-high")) return "medium-high";
  if (h.includes("medium-low")) return "medium-low";
  if (h.includes("medium")) return "medium";
  if (h.includes("low")) return "low";
  return "";
}

function inferHeat(text: string): GoldenRecipePageStep["heatLevel"] {
  const t = text.toLowerCase();
  if (/\b(high heat|rolling boil|ripping hot)\b/.test(t)) return "high";
  if (/\b(medium-high|medium high)\b/.test(t)) return "medium-high";
  if (/\b(medium-low|medium low|simmer)\b/.test(t)) return "medium-low";
  if (/\b(medium heat|moderate)\b/.test(t)) return "medium";
  if (/\b(low heat|gentle)\b/.test(t)) return "low";
  return "";
}

function inferStepMinutes(text: string): number | undefined {
  const m = text.match(/(\d+)\s*[-–]\s*(\d+)\s*min|(\d+)\s*min/i);
  if (!m) return undefined;
  if (m[1] && m[2]) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
  if (m[3]) return parseInt(m[3], 10);
  return undefined;
}

function enrichInstruction(body: string): string {
  const t = body.trim();
  if (t.length >= 60) return t;
  return `${t} Watch color and texture — if it smells sharp or looks pale, give it another minute before moving on.`;
}

function nutritionFromCurated(curated: CuratedRecipe, def: GoldenRecipeDefinition) {
  const gen = curated.generateResponse;
  if (gen?.macros_per_serving) {
    const m = gen.macros_per_serving;
    return {
      calories: Math.round(m.calories || 0) || estimateNutrition(def).calories,
      protein: Math.round(m.protein_g || 0) || estimateNutrition(def).protein,
      carbs: Math.round(m.carbs_g || 0) || estimateNutrition(def).carbs,
      fats: Math.round(m.fat_g || 0) || estimateNutrition(def).fats,
    };
  }
  const pkg = def.classicSlug ? getCuratedPackageDef(def.classicSlug) : undefined;
  if (pkg?.macros) {
    return {
      calories: pkg.macros.calories,
      protein: pkg.macros.protein_g,
      carbs: pkg.macros.carbs_g,
      fats: pkg.macros.fat_g,
    };
  }
  return estimateNutrition(def);
}

function buildSearchTerms(def: GoldenRecipeDefinition, page: Partial<GoldenRecipePage>): string[] {
  const terms = new Set<string>();
  terms.add(def.title.toLowerCase());
  terms.add(def.slug.replace(/-/g, " "));
  terms.add(def.cuisine);
  terms.add(def.protein);
  terms.add(def.mealFormat.replace(/_/g, " "));
  for (const pool of def.explorePools) terms.add(pool.replace(/_/g, " "));
  if (def.spoonacularSearch) terms.add(def.spoonacularSearch.toLowerCase());
  for (const tag of page.tags || []) {
    if (!tag.includes(":")) terms.add(tag);
  }
  return [...terms].slice(0, 20);
}

function computeScores(def: GoldenRecipeDefinition, page: GoldenRecipePage) {
  const titleCheck = scoreRecipeTitle(page.title, {
    mealFormat: def.mealFormat,
    protein: def.protein,
    cuisine: def.cuisine,
  });
  let realismScore = titleCheck.score;
  realismScore += Math.min(page.steps.length * 5, 25);
  realismScore += Math.min(page.ingredients.length * 2, 20);
  if (page.steps.every((s) => s.instruction.length >= 50)) realismScore += 10;

  let firefighterScore = 50;
  firefighterScore += def.recommendation.feedsHardScore * 4;
  firefighterScore += def.recommendation.rookieFriendly * 2;
  firefighterScore += page.proTips.length * 3;
  firefighterScore += page.tonightSpread.length * 2;
  firefighterScore = Math.min(100, firefighterScore);

  const popularityWeight =
    (def.featured ? 2 : 1) +
    def.recommendation.feedsHardScore / 10 +
    def.recommendation.comfortFoodScore / 10;

  return {
    realismScore: Math.min(100, Math.round(realismScore)),
    firefighterScore: Math.min(100, Math.round(firefighterScore)),
    popularityWeight: Math.round(popularityWeight * 10) / 10,
  };
}

export interface BuildGoldenPageOptions {
  crewSize?: number;
  curated?: CuratedRecipe | null;
  relatedPool?: GoldenRecipeDefinition[];
}

export function buildGoldenRecipePage(
  def: GoldenRecipeDefinition,
  options: BuildGoldenPageOptions = {},
): GoldenRecipePage {
  const crewSize = options.crewSize ?? CREW_SIZE_DEFAULT;
  const curated = options.curated ?? getCuratedRecipeBySlug(def.slug) ?? null;
  const pkg = def.classicSlug ? getCuratedPackageDef(def.classicSlug) : getCuratedPackageDef(def.slug);

  let ingredients: GoldenRecipePageIngredient[] = [];
  let steps: GoldenRecipePageStep[] = [];
  let prepTime: number | undefined;
  let cookTime: number | undefined;
  let totalTime: number | undefined;

  if (curated?.ingredients?.length) {
    ingredients = ingredientsFromCurated(curated, crewSize);
    steps = stepsFromCurated(curated);
    prepTime = curated.prepMinutes;
    cookTime = curated.cookMinutes;
    totalTime = curated.totalMinutes;
  } else if (pkg) {
    ingredients = ingredientsFromPackage(pkg, crewSize);
    steps = stepsFromPackage(pkg);
    prepTime = pkg.prepMin;
    cookTime = pkg.cookMin;
    totalTime = pkg.prepMin + pkg.cookMin;
  }

  const timing = estimateTiming(def);
  if (!ingredients.length) {
    ingredients = synthesizeIngredients(def, crewSize);
  }
  if (!steps.length) {
    steps = synthesizeSteps(def);
  }

  const images = goldenPageImageSet(def.slug);
  const nutrition = curated ? nutritionFromCurated(curated, def) : estimateNutrition(def);
  const proTips = [
    ...(pkg?.proTips ?? []),
    ...buildProTips(def, crewSize),
  ];
  const uniqueProTips = [...new Set(proTips)].slice(0, 8);

  const tags = [
    `protein:${def.protein}`,
    `format:${def.mealFormat}`,
    `category:${def.masterCategoryId}`,
    ...def.explorePools,
    "golden_100",
  ];

  const relatedPool = options.relatedPool ?? GOLDEN_100_RECIPES;
  const relatedSlugs = pickRelatedSlugs(def, relatedPool, 6);

  const page: GoldenRecipePage = {
    slug: def.slug,
    title: def.title,
    subtitle: def.hookLine,
    category: def.masterCategoryId,
    cuisine: def.cuisine,
    description: buildDescription(def, curated, pkg),
    crewSize,
    prepTime: prepTime ?? timing.prep,
    cookTime: cookTime ?? timing.cook,
    difficulty: inferDifficulty(def),
    calories: nutrition.calories,
    protein: nutrition.protein,
    carbs: nutrition.carbs,
    fats: nutrition.fats,
    tags,
    equipment: buildEquipmentList(def),
    ingredients,
    steps,
    proTips: uniqueProTips,
    tonightSpread: buildTonightSpread(def),
    leftovers: buildLeftoversStrategy(def),
    nutrition: {
      ...nutrition,
      label: "per serving (hall portion)",
    },
    ...images,
    realismScore: 0,
    firefighterScore: 0,
    popularityWeight: 0,
    searchTerms: [],
    relatedSlugs,
    sourceName: curated?.source?.name ?? def.sourceInspiration ?? pkg?.spoonacularTitle,
    sourceUrl: curated?.source?.url ?? pkg?.externalUrl,
    classicSlug: def.classicSlug,
    generatedAt: new Date().toISOString(),
    contentVersion: GOLDEN_RECIPE_PAGE_CONTENT_VERSION,
  };

  if (totalTime != null) {
    page.cookTime = totalTime;
  } else if (page.prepTime != null) {
    page.cookTime = page.prepTime + (cookTime ?? timing.cook);
  }
  const scores = computeScores(def, page);
  page.realismScore = scores.realismScore;
  page.firefighterScore = scores.firefighterScore;
  page.popularityWeight = scores.popularityWeight;
  page.searchTerms = buildSearchTerms(def, page);

  return page;
}

function buildDescription(
  def: GoldenRecipeDefinition,
  curated: CuratedRecipe | null,
  pkg: ReturnType<typeof getCuratedPackageDef>,
): string {
  if (curated?.summary?.trim()) return curated.summary.trim();
  if (pkg?.tagline?.trim()) return pkg.tagline.trim();
  return `${def.title} is a ${def.cuisine.replace(/_/g, " ")} ${def.mealFormat.replace(/_/g, " ")} built for a hungry firehall crew — ${def.hookLine}. Hearty portions, station-kitchen timing, and flavors everyone recognizes after a long shift.`;
}

/** Fallback ingredients when DB/package not seeded — recognizable meal skeleton. */
function synthesizeIngredients(def: GoldenRecipeDefinition, crewSize: number): GoldenRecipePageIngredient[] {
  const scale = crewSize / 8;
  const mult = (n: number) => String(Math.round(n * scale * 10) / 10);
  const p = def.protein;
  const base: GoldenRecipePageIngredient[] = [
    { name: "Kosher salt", quantity: mult(2), unit: "tbsp" },
    { name: "Black pepper", quantity: mult(1), unit: "tbsp" },
    { name: "Cooking oil", quantity: mult(0.25), unit: "cup" },
  ];

  if (p === "beef") {
    base.unshift({ name: "Beef (main cut for recipe)", quantity: mult(3), unit: "lb" });
  } else if (p === "chicken") {
    base.unshift({ name: "Chicken (boneless thighs or breasts)", quantity: mult(3), unit: "lb" });
  } else if (p === "pork") {
    base.unshift({ name: "Pork (shoulder or chops)", quantity: mult(3), unit: "lb" });
  } else if (p === "seafood") {
    base.unshift({ name: "Seafood (salmon or white fish fillets)", quantity: mult(2.5), unit: "lb" });
  } else if (p === "turkey") {
    base.unshift({ name: "Ground turkey", quantity: mult(2.5), unit: "lb" });
  } else {
    base.unshift({ name: "Primary protein or hearty veg base", quantity: mult(2), unit: "lb" });
  }

  if (def.mealFormat === "pasta") {
    base.push({ name: "Dried pasta", quantity: mult(2), unit: "lb" });
    base.push({ name: "Garlic", quantity: mult(8), unit: "cloves" });
    base.push({ name: "Crushed tomatoes", quantity: mult(2), unit: "cans" });
  } else if (def.mealFormat === "tacos") {
    base.push({ name: "Flour or corn tortillas", quantity: mult(24), unit: "count" });
    base.push({ name: "Onion", quantity: mult(3), unit: "large" });
    base.push({ name: "Fresh lime", quantity: mult(6), unit: "count" });
  } else if (def.mealFormat === "burger") {
    base.push({ name: "Burger buns", quantity: mult(8), unit: "count" });
    base.push({ name: "American cheese slices", quantity: mult(16), unit: "count" });
  } else if (def.mealFormat === "bowl") {
    base.push({ name: "Cooked rice or grains", quantity: mult(4), unit: "cups" });
    base.push({ name: "Mixed vegetables", quantity: mult(4), unit: "cups" });
  } else {
    base.push({ name: "Yellow onion", quantity: mult(2), unit: "large" });
    base.push({ name: "Garlic", quantity: mult(6), unit: "cloves" });
  }

  return base;
}

function synthesizeSteps(def: GoldenRecipeDefinition): GoldenRecipePageStep[] {
  const title = def.title;
  return [
    {
      stepNumber: 1,
      title: "Prep the line",
      instruction: `Set out all ingredients for ${title} before you turn on heat — firefighters eat on a schedule. Pat proteins dry and season aggressively with salt and pepper; dry surfaces brown instead of steam.`,
      minutes: 15,
      heatLevel: "",
    },
    {
      stepNumber: 2,
      title: "Build the base",
      instruction:
        "Heat oil in your largest skillet, Dutch oven, or on the flat-top over medium-high until it shimmers. Add aromatics (onion first) and cook until the edges turn golden and the smell sweetens — usually 4–6 minutes. If garlic is in the recipe, add it after the onion softens so it doesn't burn.",
      minutes: 8,
      heatLevel: "medium-high",
    },
    {
      stepNumber: 3,
      title: "Cook the main",
      instruction: `Cook the primary protein or base for ${title} until it hits proper color and safe internal temperature. Don't crowd the pan — work in batches if needed so you get browning, not gray stew. Listen for a steady sizzle; if it's silent, the heat is too low.`,
      minutes: 20,
      heatLevel: "medium-high",
    },
    {
      stepNumber: 4,
      title: "Finish and season",
      instruction:
        "Bring components together, taste, and adjust salt. Sauce should coat, not pool. If cheese is involved, melt it just until glossy — another 1–2 minutes under a lid or broiler. Let heavy proteins rest 5 minutes before slicing.",
      minutes: 10,
      heatLevel: "medium",
    },
    {
      stepNumber: 5,
      title: "Serve the hall",
      instruction:
        "Transfer to sheet trays or a serving line immediately. Keep backup warm at 200°F. Call the crew while it's hot — this meal is built for a hungry hall, not a photo shoot.",
      minutes: 5,
      heatLevel: "low",
    },
  ];
}

export function buildAllGoldenRecipePages(): GoldenRecipePage[] {
  return GOLDEN_100_RECIPES.map((def) => buildGoldenRecipePage(def));
}
