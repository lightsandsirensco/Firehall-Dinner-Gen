/**
 * Hand-written slug packs — replaces generic class blueprints for known template leaks.
 */

import type { GoldenRecipeDefinition } from "../types.js";
import type { GoldenRecipePageIngredient, GoldenRecipePageStep } from "../recipe-page-schema.js";

import { GOLDEN_P0_CLASSIC_PACKS } from "./golden-p0-classic-packs.js";
import type { MealSpecificPack } from "./golden-p0-classic-packs.js";
import { PIZZA_NIGHT_PACKS } from "./pizza-night-packs.js";
import { BATCH_A_GOLDEN_PACKS } from "./batch-a-packs.js";
import { BATCH_B_GOLDEN_PACKS } from "./batch-b-packs.js";
import { CHICKEN_DUMPLINGS_PACK } from "./batch-handheld-dumplings-pack.js";

type Ing = GoldenRecipePageIngredient;
type Step = GoldenRecipePageStep;
export type { MealSpecificPack };
type Pack = MealSpecificPack;

function m(
  name: string,
  quantity: number,
  unit: string,
  group?: string,
  notes?: string,
  optional?: boolean,
): Ing {
  return { name, quantity: String(quantity), unit, group, notes, optional };
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
      step(2, "Bake potatoes in batches", "Bake 50–65 minutes until fork-tender. Transfer finished potatoes to foil-lined lidded containers at 200°F while the next batch bakes. Never cover hot potatoes tightly — steam softens skins.", 65, "medium"),
      step(3, "Set a long topping line", "Arrange butter, cheddar, bacon, sour cream, green onions, and warm pulled beef in a row with labels. Put a trash can and extra forks at the end — this feed gets messy in the best way.", 20),
      step(4, "Serve family-style", "Call the crew when the first lidded container is full. Split potatoes at the line; let everyone build their own loaded spud. Refill toppings before the pan looks empty — empty cheddar bowls cause hall riots.", 15, "low"),
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

  "jerk-chicken": (scale) => ({
    ingredients: [
      m("Bone-in, skin-on chicken thighs", mult(5, scale), "lb", "Main"),
      m("Scotch bonnet peppers", mult(2, scale), "count", "Jerk marinade"),
      m("Green onions", mult(8, scale), "count", "Jerk marinade"),
      m("Fresh thyme leaves", mult(3, scale), "tbsp", "Jerk marinade"),
      m("Garlic cloves", mult(10, scale), "count", "Jerk marinade"),
      m("Fresh ginger, grated", mult(3, scale), "tbsp", "Jerk marinade"),
      m("Ground allspice", mult(2, scale), "tbsp", "Jerk marinade"),
      m("Brown sugar", mult(3, scale), "tbsp", "Jerk marinade"),
      m("Soy sauce", mult(3, scale), "tbsp", "Jerk marinade"),
      m("Fresh lime juice", mult(4, scale), "tbsp", "Jerk marinade"),
      m("Long-grain white rice, rinsed", mult(3, scale), "cups", "Rice and peas"),
      m("Kidney beans, drained", mult(2, scale), "cans", "Rice and peas", "15 oz each"),
      m("Full-fat coconut milk", mult(2, scale), "cans", "Rice and peas", "13.5 oz each"),
      m("Low-sodium chicken stock", mult(2, scale), "cups", "Rice and peas"),
      m("Fresh pineapple, peeled", mult(1, scale), "count", "Sides"),
      m("Coleslaw mix", mult(2, scale), "lb", "Sides"),
    ],
    steps: [
      step(1, "Trim and prep the chicken", "Pat chicken thighs dry. Trim excess fat, score skin lightly, and lay in baking dishes or zip bags for marinating.", 15),
      step(2, "Blend the jerk marinade", "Blend Scotch bonnets, green onions, thyme, garlic, ginger, allspice, brown sugar, soy, lime juice, and oil until mostly smooth.", 10),
      step(3, "Marinate the chicken", "Massage marinade under the skin. Marinate at least 45 minutes in the fridge — 4–12 hours is best.", 45),
      step(4, "Set up grill or oven", "Grill: 375°F two-zone fire. Oven: 425°F with foil-lined sheet pans and wire racks.", 15, "medium-high"),
      step(5, "Start coconut rice and peas", "Simmer rice, kidney beans, coconut milk, stock, scallions, and thyme 18–20 minutes until tender. Fluff and hold at 200°F.", 25, "medium"),
      step(6, "Grill or roast the chicken", "Char skin over direct heat, finish indirect or in oven until thickest thigh reads 165°F.", 35, "medium-high"),
      step(7, "Rest the chicken", "Tent loosely with foil and rest 10 minutes before slicing.", 10, "low"),
      step(8, "Grill pineapple and dress slaw", "Grill pineapple rings 2–3 minutes per side. Toss slaw with lime, salt, and oil; keep cold.", 12, "medium-high"),
      step(9, "Coordinate timing for service", "Slice rested thighs. Rice in first pan, chicken second, cold sides at the far end.", 10, "low"),
      step(10, "Hold for call interruptions", "If tones drop, close grill lid or hold chicken at 140°F; keep rice covered at low heat.", 5, "low"),
      step(11, "Serve the hall line", "Open line with rice and peas, jerk chicken, pineapple, slaw, hot sauce, and lime wedges.", 8, "low"),
      step(12, "Pack down leftovers safely", "Cool in shallow pans within two hours. Reheat chicken to 165°F next shift.", 10),
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
    prepMinutes: 40,
    cookMinutes: 45,
    ingredients: [
      m("Boneless chicken thighs, cubed", mult(4, scale), "lb", "Main"),
      m("Plain Greek yogurt", mult(1.5, scale), "cups", "Marinade"),
      m("Garam masala", mult(3, scale), "tbsp", "Marinade"),
      m("Ground cumin", mult(2, scale), "tsp", "Marinade"),
      m("Garlic cloves, minced", mult(8, scale), "count", "Marinade"),
      m("Fresh ginger, grated", mult(3, scale), "tbsp", "Marinade"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce", "28 oz each"),
      m("Heavy cream", mult(2, scale), "cups", "Sauce"),
      m("Unsalted butter", mult(6, scale), "tbsp", "Sauce"),
      m("Yellow onion, diced", mult(1, scale), "large", "Aromatics"),
      m("Basmati rice, rinsed", mult(3, scale), "cups", "Base"),
      m("Fresh cilantro", mult(1, scale), "cup", "Finish"),
      m("Basmati for serving", mult(0, scale), "", "Base", "cooked separately"),
    ],
    steps: [
      step(1, "Rinse and start the rice", "Rinse basmati until water runs clear. Simmer with 1:1.5 rice-to-water and a pinch of salt 15 minutes; rest covered 10 minutes off heat. Fluff and hold at 200°F in a covered baking dish.", 25, "medium"),
      step(2, "Build the yogurt marinade", "Stir yogurt with garam masala, cumin, half the garlic and ginger, and salt until smooth. Toss cubed chicken until coated; marinate at least 30 minutes in the fridge.", 35),
      step(3, "Sear the chicken in batches", "Heat 2 tbsp butter in a heavy pot over medium-high. Sear chicken in single layers until golden on the edges — not cooked through. Transfer to a baking dish.", 15, "medium-high"),
      step(4, "Sweat the aromatics", "Lower heat to medium. Add remaining butter and diced onion; cook 8 minutes until soft and translucent. Add remaining garlic and ginger; stir 1 minute until fragrant.", 10, "medium"),
      step(5, "Simmer the makhani sauce", "Pour in crushed tomatoes and simmer 10 minutes, scraping the fond. Stir in cream and simmer 5 more minutes until the sauce coats a spoon and looks deep orange-red.", 15, "medium"),
      step(6, "Finish chicken to 165°F", "Return seared chicken and any juices. Simmer gently 12–15 minutes until thickest pieces read 165°F. Stir occasionally so nothing sticks on the bottom.", 15, "medium"),
      step(7, "Balance the sauce", "Taste for salt and a pinch of sugar if the tomatoes are sharp. Add a splash of cream if the sauce looks broken or grainy. Keep at a gentle simmer — do not boil hard after cream is in.", 5, "low"),
      step(8, "Hold through call interruptions", "If tones drop, hold the pot covered on the warm side of the range at 140°F. Stir in a tablespoon of cream before service if the surface tightens.", 5, "low"),
      step(9, "Serve Butter Chicken for the crew", "Mound fluffy basmati on sheet trays or bowls, then ladle saucy chicken over the rice. Finish with cilantro. Keep extra sauce in a labeled lidded container for seconds.", 8, "low"),
      step(10, "Pack down leftovers", "Cool chicken and rice in shallow pans within two hours. Reheat chicken to 165°F next shift; refresh rice with a splash of water.", 10),
    ],
  }),

  "chicken-tikka-masala": (scale) => ({
    prepMinutes: 45,
    cookMinutes: 50,
    ingredients: [
      m("Boneless chicken thighs, cubed", mult(4, scale), "lb", "Main"),
      m("Plain Greek yogurt", mult(2, scale), "cups", "Tikka marinade"),
      m("Paprika", mult(2, scale), "tbsp", "Tikka marinade"),
      m("Ground cumin", mult(2, scale), "tsp", "Tikka marinade"),
      m("Garam masala", mult(2, scale), "tbsp", "Sauce"),
      m("Garlic cloves, minced", mult(8, scale), "count", "Aromatics"),
      m("Fresh ginger, grated", mult(3, scale), "tbsp", "Aromatics"),
      m("Crushed tomatoes", mult(2, scale), "cans", "Sauce"),
      m("Heavy cream", mult(2, scale), "cups", "Sauce"),
      m("Yellow onion, diced", mult(1, scale), "large", "Aromatics"),
      m("Vegetable oil", mult(3, scale), "tbsp", "Cooking"),
      m("Basmati rice, rinsed", mult(3, scale), "cups", "Base"),
      m("Fresh cilantro", mult(0.5, scale), "cup", "Finish"),
    ],
    steps: [
      step(1, "Cook basmati for the line", "Rinse basmati; simmer 1:1.5 with salted water 15 minutes. Rest covered 10 minutes, fluff, and hold at 200°F. Basmati should stay separate — not sticky mush.", 25, "medium"),
      step(2, "Mix tikka marinade", "Stir yogurt with paprika, cumin, half the garam masala, garlic, ginger, and salt. Coat chicken; refrigerate at least 45 minutes.", 45),
      step(3, "Char the chicken", "Broil on racks 6 inches from heat or grill over medium-high until edges char and centers hit 165°F. Work in batches so pieces char instead of steam.", 18, "high"),
      step(4, "Hold charred chicken", "Rest charred chicken 5 minutes; hold loosely covered at 140°F while the sauce finishes.", 5, "low"),
      step(5, "Start the masala base", "Sweat onion in oil over medium heat 8–10 minutes until edges turn gold. Add remaining garlic and ginger; cook 1 minute.", 12, "medium"),
      step(6, "Simmer tomato and cream", "Add crushed tomatoes and remaining garam masala; simmer 12 minutes until the sauce thickens and oil sheen appears at the edges. Stir in cream; simmer 5 minutes without a hard boil.", 18, "medium"),
      step(7, "Fold in chicken", "Add charred chicken and resting juices. Simmer gently 10 minutes so flavors marry. Sauce should look coral-orange and coat the back of a spoon.", 10, "medium"),
      step(8, "Taste and adjust", "Balance with salt and a squeeze of lemon if the sauce tastes flat. Add a splash of cream if spice reads too sharp for the crew.", 5, "low"),
      step(9, "Serve Chicken Tikka Masala", "Plate rice first, then ladle masala over top with cilantro. Keep naan or flatbread on a side tray if the hall stocks it.", 8, "low"),
      step(10, "Hold and store safely", "If interrupted, hold covered at 140°F. Cool leftovers shallow within two hours; reheat to 165°F before the next meal.", 5, "low"),
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
      step(4, "Plate family-style", "Slice meatloaf on a tray; serve mashed potatoes in a warm lidded container. Meatloaf & Mashed is pure hall comfort — extra ketchup on the table, no questions asked.", 8, "low"),
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
      step(3, "Assemble and bake", "Spread filling in baking dishes; pipe or spread mashed potatoes over top. Fork ridges for crispy peaks. Bake at 400°F 25–30 minutes until golden and bubbling at edges.", 30, "high"),
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
      step(2, "Layer the casserole", "In a deep baking dish: sauce, tortillas torn to fit, beef, cheese — repeat twice. Finish with sauce and cheese on top.", 15),
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
      step(3, "Top and bake", "Transfer filling to baking dishes; cover with pie crust or puff pastry. Vent slits. Brush with egg wash.", 12),
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
    prepMinutes: 35,
    cookMinutes: 28,
    ingredients: [
      m("Flat rice noodles (pad thai width)", mult(2, scale), "lb", "Noodles"),
      m("Hot tap water", mult(8, scale), "cups", "Noodles", "for soaking — not boiling"),
      m("Boneless chicken thighs", mult(4, scale), "lb", "Main"),
      m("Large eggs", mult(8, scale), "count", "Main"),
      m("Bean sprouts", mult(4, scale), "cups", "Vegetables"),
      m("Green onions", mult(8, scale), "stalks", "Vegetables", "white and green parts separated"),
      m("Garlic cloves", mult(6, scale), "cloves", "Aromatics", "minced"),
      m("Tamarind paste", mult(6, scale), "tbsp", "Sauce"),
      m("Fish sauce", mult(6, scale), "tbsp", "Sauce"),
      m("Packed brown sugar", mult(4, scale), "tbsp", "Sauce"),
      m("Rice vinegar", mult(2, scale), "tbsp", "Sauce"),
      m("Warm water", mult(0.25, scale), "cup", "Sauce", "to loosen tamarind"),
      m("Roasted peanuts", mult(1, scale), "cup", "Garnish", "roughly crushed"),
      m("Limes", mult(8, scale), "count", "Garnish", "cut into wedges"),
      m("Crushed red chili flakes", mult(1, scale), "tsp", "Garnish", "optional, for the line"),
      m("Vegetable oil", mult(4, scale), "tbsp", "Cooking"),
      m("Kosher salt", mult(1, scale), "tsp", "Seasoning"),
    ],
    steps: [
      step(
        1,
        "Set up the prep station",
        "Clear a long counter into five labeled zones so a rookie can work without guessing. Noodle zone: dry noodles still in the bag plus a large bowl for soaking. Vegetable zone: bean sprouts rinsed and drained, green onions sliced with whites and greens in separate small bowls, garlic minced. Chicken zone: thighs patted dry and sliced into bite-sized strips about the width of your thumb. Garnish zone: peanuts crushed in a zip bag with a rolling pin, limes quartered into wedges, chili flakes in a pinch bowl. Sauce zone: empty mixing bowl with a whisk, tamarind paste, fish sauce, brown sugar, rice vinegar, and warm water measured and within arm's reach. Read the sauce and noodle steps before you turn on the wok — pad thai moves fast once the pan is hot.",
        15,
      ),
      step(
        2,
        "Whisk the pad thai sauce",
        "In a medium bowl, stir tamarind paste with warm water until the paste dissolves and no dark clumps remain on the whisk. Add fish sauce, brown sugar, and rice vinegar. Whisk vigorously for thirty seconds until the sugar dissolves and the sauce looks glossy, not grainy. Dip a clean spoon, cool it on the counter, and taste: you want sweet first on the tongue, then salty, then a sharp tamarind tang at the back — not fishy, not flat. If it tastes harsh, add brown sugar one teaspoon at a time; if it tastes only sweet, add fish sauce one teaspoon at a time. Set the bowl right beside the wok — you will pour it all at once during the toss.",
        5,
      ),
      step(
        3,
        "Soak the rice noodles",
        "Place dry noodles in the large bowl and cover with hot tap water — the kind that is uncomfortable to hold your hand in, but not rolling boil from a kettle. Push noodles under the water with tongs so every strand is submerged. Soak eighteen to twenty minutes, checking at fifteen: pull one strand and bend it. Ready noodles flex like a cooked spaghetti noodle without snapping dry in the center. Drain immediately in a colander when ready; rinse briefly with cold water only if they feel sticky, then toss with one teaspoon oil so they do not clump while you cook chicken. Common mistakes: boiling water turns noodles mushy before the wok step; soaking too short leaves a hard core that never cooks in the pan.",
        20,
      ),
      step(
        4,
        "Cook the chicken in batches",
        "Heat the wok or flat-top over medium-high for three minutes until a flick of water evaporates on contact. Add two tablespoons vegetable oil and swirl to coat. Lay chicken strips in a single layer — do not stir for ninety seconds so the edges brown against the metal. Stir, spread again, and cook until the largest piece reads 165°F on an instant-read thermometer, about four to six minutes per batch. Transfer each batch to a clean sheet tray. Repeat with the remaining chicken and another tablespoon oil if the pan looks dry. Browning matters: pale steamed chicken will not carry the wok flavor. Keep the tray near the stove — you will return the chicken to the pan in step six.",
        12,
        "medium-high",
      ),
      step(
        5,
        "Scramble the eggs in the wok",
        "With the wok still on medium-high, add one tablespoon oil if the surface looks dry. Beat eggs lightly with a pinch of salt. Pour into the center of the pan and let the bottom set for twenty seconds without stirring. Push cooked egg toward the rim, tilt the pan so raw egg flows to bare metal, and repeat until you have soft curds — not dry rubber. Break curds into bite-sized pieces with your spatula. Slide eggs to the side of the wok with the chicken tray nearby. Eggs finish in the pan again during the noodle toss, so stop while they still look a little soft.",
        4,
        "medium-high",
      ),
      step(
        6,
        "Build the pad thai in the wok",
        "Increase heat to high. Add drained noodles to the open side of the wok — you should hear a light sizzle. Toss with tongs or two spatulas for sixty seconds so noodles pick up wok color. Pour the whisked sauce evenly over the noodles and keep tossing continuously; the noodles will soften and the sauce will reduce into a glossy coat. Now add cooked chicken, scrambled eggs, and the white parts of the green onions. Keep everything moving two to three minutes until the sauce clings to each strand and the pan looks almost dry — not pooling liquid. If noodles stick, add one tablespoon water to steam them loose, then toss again. Do not add bean sprouts yet; they go in during finishing so they stay crisp.",
        6,
        "high",
      ),
      step(
        7,
        "Finish with sprouts and seasoning",
        "Pull the wok off the hottest part of the burner or reduce to medium. Fold in bean sprouts and the green parts of the green onions; toss thirty seconds until sprouts just begin to wilt at the edges but still snap when you bite. Taste a noodle strand from the center of the pan: it should be tender with a slight chew, coated in sauce, not oily puddles at the bottom. Adjust with fish sauce for salt, brown sugar for balance, or a squeeze of lime for brightness — one small change at a time. The pan is done when noodles look glossy, chicken is evenly distributed, and no thin sauce pool sits in the bottom of the wok.",
        3,
        "medium",
      ),
      step(
        8,
        "Serve on the line with garnishes",
        "Transfer pad thai to sheet trays or baking dishes for family-style service — do not cover tightly or steam will soften the noodles. Line garnish bowls at the end of the counter: lime wedges, crushed peanuts, extra sliced green onion, and chili flakes for firefighters who want heat. Each plate gets noodles first, then a pinch of peanuts and a lime wedge on the rim so they can squeeze at the table. Suggested sides on separate trays: Asian cucumber salad with rice vinegar and sesame, warmed spring rolls, and edamame with flaky salt. Tell the crew to squeeze lime and add peanuts right before eating — acid and crunch fade if mixed too early.",
        5,
      ),
    ],
  }),

  "thai-basil-chicken": (scale) => ({
    ingredients: [
      m("Jasmine rice, uncooked", mult(4, scale), "cups", "Base"),
      m("Water", mult(5, scale), "cups", "Base"),
      m("Boneless chicken thighs", mult(4, scale), "lb", "Main"),
      m("Red bell peppers", mult(4, scale), "count", "Veg"),
      m("Large yellow onions", mult(2, scale), "count", "Veg"),
      m("Garlic cloves", mult(8, scale), "cloves", "Aromatics"),
      m("Thai basil leaves", mult(2, scale), "cups", "Herbs"),
      m("Oyster sauce", mult(0.5, scale), "cup", "Sauce"),
      m("Soy sauce", mult(0.25, scale), "cup", "Sauce"),
      m("Fish sauce", mult(2, scale), "tbsp", "Sauce"),
      m("Brown sugar", mult(1, scale), "tbsp", "Sauce"),
      m("Sesame oil", mult(1, scale), "tsp", "Sauce"),
      m("Vegetable oil", mult(3, scale), "tbsp", "Cooking"),
      m("Crushed red chili flakes", mult(1, scale), "tsp", "Service", "optional, for the line"),
    ],
    steps: [
      step(
        1,
        "Start the rice",
        "Rinse jasmine rice under cold water until the water runs mostly clear. Add rice and water to a rice cooker. Start immediately so the rice is ready when the stir fry finishes.",
        5,
      ),
      step(
        2,
        "Prep the station",
        "Slice red bell peppers into thin strips. Slice onions. Mince garlic. Remove stems from Thai basil leaves. Cut chicken thighs into bite-sized pieces.",
        10,
      ),
      step(
        3,
        "Mix the sauce",
        "In a bowl combine oyster sauce, soy sauce, fish sauce, brown sugar, and sesame oil. Whisk until fully combined.",
        3,
      ),
      step(
        4,
        "Cook the chicken",
        "Heat a large wok or flat-top over medium-high heat. Add 2 tablespoons oil. Cook chicken in batches to avoid overcrowding. Allow the chicken to brown before stirring. Cook until internal temperature reaches 165°F. Transfer to a clean tray.",
        12,
        "medium-high",
      ),
      step(
        5,
        "Cook vegetables",
        "Add another tablespoon of oil. Cook onions for 3 minutes. Add peppers and cook another 4–5 minutes until slightly softened but still firm. Add garlic during the final minute.",
        8,
        "medium-high",
      ),
      step(
        6,
        "Combine everything",
        "Return chicken to the wok. Pour in sauce mixture. Toss continuously for 2–3 minutes. Add basil leaves and stir until wilted. Taste and adjust seasoning.",
        4,
        "high",
      ),
      step(
        7,
        "Build the plates",
        "Serve rice first. Top with stir fry. Reserve extra basil and chili flakes on the side for firefighters who like additional heat.",
        3,
      ),
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

  "bbq-chicken-mac-and-cheese": (scale) => ({
    prepMinutes: 20,
    cookMinutes: 45,
    ingredients: [
      m(
        "Boneless skinless chicken thighs",
        mult(4, scale),
        "lb",
        "Protein",
        "~6 oz cooked shredded per firefighter (4 lb raw)",
      ),
      m("Smoked paprika", mult(2, scale), "tbsp", "Chicken rub"),
      m("Garlic powder", mult(2, scale), "tbsp", "Chicken rub"),
      m("Onion powder", mult(2, scale), "tbsp", "Chicken rub"),
      m("Kosher salt", mult(1.5, scale), "tbsp", "Chicken rub"),
      m("Black pepper", mult(1, scale), "tbsp", "Chicken rub"),
      m("BBQ sauce", mult(1.5, scale), "cups", "BBQ", "toss and drizzle"),
      m("Dry elbow macaroni", mult(1.5, scale), "lb", "Mac", "~1.5 cups prepared mac per firefighter"),
      m("Unsalted butter", mult(8, scale), "tbsp", "Cheese sauce", "1/2 cup"),
      m("All-purpose flour", mult(8, scale), "tbsp", "Cheese sauce", "1/2 cup"),
      m("Whole milk", mult(4, scale), "cups", "Cheese sauce"),
      m("Sharp cheddar, shredded", mult(16, scale), "oz", "Cheese"),
      m("Mozzarella, shredded", mult(8, scale), "oz", "Cheese"),
      m("Crispy fried onions", mult(0.75, scale), "cup", "Topping", "garnish at the line", true),
      m("Green onions, sliced", mult(2, scale), "bunches", "Garnish", "optional garnish", true),
    ],
    steps: [
      step(
        1,
        "Season the chicken",
        "Pat chicken thighs dry. Mix smoked paprika, garlic powder, onion powder, salt, and pepper; coat all sides. Let sit 10 minutes while the oven preheats to 375°F — seasoned chicken browns better than wet, pale thighs.",
        10,
      ),
      step(
        2,
        "Cook chicken until shreddable",
        "Arrange thighs on a rimmed sheet tray. Bake at 375°F 28–35 minutes until the thickest piece reads 165°F on an instant-read thermometer and juices run clear. Visual cue: edges start to caramelize and the meat springs back when pressed.",
        35,
        "medium",
      ),
      step(
        3,
        "Shred and sauce the chicken",
        "Rest chicken 8 minutes, then shred with two forks — you want pulled strands, not cubes. Toss with about 1 cup of the BBQ sauce until glossy (reserve the rest for drizzling before bake). This is BBQ chicken mac, not pulled pork mac: no pork shoulder, no eight-hour smoke.",
        12,
        "low",
      ),
      step(
        4,
        "Par-cook the macaroni",
        "Boil elbow macaroni in well-salted water 2 minutes shy of al dente (about 6–7 minutes for standard elbows). Drain thoroughly — wet pasta makes a soupy bake.",
        10,
        "medium-high",
      ),
      step(
        5,
        "Build the cheese sauce",
        "Melt butter in a large pot over medium heat. Whisk in flour; cook 1 minute until it smells nutty. Whisk in milk in steady streams until smooth. Simmer 3–4 minutes until thick enough to coat a spoon. Off heat, stir in cheddar and mozzarella until melted. The sauce should look like thick nacho cheese, not runny milk.",
        12,
        "medium",
      ),
      step(
        6,
        "Fold mac and BBQ chicken together",
        "Fold drained mac into cheese sauce, then fold in shredded BBQ chicken in wide streaks so orange cheese and sauced chicken both show — do not mash into one uniform color. Taste for salt; BBQ sauce varies in sodium.",
        8,
      ),
      step(
        7,
        "Pan up for the crew",
        "Butter two large baking dishes (or one deep 9x13 dish) for eight firefighters. Spread mac mixture evenly. Drizzle remaining BBQ sauce in thin ribbons across the top so it caramelizes in the oven. Scatter extra cheddar and mozzarella on top for a cheese pull.",
        10,
      ),
      step(
        8,
        "Bake until bubbling with cheese pull",
        "Bake uncovered at 375°F 20–25 minutes until edges bubble, top is deep golden, and a spoon lift shows stretchy cheese. Visual cue: BBQ sauce edges look tacky and mahogany, not pale pink. If the top browns before the center is hot, tent foil and continue baking until the center probes 165°F.",
        25,
        "medium",
      ),
      step(
        9,
        "Hold through call interruptions",
        "If tones drop mid-service, cover the tray with vented foil and hold at 200°F up to 45 minutes. Note hold time on the pan. Before serving, loosen tight mac with a splash of milk stirred into the corner — held mac sets like concrete.",
        5,
        "low",
      ),
      step(
        10,
        "Serve and garnish",
        "Rest 5 minutes so scoops hold together. Portion about 1.5 cups mac and cheese plus a generous scoop of BBQ chicken per firefighter (~6 oz cooked chicken each). Top with crispy fried onions and green onions at the line, not baked in. Serve with a spatula from the baking dish — hearty, not eating-contest piles.",
        5,
        "low",
      ),
    ],
  }),
  "chicken-souvlaki": (scale) => ({
    ingredients: [
      m("Boneless chicken thighs, cubed", mult(4, scale), "lb", "Main"),
      m("Fresh lemon juice", mult(0.5, scale), "cup", "Marinade"),
      m("Olive oil", mult(0.5, scale), "cup", "Marinade"),
      m("Garlic cloves, minced", mult(6, scale), "count", "Marinade"),
      m("Dried oregano", mult(3, scale), "tbsp", "Marinade"),
      m("Kosher salt", mult(2, scale), "tsp", "Marinade"),
      m("Plain Greek yogurt", mult(2, scale), "cups", "Tzatziki"),
      m("English cucumber, grated and squeezed dry", mult(1, scale), "count", "Tzatziki"),
      m("Fresh dill, chopped", mult(2, scale), "tbsp", "Tzatziki"),
      m("Pita bread", mult(12, scale), "count", "Build"),
      m("Cherry tomatoes, halved", mult(2, scale), "pints", "Build"),
      m("Red onion, thinly sliced", mult(1, scale), "count", "Build"),
    ],
    steps: [
      step(1, "Marinate the chicken", "Cube chicken thighs into 1½-inch pieces. Whisk lemon juice, olive oil, garlic, oregano, and salt; toss with chicken. Marinate at least 30 minutes, up to 4 hours, in the fridge.", 35),
      step(2, "Skewer and heat the grill", "Thread marinated chicken onto skewers, leaving small gaps between pieces so every side gets heat. Heat a grill or large grill pan to medium-high.", 10, "medium-high"),
      step(3, "Grill the skewers", "Grill skewers 10–12 minutes, turning every few minutes, until deeply charred on the edges and the thickest piece reads 165°F.", 12, "medium-high"),
      step(4, "Mix the tzatziki", "Stir Greek yogurt, grated cucumber (squeezed dry in a towel), dill, a squeeze of lemon, and a pinch of salt into a cool, tangy sauce. Keep chilled until service.", 10, "low"),
      step(5, "Warm the pita and build the line", "Warm pitas briefly on the grill or in a dry skillet, about 30 seconds per side. Set out skewers, warm pita, tzatziki, tomatoes, and red onion so the crew builds their own wraps.", 8, "low"),
      step(6, "Hold for call interruptions", "If tones drop, pull skewers off direct heat and hold on the cool side of the grill or in a 200°F oven. Tzatziki and cold toppings hold fine on ice for a stretch.", 5, "low"),
    ],
  }),

  "breakfast-burrito-bar": (scale) => ({
    ingredients: [
      m("Large eggs", mult(24, scale), "count", "Main"),
      m("Breakfast sausage or chorizo", mult(3, scale), "lb", "Fillings"),
      m("Frozen hash browns", mult(4, scale), "lb", "Fillings"),
      m("Yellow onion, diced", mult(2, scale), "count", "Fillings"),
      m("Bell peppers, diced", mult(3, scale), "count", "Fillings"),
      m("Shredded cheddar or pepper jack", mult(3, scale), "cups", "Toppings"),
      m("10-inch flour tortillas", mult(20, scale), "count", "Build"),
      m("Salsa or pico de gallo", mult(2, scale), "cups", "Toppings"),
      m("Hot sauce", mult(1, scale), "count", "Toppings", undefined, true),
    ],
    steps: [
      step(1, "Crisp the hash browns", "Heat a large griddle or two skillets over medium-high. Spread hash browns in an even layer, pressing down with a spatula; let brown 8–10 minutes before flipping in sections.", 12, "medium-high"),
      step(2, "Brown the sausage and vegetables", "In a separate pan, brown sausage or chorizo, breaking it into crumbles. Add onion and peppers; cook until softened and the sausage is fully cooked through. Drain excess fat.", 14, "medium-high"),
      step(3, "Scramble the eggs", "Whisk eggs with a pinch of salt. Scramble gently over medium heat until just set; fold in half the cheese off heat so it melts without turning rubbery.", 10, "medium"),
      step(4, "Set up the burrito bar", "Warm tortillas wrapped in foil in a low oven. Lay out hash browns, sausage mix, eggs, remaining cheese, salsa, and hot sauce in separate pans so the crew builds their own.", 10),
      step(5, "Roll and hold", "Fill and roll burritos, tucking in the sides first, then rolling forward tight. Hold finished burritos seam-side down on a sheet pan in a 200°F oven so the line stays hot as people filter through.", 8, "low"),
    ],
  }),

  "chorizo-breakfast-tacos": (scale) => ({
    ingredients: [
      m("Fresh Mexican chorizo, casings removed", mult(2.5, scale), "lb", "Main"),
      m("Large eggs", mult(20, scale), "count", "Main"),
      m("Yellow onion, diced", mult(1, scale), "count", "Aromatics"),
      m("6-inch corn tortillas", mult(24, scale), "count", "Build"),
      m("Cotija cheese, crumbled", mult(8, scale), "oz", "Toppings"),
      m("Fresh cilantro, chopped", mult(1, scale), "cup", "Toppings"),
      m("White onion, finely diced", mult(1, scale), "count", "Toppings"),
      m("Salsa verde", mult(2, scale), "cups", "Toppings"),
      m("Lime wedges", mult(8, scale), "count", "Finish"),
    ],
    steps: [
      step(1, "Brown the chorizo", "Cook chorizo in a large skillet over medium-high, breaking it into small crumbles, 8–10 minutes until fully cooked and rendered. Drain most of the excess fat, leaving a thin coating in the pan.", 12, "medium-high"),
      step(2, "Soften the onion", "Add diced yellow onion to the rendered fat; cook 3–4 minutes until softened.", 5, "medium"),
      step(3, "Scramble the eggs into the chorizo", "Whisk eggs with a pinch of salt; pour into the pan. Stir gently over medium-low heat until just set and still glossy — chorizo is salty, so the eggs need very little extra seasoning.", 8, "medium"),
      step(4, "Warm the tortillas", "Warm corn tortillas in a dry skillet or wrapped in foil in a low oven, about 30 seconds per side, until pliable.", 8, "medium"),
      step(5, "Build the taco line", "Fill warm tortillas with the chorizo-egg mixture. Set out cotija, cilantro, diced white onion, salsa verde, and lime wedges so the crew tops their own.", 8, "low"),
    ],
  }),

  "french-toast-casserole": (scale) => ({
    ingredients: [
      m("Thick-sliced brioche or Texas toast, cubed", mult(3, scale), "lb", "Base"),
      m("Large eggs", mult(16, scale), "count", "Custard"),
      m("Whole milk", mult(4, scale), "cups", "Custard"),
      m("Heavy cream", mult(1, scale), "cup", "Custard"),
      m("Granulated sugar", mult(1, scale), "cup", "Custard"),
      m("Ground cinnamon", mult(2, scale), "tbsp", "Custard"),
      m("Vanilla extract", mult(2, scale), "tbsp", "Custard"),
      m("Unsalted butter, melted", mult(0.5, scale), "cup", "Topping"),
      m("Brown sugar", mult(0.5, scale), "cup", "Topping"),
      m("Maple syrup", mult(2, scale), "cups", "Serve"),
    ],
    steps: [
      step(1, "Layer the bread", "Cube bread into 1-inch pieces — day-old bread works best since it soaks without turning to mush. Spread evenly across two greased baking dishes.", 10),
      step(2, "Whisk the custard", "Whisk eggs, milk, cream, sugar, cinnamon, and vanilla until fully combined. Pour evenly over the bread, pressing cubes down so every piece soaks.", 8),
      step(3, "Rest before baking", "Cover and refrigerate at least 1 hour, overnight is best, so the bread fully absorbs the custard — this is what keeps the center soft instead of dry.", 60, "low"),
      step(4, "Bake until set", "Bake uncovered at 350°F for 45–50 minutes until the center is puffed and springs back and the edges are deep golden. A knife inserted in the center should come out clean.", 50, "medium"),
      step(5, "Rest, top, and serve", "Rest 10 minutes before cutting into squares. Brush with melted butter and a scatter of brown sugar. Serve warm with maple syrup on the side.", 10, "low"),
    ],
  }),

  "sausage-egg-bake": (scale) => ({
    ingredients: [
      m("Breakfast sausage, casings removed", mult(3, scale), "lb", "Main"),
      m("Large eggs", mult(20, scale), "count", "Main"),
      m("Whole milk", mult(2, scale), "cups", "Custard"),
      m("Frozen hash browns, thawed", mult(3, scale), "lb", "Base"),
      m("Shredded cheddar", mult(4, scale), "cups", "Cheese"),
      m("Yellow onion, diced", mult(1, scale), "count", "Aromatics"),
      m("Dry mustard powder", mult(1, scale), "tsp", "Seasoning"),
      m("Kosher salt", mult(1, scale), "tbsp", "Seasoning"),
    ],
    steps: [
      step(1, "Brown the sausage", "Cook sausage in a large skillet over medium-high, breaking it into small crumbles, 8–10 minutes until fully browned. Drain well and let cool slightly.", 12, "medium-high"),
      step(2, "Layer the base", "Spread thawed hash browns across the bottom of two greased baking dishes. Scatter browned sausage and diced onion evenly over the top.", 10),
      step(3, "Whisk and pour the custard", "Whisk eggs, milk, dry mustard, and salt until smooth. Pour evenly over the hash browns and sausage; sprinkle cheddar over the top.", 8),
      step(4, "Rest before baking", "Cover and refrigerate at least 1 hour, overnight works well, so the hash browns soften and the flavors settle.", 60, "low"),
      step(5, "Bake until set", "Bake uncovered at 350°F for 45–55 minutes until the center is fully set with no jiggle and the top is golden. Internal temperature should read at least 160°F.", 50, "medium"),
      step(6, "Rest and portion", "Rest 10 minutes before cutting into squares — this keeps portions clean instead of falling apart on the spatula.", 10, "low"),
    ],
  }),

  "honey-garlic-pork-tenderloin": (scale) => ({
    ingredients: [
      m("Pork tenderloin", mult(4, scale), "lb", "Main"),
      m("Honey", mult(0.5, scale), "cup", "Glaze"),
      m("Soy sauce", mult(0.25, scale), "cup", "Glaze"),
      m("Garlic cloves, minced", mult(6, scale), "count", "Glaze"),
      m("Fresh ginger, grated", mult(1, scale), "tbsp", "Glaze"),
      m("Dijon mustard", mult(2, scale), "tbsp", "Glaze"),
      m("Kosher salt", mult(1, scale), "tbsp", "Seasoning"),
      m("Vegetable oil", mult(2, scale), "tbsp", "Sear"),
    ],
    steps: [
      step(1, "Season and sear", "Pat tenderloins dry; season with salt. Sear in a hot oiled skillet or on the grill 2–3 minutes per side until deeply browned on all sides.", 12, "medium-high"),
      step(2, "Whisk the glaze", "Whisk honey, soy sauce, garlic, ginger, and Dijon mustard until smooth.", 5),
      step(3, "Finish with the glaze", "Move tenderloins to indirect heat or a 400°F oven. Brush generously with glaze every few minutes, turning, until internal temperature reaches 145°F, about 15–18 minutes.", 18, "medium"),
      step(4, "Rest and slice", "Rest tenderloins 5 minutes before slicing into medallions — resting keeps the glaze from washing off and the juices in the meat.", 5, "low"),
      step(5, "Reduce extra glaze and serve", "Simmer any remaining glaze in a small pot 2–3 minutes until slightly thickened; spoon over sliced pork at the line.", 5, "low"),
    ],
  }),

  "sheet-pan-meal-prep": (scale) => ({
    ingredients: [
      m("Boneless chicken breasts", mult(4, scale), "lb", "Main"),
      m("Sweet potatoes, cubed", mult(3, scale), "lb", "Veg"),
      m("Broccoli florets", mult(2, scale), "lb", "Veg"),
      m("Olive oil", mult(0.33, scale), "cup", "Seasoning"),
      m("Garlic powder", mult(2, scale), "tbsp", "Seasoning"),
      m("Smoked paprika", mult(1, scale), "tbsp", "Seasoning"),
      m("Long-grain rice, cooked", mult(6, scale), "cups", "Base", "cooked separately"),
    ],
    steps: [
      step(1, "Prep and season", "Cube chicken breasts and sweet potatoes into even 1-inch pieces. Toss chicken, sweet potatoes, and broccoli separately with olive oil, garlic powder, smoked paprika, and salt.", 15),
      step(2, "Roast in stages", "Spread sweet potatoes on one sheet pan and roast at 425°F for 10 minutes before adding chicken and broccoli to a second pan — sweet potatoes need a head start to cook through.", 10, "high"),
      step(3, "Finish roasting", "Roast both pans another 18–20 minutes, swapping racks halfway, until chicken reads 165°F and vegetables are tender with browned edges.", 20, "high"),
      step(4, "Portion into containers", "Divide cooked rice, roasted chicken, sweet potatoes, and broccoli evenly across meal prep containers — about 1 cup rice and 6 oz chicken per container.", 12),
      step(5, "Cool and label", "Let containers cool uncovered 15–20 minutes before sealing lids, then refrigerate. Label with the date; reheat covered to 165°F before eating.", 20, "low"),
    ],
  }),

  "sheet-pan-sausage-peppers": (scale) => ({
    ingredients: [
      m("Italian sausage links (sweet or hot)", mult(4, scale), "lb", "Main"),
      m("Bell peppers, sliced", mult(6, scale), "count", "Veg"),
      m("Yellow onion, sliced", mult(2, scale), "large", "Veg"),
      m("Olive oil", mult(0.25, scale), "cup", "Seasoning"),
      m("Dried Italian seasoning", mult(2, scale), "tbsp", "Seasoning"),
      m("Garlic cloves, minced", mult(4, scale), "count", "Seasoning"),
      m("Hoagie rolls", mult(10, scale), "count", "Serve", undefined, true),
    ],
    steps: [
      step(1, "Arrange the sheet pan", "Toss sliced bell peppers and onion with olive oil, Italian seasoning, garlic, salt, and pepper. Spread across a sheet pan and nestle sausage links on top in a single layer.", 12),
      step(2, "Roast until browned", "Roast at 425°F for 25–30 minutes, turning sausages halfway, until they're browned on the outside, peppers are softened with charred edges, and sausages read 160°F.", 30, "high"),
      step(3, "Rest and slice", "Rest sausages 5 minutes, then slice on a bias. Toss the sliced sausage back with the peppers and onions on the pan.", 5, "low"),
      step(4, "Serve family-style or on rolls", "Pile sausage and peppers into a serving dish, or split hoagie rolls and load them up at the line. Hold extra sausage on a lower oven rack at 200°F.", 8, "low"),
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

  const batchA = BATCH_A_GOLDEN_PACKS[def.slug];
  if (batchA) return batchA(scale, def);

  const batchB = BATCH_B_GOLDEN_PACKS[def.slug];
  if (batchB) return batchB(scale, def);

  if (def.slug === "chicken-dumpling-soup") return CHICKEN_DUMPLINGS_PACK(scale, def);

  const builder = PACKS[def.slug];
  if (!builder) return null;
  return builder(scale, def);
}
