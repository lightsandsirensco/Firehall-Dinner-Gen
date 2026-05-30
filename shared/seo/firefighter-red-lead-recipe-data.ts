import { calculateNutritionFromIngredients } from "../nutrition/calculate.js";
import type { CatalogIngredientLine } from "../nutrition/types.js";
import type { FaqItem } from "./schema.js";
import {
  RED_LEAD_PDF_ASSETS,
  RED_LEAD_SAUCE_COOK_MIN,
  RED_LEAD_SAUCE_DEFAULT_CREW,
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
  title: "The Official Firehall Red Lead Recipe",
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
  instruction: [step.body, step.visualCue ? `Visual cue: ${step.visualCue}` : "", step.mistake ? `Avoid: ${step.mistake}` : ""]
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
      "Red Lead is hall language for the senior cook’s tomato sauce — a slow-simmered red cast-iron pan that lands on the kitchen table as part of a traditional Sunday spread. The name ties to the officer’s red helmet tradition or whoever is leading the line that morning.",
  },
  {
    question: "Is Red Lead served by itself?",
    answer:
      "Almost never. Most halls set out bacon, breakfast sausage, eggs, toast, hash browns or potatoes, and orange juice alongside the sauce. Red Lead anchors the table — it does not replace the rest of the spread.",
  },
  {
    question: "What is the difference between tomato Red Lead and steak Red Lead?",
    answer:
      "Regional tradition varies. This page documents the classic tomato sauce many halls know from Sunday mornings. Some stations run a steak-and-pepper skillet they also call Red Lead — see our Red Lead Skillet breakfast recipe for that version.",
  },
  {
    question: "Can rookies cook Red Lead on first shift?",
    answer:
      "Yes, if they read the sauce recipe first and start the side dishes before the onion hits the pan. The critical moves are a gentle simmer until the sauce thickens and holding it warm without scorching the bottom.",
  },
];

export const FIREFIGHTER_RED_LEAD_BREAKFAST_LINKS: InternalRecipeLink[] = [
  {
    href: "/breakfast/red-lead-skillet",
    label: "Red Lead Skillet (steak & eggs)",
    description: "Steak-and-pepper cast-iron version in the catalog",
  },
  {
    href: "/breakfast/hall-sausage-biscuits-gravy",
    label: "Hall Sausage & Biscuits",
    description: "Classic station gravy spread",
  },
  {
    href: "/breakfast/bacon-egg-hash-skillet",
    label: "Bacon & Egg Hash Skillet",
    description: "Crowd-friendly potato skillet",
  },
  {
    href: "/breakfast/buttermilk-pancakes",
    label: "Buttermilk Pancakes",
    description: "Stack-and-serve hall favorite",
  },
  {
    href: "/breakfast/high-protein-parfaits",
    label: "High-Protein Parfaits",
    description: "Greek yogurt option for lighter plates",
  },
  {
    href: "/firefighter-breakfast-recipes",
    label: "Firefighter breakfast recipes",
    description: "Browse all hall breakfast plates",
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

export const FIREFIGHTER_RED_LEAD_RECIPE = {
  path: FIREFIGHTER_RED_LEAD_RECIPE_PATH,
  h1: "Firefighter Red Lead Recipe: The Classic Firehall Tomato Sauce",
  seoTitle: "Firefighter Red Lead Recipe: The Classic Firehall Tomato Sauce",
  description:
    "Learn what firefighter Red Lead is, why halls serve it on Sunday mornings, and how to simmer the classic tomato sauce in cast iron as part of a full firehall breakfast spread.",
  keywords: [
    "firefighter red lead recipe",
    "red lead firefighter breakfast",
    "firehall red lead",
    "fire station red lead recipe",
    "red lead tomato recipe",
    "firehall tomato breakfast",
    "firefighter breakfast tradition",
  ],
  heroImage: FIREFIGHTER_RED_LEAD_HERO_IMAGE,
  heroImageAlt:
    "Cast-iron firehall Red Lead tomato sauce simmering red in a skillet — classic Sunday breakfast pan",
  intro:
    "Red Lead is the tomato sauce — not a grab-and-go plate. In halls that still run a proper Sunday morning, the senior cook’s cast iron carries a slow red sauce to the center of the table while bacon crisps, sausage warms, coffee refills, and the crew actually sits down together.",
  tradition: [
    {
      heading: "What Red Lead means in the firehall",
      paragraphs: [
        "Red Lead is hall slang for the senior cook’s tomato pan — not a brand name, and not something you will find in culinary school. Some stations tie “red” to the officer’s helmet tradition; others use it plain as the lead cook’s sauce. Either way, it is respect earned at the range and food meant for the table.",
        "The tomato sauce documented here is what many crews picture when they say Red Lead: crushed tomatoes and onion simmered in cast iron until thick and glossy. Other halls run a steak skillet by the same name — both belong to local tradition, but this recipe is the sauce only.",
      ],
    },
    {
      heading: "A full spread — not a single plate",
      paragraphs: [
        "Red Lead is one component of a traditional firehall breakfast. The table still carries eggs, toast, hash browns or home fries, bacon, breakfast sausage, orange juice, and sometimes Greek yogurt with granola for crew who want something lighter.",
        "The meal matters, but the people around the table matter more. Simmer the sauce well, but leave time for coffee and conversation — that is the tradition rookies learn after their first proper Sunday shift.",
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
