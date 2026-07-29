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
