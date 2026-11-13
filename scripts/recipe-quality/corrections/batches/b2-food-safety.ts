import { USDA_SAFE_TEMPS, type RecipeCorrection } from "../types.js";
import { addIng, field, ing, step, stepSet, stepTitle } from "./helpers.js";

const REF = USDA_SAFE_TEMPS;
const CHORIZO_NOTE = "chorizo's red color hides doneness, so check with a thermometer";

/** Food safety, recipes 1–10 by exposure (first-impression recipes first). */
export const B2_FOOD_SAFETY_01: RecipeCorrection[] = [
  {
    slug: "chorizo-breakfast-tacos", collection: "golden-100", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp", "oven_without_temperature"],
    summary: "Chorizo cooked to 160°F; tortilla oven temperature stated",
    rationale: "Fresh chorizo is raw ground pork and needs 160°F; its red color makes the 'no pink' cue unreliable. 'Low oven' is replaced with a real temperature.",
    reference: REF,
    ops: [
      step(0, "8–10 minutes until fully cooked and rendered.", `8–10 minutes until rendered and it reads 160°F (71°C) on an instant-read thermometer — ${CHORIZO_NOTE}.`),
      step(3, "in a dry skillet or wrapped in foil in a low oven, about 30 seconds per side, until pliable.", "in a dry skillet about 30 seconds per side until pliable, or wrap stacks of 12 in foil and heat in a 250°F (120°C) oven for 15 minutes."),
    ],
  },
  {
    slug: "hall-breakfast-burritos", collection: "breakfast", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage/chorizo cooked to 160°F",
    rationale: "Raw breakfast sausage and chorizo are ground pork; USDA minimum is 160°F.", reference: REF,
    ops: [step(1, "brown sausage/chorizo.", "brown sausage/chorizo, breaking it into crumbles, until it reads 160°F (71°C) on an instant-read thermometer.")],
  },
  {
    slug: "cast-iron-breakfast-skillet", collection: "breakfast", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Raw sausage cooked to 160°F (ham only needs browning)",
    rationale: "The recipe allows raw breakfast sausage or precooked ham; only the sausage needs a doneness check.", reference: REF,
    ops: [step(1, "Toss, then add onion and meat. Cook until browned.", "Toss, then add onion and meat. Cook until browned — breakfast sausage must reach 160°F (71°C) with no pink remaining; diced ham is already cooked and only needs color.")],
  },
  {
    slug: "high-protein-chicken-fried-rice", collection: "performance-meals", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Chicken cooked in batches to 165°F",
    rationale: "Three pounds of chicken in one wok steams instead of browning and cooks unevenly; two batches with a 165°F check fixes both.", reference: REF,
    ops: [step(1, "Season chicken with salt, cook 5–6 minutes, stirring occasionally, until browned and cooked through.", "Cut chicken into ¾-inch pieces and season with salt. Cook in 2 batches, 5–6 minutes each, stirring occasionally, until browned and the largest piece reads 165°F (74°C) on an instant-read thermometer.")],
  },
  {
    slug: "mostaccioli-sausage-bake", collection: "hall-expansion", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F; garlic added at the end so it doesn't burn",
    rationale: "Italian sausage is raw ground pork (160°F). Ten minutes over medium-high scorches minced garlic, so it goes in for the last minute.", reference: REF,
    ops: [stepSet(1, "Cook sausage with garlic over medium-high heat 10 minutes, breaking into crumbles until browned. Stir in marinara and simmer 5 minutes.", "Cook sausage over medium-high heat about 10 minutes, breaking it into crumbles, until browned with no pink remaining (160°F / 71°C). Add garlic for the last minute, then stir in marinara and simmer 5 minutes.")],
  },
  {
    slug: "breakfast-crunchwraps", collection: "breakfast", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F",
    rationale: "Raw breakfast sausage needs 160°F.", reference: REF,
    ops: [step(0, "Brown sausage and drain.", "Brown sausage, breaking it into crumbles, until no pink remains and it reads 160°F (71°C); drain.")],
  },
  {
    slug: "breakfast-enchiladas", collection: "breakfast", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Chorizo cooked to 160°F",
    rationale: "Fresh Mexican chorizo is raw ground pork; color is not a reliable cue.", reference: REF,
    ops: [step(1, "Brown chorizo in a large skillet, drain fat,", `Brown chorizo in a large skillet until it reads 160°F (71°C) — ${CHORIZO_NOTE} — then drain fat,`)],
  },
  {
    slug: "baked-ziti", collection: "golden-100", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(0, "Brown ground beef in olive oil with onion until deeply colored.", "Brown ground beef in olive oil with onion until deeply colored with no pink remaining (160°F / 71°C).")],
  },
  {
    slug: "shepherds-pie", collection: "golden-100", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Ground lamb or beef browned to 160°F",
    rationale: "USDA minimum for ground lamb and beef is 160°F.", reference: REF,
    ops: [step(0, "Brown ground lamb with diced onion until deeply colored.", "Brown ground lamb (or beef) with diced onion until deeply colored and no pink remains (160°F / 71°C).")],
  },
  {
    slug: "sausage-peppers-onions", collection: "golden-100", batch: "B2-food-safety-01", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage links cooked through to 160°F before slicing",
    rationale: "Browning the outside of thick links and simmering 5 minutes doesn't reliably cook the center. A short covered steam brings the links to 160°F.", reference: REF,
    ops: [stepSet(0, "Brown Italian sausage in a large skillet over medium-high, turning until all sides color. Slice links on a bias.", "Brown Italian sausage links in a large skillet over medium-high, turning until all sides color. Add ½ cup water, cover, and cook 8–10 minutes until the centers read 160°F (71°C). Slice on a bias.")],
  },
];

/** Food safety, recipes 21–30. */
export const B2_FOOD_SAFETY_03: RecipeCorrection[] = [
  {
    slug: "chicken-alfredo-bake", collection: "golden-100", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["poultry_temp_below_165"], summary: "Chicken doneness corrected from 160°F to 165°F; seared in batches",
    rationale: "160°F is below the USDA minimum for poultry. Four pounds of chicken won't sear in one pan.", reference: REF,
    ops: [step(0, "Sear in olive oil until golden and 160°F; rest and slice or cube.", "Sear in olive oil in batches until golden and the thickest piece reads 165°F (74°C) on an instant-read thermometer; rest 5 minutes, then slice or cube.")],
  },
  {
    slug: "chicken-dumpling-soup", collection: "golden-100", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Thighs simmered to at least 165°F at the bone",
    rationale: "USDA minimum for poultry is 165°F; bone-in thighs are measured next to the bone.", reference: REF,
    ops: [step(1, "Simmer partially covered 30–35 minutes until chicken is tender.", "Simmer partially covered 30–35 minutes until the thighs are tender and read at least 165°F (74°C) next to the bone.")],
  },
  {
    slug: "chili-mac", collection: "golden-100", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(0, "breaking into fine crumbles.", "breaking into fine crumbles, until no pink remains (160°F / 71°C).")],
  },
  {
    slug: "coq-au-vin-batch", collection: "hall-expansion", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Braised chicken checked at 165°F",
    rationale: "USDA minimum for poultry is 165°F.", reference: REF,
    ops: [step(2, "60–70 minutes until tender.", "60–70 minutes until the chicken is tender and reads at least 165°F (74°C) next to the bone.")],
  },
  {
    slug: "cottage-pie-for-the-crew", collection: "hall-expansion", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(0, "until beef is browned and vegetables soften", "until beef is browned with no pink remaining (160°F / 71°C) and vegetables soften")],
  },
  {
    slug: "cuban-beef-picadillo-bowls", collection: "performance-meals", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(1, "until no pink remains and vegetables have softened.", "until no pink remains (160°F / 71°C) and vegetables have softened.")],
  },
  {
    slug: "enchilada-beef-skillet", collection: "hall-expansion", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Ground beef browned to 160°F; oven-safe skillet called out",
    rationale: "USDA minimum for ground beef is 160°F. The skillet goes into the oven, so it must be oven-safe.", reference: REF,
    ops: [
      step(0, "breaking into crumbles until browned.", "breaking into crumbles, until browned with no pink remaining (160°F / 71°C)."),
      step(3, "Top with cheddar and bake uncovered at 375°F", "Top with cheddar and bake the oven-safe skillet uncovered at 375°F"),
    ],
  },
  {
    slug: "enchilada-casserole", collection: "golden-100", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["precooked_poultry_reheat_unclear"], summary: "Cooked chicken reheated until steaming (165°F)",
    rationale: "USDA: reheat cooked poultry to 165°F.", reference: REF,
    ops: [step(0, "heat through until coated.", "heat until steaming hot throughout (165°F / 74°C) and coated.")],
  },
  {
    slug: "firehall-breakfast-pizza", collection: "breakfast", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F; final bake time stated",
    rationale: "Raw breakfast sausage needs 160°F. The final bake had no time.", reference: REF,
    ops: [
      step(2, "Brown sausage and drain on paper towels", "Brown sausage, breaking it into crumbles, until no pink remains (160°F / 71°C), then drain on paper towels"),
      step(3, "Bake until cheese bubbles", "Bake 10–12 minutes until cheese bubbles"),
    ],
  },
  {
    slug: "firehall-charcuterie-board", collection: "hall-expansion", batch: "B2-food-safety-03", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Turkey identified as ready-to-eat deli turkey; 2-hour room-temperature limit added",
    rationale: "'Sliced turkey breast' read as raw poultry. Cold cuts and soft cheese shouldn't sit out longer than 2 hours.",
    reference: "USDA FSIS: perishable food left out more than 2 hours (1 hour above 90°F) should be discarded",
    ops: [
      ing(2, "name", "sliced turkey breast", "deli-sliced roast turkey breast"),
      step(4, "Replenish popular zones from backup containers kept refrigerated during the event.", "Replenish popular zones from backup containers kept refrigerated during the event. Don't leave meats and cheeses out longer than 2 hours — swap in fresh trays instead of topping up old ones."),
    ],
  },
];

/** Food safety, recipes 31–42. */
export const B2_FOOD_SAFETY_04: RecipeCorrection[] = [
  {
    slug: "firehouse-breakfast-protein-bowls", collection: "breakfast", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_no_internal_temp", "vague_doneness"], summary: "Raw chicken sausage cooked to 165°F",
    rationale: "Raw chicken sausage is ground poultry; USDA minimum is 165°F.", reference: REF,
    ops: [step(1, "8–10 minutes until cooked through and browned.", "8–10 minutes until browned and it reads 165°F (74°C) on an instant-read thermometer. (Fully cooked chicken sausage only needs to be heated until steaming.)")],
  },
  {
    slug: "general-tsos-baked-chicken", collection: "performance-meals", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Baked chicken checked at 165°F",
    rationale: "USDA minimum for poultry is 165°F.", reference: REF,
    ops: [step(0, "flipping halfway, until golden and crisp-edged.", "flipping halfway, until golden, crisp-edged, and the largest piece reads 165°F (74°C).")],
  },
  {
    slug: "greek-chicken-pitas", collection: "hall-expansion", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_temp_below_165"], summary: "Grilled chicken doneness corrected from 160°F to 165°F",
    rationale: "160°F is below the USDA minimum for poultry.", reference: REF,
    ops: [step(1, "Grill over medium-high until 160°F, 5–7 minutes per side.", "Grill over medium-high, 5–7 minutes per side, until the thickest part reads 165°F (74°C).")],
  },
  {
    slug: "hall-breakfast-wraps", collection: "breakfast", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Turkey sausage cooked to 165°F",
    rationale: "Raw turkey sausage is ground poultry; USDA minimum is 165°F.", reference: REF,
    ops: [step(0, "Brown turkey sausage and drain.", "Brown turkey sausage, breaking it into crumbles, until it reads 165°F (74°C); drain.")],
  },
  {
    slug: "hall-sausage-biscuits-gravy", collection: "breakfast", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F before the roux",
    rationale: "Raw breakfast sausage needs 160°F.", reference: REF,
    ops: [step(1, "breaking it into fine crumbles.", "breaking it into fine crumbles, until no pink remains (160°F / 71°C).")],
  },
  {
    slug: "hall-sloppy-joe-feed", collection: "hall-expansion", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(0, "breaking into crumbles until well browned.", "breaking into crumbles, until well browned with no pink remaining (160°F / 71°C).")],
  },
  {
    slug: "high-protein-breakfast-burrito-bowls", collection: "breakfast", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Ground turkey cooked to 165°F",
    rationale: "USDA minimum for ground poultry is 165°F.", reference: REF,
    ops: [step(1, "breaking it into crumbles.", "breaking it into crumbles, until no pink remains and it reads 165°F (74°C).")],
  },
  {
    slug: "jambalaya", collection: "golden-100", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Chicken checked at 165°F after the simmer",
    rationale: "USDA minimum for poultry is 165°F. Andouille is already smoked; the chicken is the item to check.", reference: REF,
    ops: [step(1, "Nestle meat back in. Simmer covered 25 minutes.", "Nestle meat back in. Simmer covered 25 minutes, until the rice is tender and the chicken reads 165°F (74°C).")],
  },
  {
    slug: "korean-beef-rice-bowls", collection: "performance-meals", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(3, "until deeply browned and crumbly with crisp edges, not gray and steaming.", "until deeply browned and crumbly with crisp edges, not gray and steaming, and no pink remains (160°F / 71°C).")],
  },
  {
    slug: "kung-pao-chicken-rice-bowls", collection: "performance-meals", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Braised chicken checked at 165°F",
    rationale: "The chicken is only browned at first and finishes in the sauce, so the check belongs at the end of the braise.", reference: REF,
    ops: [step(3, "until chicken is tender and the sauce has thickened and turned glossy.", "until the chicken reads 165°F (74°C) and the sauce has thickened and turned glossy.")],
  },
  {
    slug: "loaded-nacho-skillet", collection: "golden-100", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(0, "until no pink remains.", "until no pink remains (160°F / 71°C).")],
  },
  {
    slug: "miso-ramen-bar", collection: "hall-expansion", batch: "B2-food-safety-04", category: "food_safety",
    findings: ["poultry_long_cook_no_temp", "vague_doneness"], summary: "Poached chicken checked at 165°F",
    rationale: "USDA minimum for poultry is 165°F.", reference: REF,
    ops: [step(0, "25 minutes until cooked through.", "25 minutes, until the thighs read 165°F (74°C).")],
  },
];

/** Food safety, recipes 43–56. */
export const B2_FOOD_SAFETY_05: RecipeCorrection[] = [
  {
    slug: "monte-cristo-sandwiches", collection: "breakfast", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["precooked_poultry_reheat_unclear"], summary: "Griddle until the filling is steaming hot",
    rationale: "Deli turkey is ready to eat, but a sandwich held warm should be heated through first.", reference: REF,
    ops: [step(2, "Griddle 3–4 minutes per side until deep golden and cheese melts.", "Griddle 3–4 minutes per side until deep golden, the cheese melts, and the center is steaming hot.")],
  },
  {
    slug: "one-pot-beef-orzo-skillet-spinach-feta", collection: "performance-meals", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(0, "until no pink remains and onion is soft.", "until no pink remains (160°F / 71°C) and onion is soft.")],
  },
  {
    slug: "pesto-chicken-pizza", collection: "pizza-night", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["precooked_poultry_reheat_unclear"], summary: "Cooked chicken reheated until steaming (165°F)",
    rationale: "USDA: reheat cooked poultry to 165°F.", reference: REF,
    ops: [step(4, "Tomatoes should wrinkle slightly.", "Tomatoes should wrinkle slightly and the chicken should be steaming hot (165°F / 74°C).")],
  },
  {
    slug: "rigatoni-meat-sauce-batch", collection: "hall-expansion", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Beef and pork browned to 160°F",
    rationale: "USDA minimum for ground beef and pork is 160°F.", reference: REF,
    ops: [step(0, "breaking into crumbles until well browned.", "breaking into crumbles, until well browned with no pink remaining (160°F / 71°C).")],
  },
  {
    slug: "sandwich-board-night", collection: "hall-expansion", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Turkey identified as deli turkey; 2-hour room-temperature limit added",
    rationale: "'Sliced turkey breast' read as raw poultry. Cold cuts shouldn't sit out longer than 2 hours.",
    reference: "USDA FSIS: perishable food left out more than 2 hours (1 hour above 90°F) should be discarded",
    ops: [
      ing(0, "name", "sliced turkey breast", "deli-sliced roast turkey breast"),
      step(4, "Call crew to build sandwiches assembly-line style.", "Call crew to build sandwiches assembly-line style. Return meats and cheeses to the fridge within 2 hours."),
    ],
  },
  {
    slug: "sheet-pan-breakfast-hash", collection: "breakfast", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage roasted to 160°F; egg bake time stated",
    rationale: "'Until sausage is hot' doesn't tell a cook raw sausage is done. The egg step had no time.", reference: REF,
    ops: [
      step(1, "Add sausage, onion, and peppers; roast until potatoes are browned and sausage is hot.", "Add sausage pinched into small pieces, onion, and peppers; roast 15–20 minutes more, stirring once, until potatoes are browned and the sausage reads 160°F (71°C) with no pink."),
      step(3, "Return to oven until whites are set", "Return to oven 8–12 minutes until whites are set"),
    ],
  },
  {
    slug: "southwest-beef-sweet-potato-skillet", collection: "performance-meals", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(1, "until no pink remains and onion is soft.", "until no pink remains (160°F / 71°C) and onion is soft.")],
  },
  {
    slug: "southwest-egg-bake", collection: "breakfast", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Sausage browned before baking (it went in raw); bake time and 160°F center added",
    rationale: "Raw turkey sausage buried in egg custard may not reach 165°F and leaves grease in the bake. Egg casseroles should reach 160°F in the center.", reference: REF,
    ops: [
      stepSet(1, "Spread sausage, onion, and spinach in the pan. Add half the cheese. (If using bread cubes, fold them through now.)", "Brown sausage in a large skillet, breaking it into crumbles, until it reads 165°F (74°C) for turkey or 160°F (71°C) for pork; drain. Cook diced onion in the same pan 5 minutes, then wilt the spinach. Spread sausage, onion, and spinach in the pan and add half the cheese. (If using bread cubes, fold them through now.)"),
      step(3, "Bake until the center is set and the edges are browned.", "Bake 40–50 minutes until the center is set (160°F / 71°C) and the edges are browned."),
    ],
  },
  {
    slug: "spanish-chicken-chorizo-rice", collection: "performance-meals", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Chicken checked at 165°F at the bone",
    rationale: "USDA minimum for poultry is 165°F. Spanish chorizo is cured; the chicken is the item to check.", reference: REF,
    ops: [step(3, "until rice absorbs liquid and is tender.", "until rice absorbs liquid and is tender and the thighs read at least 165°F (74°C) next to the bone.")],
  },
  {
    slug: "stuffed-peppers", collection: "golden-100", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(1, "Brown ground beef with onion and garlic.", "Brown ground beef with onion until no pink remains (160°F / 71°C); add garlic for the last minute.")],
  },
  {
    slug: "taco-pizza", collection: "pizza-night", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Ground beef browned to 160°F",
    rationale: "USDA minimum for ground beef is 160°F.", reference: REF,
    ops: [step(0, "breaking into fine crumbles. Drain grease.", "breaking into fine crumbles, until no pink remains (160°F / 71°C). Drain grease.")],
  },
  {
    slug: "thai-basil-ground-beef-skillet", collection: "performance-meals", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(2, "until deeply browned with no pink.", "until deeply browned with no pink (160°F / 71°C).")],
  },
  {
    slug: "tourtiere-for-the-crew", collection: "hall-expansion", batch: "B2-food-safety-05", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Pork and beef browned to 160°F",
    rationale: "USDA minimum for ground pork and beef is 160°F.", reference: REF,
    ops: [step(0, "breaking up clumps until browned.", "breaking up clumps, until browned with no pink remaining (160°F / 71°C).")],
  },
];

const turkey = (slug: string, collection: RecipeCorrection["collection"], findings: string[], i: number, find: string, replace: string, summary = "Ground turkey cooked to 165°F"): RecipeCorrection => ({
  slug, collection, batch: "B2-food-safety-06", category: "food_safety", findings, summary,
  rationale: "Ground turkey and turkey sausage are ground poultry: USDA minimum is 165°F, not the 160°F used for beef and pork.",
  reference: REF, ops: [step(i, find, replace)],
});

/** Food safety, recipes 57–70. */
export const B2_FOOD_SAFETY_06: RecipeCorrection[] = [
  {
    slug: "trinidadian-curry-chicken-potatoes", collection: "performance-meals", batch: "B2-food-safety-06", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Chicken checked at 165°F at the bone",
    rationale: "USDA minimum for poultry is 165°F.", reference: REF,
    ops: [step(3, "until chicken is tender and potatoes are soft but holding shape.", "until the thighs read at least 165°F (74°C) next to the bone and potatoes are soft but holding shape.")],
  },
  turkey("turkey-chili", "golden-100", ["poultry_temp_below_165"], 1, "until deeply browned with no pink (160°F+).", "until deeply browned with no pink (165°F / 74°C).", "Ground turkey doneness corrected from 160°F to 165°F"),
  turkey("turkey-lettuce-wrap-night", "performance-meals", ["poultry_no_internal_temp"], 1, "and no pink remaining.", "and no pink remaining (165°F / 74°C)."),
  turkey("turkey-sausage-burritos", "breakfast", ["poultry_no_internal_temp"], 1, "brown the turkey sausage, breaking it into crumbles.", "brown the turkey sausage, breaking it into crumbles, until it reads 165°F (74°C)."),
  turkey("turkey-sausage-egg-muffins", "performance-meals", ["poultry_no_internal_temp"], 0, "crumbling until fully browned and no pink remains.", "crumbling until fully browned and no pink remains (165°F / 74°C)."),
  {
    ...turkey("turkey-sausage-spinach-feta-egg-white-scramble", "breakfast", ["poultry_no_internal_temp", "vague_doneness"], 0, "8–9 minutes until cooked through.", "8–9 minutes until no pink remains and it reads 165°F (74°C)."),
  },
  turkey("turkey-shepherds-sweet-potato", "performance-meals", ["poultry_long_cook_no_temp"], 1, "breaking into crumbles until no pink remains", "breaking into crumbles until no pink remains (165°F / 74°C)"),
  turkey("turkey-sweet-potato-chili", "performance-meals", ["poultry_no_internal_temp"], 0, "until turkey is crumbly and vegetables soften", "until the turkey is crumbly with no pink (165°F / 74°C) and vegetables soften"),
  turkey("turkey-taco-skillet", "performance-meals", ["poultry_no_internal_temp"], 0, "breaking into fine crumbles until no pink remains", "breaking into fine crumbles until no pink remains (165°F / 74°C)"),
  turkey("turkey-zoodle-bolognese", "performance-meals", ["poultry_long_cook_no_temp"], 1, "breaking into fine crumbles until no pink remains", "breaking into fine crumbles until no pink remains (165°F / 74°C)"),
  {
    slug: "unstuffed-cabbage-roll-skillet", collection: "performance-meals", batch: "B2-food-safety-06", category: "food_safety",
    findings: ["ground_meat_visual_only"], summary: "160°F added to the 'no pink' cue",
    rationale: "Color alone is not a reliable doneness test for ground beef (USDA).", reference: REF,
    ops: [step(0, "until no pink remains and onion is soft and translucent.", "until no pink remains (160°F / 71°C) and onion is soft and translucent.")],
  },
  {
    slug: "vietnamese-caramel-braised-chicken-bowls", collection: "performance-meals", batch: "B2-food-safety-06", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"], summary: "Braised chicken checked at 165°F",
    rationale: "USDA minimum for poultry is 165°F.", reference: REF,
    ops: [step(3, "braise 20–25 minutes until chicken is tender", "braise 20–25 minutes until the chicken reads 165°F (74°C)")],
  },
];

/** Food safety, recipes 11–20. */
export const B2_FOOD_SAFETY_02: RecipeCorrection[] = [
  {
    slug: "asian-chicken-lettuce-cups", collection: "performance-meals", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["poultry_no_internal_temp"], summary: "Ground chicken cooked to 165°F",
    rationale: "USDA minimum for ground poultry is 165°F.", reference: REF,
    ops: [step(1, "until fully cooked with lightly golden edges.", "until no pink remains and it reads 165°F (74°C) on an instant-read thermometer, with lightly golden edges.")],
  },
  {
    slug: "batch-lasagna", collection: "golden-100", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["ground_meat_long_cook_no_temp"], summary: "Beef and sausage browned to 160°F",
    rationale: "USDA minimum for ground beef and pork is 160°F.", reference: REF,
    ops: [step(0, "Brown beef and sausage with onion and garlic.", "Brown beef and sausage with onion until no pink remains (160°F / 71°C); add garlic for the last minute.")],
  },
  {
    slug: "beef-barley-soup", collection: "golden-100", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["poultry_long_cook_no_temp"],
    summary: "Made a real beef barley soup: beef chuck and beef broth (not 'chicken or beef'), seasoning added, realistic simmer time",
    rationale: "The recipe was a template ('Chicken Thighs Or Beef Stew Meat', 'barley or dumplings per recipe') with no salt, oil or herbs. Beef chuck needs 75–90 minutes to turn tender, so the cook time is updated.",
    reference: REF,
    ops: [
      ing(0, "name", "Chicken Thighs Or Beef Stew Meat", "Beef Chuck Stew Meat, 1-Inch Cubes"),
      ing(4, "name", "Chicken Or Beef Broth", "Low-Sodium Beef Broth"),
      addIng(6, { name: "Vegetable Oil", quantity: "2", unit: "Tbsp", group: "Main" }),
      addIng(7, { name: "Dried Thyme", quantity: "1", unit: "Tsp", group: "Seasoning" }),
      addIng(8, { name: "Bay Leaves", quantity: "2", unit: "count", group: "Seasoning" }),
      addIng(9, { name: "Kosher Salt", quantity: "1", unit: "Tbsp", group: "Seasoning" }),
      addIng(10, { name: "Black Pepper", quantity: "1", unit: "Tsp", group: "Seasoning" }),
      stepTitle(0, "Sear aromatics", "Brown the beef and vegetables"),
      stepSet(0, "Brown meat in batches; remove. Sweat onion, carrot, celery in the same pot 8 minutes until edges soften.", "Pat beef dry and season with half the salt and the pepper. Brown in batches in oil over medium-high so it sears instead of steaming; remove. Sweat onion, carrot, and celery in the same pot 8 minutes until edges soften."),
      stepSet(1, "Add broth, meat back, and barley or dumplings per recipe. Simmer gently 45–60 minutes until meat shreds easily and barley is tender.", "Add broth, browned beef, thyme, and bay leaves. Cover and simmer gently 45 minutes, then stir in barley and simmer 30–45 minutes more until the beef is fork-tender and the barley is soft. Season with the remaining salt to taste."),
      step(2, "Skim fat if needed.", "Skim fat if needed and remove bay leaves."),
      field("cookTime", 55, 105),
    ],
  },
  {
    slug: "breakfast-burrito-bar", collection: "golden-100", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["ground_meat_no_safe_temp", "oven_without_temperature"], summary: "Sausage cooked to 160°F; tortilla oven temperature stated",
    rationale: "Raw breakfast sausage and chorizo need 160°F.", reference: REF,
    ops: [
      step(1, "and the sausage is fully cooked through.", "and the sausage reads 160°F (71°C) with no pink remaining."),
      step(3, "Warm tortillas wrapped in foil in a low oven.", "Warm tortillas wrapped in foil in a 250°F (120°C) oven for 15 minutes."),
    ],
  },
  {
    slug: "breakfast-poutine", collection: "breakfast", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F before making gravy",
    rationale: "Raw breakfast sausage needs 160°F.", reference: REF,
    ops: [step(1, "Brown sausage, sprinkle flour over the fat,", "Brown sausage, breaking it into crumbles, until no pink remains (160°F / 71°C). Sprinkle flour over the fat")],
  },
  {
    slug: "breakfast-sausage-pizza", collection: "golden-100", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage cooked to 160°F",
    rationale: "Raw bulk sausage needs 160°F.", reference: REF,
    ops: [step(0, "until fully cooked and browned.", "until browned with no pink remaining (160°F / 71°C).")],
  },
  {
    slug: "breakfast-sliders", collection: "breakfast", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["ground_meat_no_safe_temp"], summary: "Sausage patties cooked to 160°F; bake time stated",
    rationale: "Raw sausage patties need 160°F in the center. The bake step had no time.", reference: REF,
    ops: [
      step(0, "Cook sausage patties until done", "Cook sausage patties until they read 160°F (71°C) in the center"),
      step(3, "Bake until cheese melts", "Bake 12–15 minutes until cheese melts"),
    ],
  },
  {
    slug: "buffalo-chicken-pizza", collection: "pizza-night", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["precooked_poultry_reheat_unclear"], summary: "Precooked chicken reheated until steaming (165°F)",
    rationale: "USDA: reheat cooked leftovers to 165°F.", reference: REF,
    ops: [step(4, "Chicken is already cooked; you are setting cheese and finishing crust.", "Chicken is already cooked; you are setting cheese, finishing crust, and reheating the chicken until steaming hot (165°F / 74°C).")],
  },
  {
    slug: "bun-bo-hue-noodle-soup", collection: "hall-expansion", batch: "B2-food-safety-02", category: "food_safety",
    findings: ["pork_fish_no_doneness"], summary: "Braise doneness cue added; raw beef sliced paper-thin and cooked by rolling-boil broth",
    rationale: "Raw beef cooked in the bowl is only safe when sliced paper-thin and hit with broth at a full boil, as in pho. Shank and hock need a fork-tender cue.",
    reference: REF,
    ops: [
      step(0, "Simmer 2.5–3 hours, skimming often.", "Simmer 2.5–3 hours, skimming often, until the shank and hock are fork-tender."),
      step(4, "Top noodles with shredded braised meats and raw beef slices. Ladle boiling broth over to cook raw beef.", "Top noodles with shredded braised meats and paper-thin raw eye-round slices (freeze the roast 30 minutes to slice it thin). Ladle broth at a full rolling boil directly over the beef so it turns from red to brown-pink before serving."),
    ],
  },
];
