/**
 * Deterministic pizza templates — always-available fallback when AI fails or is unconfigured.
 */

import type { PizzaRequest, PizzaResponse, IngredientItem, RecipeStep } from "../shared/schema.js";
import { PIZZA_CONCEPT_IDS, getPizzaConceptMeta } from "../shared/pizza-concepts.js";
import {
  EXTENDED_PIZZA_TEMPLATES,
  metaAwareGenericTemplate,
} from "./pizza-templates-extended.js";
import { buildPizzaInstructionSteps } from "./pizza-instructions.js";
import { resolvePizzaRecommendedSides } from "./pizza-sides.js";

export { PIZZA_CONCEPT_IDS };
export type PizzaConceptId = (typeof PIZZA_CONCEPT_IDS)[number];

interface PizzaTemplateDef {
  title: string;
  dough_type: string;
  why_this_works: string;
  sauce: IngredientItem[];
  cheese: IngredientItem[];
  toppings: IngredientItem[];
  drizzles: IngredientItem[];
  build_steps: RecipeStep[];
  protein_safety?: PizzaResponse["protein_safety"];
  prep_minutes?: number;
  bake_minutes?: number;
}

function ing(item: string, amount: string, notes = ""): IngredientItem {
  return { item, amount, notes };
}

function step(heading: string, body: string): RecipeStep {
  return { heading, body };
}

function pizzaCountLabel(crewSize: number): string {
  if (crewSize <= 4) return "2–3 large pizzas";
  if (crewSize <= 6) return "3–4 large pizzas";
  if (crewSize <= 8) return "4–5 large pizzas";
  if (crewSize <= 10) return "5–6 large pizzas";
  return `${Math.ceil(crewSize / 2)} large pizzas`;
}

function scaleAmount(amount: string, crewSize: number): string {
  const mult = crewSize <= 4 ? 1 : crewSize <= 6 ? 1.25 : crewSize <= 10 ? 1.5 : 2;
  if (mult <= 1.05) return amount;
  const m = amount.match(/^([\d./\s]+)\s*(.*)$/);
  if (!m) return amount;
  const num = parseFloat(m[1].replace(/\s/g, ""));
  if (!Number.isFinite(num)) return amount;
  const scaled = Math.round(num * mult * 10) / 10;
  return `${scaled} ${m[2].trim()}`.trim();
}

function scaleIngredients(items: IngredientItem[], crewSize: number): IngredientItem[] {
  return items.map((i) => ({ ...i, amount: scaleAmount(i.amount, crewSize) }));
}

const TEMPLATES: Record<string, PizzaTemplateDef> = {
  buffalo_chicken: {
    title: "Buffalo Chicken Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works:
      "Game-night classic — tangy buffalo, melty mozzarella, and ranch cool-down. Crew scales fast on sheet pans.",
    sauce: [ing("Buffalo wing sauce", "1 cup"), ing("Ranch dressing (for base swirl)", "½ cup")],
    cheese: [ing("Shredded mozzarella", "4 cups"), ing("Crumbled blue cheese (optional)", "½ cup")],
    toppings: [
      ing("Cooked chicken breast, diced", "2 lbs"),
      ing("Red onion, thinly sliced", "1 large"),
      ing("Green onion, sliced", "4 stalks"),
    ],
    drizzles: [ing("Ranch drizzle", "½ cup"), ing("Extra buffalo sauce", "¼ cup")],
    build_steps: [
      step(
        "Prep the station (no heat, 12 min)",
        "Bring dough to room temp. Dice chicken, slice onions, and line sheet pans with parchment. Read all steps once — pizza moves fast once the oven is hot.",
      ),
      step(
        "Preheat oven (475°F, 15 min)",
        "Preheat to 475°F with racks in upper-middle positions. If using a stone, heat it inside the oven for at least 20 minutes.",
      ),
      step(
        "Stretch dough (room temp, 8 min)",
        "Oil hands lightly. Press each dough ball flat, then stretch to 12–14 inch rounds. Fix tears by pinching closed. Don't overwork or the crust gets tough.",
      ),
      step(
        "Sauce and cheese (no heat, 5 min)",
        "Spread a thin layer of buffalo sauce, leaving a ½-inch border. Add mozzarella evenly — you should still see some sauce through the cheese.",
      ),
      step(
        "Top and bake (475°F, 12–15 min)",
        "Scatter chicken and red onion. Bake until crust is golden and cheese bubbles with light brown spots. Rotate pans halfway for even color.",
      ),
      step(
        "Finish and serve (no heat, 3 min)",
        "Drizzle ranch and extra buffalo if desired. Top with green onion. Rest 2 minutes, slice, and hit the hall line while hot.",
      ),
    ],
    protein_safety: [
      {
        protein: "Chicken",
        target_temp_f: 165,
        target_temp_c: 74,
        rest_minutes: 0,
        probe_where: "Thickest piece of diced chicken",
        notes: "Use pre-cooked chicken reheated to 165°F, or cook raw chicken fully before topping.",
      },
    ],
  },
  bbq_chicken: {
    title: "BBQ Chicken Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Sweet-smoky BBQ, juicy chicken, and melted mozzarella — a hall favorite that never lasts long.",
    sauce: [ing("BBQ sauce", "1¼ cups")],
    cheese: [ing("Shredded mozzarella", "4 cups"), ing("Smoked gouda (optional)", "1 cup")],
    toppings: [
      ing("Cooked chicken breast, diced", "2 lbs"),
      ing("Red onion, thinly sliced", "1 large"),
      ing("Fresh cilantro (optional)", "1 bunch"),
    ],
    drizzles: [ing("Extra BBQ sauce", "¼ cup")],
    build_steps: [
      step("Prep (no heat, 12 min)", "Room-temp dough, dice chicken, slice onion. Preheat oven to 475°F."),
      step("Stretch dough (8 min)", "Stretch to 12–14 inch rounds on parchment-lined pans."),
      step("Sauce and cheese (5 min)", "Spread BBQ sauce thinly; add mozzarella (and gouda if using)."),
      step("Top and bake (475°F, 12–15 min)", "Add chicken and red onion. Bake until crust is crisp and cheese is bubbly."),
      step("Serve (2 min)", "Optional cilantro after bake. Slice and serve immediately."),
    ],
    protein_safety: [
      {
        protein: "Chicken",
        target_temp_f: 165,
        target_temp_c: 74,
        rest_minutes: 0,
        probe_where: "Thickest piece",
        notes: "Chicken must reach 165°F before topping or use fully cooked chicken.",
      },
    ],
  },
  supreme_classic: {
    title: "Supreme Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Loaded hall supreme — pepperoni, sausage, peppers, mushrooms, and onions on every slice.",
    sauce: [ing("Pizza sauce", "1¼ cups")],
    cheese: [ing("Shredded mozzarella", "4 cups")],
    toppings: [
      ing("Pepperoni slices", "6 oz"),
      ing("Italian sausage, cooked and crumbled", "1½ lbs"),
      ing("Bell peppers, diced", "2 medium"),
      ing("Mushrooms, sliced", "8 oz"),
      ing("Red onion, thinly sliced", "1 medium"),
    ],
    drizzles: [ing("Olive oil drizzle", "2 tbsp"), ing("Dried oregano", "1 tsp")],
    build_steps: [
      step("Prep (no heat, 15 min)", "Cook and crumble sausage. Slice veggies. Preheat oven to 475°F."),
      step("Stretch dough (8 min)", "Stretch rounds; don't tear — patch holes."),
      step("Build (5 min)", "Sauce, mozzarella, then meats and vegetables evenly."),
      step("Bake (475°F, 14–16 min)", "Bake until crust is golden and sausage/pepperoni edges crisp slightly."),
      step("Serve", "Rest 2 min, slice into hall portions."),
    ],
    protein_safety: [
      {
        protein: "Sausage",
        target_temp_f: 160,
        target_temp_c: 71,
        rest_minutes: 0,
        probe_where: "Center of crumbles",
        notes: "Sausage must be fully cooked before topping.",
      },
    ],
  },
  meat_lovers: {
    title: "Meat Lovers Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Maximum protein for hungry crews — pepperoni, sausage, bacon, and ham.",
    sauce: [ing("Pizza sauce", "1¼ cups")],
    cheese: [ing("Shredded mozzarella", "5 cups"), ing("Parmesan, grated", "½ cup")],
    toppings: [
      ing("Pepperoni", "8 oz"),
      ing("Italian sausage, cooked", "1½ lbs"),
      ing("Bacon, cooked and chopped", "12 slices"),
      ing("Deli ham, diced", "½ lb"),
    ],
    drizzles: [],
    build_steps: [
      step("Prep meats (medium, 15 min)", "Cook sausage and bacon until crisp. Drain fat. Preheat oven 475°F."),
      step("Stretch and sauce (10 min)", "Stretch dough; sauce and cheese first."),
      step("Load toppings (5 min)", "Layer meats evenly — avoid clumps so pizza bakes through."),
      step("Bake (475°F, 14–18 min)", "Bake until cheese is deeply golden and crust sounds hollow when tapped."),
      step("Serve", "Let rest 3 min so toppings set; slice and serve."),
    ],
    protein_safety: [
      {
        protein: "Pork/beef",
        target_temp_f: 160,
        target_temp_c: 71,
        rest_minutes: 0,
        probe_where: "Thickest sausage crumble",
        notes: "All meats must be fully cooked before topping.",
      },
    ],
  },
  hot_honey_pepperoni: {
    title: "Hot Honey Pepperoni Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Crispy pepperoni cups, hot honey sweet heat, and stretchy mozzarella — craveable and fast.",
    sauce: [ing("Pizza sauce", "1 cup")],
    cheese: [ing("Low-moisture mozzarella", "4 cups")],
    toppings: [ing("Pepperoni slices (cupping style)", "8 oz")],
    drizzles: [ing("Hot honey", "¼ cup"), ing("Red pepper flakes", "½ tsp")],
    build_steps: [
      step("Preheat (475°F, 15 min)", "Preheat with rack upper-middle. Bring dough to room temp."),
      step("Stretch (8 min)", "Stretch thin rounds for crisp crust."),
      step("Build (5 min)", "Light sauce, full cheese, pepperoni overlapping slightly."),
      step("Bake (475°F, 10–14 min)", "Bake until pepperoni edges curl and char lightly."),
      step("Finish", "Drizzle hot honey immediately after bake. Rest 2 min, slice."),
    ],
  },
  margherita: {
    title: "Margherita Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Fresh, simple, and fast — tomato, mozzarella, and basil after the bake.",
    sauce: [ing("Crushed tomatoes or pizza sauce", "1 cup"), ing("Olive oil", "2 tbsp")],
    cheese: [ing("Fresh mozzarella, sliced or torn", "2 lbs"), ing("Parmesan", "¼ cup")],
    toppings: [ing("Fresh basil leaves", "1 bunch")],
    drizzles: [ing("Balsamic glaze (optional)", "2 tbsp")],
    build_steps: [
      step("Preheat (500°F, 15 min)", "High heat for a quick bake and soft center."),
      step("Stretch (8 min)", "Stretch slightly thicker than thin-crust pizzas."),
      step("Build (5 min)", "Sauce sparingly; distribute mozzarella; light olive oil on the border."),
      step("Bake (500°F, 8–12 min)", "Bake until crust blisters and cheese melts with light spots."),
      step("Finish", "Add basil after baking so it stays bright. Optional balsamic drizzle."),
    ],
  },
  veggie_supreme: {
    title: "Veggie Supreme Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Colorful, hearty veg load — great when you need a meatless line at the hall.",
    sauce: [ing("Pizza sauce", "1¼ cups")],
    cheese: [ing("Mozzarella", "4 cups")],
    toppings: [
      ing("Bell peppers, diced", "2"),
      ing("Mushrooms, sliced", "12 oz"),
      ing("Red onion", "1 large"),
      ing("Black olives, sliced", "½ cup"),
      ing("Spinach (optional)", "4 cups"),
    ],
    drizzles: [ing("Olive oil", "2 tbsp")],
    build_steps: [
      step("Prep veg (no heat, 12 min)", "Slice vegetables evenly so they cook at the same rate."),
      step("Preheat (475°F)", "Hot oven for crisp vegetables."),
      step("Build", "Sauce, cheese, vegetables — pat mushrooms dry if very wet."),
      step("Bake (475°F, 14–16 min)", "Bake until vegetables soften and edges caramelize lightly."),
      step("Serve", "Rest 2 min; slice."),
    ],
  },
  chicken_bacon_ranch: {
    title: "Chicken Bacon Ranch Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Creamy ranch base, bacon crunch, and chicken — comfort pizza for the whole hall.",
    sauce: [ing("Ranch dressing (base)", "¾ cup"), ing("Garlic butter (optional rim)", "3 tbsp")],
    cheese: [ing("Mozzarella", "4 cups"), ing("Cheddar, shredded", "1 cup")],
    toppings: [
      ing("Cooked chicken, diced", "2 lbs"),
      ing("Bacon, cooked and crumbled", "12 slices"),
      ing("Red onion, sliced", "½ large"),
    ],
    drizzles: [ing("Extra ranch drizzle", "¼ cup")],
    build_steps: [
      step("Cook bacon and prep chicken (medium, 12 min)", "Crisp bacon; drain. Dice chicken."),
      step("Preheat (475°F)", "Standard pizza heat."),
      step("Build", "Ranch base instead of tomato sauce — thin layer. Cheese, chicken, bacon, onion."),
      step("Bake (475°F, 12–15 min)", "Bake until cheese melts and crust is golden."),
      step("Finish", "Ranch drizzle after bake. Serve hot."),
    ],
    protein_safety: [
      {
        protein: "Chicken",
        target_temp_f: 165,
        target_temp_c: 74,
        rest_minutes: 0,
        probe_where: "Thickest piece",
        notes: "",
      },
    ],
  },
};

const ALL_TEMPLATES: Record<string, PizzaTemplateDef> = {
  ...TEMPLATES,
  ...EXTENDED_PIZZA_TEMPLATES,
};

export function buildPizzaTemplate(conceptId: string, request: PizzaRequest): PizzaResponse {
  const meta = getPizzaConceptMeta(conceptId);
  const base =
    ALL_TEMPLATES[conceptId] ??
    metaAwareGenericTemplate(conceptId);
  const crew = request.crew_size;
  const prep =
    base.prep_minutes ??
    (request.time_available === "30-45" ? 20 : request.time_available === "45-60" ? 25 : 30);
  const bake = base.bake_minutes ?? 14;

  const dough: IngredientItem[] | undefined =
    request.dough_option === "from_scratch"
      ? [
          ing("Bread flour", "8 cups"),
          ing("Instant yeast", "3 packets"),
          ing("Warm water", "3 cups"),
          ing("Salt", "2 tbsp"),
          ing("Olive oil", "¼ cup"),
        ]
      : request.dough_option === "premade"
        ? [ing("Premade pizza dough balls", `${Math.max(2, Math.ceil(crew / 2))} balls (16–20 oz each)`)]
        : undefined;

  const response: PizzaResponse = {
    pizza_style_id: conceptId,
    title: meta?.title ?? base.title,
    dough_type: base.dough_type,
    why_this_works: base.why_this_works,
    recommended_pizzas: pizzaCountLabel(crew),
    timing: {
      prep_minutes: prep,
      bake_minutes: bake,
      total_minutes: prep + bake,
    },
    oven_setup: {
      preheat_temp_f: 475,
      preheat_temp_c: 246,
      rack_position: "Upper-middle (rotate pans halfway)",
      surface_option: "Parchment-lined sheet pans or pizza stone",
    },
    ingredients: {
      ...(dough ? { dough: scaleIngredients(dough, crew) } : {}),
      sauce: scaleIngredients(base.sauce, crew),
      cheese: scaleIngredients(base.cheese, crew),
      toppings: scaleIngredients(base.toppings, crew),
      drizzles: scaleIngredients(base.drizzles, crew),
    },
    build_steps: base.build_steps,
    protein_safety: base.protein_safety || [],
    cleanup_tip: "Soak sheet pans while the crew eats — cheese bakes off easier when warm.",
    macros_per_serving: {
      calories: 420,
      protein_g: 24,
      carbs_g: 38,
      fat_g: 18,
    },
  };

  if (meta) {
    response.category = meta.category;
    response.badges = meta.badges;
    response.spice_level = ["Mild", "Medium", "Hot", "Firehall Hot"][meta.spiceLevel] ?? "Medium";
    response.difficulty = meta.difficulty;
    response.estimated_cost = meta.estimatedCost;
    const sides = resolvePizzaRecommendedSides(request, meta);
    if (sides?.length) response.recommended_sides = sides;
    response.dipping_sauces = meta.dippingSauces;
    response.crust_type = meta.crust;
    response.sauce_style = meta.sauceStyle;
    response.substitutions = meta.substitutions;
    response.optional_toppings = meta.optionalToppings;
    response.hero_emoji = meta.heroEmoji;
    response.hall_line = meta.quickShift
      ? "Quick between calls — oven-ready in under an hour."
      : "Feeds a hungry hall crew — scale pans for your shift size.";
  }

  response.build_steps = buildPizzaInstructionSteps(conceptId, response, request);
  return response;
}
