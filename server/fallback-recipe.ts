import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";
import type { StructureType } from "./structure-variety";
import { STRUCTURE_DISPLAY } from "./structure-variety";
import { getRecentVegBases, commitVegBase } from "./protein-validator";

interface RawIngredient {
  item: string;
  amount: string;
  baseQty?: number;
  unit?: string;
  allergens?: string[];
}

interface AllergenSafeReplacement {
  match: RegExp;
  safeFor: string[];
  replacement: RawIngredient;
  stepFind: RegExp;
  stepReplace: string;
}

const ALLERGEN_SAFE_REPLACEMENTS: AllergenSafeReplacement[] = [
  { match: /butter/i, safeFor: ["dairy"], replacement: { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /butter/gi, stepReplace: "olive oil" },
  { match: /shredded cheese/i, safeFor: ["dairy"], replacement: { item: "Nutritional yeast", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /shredded cheese/gi, stepReplace: "nutritional yeast" },
  { match: /cheese/i, safeFor: ["dairy"], replacement: { item: "Nutritional yeast", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /cheese/gi, stepReplace: "nutritional yeast" },
  { match: /chicken broth/i, safeFor: ["dairy"], replacement: { item: "Vegetable broth", amount: "1 cup", baseQty: 1, unit: "cup" }, stepFind: /chicken broth/gi, stepReplace: "vegetable broth" },
  { match: /cream/i, safeFor: ["dairy", "soy", "nuts"], replacement: { item: "Coconut cream", amount: "½ cup", baseQty: 0.5, unit: "cup" }, stepFind: /cream/gi, stepReplace: "coconut cream" },
  { match: /soy sauce/i, safeFor: ["gluten"], replacement: { item: "Tamari (gluten-free)", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /soy sauce/gi, stepReplace: "tamari (gluten-free)" },
  { match: /soy sauce/i, safeFor: ["soy"], replacement: { item: "Coconut aminos", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /soy sauce/gi, stepReplace: "coconut aminos" },
  { match: /soy sauce/i, safeFor: ["soy", "gluten"], replacement: { item: "Coconut aminos", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /soy sauce/gi, stepReplace: "coconut aminos" },
  { match: /rice or pasta/i, safeFor: ["gluten"], replacement: { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" }, stepFind: /rice or pasta/gi, stepReplace: "rice" },
  { match: /pasta/i, safeFor: ["gluten"], replacement: { item: "Rice (gluten-free substitute)", amount: "2 cups", baseQty: 2, unit: "cups" }, stepFind: /pasta/gi, stepReplace: "rice" },
  { match: /dijon mustard/i, safeFor: ["gluten"], replacement: { item: "Gluten-free Dijon mustard", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /dijon mustard/gi, stepReplace: "gluten-free Dijon mustard" },
  { match: /taco seasoning/i, safeFor: ["gluten", "soy"], replacement: { item: "Homemade taco seasoning (cumin, paprika, garlic powder, onion powder, chili powder)", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /taco seasoning/gi, stepReplace: "homemade taco seasoning" },
  { match: /eggs?/i, safeFor: ["eggs"], replacement: { item: "Flax eggs (1 tbsp ground flax + 3 tbsp water per egg)", amount: "as needed" }, stepFind: /eggs?/gi, stepReplace: "flax eggs" },
  { match: /peanut/i, safeFor: ["nuts"], replacement: { item: "Sunflower seed butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /peanut(?: butter)?/gi, stepReplace: "sunflower seed butter" },
  { match: /almond/i, safeFor: ["nuts"], replacement: { item: "Sunflower seeds", amount: "¼ cup", baseQty: 0.25, unit: "cup" }, stepFind: /almonds?/gi, stepReplace: "sunflower seeds" },
  { match: /cashew/i, safeFor: ["nuts"], replacement: { item: "Sunflower seeds", amount: "¼ cup", baseQty: 0.25, unit: "cup" }, stepFind: /cashews?/gi, stepReplace: "sunflower seeds" },
];

const PROTEIN_INGREDIENTS: Record<string, RawIngredient[]> = {
  chicken: [
    { item: "Boneless skinless chicken breasts", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Paprika", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Mixed vegetables (broccoli, bell pepper, carrots)", amount: "4 cups", baseQty: 4, unit: "cups" },
    { item: "Soy sauce", amount: "3 tbsp", baseQty: 3, unit: "tbsp", allergens: ["soy", "gluten"] },
    { item: "Chicken broth", amount: "1 cup", baseQty: 1, unit: "cup" },
  ],
  beef: [
    { item: "Ground beef (lean)", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
    { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Chili powder", amount: "2 tsp", baseQty: 2, unit: "tsp" },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Canned diced tomatoes", amount: "2 cans (14 oz)", baseQty: 2, unit: "cans (14 oz)" },
    { item: "Shredded cheese", amount: "1 cup", baseQty: 1, unit: "cup", allergens: ["dairy"] },
  ],
  pork: [
    { item: "Pork tenderloin", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Brown sugar", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Dijon mustard", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["gluten"] },
    { item: "Potatoes, cubed", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Green beans", amount: "1 lb", baseQty: 1, unit: "lb" },
    { item: "Butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["dairy"] },
  ],
  turkey: [
    { item: "Ground turkey", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Taco seasoning", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["gluten", "soy"] },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Black beans, drained", amount: "1 can (15 oz)", baseQty: 1, unit: "can (15 oz)" },
    { item: "Shredded lettuce and salsa", amount: "for topping" },
  ],
  fish: [
    { item: "Salmon fillets", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Lemon juice", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Dill (dried)", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Asparagus", amount: "1 bunch", baseQty: 1, unit: "bunch" },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["dairy"] },
    { item: "Lemon wedges", amount: "for serving" },
  ],
  vegetarian: [],
};

interface VegFallbackSet {
  base: string;
  ingredients: RawIngredient[];
  steps: { heading: string; body: string }[];
  proTips: string[];
  whySnippet: string;
}

const VEG_FALLBACK_SETS: VegFallbackSet[] = [
  {
    base: "chickpeas",
    ingredients: [
      { item: "Chickpeas, drained and rinsed", amount: "4 cans (15 oz)", baseQty: 4, unit: "cans (15 oz)" },
      { item: "Olive oil", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Smoked paprika", amount: "2 tsp", baseQty: 2, unit: "tsp" },
      { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Mixed vegetables (bell pepper, zucchini, broccoli)", amount: "4 cups", baseQty: 4, unit: "cups" },
      { item: "Vegetable broth", amount: "1 cup", baseQty: 1, unit: "cup" },
    ],
    steps: [
      { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover tightly, and simmer 18-20 minutes until water is absorbed and grains are tender." },
      { heading: "Sauté the aromatics (medium, 3 min)", body: "Heat olive oil in a large skillet. Add onion and cook 2 minutes until softened. Add garlic and stir 30 seconds until fragrant." },
      { heading: "Season the chickpeas (medium-high, 5 min)", body: "Add drained chickpeas, smoked paprika, cumin, and salt. Stir to coat evenly. Cook 4-5 minutes until chickpeas are lightly golden and crispy on the edges." },
      { heading: "Cook the vegetables (medium-high, 5 min)", body: "Add mixed vegetables and vegetable broth. Stir-fry 4-5 minutes until vegetables are crisp-tender and brightly colored." },
      { heading: "Combine and serve (no heat, 2 min)", body: "Serve seasoned chickpeas and vegetables over rice. Each serving packs protein from the chickpeas — hearty and filling." },
    ],
    proTips: ["Drain and rinse canned chickpeas to reduce sodium by up to 40%.", "For extra crunch, roast chickpeas at 400°F for 20 minutes instead of pan-frying."],
    whySnippet: "chickpeas and fresh vegetables",
  },
  {
    base: "lentils",
    ingredients: [
      { item: "Green or brown lentils, rinsed", amount: "2 cups dry", baseQty: 2, unit: "cups" },
      { item: "Olive oil", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
      { item: "Carrots, diced", amount: "2 medium", baseQty: 2, unit: "medium" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Cumin", amount: "2 tsp", baseQty: 2, unit: "tsp" },
      { item: "Turmeric", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Vegetable broth", amount: "4 cups", baseQty: 4, unit: "cups" },
      { item: "Spinach, fresh", amount: "4 cups", baseQty: 4, unit: "cups" },
      { item: "Lemon juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    steps: [
      { heading: "Sauté the aromatics (medium, 4 min)", body: "Heat olive oil in a large pot. Add onion and carrots, cook 3 minutes. Add garlic, cumin, and turmeric — stir 1 minute until fragrant." },
      { heading: "Cook the lentils (medium, 25 min)", body: "Add rinsed lentils and vegetable broth. Bring to a boil, then reduce to a simmer. Cook 20-25 minutes until lentils are tender but still hold their shape." },
      { heading: "Wilt the spinach (medium, 2 min)", body: "Stir in fresh spinach and let it wilt into the hot lentils — takes about 2 minutes. Season with salt." },
      { heading: "Finish and serve (no heat, 2 min)", body: "Squeeze lemon juice over the top and stir. Serve in bowls — each serving is loaded with plant-based protein and fiber." },
    ],
    proTips: ["Green lentils hold their shape better than red — perfect for hearty dishes.", "A squeeze of lemon at the end brightens the whole dish."],
    whySnippet: "lentils and fresh spinach",
  },
  {
    base: "black beans",
    ingredients: [
      { item: "Black beans, drained and rinsed", amount: "4 cans (15 oz)", baseQty: 4, unit: "cans (15 oz)" },
      { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Red onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
      { item: "Bell peppers, diced", amount: "2 large", baseQty: 2, unit: "large" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Chili powder", amount: "2 tsp", baseQty: 2, unit: "tsp" },
      { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Lime juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Fresh cilantro, chopped", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
    ],
    steps: [
      { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover tightly, and simmer 18-20 minutes until tender." },
      { heading: "Sauté vegetables (medium-high, 5 min)", body: "Heat olive oil in a large skillet. Add red onion and bell peppers, cook 3-4 minutes. Add garlic and stir 30 seconds." },
      { heading: "Season the black beans (medium, 5 min)", body: "Add drained black beans, chili powder, cumin, and salt. Cook 4-5 minutes, lightly mashing some beans for a creamy texture." },
      { heading: "Finish and serve (no heat, 2 min)", body: "Squeeze lime juice over the beans and top with fresh cilantro. Serve over rice — packed with fiber and plant protein." },
    ],
    proTips: ["Mash a third of the beans for a creamier texture while keeping some whole for bite.", "Lime juice added at the end keeps the flavor bright and fresh."],
    whySnippet: "black beans, peppers, and rice",
  },
  {
    base: "kidney beans",
    ingredients: [
      { item: "Kidney beans, drained and rinsed", amount: "4 cans (15 oz)", baseQty: 4, unit: "cans (15 oz)" },
      { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
      { item: "Diced tomatoes", amount: "2 cans (14 oz)", baseQty: 2, unit: "cans (14 oz)" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Smoked paprika", amount: "2 tsp", baseQty: 2, unit: "tsp" },
      { item: "Oregano", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Vegetable broth", amount: "1 cup", baseQty: 1, unit: "cup" },
    ],
    steps: [
      { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover tightly, and simmer 18-20 minutes until tender." },
      { heading: "Sauté aromatics (medium, 3 min)", body: "Heat olive oil in a large pot. Add onion and cook 2 minutes. Add garlic, smoked paprika, and oregano — stir 1 minute." },
      { heading: "Simmer the beans (medium, 15 min)", body: "Add kidney beans, diced tomatoes, vegetable broth, and salt. Simmer 12-15 minutes until sauce thickens and flavors meld." },
      { heading: "Serve (no heat, 2 min)", body: "Spoon the saucy kidney beans over rice. Each bowl delivers hearty protein and a rich, smoky flavor." },
    ],
    proTips: ["Kidney beans are one of the highest-protein legumes — great for firefighter fuel.", "Simmer longer for a thicker, stew-like consistency."],
    whySnippet: "kidney beans in a smoky tomato sauce",
  },
  {
    base: "quinoa",
    ingredients: [
      { item: "Quinoa, rinsed", amount: "2 cups dry", baseQty: 2, unit: "cups" },
      { item: "Olive oil", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Red bell pepper, diced", amount: "2 large", baseQty: 2, unit: "large" },
      { item: "Zucchini, diced", amount: "2 medium", baseQty: 2, unit: "medium" },
      { item: "Cherry tomatoes, halved", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Dried herbs (basil, oregano)", amount: "2 tsp", baseQty: 2, unit: "tsp" },
      { item: "Lemon juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Vegetable broth", amount: "4 cups", baseQty: 4, unit: "cups" },
    ],
    steps: [
      { heading: "Cook the quinoa (medium, 15 min)", body: "Combine rinsed quinoa and vegetable broth in a pot. Bring to a boil, reduce to low, cover and cook 15 minutes until liquid is absorbed. Fluff with a fork." },
      { heading: "Roast the vegetables (425°F, 20 min)", body: "Toss bell pepper, zucchini, and cherry tomatoes with olive oil, salt, and dried herbs on a sheet pan. Roast at 425°F for 18-20 minutes until edges are caramelized." },
      { heading: "Combine and finish (no heat, 3 min)", body: "Toss roasted vegetables into the quinoa. Add garlic and lemon juice, stir to combine. Quinoa is a complete protein — all essential amino acids in one grain." },
    ],
    proTips: ["Rinse quinoa before cooking to remove the bitter saponin coating.", "Quinoa is a complete protein — one of the few plant foods with all 9 essential amino acids."],
    whySnippet: "quinoa and roasted vegetables",
  },
  {
    base: "eggs",
    ingredients: [
      { item: "Large eggs", amount: "18", baseQty: 18, unit: "", allergens: ["eggs"] },
      { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Bell peppers, diced", amount: "2 large", baseQty: 2, unit: "large" },
      { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
      { item: "Mushrooms, sliced", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
      { item: "Shredded cheese", amount: "1 cup", baseQty: 1, unit: "cup", allergens: ["dairy"] },
      { item: "Toast or tortillas", amount: "12 slices", baseQty: 12, unit: "slices" },
      { item: "Hot sauce", amount: "for serving" },
    ],
    steps: [
      { heading: "Prep the vegetables (no heat, 5 min)", body: "Dice bell peppers, onion, and slice mushrooms. Have eggs cracked into a bowl and lightly beaten with salt and pepper." },
      { heading: "Sauté vegetables (medium-high, 5 min)", body: "Heat olive oil in a large skillet. Cook peppers, onion, and mushrooms 4-5 minutes until softened and lightly golden." },
      { heading: "Scramble the eggs (medium, 4 min)", body: "Pour beaten eggs over the vegetables. Let set 30 seconds, then gently fold with a spatula every 30 seconds until eggs are just set but still creamy — about 3-4 minutes." },
      { heading: "Finish and serve (no heat, 2 min)", body: "Top with shredded cheese and let it melt from residual heat. Serve with toast or in tortillas. Add hot sauce to taste." },
    ],
    proTips: ["Pull eggs off heat when still slightly wet — carryover heat finishes them perfectly.", "3 eggs per person gives a solid 18g of protein per serving."],
    whySnippet: "scrambled eggs loaded with vegetables",
  },
  {
    base: "tempeh",
    ingredients: [
      { item: "Tempeh, cubed", amount: "2 lbs", baseQty: 2, unit: "lbs", allergens: ["soy"] },
      { item: "Olive oil", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Soy sauce", amount: "3 tbsp", baseQty: 3, unit: "tbsp", allergens: ["soy", "gluten"] },
      { item: "Maple syrup", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Rice vinegar", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Salt", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
      { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Broccoli florets", amount: "4 cups", baseQty: 4, unit: "cups" },
      { item: "Sesame seeds", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    steps: [
      { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover tightly, and simmer 18-20 minutes." },
      { heading: "Make the glaze (no heat, 2 min)", body: "Whisk together soy sauce, maple syrup, rice vinegar, and garlic in a small bowl. Set aside." },
      { heading: "Crisp the tempeh (medium-high, 8 min)", body: "Heat olive oil in a large skillet. Add cubed tempeh in a single layer. Cook 3-4 minutes per side until golden and crispy on the edges." },
      { heading: "Steam the broccoli (medium, 5 min)", body: "Steam or blanch broccoli florets until bright green and crisp-tender, about 4-5 minutes." },
      { heading: "Glaze and serve (medium, 2 min)", body: "Pour the glaze over crispy tempeh and toss to coat. Cook 1 minute until sticky. Serve over rice with broccoli. Top with sesame seeds." },
    ],
    proTips: ["Tempeh has more protein per ounce than tofu and a nuttier, meatier texture.", "Steaming tempeh for 10 minutes before cooking removes any bitterness."],
    whySnippet: "glazed tempeh with broccoli and rice",
  },
  {
    base: "white beans",
    ingredients: [
      { item: "Cannellini beans, drained and rinsed", amount: "4 cans (15 oz)", baseQty: 4, unit: "cans (15 oz)" },
      { item: "Olive oil", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "5", baseQty: 5, unit: "" },
      { item: "Cherry tomatoes", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Fresh spinach", amount: "4 cups", baseQty: 4, unit: "cups" },
      { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Red pepper flakes", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
      { item: "Crusty bread", amount: "1 large loaf", baseQty: 1, unit: "large loaf" },
      { item: "Lemon juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Vegetable broth", amount: "1 cup", baseQty: 1, unit: "cup" },
    ],
    steps: [
      { heading: "Sauté garlic and tomatoes (medium, 4 min)", body: "Heat olive oil in a large skillet. Add garlic and red pepper flakes, cook 30 seconds. Add cherry tomatoes and cook 3-4 minutes until they start to burst." },
      { heading: "Add the beans (medium, 5 min)", body: "Add drained cannellini beans and vegetable broth. Season with salt. Simmer 4-5 minutes until the sauce thickens slightly." },
      { heading: "Wilt the spinach (medium, 2 min)", body: "Stir in fresh spinach and cook until just wilted, about 2 minutes. Squeeze lemon juice over the top." },
      { heading: "Serve (no heat, 2 min)", body: "Spoon the white bean mixture into bowls. Serve with thick slices of crusty bread for sopping up the sauce." },
    ],
    proTips: ["Cannellini beans are creamy and mild — they absorb flavor from the garlic and tomatoes beautifully.", "Save the bean liquid (aquafaba) for use in other recipes as an egg white substitute."],
    whySnippet: "white beans with garlic, tomatoes, and spinach",
  },
  {
    base: "edamame",
    ingredients: [
      { item: "Shelled edamame", amount: "2 lbs frozen", baseQty: 2, unit: "lbs", allergens: ["soy"] },
      { item: "Sesame oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
      { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
      { item: "Fresh ginger, grated", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Soy sauce", amount: "3 tbsp", baseQty: 3, unit: "tbsp", allergens: ["soy", "gluten"] },
      { item: "Rice vinegar", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Rice noodles", amount: "1 lb", baseQty: 1, unit: "lb" },
      { item: "Shredded carrots", amount: "2 cups", baseQty: 2, unit: "cups" },
      { item: "Green onions, sliced", amount: "1 bunch", baseQty: 1, unit: "bunch" },
      { item: "Sesame seeds", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    steps: [
      { heading: "Cook the noodles (boiling, 5 min)", body: "Cook rice noodles according to package directions. Drain, rinse with cold water, and toss with a drizzle of sesame oil to prevent sticking." },
      { heading: "Cook the edamame (medium-high, 4 min)", body: "Heat sesame oil in a large skillet. Add edamame and cook 3-4 minutes until heated through and lightly golden." },
      { heading: "Build the sauce (medium, 2 min)", body: "Add garlic and ginger, stir 30 seconds. Pour in soy sauce and rice vinegar. Toss to coat the edamame evenly." },
      { heading: "Combine and serve (no heat, 3 min)", body: "Toss noodles, edamame, and shredded carrots together. Top with green onions and sesame seeds. Serve warm or at room temperature." },
    ],
    proTips: ["Edamame packs 17g of protein per cup — one of the highest-protein vegetables.", "Rice noodles cook in minutes and are naturally gluten-free."],
    whySnippet: "edamame and rice noodles",
  },
];

function pickVegFallbackSet(allergens: string[]): VegFallbackSet {
  const recent = getRecentVegBases(3);
  const hasSoy = allergens.includes("soy");
  const hasEggs = allergens.includes("eggs");
  const hasDairy = allergens.includes("dairy");

  const eligible = VEG_FALLBACK_SETS.filter(s => {
    if (recent.includes(s.base)) return false;
    if (hasSoy && (s.base === "tempeh" || s.base === "edamame")) return false;
    if (hasEggs && s.base === "eggs") return false;
    return true;
  });

  if (eligible.length === 0) {
    return VEG_FALLBACK_SETS[Math.floor(Math.random() * VEG_FALLBACK_SETS.length)];
  }

  return eligible[Math.floor(Math.random() * eligible.length)];
}

const STOVETOP_STEPS: Record<string, { heading: string; body: string }[]> = {
  chicken: [
    { heading: "Prep the chicken (no heat, 5 min)", body: "Pat chicken breasts dry with paper towels and season both sides with salt, pepper, and paprika. Cut into even 1-inch strips for faster, more even cooking." },
    { heading: "Start the rice (high heat → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil in a pot. Reduce to low, cover tightly, and simmer for 18-20 minutes until water is absorbed and grains are tender." },
    { heading: "Sear the chicken (medium-high, 5-7 min)", body: "Heat olive oil in a large skillet over medium-high heat. Add chicken strips in a single layer — don't crowd. Cook 3-4 minutes per side until golden brown and internal temp reaches 165°F." },
    { heading: "Cook the vegetables (medium-high, 4-5 min)", body: "Remove chicken and set aside. Add garlic to the pan, stir 30 seconds until fragrant. Add mixed vegetables and stir-fry 4-5 minutes until crisp-tender and bright in color." },
    { heading: "Make the sauce (medium, 2 min)", body: "Pour soy sauce and chicken broth into the pan. Let it bubble and reduce slightly until it coats the back of a spoon, about 2 minutes." },
    { heading: "Combine and serve (no heat, 2 min)", body: "Return chicken to the pan, toss everything together to coat. Serve over rice. Internal temp check: chicken should read 165°F in the thickest piece." },
  ],
  beef: [
    { heading: "Prep ingredients (no heat, 5 min)", body: "Dice the onion and mince the garlic. Open and drain canned tomatoes. Measure out spices — having everything ready speeds up the cook." },
    { heading: "Brown the beef (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet or Dutch oven over medium-high heat. Add ground beef, breaking it into small pieces with a spatula. Cook until no pink remains and edges are browned — internal temp should reach 160°F." },
    { heading: "Sauté aromatics (medium, 3 min)", body: "Drain excess fat if needed. Add onion and garlic, stir frequently until the onion is translucent and garlic is fragrant, about 3 minutes." },
    { heading: "Start the rice (high heat, 1 min)", body: "In a separate pot, bring salted water to a boil. Add rice and cook according to package directions until tender." },
    { heading: "Build the sauce (medium, 10-12 min)", body: "Add diced tomatoes, chili powder, salt, and pepper to the beef. Stir well, bring to a simmer, and let cook 10-12 minutes until sauce thickens and flavors meld." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Spoon the seasoned beef mixture over cooked rice. Top with shredded cheese while hot so it melts. Serve family-style." },
  ],
  pork: [
    { heading: "Prep the pork (no heat, 5 min)", body: "Trim any silver skin from the tenderloin. Mix brown sugar, Dijon mustard, salt, and pepper in a small bowl. Rub the mixture evenly over the pork." },
    { heading: "Sear the pork (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high heat. Sear the tenderloin on all sides until deeply golden brown, about 2 minutes per side." },
    { heading: "Prep the sides (no heat, 5 min)", body: "While pork sears, cube the potatoes into 1-inch pieces. Trim the green beans." },
    { heading: "Cook potatoes (medium, 15-18 min)", body: "In a separate pot, boil cubed potatoes in salted water until fork-tender, about 15-18 minutes. Drain." },
    { heading: "Finish the pork (medium, 12-15 min)", body: "Reduce heat to medium. Cover skillet with a lid or foil. Cook pork 12-15 minutes, turning once, until internal temp reaches 145°F. Remove and rest 3 minutes." },
    { heading: "Serve (no heat, 2 min)", body: "Slice pork into ½-inch medallions. Plate alongside boiled potatoes (toss with olive oil and salt) and steamed green beans." },
  ],
  turkey: [
    { heading: "Cook the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce heat to low, cover, and simmer 18-20 minutes until water is absorbed and grains are fluffy." },
    { heading: "Brown the turkey (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high. Add ground turkey, breaking apart with a spatula. Cook until no pink remains and meat is lightly browned — should reach 165°F." },
    { heading: "Season the meat (medium, 2 min)", body: "Add onion and garlic, cook 2 minutes until softened. Stir in taco seasoning and cumin. Add a splash of water to help the seasoning coat evenly." },
    { heading: "Add the beans (medium, 3 min)", body: "Stir in the drained black beans. Cook 3 minutes until heated through and flavors are combined." },
    { heading: "Assemble the bowls (no heat, 3 min)", body: "Divide rice among bowls. Top with seasoned turkey and black bean mixture." },
    { heading: "Add toppings and serve (no heat, 2 min)", body: "Top with shredded lettuce, salsa, and any other toppings your crew likes. Serve immediately while everything is hot." },
  ],
  fish: [
    { heading: "Prep the salmon (no heat, 5 min)", body: "Pat salmon fillets dry with paper towels. Season with salt, dill, and a squeeze of lemon juice. Let sit while you prep the sides." },
    { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover, and simmer 18-20 minutes until tender and fluffy." },
    { heading: "Prep the asparagus (no heat, 3 min)", body: "Snap off the woody ends of the asparagus. Toss spears with olive oil, salt, and pepper." },
    { heading: "Cook the salmon (medium-high, 4-5 min per side)", body: "Heat butter and olive oil in a non-stick skillet over medium-high. Place salmon skin-side up. Cook 4-5 minutes until golden, flip carefully, cook another 3-4 minutes until internal temp reaches 145°F and fish flakes easily." },
    { heading: "Sauté the asparagus (medium-high, 5-6 min)", body: "In a separate pan, sauté asparagus spears with a drizzle of olive oil over medium-high heat for 5-6 minutes until tender and lightly charred." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Place salmon fillets on plates alongside rice and asparagus. Squeeze fresh lemon over the fish and serve with lemon wedges." },
  ],
};

const OVEN_STEPS: Record<string, { heading: string; body: string }[]> = {
  chicken: [
    { heading: "Prep the chicken (no heat, 5 min)", body: "Pat chicken breasts dry with paper towels and season both sides with salt, pepper, and paprika. Cut into even 1-inch strips for faster, more even cooking." },
    { heading: "Start the rice (high heat → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil in a pot. Reduce to low, cover tightly, and simmer for 18-20 minutes until water is absorbed and grains are tender." },
    { heading: "Sear the chicken (medium-high, 5-7 min)", body: "Heat olive oil in a large skillet over medium-high heat. Add chicken strips in a single layer — don't crowd. Cook 3-4 minutes per side until golden brown and internal temp reaches 165°F." },
    { heading: "Cook the vegetables (medium-high, 4-5 min)", body: "Remove chicken and set aside. Add garlic to the pan, stir 30 seconds until fragrant. Add mixed vegetables and stir-fry 4-5 minutes until crisp-tender and bright in color." },
    { heading: "Make the sauce (medium, 2 min)", body: "Pour soy sauce and chicken broth into the pan. Let it bubble and reduce slightly until it coats the back of a spoon, about 2 minutes." },
    { heading: "Combine and serve (no heat, 2 min)", body: "Return chicken to the pan, toss everything together to coat. Serve over rice. Internal temp check: chicken should read 165°F in the thickest piece." },
  ],
  beef: [
    { heading: "Prep ingredients (no heat, 5 min)", body: "Dice the onion and mince the garlic. Open and drain canned tomatoes. Measure out spices — having everything ready speeds up the cook." },
    { heading: "Brown the beef (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet or Dutch oven over medium-high heat. Add ground beef, breaking it into small pieces with a spatula. Cook until no pink remains and edges are browned — internal temp should reach 160°F." },
    { heading: "Sauté aromatics (medium, 3 min)", body: "Drain excess fat if needed. Add onion and garlic, stir frequently until the onion is translucent and garlic is fragrant, about 3 minutes." },
    { heading: "Start the rice (high heat, 1 min)", body: "In a separate pot, bring salted water to a boil. Add rice and cook according to package directions until tender." },
    { heading: "Build the sauce (medium, 10-12 min)", body: "Add diced tomatoes, chili powder, salt, and pepper to the beef. Stir well, bring to a simmer, and let cook 10-12 minutes until sauce thickens and flavors meld." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Spoon the seasoned beef mixture over cooked rice. Top with shredded cheese while hot so it melts. Serve family-style." },
  ],
  pork: [
    { heading: "Prep the pork (no heat, 5 min)", body: "Trim any silver skin from the tenderloin. Mix brown sugar, Dijon mustard, salt, and pepper in a small bowl. Rub the mixture evenly over the pork." },
    { heading: "Sear the pork (medium-high, 3-4 min)", body: "Heat olive oil in an oven-safe skillet over medium-high heat. Sear the tenderloin on all sides until golden brown, about 1 minute per side." },
    { heading: "Prep the sides (no heat, 5 min)", body: "While pork sears, cube the potatoes into 1-inch pieces. Trim the green beans. Toss both with olive oil, salt, and pepper." },
    { heading: "Roast everything (400°F oven, 20-25 min)", body: "Transfer pork to a baking sheet lined with foil. Arrange potatoes and green beans around it. Roast at 400°F for 20-25 minutes until pork reaches 145°F internally." },
    { heading: "Rest the meat (no heat, 5 min)", body: "Remove pork from oven and let it rest on a cutting board for at least 3 minutes. Carryover cooking will bring it to a safe temp. The juices redistribute for a juicier result." },
    { heading: "Slice and serve (no heat, 2 min)", body: "Slice pork into ½-inch medallions. Fan slices on a platter alongside roasted potatoes and green beans. Add a pat of butter on the potatoes while hot." },
  ],
  turkey: [
    { heading: "Cook the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce heat to low, cover, and simmer 18-20 minutes until water is absorbed and grains are fluffy." },
    { heading: "Brown the turkey (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high. Add ground turkey, breaking apart with a spatula. Cook until no pink remains and meat is lightly browned — should reach 165°F." },
    { heading: "Season the meat (medium, 2 min)", body: "Add onion and garlic, cook 2 minutes until softened. Stir in taco seasoning and cumin. Add a splash of water to help the seasoning coat evenly." },
    { heading: "Add the beans (medium, 3 min)", body: "Stir in the drained black beans. Cook 3 minutes until heated through and flavors are combined." },
    { heading: "Assemble the bowls (no heat, 3 min)", body: "Divide rice among bowls. Top with seasoned turkey and black bean mixture." },
    { heading: "Add toppings and serve (no heat, 2 min)", body: "Top with shredded lettuce, salsa, and any other toppings your crew likes. Serve immediately while everything is hot." },
  ],
  fish: [
    { heading: "Prep the salmon (no heat, 5 min)", body: "Pat salmon fillets dry with paper towels. Season with salt, dill, and a squeeze of lemon juice. Let sit while you prep the sides." },
    { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover, and simmer 18-20 minutes until tender and fluffy." },
    { heading: "Prep the asparagus (no heat, 3 min)", body: "Snap off the woody ends of the asparagus. Toss spears with olive oil, salt, and pepper on a baking sheet." },
    { heading: "Cook the salmon (medium-high, 4-5 min per side)", body: "Heat butter and olive oil in a non-stick skillet over medium-high. Place salmon skin-side up. Cook 4-5 minutes until golden, flip carefully, cook another 3-4 minutes until internal temp reaches 145°F and fish flakes easily." },
    { heading: "Roast the asparagus (425°F, 8-10 min)", body: "While salmon cooks, roast asparagus in the oven at 425°F for 8-10 minutes until tender and tips are slightly crispy." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Place salmon fillets on plates alongside rice and asparagus. Squeeze fresh lemon over the fish and serve with lemon wedges." },
  ],
  vegetarian: [
    { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover tightly, and simmer 18-20 minutes until water is absorbed and grains are tender." },
    { heading: "Press and cube the tofu (no heat, 5 min)", body: "Press tofu between paper towels with a heavy pan on top for 5 minutes. Cut into ¾-inch cubes. Pat dry again — drier tofu = crispier results." },
    { heading: "Crisp the tofu (medium-high, 8-10 min)", body: "Heat 2 tbsp olive oil in a large non-stick skillet over medium-high. Add tofu cubes in a single layer. Cook 3-4 minutes per side without moving until golden and crispy on all sides." },
    { heading: "Cook the vegetables (medium-high, 5 min)", body: "Remove tofu and set aside. Add remaining olive oil, garlic, and onion. Cook 2 minutes until fragrant. Add mixed vegetables, stir-fry 4-5 minutes until crisp-tender and brightly colored." },
    { heading: "Add chickpeas and season (medium, 3 min)", body: "Add drained chickpeas, smoked paprika, cumin, and salt. Stir to combine. Pour in vegetable broth and let simmer 2-3 minutes until heated through and lightly saucy." },
    { heading: "Combine and serve (no heat, 2 min)", body: "Return crispy tofu to the pan, toss gently. Serve over rice. Each serving packs protein from both tofu and chickpeas." },
  ],
};

const PROTEIN_SAFETY: Record<string, { protein: string; target_temp_f: number; target_temp_c: number; rest_minutes: number; probe_where: string; notes: string }> = {
  chicken: { protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part of the breast, away from bone", notes: "All poultry must reach 165°F for safety." },
  beef: { protein: "Ground Beef", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of the thickest portion", notes: "Ground beef requires 160°F — no pink remaining." },
  pork: { protein: "Pork", target_temp_f: 145, target_temp_c: 63, rest_minutes: 3, probe_where: "Center of the thickest portion", notes: "Allow a 3-minute rest for carryover cooking." },
  turkey: { protein: "Turkey", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part, away from bone", notes: "All poultry must reach 165°F for safety." },
  fish: { protein: "Fish", target_temp_f: 145, target_temp_c: 63, rest_minutes: 0, probe_where: "Center of the thickest fillet", notes: "Fish should flake easily with a fork when done." },
  vegetarian: { protein: "General food safety", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Center of dish", notes: "Reheat leftovers to 165°F. Ensure tofu and beans are heated through." },
};

interface FallbackArchetype {
  structure: StructureType;
  title: string;
  baseCarb: string;
  cookingMethod: string;
}

const FALLBACK_ARCHETYPES: Record<string, FallbackArchetype[]> = {
  chicken: [
    { structure: "bowl", title: "Chipotle Chicken Rice Bowls", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Buffalo Chicken Wraps", baseCarb: "tortilla", cookingMethod: "stovetop" },
    { structure: "taco", title: "Chicken Street Tacos", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "Grilled Chicken Subs with Peppers", baseCarb: "sub roll", cookingMethod: "grill" },
    { structure: "sheet-pan", title: "Greek Sheet Pan Chicken & Vegetables", baseCarb: "pita", cookingMethod: "oven" },
    { structure: "skillet", title: "Creamy Garlic Chicken Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Teriyaki Chicken Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "flatbread", title: "BBQ Chicken Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "stuffed", title: "Chicken & Rice Stuffed Peppers", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "pasta", title: "Lemon Garlic Chicken Pasta", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "bake", title: "Chicken Taco Bake", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "one-pot", title: "One-Pot Chicken & Veggie Rice", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Sesame Chicken Noodle Toss", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "soup-stew", title: "Hearty Chicken & Vegetable Stew", baseCarb: "crusty bread", cookingMethod: "stovetop" },
    { structure: "loaded-fries", title: "Loaded Chicken Nacho Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "casserole", title: "Chicken Enchilada Casserole", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "burger", title: "Smash Chicken Burgers", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "breakfast-for-dinner", title: "Chicken & Veggie Breakfast Hash", baseCarb: "potato", cookingMethod: "skillet" },
    { structure: "grill", title: "Herb-Marinated Grilled Chicken Plates", baseCarb: "couscous", cookingMethod: "grill" },
    { structure: "rice-bake", title: "Cheesy Chicken & Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
  ],
  beef: [
    { structure: "bowl", title: "Korean Beef Rice Bowls", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Philly Cheesesteak Wraps", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "taco", title: "Seasoned Beef Street Tacos", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "French Dip Beef Sandwiches", baseCarb: "hoagie roll", cookingMethod: "stovetop" },
    { structure: "burger", title: "Smash Burgers with All the Fixings", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "sheet-pan", title: "Sheet Pan Beef & Veggie Fajitas", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "skillet", title: "Firehouse Beef & Pepper Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Beef & Broccoli Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stuffed", title: "Beef & Cheese Stuffed Peppers", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "casserole", title: "Beef & Potato Casserole", baseCarb: "potato", cookingMethod: "oven" },
    { structure: "pasta", title: "Beefy Marinara Pasta Bake", baseCarb: "pasta", cookingMethod: "oven" },
    { structure: "soup-stew", title: "Hearty Beef & Vegetable Stew", baseCarb: "crusty bread", cookingMethod: "stovetop" },
    { structure: "one-pot", title: "One-Pot Beef Chili Mac", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Mongolian Beef Noodle Toss", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "loaded-fries", title: "Loaded Beef Nacho Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "flatbread", title: "Beef & Onion Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "bake", title: "Beef Enchilada Bake", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "stuffed-bread", title: "Beef & Cheese Stuffed Bread", baseCarb: "bread dough", cookingMethod: "oven" },
    { structure: "breakfast-for-dinner", title: "Beef & Egg Breakfast Skillet", baseCarb: "potato", cookingMethod: "skillet" },
    { structure: "rice-bake", title: "Cheesy Beef & Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
  ],
  pork: [
    { structure: "bowl", title: "Hawaiian Pork Rice Bowls", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Pulled Pork Wraps with Slaw", baseCarb: "tortilla", cookingMethod: "stovetop" },
    { structure: "taco", title: "Carnitas Street Tacos", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "BBQ Pulled Pork Sandwiches", baseCarb: "bun", cookingMethod: "slow cooker" },
    { structure: "sheet-pan", title: "Sheet Pan Pork Chops & Roasted Veggies", baseCarb: "sweet potato", cookingMethod: "oven" },
    { structure: "skillet", title: "Honey Mustard Pork Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Ginger Pork Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "flatbread", title: "Pork & Caramelized Onion Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "stuffed", title: "Pork & Apple Stuffed Sweet Potatoes", baseCarb: "sweet potato", cookingMethod: "oven" },
    { structure: "pasta", title: "Pork Ragu Pasta", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "one-pot", title: "One-Pot Pork & Rice Dinner", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Szechuan Pork Noodle Toss", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "soup-stew", title: "Pork & White Bean Stew", baseCarb: "crusty bread", cookingMethod: "stovetop" },
    { structure: "bake", title: "Pork Tenderloin & Potato Bake", baseCarb: "potato", cookingMethod: "oven" },
    { structure: "loaded-fries", title: "Loaded Pulled Pork Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "casserole", title: "Pork & Veggie Casserole", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "burger", title: "Pork Smash Burgers", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "breakfast-for-dinner", title: "Pork & Hash Brown Breakfast Skillet", baseCarb: "potato", cookingMethod: "skillet" },
    { structure: "grill", title: "Grilled Pork Chops with Corn Salad", baseCarb: "corn", cookingMethod: "grill" },
    { structure: "rice-bake", title: "Cheesy Pork & Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
  ],
  turkey: [
    { structure: "bowl", title: "Turkey Taco Bowls with Black Beans", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Turkey Lettuce Wraps", baseCarb: "lettuce", cookingMethod: "stovetop" },
    { structure: "taco", title: "Spiced Turkey Tacos", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "Turkey Meatball Subs", baseCarb: "sub roll", cookingMethod: "oven" },
    { structure: "burger", title: "Turkey Smash Burgers", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "sheet-pan", title: "Sheet Pan Turkey & Sweet Potato", baseCarb: "sweet potato", cookingMethod: "oven" },
    { structure: "skillet", title: "Turkey Sausage & Pepper Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Turkey & Veggie Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stuffed", title: "Turkey & Quinoa Stuffed Peppers", baseCarb: "quinoa", cookingMethod: "oven" },
    { structure: "casserole", title: "Turkey Enchilada Casserole", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "pasta", title: "Turkey Bolognese Pasta", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "soup-stew", title: "Turkey & White Bean Chili", baseCarb: "cornbread", cookingMethod: "stovetop" },
    { structure: "one-pot", title: "One-Pot Turkey & Rice", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Asian Turkey Noodle Toss", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "loaded-fries", title: "Loaded Turkey Taco Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "flatbread", title: "Turkey & Pesto Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "bake", title: "Turkey & Veggie Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "breakfast-for-dinner", title: "Turkey Sausage Breakfast Hash", baseCarb: "potato", cookingMethod: "skillet" },
    { structure: "grill", title: "Grilled Turkey Burgers with Fixings", baseCarb: "bun", cookingMethod: "grill" },
    { structure: "rice-bake", title: "Turkey & Black Bean Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
  ],
  fish: [
    { structure: "bowl", title: "Teriyaki Salmon Rice Bowls", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Fish & Slaw Wraps", baseCarb: "tortilla", cookingMethod: "stovetop" },
    { structure: "taco", title: "Crispy Fish Tacos with Lime Crema", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "Crispy Fish Sandwiches", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "sheet-pan", title: "Sheet Pan Salmon & Asparagus", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "skillet", title: "Lemon Butter Fish Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Ginger Fish & Veggie Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "flatbread", title: "Smoked Salmon Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "pasta", title: "Garlic Shrimp & Lemon Pasta", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "one-pot", title: "One-Pot Fish & Rice Dinner", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Thai Fish Noodle Toss", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "soup-stew", title: "Hearty Fish & Potato Chowder", baseCarb: "crusty bread", cookingMethod: "stovetop" },
    { structure: "bake", title: "Herb-Crusted Fish Bake", baseCarb: "potato", cookingMethod: "oven" },
    { structure: "loaded-fries", title: "Loaded Fish & Chips Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "casserole", title: "Fish & Veggie Rice Casserole", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "burger", title: "Salmon Burgers with Dill Sauce", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "breakfast-for-dinner", title: "Smoked Salmon Breakfast Plates", baseCarb: "toast", cookingMethod: "stovetop" },
    { structure: "grill", title: "Grilled Fish with Citrus & Rice", baseCarb: "rice", cookingMethod: "grill" },
    { structure: "rice-bake", title: "Cheesy Fish & Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "stuffed", title: "Fish-Stuffed Bell Peppers", baseCarb: "rice", cookingMethod: "oven" },
  ],
  vegetarian: [
    { structure: "bowl", title: "Chickpea & Roasted Veggie Rice Bowls", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "wrap", title: "Spiced Chickpea & Hummus Wraps", baseCarb: "tortilla", cookingMethod: "stovetop" },
    { structure: "taco", title: "Black Bean & Sweet Potato Tacos", baseCarb: "tortilla", cookingMethod: "skillet" },
    { structure: "sandwich", title: "Crispy Tofu Bánh Mì Sandwiches", baseCarb: "baguette", cookingMethod: "stovetop" },
    { structure: "burger", title: "Smoky Black Bean Burgers", baseCarb: "bun", cookingMethod: "skillet" },
    { structure: "sheet-pan", title: "Sheet Pan Tofu & Veggie Dinner", baseCarb: "rice", cookingMethod: "oven" },
    { structure: "skillet", title: "Lentil & Vegetable Skillet", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "stir-fry", title: "Tofu & Veggie Stir-Fry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "flatbread", title: "Roasted Veggie & Hummus Flatbreads", baseCarb: "flatbread", cookingMethod: "oven" },
    { structure: "stuffed", title: "Quinoa-Stuffed Bell Peppers", baseCarb: "quinoa", cookingMethod: "oven" },
    { structure: "pasta", title: "Creamy Roasted Red Pepper Pasta", baseCarb: "pasta", cookingMethod: "stovetop" },
    { structure: "one-pot", title: "One-Pot Chickpea Coconut Curry", baseCarb: "rice", cookingMethod: "stovetop" },
    { structure: "noodle-toss", title: "Peanut Noodle Toss with Edamame", baseCarb: "noodles", cookingMethod: "stovetop" },
    { structure: "soup-stew", title: "Hearty Lentil & Vegetable Stew", baseCarb: "crusty bread", cookingMethod: "stovetop" },
    { structure: "bake", title: "Mediterranean Veggie & Feta Bake", baseCarb: "orzo", cookingMethod: "oven" },
    { structure: "loaded-fries", title: "Loaded Black Bean Nacho Fries", baseCarb: "fries", cookingMethod: "oven" },
    { structure: "casserole", title: "Three-Bean Enchilada Casserole", baseCarb: "tortilla", cookingMethod: "oven" },
    { structure: "breakfast-for-dinner", title: "Veggie & Egg Breakfast Hash", baseCarb: "potato", cookingMethod: "skillet" },
    { structure: "grill", title: "Grilled Halloumi & Veggie Plates", baseCarb: "couscous", cookingMethod: "grill" },
    { structure: "rice-bake", title: "Cheesy Black Bean & Rice Bake", baseCarb: "rice", cookingMethod: "oven" },
  ],
};

const recentFallbackTemplateIds: number[] = [];
const MAX_RECENT_FALLBACKS = 5;

const recentArchetypeTitles: string[] = [];
const MAX_RECENT_ARCHETYPES = 10;

function trackArchetype(title: string) {
  const idx = recentArchetypeTitles.indexOf(title);
  if (idx !== -1) recentArchetypeTitles.splice(idx, 1);
  recentArchetypeTitles.unshift(title);
  if (recentArchetypeTitles.length > MAX_RECENT_ARCHETYPES) {
    recentArchetypeTitles.length = MAX_RECENT_ARCHETYPES;
  }
}

export function pickFallbackArchetype(protein: string, structureType: StructureType, appliances: string[], recentSignatures?: string[]): FallbackArchetype {
  const archetypes = FALLBACK_ARCHETYPES[protein] || FALLBACK_ARCHETYPES.chicken;
  const appLower = appliances.map(a => a.toLowerCase());

  const COOKING_METHOD_APPLIANCE_MAP: Record<string, string[]> = {
    "stovetop": ["stove"],
    "skillet": ["stove"],
    "oven": ["oven", "air fryer"],
    "grill": ["grill"],
    "slow cooker": ["slow cooker", "instant pot"],
    "instant pot": ["instant pot", "slow cooker"],
    "air fryer": ["air fryer", "oven"],
    "microwave": ["microwave"],
  };

  const methodCompatible = (method: string) => {
    const needed = COOKING_METHOD_APPLIANCE_MAP[method] || ["stove"];
    return needed.some(a => appLower.includes(a));
  };

  const notRecentlyUsed = (a: FallbackArchetype) => !recentArchetypeTitles.includes(a.title);

  const notMatchingRecentSignature = (a: FallbackArchetype) => {
    if (!recentSignatures || recentSignatures.length === 0) return true;
    const structPart = a.structure.toLowerCase();
    const proteinLower = protein.toLowerCase();
    const carbPart = (a.baseCarb || "").toLowerCase();
    return !recentSignatures.some(sig => {
      const sigLower = sig.toLowerCase();
      const sigParts = sigLower.split("|");
      const sigStyle = sigParts[0] || "";
      const sigProtein = sigParts[1] || "";
      const sigCarb = sigParts[3] || "";
      return sigStyle === structPart && sigProtein === proteinLower && sigCarb === carbPart;
    });
  };

  const pickBest = (candidates: FallbackArchetype[]): FallbackArchetype => {
    const fresh = candidates.filter(c => notRecentlyUsed(c) && notMatchingRecentSignature(c));
    const lessStale = fresh.length > 0 ? fresh : candidates.filter(notRecentlyUsed);
    const pool = lessStale.length > 0 ? lessStale : candidates;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    trackArchetype(pick.title);
    return pick;
  };

  const structMatch = archetypes.filter(a => a.structure === structureType && methodCompatible(a.cookingMethod));
  if (structMatch.length > 0) {
    return pickBest(structMatch);
  }

  const anyCompatible = archetypes.filter(a => methodCompatible(a.cookingMethod));
  if (anyCompatible.length > 0) {
    return pickBest(anyCompatible);
  }

  return pickBest(archetypes);
}

export function trackFallbackTemplateId(templateId: number) {
  const idx = recentFallbackTemplateIds.indexOf(templateId);
  if (idx !== -1) recentFallbackTemplateIds.splice(idx, 1);
  recentFallbackTemplateIds.unshift(templateId);
  if (recentFallbackTemplateIds.length > MAX_RECENT_FALLBACKS) {
    recentFallbackTemplateIds.length = MAX_RECENT_FALLBACKS;
  }
}

export function getRecentFallbackTemplateIds(): number[] {
  return [...recentFallbackTemplateIds];
}

const CUISINE_SEASONINGS: Record<string, { spices: RawIngredient[]; titlePrefix: string }> = {
  mediterranean: {
    spices: [
      { item: "Dried oregano", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Lemon zest", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
    ],
    titlePrefix: "Mediterranean",
  },
  mexican: {
    spices: [
      { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Cilantro, chopped", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
      { item: "Lime juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    titlePrefix: "Mexican-Style",
  },
  italian: {
    spices: [
      { item: "Italian seasoning blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Fresh basil, torn", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
    ],
    titlePrefix: "Italian",
  },
  asian: {
    spices: [
      { item: "Fresh ginger, grated", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Sesame oil", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Asian-Inspired",
  },
  korean: {
    spices: [
      { item: "Gochugaru (Korean chili flakes)", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Sesame oil", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Rice vinegar", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
    ],
    titlePrefix: "Korean-Style",
  },
  thai: {
    spices: [
      { item: "Thai basil or regular basil", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
      { item: "Fish sauce", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Lime juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    titlePrefix: "Thai-Inspired",
  },
  indian: {
    spices: [
      { item: "Garam masala", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Turmeric", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
      { item: "Ground coriander", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Indian-Spiced",
  },
  middle_eastern: {
    spices: [
      { item: "Za'atar spice blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Sumac", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    ],
    titlePrefix: "Middle Eastern",
  },
  bbq: {
    spices: [
      { item: "Smoked paprika", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "BBQ sauce", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
    ],
    titlePrefix: "BBQ",
  },
  cajun: {
    spices: [
      { item: "Cajun seasoning blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Hot sauce", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Cajun",
  },
  canadian: {
    spices: [
      { item: "Maple syrup", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Dried thyme", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Canadian-Style",
  },
};

const BASE_CREW = 6;

function formatAmount(baseQty: number, unit: string, scale: number): string {
  const scaled = baseQty * scale;
  const rounded = Math.round(scaled * 4) / 4;
  if (rounded === 0.25) return unit ? `¼ ${unit}` : "¼";
  if (rounded === 0.5) return unit ? `½ ${unit}` : "½";
  if (rounded === 0.75) return unit ? `¾ ${unit}` : "¾";
  if (rounded === Math.floor(rounded)) return unit ? `${rounded} ${unit}` : `${rounded}`;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : `${frac}`;
  return unit ? `${whole}${fracStr} ${unit}` : `${whole}${fracStr}`;
}

function scaleIngredient(ing: RawIngredient, scale: number): { item: string; amount: string; notes: string } {
  if (!ing.baseQty || !ing.unit) {
    return { item: ing.item, amount: ing.amount, notes: "" };
  }
  return { item: ing.item, amount: formatAmount(ing.baseQty, ing.unit, scale), notes: "" };
}

function applyAllergenSwaps(
  ingredients: RawIngredient[],
  steps: { heading: string; body: string }[],
  allergens: string[]
): { ingredients: RawIngredient[]; steps: { heading: string; body: string }[]; swapsMade: string[] } {
  if (!allergens.length) return { ingredients, steps, swapsMade: [] };

  const lowerAllergens = allergens.map(a => a.toLowerCase());
  let swappedIngredients = [...ingredients];
  let swappedSteps = steps.map(s => ({ ...s }));
  const swapsMade: string[] = [];
  const alreadySwapped = new Set<number>();

  for (let i = 0; i < swappedIngredients.length; i++) {
    if (alreadySwapped.has(i)) continue;

    const taggedAllergens = swappedIngredients[i].allergens || [];
    const triggeredAllergens = lowerAllergens.filter(a =>
      taggedAllergens.includes(a) || ALLERGEN_SAFE_REPLACEMENTS.some(r => r.match.test(swappedIngredients[i].item) && r.safeFor.includes(a))
    );
    if (triggeredAllergens.length === 0) continue;

    const bestSwap = ALLERGEN_SAFE_REPLACEMENTS.find(rule => {
      if (!rule.match.test(swappedIngredients[i].item)) return false;
      return triggeredAllergens.every(a => rule.safeFor.includes(a));
    });

    if (bestSwap) {
      const original = swappedIngredients[i].item;
      const safeForList = bestSwap.safeFor.filter(a => lowerAllergens.includes(a)).join(" & ");
      swappedIngredients[i] = { ...bestSwap.replacement };
      alreadySwapped.add(i);
      swapsMade.push(`${original} → ${bestSwap.replacement.item} (${safeForList}-free)`);
      swappedSteps = swappedSteps.map(s => ({
        heading: s.heading,
        body: s.body.replace(bestSwap.stepFind, bestSwap.stepReplace),
      }));
    }
  }

  return { ingredients: swappedIngredients, steps: swappedSteps, swapsMade };
}

function hasAppliance(appliances: string[], type: string): boolean {
  return appliances.some(a => a.toLowerCase().includes(type.toLowerCase()));
}

function pickProteinForAppliances(chosenProtein: string, appliances: string[]): string {
  const hasStove = hasAppliance(appliances, "stove");
  const hasOven = hasAppliance(appliances, "oven");

  if (!hasStove && !hasOven) {
    return "chicken";
  }
  if (chosenProtein === "pork" && !hasOven && !hasStove) {
    return "chicken";
  }
  return chosenProtein;
}

function getStepsForAppliances(proteinKey: string, appliances: string[]): { heading: string; body: string }[] {
  const hasStove = hasAppliance(appliances, "stove");
  const hasOven = hasAppliance(appliances, "oven");
  const hasSlowCooker = hasAppliance(appliances, "slow cooker");
  const hasInstantPot = hasAppliance(appliances, "instant pot");

  if (hasOven && OVEN_STEPS[proteinKey]) {
    return OVEN_STEPS[proteinKey];
  }
  if (hasStove && STOVETOP_STEPS[proteinKey]) {
    return STOVETOP_STEPS[proteinKey];
  }
  if (hasSlowCooker || hasInstantPot) {
    const applianceName = hasInstantPot ? "Instant Pot" : "slow cooker";
    const isVeg = proteinKey === "vegetarian";
    const mainItem = isVeg ? "chickpeas and tofu" : "the protein";
    const brothType = isVeg ? "vegetable broth" : "broth";
    return [
      { heading: `Prep ingredients (no heat, 5 min)`, body: `Season ${mainItem} with salt, pepper, and spices. Dice onion and mince garlic. Prep vegetables.` },
      { heading: `Load the ${applianceName} (2 min)`, body: `Place ${mainItem} in the ${applianceName}. Add diced onion, garlic, and a cup of ${brothType} or water.` },
      { heading: `Cook (${hasInstantPot ? "high pressure, 15 min" : "low 6-8 hrs / high 3-4 hrs"})`, body: `${hasInstantPot ? "Seal lid, set to high pressure for 15 minutes. Allow 10 minutes natural release." : "Cover and cook on low for 6-8 hours or high for 3-4 hours until tender and cooked through."}` },
      { heading: `Cook the rice separately (20 min)`, body: `While the main dish cooks, prepare rice according to package directions.` },
      { heading: `Add vegetables (${hasInstantPot ? "5 min" : "30 min before done"})`, body: `${hasInstantPot ? "Quick release, open lid, stir in vegetables. Set to sauté mode for 5 minutes." : "Add vegetables to the slow cooker 30 minutes before serving time."} Cook until tender.` },
      { heading: `Serve (no heat, 2 min)`, body: `Plate ${mainItem} and vegetables over rice.${isVeg ? "" : " Check internal temperature for safety."}` },
    ];
  }
  return STOVETOP_STEPS[proteinKey] || STOVETOP_STEPS.chicken;
}

function getTimingForRange(timeRange: string): { prep_minutes: number; cook_minutes: number; total_minutes: number } {
  const timings: Record<string, { prep_minutes: number; cook_minutes: number; total_minutes: number }> = {
    "15-25": { prep_minutes: 5, cook_minutes: 15, total_minutes: 20 },
    "20-30": { prep_minutes: 7, cook_minutes: 18, total_minutes: 25 },
    "25-40": { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
    "30-45": { prep_minutes: 10, cook_minutes: 25, total_minutes: 35 },
    "45-60": { prep_minutes: 15, cook_minutes: 35, total_minutes: 50 },
    "60-90": { prep_minutes: 20, cook_minutes: 50, total_minutes: 70 },
  };
  return timings[timeRange] || timings["25-40"];
}

function adjustMacrosForHealthiness(
  baseMacros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  healthiness: string
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  if (healthiness === "lean") {
    return {
      calories: Math.round(baseMacros.calories * 0.85),
      protein_g: baseMacros.protein_g + 5,
      carbs_g: Math.round(baseMacros.carbs_g * 0.8),
      fat_g: Math.round(baseMacros.fat_g * 0.7),
    };
  }
  if (healthiness === "comfort") {
    return {
      calories: Math.round(baseMacros.calories * 1.15),
      protein_g: baseMacros.protein_g,
      carbs_g: Math.round(baseMacros.carbs_g * 1.2),
      fat_g: Math.round(baseMacros.fat_g * 1.3),
    };
  }
  return baseMacros;
}

function getBudgetTips(budgetLevel: string): string[] {
  if (budgetLevel === "low") {
    return [
      "Buy protein in bulk and freeze portions.",
      "Frozen vegetables work just as well and cost less.",
      "Store-brand spices are just as good as name brands.",
    ];
  }
  if (budgetLevel === "splurge") {
    return [
      "Try organic or free-range protein for better flavor.",
      "Fresh herbs make a big difference — grab a bunch of each.",
    ];
  }
  return [];
}

const VEG_TITLE_DISPLAY: Record<string, string> = {
  chickpeas: "Chickpea",
  lentils: "Lentil",
  "black beans": "Black Bean",
  "kidney beans": "Kidney Bean",
  "white beans": "White Bean",
  quinoa: "Quinoa",
  tempeh: "Tempeh",
  eggs: "Egg",
  edamame: "Edamame",
  seitan: "Seitan",
  "greek yogurt": "Greek Yogurt",
  tofu: "Tofu",
};

const VEG_PROTEIN_PATTERN = /\b(Chickpea|Lentil|Black Bean|Kidney Bean|White Bean|Quinoa|Tempeh|Egg|Edamame|Seitan|Tofu|Three-Bean)\b/i;

function adaptVegTitle(archetypeTitle: string, vegBase: string): string {
  const display = VEG_TITLE_DISPLAY[vegBase];
  if (!display) return archetypeTitle;
  if (archetypeTitle.toLowerCase().includes(display.toLowerCase())) return archetypeTitle;
  const replaced = archetypeTitle.replace(VEG_PROTEIN_PATTERN, display);
  if (replaced !== archetypeTitle) return replaced;
  return archetypeTitle;
}

const NO_BASE_CARB_STRUCTURES = new Set(["soup-stew", "burger", "sandwich"]);
const STRUCTURE_DEFAULT_CARB: Record<string, string> = {
  "sheet-pan": "potatoes",
  "breakfast-for-dinner": "potato",
  "loaded-fries": "fries",
};

function resolveBaseCarb(archetype: FallbackArchetype, structureType?: StructureType): string {
  const struct = structureType || archetype.structure;
  if (NO_BASE_CARB_STRUCTURES.has(struct)) return "none";
  if (archetype.baseCarb && archetype.baseCarb !== "rice") return archetype.baseCarb;
  if (archetype.baseCarb === "rice") {
    if (NO_BASE_CARB_STRUCTURES.has(struct)) return "none";
    if (struct === "sheet-pan") return "potatoes";
    if (struct === "breakfast-for-dinner") return "potato";
  }
  if (STRUCTURE_DEFAULT_CARB[struct]) return STRUCTURE_DEFAULT_CARB[struct];
  return archetype.baseCarb || "";
}

export function buildFallbackRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string,
  structureType?: StructureType,
  recentSignatures?: string[]
): GenerateResponse {
  const protein = chosenProtein.toLowerCase();
  const isVegetarian = protein === "vegetarian";
  const isSeafood = protein === "seafood";
  const resolvedProtein = isSeafood ? "fish" : protein;
  const proteinKey = Object.keys(PROTEIN_INGREDIENTS).includes(resolvedProtein) ? resolvedProtein : "chicken";
  const finalProtein = isVegetarian ? "vegetarian" : pickProteinForAppliances(proteinKey, request.appliances || ["stove", "oven"]);
  const proteinDisplay = isVegetarian ? "Vegetarian" : isSeafood ? "Seafood" : finalProtein.charAt(0).toUpperCase() + finalProtein.slice(1);
  const budgetLevel = request.budget_level || "standard";
  const crewSize = request.crew_size || BASE_CREW;
  const scale = crewSize / BASE_CREW;
  const allergens = request.allergens_to_avoid || [];
  const healthiness = request.healthiness_preference || "balanced";
  const cuisineStyle = request.cuisine_style || "any";
  const timeRange = request.time_available || "25-40";
  const appliances = request.appliances || ["stove", "oven"];

  const vegSet = isVegetarian ? pickVegFallbackSet(allergens) : null;
  let rawIngredients = isVegetarian && vegSet
    ? [...vegSet.ingredients]
    : [...(PROTEIN_INGREDIENTS[finalProtein] || PROTEIN_INGREDIENTS.chicken)];
  let steps = isVegetarian && vegSet
    ? [...vegSet.steps]
    : getStepsForAppliances(finalProtein, appliances);

  const { ingredients: allergenSafeIngredients, steps: allergenSafeSteps, swapsMade } =
    applyAllergenSwaps(rawIngredients, steps, allergens);
  rawIngredients = allergenSafeIngredients;
  steps = allergenSafeSteps;

  const cuisineData = cuisineStyle !== "any" ? CUISINE_SEASONINGS[cuisineStyle] : null;
  if (cuisineData) {
    rawIngredients = [...rawIngredients, ...cuisineData.spices];
    const lastStepIdx = steps.length - 1;
    if (lastStepIdx >= 0) {
      const spiceNames = cuisineData.spices.map(s => s.item.split(",")[0].toLowerCase()).join(", ");
      steps = steps.map((s, i) => i === lastStepIdx
        ? { ...s, body: s.body + ` Finish with a sprinkle of ${spiceNames} for authentic ${cuisineStyle.replace("_", " ")} flavor.` }
        : s
      );
    }
  }

  const scaledIngredients = rawIngredients.map(i => scaleIngredient(i, scale));

  const timing = getTimingForRange(timeRange);

  const baseMacros = isVegetarian
    ? { calories: 420, protein_g: 32, carbs_g: 52, fat_g: 14 }
    : {
        calories: finalProtein === "fish" ? 420 : finalProtein === "chicken" ? 450 : 520,
        protein_g: finalProtein === "fish" ? 38 : finalProtein === "chicken" ? 42 : 40,
        carbs_g: finalProtein === "fish" ? 40 : 45,
        fat_g: finalProtein === "fish" ? 14 : finalProtein === "chicken" ? 12 : 18,
      };
  const macros = adjustMacrosForHealthiness(baseMacros, healthiness);

  const archetype = structureType
    ? pickFallbackArchetype(finalProtein, structureType, appliances, recentSignatures)
    : pickFallbackArchetype(finalProtein, "skillet", appliances, recentSignatures);
  const baseTitle = isVegetarian && vegSet
    ? adaptVegTitle(archetype.title, vegSet.base)
    : archetype.title;
  const title = cuisineData
    ? `${cuisineData.titlePrefix} ${baseTitle}`
    : baseTitle;

  const safety = PROTEIN_SAFETY[finalProtein] || PROTEIN_SAFETY.vegetarian;

  const allergenNote = swapsMade.length > 0
    ? ` Allergen swaps applied: ${swapsMade.join("; ")}.`
    : "";
  const whyItFits = isVegetarian && vegSet
    ? `Hearty vegetarian meal for ${crewSize} — ready in about ${timing.total_minutes} minutes with ${vegSet.whySnippet}. Packed with plant-based protein your crew will love.${allergenNote}`
    : isVegetarian
    ? `Hearty vegetarian meal for ${crewSize} — ready in about ${timing.total_minutes} minutes. Packed with plant-based protein your crew will love.${allergenNote}`
    : `Quick, reliable ${proteinDisplay.toLowerCase()} meal for ${crewSize} — ready in about ${timing.total_minutes} minutes with simple ingredients your crew will love.${allergenNote}`;

  const proTips: string[] = isVegetarian && vegSet
    ? vegSet.proTips
    : isVegetarian
    ? [
        "Drain and rinse canned beans to reduce sodium by up to 40%.",
        "Add a squeeze of lemon or lime at the end to brighten any vegetarian dish.",
      ]
    : [
        "Pat your protein dry before cooking — moisture prevents browning.",
        "Let meat rest after cooking so juices redistribute for a more flavourful result.",
      ];
  if (healthiness === "lean") {
    proTips.push("Swap butter for olive oil and reduce cheese portions to keep it lighter.");
  }

  let vegOption: { enabled: boolean; swap_protein: string; ingredients: { item: string; amount: string; notes: string }[]; steps: string[]; plating_notes: string } | undefined;
  if (request.vegetarian_swap_needed && !isVegetarian) {
    vegOption = {
      enabled: true,
      swap_protein: "Extra-firm tofu",
      ingredients: [
        { item: "Extra-firm tofu, pressed and cubed", amount: "1 block (14 oz)", notes: "Press for 10 minutes to remove moisture" },
        { item: "Olive oil", amount: "1 tbsp", notes: "" },
        { item: "Same seasonings as the main recipe", amount: "to taste", notes: "" },
      ],
      steps: [
        `Press tofu for 10 minutes between paper towels with a heavy pan on top.`,
        `Cut tofu into ¾-inch cubes.`,
        `Heat olive oil in a separate non-stick pan over medium-high heat.`,
        `Add tofu cubes in a single layer. Cook 3-4 minutes per side until golden and crispy on the outside.`,
        `Season with the same spices used for the ${proteinDisplay.toLowerCase()} and toss to coat.`,
      ],
      plating_notes: `Plate the tofu portion separately on the same sides (rice, vegetables). Label clearly so the vegetarian crew member can grab theirs easily.`,
    };
  }

  const hasStove = hasAppliance(appliances, "stove");
  const hasOvenAppliance = hasAppliance(appliances, "oven");
  const hasSlowCookerAppliance = hasAppliance(appliances, "slow cooker");
  const hasInstantPotAppliance = hasAppliance(appliances, "instant pot");
  const cookingMethod = hasInstantPotAppliance && !hasStove && !hasOvenAppliance ? "instant pot"
    : hasSlowCookerAppliance && !hasStove && !hasOvenAppliance ? "slow cooker"
    : hasOvenAppliance ? "oven + stovetop"
    : "stovetop";

  const logParts = [
    `protein: ${proteinDisplay}${vegSet ? ` (base: ${vegSet.base})` : ""}`,
    `crew: ${crewSize}`,
    `allergens: ${allergens.length ? allergens.join(",") : "none"}`,
    `swaps: ${swapsMade.length}`,
    `cuisine: ${cuisineStyle}`,
    `time: ${timeRange}`,
    `healthiness: ${healthiness}`,
    `budget: ${budgetLevel}`,
    `appliances: ${appliances.join(",")}`,
    `vegSwap: ${!!request.vegetarian_swap_needed}`,
  ];
  log(`Built fallback recipe: "${title}" (${logParts.join(" | ")})`, "fallback");

  const mealStyleLabel = structureType ? (STRUCTURE_DISPLAY[structureType] || structureType) : "Skillet";

  const primarySource = isVegetarian && vegSet
    ? vegSet.base
    : isSeafood ? "Seafood" : proteinDisplay;

  if (isVegetarian && vegSet) {
    commitVegBase(vegSet.base);
  }

  return {
    template_id: parseInt(template.template_id),
    chosen_protein: proteinDisplay,
    primary_protein_source: primarySource,
    title,
    meal_style: mealStyleLabel,
    why_it_fits_tonight: whyItFits,
    timing,
    protein_safety: [safety],
    ingredients: scaledIngredients,
    steps,
    cleanup_tip: "Line baking sheets with foil for easy cleanup. Soak the skillet with hot soapy water right after plating.",
    macros_per_serving: macros,
    budget_level: budgetLevel,
    budget_tips: getBudgetTips(budgetLevel),
    pro_tips: proTips,
    veg_option: vegOption,
    tags: {
      cuisine: cuisineData ? cuisineStyle.replace("_", " ") : "American",
      cooking_method: archetype.cookingMethod || cookingMethod,
      base_carb: resolveBaseCarb(archetype, structureType),
      key_ingredients: [proteinDisplay, resolveBaseCarb(archetype, structureType) === "none" ? "vegetables" : (resolveBaseCarb(archetype, structureType) || "vegetables"), "vegetables"],
      high_protein: true,
      high_fiber: healthiness === "lean",
      quick_cleanup: archetype.structure === "one-pot" || archetype.structure === "sheet-pan",
    },
    ingredients_used: [],
    extra_items_needed: [],
  } as GenerateResponse;
}
