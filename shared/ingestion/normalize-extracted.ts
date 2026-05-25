import { mealFormatToArchetype, publisherNameFromSourceUrl } from "../canonical-recipe.js";
import type { IngestRecipeDraft } from "./recipe-ingest-schema.js";
import type { ExtractedRecipe } from "./extracted-recipe.js";
import { assignExploreCategories, inferSideDishTags } from "./categorize.js";
import { computeIngestQualityScores } from "./scoring.js";
import { recipeFingerprint } from "./dedupe.js";
import { publisherQualityBonus } from "./trusted-publishers.js";

function inferProteinLabel(title: string, ingredients: string[]): string {
  const blob = `${title} ${ingredients.join(" ")}`.toLowerCase();
  if (/chicken/.test(blob)) return "chicken";
  if (/beef|steak/.test(blob)) return "beef";
  if (/pork|sausage|bacon/.test(blob)) return "pork";
  if (/salmon|shrimp|fish|seafood/.test(blob)) return "seafood";
  if (/turkey/.test(blob)) return "turkey";
  if (/tofu|lentil|vegetarian|vegan/.test(blob)) return "vegetarian";
  return "mixed";
}

function inferMealFormat(title: string, keywords: string[]): string {
  const t = `${title} ${keywords.join(" ")}`.toLowerCase();
  if (/pasta|spaghetti|lasagna|mac and cheese/.test(t)) return "pasta";
  if (/taco|burrito|fajita/.test(t)) return "tacos";
  if (/burger|sloppy joe/.test(t)) return "burger";
  if (/sandwich|wrap|slider|sub/.test(t)) return "sandwich";
  if (/bowl|rice bowl/.test(t)) return "bowl";
  if (/chili|stew|soup|chowder/.test(t)) return "soup_chili";
  if (/sheet pan/.test(t)) return "sheet_pan";
  if (/slow cooker|crockpot|instant pot/.test(t)) return "one_pot";
  if (/casserole/.test(t)) return "casserole";
  if (/grill|bbq|barbecue/.test(t)) return "grill";
  return "plated_main";
}

function inferCuisine(title: string, keywords: string[], explicit?: string): string {
  if (explicit?.trim() && explicit !== "american") return explicit.toLowerCase();
  const t = `${title} ${keywords.join(" ")}`.toLowerCase();
  if (/mexican|taco|enchilada/.test(t)) return "mexican";
  if (/italian|pasta|parmesan/.test(t)) return "italian";
  if (/asian|stir fry|teriyaki|soy/.test(t)) return "asian";
  if (/bbq|southern|comfort/.test(t)) return "american";
  return "american";
}

export function normalizeExtractedToDraft(
  extracted: ExtractedRecipe,
  options: { trendScore?: number; pinImageUrl?: string },
): IngestRecipeDraft {
  const trendScore = options.trendScore ?? 60;
  const ingredientNames = extracted.ingredients.map((i) => i.name);
  const protein = inferProteinLabel(extracted.title, ingredientNames);
  const keywords = extracted.keywords || [];
  const mealFormat = inferMealFormat(extracted.title, keywords);
  const mealArchetype = mealFormatToArchetype(mealFormat);
  const cuisine = inferCuisine(extracted.title, keywords, extracted.cuisine);

  const sideTags = inferSideDishTags(extracted.title, extracted.sideDishHints || []);
  const tags = [...keywords.slice(0, 6), ...sideTags, protein, cuisine].filter(Boolean);

  const slugBase = extracted.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60);

  let steps = extracted.steps.map((s) => ({ number: s.number, step: s.text })).filter((s) => s.step.trim());
  if (steps.length < 2 && extracted.description?.trim()) {
    const chunks = extracted.description
      .split(/(?:\.\s+|\n+)/)
      .map((c) => c.trim())
      .filter((c) => c.length > 24);
    steps = chunks.slice(0, 6).map((text, i) => ({ number: i + 1, step: text }));
  }
  if (steps.length === 1) {
    steps.push({ number: 2, step: "Finish and serve hot for the crew." });
  }

  const totalMinutes = Math.min(
    600,
    Math.max(15, extracted.totalMinutes || extracted.prepMinutes + extracted.cookMinutes || 45),
  );

  const draft: IngestRecipeDraft = {
    fingerprint: "",
    source: "publisher",
    title: extracted.title.trim(),
    summary: extracted.description?.slice(0, 500),
    heroImage: extracted.heroImage,
    imageAlt: extracted.title,
    ingredients: extracted.ingredients.map((ing, i) => ({
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      original: ing.original,
    })),
    steps,
    cuisine,
    protein,
    mealFormat,
    mealArchetype,
    prepMinutes: Math.min(180, extracted.prepMinutes || 0),
    totalMinutes,
    cleanupDifficulty: 3,
    servingsBase: Math.max(4, Math.min(12, extracted.servings || 6)),
    exploreCategories: [],
    tags,
    trendScore,
    comfortScore: 0,
    healthyScore: 0,
    firehallSuitabilityScore: 0,
    appetiteScore: 0,
    qualityScore: 0,
    sourceName: extracted.publisherName || publisherNameFromSourceUrl(extracted.sourceUrl),
    sourceUrl: extracted.sourceUrl,
    license: "partner",
    curatedSlug: slugBase,
  };

  draft.exploreCategories = assignExploreCategories({ ...draft, summary: draft.summary });
  const scores = computeIngestQualityScores({ ...draft, summary: draft.summary }, trendScore);
  Object.assign(draft, scores);
  draft.qualityScore = Math.min(
    100,
    draft.qualityScore + publisherQualityBonus(extracted.sourceUrl),
  );

  if (options.pinImageUrl && !draft.heroImage) {
    draft.heroImage = options.pinImageUrl;
  }

  draft.fingerprint = recipeFingerprint(draft);
  return draft;
}
