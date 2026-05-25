/**
 * Extended hall pizza templates — full recipes for concepts beyond core set.
 */

import type { PizzaResponse, IngredientItem, RecipeStep } from "../shared/schema.js";
import { getPizzaConceptMeta } from "../shared/pizza-concepts.js";

export interface PizzaTemplateDef {
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

const BAKE = (mins = "12–15") =>
  step(
    `Bake (475°F, ${mins})`,
    `Place pizzas on the middle oven rack. Bake at 475°F for ${mins} minutes until the cheese is fully melted with light brown spots, the crust edge is golden brown, and the bottom sounds hollow when you lift an edge with a spatula. Rotate pans halfway through for even color.`,
  );

const PREHEAT = step(
  "Preheat oven (475°F, 15 min)",
  "Position racks in the upper-middle zone. Preheat to 475°F (246°C) for at least 15 minutes. If using a pizza stone, heat it inside the oven for 20+ minutes. A fully hot oven is what gives you a crisp bottom between calls.",
);

const STRETCH = step(
  "Stretch dough (room temp, 8 min)",
  "Bring dough balls to room temperature. Oil your hands lightly. Press each ball flat, then stretch outward to 12–14 inch rounds. If the dough tears, pinch the tear closed. Avoid overworking or the crust will be tough.",
);

export const EXTENDED_PIZZA_TEMPLATES: Record<string, PizzaTemplateDef> = {
  pepperoni_classic: {
    title: "Classic Pepperoni Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "The hall baseline — pepperoni cups, bubbling mozzarella, and a crisp crust. Feeds a hungry crew in one oven cycle.",
    sauce: [ing("Pizza sauce", "1¼ cups")],
    cheese: [ing("Low-moisture mozzarella", "4 cups")],
    toppings: [ing("Pepperoni slices", "10 oz")],
    drizzles: [ing("Olive oil rim brush", "2 tbsp")],
    build_steps: [
      step("Prep station (no heat, 10 min)", "Bring dough to room temp. Line sheet pans with parchment. Shingle pepperoni so edges overlap slightly — they'll cup and crisp in the oven."),
      PREHEAT,
      STRETCH,
      step("Sauce and cheese (no heat, 5 min)", "Spread sauce thinly, leaving a ½-inch border. Cover evenly with mozzarella — you should still see a little sauce through the cheese."),
      BAKE("10–14"),
      step("Serve (2 min rest)", "Rest 2 minutes so cheese sets, then slice into hall portions. Serve hot — this pie disappears fast."),
    ],
  },
  philly_cheesesteak: {
    title: "Philly Cheesesteak Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "All the steak-and-cheese flavor on a shareable pie — perfect when the hall wants comfort food fast.",
    sauce: [ing("Light pizza sauce or steak sauce", "¾ cup")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Provolone, sliced", "1 lb")],
    toppings: [
      ing("Thin-sliced ribeye or sirloin", "2 lbs"),
      ing("Bell peppers, sliced", "2 medium"),
      ing("Onions, sliced", "2 large"),
    ],
    drizzles: [],
    build_steps: [
      step("Cook steak and veg (medium-high, 12 min)", "Sear steak strips in batches — don't crowd the pan. Cook peppers and onions until soft and lightly charred. Season with salt and pepper. Drain excess liquid so the pizza doesn't go soggy."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Light sauce layer, cheeses, then steak and veg. Pat toppings dry if needed."),
      BAKE("14–16"),
      step("Serve", "Rest 2 minutes, slice. Optional hot cherry peppers for the crew."),
    ],
    protein_safety: [{ protein: "Beef", target_temp_f: 145, target_temp_c: 63, rest_minutes: 3, probe_where: "Thickest steak strip", notes: "Slice against the grain after resting." }],
  },
  taco_pizza: {
    title: "Taco Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Taco night meets pizza night — bold, shareable, and easy to customize per crew taste.",
    sauce: [ing("Salsa", "1 cup"), ing("Refried beans, thinned", "1 cup")],
    cheese: [ing("Mexican blend cheese", "4 cups")],
    toppings: [
      ing("Seasoned ground beef, cooked", "2 lbs"),
      ing("Jalapeños, sliced", "½ cup"),
      ing("Black olives", "½ cup"),
    ],
    drizzles: [ing("Sour cream drizzle", "½ cup")],
    build_steps: [
      step("Brown beef (medium, 10 min)", "Cook ground beef with taco seasoning until no pink remains (160°F). Drain fat well."),
      PREHEAT,
      STRETCH,
      step("Layer (5 min)", "Spread thinned refried beans, then salsa, cheese, beef, jalapeños, and olives."),
      BAKE("12–15"),
      step("Finish (no heat)", "Add shredded lettuce, diced tomato, and sour cream AFTER baking so they stay fresh. Slice and serve immediately."),
    ],
    protein_safety: [{ protein: "Ground beef", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of crumbles", notes: "" }],
  },
  donair_style: {
    title: "Donair Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "East Coast hall favorite — seasoned donair meat and sweet sauce on a crisp crust.",
    sauce: [ing("Garlic butter base", "3 tbsp"), ing("Pizza sauce (light)", "½ cup")],
    cheese: [ing("Mozzarella", "4 cups")],
    toppings: [
      ing("Donair meat, cooked and sliced", "2 lbs"),
      ing("Tomatoes, diced", "2 medium"),
      ing("Onions, fine dice", "1 large"),
    ],
    drizzles: [ing("Donair sauce", "¾ cup")],
    build_steps: [
      step("Prep meat (medium, 10 min)", "Cook donair meat until browned and 160°F in the center. Slice thin. Dice tomatoes and onions; pat dry."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Garlic butter brush on border. Light sauce, cheese, meat, onion — tomatoes go on after bake."),
      BAKE("12–15"),
      step("Finish", "Top with fresh tomato and drizzle donair sauce in a zigzag. Rest 2 min, slice."),
    ],
    protein_safety: [{ protein: "Donair meat", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Thickest slice", notes: "" }],
  },
  nashville_hot_chicken: {
    title: "Nashville Hot Chicken Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Cayenne oil heat with cooling ranch — built for crews that like heat with flavor, not just pain.",
    sauce: [ing("Nashville hot oil", "¼ cup"), ing("Ranch (base swirl)", "½ cup")],
    cheese: [ing("Mozzarella", "4 cups"), ing("Pickle slices", "1 cup")],
    toppings: [ing("Nashville hot chicken, diced", "2 lbs")],
    drizzles: [ing("Extra hot oil", "2 tbsp"), ing("Ranch drizzle", "¼ cup")],
    build_steps: [
      step("Prep chicken (165°F, 12 min)", "Coat chicken in hot spice blend, pan-fry or bake until 165°F. Dice into bite pieces. Warm hot oil gently — don't smoke it."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Swirl ranch on dough, light hot oil, cheese, chicken. Tuck pickles under cheese so they don't burn."),
      BAKE("12–14"),
      step("Finish", "Drizzle hot oil and ranch. Rest 2 min. Warn the crew — this one bites."),
    ],
    protein_safety: [{ protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest piece", notes: "" }],
  },
  breakfast_pizza: {
    title: "Breakfast Bacon & Egg Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Post-morning-shift fuel — bacon, egg, and cheese on a shareable pie for the hall table.",
    sauce: [ing("Light pizza sauce or hollandaise", "½ cup")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Cheddar", "2 cups")],
    toppings: [
      ing("Bacon, cooked crisp and chopped", "16 slices"),
      ing("Eggs, beaten", "8 large"),
      ing("Green onion", "6 stalks"),
    ],
    drizzles: [],
    build_steps: [
      step("Cook bacon (medium, 10 min)", "Bake or pan-fry bacon until crisp. Drain on paper towels. Chop when cool."),
      PREHEAT,
      STRETCH,
      step("Partial bake (475°F, 6 min)", "Sauce and cheese only — bake 6 minutes to set the base."),
      step("Add egg (475°F, 8–10 min)", "Pour beaten egg gently over the pie. Add bacon. Bake until egg is just set (no runny center) and crust is golden."),
      step("Finish", "Top with green onion. Rest 3 min before slicing."),
    ],
    protein_safety: [{ protein: "Egg", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of egg layer", notes: "Eggs should be firm, not runny." }],
  },
  jalapeno_popper: {
    title: "Jalapeño Popper Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Cream cheese, bacon, and jalapeño — appetizer energy scaled up for the whole hall.",
    sauce: [ing("Cream cheese, softened", "8 oz"), ing("Ranch", "¼ cup")],
    cheese: [ing("Mozzarella", "4 cups"), ing("Cheddar", "1 cup")],
    toppings: [ing("Jalapeños, sliced", "1 cup"), ing("Bacon, cooked", "12 slices")],
    drizzles: [ing("Ranch drizzle", "¼ cup")],
    build_steps: [
      step("Prep (no heat, 12 min)", "Soften cream cheese. Cook bacon crisp. Pat jalapeños dry if jarred."),
      PREHEAT,
      STRETCH,
      step("Build (6 min)", "Spread cream cheese-ranch mix thinly. Cheese, bacon, jalapeños evenly."),
      BAKE("12–15"),
      step("Serve", "Ranch drizzle after bake. Rest 2 min, slice."),
    ],
  },
  butter_chicken: {
    title: "Butter Chicken Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Creamy butter chicken flavors on pizza — crowd-pleasing fusion for international night at the hall.",
    sauce: [ing("Butter chicken simmer sauce", "1½ cups")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Paneer or extra mozzarella", "1 cup")],
    toppings: [ing("Cooked chicken, diced", "2 lbs"), ing("Red onion, sliced", "1 medium")],
    drizzles: [ing("Cilantro", "1 bunch"), ing("Plain yogurt drizzle", "¼ cup")],
    build_steps: [
      step("Prep chicken (165°F, 12 min)", "Simmer diced chicken in butter chicken sauce until 165°F and sauce thickens slightly. Cool 5 min so it isn't watery on the dough."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Thin sauce layer, cheeses, chicken, onion."),
      BAKE("12–15"),
      step("Finish", "Cilantro and yogurt after bake. Rest 2 min, slice."),
    ],
    protein_safety: [{ protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest piece", notes: "" }],
  },
  mac_cheese: {
    title: "Mac & Cheese Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Two hall comfort foods in one — crispy crust with a creamy mac topping. Weekend treat pie.",
    sauce: [ing("Prepared mac & cheese", "6 cups", "warm, thick")],
    cheese: [ing("Extra cheddar on border", "1 cup")],
    toppings: [ing("Bacon bits", "1 cup"), ing("Jalapeño slices (optional)", "½ cup")],
    drizzles: [ing("Panko + butter sprinkle", "½ cup")],
    build_steps: [
      step("Make mac (stovetop, 15 min)", "Cook mac until al dente. Make a thick cheese sauce — it should mound, not run. Keep warm."),
      PREHEAT,
      STRETCH,
      step("Par-bake crust (475°F, 5 min)", "Brush olive oil on stretched dough. Bake 5 minutes bare to prevent soggy center."),
      step("Top and bake (475°F, 12–14 min)", "Spread mac evenly. Add bacon, jalapeño, panko-butter. Bake until top is golden and crust is crisp."),
      step("Serve", "Rest 3 min — very hot. Slice with a sharp knife."),
    ],
  },
  garlic_parm_white: {
    title: "Garlic Parmesan White Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "No tomato — garlic, ricotta, and parmesan for a rich white pie that feels a little fancy.",
    sauce: [ing("Ricotta", "2 cups"), ing("Olive oil + minced garlic", "3 tbsp")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Parmesan, grated", "1 cup")],
    toppings: [ing("Fresh spinach", "4 cups")],
    drizzles: [ing("Garlic butter rim", "2 tbsp")],
    build_steps: [
      step("Prep (no heat, 10 min)", "Mix ricotta with half the garlic oil. Wilt spinach lightly and squeeze dry."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Spread ricotta mix, mozzarella, parmesan, spinach."),
      BAKE("12–14"),
      step("Finish", "Brush garlic butter on crust edge. Grate extra parmesan. Rest 2 min, slice."),
    ],
  },
  hawaiian: {
    title: "Hawaiian Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Sweet pineapple, salty ham, and melted cheese — divisive but always eaten at the hall.",
    sauce: [ing("Pizza sauce", "1 cup")],
    cheese: [ing("Mozzarella", "4 cups")],
    toppings: [ing("Ham, diced", "1 lb"), ing("Pineapple tidbits, drained", "2 cups")],
    drizzles: [],
    build_steps: [
      step("Drain pineapple (no heat, 5 min)", "Pat pineapple very dry — wet fruit steams the crust."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Sauce, cheese, ham, pineapple."),
      BAKE("12–15"),
      step("Serve", "Rest 2 min, slice."),
    ],
  },
  spicy_italian: {
    title: "Spicy Italian Sausage Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Hot Italian sausage, fennel, and red pepper flakes — bold flavor for spice-loving crews.",
    sauce: [ing("Pizza sauce", "1¼ cups"), ing("Red pepper flakes", "1 tsp")],
    cheese: [ing("Mozzarella", "4 cups")],
    toppings: [ing("Hot Italian sausage, cooked and crumbled", "2 lbs"), ing("Roasted red peppers", "1 cup")],
    drizzles: [ing("Chili oil", "1 tbsp")],
    build_steps: [
      step("Cook sausage (medium, 12 min)", "Brown sausage until 160°F. Break into small crumbles. Drain fat."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Sauce with pepper flakes, cheese, sausage, peppers."),
      BAKE("14–16"),
      step("Serve", "Chili oil drizzle after bake. Rest 2 min, slice."),
    ],
    protein_safety: [{ protein: "Sausage", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of crumbles", notes: "" }],
  },
  meatball_ricotta: {
    title: "Meatball Ricotta Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Sunday-dinner vibes — sliced meatballs, ricotta dollops, and basil after the bake.",
    sauce: [ing("Marinara", "1¼ cups")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Ricotta", "2 cups")],
    toppings: [ing("Cooked meatballs, halved", "2 lbs"), ing("Fresh basil", "1 bunch")],
    drizzles: [ing("Parmesan", "¼ cup")],
    build_steps: [
      step("Prep meatballs (165°F, 10 min)", "Use pre-cooked meatballs heated through, or bake raw until 165°F. Halve so they sit flat."),
      PREHEAT,
      STRETCH,
      step("Build (6 min)", "Sauce, mozzarella, meatball halves, ricotta dollops spaced evenly."),
      BAKE("14–16"),
      step("Finish", "Basil and parmesan after bake. Rest 2 min, slice."),
    ],
    protein_safety: [{ protein: "Meatballs", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Center of largest meatball", notes: "" }],
  },
  big_mac_pizza: {
    title: "Big Mac Style Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Seasoned beef crumbles, homemade Big Mac sauce, sesame crust rim, and cold pickles/lettuce after the bake — burger night on a crisp crust.",
    sauce: [
      ing("Mayonnaise", "1 cup"),
      ing("Ketchup", "¼ cup"),
      ing("Yellow mustard", "2 tbsp"),
      ing("Finely diced pickles", "¼ cup"),
      ing("Pickle juice", "1 tbsp"),
      ing("Onion powder", "1 tsp"),
      ing("Garlic powder", "½ tsp"),
    ],
    cheese: [ing("Shredded mozzarella", "3 cups"), ing("American cheese slices, torn", "1 cup")],
    toppings: [
      ing("Ground beef", "2 lbs"),
      ing("Yellow onion, finely diced", "1 medium"),
      ing("Dill pickles, sliced", "1 cup"),
      ing("Shredded iceberg lettuce", "4 cups"),
    ],
    drizzles: [ing("Sesame seeds for crust rim", "2 tbsp"), ing("Extra special sauce for drizzle", "¼ cup")],
    build_steps: [],
    protein_safety: [{ protein: "Ground beef", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of crumbles", notes: "Drain grease so the pie stays crisp." }],
  },
  cheeseburger_pizza: {
    title: "Cheeseburger Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Ketchup-mustard base, beef, and melty cheese — burger night on a single sheet pan.",
    sauce: [ing("Ketchup", "½ cup"), ing("Yellow mustard", "3 tbsp")],
    cheese: [ing("Cheddar", "3 cups"), ing("Mozzarella", "2 cups")],
    toppings: [ing("Ground beef, cooked", "2 lbs"), ing("Dill pickles", "1 cup")],
    drizzles: [ing("Burger sauce", "¼ cup")],
    build_steps: [
      step("Cook beef (160°F, 10 min)", "Brown and season beef. Drain fat."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Ketchup-mustard swirl, cheeses, beef."),
      BAKE("12–15"),
      step("Finish", "Pickles and diced tomato after bake. Burger sauce drizzle. Slice."),
    ],
    protein_safety: [{ protein: "Ground beef", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of crumbles", notes: "" }],
  },
  pesto_chicken: {
    title: "Pesto Chicken Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Bright pesto, juicy chicken, and mozzarella — lighter than a meat-lovers but still satisfying.",
    sauce: [ing("Basil pesto", "¾ cup")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Parmesan", "½ cup")],
    toppings: [ing("Cooked chicken, sliced", "2 lbs"), ing("Cherry tomatoes, halved", "2 cups")],
    drizzles: [ing("Balsamic glaze", "2 tbsp")],
    build_steps: [
      step("Prep (165°F, 10 min)", "Cook chicken to 165°F. Halve tomatoes and pat dry."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Thin pesto layer, cheeses, chicken, tomatoes."),
      BAKE("12–14"),
      step("Finish", "Balsamic after bake. Rest 2 min, slice."),
    ],
    protein_safety: [{ protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest slice", notes: "" }],
  },
  mushroom_truffle: {
    title: "Mushroom Truffle Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Earthy mushrooms and truffle oil — gourmet night without leaving the hall kitchen.",
    sauce: [ing("Garlic cream", "1 cup")],
    cheese: [ing("Mozzarella", "3 cups"), ing("Fontina", "1 cup")],
    toppings: [ing("Mixed mushrooms, sautéed", "1 lb"), ing("Fresh thyme", "2 tsp")],
    drizzles: [ing("Truffle oil", "1 tbsp", "after bake only")],
    build_steps: [
      step("Sauté mushrooms (medium-high, 8 min)", "Cook mushrooms until water releases and evaporates — they should look golden, not wet."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Garlic cream base, cheeses, mushrooms, thyme."),
      BAKE("12–14"),
      step("Finish", "Truffle oil drizzle after bake — a little goes far. Rest 2 min, slice."),
    ],
  },
  leftovers_pizza: {
    title: "What's in the Fridge Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "Clear the walk-in — any cooked proteins, cheese, and veg become a hall pie. Fast between calls.",
    sauce: [ing("Tomato sauce, BBQ, or olive oil", "as needed")],
    cheese: [ing("Any shredded cheese on hand", "3–4 cups")],
    toppings: [ing("Cooked proteins", "as available"), ing("Vegetables", "as available")],
    drizzles: [ing("Open bottles in the fridge", "optional")],
    build_steps: [
      step("Audit the fridge (no heat, 8 min)", "Pull cooked meats, cheeses, and veg. Chop evenly. Pat wet items dry. Pick one base sauce."),
      PREHEAT,
      STRETCH,
      step("Build (5 min)", "Don't overload — thinner layers bake through. Leave a border."),
      BAKE("12–16"),
      step("Serve", "Name the pie after whatever you used. Rest 2 min, slice."),
    ],
  },
  build_your_own: {
    title: "Build Your Own Hall Pizza",
    dough_type: "Premade pizza dough balls",
    why_this_works: "The crew votes toppings — you supply the framework and oven timing for a perfect base every time.",
    sauce: [ing("Sauce of choice", "1 cup")],
    cheese: [ing("Cheese of choice", "4 cups")],
    toppings: [ing("Crew-selected toppings", "see vote")],
    drizzles: [ing("Finishing sauces", "optional")],
    build_steps: [
      step("Crew vote (no heat, 5 min)", "Vote crust style, sauce, cheese, and up to 4 toppings. Assign prep roles."),
      PREHEAT,
      STRETCH,
      step("Build as voted (8 min)", "Follow the crew map — sauce thin, cheese even, toppings balanced for even baking."),
      BAKE("12–16"),
      step("Serve", "Announce the winning combo. Rest 2 min, slice."),
    ],
  },
  nutella_dessert: {
    title: "Nutella Dessert Pizza",
    dough_type: "Pizza dough or sweet dough",
    why_this_works: "Post-shift dessert — warm Nutella, berries, and powdered sugar. Lower oven temp prevents burning.",
    sauce: [ing("Nutella", "1 cup")],
    cheese: [ing("Mini marshmallows (optional)", "2 cups")],
    toppings: [ing("Strawberries, sliced", "2 cups")],
    drizzles: [ing("Powdered sugar", "2 tbsp")],
    build_steps: [
      step("Prep (no heat, 8 min)", "Slice strawberries. Warm Nutella slightly so it spreads."),
      step("Preheat (400°F, 12 min)", "Dessert pies bake lower — 400°F prevents chocolate from scorching."),
      STRETCH,
      step("Build (4 min)", "Spread Nutella thinly. Add marshmallows if using — keep away from edges."),
      step("Bake (400°F, 8–10 min)", "Bake until dough is cooked through and edges golden. Chocolate should look glossy, not burnt."),
      step("Finish", "Top with strawberries and powdered sugar. Cool 3 min before slicing — filling is hot."),
    ],
    prep_minutes: 15,
    bake_minutes: 10,
  },
};

export function metaAwareGenericTemplate(conceptId: string): PizzaTemplateDef {
  const meta = getPizzaConceptMeta(conceptId);
  const label = meta?.title ?? conceptId.replace(/_/g, " ");
  return {
    title: label,
    dough_type: "Premade pizza dough balls",
    why_this_works:
      meta?.crewFavorite
        ? `${label} — a crew favourite built for a busy hall oven. Feeds ${meta?.badges.includes("Feeds 4–8") ? "the whole shift" : "hungry firefighters"} between calls.`
        : `${label} — hall-tested pizza built for your oven and crew size.`,
    sauce: [ing(meta?.sauceStyle.includes("BBQ") ? "BBQ sauce" : meta?.sauceStyle.includes("Buffalo") ? "Buffalo sauce" : meta?.sauceStyle.includes("white") || meta?.sauceStyle.includes("Alfredo") ? "Garlic cream sauce" : "Pizza sauce", "1¼ cups")],
    cheese: [ing("Shredded mozzarella", "4 cups")],
    toppings: [ing("Protein and vegetables per recipe", "see hall prep"), ing("Red onion", "1 medium")],
    drizzles: meta?.dippingSauces[0] ? [ing(meta.dippingSauces[0], "¼ cup")] : [ing("Olive oil", "2 tbsp")],
    build_steps: [],
  };
}
