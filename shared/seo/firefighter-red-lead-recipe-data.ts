import { calculateNutritionFromIngredients } from "../nutrition/calculate.js";
import type { CatalogIngredientLine } from "../nutrition/types.js";
import type { FaqItem } from "./schema.js";

export const FIREFIGHTER_RED_LEAD_RECIPE_PATH = "/firefighter-red-lead-recipe" as const;

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

const CREW_SIZE = 8;
const PREP_MIN = 20;
const COOK_MIN = 35;

const INGREDIENTS: SeoRecipeIngredient[] = [
  { name: "vegetable oil", quantity: "3", unit: "tbsp" },
  { name: "red onion", quantity: "1", unit: "large", notes: "sliced thin" },
  { name: "bell peppers", quantity: "3", unit: "medium", notes: "mixed colors, sliced" },
  { name: "garlic", quantity: "6", unit: "cloves", notes: "minced" },
  { name: "crushed tomatoes", quantity: "2", unit: "cans", notes: "28 oz each" },
  { name: "tomato paste", quantity: "3", unit: "tbsp" },
  { name: "large eggs", quantity: "12" },
  { name: "butter", quantity: "3", unit: "tbsp" },
  { name: "steak seasoning", quantity: "2", unit: "tsp", notes: "or salt, pepper, and paprika" },
  { name: "hot sauce", quantity: "1", unit: "tsp", notes: "optional, for the pan" },
  { name: "shredded cheddar", quantity: "1", unit: "cup", optional: true },
  { name: "fresh parsley or green onion", quantity: "1/2", unit: "cup", notes: "chopped, optional" },
];

const STEPS: SeoRecipeStep[] = [
  {
    stepNumber: 1,
    title: "Start the rest of the breakfast first",
    instruction:
      "Red Lead is one pan on a full hall table — not the whole meal. Put bacon or peameal in the oven, warm baked beans, start coffee, and line up toast before the tomato pan goes on. You want the skillet finished when chairs are pulled up, not when people are still hunting for a plate.",
    minutes: 5,
  },
  {
    stepNumber: 2,
    title: "Build the tomato base",
    instruction:
      "Heat a 12-inch cast iron over medium with oil until the oil shimmers. Add onion and peppers; cook 6–8 minutes, stirring occasionally, until softened and starting to color at the edges. Add garlic; stir 45 seconds until fragrant — not brown. Stir in crushed tomatoes, tomato paste, and seasoning. Simmer over medium-low, stirring every few minutes, until the sauce thickens slightly and the raw tomato smell is gone, about 12–15 minutes. Visual cue: the spoon leaves a brief trail on the bottom when you drag it through.",
    minutes: 20,
  },
  {
    stepNumber: 3,
    title: "Make wells and add eggs",
    instruction:
      "Lower heat to medium-low. Stir butter into the sauce. With the back of a spoon, make twelve shallow wells across the surface. Crack one egg into each well. Season with salt and pepper. If using cheddar, scatter it now around the eggs — not over the yolks.",
    minutes: 3,
  },
  {
    stepNumber: 4,
    title: "Cover and finish gently",
    instruction:
      "Cover with a tight lid or inverted sheet pan. Cook over medium-low until egg whites are fully set — about 165°F on the white if you temp — and yolks are runny or jammy, your hall’s preference, 6–8 minutes. Visual cue: whites opaque all the way through; yolks jiggle when you shake the pan gently. Rest covered off heat 2 minutes before carrying to the table.",
    minutes: 8,
    tempF: 165,
  },
  {
    stepNumber: 5,
    title: "Serve as part of the spread",
    instruction:
      "Carry the cast iron to the kitchen table — center of the spread, not plated to-go. Let the crew serve themselves with a spoon and fork while bacon, beans, toast, sausage, and juice stay in their own bowls and platters. The meal matters; the people around the table matter more.",
    minutes: 2,
  },
];

const NUTRITION_INGREDIENTS: CatalogIngredientLine[] = INGREDIENTS.map((ing) => ({
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
      "Red Lead is hall language for a proud breakfast pan — often a tomato-and-egg cast-iron skillet — served as part of a traditional firehall Sunday spread. The name ties to the senior cook leading the line and, in many stations, officer helmet tradition. It is crew food meant for the kitchen table, not a grab-and-go counter plate.",
  },
  {
    question: "Is Red Lead served by itself?",
    answer:
      "Usually not. Most halls set out eggs, toast, baked beans, potatoes or hash browns, bacon or peameal bacon, sausage, orange juice, and sometimes Greek yogurt with granola and berries. Red Lead anchors the table — it does not replace the rest of the spread.",
  },
  {
    question: "What is the difference between tomato Red Lead and steak Red Lead?",
    answer:
      "Regional tradition varies. This page documents the classic tomato-and-egg Red Lead many halls know from Sunday mornings. Some stations run a steak-and-pepper skillet they also call Red Lead — see our Red Lead Skillet breakfast recipe for that version.",
  },
  {
    question: "Can rookies cook Red Lead on first shift?",
    answer:
      "Yes, if they read the full recipe first and start the side dishes before the tomato base. The critical moves are simmering the sauce until it thickens, lowering heat before eggs go in, and covering for a gentle finish so whites set without rubber yolks.",
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

export const FIREFIGHTER_RED_LEAD_SERVING_SUGGESTIONS = [
  {
    title: "Eggs",
    body: "The skillet carries cracked eggs in the tomato base. Still keep extra eggs on the table — scrambled in a hotel pan or fried to order for second helpings.",
  },
  {
    title: "Toast",
    body: "Thick bread, toasted or broiled, stacked warm in foil. Butter and jam on the table for crews dipping into runny yolks.",
  },
  {
    title: "Beans",
    body: "Baked beans warmed in a pot — the quiet anchor on many Canadian hall tables. Ladle on the side, not mixed into the Red Lead pan.",
  },
  {
    title: "Potatoes or hash browns",
    body: "Par-cooked potatoes on a flat griddle, or a separate batch of home fries. Keep them off the tomato surface so neither pan fights for temperature.",
  },
  {
    title: "Bacon or peameal bacon",
    body: "Sheet-pan bacon at 400°F until crisp, or peameal slices seared on the griddle. Refill the platter — first batch never lasts.",
  },
  {
    title: "Sausage",
    body: "Link sausage in the oven alongside bacon, or bulk sausage crumbled in a second pan. Serve with tongs at the table.",
  },
  {
    title: "Orange juice",
    body: "Pitcher on the table, refilled once without being asked.",
  },
  {
    title: "Greek yogurt (optional)",
    body: "Greek yogurt with granola, strawberries, and blueberries for crew who want extra protein without a heavy plate — still at the same table.",
  },
] as const;

export const FIREFIGHTER_RED_LEAD_RECIPE = {
  path: FIREFIGHTER_RED_LEAD_RECIPE_PATH,
  h1: "Firefighter Red Lead Recipe: The Classic Firehall Tomato Breakfast",
  seoTitle: "Firefighter Red Lead Recipe: The Classic Firehall Tomato Breakfast",
  description:
    "Learn what firefighter Red Lead is, why halls serve it on Sunday mornings, and how to cook the classic tomato-and-egg cast-iron skillet as part of a full firehall breakfast spread.",
  keywords: [
    "firefighter red lead recipe",
    "red lead firefighter breakfast",
    "firehall red lead",
    "fire station red lead recipe",
    "red lead tomato recipe",
    "firehall tomato breakfast",
    "firefighter breakfast tradition",
  ],
  heroImage: "/images/breakfast/cast-iron-breakfast-skillet.jpg",
  heroImageAlt:
    "Cast-iron firehall breakfast skillet with eggs and peppers — classic Red Lead style service",
  intro:
    "Red Lead is not a fast breakfast you eat standing up. In halls that still run a proper Sunday morning, it is the tomato-and-egg cast-iron pan that lands on the kitchen table while bacon crisps, beans warm, coffee refills, and the crew actually sits down together.",
  tradition: [
    {
      heading: "What Red Lead means in the firehall",
      paragraphs: [
        "Red Lead is hall slang for the senior cook’s showpiece breakfast pan — not a brand name, and not something you will find in culinary school. Some stations tie “red” to the officer’s helmet tradition; others use it plain as the lead cook’s plate. Either way, it is respect earned at the range and food meant for the table.",
        "The tomato-and-egg version documented here is what many crews picture when they say Red Lead: crushed tomatoes simmered in cast iron, eggs cracked into wells, finished covered so whites set and yolks stay runny for toast. Other halls run a steak skillet they call by the same name — both belong to local tradition.",
      ],
    },
    {
      heading: "A full spread — not a single plate",
      paragraphs: [
        "Red Lead is one component of a traditional firehall breakfast. The table still carries toast, baked beans, potatoes or hash browns, bacon or peameal bacon, sausage, orange juice, and sometimes Greek yogurt with granola and berries for crew who want something lighter.",
        "The meal matters, but the people around the table matter more. Cook the pan well, but leave time for coffee and conversation — that is the tradition rookies learn after their first proper Sunday shift.",
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
    label: "per serving (hall portion)",
    source: computedNutrition.source,
  },
  generatedAt: "2026-05-30T00:00:00.000Z",
  recipeCategory: "Breakfast",
  recipeCuisine: "Firehall",
  tags: ["red-lead", "tomato", "eggs", "cast-iron", "sunday-breakfast", "firehall-tradition"],
} as const;
