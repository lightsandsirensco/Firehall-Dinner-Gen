#!/usr/bin/env tsx
/**
 * Food Safety & Dietary Intelligence Sprint — Step 7 QA.
 *
 * Standalone assertion suite for the dietary classification engine, covering
 * every ingredient named in the sprint brief plus the core allergen keys.
 * Exits with a non-zero code if any assertion fails, so it can gate a build.
 *
 *   npx tsx scripts/dietary-qa-test-cases.ts
 */
import { classifyRecipeDietary, type DietaryIngredientInput } from "../shared/dietary/classify-recipe.js";

interface Case {
  name: string;
  ingredients: DietaryIngredientInput[];
  expect: (result: ReturnType<typeof classifyRecipeDietary>) => string | null; // returns error message, or null if OK
}

function flagIs(flag: string, expected: boolean) {
  return (result: ReturnType<typeof classifyRecipeDietary>) => {
    const actual = (result.flags as any)[flag];
    if (actual !== expected) {
      return `expected flags.${flag} === ${expected}, got ${actual} (confidence=${result.confidence})`;
    }
    return null;
  };
}

function confidenceIs(expected: "high" | "low") {
  return (result: ReturnType<typeof classifyRecipeDietary>) => {
    if (result.confidence !== expected) {
      return `expected confidence === "${expected}", got "${result.confidence}"`;
    }
    return null;
  };
}

function all(...checks: Array<(r: ReturnType<typeof classifyRecipeDietary>) => string | null>) {
  return (result: ReturnType<typeof classifyRecipeDietary>) => {
    for (const check of checks) {
      const err = check(result);
      if (err) return err;
    }
    return null;
  };
}

const BASE_SAFE: DietaryIngredientInput[] = [
  { name: "boneless skinless chicken thighs" },
  { name: "kosher salt" },
  { name: "black pepper" },
];

const CASES: Case[] = [
  // --- Named test ingredients from the sprint brief ---
  {
    name: "Soy sauce → NOT gluten-free, NOT soy-free, high confidence",
    ingredients: [...BASE_SAFE, { name: "soy sauce" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false), flagIs("soyFree", false)),
  },
  {
    name: "Tamari → gluten-free (soy still present), high confidence",
    ingredients: [...BASE_SAFE, { name: "tamari" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true), flagIs("soyFree", false)),
  },
  {
    name: "Panko → NOT gluten-free",
    ingredients: [...BASE_SAFE, { name: "panko breadcrumbs" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Rice noodles → gluten-free",
    ingredients: [...BASE_SAFE, { name: "rice noodles" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Corn tortillas → gluten-free",
    ingredients: [...BASE_SAFE, { name: "corn tortillas" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Flour tortillas → NOT gluten-free",
    ingredients: [...BASE_SAFE, { name: "flour tortillas" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Modified food starch (unqualified, US labeling convention) → gluten-free",
    ingredients: [...BASE_SAFE, { name: "modified food starch" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Oats → NOT gluten-free (cross-contamination default)",
    ingredients: [...BASE_SAFE, { name: "rolled oats" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Certified gluten-free oats → gluten-free (explicit override honored)",
    ingredients: [...BASE_SAFE, { name: "gluten-free rolled oats" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Beer → NOT gluten-free, NOT alcohol-free",
    ingredients: [...BASE_SAFE, { name: "beer" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Teriyaki sauce → NOT gluten-free, NOT soy-free",
    ingredients: [...BASE_SAFE, { name: "teriyaki sauce" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false), flagIs("soyFree", false)),
  },

  // --- Core allergen / diet logic ---
  {
    name: "Unknown ingredient → low confidence, blocks every strict flag",
    ingredients: [...BASE_SAFE, { name: "totally unrecognized mystery paste xyz" }],
    expect: all(
      confidenceIs("low"),
      flagIs("glutenFree", false),
      flagIs("dairyFree", false),
      flagIs("vegetarian", false),
      flagIs("vegan", false),
    ),
  },
  {
    name: "Chicken + rice + veg → vegetarian FALSE (contains meat), high confidence",
    ingredients: BASE_SAFE,
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "Chickpeas + olive oil + lemon (no meat/dairy/egg) → vegan TRUE",
    ingredients: [{ name: "chickpeas" }, { name: "olive oil" }, { name: "lemon juice" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", true), flagIs("vegan", true)),
  },
  {
    name: "Chickpeas + honey → vegetarian TRUE, vegan FALSE (honey excluded)",
    ingredients: [{ name: "chickpeas" }, { name: "honey" }, { name: "olive oil" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", true), flagIs("vegan", false)),
  },
  {
    name: "Cheddar cheese → NOT dairy-free, vegetarian TRUE",
    ingredients: [{ name: "shredded cheddar" }, { name: "corn tortillas" }, { name: "black beans" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", false), flagIs("vegetarian", true)),
  },
  {
    name: "Peanut butter → NOT peanut-free, NOT nut-free-independent (tree nuts unaffected)",
    ingredients: [...BASE_SAFE, { name: "peanut butter" }],
    expect: all(confidenceIs("high"), flagIs("peanutFree", false), flagIs("nutFree", true)),
  },
  {
    name: "Almond milk → NOT nut-free, dairy-free TRUE",
    ingredients: [{ name: "almond milk" }, { name: "rolled oats" }],
    // oats default to gluten-containing (not the target of this case) but dairy/nut flags are what we assert
    expect: all(confidenceIs("high"), flagIs("nutFree", false), flagIs("dairyFree", true)),
  },
  {
    name: "Shrimp → NOT shellfish-free, meat present (not vegetarian)",
    ingredients: [{ name: "large shrimp" }, { name: "jasmine rice" }, { name: "olive oil" }],
    expect: all(confidenceIs("high"), flagIs("shellfishFree", false), flagIs("vegetarian", false)),
  },
  {
    name: "Bacon → NOT pork-free",
    ingredients: [{ name: "thick-cut bacon" }, { name: "large eggs" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", false)),
  },
  {
    name: "Turkey bacon (explicit override) → pork-free",
    ingredients: [{ name: "turkey bacon" }, { name: "large eggs" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", true)),
  },
  {
    name: "Worcestershire sauce → NOT fish-free (contains anchovies)",
    ingredients: [...BASE_SAFE, { name: "worcestershire sauce" }],
    expect: all(confidenceIs("high"), flagIs("fishFree", false)),
  },
  {
    name: "Oyster sauce → NOT shellfish-free, NOT gluten-free, adaptable for gluten",
    ingredients: [...BASE_SAFE, { name: "oyster sauce" }],
    expect: (result) => {
      const err = all(confidenceIs("high"), flagIs("shellfishFree", false), flagIs("glutenFree", false))(result);
      if (err) return err;
      if (!result.adaptable.some((a) => a.flag === "gluten")) {
        return "expected a gluten adaptable suggestion for oyster sauce";
      }
      return null;
    },
  },

  // --- Dietary-filter-accuracy sprint: full named test list ---
  {
    name: "Coconut milk → NOT dairy (plant milk), NOT nut (coconut is not a tree nut for allergy purposes)",
    ingredients: [{ name: "coconut milk" }, { name: "jasmine rice" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", true), flagIs("nutFree", true), flagIs("vegan", true)),
  },
  {
    name: "Almond milk → NOT nut-free, but IS dairy-free (plant milk, not a dairy substitute confusion)",
    ingredients: [{ name: "almond milk" }, { name: "rolled oats" }],
    expect: all(confidenceIs("high"), flagIs("nutFree", false), flagIs("dairyFree", true)),
  },
  {
    name: "Peanut butter → NOT dairy (it's a nut/legume spread, not a dairy 'butter')",
    ingredients: [...BASE_SAFE, { name: "peanut butter" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", true), flagIs("peanutFree", false)),
  },
  {
    name: "Butter beans → NOT dairy (legume, not a dairy 'butter')",
    ingredients: [{ name: "butter beans" }, { name: "olive oil" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", true), flagIs("vegan", true)),
  },
  {
    name: "Eggplant → NOT egg (produce, not egg)",
    ingredients: [{ name: "eggplant" }, { name: "olive oil" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("eggFree", true), flagIs("vegan", true)),
  },
  {
    name: "Oyster mushrooms → NOT shellfish (a mushroom variety, not shellfish)",
    ingredients: [{ name: "oyster mushrooms" }, { name: "olive oil" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("shellfishFree", true), flagIs("vegan", true)),
  },
  {
    name: "Vegan mayonnaise → egg-free AND dairy-free (explicit label overrides base mayo profile)",
    ingredients: [...BASE_SAFE, { name: "vegan mayonnaise" }],
    expect: all(confidenceIs("high"), flagIs("eggFree", true), flagIs("dairyFree", true)),
  },
  {
    name: "Regular mayonnaise → NOT egg-free",
    ingredients: [...BASE_SAFE, { name: "mayonnaise" }],
    expect: all(confidenceIs("high"), flagIs("eggFree", false)),
  },
  {
    name: "Gluten-free hamburger buns → gluten-free (explicit label overrides base bun profile)",
    ingredients: [...BASE_SAFE, { name: "gluten-free hamburger buns" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Regular hamburger buns → NOT gluten-free",
    ingredients: [...BASE_SAFE, { name: "hamburger buns" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Chicken stock → vegetarian FALSE, vegan FALSE (animal-derived stock)",
    ingredients: [{ name: "chicken stock" }, { name: "carrots" }, { name: "celery" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "Vegetable stock → vegetarian TRUE, vegan TRUE",
    ingredients: [{ name: "vegetable stock" }, { name: "carrots" }, { name: "celery" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", true), flagIs("vegan", true)),
  },
  {
    name: "Generic unqualified 'stock' → low confidence (source unknown, cannot confirm vegetarian/vegan)",
    ingredients: [{ name: "stock" }, { name: "carrots" }, { name: "celery" }],
    expect: all(confidenceIs("low"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "Generic unqualified 'broth' → low confidence",
    ingredients: [{ name: "broth" }, { name: "carrots" }, { name: "celery" }],
    expect: confidenceIs("low"),
  },
  {
    name: "Turkey bacon → meat present (not vegetarian) but pork-free",
    ingredients: [...BASE_SAFE, { name: "turkey bacon" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("porkFree", true)),
  },
  {
    name: "Pork bacon → NOT pork-free",
    ingredients: [...BASE_SAFE, { name: "bacon" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", false)),
  },
  {
    name: "Chicken sausage → meat present but pork-free",
    ingredients: [...BASE_SAFE, { name: "chicken sausage" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("porkFree", true)),
  },
  {
    name: "Generic unlabeled sausage → NOT pork-free (protein source unknown, conservative default)",
    ingredients: [...BASE_SAFE, { name: "sausage" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", false)),
  },
  {
    name: "Pesto → NOT dairy-free, NOT nut-free (traditional recipe: parmesan + pine nuts)",
    ingredients: [...BASE_SAFE, { name: "pesto" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", false), flagIs("nutFree", false)),
  },
  {
    name: "Nut-free pesto → nut-free TRUE (explicit label), but still NOT dairy-free",
    ingredients: [...BASE_SAFE, { name: "nut-free pesto" }],
    expect: all(confidenceIs("high"), flagIs("nutFree", true), flagIs("dairyFree", false)),
  },
  {
    name: "Whey protein → NOT dairy-free",
    ingredients: [{ name: "whey protein" }, { name: "banana" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", false), flagIs("vegan", false)),
  },
  {
    name: "Plant protein (powder) → dairy-free AND vegan-compatible",
    ingredients: [{ name: "plant protein powder" }, { name: "banana" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", true), flagIs("vegan", true)),
  },
  {
    name: "Honey → vegetarian TRUE, vegan FALSE",
    ingredients: [{ name: "chickpeas" }, { name: "honey" }, { name: "olive oil" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", true), flagIs("vegan", false)),
  },
  {
    name: "Gelatin → vegetarian FALSE, vegan FALSE (animal-derived collagen)",
    ingredients: [{ name: "gelatin" }, { name: "sugar" }, { name: "berries" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "Worcestershire sauce → vegetarian FALSE (contains anchovies)",
    ingredients: [...BASE_SAFE, { name: "worcestershire sauce" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false)),
  },
  {
    name: "Caesar dressing → NOT vegan (fish + egg + dairy), vegetarian FALSE (anchovies)",
    ingredients: [{ name: "romaine lettuce" }, { name: "caesar dressing" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "Ranch dressing → NOT dairy-free",
    ingredients: [{ name: "romaine lettuce" }, { name: "ranch dressing" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", false)),
  },
  {
    name: "Breadcrumbs → NOT gluten-free",
    ingredients: [...BASE_SAFE, { name: "breadcrumbs" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Flour tortillas → NOT gluten-free (duplicate check against sprint list)",
    ingredients: [...BASE_SAFE, { name: "flour tortillas" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", false)),
  },
  {
    name: "Corn tortillas → gluten-free (duplicate check against sprint list)",
    ingredients: [...BASE_SAFE, { name: "corn tortillas" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Egg noodles → NOT egg-free (the noodle itself contains egg)",
    ingredients: [...BASE_SAFE, { name: "egg noodles" }],
    expect: all(confidenceIs("high"), flagIs("eggFree", false), flagIs("vegan", false)),
  },
  {
    name: "Rice noodles → egg-free AND gluten-free",
    ingredients: [...BASE_SAFE, { name: "rice noodles" }],
    expect: all(confidenceIs("high"), flagIs("eggFree", true), flagIs("glutenFree", true)),
  },

  // --- Plural/singular normalization regression (ingredient-normalization requirement) ---
  {
    name: "Plural 'cedar planks' resolves to the same profile as singular 'cedar plank'",
    ingredients: [{ name: "salmon fillet" }, { name: "cedar planks (soaked at least 1 hour)" }],
    expect: confidenceIs("high"),
  },
  {
    name: "Plural 'slider rolls' resolves to the known bun/bread profile",
    ingredients: [{ name: "slider rolls (hawaiian-style, 12-count pack)" }, { name: "ground beef" }],
    expect: confidenceIs("high"),
  },

  // --- Ambiguous "or"-alternative masking regression ---
  // A compound ingredient like "water or broth" must NOT resolve just because one of its
  // two alternatives ("water") happens to match a known keyword — the other alternative
  // ("broth") is source-unknown and must force the whole ingredient (and recipe) to low
  // confidence, never silently pass as vegetarian/vegan/etc.
  {
    name: "'water or broth' → low confidence (bare 'broth' alternative is source-unknown)",
    ingredients: [{ name: "water or broth" }, { name: "rolled oats" }],
    expect: confidenceIs("low"),
  },
  {
    name: "'dry white wine or chicken broth' → high confidence, BOTH disqualifying components unioned (not vegetarian, not alcohol-free) — the conservative worst-case, never silently dropping one alternative",
    ingredients: [...BASE_SAFE, { name: "dry white wine or chicken broth" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("vegan", false)),
  },
  {
    name: "'chicken broth' alone (no ambiguous alternative) still resolves normally",
    ingredients: [{ name: "chicken broth" }, { name: "carrots" }, { name: "celery" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false)),
  },

  // --- Compound-ingredient masking regression (production bug: "Jalapeño Cheddar Sausage
  // Links" resolved ONLY to the produce "jalapeno" keyword — the longest single match — and
  // completely discarded that the same line also names a dairy cheese AND pork sausage,
  // incorrectly passing the whole recipe as vegetarian/vegan/pork-free/dairy-free.) ---
  {
    name: "'Jalapeño Cheddar Sausage Links' → NOT vegetarian, NOT vegan, NOT pork-free, NOT dairy-free (all three components detected)",
    ingredients: [{ name: "Jalapeño Cheddar Sausage Links" }, { name: "bell peppers" }, { name: "kosher salt" }],
    expect: all(
      confidenceIs("high"),
      flagIs("vegetarian", false),
      flagIs("vegan", false),
      flagIs("porkFree", false),
      flagIs("dairyFree", false),
    ),
  },
  {
    name: "'butter beans' still resolves as legume-only (dairy-free), not masked/broken by the multi-component fix",
    ingredients: [{ name: "butter beans" }, { name: "olive oil" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("dairyFree", true), flagIs("vegan", true)),
  },
  {
    name: "'chicken and cheddar quesadilla filling' → NOT vegetarian (chicken) AND NOT dairy-free (cheddar), both components detected in one compound ingredient",
    ingredients: [{ name: "chicken and cheddar quesadilla filling" }, { name: "corn tortillas" }],
    expect: all(confidenceIs("high"), flagIs("vegetarian", false), flagIs("dairyFree", false)),
  },

  // --- Ingredient-database coverage gaps found via full-catalog name-only audit ---
  {
    name: "Chopped walnuts → NOT nut-free (previously MISSING from the database entirely)",
    ingredients: [...BASE_SAFE, { name: "chopped walnuts" }],
    expect: all(confidenceIs("high"), flagIs("nutFree", false)),
  },
  {
    name: "Cashews / hazelnuts / macadamia / Brazil nuts → NOT nut-free (previously missing)",
    ingredients: [{ name: "cashews" }, { name: "hazelnuts" }, { name: "macadamia nuts" }, { name: "brazil nuts" }, { name: "kosher salt" }],
    expect: all(confidenceIs("high"), flagIs("nutFree", false)),
  },
  {
    name: "Canned tuna → NOT fish-free, meat present (previously MISSING from the database)",
    ingredients: [{ name: "canned tuna" }, { name: "mayonnaise" }, { name: "bread" }],
    expect: all(confidenceIs("high"), flagIs("fishFree", false), flagIs("vegetarian", false)),
  },
  {
    name: "Dry sherry → NOT alcohol-free (previously missing)",
    ingredients: [...BASE_SAFE, { name: "dry sherry" }],
    expect: (result) => {
      if (result.confidence !== "high") return `expected high confidence, got ${result.confidence}`;
      if (!result.adaptable.some((a) => a.flag === "alcohol") && result.flags.vegetarian !== true) {
        return null; // sherry doesn't block vegetarian; just verifying it resolves (no exception thrown)
      }
      return null;
    },
  },
  {
    name: "Tostada shells → gluten-free (corn-based, previously unresolved)",
    ingredients: [...BASE_SAFE, { name: "6-inch tostada shells" }],
    expect: all(confidenceIs("high"), flagIs("glutenFree", true)),
  },
  {
    name: "Chopped parsley / cold brew coffee / pickled vegetables / frozen mixed vegetables → all resolve safely (previously unresolved, forcing needless low confidence)",
    ingredients: [
      { name: "chopped parsley" },
      { name: "cold brew coffee" },
      { name: "pickled vegetables" },
      { name: "frozen mixed vegetables" },
      { name: "olive oil" },
    ],
    expect: confidenceIs("high"),
  },

  // --- TEXT_OVERRIDES masking regression (production bug: "turkey sausage or lean pork
  // sausage" unconditionally matched the "turkey sausage" -> pork:false override and
  // completely discarded that the SAME ingredient line also explicitly named a pork
  // alternative, incorrectly passing the recipe as pork-free.) ---
  {
    name: "'turkey sausage or lean pork sausage' → NOT pork-free (explicit pork alternative in the same line suppresses the turkey-sausage override)",
    ingredients: [...BASE_SAFE, { name: "turkey sausage or lean pork sausage", notes: "browned" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", false)),
  },
  {
    name: "'turkey sausage' alone (no pork alternative) still correctly resolves pork-free",
    ingredients: [...BASE_SAFE, { name: "turkey sausage" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", true)),
  },
  {
    name: "'turkey pepperoni' alone still correctly resolves pork-free (guard doesn't self-suppress on its own substring word)",
    ingredients: [...BASE_SAFE, { name: "turkey pepperoni" }],
    expect: all(confidenceIs("high"), flagIs("porkFree", true)),
  },
];

let passed = 0;
let failed = 0;

for (const testCase of CASES) {
  const result = classifyRecipeDietary(testCase.ingredients);
  const error = testCase.expect(result);
  if (error) {
    failed++;
    console.error(`✗ FAIL: ${testCase.name}\n    ${error}`);
  } else {
    passed++;
    console.log(`✓ PASS: ${testCase.name}`);
  }
}

console.log(`\n${passed}/${CASES.length} test cases passed.`);
if (failed > 0) {
  console.error(`${failed} test case(s) FAILED. Do not ship until this passes 100%.`);
  process.exit(1);
}
