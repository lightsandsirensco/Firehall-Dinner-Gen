import type { RecipeCorrection } from "../types.js";
import { addIng, field, ing, step, stepSet } from "./helpers.js";

const fi = (c: Omit<RecipeCorrection, "batch">, batch: string): RecipeCorrection => ({ ...c, batch });

/** First-impression recipes 1–10 by exposure (homepage, Pick Tonight, wheel, welcome emails, most viewed). */
export const B4_FIRST_IMPRESSION_01: RecipeCorrection[] = [
  {
    slug: "smash-burgers", collection: "golden-100", category: "instruction",
    findings: ["culinary_review"], summary: "Fries bake time stated",
    rationale: "The fry step gave a temperature but no time; a first-time cook needs both.",
    ops: [step(7, "Spread fries in a single layer — crowded pans steam instead of crisp. Bake until deeply golden", "Spread fries in a single layer — crowded pans steam instead of crisp. Bake 20–25 minutes, shaking once, until deeply golden")],
  },
  {
    slug: "bbq-chicken-bowls", collection: "golden-100", category: "missing_ingredient",
    findings: ["culinary_review", "step_ingredient_not_listed"],
    summary: "Slaw is dressed and corn is charred; salt, oil and rice water stated",
    rationale: "The bowl served plain bagged coleslaw mix and cold corn, and the rice step relied on a ratio and salt that weren't listed. A quick creamy slaw and skillet-charred corn make it a finished dish.",
    ops: [
      addIng(6, { name: "Mayonnaise", quantity: "0.75", unit: "Cup", group: "Toppings" }),
      addIng(7, { name: "Apple Cider Vinegar", quantity: "3", unit: "Tbsp", group: "Toppings" }),
      addIng(8, { name: "Vegetable Oil", quantity: "2", unit: "Tbsp", group: "Main" }),
      addIng(9, { name: "Kosher Salt", quantity: "2", unit: "Tsp", group: "Base" }),
      stepSet(0, "Rinse rice until water runs clear. Simmer with 1:1.5 rice-to-water ratio and salt 18 minutes; fluff and hold covered at 200°F.", "Rinse rice until water runs clear. Bring to a boil with 4½ cups water and 1 tsp salt, then cover and simmer on low 18 minutes. Rest 5 minutes off heat, fluff, and hold covered in a 200°F oven."),
      step(1, "Season chicken thighs with BBQ rub.", "Toss chicken thighs with 1 tbsp oil and the BBQ rub."),
      { op: "insert", path: "steps", index: 3, value: { stepNumber: 0, title: "Char the corn and dress the slaw", instruction: "Heat the remaining 1 tbsp oil in a large skillet over high heat. Add corn in an even layer and leave it 3–4 minutes until kernels blister and brown in spots; stir, season with a pinch of salt, and cook 2 minutes more. Toss coleslaw mix with mayonnaise, vinegar, and the remaining salt until just coated.", minutes: 8, heatLevel: "high" } },
    ],
  },
  {
    slug: "beef-dip", collection: "golden-100", category: "serving_scaling",
    findings: ["count_per_person_high", "step_ingredient_not_listed"],
    summary: "Rolls and provolone cut from 24 to 16 (two per firefighter); searing oil listed",
    rationale: "Five pounds of raw chuck yields about 6 oz cooked beef per person — enough for two loaded hoagies, not three.",
    ops: [
      ing(6, "quantity", "24", "16"),
      ing(7, "quantity", "24", "16"),
      addIng(15, { name: "Vegetable Oil", quantity: "2", unit: "Tbsp", group: "Main" }),
    ],
  },
  {
    slug: "chicken-parm", collection: "golden-100", category: "instruction",
    findings: ["culinary_review"], summary: "Breasts split into cutlets; pans oiled (butter wasn't listed); duplicate rest note removed",
    rationale: "Four pounds of whole breasts pound unevenly unless halved first. The bake step called for butter that isn't in the recipe, and the rest instruction appeared twice.",
    ops: [
      step(0, "Place chicken between plastic wrap and pound to an even ½ inch.", "Slice each breast in half horizontally, then place between plastic wrap and pound to an even ½ inch."),
      step(5, "Lay fried cutlets in buttered hotel pans.", "Lay fried cutlets in lightly oiled hotel pans."),
      step(5, " Rest 3 minutes before serving — molten cheese burns rookies.", ""),
    ],
  },
  {
    slug: "pulled-pork", collection: "golden-100", category: "serving_scaling",
    findings: ["count_per_person_high", "culinary_review"],
    summary: "Buns cut from 24 to 16; oven and slow-cooker times separated",
    rationale: "Five pounds of raw shoulder gives about 6 oz cooked pork per person — two full sandwiches. The cook step mixed an oven temperature with a slow-cooker time.",
    ops: [
      ing(12, "quantity", "24", "16"),
      step(1, "Roast at 275°F in a covered roaster or run a slow cooker on low 8–10 hours", "Roast covered at 275°F for 6–8 hours, or run a slow cooker on low 8–10 hours,"),
    ],
  },
  {
    slug: "chili-lime-grilled-tilapia", collection: "bbq", category: "missing_ingredient",
    findings: ["culinary_review"], summary: "Oil and salt added to the ingredient list",
    rationale: "The paste and the three-pass grate wipe both depend on oil, and the paste and salsa use salt, but neither was listed.",
    ops: [
      addIng(10, { name: "Neutral Oil", quantity: "1/4", unit: "Cup", notes: "2 tbsp for the paste, the rest for the grates", group: "Main" }),
      addIng(11, { name: "Kosher Salt", quantity: "2", unit: "Tsp", group: "Main" }),
    ],
  },
].map((c) => fi(c, "B4-first-impression-01"));

/** First-impression recipes 11–20. */
export const B4_FIRST_IMPRESSION_02: RecipeCorrection[] = [
  {
    slug: "five-ingredient-pasta", collection: "golden-100", category: "serving_scaling",
    findings: ["culinary_review"], summary: "Spaghetti raised from 1.5 lb to 2 lb (4 oz dry per firefighter)",
    rationale: "1.5 lb for eight is 3 oz dry each — a side portion. Garlic butter pasta is the whole meal here, so 4 oz each is the realistic crew portion; the butter and Parmesan already cover 2 lb.",
    ops: [ing(0, "quantity", "1.5", "2")],
  },
  {
    slug: "beef-broccoli", collection: "golden-100", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "culinary_review"],
    summary: "Rebuilt as a complete stir-fry: rice, oil, ginger, sauce defined, broccoli cooked in batches",
    rationale: "The recipe served beef over rice that wasn't listed, cooked in oil that wasn't listed, and finished with an undefined 'oyster sauce slurry'. Two pounds of broccoli won't char in one wok load, so it's cooked in batches with a splash of water.",
    ops: [
      ing(2, "quantity", "0.3", "1/3"),
      addIng(6, { name: "Fresh Ginger, Grated", quantity: "2", unit: "Tbsp", group: "Sauce" }),
      addIng(7, { name: "Brown Sugar", quantity: "2", unit: "Tbsp", group: "Sauce" }),
      addIng(8, { name: "Low-Sodium Beef Broth", quantity: "1", unit: "Cup", group: "Sauce" }),
      addIng(9, { name: "Vegetable Oil", quantity: "4", unit: "Tbsp", group: "Main" }),
      addIng(10, { name: "Long-Grain White Rice", quantity: "3", unit: "Cups", group: "Base" }),
      stepSet(0, "Slice flank steak thin against the grain. Toss with soy, cornstarch, and a splash of oil.", "Start the rice: rinse, then simmer covered with 4½ cups water and a pinch of salt 18 minutes; rest 5 minutes and fluff. Slice flank steak thin against the grain. Toss with 2 tbsp of the soy sauce, 1 tbsp cornstarch, and 1 tbsp oil; rest 15 minutes. Whisk the remaining soy sauce, oyster sauce, brown sugar, broth, ginger, and remaining cornstarch into a sauce."),
      stepSet(1, "Heat wok or large skillet until smoking. Sear beef in single layers 1–2 minutes until edges char; remove.", "Heat wok or large skillet until smoking with 1 tbsp oil. Sear beef in single layers 1–2 minutes until edges char, adding oil between batches; remove."),
      stepSet(2, "Stir-fry broccoli 3–4 minutes with garlic until bright with charred edges. Return beef; add oyster sauce slurry; toss 1 minute until glossy.", "Stir-fry broccoli in two batches with the remaining oil, 2 minutes until charred at the edges, then add 2 tbsp water and cover 1 minute until bright green and crisp-tender. Return all broccoli and beef, add garlic for 30 seconds, then pour in the sauce and toss 1–2 minutes until it bubbles and turns glossy."),
    ],
  },
  {
    slug: "chicken-shawarma-pitas", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["culinary_review"], summary: "Salt added to the marinade",
    rationale: "A yogurt marinade with no salt leaves the chicken flat; salt is what carries the spices into the meat.",
    ops: [
      addIng(14, { name: "kosher salt", quantity: "2", unit: "tsp", group: "Chicken" }),
      step(0, "Mix yogurt, lemon, cumin, coriander, turmeric, paprika, and garlic.", "Mix yogurt, lemon, cumin, coriander, turmeric, paprika, garlic, and the salt."),
    ],
  },
  {
    slug: "bagel-sandwich-line", collection: "breakfast", category: "instruction",
    findings: ["culinary_review"], summary: "Egg sheet moved to a half-sheet pan with a realistic bake time",
    rationale: "Eighteen eggs plus milk in a quarter-sheet pan is about 1½ inches deep and won't set in 12–14 minutes. A half-sheet pan gives a ½-inch sheet that sets evenly in about 20 minutes.",
    ops: [
      step(0, "Line a rimmed quarter-sheet pan with parchment", "Line a rimmed half-sheet pan (13×18-inch) with parchment"),
      step(1, "Bake 12–14 minutes until just set and 165°F in the center.", "Bake 18–22 minutes until just set and 160°F (71°C) in the center."),
    ],
  },
  {
    slug: "hall-breakfast-burritos", collection: "breakfast", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"], summary: "Butter for the eggs listed; hot sauce quantity clarified",
    rationale: "The egg step uses butter that wasn't listed, and '1 hot sauce' didn't say how much.",
    ops: [
      addIng(9, { name: "butter", quantity: "2 tbsp", group: "Eggs" }),
      ing(8, "quantity", "1", "1 bottle"),
    ],
  },
  {
    slug: "baked-oatmeal-mixed-berries", collection: "breakfast", category: "quantity",
    findings: ["ingredient_not_in_steps"], summary: "Units moved out of ingredient names (butter, maple syrup)",
    rationale: "'0.25 cup melted butter' and '1 cup maple syrup' were stored with the unit inside the name, which breaks scaling and shopping lists.",
    ops: [
      ing(7, "name", "cup melted butter", "melted butter"), ing(7, "quantity", "0.25", "1/4 cup"),
      ing(9, "name", "cup maple syrup", "maple syrup"), ing(9, "quantity", "1", "1 cup"),
    ],
  },
  {
    slug: "jerk-chicken", collection: "golden-100", category: "missing_ingredient",
    findings: ["culinary_review"], summary: "Oil, limes for slaw and wedges, and hot sauce listed",
    rationale: "The marinade and slaw use oil, the slaw and line use lime, and the line serves hot sauce — none were listed (the lime juice is all used in the marinade).",
    ops: [
      addIng(16, { name: "Neutral Oil", quantity: "3", unit: "Tbsp", group: "Marinade" }),
      addIng(17, { name: "Limes", quantity: "3", unit: "count", group: "Sides" }),
      addIng(18, { name: "Hot Sauce", quantity: "1", unit: "bottle", group: "Sides" }),
    ],
  },
  {
    slug: "cast-iron-breakfast-skillet", collection: "breakfast", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"], summary: "Fat, salt, pepper and paprika listed; listed butter now used",
    rationale: "The steps cooked in oil that wasn't listed and never used the listed butter; seasoning and paprika weren't listed either.",
    ops: [
      field("ingredients.6", { name: "butter", quantity: "2 tbsp", optional: true }, { name: "butter", quantity: "2 tbsp" }),
      addIng(7, { name: "vegetable oil", quantity: "2 tbsp" }),
      addIng(8, { name: "kosher salt", quantity: "1 1/2 tsp", notes: "plus black pepper" }),
      addIng(9, { name: "smoked paprika", quantity: "1 tsp", notes: "or chile powder" }),
      step(1, "Heat cast iron over medium-high with oil.", "Heat cast iron over medium-high with the oil and butter."),
      step(2, "any spice tag you like (paprika/Chile)", "the smoked paprika"),
    ],
  },
].map((c) => fi(c, "B4-first-impression-02"));

/** First-impression recipes 21–30. */
export const B4_FIRST_IMPRESSION_03: RecipeCorrection[] = [
  {
    slug: "chorizo-breakfast-hash", collection: "breakfast", category: "food_safety",
    findings: ["culinary_review"], summary: "Chorizo checked to 160°F; contradictory '165°F eggs with jammy yolks' corrected",
    rationale: "Raw Mexican chorizo is ground pork (USDA 160°F) and its red color hides doneness. Eggs can't be both 165°F and jammy; the step now gives a set-white cue and the firm-yolk advice for higher-risk diners.",
    reference: "USDA FSIS Safe Minimum Internal Temperature Chart; FDA egg safety guidance",
    ops: [
      step(1, "breaking it up until browned and fat renders.", "breaking it up until browned, fat renders, and it reads 160°F (71°C) — the chile color hides doneness, so use a thermometer."),
      step(3, "Cover over medium-low heat until egg whites are fully set (165°F) and yolks are jammy.", "Cover over medium-low heat until egg whites are completely set and yolks begin to thicken, 5–7 minutes; cook yolks firm for anyone pregnant, older, or immunocompromised."),
    ],
  },
  {
    slug: "fire-captain-omelette-bar", collection: "breakfast", category: "serving_scaling",
    findings: ["culinary_review"], summary: "Eggs raised from 24 to 30 (one 3-egg omelette per person for 10)",
    rationale: "24 eggs at 3 per omelette makes 8 omelettes for a recipe that serves 10.",
    ops: [ing(0, "quantity", "24", "30")],
  },
  {
    slug: "caprese-chicken-bake", collection: "performance-meals", category: "unused_ingredient",
    findings: ["ingredient_not_in_steps"], summary: "Listed garlic added to the chicken rub",
    rationale: "Garlic was listed and bought but never used.",
    ops: [step(1, "Rub chicken with olive oil, Italian seasoning, salt, and pepper.", "Rub chicken with olive oil, minced garlic, Italian seasoning, salt, and pepper.")],
  },
  {
    slug: "30-minute-pasta-e-fagioli-for-the-hall", collection: "golden-100", category: "quantity",
    findings: ["awkward_decimal_quantity", "culinary_review"],
    summary: "Pasta trimmed to 1 lb, oil written as 1/3 cup, crushed tomatoes added",
    rationale: "1.3 lb of ditalini in 8 cups of broth absorbs the soup into a stew. The step promises a tomato-forward soup but only 3 tbsp paste was listed; a can of crushed tomatoes delivers it.",
    ops: [
      ing(0, "quantity", "1.3", "1"),
      ing(1, "quantity", "0.3", "1/3"),
      addIng(6, { name: "Crushed Tomatoes", quantity: "1", unit: "can", notes: "28 oz", group: "Beans" }),
      step(1, "Add kidney beans, broth, oregano,", "Add kidney beans, crushed tomatoes, broth, oregano,"),
    ],
  },
  {
    slug: "andouille-po-boy-rolls-crew", collection: "bbq", category: "food_safety",
    findings: ["awkward_decimal_quantity", "culinary_review"],
    summary: "Precooked andouille reheated to 165°F; sausage trimmed to 3 lb (6 oz per roll)",
    rationale: "USDA reheating guidance for fully cooked sausage is 165°F. 4.4 lb is nearly 9 oz of sausage per sandwich; 6 oz fills a half-baguette roll edge to edge.",
    reference: "USDA FSIS: reheat fully cooked sausages and leftovers to 165°F",
    ops: [
      ing(0, "quantity", "4.4", "3"), ing(0, "notes", "8 fat links", "8 links, about 6 oz each"),
      step(3, "160°F on an instant-read so the center is steaming hot", "165°F (74°C) on an instant-read so the center is steaming hot"),
    ],
  },
  {
    slug: "peruvian-sheet-pan-chicken-aji-verde", collection: "performance-meals", category: "quantity",
    findings: ["awkward_decimal_quantity"], summary: "Lime juice written as 1/3 cup",
    rationale: "Raw decimal from scaling.", ops: [ing(2, "quantity", "0.33", "1/3")],
  },
  {
    slug: "applewood-pork-shoulder-steaks", collection: "hall-expansion", category: "serving_scaling",
    findings: ["awkward_decimal_quantity", "culinary_review"],
    summary: "Rescaled for 8: 4 lb shoulder cut into 8 steaks; cider, herbs and seasoning in measurable amounts",
    rationale: "The recipe was scaled from 10 and left 4.8 lb cut into 10 steaks plus 2.6 tbsp and 7/8 tbsp measures. The glaze alone uses 1 cup cider, so 2 cups covers marinade and glaze; 1 tbsp kosher salt is right for 4 lb of marinated pork.",
    ops: [
      ing(0, "quantity", "4.8", "4"), ing(0, "notes", "cut into 10 steaks", "cut into 8 steaks, about 3/4 inch thick"),
      ing(1, "quantity", "1.6", "2"),
      ing(4, "quantity", "2.6", "2"),
      ing(5, "quantity", "1 3/4", "1"),
      ing(6, "quantity", "7/8", "2"), ing(6, "unit", "tbsp", "tsp"),
      ing(8, "quantity", "1 3/4", "2"),
      ing(9, "quantity", "1 3/4", "2"),
      step(0, "Whisk cider, olive oil,", "Whisk 1 cup cider, olive oil,"),
    ],
  },
  {
    slug: "bbq-chicken-mac-and-cheese", collection: "golden-100", category: "instruction",
    findings: ["awkward_decimal_quantity", "culinary_review"], summary: "Pan size made consistent; fried onions written as 3/4 cup",
    rationale: "'Two full-size hotel pans or one deep half-pan' are very different volumes; this batch fills one full hotel pan or two 9×13 dishes.",
    ops: [
      ing(13, "quantity", "0.8", "3/4"),
      step(6, "Butter two full-size hotel pans or one deep half-pan for eight firefighters.", "Butter one full-size hotel pan or two 9×13-inch baking dishes for eight firefighters."),
    ],
  },
  {
    slug: "bagel-lox-breakfast-board", collection: "breakfast", category: "unused_ingredient",
    findings: ["ingredient_not_in_steps"], summary: "Whipped butter placed on the board",
    rationale: "Listed but never set out.",
    ops: [step(2, "Surround with ramekins of cream cheese, capers,", "Surround with ramekins of cream cheese, whipped butter, capers,")],
  },
  {
    slug: "chipotle-lime-chicken-tacos", collection: "performance-meals", category: "quantity",
    findings: ["awkward_decimal_quantity", "culinary_review"], summary: "Lime juice raised to 1/2 cup and divided across marinade, slaw and crema",
    rationale: "The marinade used all the lime juice, then the slaw and crema used more. 1/2 cup covers 1/4 cup marinade, 2 tbsp slaw, 2 tbsp crema.",
    ops: [
      ing(3, "quantity", "0.33", "1/2"),
      step(0, "Blend chipotle, adobo, lime juice,", "Blend chipotle, adobo, 1/4 cup of the lime juice,"),
    ],
  },
].map((c) => fi(c, "B4-first-impression-03"));

/** First-impression recipes 31–40. */
export const B4_FIRST_IMPRESSION_04: RecipeCorrection[] = [
  {
    slug: "honey-lime-chicken-tray", collection: "performance-meals", category: "quantity",
    findings: ["awkward_decimal_quantity"], summary: "Honey written as 1/3 cup",
    rationale: "Raw decimal from scaling.", ops: [ing(4, "quantity", "0.33", "1/3")],
  },
  {
    slug: "peanut-chicken-rice-bowls", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "fractional_count", "awkward_decimal_quantity"],
    summary: "Sauce ingredients, oil and rice water listed; 3 limes, 1 1/2 lb carrots",
    rationale: "The sauce used soy, chili sauce and water that weren't listed, the chicken was cooked in unlisted oil, and '3.2 limes' was a scaling leftover. Rice water is stated so a first-timer gets fluffy jasmine rice.",
    ops: [
      ing(4, "quantity", "1.6", "1 1/2"), field("ingredients.4.notes", undefined, "peeled and shredded"),
      ing(5, "quantity", "3.2", "3"), field("ingredients.5.notes", undefined, "2 juiced for the sauce, 1 cut into wedges"),
      addIng(6, { name: "low-sodium soy sauce", quantity: "1/3", unit: "cup" }),
      addIng(7, { name: "chili garlic sauce or sriracha", quantity: "2", unit: "tbsp" }),
      addIng(8, { name: "vegetable oil", quantity: "3", unit: "tbsp" }),
      addIng(9, { name: "kosher salt", quantity: "1", unit: "tsp" }),
      stepSet(0, "Rinse rice until the water is less cloudy, then cook with water in a covered pot.", "Rinse rice until the water is less cloudy, then bring to a boil with 5 cups water and the salt; cover and simmer on low 15 minutes."),
      step(1, "Whisk peanut butter, soy sauce, lime juice, warm water, and chili sauce until pourable.", "Whisk peanut butter, soy sauce, juice of 2 limes, chili sauce, and about 3/4 cup warm water until pourable."),
      step(9, "then drizzle remaining sauce.", "then drizzle remaining sauce and add a lime wedge."),
    ],
  },
  {
    slug: "shawarma-bar-night", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "awkward_decimal_quantity"],
    summary: "Bar toppings (tomato, onion, parsley) and salt listed; scaling leftovers rounded; salt reduced to 1 tbsp",
    rationale: "The bar served tomatoes, onion and parsley that weren't on the shopping list. '7/8 tsp' and '1.6 cups' were scaling leftovers, and 2 tbsp salt is heavy for 4 lb of chicken. Boneless thighs have no skin, so the 'skin-side up' cue is corrected.",
    ops: [
      ing(3, "quantity", "1 3/4", "2"), ing(4, "quantity", "1 3/4", "2"), ing(5, "quantity", "7/8", "1"),
      ing(8, "quantity", "1.6", "1 1/2"), ing(9, "quantity", "1.6", "1 1/2"),
      addIng(10, { name: "kosher salt", quantity: "1", unit: "tbsp", group: "Marinade" }),
      addIng(11, { name: "tomatoes", quantity: "3", unit: "large", notes: "diced", group: "Bar" }),
      addIng(12, { name: "red onion", quantity: "1", unit: "large", notes: "thinly sliced", group: "Bar" }),
      addIng(13, { name: "fresh parsley", quantity: "1", unit: "cup", notes: "chopped", group: "Bar" }),
      step(0, "garlic, and 2 tbsp salt.", "garlic, and the salt."),
      step(1, "Arrange thighs on oiled sheet pans skin-side up.", "Arrange thighs flat on oiled sheet pans."),
    ],
  },
  {
    slug: "teriyaki-chicken-rice-bowls", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "awkward_decimal_quantity"],
    summary: "Garlic, cornstarch, oil and chili crisp listed; scaling leftovers rounded; rice water stated; stray mandarin garnish removed",
    rationale: "The sauce used garlic and cornstarch that weren't listed, the sear used unlisted oil, and quantities like 3.2 lb and 2.4 cups were scaling leftovers. Mandarin segments appeared only in the final step.",
    ops: [
      ing(0, "quantity", "3.2", "3"), ing(1, "quantity", "2.4", "2 1/2"),
      ing(2, "quantity", "5/8", "2/3"), ing(3, "quantity", "3/8", "1/3"),
      ing(4, "quantity", "1 3/4", "2"), field("ingredients.4.notes", undefined, "freshly grated"),
      ing(5, "quantity", "1.6", "1 1/2"), ing(8, "quantity", "2.4", "2 1/2"), field("ingredients.8.notes", undefined, "shelled, thawed"),
      addIng(11, { name: "garlic cloves", quantity: "4", unit: "cloves", notes: "minced", group: "Sauce" }),
      addIng(12, { name: "cornstarch", quantity: "2", unit: "tbsp", group: "Sauce" }),
      addIng(13, { name: "vegetable oil", quantity: "3", unit: "tbsp", group: "Protein" }),
      addIng(14, { name: "chili crisp", quantity: "1/4", unit: "cup", notes: "optional, at the line", group: "Finish" }),
      step(0, "garlic, cornstarch, and water in a cold bowl.", "garlic, cornstarch, and 1/2 cup water in a cold bowl."),
      step(1, "bring it and measured salted water to a boil", "bring it and 3 1/4 cups salted water to a boil"),
      step(9, "Set bowls on the pass with mandarin segments and reserve", "Set bowls on the pass and reserve"),
    ],
  },
  {
    slug: "mediterranean-baked-fish-tray", collection: "performance-meals", category: "quantity",
    findings: ["awkward_decimal_quantity"], summary: "Olive oil written as 1/3 cup",
    rationale: "Raw decimal from scaling.", ops: [ing(6, "quantity", "0.33", "1/3")],
  },
  {
    slug: "high-protein-chicken-fried-rice", collection: "performance-meals", category: "serving_scaling",
    findings: ["awkward_decimal_quantity", "culinary_review"],
    summary: "Rice amount clarified (4 cups uncooked ≈ 12 cups cooked) and fried in two batches",
    rationale: "'4 cups jasmine rice (cooked)' read as 4 cups cooked — half a cup per firefighter. Twelve cups of rice plus chicken won't fry in one wok load without steaming.",
    ops: [
      ing(1, "notes", "cooked and refrigerated overnight", "uncooked; cook the day before and refrigerate (about 12 cups cooked)"),
      ing(6, "quantity", "0.33", "1/3"),
      step(3, "add remaining oil, then add cold rice, breaking up clumps with a spatula. Stir-fry 4–5 minutes", "add remaining oil, then add cold rice in two batches, breaking up clumps with a spatula. Stir-fry each batch 4–5 minutes"),
    ],
  },
  {
    slug: "chicken-pot-pie", collection: "golden-100", category: "missing_ingredient",
    findings: ["culinary_review"],
    summary: "'1 batch butter and flour' replaced with measured roux; egg wash, seasoning listed; onion sautéed; pan size stated",
    rationale: "The recipe couldn't be shopped or cooked as written: no roux quantities, an egg wash with no egg, no seasoning, and raw onion folded straight into the filling. 1/2 cup each butter and flour thickens 3 cups broth to a pot-pie sauce.",
    ops: [
      field("ingredients.5", { name: "Butter And Flour", quantity: "1", unit: "batch", group: "Roux" }, { name: "Unsalted Butter", quantity: "1/2", unit: "Cup", group: "Roux" }),
      addIng(6, { name: "All-Purpose Flour", quantity: "1/2", unit: "Cup", group: "Roux" }),
      addIng(7, { name: "Dried Thyme", quantity: "1", unit: "Tsp", group: "Sauce" }),
      addIng(8, { name: "Kosher Salt", quantity: "2", unit: "Tsp", group: "Sauce" }),
      addIng(9, { name: "Black Pepper", quantity: "1", unit: "Tsp", group: "Sauce" }),
      addIng(10, { name: "Large Egg", quantity: "1", unit: "count", notes: "beaten with 1 tbsp water, for egg wash", group: "Top" }),
      stepSet(1, "Melt butter; whisk in flour and cook 2 minutes to make a roux. Whisk in 3 cups broth until thick and smooth — this butter-flour-broth sauce is called a velouté. Fold in chicken, peas, carrots, and onion.", "Melt butter over medium heat and cook the onion 5 minutes until soft. Whisk in flour and cook 2 minutes to make a roux. Whisk in 3 cups broth until thick and smooth — this butter-flour-broth sauce is called a velouté. Season with thyme, salt, and pepper, then fold in chicken, peas, and carrots."),
      step(2, "Transfer filling to hotel pans;", "Transfer filling to a deep 9×13-inch dish or half hotel pan;"),
    ],
  },
  {
    slug: "mac-and-cheese-bake", collection: "golden-100", category: "quantity",
    findings: ["culinary_review"], summary: "Roux raised to 1/2 cup butter and flour for 8 cups milk; pan size stated",
    rationale: "6 tbsp flour only lightly thickens 8 cups of milk; with 2 lb of pasta the bake comes out thin. 8 tbsp gives a sauce that coats and sets.",
    ops: [
      ing(1, "quantity", "6", "8"), ing(2, "quantity", "6", "8"),
      step(3, "Transfer to buttered hotel pans.", "Transfer to a buttered full-size hotel pan or two 9×13-inch dishes."),
    ],
  },
  {
    slug: "beef-gyros-for-the-hall", collection: "hall-expansion", category: "food_safety",
    findings: ["step_ingredient_not_listed", "culinary_review"],
    summary: "Steak cooked to at least 145°F; salt, pepper and pickling vinegar measured; side note rewritten",
    rationale: "USDA minimum for whole beef cuts is 145°F with a rest. '1 batch salt and pepper' couldn't be measured, and the optional pickled onion used unlisted vinegar.",
    reference: "USDA FSIS Safe Minimum Internal Temperature Chart",
    ops: [
      field("ingredients.6", { name: "kosher salt and black pepper", quantity: "1", unit: "batch", group: "Spice" }, { name: "kosher salt", quantity: "2", unit: "tsp", group: "Spice" }),
      addIng(7, { name: "black pepper", quantity: "1", unit: "tsp", group: "Spice" }),
      addIng(12, { name: "red wine vinegar", quantity: "1/2", unit: "cup", notes: "optional, for quick-pickled onion", group: "Veg" }),
      step(1, "Sear over high heat 3–4 minutes per side for medium-rare to medium.", "Sear over high heat 3–4 minutes per side until the thickest part reads at least 145°F (63°C)."),
      step(4, "Fries or simple salad are classic sides at Canadian groceries.", "Fries or a simple Greek salad are classic sides."),
    ],
  },
].map((c) => fi(c, "B4-first-impression-04"));

/** First-impression recipes 41–50. */
export const B4_FIRST_IMPRESSION_05: RecipeCorrection[] = [
  {
    slug: "mostaccioli-sausage-bake", collection: "hall-expansion", category: "serving_scaling",
    findings: ["awkward_decimal_quantity", "fractional_count"],
    summary: "Rescaled for 8 in buyable amounts (1 whole egg, 2.5 lb sausage, 5 cups marinara); pasta name and portion count fixed",
    rationale: "Scaled from 10 servings and never cleaned up: '3/4 whole egg', 1.6 lb pasta, 4.8 cups sauce, and a step that still cut ten portions and called the pasta ziti.",
    ops: [
      ing(0, "quantity", "1.6", "1 1/2"), ing(1, "quantity", "2.4", "2 1/2"), ing(2, "quantity", "4.8", "5"),
      ing(3, "quantity", "1.6", "1 1/2"), ing(4, "quantity", "2.4", "2 1/2"),
      ing(6, "quantity", "3/4", "1"), ing(6, "unit", "whole", "large"),
      ing(9, "quantity", "7/8", "1/2"),
      step(0, "Boil ziti in salted water", "Boil mostaccioli in salted water"),
      step(3, "Toss ziti with sausage sauce", "Toss pasta with sausage sauce"),
      step(4, "Cut into ten portions", "Cut into eight portions"),
    ],
  },
  {
    slug: "loaded-baked-potato-bar", collection: "golden-100", category: "serving_scaling",
    findings: ["count_per_person_high", "step_ingredient_not_listed"],
    summary: "Potatoes cut from 24 to 16 (two per firefighter); oil and salt listed; chili added to the bar; cook time corrected",
    rationale: "Three large russets each is far more than a crew eats with this many toppings. The jackets were rubbed with unlisted oil and salt, the optional chili never reached the bar, and cook time said 125 minutes for a 50–65 minute bake.",
    ops: [
      ing(0, "quantity", "24", "16"),
      addIng(7, { name: "Vegetable Oil", quantity: "2", unit: "Tbsp", group: "Base" }),
      addIng(8, { name: "Coarse Kosher Salt", quantity: "1", unit: "Tbsp", group: "Base" }),
      step(2, "and green onions in separate bowls with serving spoons.", "and green onions in separate bowls with serving spoons, plus a pot of warm chili or pulled beef if using (heated to 165°F)."),
      field("cookTime", 125, 75),
    ],
  },
  {
    slug: "pesto-tomato-chicken-tray", collection: "performance-meals", category: "unused_ingredient",
    findings: ["ingredient_not_in_steps"], summary: "Listed garlic stirred into the pesto",
    rationale: "Garlic was listed and bought but never used.",
    ops: [step(3, "Brush pesto over chicken and vegetables.", "Stir garlic into the pesto, then brush over chicken and vegetables.")],
  },
  {
    slug: "herb-baked-salmon-tray", collection: "performance-meals", category: "food_safety",
    findings: ["culinary_review"], summary: "Salmon doneness raised from 125–130°F to the USDA 145°F",
    rationale: "125–130°F is a restaurant medium-rare preference; the USDA safe minimum for fish is 145°F or opaque flesh that flakes easily.",
    reference: "USDA FSIS Safe Minimum Internal Temperature Chart (fish & shellfish 145°F)",
    ops: [
      step(3, "Bake 12–16 minutes until thickest part reads 125–130°F and flakes with gentle pressure.", "Bake 12–16 minutes until thickest part reads 145°F (63°C) and flakes easily with a fork."),
      step(4, "Flesh should look opaque pink at center, not chalky or gray throughout.", "Flesh should be opaque all the way through and moist, not chalky or gray."),
    ],
  },
  {
    slug: "bbq-breakfast-hash", collection: "breakfast", category: "food_safety",
    findings: ["culinary_review"], summary: "Leftover BBQ reheated to 165°F",
    rationale: "Leftover pulled pork or brisket must be reheated to 165°F.",
    reference: "USDA FSIS Leftovers and Food Safety",
    ops: [step(1, "Heat through without drying the meat.", "Heat through to 165°F (74°C) without drying the meat.")],
  },
  {
    slug: "belgian-waffle-platter", collection: "breakfast", category: "missing_ingredient",
    findings: ["culinary_review"], summary: "Salt listed",
    rationale: "The batter uses salt that wasn't listed.",
    ops: [addIng(2, { name: "kosher salt", quantity: "1 tsp", group: "Batter" })],
  },
  {
    slug: "biscuit-french-toast-sliders", collection: "breakfast", category: "serving_scaling",
    findings: ["culinary_review"], summary: "16 biscuits for two sliders each; custard and glaze scaled to match",
    rationale: "The serve step plates two sliders per person, but 8 biscuits make 8 sliders for 8 people.",
    ops: [
      ing(0, "quantity", "8", "16"),
      ing(1, "quantity", "6", "8"), ing(2, "quantity", "1 1/2 cups", "2 cups"),
      ing(5, "quantity", "3 tbsp", "4 tbsp"),
      ing(6, "quantity", "1/4 cup", "1/2 cup"), ing(6, "notes", "mixed with 2 tbsp melted butter", "mixed with 4 tbsp melted butter"),
    ],
  },
  {
    slug: "costco-rotisserie-remix", collection: "hall-expansion", category: "serving_scaling",
    findings: ["fractional_count", "awkward_decimal_quantity"],
    summary: "Rescaled for 8 in buyable amounts: 3 chickens, 10 cups rice, 3 lb broccoli, 1 lb cheddar, 3 cups milk",
    rationale: "'3.2 rotisserie chickens' and 2.4 lb of cheddar (about 10 cups) were scaling leftovers; 1 lb shredded covers two casserole dishes generously.",
    ops: [
      ing(0, "quantity", "3.2", "3"), ing(1, "quantity", "9.6", "10"), ing(2, "quantity", "3.2", "3"),
      ing(4, "quantity", "2.4", "1"), field("ingredients.4.notes", undefined, "shredded"),
      ing(5, "quantity", "3.2", "3"),
    ],
  },
  {
    slug: "black-bean-egg-white-breakfast-burritos", collection: "breakfast", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"], summary: "Cumin, oil and salt listed; hot sauce quantity clarified",
    rationale: "The steps used cumin, oil and salt that weren't listed, and '1 hot sauce' didn't say how much.",
    ops: [
      addIng(8, { name: "ground cumin", quantity: "1 tsp", group: "Fillings" }),
      addIng(9, { name: "vegetable oil", quantity: "1 tbsp", group: "Fillings" }),
      addIng(10, { name: "kosher salt", quantity: "1/2 tsp", group: "Fillings" }),
      ing(7, "quantity", "1", "1 bottle"),
      step(1, "seasoning with a pinch of salt and cumin if desired.", "seasoning with the salt and cumin."),
    ],
  },
].map((c) => fi(c, "B4-first-impression-05"));

/** Follow-ups from the post-correction re-audit of the first-impression set. */
export const B4_FIRST_IMPRESSION_06: RecipeCorrection[] = [
  {
    slug: "steak-tacos", collection: "golden-100", category: "serving_scaling",
    findings: ["count_per_person_high", "step_ingredient_not_listed"],
    summary: "Tortillas cut from 48 to 32 (four street tacos per firefighter); chimichurri texture cue reworded",
    rationale: "4.5 lb raw steak yields about 6 oz cooked per person — four well-filled street tacos, not six thin ones. 'Not mayonnaise-thick' read like an unlisted ingredient.",
    ops: [
      ing(15, "quantity", "48", "32"),
      step(0, "not mayonnaise-thick", "never thick or creamy"),
    ],
  },
  {
    slug: "chili-lime-grilled-tilapia", collection: "bbq", category: "instruction",
    findings: ["step_ingredient_not_listed"], summary: "Unlisted rice side reworded as a general serving suggestion",
    rationale: "The serve step named cilantro-lime rice that the recipe never makes.",
    ops: [step(7, "Cilantro-lime rice alongside turns it into a full plate.", "Add a starch on the side to make it a full plate.")],
  },
  {
    slug: "mediterranean-baked-fish-tray", collection: "performance-meals", category: "instruction",
    findings: ["ingredient_not_in_steps"], summary: "Steps name the cod",
    rationale: "The steps only said 'fish', so the listed cod looked unused.",
    ops: [step(1, "Pat fish dry. Nest fillets among vegetables.", "Pat cod dry. Nest fillets among vegetables.")],
  },
].map((c) => fi(c, "B4-first-impression-06"));
