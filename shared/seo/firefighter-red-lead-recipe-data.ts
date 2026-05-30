import { calculateNutritionFromIngredients } from "../nutrition/calculate.js";
import type { CatalogIngredientLine } from "../nutrition/types.js";
import type { FaqItem } from "./schema.js";
import {
  RED_LEAD_PDF_ASSETS,
  RED_LEAD_PDF_COPY,
  RED_LEAD_SAUCE_COOK_MIN,
  RED_LEAD_SAUCE_DEFAULT_CREW,
  RED_LEAD_SAUCE_FIREHALL_TIPS,
  RED_LEAD_SAUCE_INGREDIENTS,
  RED_LEAD_SAUCE_PREP_MIN,
  RED_LEAD_SAUCE_STEPS,
  RED_LEAD_TRADITIONAL_SIDES,
} from "./firefighter-red-lead-sauce-data.js";

export const FIREFIGHTER_RED_LEAD_RECIPE_PATH = "/firefighter-red-lead-recipe" as const;

export const FIREFIGHTER_RED_LEAD_PDF_PATH = RED_LEAD_PDF_ASSETS.pdfPath;
export const FIREFIGHTER_RED_LEAD_PDF_PREVIEW_PATH = RED_LEAD_PDF_ASSETS.previewPath;
export const FIREFIGHTER_RED_LEAD_HERO_IMAGE = RED_LEAD_PDF_ASSETS.heroImage;

export const FIREFIGHTER_RED_LEAD_LEAD_MAGNET = {
  id: "red-lead-recipe",
  title: RED_LEAD_PDF_COPY.header,
  pdfPath: FIREFIGHTER_RED_LEAD_PDF_PATH,
  previewPath: FIREFIGHTER_RED_LEAD_PDF_PREVIEW_PATH,
} as const;

export type SeoRecipeStep = {
  stepNumber: number;
  title: string;
  instruction: string;
  minutes?: number;
  tempF?: number;
};

export type SeoRecipeIngredient = {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  optional?: boolean;
};

export type InternalRecipeLink = {
  href: string;
  label: string;
  description?: string;
};

const CREW_SIZE = RED_LEAD_SAUCE_DEFAULT_CREW;
const PREP_MIN = RED_LEAD_SAUCE_PREP_MIN;
const COOK_MIN = RED_LEAD_SAUCE_COOK_MIN;

const INGREDIENTS: SeoRecipeIngredient[] = RED_LEAD_SAUCE_INGREDIENTS.map((ing) => {
  const match = ing.amount.match(/^([\d./\s–-]+(?:\s*(?:cans?|can|cloves|tsp|tbsp|cup|cups|lb))?)\s*(.*)$/i);
  if (!match) return { name: ing.name, notes: ing.notes, optional: ing.optional };
  const qtyPart = match[1]?.trim() ?? ing.amount;
  return {
    name: ing.name,
    quantity: qtyPart,
    notes: ing.notes,
    optional: ing.optional,
  };
});

const STEPS: SeoRecipeStep[] = RED_LEAD_SAUCE_STEPS.map((step) => ({
  stepNumber: step.number,
  title: step.title,
  instruction: [step.body, step.visualCue ? `Look for: ${step.visualCue}` : "", step.mistake ? `Watch out: ${step.mistake}` : ""]
    .filter(Boolean)
    .join(" "),
  minutes: step.minutes ? parseInt(step.minutes, 10) || undefined : undefined,
}));

const NUTRITION_INGREDIENTS: CatalogIngredientLine[] = INGREDIENTS.filter((ing) => !ing.optional).map((ing) => ({
  name: ing.name,
  quantity: ing.quantity,
  unit: ing.unit,
  notes: ing.notes,
  optional: ing.optional,
}));

const computedNutrition = calculateNutritionFromIngredients(NUTRITION_INGREDIENTS, {
  servings: CREW_SIZE,
  mealType: "breakfast",
});

export const FIREFIGHTER_RED_LEAD_FAQS: FaqItem[] = [
  {
    question: "What is firefighter Red Lead?",
    answer:
      "Red Lead is hall slang for a slow-cooked tomato sauce — usually simmered in cast iron and served as part of a station breakfast. The name gets used differently from hall to hall. Some tie it to the officer’s red helmet; others just mean whoever is running the sauce pan that morning.",
  },
  {
    question: "Is Red Lead the whole breakfast?",
    answer:
      "No. Red Lead is the sauce. The breakfast is bacon, sausage, eggs, toast, potatoes, juice, and coffee around it. You cook those separately and put the sauce pan in the middle of the table.",
  },
  {
    question: "Can a rookie make it on first shift?",
    answer:
      "Yes — if they read the recipe first and get the rest of breakfast started before the onion goes in. The sauce mostly needs a steady simmer and someone watching so it does not stick.",
  },
  {
    question: "Can you make Red Lead ahead?",
    answer:
      "A lot of halls do. Simmer it the day before, cool it fast, and refrigerate. Reheat in cast iron over medium-low with a splash of tomato juice, stirring until it looks glossy again.",
  },
];

export const FIREFIGHTER_RED_LEAD_BREAKFAST_LINKS: InternalRecipeLink[] = [
  {
    href: "/breakfast/bacon-egg-hash-skillet",
    label: "Bacon & Egg Hash Skillet",
    description: "Good potato side for a big Sunday table",
  },
  {
    href: "/breakfast/hall-sausage-biscuits-gravy",
    label: "Hall Sausage & Biscuits",
    description: "Another hall breakfast staple",
  },
  {
    href: "/breakfast/buttermilk-pancakes",
    label: "Buttermilk Pancakes",
    description: "When the crew wants a stack",
  },
  {
    href: "/breakfast/high-protein-parfaits",
    label: "High-Protein Parfaits",
    description: "Lighter option for anyone skipping the heavy stuff",
  },
  {
    href: "/firefighter-breakfast-recipes",
    label: "Firefighter breakfast recipes",
    description: "Browse the full breakfast catalog",
  },
];

export const FIREFIGHTER_RED_LEAD_CLASSIC_LINKS: InternalRecipeLink[] = [
  { href: "/recipes/chicken-parm", label: "Chicken Parm" },
  { href: "/recipes/smash-burgers", label: "Smash Burgers" },
  { href: "/recipes/beef-dip", label: "Beef Dip Sandwiches" },
  { href: "/recipes/pulled-pork", label: "Pulled Pork" },
  { href: "/recipes/biscuits-gravy", label: "Biscuits & Gravy" },
  { href: "/wheel", label: "Classics Wheel", description: "Spin a hall classic" },
];

export const FIREFIGHTER_RED_LEAD_SERVING_SUGGESTIONS = RED_LEAD_TRADITIONAL_SIDES.map((side) => ({
  title: side.name,
  body: side.detail,
}));

export const FIREFIGHTER_RED_LEAD_FIREHALL_TIPS = RED_LEAD_SAUCE_FIREHALL_TIPS.map((tip) => ({
  title: tip.title,
  body: tip.body,
}));

export const FIREFIGHTER_RED_LEAD_RECIPE = {
  slug: "firefighter-red-lead-recipe",
  path: FIREFIGHTER_RED_LEAD_RECIPE_PATH,
  h1: "Firefighter Red Lead Recipe",
  seoTitle: "Firefighter Red Lead Recipe — Firehall Tomato Sauce",
  description:
    "How to make firehall Red Lead — the slow-cooked tomato sauce served with a proper station breakfast. Sauce recipe only, with hall tips and serving tradition.",
  keywords: [
    "firefighter red lead recipe",
    "red lead firefighter breakfast",
    "firehall red lead",
    "fire station red lead recipe",
    "red lead tomato recipe",
    "firehall tomato sauce",
    "firefighter breakfast tradition",
  ],
  heroImage: FIREFIGHTER_RED_LEAD_HERO_IMAGE,
  heroImageAlt:
    "Cast-iron Red Lead tomato sauce on a firehall kitchen table, ready to serve with a station breakfast",
  intro: RED_LEAD_PDF_COPY.introduction.join(" "),
  tradition: [
    {
      heading: "What Red Lead is",
      paragraphs: [
        RED_LEAD_PDF_COPY.introduction[0]!,
        "In most halls that still run a Sunday morning, somebody is on sauce duty. The pan goes in the middle of the table. Everyone else handles bacon, eggs, sausage, toast, and potatoes. Red Lead is not a single plate — it is the shared tomato pan the crew eats around.",
      ],
    },
    {
      heading: "Why it matters",
      paragraphs: [...RED_LEAD_PDF_COPY.whyItMatters.paragraphs],
    },
    {
      heading: "What this recipe makes",
      paragraphs: [
        RED_LEAD_PDF_COPY.recipeIntro,
        "Crushed tomatoes, onion, butter, salt, and pepper — simmered until thick. Optional garlic, sugar, or hot sauce if that is how your hall does it. No fancy ingredients. Just the sauce.",
      ],
    },
  ],
  crewSize: CREW_SIZE,
  prepTime: PREP_MIN,
  cookTime: COOK_MIN,
  totalTime: PREP_MIN + COOK_MIN,
  difficulty: "medium" as const,
  ingredients: INGREDIENTS,
  steps: STEPS,
  nutrition: {
    calories: computedNutrition.calories,
    protein: computedNutrition.protein,
    carbs: computedNutrition.carbs,
    fat: computedNutrition.fat,
    label: "per serving (sauce portion)",
    source: computedNutrition.source,
  },
  generatedAt: "2026-05-30T00:00:00.000Z",
  recipeCategory: "Breakfast",
  recipeCuisine: "Firehall",
  tags: ["red-lead", "tomato", "cast-iron", "sunday-breakfast", "firehall-tradition"],
} as const;
