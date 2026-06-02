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
import { calculateNutritionFromIngredients } from "../../shared/nutrition/calculate.js";
import { getVerifiedPerServingNutrition } from "../../shared/nutrition/verified-per-serving.js";
import { getCuratedRecipeBySlug } from "../curated-recipe-store.js";
import {
  auditGoldenRecipeContent,
  buildEditorialBlueprint,
  buildRecipeTitleFields,
  isPlaceholderCuratedRecipe,
  mainProteinLabel,
  stepsFailQualityBar,
  usesGenericGrillTemplate,
} from "../../shared/golden-100/recipe-quality/index.js";
import { getMealSpecificPack } from "../../shared/golden-100/recipe-quality/meal-specific-packs.js";
import { clampGoldenIngredientsForCrew } from "../../shared/recipe/crew-portion-limits.js";
import { resolveGoldenSlugTiming } from "../../shared/golden-100/recipe-quality/slug-timing-overrides.js";

const CREW_SIZE_DEFAULT = 8;
const BASE_SERVINGS_DEFAULT = 8;

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
  const scaled = pkg.ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.qty > 0 ? String(Math.round(ing.qty * scale * 10) / 10) : undefined,
    unit: ing.unit || undefined,
  }));
  return clampGoldenIngredientsForCrew(scaled, crewSize).ingredients;
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
  const coldOrServe = /\b(no heat|serve|plate|toss slaw|cold|hold on ice|garnish)\b/i.test(t);
  if (coldOrServe) {
    return `${t} Keep cold components on ice until the line opens — warm food waits on the hot side only.`;
  }
  return `${t} Watch color and texture at the pan — if it smells sharp or looks pale, give it another minute before moving on.`;
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

  const curatedUsable =
    curated?.ingredients?.length && !isPlaceholderCuratedRecipe(curated.ingredients);
  const curatedSteps = curatedUsable ? stepsFromCurated(curated!) : [];
  const curatedStepsOk =
    curatedSteps.length >= 4 &&
    !stepsFailQualityBar(curatedSteps) &&
    !usesGenericGrillTemplate(curatedSteps);

  const pkgSteps = pkg ? stepsFromPackage(pkg) : [];
  const pkgStepsOk =
    pkgSteps.length >= 4 &&
    !stepsFailQualityBar(pkgSteps) &&
    !usesGenericGrillTemplate(pkgSteps);

  if (curatedUsable && curatedStepsOk) {
    ingredients = ingredientsFromCurated(curated!, crewSize);
    steps = curatedSteps;
    prepTime = curated!.prepMinutes;
    cookTime = curated!.cookMinutes;
    totalTime = curated!.totalMinutes;
  } else if (pkg) {
    ingredients = ingredientsFromPackage(pkg, crewSize);
    if (pkgStepsOk) steps = pkgSteps;
    prepTime = pkg.prepMin;
    cookTime = pkg.cookMin;
    totalTime = pkg.prepMin + pkg.cookMin;
  } else if (curatedUsable) {
    ingredients = ingredientsFromCurated(curated!, crewSize);
    prepTime = curated!.prepMinutes;
    cookTime = curated!.cookMinutes;
    totalTime = curated!.totalMinutes;
  }

  const timing = estimateTiming(def);
  const explicitPack = getMealSpecificPack(def, crewSize / 8);
  const needsEditorial =
    !steps.length ||
    stepsFailQualityBar(steps) ||
    usesGenericGrillTemplate(steps);

  if (explicitPack && !stepsFailQualityBar(explicitPack.steps)) {
    ingredients = explicitPack.ingredients;
    steps = explicitPack.steps;
    if (explicitPack.prepMinutes != null) prepTime = explicitPack.prepMinutes;
    if (explicitPack.cookMinutes != null) cookTime = explicitPack.cookMinutes;
    if (prepTime != null && cookTime != null) totalTime = prepTime + cookTime;
  } else if (needsEditorial || !ingredients.length) {
    const blueprint = buildEditorialBlueprint(def, crewSize);
    ingredients = blueprint.ingredients;
    steps = blueprint.steps;
  }

  const resolvedTiming = resolveGoldenSlugTiming(
    def,
    steps,
    { prep: prepTime, cook: cookTime },
    timing,
  );
  if (prepTime == null) prepTime = resolvedTiming.prep;
  if (cookTime == null) cookTime = resolvedTiming.cook;
  totalTime = resolvedTiming.total;

  const images = goldenPageImageSet(def.slug);
  const fallbackNutrition = curated ? nutritionFromCurated(curated, def) : estimateNutrition(def);
  const nutritionRecord =
    getVerifiedPerServingNutrition(
      def.slug,
      crewSize,
      def.masterCategoryId === "meal_prep_leftovers",
    ) ??
    calculateNutritionFromIngredients(
      ingredients.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        optional: i.optional,
      })),
      {
        servings: crewSize,
        mealType: "dinner",
        mealPrepFriendly: def.masterCategoryId === "meal_prep_leftovers",
        existing: {
          calories: fallbackNutrition.calories,
          protein: fallbackNutrition.protein,
          carbs: fallbackNutrition.carbs,
          fat: fallbackNutrition.fats,
        },
      },
    );
  const nutrition = {
    calories: nutritionRecord.calories,
    protein: nutritionRecord.protein,
    carbs: nutritionRecord.carbs,
    fats: nutritionRecord.fat,
    label: "per serving (hall portion)" as const,
    source: nutritionRecord.source,
    filterFlags: nutritionRecord.filterFlags,
    badgeCandidates: nutritionRecord.badgeCandidates,
  };
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
  const titleFields = buildRecipeTitleFields(def);
  const editorial = buildEditorialMeta(def, curatedUsable ? curated : null);

  const page: GoldenRecipePage = {
    slug: def.slug,
    title: titleFields.displayTitle,
    displayTitle: titleFields.displayTitle,
    seoTitle: titleFields.seoTitle,
    shortDescription: titleFields.shortDescription,
    subtitle: def.hookLine,
    category: def.masterCategoryId,
    cuisine: def.cuisine,
    description: buildDescription(def, curatedUsable ? curated : null, pkg),
    crewSize,
    baseServings: BASE_SERVINGS_DEFAULT,
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
    whyCrewsLikeIt: editorial.whyCrewsLikeIt,
    mealPrepNotes: editorial.mealPrepNotes,
    substitutions: editorial.substitutions,
    spiceLevel: editorial.spiceLevel,
    cleanupDifficulty: editorial.cleanupDifficulty,
    nutrition: {
      ...nutrition,
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
  const contentAudit = auditGoldenRecipeContent(page);
  page.realismScore = Math.round((scores.realismScore + contentAudit.score) / 2);
  page.firefighterScore = scores.firefighterScore;
  page.popularityWeight = scores.popularityWeight;
  page.searchTerms = buildSearchTerms(def, page);

  return page;
}

function buildEditorialMeta(
  def: GoldenRecipeDefinition,
  curated: CuratedRecipe | null,
): {
  whyCrewsLikeIt: string;
  mealPrepNotes?: string;
  substitutions: string[];
  spiceLevel: "mild" | "medium" | "hot";
  cleanupDifficulty: "easy" | "medium" | "heavy";
} {
  const quick = def.recommendation.quickShiftMeal;
  const feedsHard = def.recommendation.feedsHardScore >= 8;
  const mealPrepNotes =
    def.slug === "pad-thai"
      ? "Before the wok goes on, line up drained noodles, whisked sauce, cooked chicken, scrambled eggs, and garnish bowls in order of use — pad thai moves fast once the pan is hot, and rookies should read each step card once before touching the burner."
      : def.recommendation.mealPrepFriendly
        ? `Cook ${mainProteinLabel(def)} and sauce ahead; assemble day-of in under 20 minutes. Label and date everything in the fridge.`
        : quick
          ? "Minimal prep — chop aromatics before shift change so you can cook as soon as the board quiets."
          : undefined;
  return {
    whyCrewsLikeIt: buildWhyCrewsLikeIt(def, curated, quick, feedsHard),
    mealPrepNotes,
    substitutions: buildSubstitutions(def),
    spiceLevel: inferSpiceLevel(def),
    cleanupDifficulty: def.recommendation.cleanupScore >= 8 ? "easy" : def.recommendation.cleanupScore <= 4 ? "heavy" : "medium",
  };
}

function buildSubstitutions(def: GoldenRecipeDefinition): string[] {
  const subs: string[] = [];
  if (def.protein === "chicken")
    subs.push("Chicken thighs ↔ breasts (thighs forgive overcooking on the flat-top).");
  if (def.mealFormat === "pasta")
    subs.push("Any short pasta shape works — penne, rigatoni, or spaghetti.");
  if (def.mealFormat === "soup_chili")
    subs.push("Ground turkey swaps 1:1 for beef in chili if the crew wants leaner.");
  if (def.protein === "seafood")
    subs.push("Frozen shrimp is fine — thaw under cold running water and pat very dry.");
  return subs.slice(0, 5);
}

function inferSpiceLevel(def: GoldenRecipeDefinition): "mild" | "medium" | "hot" {
  const t = `${def.title} ${def.cuisine} ${def.slug}`.toLowerCase();
  if (/\b(jerk|buffalo|habanero|ghost|extra hot)\b/.test(t)) return "hot";
  if (/\b(chili|chipotle|cajun|sriracha|thai|korean)\b/.test(t)) return "medium";
  return "mild";
}

function expandShortEditorialLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return trimmed;
  if (trimmed.length >= 50) return trimmed;
  const lead = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `${lead} Sized for a full crew, with timing that still works when the kitchen gets interrupted.`;
}

function buildDescription(
  def: GoldenRecipeDefinition,
  curated: CuratedRecipe | null,
  pkg: ReturnType<typeof getCuratedPackageDef>,
): string {
  if (curated?.summary?.trim()) return expandShortEditorialLine(curated.summary.trim());
  if (pkg?.tagline?.trim()) return expandShortEditorialLine(pkg.tagline.trim());
  const hook = def.hookLine?.trim();
  if (hook) return expandShortEditorialLine(hook);
  return `${def.title} — crew portions, familiar flavors, no fussy plating.`;
}

function buildWhyCrewsLikeIt(
  def: GoldenRecipeDefinition,
  curated: CuratedRecipe | null,
  quick: boolean,
  feedsHard: boolean,
): string {
  if (curated?.summary?.trim()) {
    const s = curated.summary.trim();
    if (s.length >= 50) return s;
    const lead = /[.!?]$/.test(s) ? s : `${s}.`;
    const night = quick ? "tight shifts" : feedsHard ? "big-appetite nights" : "regular dinner nights";
    return `${lead} A hall pick for ${night} — one line, real portions, no drama at the stove.`;
  }
  const hook = def.hookLine?.trim();
  const night = quick ? "tight shifts" : feedsHard ? "big-appetite nights" : "regular dinner nights";
  if (hook) {
    const lead = /[.!?]$/.test(hook) ? hook : `${hook}.`;
    return `${lead} A hall pick for ${night} — one line, real portions, no drama at the stove.`;
  }
  return `Straightforward to run on ${night}. Scales on one line and still eats like dinner, not a shortcut.`;
}

export function buildAllGoldenRecipePages(): GoldenRecipePage[] {
  return GOLDEN_100_RECIPES.map((def) => buildGoldenRecipePage(def));
}
