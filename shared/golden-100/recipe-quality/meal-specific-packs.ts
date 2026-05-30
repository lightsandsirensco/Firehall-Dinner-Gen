/**
 * Hand-written slug packs — replaces generic class blueprints for known template leaks.
 */

import type { GoldenRecipeDefinition } from "../types.js";
import type { GoldenRecipePageIngredient, GoldenRecipePageStep } from "../recipe-page-schema.js";

import { GOLDEN_P0_CLASSIC_PACKS } from "./golden-p0-classic-packs.js";
import type { MealSpecificPack } from "./golden-p0-classic-packs.js";
import { PIZZA_NIGHT_PACKS } from "./pizza-night-packs.js";

type Ing = GoldenRecipePageIngredient;
type Step = GoldenRecipePageStep;
export type { MealSpecificPack };
type Pack = MealSpecificPack;

function m(name: string, quantity: number, unit: string, group?: string, notes?: string): Ing {
  return { name, quantity: String(quantity), unit, group, notes };
}

function mult(n: number, scale: number): number {
  return Math.round(n * scale * 10) / 10;
}

function step(
  n: number,
  title: string,
  instruction: string,
  minutes: number,
  heatLevel: Step["heatLevel"] = "",
): Step {
  return { stepNumber: n, title, instruction, minutes, heatLevel };
}

const PACKS: Record<string, (scale: number, def: GoldenRecipeDefinition) => Pack> = {
  "loaded-baked-potato-bar": (scale) => ({
    ingredients: [
      m("Russet potatoes, scrubbed", mult(24, scale), "count", "Base"),
      m("Unsalted butter, softened", mult(2, scale), "cups", "Toppings"),
      m("Shredded sharp cheddar", mult(16, scale), "oz", "Toppings"),
      m("Thick-cut bacon, cooked and crumbled", mult(2, scale), "lb", "Toppings"),
      m("Sour cream", mult(2, scale), "cups", "Toppings"),
      m("Green onions, sliced", mult(6, scale), "bunches", "Toppings"),
      m("Warm chili or pulled beef (optional)", mult(2, scale), "lb", "Optional topping"),
    ],
    steps: [
      step(1, "Scrub and poke potatoes", "Scrub russet potatoes dry. Poke each potato 6–8 times with a fork so steam escapes. Rub skins with vegetable oil and coarse salt — this gives crackly jackets.", 15),
      step(2, "Bake until fork-tender", "Bake directly on the oven rack at 400°F for 50–65 minutes until a skewer slides in with no resistance. Wrap finished potatoes in foil and hold at 200°F — do not stack hot potatoes or skins go soggy.", 60, "medium"),
      step(3, "Prep the topping station", "Line up butter, shredded cheddar, crumbled bacon, sour cream, and green onions in separate bowls with serving spoons. Keep warm toppings near the potatoes; keep sour cream cold on ice if service runs long.", 15),
      step(4, "Run the potato bar", "Split hot potatoes with a cross-cut and fluff the insides with a fork. Crew builds their own: butter first, then cheddar so it melts, then bacon, sour cream, and green onions. Loaded Baked Potato Bar works best as a self-serve line down the counter.", 10, "low"),
    ],
  }),

  "loaded-potato-feed": (scale) => ({
    ingredients: [
      m("Russet potatoes, scrubbed", mult(40, scale), "count", "Base", "large crew feed"),
      m("Unsalted butter, softened", mult(3, scale), "cups", "Toppings"),
      m("Shredded cheddar blend", mult(24, scale), "oz", "Toppings"),
      m("Crispy bacon, crumbled", mult(3, scale), "lb", "Toppings"),
      m("Sour cream", mult(3, scale), "cups", "Toppings"),
      m("Green onions, sliced", mult(8, scale), "bunches", "Toppings"),
      m("Warm pulled beef or chili", mult(4, scale), "lb", "Protein topping"),
    ],
    steps: [
      step(1, "Stage two oven racks", "Heat two ovens (or rotate batches) to 400°F. Scrub and poke all russets; oil and salt the skins. For twenty-plus eaters, bake in waves on sheet pans if rack space is tight.", 20),
      step(2, "Bake potatoes in batches", "Bake 50–65 minutes until fork-tender. Transfer finished potatoes to foil-lined cambros at 200°F while the next batch bakes. Never cover hot potatoes tightly — steam softens skins.", 65, "medium"),
      step(3, "Set a long topping line", "Arrange butter, cheddar, bacon, sour cream, green onions, and warm pulled beef in a row with labels. Put a trash can and extra forks at the end — this feed gets messy in the best way.", 20),
      step(4, "Serve family-style", "Call the crew when the first cambro is full. Split potatoes at the line; let everyone build their own loaded spud. Refill toppings before the pan looks empty — empty cheddar bowls cause hall riots.", 15, "low"),
    ],
  }),

  "game-day-nachos": (scale) => ({
    ingredients: [
      m("Restaurant-style tortilla chips", mult(4, scale), "lb", "Base"),
      m("Ground beef (80/20)", mult(3, scale), "lb", "Main"),
      m("Taco seasoning", mult(4, scale), "tbsp", "Seasoning"),
      m("Shredded Mexican cheese blend", mult(20, scale), "oz", "Cheese"),
      m("Pickled jalapeños, sliced", mult(2, scale), "cups", "Toppings"),
      m("Fresh pico de gallo", mult(3, scale), "cups", "Toppings"),
      m("Sour cream", mult(2, scale), "cups", "Toppings"),
    ],
    steps: [
      step(1, "Brown the beef", "Brown ground beef in a large skillet over medium-high, breaking it into fine crumbles. Drain excess grease — wet beef makes soggy chips. Stir in taco seasoning and ½ cup water; simmer 5 minutes until saucy.", 15, "medium-high"),
      step(2, "Build chip trays", "Spread chips in a single layer on two full-size sheet pans — double layers steam instead of crisp. Scatter half the cheese over chips.", 10),
      step(3, "Melt and load", "Broil at 450°F 3–4 minutes until cheese bubbles at the edges. Pull pans, add seasoned beef, remaining cheese, and jalapeños. Broil 2 more minutes until cheese is fully melted.", 8, "high"),
      step(4, "Serve immediately", "Top with pico and sour cream at the table — not before, or chips wilt. Loaded Game Day Nachos die fast; make a second tray when the first is half gone.", 5, "low"),
    ],
  }),

  "loaded-nacho-skillet": (scale) => ({
    ingredients: [
      m("Ground beef (80/20)", mult(2.5, scale), "lb", "Main"),
      m("Yellow onion, diced", mult(1, scale), "large", "Aromatics"),
      m("Taco seasoning", mult(3, scale), "tbsp", "Seasoning"),
      m("Tortilla chips", mult(2, scale), "lb", "Base"),
      m("Shredded cheddar", mult(12, scale), "oz", "Cheese"),
      m("Black beans, drained", mult(2, scale), "cans", "Toppings"),
      m("Pickled jalapeños", mult(1, scale), "cup", "Toppings"),
    ],
    steps: [
      step(1, "Brown beef and onion", "In a 12-inch cast iron skillet over medium-high, brown ground beef with diced onion until no pink remains. Drain grease. Add taco seasoning and ⅓ cup water; simmer until thick.", 14, "medium-high"),
      step(2, "Layer chips and cheese", "Off heat, scatter tortilla chips over the beef in the skillet. Top with black beans, shredded cheddar, and jalapeños.", 5),
      step(3, "Bake until bubbling", "Bake at 425°F 8–10 minutes until cheese is fully melted and edges bubble. Watch the broiler side — cast iron holds heat and can burn chip edges fast.", 10, "high"),
      step(4, "Serve from the skillet", "Set the hot skillet on a trivet at the table with sour cream and salsa on the side. Loaded Nacho Skillet is communal — provide a big spoon and expect fingers.", 3, "low"),
    ],
  }),

  "bbq-chicken-bowls": (scale) => ({
    ingredients: [
      m("Long-grain rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("BBQ rub", mult(3, scale), "tbsp", "Seasoning"),
      m("BBQ sauce", mult(1.5, scale), "cups", "Sauce"),
      m("Corn kernels", mult(3, scale), "cups", "Toppings"),
      m("Coleslaw mix", mult(2, scale), "lb", "Toppings"),
    ],
    steps: [
      step(1, "Cook the rice", "Rinse rice until water runs clear. Simmer with 1:1.5 rice-to-water ratio and salt 18 minutes; fluff and hold covered at 200°F.", 20, "medium"),
      step(2, "Grill the chicken thighs", "Season chicken thighs with BBQ rub. Grill over medium-high 5–7 minutes per side until char marks show and thickest part reads 165°F. Rest 5 minutes; slice into strips.", 18, "medium-high"),
      step(3, "Warm the BBQ sauce", "Warm BBQ sauce in a small pot over low heat — do not boil or sugars scorch. Keep a ladle on the line.", 5, "low"),
      step(4, "Build the bowls", "Base of rice, sliced BBQ chicken, corn, and a pile of coleslaw on top for crunch. Drizzle extra sauce on the side. BBQ Chicken Bowls move fastest when hot and cold components are in separate pans.", 8),
    ],
  }),

  "greek-chicken-bowls": (scale) => ({
    ingredients: [
      m("Basmati rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("Greek seasoning", mult(3, scale), "tbsp", "Seasoning"),
      m("Cherry tomatoes, halved", mult(2, scale), "pints", "Toppings"),
      m("English cucumber, diced", mult(2, scale), "count", "Toppings"),
      m("Feta cheese, crumbled", mult(8, scale), "oz", "Toppings"),
      m("Tzatziki sauce", mult(2, scale), "cups", "Sauce"),
    ],
    steps: [
      step(1, "Cook basmati rice", "Rinse basmati until water runs clear. Simmer 1:1.75 rice to water 15 minutes; rest covered 10 minutes, then fluff.", 25, "medium"),
      step(2, "Grill seasoned chicken", "Toss chicken thighs with Greek seasoning and olive oil. Grill over medium-high 5–7 minutes per side until 165°F in the thickest part. Rest and slice.", 18, "medium-high"),
      step(3, "Prep cold toppings", "Halve cherry tomatoes, dice cucumber, and crumble feta into separate bowls. Keep tzatziki cold on ice until service.", 12),
      step(4, "Assemble Greek bowls", "Rice base, sliced chicken, tomatoes, cucumber, feta, and a generous spoon of tzatziki. Greek Chicken Bowls stay bright when cold toppings go on at the last second.", 8),
    ],
  }),

  "ginger-salmon-bowls": (scale) => ({
    ingredients: [
      m("Jasmine rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Skin-on salmon fillets", mult(3, scale), "lb", "Main"),
      m("Fresh ginger, grated", mult(3, scale), "tbsp", "Sauce"),
      m("Soy sauce", mult(0.5, scale), "cup", "Sauce"),
      m("Honey", mult(3, scale), "tbsp", "Sauce"),
      m("Broccoli florets", mult(2, scale), "lb", "Veg"),
      m("Sesame seeds", mult(2, scale), "tbsp", "Garnish"),
    ],
    steps: [
      step(1, "Cook jasmine rice", "Rinse jasmine rice; cook 1:1.25 with water 15 minutes. Fluff and hold covered.", 18, "medium"),
      step(2, "Sear salmon fillets", "Pat salmon fillets dry; salt lightly. Sear skin-side down in a hot oiled skillet 4 minutes until skin crisps. Flip; cook 2–3 minutes until center is 125°F for medium or 145°F if the crew prefers well-done.", 10, "medium-high"),
      step(3, "Steam broccoli and glaze", "Steam broccoli 4 minutes until bright green. Whisk soy, grated ginger, and honey; brush over salmon in the last minute of cooking.", 8, "medium"),
      step(4, "Build ginger salmon bowls", "Rice, flaked salmon, broccoli, extra ginger glaze, and sesame seeds. Ginger Salmon Rice Bowls taste best when the glaze is warm and broccoli still has snap.", 6),
    ],
  }),

  "mediterranean-chickpea": (scale) => ({
    ingredients: [
      m("Quinoa, uncooked", mult(2, scale), "cups", "Base"),
      m("Chickpeas, drained and rinsed", mult(4, scale), "cans", "Main"),
      m("Cherry tomatoes, halved", mult(2, scale), "pints", "Veg"),
      m("Cucumber, diced", mult(2, scale), "count", "Veg"),
      m("Red onion, thinly sliced", mult(1, scale), "large", "Veg"),
      m("Feta cheese, crumbled", mult(8, scale), "oz", "Toppings"),
      m("Lemon-tahini dressing", mult(1.5, scale), "cups", "Sauce"),
    ],
    steps: [
      step(1, "Cook quinoa", "Rinse quinoa; simmer in salted water 15 minutes until tails pop. Spread on a sheet pan to cool slightly so it does not steam the toppings soggy.", 18, "medium"),
      step(2, "Crisp the chickpeas", "Toss drained chickpeas with olive oil, cumin, and salt. Roast at 425°F 20–25 minutes until golden and crisp on the outside.", 25, "high"),
      step(3, "Prep vegetables", "Halve tomatoes, dice cucumber, and soak red onion slices in cold water 10 minutes to tame bite; drain well.", 12),
      step(4, "Build chickpea bowls", "Quinoa base, crisp chickpeas, vegetables, crumbled feta, and lemon-tahini drizzle. Mediterranean Chickpea Bowls stay plant-forward and filling without feeling like a sad salad.", 8),
    ],
  }),

  "performance-burrito-bowls": (scale) => ({
    ingredients: [
      m("Brown rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Boneless chicken breasts", mult(3, scale), "lb", "Main"),
      m("Black beans, drained", mult(3, scale), "cans", "Toppings"),
      m("Corn kernels", mult(2, scale), "cups", "Toppings"),
      m("Pico de gallo", mult(2, scale), "cups", "Toppings"),
      m("Shredded lettuce", mult(1, scale), "head", "Toppings"),
      m("Lime wedges", mult(6, scale), "count", "Finish"),
    ],
    steps: [
      step(1, "Cook brown rice", "Simmer brown rice in salted water 40–45 minutes until tender; fluff and hold warm.", 45, "medium-low"),
      step(2, "Grill chicken breasts", "Season chicken breasts with cumin, chili powder, salt, and pepper. Grill over medium-high 6–7 minutes per side until 165°F. Rest 5 minutes; dice.", 20, "medium-high"),
      step(3, "Warm beans and corn", "Heat black beans and corn in separate pans with a splash of water and salt. Keep pico and lettuce cold.", 10, "medium"),
      step(4, "Build burrito bowls", "Brown rice, diced chicken, beans, corn, lettuce, and pico. Squeeze lime at the line. Performance Chicken Burrito Bowls hit macros without tasting like punishment.", 8),
    ],
  }),

  "bulgogi-bowls": (scale) => ({
    ingredients: [
      m("Short-grain rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Ribeye or sirloin, thinly sliced", mult(3, scale), "lb", "Main"),
      m("Soy sauce", mult(0.5, scale), "cup", "Marinade"),
      m("Brown sugar", mult(3, scale), "tbsp", "Marinade"),
      m("Sesame oil", mult(2, scale), "tbsp", "Marinade"),
      m("Kimchi", mult(2, scale), "cups", "Toppings"),
      m("Cucumber, julienned", mult(2, scale), "count", "Toppings"),
    ],
    steps: [
      step(1, "Marinate sliced beef", "Toss thinly sliced ribeye with soy sauce, brown sugar, grated pear or apple, garlic, and sesame oil. Marinate 20 minutes while rice cooks.", 25),
      step(2, "Cook short-grain rice", "Rinse rice; cook 1:1.25 with water 15 minutes. Rest covered 10 minutes.", 25, "medium"),
      step(3, "Sear bulgogi in batches", "Heat a cast iron skillet until smoking. Sear beef in single layers 2–3 minutes per side until caramelized edges appear — do not crowd or meat steams instead of chars.", 12, "high"),
      step(4, "Build bulgogi bowls", "Rice, seared beef, kimchi, and julienned cucumber. Korean Bulgogi Rice Bowls need that char on the beef — batch the skillet if the crew is hungry.", 6),
    ],
  }),

  "street-corn-chicken": (scale) => ({
    ingredients: [
      m("Jasmine rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("Corn kernels", mult(3, scale), "cups", "Veg"),
      m("Mayonnaise", mult(0.5, scale), "cup", "Elote sauce"),
      m("Cotija cheese, crumbled", mult(6, scale), "oz", "Toppings"),
      m("Chili powder", mult(2, scale), "tsp", "Seasoning"),
      m("Lime wedges", mult(6, scale), "count", "Finish"),
    ],
    steps: [
      step(1, "Cook jasmine rice", "Rinse and cook jasmine rice 1:1.25 with water 15 minutes; fluff and hold warm.", 18, "medium"),
      step(2, "Grill chicken and char corn", "Season chicken thighs with chili powder, salt, and cumin; grill to 165°F. Char corn in a dry skillet 4–5 minutes until blistered.", 18, "medium-high"),
      step(3, "Mix elote sauce", "Stir mayo, cotija, lime juice, and chili powder into charred corn until creamy.", 8),
      step(4, "Build street corn bowls", "Rice, sliced chicken, elote corn, extra cotija, and lime wedges. Mexican Street Corn Chicken Bowls should taste like elote in a bowl — bright, salty, and a little messy.", 8),
    ],
  }),

  "teriyaki-donburi": (scale) => ({
    ingredients: [
      m("Short-grain rice, uncooked", mult(3, scale), "cups", "Base"),
      m("Boneless chicken thighs", mult(3, scale), "lb", "Main"),
      m("Teriyaki sauce", mult(1.5, scale), "cups", "Glaze"),
      m("Broccoli florets", mult(2, scale), "lb", "Veg"),
      m("Sesame seeds", mult(2, scale), "tbsp", "Garnish"),
      m("Green onions, sliced", mult(4, scale), "count", "Garnish"),
    ],
    steps: [
      step(1, "Steam rice", "Cook short-grain rice 1:1.25 with water; keep covered and warm.", 18, "medium"),
      step(2, "Sear chicken thighs", "Pat chicken thighs dry; sear in oiled skillet over medium-high 5 minutes skin-side down until golden. Flip; cook 4 more minutes.", 12, "medium-high"),
      step(3, "Glaze and steam broccoli", "Add teriyaki sauce to the pan; simmer 3–4 minutes until chicken reads 165°F and sauce thickens to a glaze. Steam broccoli 4 minutes until bright green.", 10, "medium"),
      step(4, "Build donburi bowls", "Mound rice in bowls, slice glazed chicken over top, add broccoli, sesame seeds, and green onions. Teriyaki Chicken Donburi should glisten — thin with a splash of sauce if it tightens too much.", 6),
    ],
  }),

  "butter-chicken": (scale) => ({
    ingredients: [
      m("Boneless chicken thighs, cubed", mult(3, scale), "lb", "Main"),
      m("Greek yogurt", mult(1, scale), "cup", "Marinade"),
      m("Garam masala", mult(2, scale), "tbsp", "Spices"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce"),
      m("Heavy cream", mult(1, scale), "cup", "Sauce"),
      m("Unsalted butter", mult(4, scale), "tbsp", "Sauce"),
      m("Basmati rice, uncooked", mult(3, scale), "cups", "Base"),
    ],
    steps: [
      step(1, "Marinate chicken", "Toss cubed chicken thighs with yogurt, garam masala, garlic, ginger, and salt. Rest 30 minutes (or overnight in the fridge).", 35),
      step(2, "Sear marinated chicken", "Sear chicken in butter over medium-high in batches until golden — not fully cooked through. Set aside.", 12, "medium-high"),
      step(3, "Simmer the makhani sauce", "In the same pot, melt butter; add crushed tomatoes, cream, and remaining spices. Simmer 15 minutes until silky. Return chicken; cook 10 minutes until 165°F.", 25, "medium"),
      step(4, "Serve over rice", "Cook basmati separately. Ladle butter chicken over rice with cilantro. The sauce should coat a spoon — add cream if it breaks.", 8, "low"),
    ],
  }),

  "chicken-tikka-masala": (scale) => ({
    ingredients: [
      m("Boneless chicken thighs, cubed", mult(3, scale), "lb", "Main"),
      m("Tikka marinade (yogurt, spices)", mult(2, scale), "cups", "Marinade"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce"),
      m("Heavy cream", mult(1, scale), "cup", "Sauce"),
      m("Yellow onion, diced", mult(1, scale), "large", "Aromatics"),
      m("Basmati rice, uncooked", mult(3, scale), "cups", "Base"),
    ],
    steps: [
      step(1, "Marinate chicken", "Coat cubed chicken thighs in tikka marinade; rest at least 30 minutes.", 35),
      step(2, "Char the chicken", "Broil or grill marinated chicken on racks until edges char and centers reach 165°F.", 15, "high"),
      step(3, "Build the masala", "Sweat diced onion in oil 8 minutes. Add crushed tomatoes and cream; simmer 15 minutes. Fold in charred chicken; simmer 10 minutes more.", 25, "medium"),
      step(4, "Serve with basmati", "Fluff basmati rice. Ladle tikka masala over rice with naan on the side if you have it.", 8),
    ],
  }),

  "meatloaf-mashed": (scale) => ({
    ingredients: [
      m("Ground beef (80/20)", mult(4, scale), "lb", "Main"),
      m("Breadcrumbs", mult(2, scale), "cups", "Binders"),
      m("Eggs", mult(3, scale), "count", "Binders"),
      m("Ketchup glaze", mult(1, scale), "cup", "Glaze"),
      m("Russet potatoes", mult(5, scale), "lb", "Sides"),
      m("Butter and milk", mult(1, scale), "batch", "Mashed potatoes"),
    ],
    steps: [
      step(1, "Mix the meatloaf", "Combine ground beef, breadcrumbs, eggs, diced onion, salt, and pepper. Shape into two loaves on sheet pans — two loaves cook faster and slice cleaner for a crew.", 15),
      step(2, "Bake the loaves", "Bake at 375°F 50–60 minutes until internal temp hits 160°F and glaze caramelizes. Rest 10 minutes before slicing.", 60, "medium"),
      step(3, "Boil and mash potatoes", "Boil peeled russets until fork-tender. Drain; mash with butter and warm milk until smooth. Season aggressively — bland mash kills comfort food morale.", 25, "medium"),
      step(4, "Plate family-style", "Slice meatloaf on a tray; serve mashed potatoes in a warm cambro. Meatloaf & Mashed is pure hall comfort — extra ketchup on the table, no questions asked.", 8, "low"),
    ],
  }),

  "shepherds-pie": (scale) => ({
    ingredients: [
      m("Ground lamb or beef", mult(4, scale), "lb", "Main"),
      m("Yellow onion, diced", mult(2, scale), "large", "Aromatics"),
      m("Frozen peas and carrots", mult(4, scale), "cups", "Veg"),
      m("Beef broth", mult(2, scale), "cups", "Sauce"),
      m("Russet potatoes", mult(5, scale), "lb", "Topping"),
      m("Butter and cream", mult(1, scale), "batch", "Potato topping"),
    ],
    steps: [
      step(1, "Brown the filling", "Brown ground lamb with diced onion until deeply colored. Drain excess fat. Add peas, carrots, broth, and tomato paste; simmer 15 minutes until thick.", 25, "medium-high"),
      step(2, "Mash the topping", "Boil russets until tender; mash with butter and cream until smooth. Season with salt and white pepper.", 25, "medium"),
      step(3, "Assemble and bake", "Spread filling in hotel pans; pipe or spread mashed potatoes over top. Fork ridges for crispy peaks. Bake at 400°F 25–30 minutes until golden and bubbling at edges.", 30, "high"),
      step(4, "Rest before serving", "Rest 10 minutes so filling sets — scoops stay clean on the line. Shepherd's Pie feeds a hall that wants something hearty after a cold call.", 10, "low"),
    ],
  }),

  "stuffed-peppers": (scale) => ({
    ingredients: [
      m("Bell peppers, halved and seeded", mult(12, scale), "count", "Main"),
      m("Ground beef (85/15)", mult(3, scale), "lb", "Filling"),
      m("Cooked rice", mult(3, scale), "cups", "Filling"),
      m("Crushed tomatoes", mult(1, scale), "can", "Sauce"),
      m("Shredded mozzarella", mult(12, scale), "oz", "Topping"),
    ],
    steps: [
      step(1, "Prep pepper boats", "Halve bell peppers lengthwise; remove seeds. Blanch in boiling water 3 minutes; drain cut-side down on towels.", 12, "medium"),
      step(2, "Brown beef filling", "Brown ground beef with onion and garlic. Stir in cooked rice, crushed tomatoes, and Italian seasoning; simmer 10 minutes until thick.", 18, "medium-high"),
      step(3, "Fill and top", "Mound beef-rice filling into pepper halves on sheet pans. Top with shredded mozzarella.", 12),
      step(4, "Bake until tender", "Bake at 375°F 25–30 minutes until peppers are tender and cheese bubbles. Stuffed Peppers slice cleanly if filling is tight — drain excess liquid before baking.", 30, "medium"),
    ],
  }),

  "enchilada-casserole": (scale) => ({
    ingredients: [
      m("Ground beef (80/20)", mult(3, scale), "lb", "Main"),
      m("Corn tortillas", mult(24, scale), "count", "Layers"),
      m("Red enchilada sauce", mult(4, scale), "cups", "Sauce"),
      m("Shredded cheddar", mult(16, scale), "oz", "Cheese"),
      m("Black olives, sliced", mult(1, scale), "cup", "Topping"),
    ],
    steps: [
      step(1, "Brown seasoned beef", "Brown ground beef with taco seasoning and diced onion. Drain grease; stir in 1 cup enchilada sauce.", 15, "medium-high"),
      step(2, "Layer the casserole", "In a deep hotel pan: sauce, tortillas torn to fit, beef, cheese — repeat twice. Finish with sauce and cheese on top.", 15),
      step(3, "Bake until bubbling", "Bake covered at 375°F 30 minutes; uncover and bake 15 more until cheese browns at edges.", 45, "medium"),
      step(4, "Rest and scoop", "Rest 10 minutes so layers set. Scoop Enchilada Casserole with a square spatula — it should hold its shape, not slide like soup.", 10, "low"),
    ],
  }),

  "chicken-pot-pie": (scale) => ({
    ingredients: [
      m("Boneless chicken thighs, diced", mult(3, scale), "lb", "Main"),
      m("Frozen peas and carrots", mult(4, scale), "cups", "Veg"),
      m("Yellow onion, diced", mult(1, scale), "large", "Aromatics"),
      m("Chicken broth", mult(4, scale), "cups", "Sauce"),
      m("Pie crust or puff pastry", mult(2, scale), "sheets", "Top"),
      m("Butter and flour", mult(1, scale), "batch", "Roux"),
    ],
    steps: [
      step(1, "Cook the chicken", "Simmer diced chicken thighs in salted broth until 165°F; shred or dice. Reserve broth.", 20, "medium"),
      step(2, "Make the velouté", "Melt butter; whisk flour 2 minutes. Whisk in 3 cups broth until thick. Fold in chicken, peas, carrots, and onion.", 15, "medium"),
      step(3, "Top and bake", "Transfer filling to hotel pans; cover with pie crust or puff pastry. Vent slits. Brush with egg wash.", 12),
      step(4, "Bake until golden", "Bake at 400°F 30–35 minutes until crust is deep golden and filling bubbles at vents. Rest 10 minutes — molten filling burns tongues.", 35, "high"),
    ],
  }),

  "creamy-tuscan-chicken": (scale) => ({
    ingredients: [
      m("Boneless chicken breasts", mult(3, scale), "lb", "Main"),
      m("Sun-dried tomatoes, chopped", mult(0.5, scale), "cup", "Sauce"),
      m("Fresh spinach", mult(8, scale), "oz", "Veg"),
      m("Heavy cream", mult(1.5, scale), "cups", "Sauce"),
      m("Parmesan, grated", mult(4, scale), "oz", "Sauce"),
      m("Garlic cloves, minced", mult(5, scale), "cloves", "Aromatics"),
    ],
    steps: [
      step(1, "Sear chicken breasts", "Season chicken breasts; sear in olive oil over medium-high 6 minutes per side until 165°F. Rest and slice.", 18, "medium-high"),
      step(2, "Build Tuscan cream sauce", "In the same pan, sauté garlic and sun-dried tomatoes 1 minute. Add cream and parmesan; simmer until coats a spoon.", 10, "medium"),
      step(3, "Wilt spinach", "Fold spinach into sauce until just wilted — bright green, not army drab.", 3, "medium"),
      step(4, "Serve over pasta or rice", "Return sliced chicken to sauce. Serve over penne or rice with extra parmesan. Creamy Tuscan Chicken should smell like garlic and wine, not boiled cream.", 5, "low"),
    ],
  }),

  "moroccan-meatballs": (scale) => ({
    ingredients: [
      m("Ground lamb or beef", mult(3, scale), "lb", "Main"),
      m("Couscous, dry", mult(2, scale), "cups", "Base"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce"),
      m("Ras el hanout", mult(2, scale), "tbsp", "Spices"),
      m("Fresh cilantro", mult(1, scale), "bunch", "Garnish"),
    ],
    steps: [
      step(1, "Mix and brown meatballs", "Combine ground meat with ras el hanout, egg, and breadcrumbs. Roll golf-ball size; brown in batches in a Dutch oven.", 20, "medium-high"),
      step(2, "Simmer in tomato sauce", "Add crushed tomatoes and 1 cup water. Simmer covered 25 minutes until meatballs read 160°F and sauce thickens.", 30, "medium-low"),
      step(3, "Steam couscous", "Pour boiling salted water over couscous; cover 5 minutes. Fluff with fork.", 8),
      step(4, "Serve over couscous", "Mound couscous; ladle meatballs and sauce. Top with cilantro. Moroccan Meatballs should smell warm and spiced — not like plain tomato sauce.", 6, "low"),
    ],
  }),

  "beef-broccoli": (scale) => ({
    ingredients: [
      m("Flank steak, sliced thin", mult(3, scale), "lb", "Main"),
      m("Broccoli florets", mult(2, scale), "lb", "Veg"),
      m("Soy sauce", mult(0.33, scale), "cup", "Sauce"),
      m("Oyster sauce", mult(3, scale), "tbsp", "Sauce"),
      m("Garlic cloves, minced", mult(5, scale), "cloves", "Aromatics"),
      m("Cornstarch", mult(2, scale), "tbsp", "Sauce"),
    ],
    steps: [
      step(1, "Slice and marinate beef", "Slice flank steak thin against the grain. Toss with soy, cornstarch, and a splash of oil.", 15),
      step(2, "Stir-fry beef in batches", "Heat wok or large skillet until smoking. Sear beef in single layers 1–2 minutes until edges char; remove.", 10, "high"),
      step(3, "Char broccoli", "Stir-fry broccoli 3–4 minutes with garlic until bright with charred edges. Return beef; add oyster sauce slurry; toss 1 minute until glossy.", 8, "high"),
      step(4, "Serve over rice", "Serve Beef & Broccoli immediately over steamed rice — the sauce tightens if it sits.", 5),
    ],
  }),

  "pad-thai": (scale) => ({
    ingredients: [
      m("Rice noodles, soaked", mult(2, scale), "lb", "Base"),
      m("Large shrimp, peeled", mult(2, scale), "lb", "Main"),
      m("Eggs", mult(4, scale), "count", "Main"),
      m("Bean sprouts", mult(3, scale), "cups", "Veg"),
      m("Pad Thai sauce (tamarind, fish sauce, sugar)", mult(1, scale), "cup", "Sauce"),
      m("Roasted peanuts, crushed", mult(0.5, scale), "cup", "Garnish"),
    ],
    steps: [
      step(1, "Soak rice noodles", "Soak rice noodles in hot water 20 minutes until pliable; drain.", 20),
      step(2, "Sear shrimp and scramble eggs", "Sear shrimp in hot oil until pink; push aside. Scramble eggs in the same wok; break into pieces.", 8, "high"),
      step(3, "Toss noodles and sauce", "Add noodles and pad Thai sauce; toss over high heat 2–3 minutes until noodles absorb sauce and char slightly.", 5, "high"),
      step(4, "Finish with crunch", "Fold in bean sprouts and peanuts off heat. Serve with lime wedges. Pad Thai should be tangy, salty, and a little sweet — not oily.", 5),
    ],
  }),

  "thai-basil-chicken": (scale) => ({
    ingredients: [
      m("Ground chicken or thigh, minced", mult(3, scale), "lb", "Main"),
      m("Thai basil leaves", mult(2, scale), "cups", "Herbs"),
      m("Garlic cloves, minced", mult(6, scale), "cloves", "Aromatics"),
      m("Fish sauce", mult(3, scale), "tbsp", "Sauce"),
      m("Oyster sauce", mult(2, scale), "tbsp", "Sauce"),
      m("Bird's eye chilies, sliced", mult(4, scale), "count", "Heat"),
    ],
    steps: [
      step(1, "Prep stir-fry mise", "Mince garlic and chilies. Pick basil leaves; leave stems behind — they taste bitter.", 10),
      step(2, "Sear ground chicken", "Heat wok until smoking. Sear minced chicken in batches, breaking into crumbles until no pink remains.", 10, "high"),
      step(3, "Glaze and basil", "Add garlic, chilies, fish sauce, and oyster sauce; toss 1 minute. Pull off heat; fold in Thai basil until wilted.", 4, "high"),
      step(4, "Serve over jasmine rice", "Serve Thai Basil Chicken over steamed jasmine rice with fried eggs on top if the crew wants extra protein.", 5),
    ],
  }),

  "philly-cheesesteak-skillet": (scale) => ({
    ingredients: [
      m("Ribeye or sirloin, sliced thin", mult(3, scale), "lb", "Main"),
      m("Hoagie rolls", mult(8, scale), "count", "Buns"),
      m("Provolone slices", mult(16, scale), "count", "Cheese"),
      m("Bell peppers, sliced", mult(2, scale), "count", "Veg"),
      m("Yellow onion, sliced", mult(2, scale), "large", "Veg"),
    ],
    steps: [
      step(1, "Slice beef paper-thin", "Partially freeze ribeye 20 minutes; slice as thin as possible against the grain.", 25),
      step(2, "Sear beef and peppers", "Hot cast iron: sear beef in batches with onions and peppers until edges char. Season with salt and pepper.", 12, "high"),
      step(3, "Melt provolone", "Pile beef mixture; lay provolone over top. Cover 1 minute until cheese melts into the meat.", 3, "medium"),
      step(4, "Fill hoagies", "Scoop into toasted hoagie rolls. Philly Cheesesteak Skillet should drip a little — that's the point.", 5, "low"),
    ],
  }),

  "fast-philly-skillet": (scale) => ({
    ingredients: [
      m("Deli roast beef or shaved steak", mult(3, scale), "lb", "Main"),
      m("Hoagie rolls", mult(8, scale), "count", "Buns"),
      m("Provolone slices", mult(12, scale), "count", "Cheese"),
      m("Onion and pepper mix, frozen", mult(1, scale), "bag", "Veg"),
      m("Vegetable oil", mult(2, scale), "tbsp", "Cooking"),
      m("Kosher salt and black pepper", mult(1, scale), "batch", "Seasoning"),
    ],
    steps: [
      step(1, "Heat the flat-top", "Preheat cast iron or flat-top to medium-high. This is a shift-night shortcut — speed over perfection.", 5, "medium-high"),
      step(2, "Sear beef and peppers", "Sear shaved beef with frozen pepper-onion mix 6–8 minutes until beef edges crisp and vegetables soften. Season with salt and pepper.", 8, "high"),
      step(3, "Melt provolone", "Lay provolone slices over the hot beef and pepper mixture; cover the skillet 1 minute until cheese melts into the meat and starts to lace the pan edges.", 2, "medium"),
      step(4, "Load hoagies", "Pile into toasted rolls. Fast Philly Skillet feeds the hall in under twenty minutes.", 5, "low"),
    ],
  }),

  "sausage-peppers-onions": (scale) => ({
    ingredients: [
      m("Italian sausage links", mult(3, scale), "lb", "Main"),
      m("Bell peppers, sliced", mult(4, scale), "count", "Veg"),
      m("Yellow onions, sliced", mult(3, scale), "large", "Veg"),
      m("Hoagie rolls", mult(8, scale), "count", "Buns"),
      m("Marinara sauce", mult(2, scale), "cups", "Optional"),
    ],
    steps: [
      step(1, "Brown sausage links", "Brown Italian sausage in a large skillet over medium-high, turning until all sides color. Slice links on a bias.", 12, "medium-high"),
      step(2, "Sweat peppers and onions", "In the same pan, cook sliced peppers and onions 10–12 minutes until soft with golden edges.", 12, "medium"),
      step(3, "Combine and simmer", "Return sausage; add marinara if using. Simmer 5 minutes so flavors meld.", 6, "medium-low"),
      step(4, "Serve on rolls", "Pile sausage and peppers into split hoagie rolls. Sausage Peppers & Onions is a hall classic — keep extra napkins out.", 5, "low"),
    ],
  }),
};

export function getMealSpecificPack(
  def: GoldenRecipeDefinition,
  scale: number,
): Pack | null {
  const p0 = GOLDEN_P0_CLASSIC_PACKS[def.slug];
  if (p0) return p0(scale, def);

  const pizza = PIZZA_NIGHT_PACKS[def.slug];
  if (pizza) return pizza(scale, def);

  const builder = PACKS[def.slug];
  if (!builder) return null;
  return builder(scale, def);
}
