/**
 * Pizza Night instruction engine — concept-specific, ingredient-aware steps.
 * Replaces generic meal instruction enhancement for build_steps.
 */

import type { PizzaRequest, PizzaResponse, IngredientItem, RecipeStep } from "@shared/schema.js";
import { getPizzaConceptMeta, type PizzaCategory } from "@shared/pizza-concepts.js";
import {
  stripBannedInstructionPhrases,
  dedupeRedundantSteps,
} from "@shared/firehall-instruction-voice.js";

export interface PizzaStepContext {
  conceptId: string;
  title: string;
  request: PizzaRequest;
  sauce: IngredientItem[];
  cheese: IngredientItem[];
  toppings: IngredientItem[];
  drizzles: IngredientItem[];
  dough?: IngredientItem[];
  ovenTempF: number;
  bakeMinutes: string;
  doughOption: PizzaRequest["dough_option"];
}

function step(heading: string, body: string): RecipeStep {
  return { heading, body };
}

function ingNames(items: IngredientItem[]): string[] {
  return items.map((i) => i.item).filter(Boolean);
}

function hasIngredient(items: IngredientItem[], pattern: RegExp): boolean {
  return items.some((i) => pattern.test(i.item));
}

function joinNames(items: IngredientItem[], max = 4): string {
  const names = ingNames(items);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")}, and ${names.length - max} more`;
}

const GENERIC_BUILD_PATTERNS = [
  /spread sauce thinly/i,
  /cover with mozzarella/i,
  /add mozzarella evenly/i,
  /sauce and cheese \(5 min\)/i,
  /^build \(5 min\)$/i,
];

const BANNED_IN_STEP = /\b(watch for visual cues|work over medium heat|spread evenly|prepare ingredients carefully|wooden bowl)\b/i;

export function polishPizzaSteps(steps: RecipeStep[]): RecipeStep[] {
  return dedupeRedundantSteps(
    steps
      .map((s) => ({
        heading: stripBannedInstructionPhrases(s.heading || "").trim(),
        body: stripBannedInstructionPhrases(s.body || "").trim(),
      }))
      .filter((s) => s.body.length > 20),
  );
}

export function aiPizzaStepsAreSpecific(steps: RecipeStep[]): boolean {
  if (steps.length < 5) return false;
  const combined = steps.map((s) => `${s.heading} ${s.body}`).join(" ");
  if (BANNED_IN_STEP.test(combined)) return false;
  for (const pat of GENERIC_BUILD_PATTERNS) {
    if (pat.test(combined)) return false;
  }
  const avgWords =
    steps.reduce((sum, s) => sum + s.body.split(/\s+/).filter(Boolean).length, 0) / steps.length;
  return avgWords >= 32;
}

function preheatStep(ctx: PizzaStepContext): RecipeStep {
  const temp = ctx.ovenTempF;
  const isDessert = temp <= 425;
  return step(
    `Preheat oven (${temp}°F, 15 min)`,
    isDessert
      ? `Position racks in the middle zone. Preheat to ${temp}°F — dessert pies need a slightly lower heat so chocolate and sugar do not scorch. If using a stone or steel, let it heat inside the oven for 20+ minutes.`
      : `Position racks in the upper-middle zone. Preheat to ${temp}°F (${Math.round((temp - 32) * 5 / 9)}°C) for at least 15 minutes. A pizza stone or baking steel on the rack gives a crisper bottom; heat it with the oven.`,
  );
}

function stretchStep(ctx: PizzaStepContext): RecipeStep {
  if (ctx.doughOption === "from_scratch") {
    return step(
      "Shape the dough (room temp, 10–12 min)",
      `After the dough rises, punch it down and divide for ${ctx.request.crew_size} crew portions. Oil your hands, press each portion flat, then stretch or roll to 12–14 inch rounds on parchment. Patch tears by pinching — do not keep stretching the same spot or the crust gets thin and blows out.`,
    );
  }
  return step(
    "Stretch the dough (room temp, 8–10 min)",
    `Bring ${joinNames(ctx.dough || [{ item: "dough balls", amount: "", notes: "" }], 2)} to room temperature. Oil your hands lightly, press each ball flat, then stretch outward to 12–14 inch circles on parchment-lined pans. Leave a ¾-inch border for a raised crust edge. If the dough snaps back, rest it 5 minutes and stretch again.`,
  );
}

function bakeStep(ctx: PizzaStepContext): RecipeStep {
  const temp = ctx.ovenTempF;
  return step(
    `Bake (${temp}°F, ${ctx.bakeMinutes})`,
    `Slide pizzas onto the ${temp >= 475 ? "upper-middle" : "middle"} rack (or onto the hot stone). Bake at ${temp}°F for ${ctx.bakeMinutes} minutes until the cheese is bubbling with golden-brown spots, the crust edge is deep golden, and the bottom sounds crisp when you lift an edge with a spatula. Rotate pans halfway so one side does not burn. If the center looks wet while edges brown, lower heat 25°F and bake 2 more minutes.`,
  );
}

function finishSliceStep(extra?: string): RecipeStep {
  return step(
    "Rest, finish, and slice (2–3 min)",
    `${extra || ""}Rest 2–3 minutes so cheese sets and you do not burn your mouth on the first slice. Cut into hall portions and serve hot.`,
  );
}

function buildBigMacSteps(ctx: PizzaStepContext): RecipeStep[] {
  const sauceList = joinNames(ctx.sauce);
  const cheeseList = joinNames(ctx.cheese);
  const toppingList = joinNames(ctx.toppings);
  const drizzleList = joinNames(ctx.drizzles);

  return [
    step(
      "Prep the station (no heat, 12 min)",
      `Lay out ground beef, ${sauceList}, ${cheeseList}, pickles, lettuce, sesame seeds, and dough before any heat goes on. Mix the special sauce ingredients in a bowl now so it is cold and thick when you build.`,
    ),
    step(
      "Brown the beef (medium-high, 6–8 min)",
      "Heat a large skillet over medium-high until a drop of water sizzles. Add ground beef and break it apart with a spatula into small crumbles — think fast-food burger texture, not big clumps. Season with salt, pepper, garlic powder, onion powder, and a splash of Worcestershire if you have it. Cook 6–8 minutes until the meat is browned with crispy edges and no pink remains (160°F in the thickest crumble). Drain excess grease on paper towels so the pizza does not go oily.",
    ),
    step(
      "Make the Big Mac sauce (no heat, 5 min)",
      `Whisk together ${sauceList} until smooth — it should look like thick pinkish burger sauce. Taste once: tangy, slightly sweet, pickle-forward. Refrigerate while you shape dough so it stays firm on the pie.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Prep the bun-style crust (no heat, 4 min)",
      `Brush the outer crust ring lightly with oil or egg wash. Press ${drizzleList || "sesame seeds"} around the edge only — that rim is your Big Mac bun cue. Keep the center sauced, not overloaded with seeds.`,
    ),
    step(
      "Build the pizza (no heat, 5 min)",
      `Spread a thin layer of Big Mac sauce over the dough, leaving a 1-inch border. Add ${cheeseList} in an even layer — you should still see sauce peeking through. Scatter seasoned beef and diced onion. ${hasIngredient(ctx.toppings, /pickle/i) ? "Save sliced pickles for after the bake so they stay sharp, not baked mush." : ""} Do not pile the center high or the crust will steam and stay soft.`,
    ),
    bakeStep(ctx),
    step(
      "Finish like a burger (no heat, 3 min)",
      `Cool 2 minutes off the oven. ${hasIngredient(ctx.toppings, /lettuce/i) || hasIngredient(ctx.drizzles, /lettuce/i) ? "Top with shredded lettuce and extra sauce drizzle just before serving — lettuce goes on now so it stays crisp." : "Add any fresh toppings now."} Slice and hit the line while the crust still crackles.`,
    ),
  ];
}

function buildBuffaloChickenSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep chicken and station (no heat, 12 min)",
      `Dice or shred cooked chicken to 165°F, or cook raw chicken to 165°F in a skillet first. Pat ${joinNames(ctx.toppings)} dry if wet. Have ${joinNames(ctx.sauce)} and ${joinNames(ctx.cheese)} measured before the oven is hot.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Sauce and cheese layer (no heat, 4 min)",
      `Spread ${joinNames(ctx.sauce)} thinly — buffalo should flavor, not flood. Add ${joinNames(ctx.cheese)} evenly; blue cheese crumbles go on now if using them.`,
    ),
    step(
      "Top and bake (475°F, 12–15 min)",
      `Scatter chicken and any raw vegetables that can bake (like onion). Skip garnishes that wilt. Bake until crust is golden and cheese has light brown spots.`,
    ),
    step(
      "Finish with cool toppings (no heat, 2 min)",
      `${joinNames(ctx.drizzles) ? `Drizzle ${joinNames(ctx.drizzles)} and add green onion after the bake so ranch stays cool against hot buffalo.` : "Add fresh garnishes after bake."} Rest 2 minutes, slice.`,
    ),
  ];
}

function buildBbqChickenSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep (no heat, 12 min)",
      `Cook chicken to 165°F if needed. Slice ${joinNames(ctx.toppings)}. ${joinNames(ctx.sauce)} ready — BBQ goes on thin so the crust does not stay soggy.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build (no heat, 5 min)",
      `Spread ${joinNames(ctx.sauce)} in a thin layer to the border. ${joinNames(ctx.cheese)} next, then chicken and onion — drain wet toppings or they steam the center.`,
    ),
    bakeStep(ctx),
    finishSliceStep(
      hasIngredient(ctx.drizzles, /cilantro|bbq/i)
        ? `Hit with ${joinNames(ctx.drizzles)} after bake for fresh sweet-smoke flavor. `
        : "",
    ),
  ];
}

function buildWhitePieSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep (no heat, 10 min)",
      `White pies scorch fast — have ${joinNames(ctx.sauce)} and ${joinNames(ctx.cheese)} ready. Cook any chicken to 165°F before topping.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build white base (no heat, 5 min)",
      `Spread ${joinNames(ctx.sauce)} thinly — garlic cream or alfredo should coat, not pool. ${joinNames(ctx.cheese)} evenly; add ${joinNames(ctx.toppings)}. Keep the center lighter than the edges.`,
    ),
    bakeStep(ctx),
    finishSliceStep(
      hasIngredient(ctx.drizzles, /truffle|oil|balsamic/i)
        ? `${joinNames(ctx.drizzles)} goes on after bake only — heat kills delicate aromas. `
        : "",
    ),
  ];
}

function buildBurgerStyleSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Cook the beef (medium-high, 8–10 min)",
      `Brown ${joinNames(ctx.toppings)} in a skillet, breaking into fine crumbles. Season with salt, pepper, and a little garlic/onion powder. Drain well — grease will kill a crisp crust.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build burger layers (no heat, 5 min)",
      `Swirl ${joinNames(ctx.sauce)} on the dough. ${joinNames(ctx.cheese)} next, then beef. Pickles and fresh tomato go on after bake if listed in toppings.`,
    ),
    bakeStep(ctx),
    finishSliceStep("Add pickles, lettuce, or cold sauce after bake. "),
  ];
}

function buildMargheritaSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep (no heat, 10 min)",
      `Tear ${joinNames(ctx.cheese)} and pat dry if fresh mozzarella is wet. ${joinNames(ctx.sauce)} and basil stay separate until the end.`,
    ),
    preheatStep({ ...ctx, ovenTempF: 500 }),
    stretchStep(ctx),
    step(
      "Build lightly (no heat, 4 min)",
      `Sauce sparingly — three thin spoons across the dough, not a heavy layer. Distribute cheese; brush crust edge with olive oil if you have it.`,
    ),
    bakeStep({ ...ctx, ovenTempF: 500, bakeMinutes: "8–12" }),
    step(
      "Finish with basil (no heat, 2 min)",
      `Add fresh basil and any ${joinNames(ctx.drizzles)} only after the bake so leaves stay bright green. Slice immediately.`,
    ),
  ];
}

function buildDessertPizzaSteps(ctx: PizzaStepContext): RecipeStep[] {
  const temp = ctx.ovenTempF;
  return [
    step(
      "Prep (no heat, 8 min)",
      `Slice any fresh fruit. If ${joinNames(ctx.sauce)} is Nutella or chocolate, warm it 10 seconds in the microwave so it spreads without tearing the dough.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build (no heat, 4 min)",
      `Spread ${joinNames(ctx.sauce)} thinly. ${joinNames(ctx.cheese)} or marshmallows stay away from the very edge so they do not burn.`,
    ),
    step(
      `Bake (${temp}°F, ${ctx.bakeMinutes})`,
      `Bake until dough is cooked through and edges are golden — chocolate should look glossy, not black. Lower heat if the top darkens before the dough is done.`,
    ),
    finishSliceStep(
      `Top with fresh fruit and ${joinNames(ctx.drizzles)} after cooling 3 minutes — filling stays molten. `,
    ),
  ];
}

function buildPepperoniSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep the station (no heat, 10 min)",
      `Line sheet pans with parchment. Shingle ${joinNames(ctx.toppings)} on a plate so you can cover the pie fast once cheese is down — pepperoni curls and cups grease when the oven is ripping hot.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build the pepperoni pie (no heat, 5 min)",
      `Spread ${joinNames(ctx.sauce)} thin to a ¾-inch border — heavy sauce steams the center. Cover with ${joinNames(ctx.cheese)} until the dough is fully covered but not buried. Lay pepperoni in a single overlapping layer from edge to edge; edges can overlap slightly for those crispy cupped rounds.`,
    ),
    bakeStep(ctx),
    finishSliceStep(
      hasIngredient(ctx.drizzles, /honey/i)
        ? `Drizzle ${joinNames(ctx.drizzles)} in a thin zigzag after bake — honey sets on hot cheese, not raw dough. `
        : "",
    ),
  ];
}

function buildMeatLoversSteps(ctx: PizzaStepContext): RecipeStep[] {
  const meats = joinNames(ctx.toppings);
  return [
    step(
      "Prep proteins (no heat, 15 min)",
      `Cook any raw sausage or bacon until rendered and 160°F+ before topping. Pat ${meats} dry — wet meat steams the crust. Have ${joinNames(ctx.sauce)} and ${joinNames(ctx.cheese)} measured; loaded pies need even layers, not a mountain in the middle.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Layer the hall load (no heat, 6 min)",
      `Swirl ${joinNames(ctx.sauce)} thin. ${joinNames(ctx.cheese)} first, then distribute meats in zones (bacon here, sausage there) so every slice gets variety. Keep the center 20% lighter than the rim or the middle stays raw while edges char.`,
    ),
    bakeStep(ctx),
    finishSliceStep("Rotate pans at 7 minutes — heavy pies need even heat. "),
  ];
}

function buildSupremeSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep vegetables and meats (no heat, 14 min)",
      `Dice peppers and onions to similar size so they cook evenly. Cook raw sausage or beef to 160°F. Drain anything wet. ${joinNames(ctx.sauce)} and ${joinNames(ctx.cheese)} ready before preheat.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build supreme layers (no heat, 6 min)",
      `Thin ${joinNames(ctx.sauce)} layer, then ${joinNames(ctx.cheese)}. Add meats first, then vegetables — mushrooms and peppers go on top so moisture vents instead of soaking the cheese.`,
    ),
    bakeStep(ctx),
    finishSliceStep(),
  ];
}

function buildTacoSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Cook taco beef and prep (medium-high, 10 min)",
      `Brown seasoned ground beef with taco seasoning until crumbly and 160°F. Drain grease. Warm ${joinNames(ctx.sauce)} if it is thick salsa. Shred lettuce and dice tomato for after the bake only.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build taco base (no heat, 5 min)",
      `Spread ${joinNames(ctx.sauce)} thin — salsa pools make a soggy center. ${joinNames(ctx.cheese)} next, then hot beef and any peppers that can bake. Save cold toppings for the finish.`,
    ),
    bakeStep(ctx),
    step(
      "Finish taco-style (no heat, 3 min)",
      `Rest 2 minutes. Top with lettuce, tomato, and ${joinNames(ctx.drizzles) || "sour cream"} so greens stay crisp. Slice and serve with chips if the crew brought them.`,
    ),
  ];
}

function buildPhillySteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Cook steak and peppers (high heat, 10–12 min)",
      `Slice steak thin across the grain. Sear in a hot skillet with oil until browned but still juicy — do not overcook before the oven. Sauté peppers and onions until softened and lightly charred. Season with salt, pepper, and a pinch of garlic powder.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build cheesesteak layers (no heat, 5 min)",
      `Light swipe of ${joinNames(ctx.sauce)} — this pie is about meat and cheese, not wet sauce. ${joinNames(ctx.cheese)} in an even blanket, then steak and peppers. Provolone or mozzarella should melt into the meat, not hide it.`,
    ),
    bakeStep(ctx),
    finishSliceStep(),
  ];
}

function buildNashvilleHotSteps(ctx: PizzaStepContext): RecipeStep[] {
  return [
    step(
      "Prep hot chicken (no heat, 14 min)",
      `Toss cooked chicken in Nashville hot oil or paste until coated — taste one piece: heat should hit the back of your throat, not just the tongue. Pat dry if saucy. Keep ${joinNames(ctx.drizzles)} cold for after bake.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      "Build (no heat, 5 min)",
      `Thin ${joinNames(ctx.sauce)} or ranch base. ${joinNames(ctx.cheese)} evenly. Chicken on top so the hot oil toasts slightly in the oven. Pickles after bake if using.`,
    ),
    bakeStep(ctx),
    finishSliceStep(
      `Cool 2 minutes, then ${joinNames(ctx.drizzles) ? `drizzle ${joinNames(ctx.drizzles)}` : "add ranch"} to tame the heat. `,
    ),
  ];
}

function buildClassicTomatoSteps(ctx: PizzaStepContext): RecipeStep[] {
  if (/\bpepperoni\b/i.test(ctx.title) || hasIngredient(ctx.toppings, /pepperoni/i)) {
    return buildPepperoniSteps(ctx);
  }
  if (/\bhawaiian|pineapple\b/i.test(ctx.title)) {
    return [
      step(
        "Prep (no heat, 10 min)",
        `Pat ${joinNames(ctx.toppings)} dry — pineapple releases juice. Cook bacon until crisp if using raw bacon.`,
      ),
      preheatStep(ctx),
      stretchStep(ctx),
      step(
        "Build (no heat, 5 min)",
        `${joinNames(ctx.sauce)} thin, ${joinNames(ctx.cheese)} even, then ham and pineapple in small clumps — not one wet pile in the center.`,
      ),
      bakeStep(ctx),
      finishSliceStep(),
    ];
  }
  return buildIngredientAwareSteps(ctx);
}

function buildLoadedHallSteps(ctx: PizzaStepContext): RecipeStep[] {
  if (/\bsupreme\b/i.test(ctx.title)) return buildSupremeSteps(ctx);
  if (/\bmeat\s*lover|loaded\b/i.test(ctx.title) || hasIngredient(ctx.toppings, /bacon|sausage|pepperoni/i)) {
    return buildMeatLoversSteps(ctx);
  }
  if (/\bphilly|cheesesteak|steak\b/i.test(ctx.title)) return buildPhillySteps(ctx);
  return buildIngredientAwareSteps(ctx);
}

function buildInternationalSteps(ctx: PizzaStepContext): RecipeStep[] {
  if (/\btaco\b/i.test(ctx.title)) return buildTacoSteps(ctx);
  if (/\bbutter\s*chicken|indian\b/i.test(ctx.title)) {
    return [
      step(
        "Prep butter chicken layer (no heat, 12 min)",
        `Warm ${joinNames(ctx.sauce)} until spreadable. Cook chicken to 165°F, toss in sauce, cool 2 minutes so it does not flood the dough.`,
      ),
      preheatStep(ctx),
      stretchStep(ctx),
      step(
        "Build (no heat, 5 min)",
        `Spread sauce thin — butter chicken is rich. ${joinNames(ctx.cheese)} lightly. Chicken and ${joinNames(ctx.toppings)} in even patches.`,
      ),
      bakeStep(ctx),
      finishSliceStep(`Finish with ${joinNames(ctx.drizzles) || "cilantro and red onion"} after bake. `),
    ];
  }
  if (/\bdonair\b/i.test(ctx.title)) {
    return [
      step(
        "Cook donair meat (medium-high, 10 min)",
        `Brown seasoned ground beef or lamb crumbles until 160°F. Drain well. Mix ${joinNames(ctx.sauce)} — sweet garlicky donair sauce should be thick, not runny.`,
      ),
      preheatStep(ctx),
      stretchStep(ctx),
      step(
        "Build (no heat, 5 min)",
        `Sauce base thin, ${joinNames(ctx.cheese)} next, then meat. Tomatoes and onions go on after bake if listed.`,
      ),
      bakeStep(ctx),
      finishSliceStep(),
    ];
  }
  return buildIngredientAwareSteps(ctx);
}

function buildIngredientAwareSteps(ctx: PizzaStepContext): RecipeStep[] {
  const title = ctx.title;
  const proteinNote = hasIngredient(ctx.toppings, /chicken|beef|sausage|bacon|meatball|steak|pork/i)
    ? `Cook any raw proteins to safe temp before they go on the pie — chicken 165°F, ground beef/sausage 160°F. `
    : "";

  const postBake =
    hasIngredient(ctx.drizzles, /lettuce|pickle|fresh|basil|cilantro|arugula/i) ||
    hasIngredient(ctx.toppings, /lettuce|pickle/i)
      ? "Save cold toppings and drizzles for after the bake so they stay fresh. "
      : hasIngredient(ctx.drizzles, /.+/)
        ? `Add ${joinNames(ctx.drizzles)} after bake if they are finishing sauces. `
        : "";

  return [
    step(
      "Prep the pizza station (no heat, 12 min)",
      `${proteinNote}Bring dough to room temp. Lay out ${joinNames(ctx.sauce)}, ${joinNames(ctx.cheese)}, and ${joinNames(ctx.toppings)}. Read the full bake before you preheat — pizza moves fast once the oven is hot.`,
    ),
    preheatStep(ctx),
    stretchStep(ctx),
    step(
      `Build ${title} (no heat, 5–6 min)`,
      `Spread ${joinNames(ctx.sauce)} in a thin, even layer to a ¾-inch crust border — too much sauce steams the center. Cover with ${joinNames(ctx.cheese)}; you should still see hints of sauce. Add ${joinNames(ctx.toppings)} in a single even layer — heavy piles in the middle stay raw while edges burn.`,
    ),
    bakeStep(ctx),
    finishSliceStep(postBake),
  ];
}

const CONCEPT_BUILDERS: Partial<Record<string, (ctx: PizzaStepContext) => RecipeStep[]>> = {
  big_mac_pizza: buildBigMacSteps,
  cheeseburger_pizza: buildBurgerStyleSteps,
  buffalo_chicken: buildBuffaloChickenSteps,
  bbq_chicken: buildBbqChickenSteps,
  bbq_chicken_bacon_ranch: buildBbqChickenSteps,
  margherita: buildMargheritaSteps,
  pepperoni_classic: buildPepperoniSteps,
  hot_honey_pepperoni: buildPepperoniSteps,
  hot_honey_soppressata: buildPepperoniSteps,
  meat_lovers: buildMeatLoversSteps,
  supreme_classic: buildSupremeSteps,
  taco_pizza: buildTacoSteps,
  philly_cheesesteak: buildPhillySteps,
  nashville_hot_chicken: buildNashvilleHotSteps,
  jalapeno_popper: buildWhitePieSteps,
  garlic_parm_white: buildWhitePieSteps,
  garlic_parmesan_chicken: buildWhitePieSteps,
  white_pizza_classic: buildWhitePieSteps,
  alfredo_chicken: buildWhitePieSteps,
  pesto_chicken: buildWhitePieSteps,
  pesto_burrata: buildWhitePieSteps,
  mushroom_truffle: buildWhitePieSteps,
  spinach_artichoke: buildWhitePieSteps,
  nutella_dessert: buildDessertPizzaSteps,
  butter_chicken: buildInternationalSteps,
  donair_style: buildInternationalSteps,
  hawaiian: buildClassicTomatoSteps,
};

const CATEGORY_BUILDERS: Partial<Record<PizzaCategory, (ctx: PizzaStepContext) => RecipeStep[]>> = {
  classic: buildClassicTomatoSteps,
  firehall: buildLoadedHallSteps,
  gourmet: (ctx) =>
    /\bpesto|burrata|truffle|honey\b/i.test(ctx.title) ? buildIngredientAwareSteps(ctx) : buildClassicTomatoSteps(ctx),
  international: buildInternationalSteps,
  viral: (ctx) =>
    /\bbig\s*mac/i.test(ctx.conceptId) || /\bbig\s*mac/i.test(ctx.title)
      ? buildBigMacSteps(ctx)
      : /\bburger|cheeseburger/i.test(ctx.title)
        ? buildBurgerStyleSteps(ctx)
        : buildIngredientAwareSteps(ctx),
  bbq: buildBbqChickenSteps,
  white: buildWhitePieSteps,
  dessert: buildDessertPizzaSteps,
  spicy: (ctx) =>
    /\bnashville|jalapeño|jalapeno/i.test(ctx.title)
      ? buildNashvilleHotSteps(ctx)
      : /\bbuffalo\b/i.test(ctx.title)
        ? buildBuffaloChickenSteps(ctx)
        : buildIngredientAwareSteps(ctx),
};

export function buildPizzaStepContext(
  conceptId: string,
  recipe: Pick<
    PizzaResponse,
    "title" | "ingredients" | "oven_setup" | "timing" | "build_steps"
  >,
  request: PizzaRequest,
): PizzaStepContext {
  return {
    conceptId,
    title: recipe.title || conceptId.replace(/_/g, " "),
    request,
    sauce: recipe.ingredients?.sauce || [],
    cheese: recipe.ingredients?.cheese || [],
    toppings: recipe.ingredients?.toppings || [],
    drizzles: recipe.ingredients?.drizzles || [],
    dough: recipe.ingredients?.dough,
    ovenTempF: recipe.oven_setup?.preheat_temp_f || 475,
    bakeMinutes: String(recipe.timing?.bake_minutes || "12–15"),
    doughOption: request.dough_option,
  };
}

/** Primary entry: handcrafted steps for this pizza concept + final ingredient list. */
export function buildPizzaInstructionSteps(
  conceptId: string,
  recipe: PizzaResponse,
  request: PizzaRequest,
): RecipeStep[] {
  const ctx = buildPizzaStepContext(conceptId, recipe, request);

  const dedicated = CONCEPT_BUILDERS[conceptId];
  if (dedicated) return polishPizzaSteps(dedicated(ctx));

  const meta = getPizzaConceptMeta(conceptId);
  const categoryBuilder = meta ? CATEGORY_BUILDERS[meta.category] : undefined;
  if (categoryBuilder) return polishPizzaSteps(categoryBuilder(ctx));

  return polishPizzaSteps(buildIngredientAwareSteps(ctx));
}

/** Prefer strong AI steps; otherwise rebuild from concept + ingredients. */
export function resolvePizzaBuildSteps(
  conceptId: string,
  recipe: PizzaResponse,
  request: PizzaRequest,
  aiSteps: RecipeStep[],
): RecipeStep[] {
  const normalized = aiSteps.map((s) => ({
    heading: String(s.heading || "").trim(),
    body: String(s.body || "").trim(),
  }));

  if (aiPizzaStepsAreSpecific(normalized)) {
    return polishPizzaSteps(normalized);
  }

  return buildPizzaInstructionSteps(conceptId, recipe, request);
}
