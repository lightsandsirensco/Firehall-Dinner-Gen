import type { RecipeCorrection } from "../types.js";
import { addIng, field, ing, step, text } from "./helpers.js";

const mech = (c: Omit<RecipeCorrection, "batch">, batch: string): RecipeCorrection => ({ ...c, batch });

/** [index, oldName, oldQty, newName, newQty] */
type UnitFix = [number, string, string, string, string];

const unitFix = (slug: string, fixes: UnitFix[]): RecipeCorrection => ({
  slug, collection: "breakfast", batch: "B5-mechanical-01", category: "quantity",
  findings: ["awkward_decimal_quantity"],
  summary: `Units moved out of ${fixes.length} ingredient names; decimals written as kitchen fractions`,
  rationale: "Names like 'cup brown sugar' with quantity '0.75' break scaling, shopping-list merging and ingredient matching.",
  ops: fixes.flatMap(([i, n0, q0, n1, q1]) => [ing(i, "name", n0, n1), ing(i, "quantity", q0, q1)]),
});

export const B5_MECHANICAL_01: RecipeCorrection[] = [
  unitFix("baked-oatmeal-mixed-berries", [
    [0, "cups quick oats", "4", "quick oats", "4 cups"],
    [1, "cup brown sugar", "0.75", "brown sugar", "3/4 cup"],
    [2, "tsp baking powder", "2", "baking powder", "2 tsp"],
    [3, "tsp cinnamon", "1.5", "cinnamon", "1 1/2 tsp"],
    [4, "tsp kosher salt", "0.5", "kosher salt", "1/2 tsp"],
    [5, "cups whole milk", "3", "whole milk", "3 cups"],
    [8, "cups mixed berries", "3", "mixed berries", "3 cups"],
    [10, "cups Greek yogurt", "2", "Greek yogurt", "2 cups"],
  ]),
  unitFix("shakshuka-for-the-hall", [
    [6, "tbsp tomato paste", "2", "tomato paste", "2 tbsp"],
    [7, "tsp ground cumin", "2", "ground cumin", "2 tsp"],
    [8, "tsp smoked paprika", "1", "smoked paprika", "1 tsp"],
    [9, "tsp cayenne", "0.5", "cayenne", "1/2 tsp"],
    [11, "cups crumbled feta", "1.5", "crumbled feta", "1 1/2 cups"],
  ]),
  unitFix("menemen-for-the-crew", [
    [0, "cup extra-virgin olive oil", "0.75", "extra-virgin olive oil", "3/4 cup"],
    [3, "cups chopped tomatoes", "2", "chopped tomatoes", "2 cups"],
    [4, "tsp hot paprika", "1", "hot paprika", "1 tsp"],
    [5, "tsp dried oregano", "0.5", "dried oregano", "1/2 tsp"],
    [7, "cup chopped chives or parsley", "0.25", "chopped chives or parsley", "1/4 cup"],
  ]),
];

/** Library-wide ingredient/quantity fixes, ordered by traffic: recipes 1–10. */
export const B5_MECHANICAL_02: RecipeCorrection[] = [
  {
    slug: "meatloaf-mashed", collection: "golden-100", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"],
    summary: "'Ketchup glaze' and '1 batch butter and milk' replaced with measured ingredients; onion and seasoning listed; glaze step added",
    rationale: "The recipe couldn't be shopped: the glaze and mash fats had no amounts, and onion, salt and pepper were used but not listed. The glaze was never actually applied in the steps.",
    ops: [
      addIng(3, { name: "Yellow Onion, Finely Diced", quantity: "1", unit: "large", group: "Main" }),
      ing(4, "name", "Ketchup Glaze", "Ketchup"),
      addIng(5, { name: "Brown Sugar", quantity: "1/4", unit: "Cup", group: "Glaze" }),
      addIng(6, { name: "Apple Cider Vinegar", quantity: "1", unit: "Tbsp", group: "Glaze" }),
      field("ingredients.8", { name: "Butter And Milk", quantity: "1", unit: "batch", group: "Mashed potatoes" }, { name: "Unsalted Butter", quantity: "1/2", unit: "Cup", group: "Mashed potatoes" }),
      addIng(9, { name: "Whole Milk", quantity: "2", unit: "Cups", notes: "1/2 cup for the meatloaf, 1 1/2 cups for the mash", group: "Mashed potatoes" }),
      addIng(10, { name: "Kosher Salt", quantity: "1", unit: "Tbsp", group: "Seasoning" }),
      addIng(11, { name: "Black Pepper", quantity: "2", unit: "Tsp", group: "Seasoning" }),
      step(0, "Combine ground beef, breadcrumbs, eggs, diced onion, salt, and pepper.", "Combine ground beef, breadcrumbs, eggs, diced onion, 1/2 cup milk, 2 tsp salt, and 1 tsp pepper — mix by hand just until combined."),
      step(1, "Bake at 375°F 50–60 minutes until internal temp hits 160°F and glaze caramelizes.", "Whisk ketchup, brown sugar, and vinegar; brush half over the loaves. Bake at 375°F 40 minutes, brush on the remaining glaze, and bake 10–20 minutes more until internal temp hits 160°F and the glaze caramelizes."),
      step(2, "mash with butter and warm milk until smooth. Season aggressively", "mash with butter and the remaining warm milk until smooth. Season aggressively with the remaining salt and pepper"),
    ],
  },
  {
    slug: "breakfast-enchiladas", collection: "breakfast", category: "unused_ingredient",
    findings: ["ingredient_not_in_steps"], summary: "Sour cream, cilantro and lime wedges now used in the steps",
    rationale: "Three listed finishing ingredients never appeared in the method.",
    ops: [
      step(3, "Pour remaining sauce evenly over the rolls.", "Whisk sour cream into the remaining sauce and pour it evenly over the rolls."),
      step(4, "Rest 10 minutes before cutting into portions so slices hold on the plate.", "Rest 10 minutes before cutting into portions so slices hold on the plate. Scatter cilantro over the top and serve with lime wedges."),
    ],
  },
  {
    slug: "shepherds-pie", collection: "golden-100", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"],
    summary: "'1 batch butter and cream' replaced with measured amounts; tomato paste, flour, Worcestershire and seasoning listed; pan size stated",
    rationale: "Tomato paste, salt and white pepper were used but not listed, and the topping fat had no amounts. A little flour is what lets 2 cups of broth thicken in 15 minutes.",
    ops: [
      addIng(4, { name: "Tomato Paste", quantity: "3", unit: "Tbsp", group: "Sauce" }),
      addIng(5, { name: "All-Purpose Flour", quantity: "3", unit: "Tbsp", group: "Sauce" }),
      addIng(6, { name: "Worcestershire Sauce", quantity: "2", unit: "Tbsp", group: "Sauce" }),
      field("ingredients.8", { name: "Butter And Cream", quantity: "1", unit: "batch", group: "Potato topping" }, { name: "Unsalted Butter", quantity: "1/2", unit: "Cup", group: "Potato topping" }),
      addIng(9, { name: "Heavy Cream", quantity: "1", unit: "Cup", group: "Potato topping" }),
      addIng(10, { name: "Kosher Salt", quantity: "1", unit: "Tbsp", group: "Seasoning" }),
      addIng(11, { name: "White Pepper", quantity: "1", unit: "Tsp", group: "Seasoning" }),
      step(0, "Drain excess fat. Add peas, carrots, broth, and tomato paste; simmer 15 minutes until thick.", "Drain excess fat. Stir in flour and tomato paste and cook 1 minute. Add peas, carrots, broth, Worcestershire, and 2 tsp salt; simmer 15 minutes until thick."),
      step(1, "Season with salt and white pepper.", "Season with the remaining salt and the white pepper."),
      step(2, "Spread filling in hotel pans;", "Spread filling in a deep half hotel pan or two 9×13-inch dishes;"),
    ],
  },
  {
    slug: "firehall-gyro-bowls", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "fractional_count"],
    summary: "Spices, garlic, lemon and parsley listed; scaling leftovers rounded; rice water stated",
    rationale: "Oregano, garlic, cumin, lemon and parsley drive the flavor but weren't on the shopping list, and '3.2 cucumbers' and '1.6 red onions' were scaling leftovers.",
    ops: [
      ing(2, "quantity", "3.2", "3"), ing(3, "quantity", "2.4", "2 1/2"), ing(5, "quantity", "1.6", "1"), ing(5, "unit", "each", "large"),
      addIng(6, { name: "garlic cloves", quantity: "6", unit: "cloves", notes: "minced" }),
      addIng(7, { name: "dried oregano", quantity: "1", unit: "tbsp" }),
      addIng(8, { name: "ground cumin", quantity: "2", unit: "tsp" }),
      addIng(9, { name: "kosher salt", quantity: "2", unit: "tsp" }),
      addIng(10, { name: "black pepper", quantity: "1", unit: "tsp" }),
      addIng(11, { name: "lemons", quantity: "3", unit: "each", notes: "zested and juiced" }),
      addIng(12, { name: "fresh parsley", quantity: "1/2", unit: "cup", notes: "chopped" }),
      step(0, "Cook rinsed rice in salted water,", "Cook rinsed rice in 6 cups salted water,"),
    ],
  },
  {
    slug: "texas-central-brisket-crew", collection: "bbq", category: "serving_scaling",
    findings: ["step_ingredient_not_listed", "awkward_decimal_quantity"],
    summary: "'4 lb whole packer' corrected to a 6 lb brisket flat; rub, sides and bread rounded for 8",
    rationale: "A whole packer brisket weighs 12–16 lb; 4 lb is a flat, and it would yield only about 4 oz cooked per person. A 6 lb flat fits the 9–11 hour cook and gives about 6 oz each. '7/8 tbsp', '3/4 onion' and '17 slices' were scaling leftovers.",
    ops: [
      ing(0, "name", "Whole Packer Brisket", "Brisket Flat"), ing(0, "quantity", "4", "6"),
      ing(3, "quantity", "7/8", "1"), ing(4, "quantity", "2.6", "3"),
      ing(5, "quantity", "1.6", "1 1/2"), ing(6, "quantity", "1.6", "1 1/2"),
      ing(7, "quantity", "3/4", "1"), ing(8, "quantity", "17", "16"),
      text("description", "a whole packer brisket gets", "a brisket flat gets"),
      step(3, "until probe slides like butter and flat reads 203°F", "until a probe slides in with no resistance and the flat reads 203°F"),
    ],
  },
  {
    slug: "asian-chicken-lettuce-cups", collection: "performance-meals", category: "quantity",
    findings: ["ingredient_not_in_steps", "awkward_decimal_quantity"], summary: "Steps name the green onions; decimals written as fractions",
    rationale: "The steps called them scallions, so the listed green onions looked unused.",
    ops: [
      step(2, "half the scallions", "half the green onions"),
      step(4, "sprinkle peanuts and scallions", "sprinkle peanuts and the remaining green onions"),
      ing(6, "quantity", "0.25", "1/4"), ing(7, "quantity", "0.33", "1/3"), ing(10, "quantity", "0.75", "3/4"),
    ],
  },
  {
    slug: "baked-falafel-hall-bowls", collection: "performance-meals", category: "quantity",
    findings: ["ingredient_not_in_steps", "awkward_decimal_quantity"], summary: "Steps name the parsley and cilantro; rice water stated; decimals written as fractions",
    rationale: "The steps said 'herbs', so the listed parsley and cilantro looked unused; '1:1.75' is easier as a measured amount.",
    ops: [
      step(0, "Pulse in food processor with herbs,", "Pulse in food processor with parsley, cilantro,"),
      step(2, "Cook 1:1.75 rice to water with a pinch of salt;", "Cook with 5 1/4 cups water and a pinch of salt;"),
      ing(0, "quantity", "1.5", "1 1/2"), ing(7, "quantity", "1.5", "1 1/2"), ing(9, "quantity", "0.75", "3/4"),
      ing(10, "quantity", "0.5", "1/2"), ing(14, "quantity", "0.5", "1/2"),
    ],
  },
  {
    slug: "baked-turkey-meatball-marinara", collection: "performance-meals", category: "unused_ingredient",
    findings: ["ingredient_not_in_steps", "awkward_decimal_quantity"], summary: "Basil used to finish; decimals written as fractions",
    rationale: "A cup of fresh basil was listed but never used.",
    ops: [
      step(4, "Meatballs should feel springy, not dense, when cut open.", "Meatballs should feel springy, not dense, when cut open. Scatter torn basil over the pan just before serving."),
      ing(1, "quantity", "1.5", "1 1/2"), ing(4, "quantity", "0.5", "1/2"),
    ],
  },
  {
    slug: "bbq-pulled-pork-bowls", collection: "hall-expansion", category: "serving_scaling",
    findings: ["step_ingredient_not_listed", "fractional_count"],
    summary: "Ingredient amounts now match the steps (3 cups broth, 3 cups rice); rub, oil and slaw dressing listed; scaling leftovers rounded",
    rationale: "The list was scaled to 2.4 cups of broth and rice while the steps used 3 cups. The rub and the slaw dressing used ingredients that weren't listed.",
    ops: [
      ing(0, "quantity", "5.6", "5"), ing(1, "quantity", "2.4", "2 1/2"), ing(2, "quantity", "2.4", "3"),
      ing(3, "quantity", "2.4", "2"), ing(3, "unit", "each", "large"), ing(4, "quantity", "2.4", "3"),
      ing(5, "quantity", "2.4", "2"), ing(6, "quantity", "3.2", "3"), field("ingredients.6.notes", undefined, "frozen, thawed"),
      ing(7, "quantity", "2.4", "2"), ing(8, "quantity", "1.6", "1 1/2"), ing(9, "quantity", "1.6", "1 1/2"), field("ingredients.9.notes", undefined, "shredded"),
      addIng(10, { name: "kosher salt", quantity: "1 1/2", unit: "tbsp", group: "Protein" }),
      addIng(11, { name: "black pepper", quantity: "1", unit: "tbsp", group: "Protein" }),
      addIng(12, { name: "garlic powder", quantity: "1", unit: "tbsp", group: "Protein" }),
      addIng(13, { name: "smoked paprika", quantity: "1", unit: "tbsp", group: "Protein" }),
      addIng(14, { name: "vegetable oil", quantity: "2", unit: "tbsp", group: "Protein" }),
      addIng(15, { name: "mayonnaise", quantity: "3/4", unit: "cup", group: "Cold bar" }),
      addIng(16, { name: "apple cider vinegar", quantity: "3", unit: "tbsp", notes: "2 tbsp for the slaw, the rest to finish the pork", group: "Cold bar" }),
      step(4, "Toss coleslaw mix with dressing just before service", "Toss coleslaw mix with the mayonnaise, 2 tbsp vinegar, and a pinch of salt just before service"),
    ],
  },
  {
    slug: "beer-can-chicken", collection: "golden-100", category: "serving_scaling",
    findings: ["ingredient_not_in_steps", "culinary_review"],
    summary: "Two birds for 8 (the steps already hold a backup bird); rub and lime now used",
    rationale: "One 5 lb chicken feeds four or five, and the steps already referred to a backup bird. The listed rub and lime juice were never used.",
    ops: [
      ing(0, "name", "Whole Chicken Or Bone-In Thighs", "Whole Chickens Or Bone-In Thighs"), ing(0, "quantity", "5", "10"),
      field("ingredients.0.notes", undefined, "two 5-lb birds"),
      ing(1, "quantity", "1", "2"), ing(2, "quantity", "3", "1/4"), ing(2, "unit", "Tbsp", "Cup"),
      step(0, "Dry chicken thoroughly. Season under skin and in cavity.", "Dry chicken thoroughly. Rub with oil, then season under the skin, over the skin, and in the cavity with the rub and salt."),
      step(3, "Serve on sheet trays with pan juices", "Squeeze lime juice over the carved chicken and serve on sheet trays with pan juices"),
    ],
  },
].map((c) => mech(c, "B5-mechanical-02"));

/** Recipes 11–20 by traffic. */
export const B5_MECHANICAL_03: RecipeCorrection[] = [
  {
    slug: "blueberry-almond", collection: "smoothies", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"], summary: "Optional honey listed; oats amount written as 1/4 cup",
    rationale: "The finishing step offers honey that wasn't listed.",
    ops: [
      addIng(6, { name: "honey", quantity: "1", unit: "tsp", notes: "optional, only if the berries are tart" }),
      ing(4, "quantity", "0.25", "1/4"),
    ],
  },
  {
    slug: "breakfast-sliders", collection: "breakfast", category: "serving_scaling",
    findings: ["ingredient_not_in_steps", "culinary_review"], summary: "24 sausage patties for 24 rolls; bagel seasoning used on top",
    rationale: "Two packages make 24 sliders but only 12 patties were listed. The optional everything seasoning was never applied.",
    ops: [
      ing(1, "quantity", "12", "24"),
      step(3, "Brush generously over roll tops.", "Brush generously over roll tops and sprinkle with everything bagel seasoning if using."),
    ],
  },
  {
    slug: "buffalo-chicken-sweet-potato-bowls", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "fractional_count"],
    summary: "Seasoning listed; scaling leftovers rounded; unlisted celery removed",
    rationale: "Garlic powder, salt and pepper season both the potatoes and the chicken but weren't listed; '3.2 avocados' and '1.6 cucumbers' were scaling leftovers; celery appeared only in the last step.",
    ops: [
      ing(0, "quantity", "2.8", "3"), ing(5, "quantity", "1.6", "2"), ing(6, "quantity", "2.4", "2 1/2"),
      ing(7, "quantity", "2.4", "2 1/2"), ing(8, "quantity", "3.2", "3"), ing(10, "quantity", "1.6", "1 1/2"),
      ing(1, "unit", "cups", "cup"),
      addIng(12, { name: "garlic powder", quantity: "2", unit: "tsp" }),
      addIng(13, { name: "kosher salt", quantity: "2", unit: "tsp" }),
      addIng(14, { name: "black pepper", quantity: "1", unit: "tsp" }),
      step(3, "Leaving sauce over the burner makes its butter solids scorch and taste bitter.", "Leaving sauce over the burner makes it scorch and taste bitter."),
      step(9, "Carry bowls to the pass with celery sticks nearby and keep", "Carry bowls to the pass and keep"),
    ],
  },
  {
    slug: "build-your-own-pho-bar", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "awkward_decimal_quantity"],
    summary: "Charred onion, cilantro, limes and fish sauce listed; scaling leftovers rounded; beef raised to 2 lb",
    rationale: "Four ingredients the steps rely on weren't listed. 1.6 lb sirloin is about 3 oz per bowl; 2 lb gives a proper 4 oz.",
    ops: [
      ing(2, "quantity", "3/4", "1"), ing(3, "quantity", "2.4", "3"), ing(5, "quantity", "1.6", "2"),
      ing(6, "quantity", "3.2", "3"), ing(7, "quantity", "1.6", "1 1/2"), ing(8, "quantity", "3/4", "1"), ing(9, "quantity", "3/8", "1/2"),
      addIng(10, { name: "yellow onion", quantity: "1", unit: "large", notes: "halved, charred" }),
      addIng(11, { name: "fresh cilantro", quantity: "1", unit: "bunch" }),
      addIng(12, { name: "limes", quantity: "3", unit: "whole", notes: "cut into wedges" }),
      addIng(13, { name: "fish sauce", quantity: "3", unit: "tbsp" }),
    ],
  },
  {
    slug: "bulgogi-bowls", collection: "golden-100", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed"], summary: "Garlic and pear listed; rice water stated; soy written as 1/2 cup",
    rationale: "The marinade's garlic and grated pear (the tenderizer in bulgogi) weren't listed.",
    ops: [
      ing(2, "quantity", "0.5", "1/2"),
      addIng(7, { name: "Garlic Cloves, Minced", quantity: "6", unit: "count", group: "Marinade" }),
      addIng(8, { name: "Asian Pear Or Apple, Grated", quantity: "1", unit: "count", group: "Marinade" }),
      step(1, "cook 1:1.25 with water 15 minutes.", "cook with 3 3/4 cups water, covered, 15 minutes."),
    ],
  },
  {
    slug: "burnt-ends-chili-crew", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "fractional_count"],
    summary: "Cumin, peppers and oil listed; can sizes stated; scaling leftovers rounded",
    rationale: "The steps sauté peppers and bloom cumin that weren't listed, and '5 cans' with no size could mean 75 oz or 140 oz of tomatoes.",
    ops: [
      field("ingredients.1.notes", undefined, "15 oz each, drained"), field("ingredients.2.notes", undefined, "14.5 oz each"),
      ing(3, "quantity", "2.4", "2"), ing(3, "unit", "each", "large"), ing(4, "quantity", "4.8", "4"), ing(5, "quantity", "3/8", "1/3"),
      addIng(6, { name: "bell peppers", quantity: "2", unit: "each", notes: "diced" }),
      addIng(7, { name: "ground cumin", quantity: "2", unit: "tbsp" }),
      addIng(8, { name: "vegetable oil", quantity: "2", unit: "tbsp" }),
    ],
  },
  {
    slug: "burrito-bowl-bar-night", collection: "hall-expansion", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "awkward_decimal_quantity"],
    summary: "Rice listed uncooked with water; garlic, sour cream, hot sauce, cilantro and seasoning listed; lime split between braise and rice",
    rationale: "'6.4 cups cooked cilantro-lime rice' was both a scaling leftover and a sub-recipe the steps make from scratch. Sour cream, hot sauce and garlic were used but not listed, and the lime juice was used twice.",
    ops: [
      ing(2, "quantity", "1/4", "1/2"), field("ingredients.2.notes", undefined, "half for the braise, half for the rice"),
      ing(3, "quantity", "1 3/4", "2"),
      ing(4, "name", "cilantro-lime rice", "long-grain rice"), ing(4, "quantity", "6.4", "3"), ing(4, "notes", "cooked", "uncooked"),
      ing(5, "quantity", "2.4", "2"), ing(5, "unit", "cups", "cans"), ing(5, "notes", "seasoned", "15 oz each, drained"),
      ing(6, "quantity", "2.4", "2 1/2"), ing(7, "quantity", "3.2", "3"), ing(8, "quantity", "1.6", "1 1/2"),
      addIng(10, { name: "fresh cilantro", quantity: "1/2", unit: "cup", notes: "chopped" }),
      addIng(11, { name: "garlic cloves", quantity: "3", unit: "cloves", notes: "minced" }),
      addIng(12, { name: "sour cream", quantity: "1", unit: "cup" }),
      addIng(13, { name: "hot sauce", quantity: "1", unit: "bottle" }),
      addIng(14, { name: "kosher salt", quantity: "1", unit: "tbsp" }),
      addIng(15, { name: "black pepper", quantity: "1", unit: "tsp" }),
      step(0, "Braise with orange juice and lime covered at 300°F", "Braise with orange juice and half the lime juice covered at 300°F"),
      step(2, "Cook rice and finish with lime juice and chopped cilantro.", "Cook rice with 4 1/2 cups salted water and finish with the remaining lime juice and chopped cilantro."),
    ],
  },
  {
    slug: "butter-chicken", collection: "golden-100", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "culinary_review"], summary: "Junk '0 Basmati For Serving' line removed; salt and optional sugar listed; rice water stated",
    rationale: "A duplicate zero-quantity rice line printed on the recipe. Salt and sugar were used but not listed.",
    ops: [
      { op: "remove", path: "ingredients", name: "Basmati For Serving" },
      addIng(12, { name: "Kosher Salt", quantity: "2", unit: "Tsp", group: "Seasoning" }),
      addIng(13, { name: "Sugar", quantity: "1", unit: "Tsp", notes: "optional, if the tomatoes are sharp", group: "Seasoning" }),
      ing(1, "quantity", "1.5", "1 1/2"),
      step(0, "Simmer with 1:1.5 rice-to-water and a pinch of salt 15 minutes;", "Simmer with 4 1/2 cups water and a pinch of salt 15 minutes;"),
    ],
  },
  {
    slug: "cajun-chicken-rice-bowl", collection: "performance-meals", category: "missing_ingredient",
    findings: ["step_ingredient_not_listed", "culinary_review"],
    summary: "Oil, salt, pepper, butter, green onion and hot sauce listed; rice water stated; room-temperature chicken advice removed",
    rationale: "Several ingredients used in the steps weren't listed, and the step encouraged letting raw chicken come to room temperature.",
    reference: "USDA FSIS: keep raw poultry refrigerated until cooking",
    ops: [
      addIng(12, { name: "vegetable oil", quantity: "3", unit: "tbsp" }),
      addIng(13, { name: "kosher salt", quantity: "1", unit: "tbsp" }),
      addIng(14, { name: "black pepper", quantity: "1", unit: "tsp" }),
      addIng(15, { name: "unsalted butter", quantity: "1", unit: "tbsp", notes: "optional, for the pan sauce" }),
      addIng(16, { name: "green onions", quantity: "4", unit: "whole", notes: "sliced" }),
      addIng(17, { name: "hot sauce", quantity: "1", unit: "bottle", notes: "at the line" }),
      step(1, "Simmer in salted water or broth 18–20 minutes", "Simmer with 4 1/2 cups salted water or broth 18–20 minutes"),
      step(4, "Cold, wet chicken steams instead of chars — room-temp meat blackens faster and more evenly.", "Wet chicken steams instead of chars — pat it bone-dry for the best crust."),
    ],
  },
  {
    slug: "cajun-shrimp-rice-bowls", collection: "hall-expansion", category: "quantity",
    findings: ["fractional_count", "awkward_decimal_quantity"],
    summary: "Scaling leftovers rounded (3 lb shrimp, 3 avocados, 4 limes); oil and rice water listed",
    rationale: "'3.2 avocados', '4.8 limes' and '2.6 tbsp' were scaling leftovers, and the shrimp and rice were cooked in unlisted oil.",
    ops: [
      ing(0, "quantity", "3.2", "3"), ing(1, "quantity", "2.6", "3"), ing(2, "quantity", "2.4", "2 1/2"),
      ing(4, "quantity", "2.4", "2 1/2"), ing(6, "quantity", "3.2", "3"), ing(8, "quantity", "3/8", "1/2"), ing(9, "quantity", "4.8", "4"),
      addIng(11, { name: "vegetable oil", quantity: "3", unit: "tbsp" }),
      step(1, "add salted water and a pinch of Cajun seasoning,", "add 3 3/4 cups salted water and a pinch of Cajun seasoning,"),
    ],
  },
].map((c) => mech(c, "B5-mechanical-03"));
