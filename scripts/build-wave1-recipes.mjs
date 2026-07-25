/**
 * One-shot generator for Wave 1 hall-expansion recipes.
 * Run: node scripts/build-wave1-recipes.mjs
 */
import fs from "node:fs";
import path from "node:path";

function stepLine(n, s, proteinLabel) {
  if (s === "CALL") return `      CALL_INTERRUPTION_STEP(${n}, ${JSON.stringify(proteinLabel)}),`;
  if (s === "LEFT") return `      LEFTOVERS_PACK_DOWN_STEP(${n}, ${JSON.stringify(proteinLabel)}),`;
  const opts = [];
  if (s.m != null) opts.push(`minutes: ${s.m}`);
  if (s.h) opts.push(`heatLevel: ${JSON.stringify(s.h)}`);
  if (s.t) opts.push(`tempF: ${s.t}`);
  const optStr = opts.length ? `, { ${opts.join(", ")} }` : "";
  return `      step(${n}, ${JSON.stringify(s.title)}, ${JSON.stringify(s.inst)}${optStr}),`;
}

function ingLine([name, qty, opts]) {
  if (!opts) return `      ing(${JSON.stringify(name)}, ${JSON.stringify(qty)}),`;
  const body = Object.entries(opts)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join(", ");
  return `      ing(${JSON.stringify(name)}, ${JSON.stringify(qty)}, { ${body} }),`;
}

function emit(r) {
  const steps = r.steps.map((s, i) => stepLine(i + 1, s, r.proteinLabel)).join("\n");
  const ings = r.ings.map(ingLine).join("\n");
  return `  def({
    slug: ${JSON.stringify(r.slug)},
    title: ${JSON.stringify(r.title)},
    subtitle: ${JSON.stringify(r.subtitle)},
    category: ${JSON.stringify(r.category)},
    protein: ${JSON.stringify(r.protein)},
    cuisine: ${JSON.stringify(r.cuisine)},
    mealFormat: ${JSON.stringify(r.mealFormat)},
    explorePools: ${JSON.stringify(r.pools)},
    hookLine: ${JSON.stringify(r.hook)},
    description: ${JSON.stringify(r.description)},
    whyCrewsLikeIt: ${JSON.stringify(r.why)},
    mealPrepNotes: ${JSON.stringify(r.prepNotes)},
    stationWorkflow: ${JSON.stringify(r.workflow)},
    prepMinutes: ${r.prep},
    cookMinutes: ${r.cook},
    difficulty: ${JSON.stringify(r.difficulty)},
    crewSizeDefault: 10,
    ingredients: [
${ings}
    ],
    steps: [
${steps}
    ],
    proTips: ${JSON.stringify(r.tips)},
    tonightSpread: buildStructuredTonightSpread(${JSON.stringify(r.spreadMain)}, ${JSON.stringify(r.sides)}, ${JSON.stringify(r.conds)}),
    leftovers: standardLeftovers(${JSON.stringify(r.proteinLabel)}, ${JSON.stringify(r.leftoverExtra)}),
    equipment: ${JSON.stringify(r.equipment)},
    nutrition: ${JSON.stringify(r.nutrition)},
    spiceLevel: ${JSON.stringify(r.spice)},
    cleanupDifficulty: ${JSON.stringify(r.cleanup)},
    searchTerms: ${JSON.stringify(r.search)},
    substitutions: ${JSON.stringify(r.subs)},
  })`;
}

/** @type {any[]} */
const recipes = [];

function add(r) {
  recipes.push(r);
}

// ---------------------------------------------------------------------------
// BOWLS
// ---------------------------------------------------------------------------
add({
  slug: "turkey-taco-bowls",
  title: "Turkey Taco Bowls",
  subtitle: "Lean seasoned turkey, cilantro-lime rice, and a full taco topping bar",
  category: "crew_feeders",
  protein: "turkey",
  cuisine: "mexican",
  mealFormat: "bowl",
  pools: ["bowl", "turkey", "healthy", "budget", "hall_expansion"],
  hook: "Taco-night energy with lean turkey that still browns hard and feeds ten.",
  description:
    "Seasoned ground turkey over cilantro-lime rice with black beans, corn, lettuce, pico, cheddar, sour cream, and crunchy tortilla strips.",
  why: "Turkey keeps the grocery bill and grease down without tasting like diet food when you brown it hot and season it properly.",
  prepNotes:
    "Make-ahead: brown turkey and cook rice up to one day early. Storage: cool turkey, rice, beans, and cold toppings separately for 3 days. Reheating: cover turkey and rice with a splash of water or stock and heat to 165°F, then rebuild with cold toppings.",
  workflow: [
    "Start rice before browning turkey.",
    "Hold turkey, beans, and corn covered at 140°F or above.",
    "Keep dairy cold until the final pass.",
  ],
  prep: 15,
  cook: 25,
  difficulty: "easy",
  proteinLabel: "seasoned ground turkey",
  ings: [
    ["ground turkey", "3.5", { unit: "lb", group: "Protein" }],
    ["taco seasoning", "4", { unit: "tbsp", group: "Seasoning" }],
    ["long-grain rice", "3", { unit: "cups", notes: "uncooked", group: "Base" }],
    ["lime juice", "0.25", { unit: "cup", group: "Base" }],
    ["cilantro", "0.5", { unit: "cup", notes: "chopped", group: "Base" }],
    ["black beans", "2", { unit: "cans", group: "Hot bar" }],
    ["corn", "3", { unit: "cups", group: "Hot bar" }],
    ["shredded lettuce", "6", { unit: "cups", group: "Cold bar" }],
    ["pico de gallo", "3", { unit: "cups", group: "Cold bar" }],
    ["cheddar cheese", "3", { unit: "cups", group: "Cold bar" }],
    ["sour cream", "2", { unit: "cups", group: "Cold bar" }],
    ["tortilla strips", "3", { unit: "cups", group: "Finish" }],
  ],
  steps: [
    {
      title: "Stage the turkey taco mise",
      inst: "Drain beans, chop cilantro, and set lettuce, cheese, sour cream, pico, and strips in separate pans. Keep dairy over ice. Measure taco seasoning and lime now so you are not hunting for them while turkey is browning.",
      m: 15,
    },
    {
      title: "Steam cilantro-lime rice",
      inst: "Rinse rice until the water runs mostly clear. Boil with 5 1/2 cups salted water, cover, and cook on low 18 minutes without lifting the lid. Rest 10 minutes, fluff, then fold in lime and cilantro. Peeking mid-cook leaves crunchy cores.",
      m: 28,
      h: "low",
    },
    {
      title: "Heat the skillet for turkey",
      inst: "Break turkey into loose pieces and keep 1/2 cup water ready beside the seasoning. Heat a 14-inch skillet over medium-high until oil shimmers. Starting turkey in a cool pan leaves it gray and watery.",
      m: 5,
      h: "medium-high",
    },
    {
      title: "Brown the turkey hard",
      inst: "Add turkey, leave it untouched 90 seconds, then crumble and cook 8–10 minutes until browned with no pink. Drain pooled liquid, stir in seasoning and water, and simmer 3 minutes until coated. Confirm 165°F.",
      m: 12,
      h: "medium-high",
    },
    {
      title: "Warm beans and toast corn",
      inst: "Warm drained beans with a splash of water over medium-low. Toast corn in a dry skillet 4–5 minutes until a few kernels brown. Keep them separate so bean liquid does not steam the corn soft.",
      m: 8,
      h: "medium",
    },
    {
      title: "Set cold taco sauces",
      inst: "Loosen sour cream with a squeeze of lime. Hold pico drained so it does not flood the rice. Keep strips in a dry container until the last second.",
      m: 5,
    },
    {
      title: "Hold hot turkey components",
      inst: "Move rice, turkey, beans, and corn into covered hotel pans above 140°F in a 200°F oven. Taste turkey with rice and adjust salt or lime before service.",
      m: 5,
      h: "low",
      t: 200,
    },
    {
      title: "Scoop turkey taco bowls",
      inst: "Scoop rice first, then turkey, beans, and corn. Add lettuce on the cool side of the bowl so heat does not wilt it into slime.",
      m: 8,
    },
    {
      title: "Finish with crunch and dairy",
      inst: "Add pico, cheddar, sour cream, and tortilla strips last. Put hot sauce at the end of the line for heat seekers.",
      m: 5,
    },
    {
      title: "Send the turkey taco line",
      inst: "Pass bowls with lime wedges and keep covered turkey and rice for late returns. Refill pico in small amounts so water does not pool on the table.",
      m: 5,
    },
    "CALL",
    "LEFT",
  ],
  tips: [
    "Prep tip: Turkey releases more water than beef — drain before seasoning.",
    "Rookie tip: Do not crowd the skillet or the turkey steams gray.",
    "Use a #8 scoop for rice so portions stay even.",
  ],
  spreadMain: "Turkey taco bowls",
  sides: ["Tortilla chips", "lime wedges"],
  conds: ["Sour cream", "hot sauce"],
  leftoverExtra: ["Turn leftover turkey into next-shift quesadillas or nachos."],
  equipment: ["Large skillet", "Rice pot", "Hotel pans", "Instant-read thermometer"],
  nutrition: { calories: 580, protein: 42, carbs: 60, fats: 18, fiber: 11 },
  spice: "mild",
  cleanup: "easy",
  search: ["turkey taco bowls", "ground turkey firehall dinner", "healthy taco bowls", "crew turkey dinner"],
  subs: ["Use ground chicken for turkey.", "Use cauliflower rice.", "Swap pinto beans for black beans."],
});

// Continue loading remaining recipes from companion JSON built inline below
const extraPath = path.join(process.cwd(), "scripts", "wave1-recipe-data.json");
if (!fs.existsSync(extraPath)) {
  console.error("Missing scripts/wave1-recipe-data.json — write companion data first");
  process.exit(1);
}
const extra = JSON.parse(fs.readFileSync(extraPath, "utf8"));
for (const r of extra) add(r);

const header = `import type { ExpansionRecipeDef } from "../types.js";
import { def, ing, step } from "../recipe-build.js";
import {
  CALL_INTERRUPTION_STEP,
  LEFTOVERS_PACK_DOWN_STEP,
  buildStructuredTonightSpread,
  standardLeftovers,
} from "../../golden-100/recipe-quality/classics-wheel-editorial.js";

/** Wave 1 expansion — bowls, slow cooker, BBQ, budget, one-pot. */
export const BATCH_WAVE1_EXPANSION_RECIPES: ExpansionRecipeDef[] = [
`;

const body = recipes.map(emit).join(",\n");
const footer = `
];

export const BATCH_WAVE1_EXPANSION_COUNT = BATCH_WAVE1_EXPANSION_RECIPES.length;
`;

const out = path.join(process.cwd(), "shared/hall-expansion/adapted/batch-wave1-expansion.ts");
fs.writeFileSync(out, header + body + footer);
console.log(`[wave1] wrote ${recipes.length} recipes → ${out}`);
