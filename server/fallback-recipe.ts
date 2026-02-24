import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";

interface RawIngredient {
  item: string;
  amount: string;
  baseQty?: number;
  unit?: string;
  allergens?: string[];
}

interface AllergenSafeReplacement {
  match: RegExp;
  safeFor: string[];
  replacement: RawIngredient;
  stepFind: RegExp;
  stepReplace: string;
}

const ALLERGEN_SAFE_REPLACEMENTS: AllergenSafeReplacement[] = [
  { match: /butter/i, safeFor: ["dairy"], replacement: { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /butter/gi, stepReplace: "olive oil" },
  { match: /shredded cheese/i, safeFor: ["dairy"], replacement: { item: "Nutritional yeast", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /shredded cheese/gi, stepReplace: "nutritional yeast" },
  { match: /cheese/i, safeFor: ["dairy"], replacement: { item: "Nutritional yeast", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /cheese/gi, stepReplace: "nutritional yeast" },
  { match: /chicken broth/i, safeFor: ["dairy"], replacement: { item: "Vegetable broth", amount: "1 cup", baseQty: 1, unit: "cup" }, stepFind: /chicken broth/gi, stepReplace: "vegetable broth" },
  { match: /cream/i, safeFor: ["dairy", "soy", "nuts"], replacement: { item: "Coconut cream", amount: "½ cup", baseQty: 0.5, unit: "cup" }, stepFind: /cream/gi, stepReplace: "coconut cream" },
  { match: /soy sauce/i, safeFor: ["soy", "gluten"], replacement: { item: "Coconut aminos (soy & gluten-free)", amount: "3 tbsp", baseQty: 3, unit: "tbsp" }, stepFind: /soy sauce/gi, stepReplace: "coconut aminos" },
  { match: /rice or pasta/i, safeFor: ["gluten"], replacement: { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" }, stepFind: /rice or pasta/gi, stepReplace: "rice" },
  { match: /pasta/i, safeFor: ["gluten"], replacement: { item: "Rice (gluten-free substitute)", amount: "2 cups", baseQty: 2, unit: "cups" }, stepFind: /pasta/gi, stepReplace: "rice" },
  { match: /dijon mustard/i, safeFor: ["gluten"], replacement: { item: "Gluten-free Dijon mustard", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /dijon mustard/gi, stepReplace: "gluten-free Dijon mustard" },
  { match: /taco seasoning/i, safeFor: ["gluten", "soy"], replacement: { item: "Homemade taco seasoning (cumin, paprika, garlic powder, onion powder, chili powder)", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /taco seasoning/gi, stepReplace: "homemade taco seasoning" },
  { match: /eggs?/i, safeFor: ["eggs"], replacement: { item: "Flax eggs (1 tbsp ground flax + 3 tbsp water per egg)", amount: "as needed" }, stepFind: /eggs?/gi, stepReplace: "flax eggs" },
  { match: /peanut/i, safeFor: ["nuts"], replacement: { item: "Sunflower seed butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp" }, stepFind: /peanut(?: butter)?/gi, stepReplace: "sunflower seed butter" },
  { match: /almond/i, safeFor: ["nuts"], replacement: { item: "Sunflower seeds", amount: "¼ cup", baseQty: 0.25, unit: "cup" }, stepFind: /almonds?/gi, stepReplace: "sunflower seeds" },
  { match: /cashew/i, safeFor: ["nuts"], replacement: { item: "Sunflower seeds", amount: "¼ cup", baseQty: 0.25, unit: "cup" }, stepFind: /cashews?/gi, stepReplace: "sunflower seeds" },
];

const PROTEIN_INGREDIENTS: Record<string, RawIngredient[]> = {
  chicken: [
    { item: "Boneless skinless chicken breasts", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Paprika", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Mixed vegetables (broccoli, bell pepper, carrots)", amount: "4 cups", baseQty: 4, unit: "cups" },
    { item: "Soy sauce", amount: "3 tbsp", baseQty: 3, unit: "tbsp", allergens: ["soy", "gluten"] },
    { item: "Chicken broth", amount: "1 cup", baseQty: 1, unit: "cup" },
  ],
  beef: [
    { item: "Ground beef (lean)", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
    { item: "Garlic cloves, minced", amount: "4", baseQty: 4, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Chili powder", amount: "2 tsp", baseQty: 2, unit: "tsp" },
    { item: "Rice or pasta", amount: "2 cups", baseQty: 2, unit: "cups", allergens: ["gluten"] },
    { item: "Canned diced tomatoes", amount: "2 cans (14 oz)", baseQty: 2, unit: "cans (14 oz)" },
    { item: "Shredded cheese", amount: "1 cup", baseQty: 1, unit: "cup", allergens: ["dairy"] },
  ],
  pork: [
    { item: "Pork tenderloin", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Black pepper", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    { item: "Brown sugar", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Dijon mustard", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["gluten"] },
    { item: "Potatoes, cubed", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Green beans", amount: "1 lb", baseQty: 1, unit: "lb" },
    { item: "Butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["dairy"] },
  ],
  turkey: [
    { item: "Ground turkey", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Onion, diced", amount: "1 large", baseQty: 1, unit: "large" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Taco seasoning", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["gluten", "soy"] },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Black beans, drained", amount: "1 can (15 oz)", baseQty: 1, unit: "can (15 oz)" },
    { item: "Shredded lettuce and salsa", amount: "for topping" },
  ],
  fish: [
    { item: "Salmon fillets", amount: "2 lbs", baseQty: 2, unit: "lbs" },
    { item: "Olive oil", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    { item: "Lemon juice", amount: "3 tbsp", baseQty: 3, unit: "tbsp" },
    { item: "Garlic cloves, minced", amount: "3", baseQty: 3, unit: "" },
    { item: "Salt", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Dill (dried)", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    { item: "Asparagus", amount: "1 bunch", baseQty: 1, unit: "bunch" },
    { item: "Rice", amount: "2 cups", baseQty: 2, unit: "cups" },
    { item: "Butter", amount: "2 tbsp", baseQty: 2, unit: "tbsp", allergens: ["dairy"] },
    { item: "Lemon wedges", amount: "for serving" },
  ],
};

const STOVETOP_STEPS: Record<string, { heading: string; body: string }[]> = {
  chicken: [
    { heading: "Prep the chicken (no heat, 5 min)", body: "Pat chicken breasts dry with paper towels and season both sides with salt, pepper, and paprika. Cut into even 1-inch strips for faster, more even cooking." },
    { heading: "Start the rice (high heat → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil in a pot. Reduce to low, cover tightly, and simmer for 18-20 minutes until water is absorbed and grains are tender." },
    { heading: "Sear the chicken (medium-high, 5-7 min)", body: "Heat olive oil in a large skillet over medium-high heat. Add chicken strips in a single layer — don't crowd. Cook 3-4 minutes per side until golden brown and internal temp reaches 165°F." },
    { heading: "Cook the vegetables (medium-high, 4-5 min)", body: "Remove chicken and set aside. Add garlic to the pan, stir 30 seconds until fragrant. Add mixed vegetables and stir-fry 4-5 minutes until crisp-tender and bright in color." },
    { heading: "Make the sauce (medium, 2 min)", body: "Pour soy sauce and chicken broth into the pan. Let it bubble and reduce slightly until it coats the back of a spoon, about 2 minutes." },
    { heading: "Combine and serve (no heat, 2 min)", body: "Return chicken to the pan, toss everything together to coat. Serve over rice. Internal temp check: chicken should read 165°F in the thickest piece." },
  ],
  beef: [
    { heading: "Prep ingredients (no heat, 5 min)", body: "Dice the onion and mince the garlic. Open and drain canned tomatoes. Measure out spices — having everything ready speeds up the cook." },
    { heading: "Brown the beef (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet or Dutch oven over medium-high heat. Add ground beef, breaking it into small pieces with a spatula. Cook until no pink remains and edges are browned — internal temp should reach 160°F." },
    { heading: "Sauté aromatics (medium, 3 min)", body: "Drain excess fat if needed. Add onion and garlic, stir frequently until the onion is translucent and garlic is fragrant, about 3 minutes." },
    { heading: "Start the rice or pasta (high heat, 1 min)", body: "In a separate pot, bring salted water to a boil. Add rice or pasta and cook according to package directions until tender." },
    { heading: "Build the sauce (medium, 10-12 min)", body: "Add diced tomatoes, chili powder, salt, and pepper to the beef. Stir well, bring to a simmer, and let cook 10-12 minutes until sauce thickens and flavors meld." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Spoon the seasoned beef mixture over cooked rice or pasta. Top with shredded cheese while hot so it melts. Serve family-style." },
  ],
  pork: [
    { heading: "Prep the pork (no heat, 5 min)", body: "Trim any silver skin from the tenderloin. Mix brown sugar, Dijon mustard, salt, and pepper in a small bowl. Rub the mixture evenly over the pork." },
    { heading: "Sear the pork (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high heat. Sear the tenderloin on all sides until deeply golden brown, about 2 minutes per side." },
    { heading: "Prep the sides (no heat, 5 min)", body: "While pork sears, cube the potatoes into 1-inch pieces. Trim the green beans." },
    { heading: "Cook potatoes (medium, 15-18 min)", body: "In a separate pot, boil cubed potatoes in salted water until fork-tender, about 15-18 minutes. Drain." },
    { heading: "Finish the pork (medium, 12-15 min)", body: "Reduce heat to medium. Cover skillet with a lid or foil. Cook pork 12-15 minutes, turning once, until internal temp reaches 145°F. Remove and rest 3 minutes." },
    { heading: "Serve (no heat, 2 min)", body: "Slice pork into ½-inch medallions. Plate alongside boiled potatoes (toss with olive oil and salt) and steamed green beans." },
  ],
  turkey: [
    { heading: "Cook the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce heat to low, cover, and simmer 18-20 minutes until water is absorbed and grains are fluffy." },
    { heading: "Brown the turkey (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high. Add ground turkey, breaking apart with a spatula. Cook until no pink remains and meat is lightly browned — should reach 165°F." },
    { heading: "Season the meat (medium, 2 min)", body: "Add onion and garlic, cook 2 minutes until softened. Stir in taco seasoning and cumin. Add a splash of water to help the seasoning coat evenly." },
    { heading: "Add the beans (medium, 3 min)", body: "Stir in the drained black beans. Cook 3 minutes until heated through and flavors are combined." },
    { heading: "Assemble the bowls (no heat, 3 min)", body: "Divide rice among bowls. Top with seasoned turkey and black bean mixture." },
    { heading: "Add toppings and serve (no heat, 2 min)", body: "Top with shredded lettuce, salsa, and any other toppings your crew likes. Serve immediately while everything is hot." },
  ],
  fish: [
    { heading: "Prep the salmon (no heat, 5 min)", body: "Pat salmon fillets dry with paper towels. Season with salt, dill, and a squeeze of lemon juice. Let sit while you prep the sides." },
    { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover, and simmer 18-20 minutes until tender and fluffy." },
    { heading: "Prep the asparagus (no heat, 3 min)", body: "Snap off the woody ends of the asparagus. Toss spears with olive oil, salt, and pepper." },
    { heading: "Cook the salmon (medium-high, 4-5 min per side)", body: "Heat butter and olive oil in a non-stick skillet over medium-high. Place salmon skin-side up. Cook 4-5 minutes until golden, flip carefully, cook another 3-4 minutes until internal temp reaches 145°F and fish flakes easily." },
    { heading: "Sauté the asparagus (medium-high, 5-6 min)", body: "In a separate pan, sauté asparagus spears with a drizzle of olive oil over medium-high heat for 5-6 minutes until tender and lightly charred." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Place salmon fillets on plates alongside rice and asparagus. Squeeze fresh lemon over the fish and serve with lemon wedges." },
  ],
};

const OVEN_STEPS: Record<string, { heading: string; body: string }[]> = {
  chicken: [
    { heading: "Prep the chicken (no heat, 5 min)", body: "Pat chicken breasts dry with paper towels and season both sides with salt, pepper, and paprika. Cut into even 1-inch strips for faster, more even cooking." },
    { heading: "Start the rice (high heat → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil in a pot. Reduce to low, cover tightly, and simmer for 18-20 minutes until water is absorbed and grains are tender." },
    { heading: "Sear the chicken (medium-high, 5-7 min)", body: "Heat olive oil in a large skillet over medium-high heat. Add chicken strips in a single layer — don't crowd. Cook 3-4 minutes per side until golden brown and internal temp reaches 165°F." },
    { heading: "Cook the vegetables (medium-high, 4-5 min)", body: "Remove chicken and set aside. Add garlic to the pan, stir 30 seconds until fragrant. Add mixed vegetables and stir-fry 4-5 minutes until crisp-tender and bright in color." },
    { heading: "Make the sauce (medium, 2 min)", body: "Pour soy sauce and chicken broth into the pan. Let it bubble and reduce slightly until it coats the back of a spoon, about 2 minutes." },
    { heading: "Combine and serve (no heat, 2 min)", body: "Return chicken to the pan, toss everything together to coat. Serve over rice. Internal temp check: chicken should read 165°F in the thickest piece." },
  ],
  beef: [
    { heading: "Prep ingredients (no heat, 5 min)", body: "Dice the onion and mince the garlic. Open and drain canned tomatoes. Measure out spices — having everything ready speeds up the cook." },
    { heading: "Brown the beef (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet or Dutch oven over medium-high heat. Add ground beef, breaking it into small pieces with a spatula. Cook until no pink remains and edges are browned — internal temp should reach 160°F." },
    { heading: "Sauté aromatics (medium, 3 min)", body: "Drain excess fat if needed. Add onion and garlic, stir frequently until the onion is translucent and garlic is fragrant, about 3 minutes." },
    { heading: "Start the rice or pasta (high heat, 1 min)", body: "In a separate pot, bring salted water to a boil. Add rice or pasta and cook according to package directions until tender." },
    { heading: "Build the sauce (medium, 10-12 min)", body: "Add diced tomatoes, chili powder, salt, and pepper to the beef. Stir well, bring to a simmer, and let cook 10-12 minutes until sauce thickens and flavors meld." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Spoon the seasoned beef mixture over cooked rice or pasta. Top with shredded cheese while hot so it melts. Serve family-style." },
  ],
  pork: [
    { heading: "Prep the pork (no heat, 5 min)", body: "Trim any silver skin from the tenderloin. Mix brown sugar, Dijon mustard, salt, and pepper in a small bowl. Rub the mixture evenly over the pork." },
    { heading: "Sear the pork (medium-high, 3-4 min)", body: "Heat olive oil in an oven-safe skillet over medium-high heat. Sear the tenderloin on all sides until golden brown, about 1 minute per side." },
    { heading: "Prep the sides (no heat, 5 min)", body: "While pork sears, cube the potatoes into 1-inch pieces. Trim the green beans. Toss both with olive oil, salt, and pepper." },
    { heading: "Roast everything (400°F oven, 20-25 min)", body: "Transfer pork to a baking sheet lined with foil. Arrange potatoes and green beans around it. Roast at 400°F for 20-25 minutes until pork reaches 145°F internally." },
    { heading: "Rest the meat (no heat, 5 min)", body: "Remove pork from oven and let it rest on a cutting board for at least 3 minutes. Carryover cooking will bring it to a safe temp. The juices redistribute for a juicier result." },
    { heading: "Slice and serve (no heat, 2 min)", body: "Slice pork into ½-inch medallions. Fan slices on a platter alongside roasted potatoes and green beans. Add a pat of butter on the potatoes while hot." },
  ],
  turkey: [
    { heading: "Cook the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce heat to low, cover, and simmer 18-20 minutes until water is absorbed and grains are fluffy." },
    { heading: "Brown the turkey (medium-high, 6-8 min)", body: "Heat olive oil in a large skillet over medium-high. Add ground turkey, breaking apart with a spatula. Cook until no pink remains and meat is lightly browned — should reach 165°F." },
    { heading: "Season the meat (medium, 2 min)", body: "Add onion and garlic, cook 2 minutes until softened. Stir in taco seasoning and cumin. Add a splash of water to help the seasoning coat evenly." },
    { heading: "Add the beans (medium, 3 min)", body: "Stir in the drained black beans. Cook 3 minutes until heated through and flavors are combined." },
    { heading: "Assemble the bowls (no heat, 3 min)", body: "Divide rice among bowls. Top with seasoned turkey and black bean mixture." },
    { heading: "Add toppings and serve (no heat, 2 min)", body: "Top with shredded lettuce, salsa, and any other toppings your crew likes. Serve immediately while everything is hot." },
  ],
  fish: [
    { heading: "Prep the salmon (no heat, 5 min)", body: "Pat salmon fillets dry with paper towels. Season with salt, dill, and a squeeze of lemon juice. Let sit while you prep the sides." },
    { heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover, and simmer 18-20 minutes until tender and fluffy." },
    { heading: "Prep the asparagus (no heat, 3 min)", body: "Snap off the woody ends of the asparagus. Toss spears with olive oil, salt, and pepper on a baking sheet." },
    { heading: "Cook the salmon (medium-high, 4-5 min per side)", body: "Heat butter and olive oil in a non-stick skillet over medium-high. Place salmon skin-side up. Cook 4-5 minutes until golden, flip carefully, cook another 3-4 minutes until internal temp reaches 145°F and fish flakes easily." },
    { heading: "Roast the asparagus (425°F, 8-10 min)", body: "While salmon cooks, roast asparagus in the oven at 425°F for 8-10 minutes until tender and tips are slightly crispy." },
    { heading: "Plate and serve (no heat, 2 min)", body: "Place salmon fillets on plates alongside rice and asparagus. Squeeze fresh lemon over the fish and serve with lemon wedges." },
  ],
};

const PROTEIN_SAFETY: Record<string, { protein: string; target_temp_f: number; target_temp_c: number; rest_minutes: number; probe_where: string; notes: string }> = {
  chicken: { protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part of the breast, away from bone", notes: "All poultry must reach 165°F for safety." },
  beef: { protein: "Ground Beef", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of the thickest portion", notes: "Ground beef requires 160°F — no pink remaining." },
  pork: { protein: "Pork", target_temp_f: 145, target_temp_c: 63, rest_minutes: 3, probe_where: "Center of the thickest portion", notes: "Allow a 3-minute rest for carryover cooking." },
  turkey: { protein: "Turkey", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part, away from bone", notes: "All poultry must reach 165°F for safety." },
  fish: { protein: "Fish", target_temp_f: 145, target_temp_c: 63, rest_minutes: 0, probe_where: "Center of the thickest fillet", notes: "Fish should flake easily with a fork when done." },
};

const FALLBACK_TITLES: Record<string, string> = {
  chicken: "Quick Chicken & Veggie Stir-Fry with Rice",
  beef: "One-Pot Seasoned Beef with Tomatoes & Rice",
  pork: "Roasted Pork Tenderloin with Potatoes & Green Beans",
  turkey: "Turkey Taco Bowls with Black Beans & Rice",
  fish: "Pan-Seared Salmon with Rice & Roasted Asparagus",
};

const CUISINE_SEASONINGS: Record<string, { spices: RawIngredient[]; titlePrefix: string }> = {
  mediterranean: {
    spices: [
      { item: "Dried oregano", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Lemon zest", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
    ],
    titlePrefix: "Mediterranean",
  },
  mexican: {
    spices: [
      { item: "Cumin", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Cilantro, chopped", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
      { item: "Lime juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    titlePrefix: "Mexican-Style",
  },
  italian: {
    spices: [
      { item: "Italian seasoning blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Fresh basil, torn", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
    ],
    titlePrefix: "Italian",
  },
  asian: {
    spices: [
      { item: "Fresh ginger, grated", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Sesame oil", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Asian-Inspired",
  },
  korean: {
    spices: [
      { item: "Gochugaru (Korean chili flakes)", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Sesame oil", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "Rice vinegar", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
    ],
    titlePrefix: "Korean-Style",
  },
  thai: {
    spices: [
      { item: "Thai basil or regular basil", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
      { item: "Fish sauce", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Lime juice", amount: "2 tbsp", baseQty: 2, unit: "tbsp" },
    ],
    titlePrefix: "Thai-Inspired",
  },
  indian: {
    spices: [
      { item: "Garam masala", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Turmeric", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
      { item: "Ground coriander", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Indian-Spiced",
  },
  middle_eastern: {
    spices: [
      { item: "Za'atar spice blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Sumac", amount: "½ tsp", baseQty: 0.5, unit: "tsp" },
    ],
    titlePrefix: "Middle Eastern",
  },
  bbq: {
    spices: [
      { item: "Smoked paprika", amount: "1 tsp", baseQty: 1, unit: "tsp" },
      { item: "BBQ sauce", amount: "¼ cup", baseQty: 0.25, unit: "cup" },
    ],
    titlePrefix: "BBQ",
  },
  cajun: {
    spices: [
      { item: "Cajun seasoning blend", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Hot sauce", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Cajun",
  },
  canadian: {
    spices: [
      { item: "Maple syrup", amount: "1 tbsp", baseQty: 1, unit: "tbsp" },
      { item: "Dried thyme", amount: "1 tsp", baseQty: 1, unit: "tsp" },
    ],
    titlePrefix: "Canadian-Style",
  },
};

const BASE_CREW = 6;

function formatAmount(baseQty: number, unit: string, scale: number): string {
  const scaled = baseQty * scale;
  const rounded = Math.round(scaled * 4) / 4;
  if (rounded === 0.25) return unit ? `¼ ${unit}` : "¼";
  if (rounded === 0.5) return unit ? `½ ${unit}` : "½";
  if (rounded === 0.75) return unit ? `¾ ${unit}` : "¾";
  if (rounded === Math.floor(rounded)) return unit ? `${rounded} ${unit}` : `${rounded}`;
  const whole = Math.floor(rounded);
  const frac = rounded - whole;
  const fracStr = frac === 0.25 ? "¼" : frac === 0.5 ? "½" : frac === 0.75 ? "¾" : `${frac}`;
  return unit ? `${whole}${fracStr} ${unit}` : `${whole}${fracStr}`;
}

function scaleIngredient(ing: RawIngredient, scale: number): { item: string; amount: string; notes: string } {
  if (!ing.baseQty || !ing.unit) {
    return { item: ing.item, amount: ing.amount, notes: "" };
  }
  return { item: ing.item, amount: formatAmount(ing.baseQty, ing.unit, scale), notes: "" };
}

function applyAllergenSwaps(
  ingredients: RawIngredient[],
  steps: { heading: string; body: string }[],
  allergens: string[]
): { ingredients: RawIngredient[]; steps: { heading: string; body: string }[]; swapsMade: string[] } {
  if (!allergens.length) return { ingredients, steps, swapsMade: [] };

  const lowerAllergens = allergens.map(a => a.toLowerCase());
  let swappedIngredients = [...ingredients];
  let swappedSteps = steps.map(s => ({ ...s }));
  const swapsMade: string[] = [];
  const alreadySwapped = new Set<number>();

  for (let i = 0; i < swappedIngredients.length; i++) {
    if (alreadySwapped.has(i)) continue;

    const bestSwap = ALLERGEN_SAFE_REPLACEMENTS.find(rule => {
      if (!rule.match.test(swappedIngredients[i].item)) return false;
      const relevantAllergens = lowerAllergens.filter(a => {
        const taggedAllergens = swappedIngredients[i].allergens || [];
        if (taggedAllergens.includes(a)) return true;
        return rule.safeFor.includes(a);
      });
      if (relevantAllergens.length === 0) return false;
      return relevantAllergens.every(a => rule.safeFor.includes(a));
    });

    if (bestSwap) {
      const original = swappedIngredients[i].item;
      const safeForList = bestSwap.safeFor.filter(a => lowerAllergens.includes(a)).join(" & ");
      swappedIngredients[i] = { ...bestSwap.replacement };
      alreadySwapped.add(i);
      swapsMade.push(`${original} → ${bestSwap.replacement.item} (${safeForList}-free)`);
      swappedSteps = swappedSteps.map(s => ({
        heading: s.heading,
        body: s.body.replace(bestSwap.stepFind, bestSwap.stepReplace),
      }));
    }
  }

  return { ingredients: swappedIngredients, steps: swappedSteps, swapsMade };
}

function hasAppliance(appliances: string[], type: string): boolean {
  return appliances.some(a => a.toLowerCase().includes(type.toLowerCase()));
}

function pickProteinForAppliances(chosenProtein: string, appliances: string[]): string {
  const hasStove = hasAppliance(appliances, "stove");
  const hasOven = hasAppliance(appliances, "oven");

  if (!hasStove && !hasOven) {
    return "chicken";
  }
  if (chosenProtein === "pork" && !hasOven && !hasStove) {
    return "chicken";
  }
  return chosenProtein;
}

function getStepsForAppliances(proteinKey: string, appliances: string[]): { heading: string; body: string }[] {
  const hasStove = hasAppliance(appliances, "stove");
  const hasOven = hasAppliance(appliances, "oven");
  const hasSlowCooker = hasAppliance(appliances, "slow cooker");
  const hasInstantPot = hasAppliance(appliances, "instant pot");

  if (hasOven && OVEN_STEPS[proteinKey]) {
    return OVEN_STEPS[proteinKey];
  }
  if (hasStove && STOVETOP_STEPS[proteinKey]) {
    return STOVETOP_STEPS[proteinKey];
  }
  if (hasSlowCooker || hasInstantPot) {
    const applianceName = hasInstantPot ? "Instant Pot" : "slow cooker";
    return [
      { heading: `Prep ingredients (no heat, 5 min)`, body: `Season the protein with salt, pepper, and spices. Dice onion and mince garlic. Prep vegetables.` },
      { heading: `Load the ${applianceName} (2 min)`, body: `Place the seasoned protein in the ${applianceName}. Add diced onion, garlic, and a cup of broth or water.` },
      { heading: `Cook (${hasInstantPot ? "high pressure, 15 min" : "low 6-8 hrs / high 3-4 hrs"})`, body: `${hasInstantPot ? "Seal lid, set to high pressure for 15 minutes. Allow 10 minutes natural release." : "Cover and cook on low for 6-8 hours or high for 3-4 hours until protein is tender and cooked through."}` },
      { heading: `Cook the rice separately (20 min)`, body: `While the main dish cooks, prepare rice according to package directions.` },
      { heading: `Add vegetables (${hasInstantPot ? "5 min" : "30 min before done"})`, body: `${hasInstantPot ? "Quick release, open lid, stir in vegetables. Set to sauté mode for 5 minutes." : "Add vegetables to the slow cooker 30 minutes before serving time."} Cook until tender.` },
      { heading: `Serve (no heat, 2 min)`, body: `Plate the protein and vegetables over rice. Check internal temperature for safety.` },
    ];
  }
  return STOVETOP_STEPS[proteinKey] || STOVETOP_STEPS.chicken;
}

function getTimingForRange(timeRange: string): { prep_minutes: number; cook_minutes: number; total_minutes: number } {
  const timings: Record<string, { prep_minutes: number; cook_minutes: number; total_minutes: number }> = {
    "15-25": { prep_minutes: 5, cook_minutes: 15, total_minutes: 20 },
    "20-30": { prep_minutes: 7, cook_minutes: 18, total_minutes: 25 },
    "25-40": { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
    "30-45": { prep_minutes: 10, cook_minutes: 25, total_minutes: 35 },
    "45-60": { prep_minutes: 15, cook_minutes: 35, total_minutes: 50 },
    "60-90": { prep_minutes: 20, cook_minutes: 50, total_minutes: 70 },
  };
  return timings[timeRange] || timings["25-40"];
}

function adjustMacrosForHealthiness(
  baseMacros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  healthiness: string
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  if (healthiness === "lean") {
    return {
      calories: Math.round(baseMacros.calories * 0.85),
      protein_g: baseMacros.protein_g + 5,
      carbs_g: Math.round(baseMacros.carbs_g * 0.8),
      fat_g: Math.round(baseMacros.fat_g * 0.7),
    };
  }
  if (healthiness === "comfort") {
    return {
      calories: Math.round(baseMacros.calories * 1.15),
      protein_g: baseMacros.protein_g,
      carbs_g: Math.round(baseMacros.carbs_g * 1.2),
      fat_g: Math.round(baseMacros.fat_g * 1.3),
    };
  }
  return baseMacros;
}

function getBudgetTips(budgetLevel: string): string[] {
  if (budgetLevel === "low") {
    return [
      "Buy protein in bulk and freeze portions.",
      "Frozen vegetables work just as well and cost less.",
      "Store-brand spices are just as good as name brands.",
    ];
  }
  if (budgetLevel === "splurge") {
    return [
      "Try organic or free-range protein for better flavor.",
      "Fresh herbs make a big difference — grab a bunch of each.",
    ];
  }
  return [];
}

export function buildFallbackRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string
): GenerateResponse {
  const protein = chosenProtein.toLowerCase();
  const proteinKey = Object.keys(PROTEIN_INGREDIENTS).includes(protein) ? protein : "chicken";
  const finalProtein = pickProteinForAppliances(proteinKey, request.appliances || ["stove", "oven"]);
  const proteinDisplay = finalProtein.charAt(0).toUpperCase() + finalProtein.slice(1);
  const budgetLevel = request.budget_level || "standard";
  const crewSize = request.crew_size || BASE_CREW;
  const scale = crewSize / BASE_CREW;
  const allergens = request.allergens_to_avoid || [];
  const healthiness = request.healthiness_preference || "balanced";
  const cuisineStyle = request.cuisine_style || "any";
  const timeRange = request.time_available || "25-40";
  const appliances = request.appliances || ["stove", "oven"];

  let rawIngredients = [...(PROTEIN_INGREDIENTS[finalProtein] || PROTEIN_INGREDIENTS.chicken)];
  let steps = getStepsForAppliances(finalProtein, appliances);

  const { ingredients: allergenSafeIngredients, steps: allergenSafeSteps, swapsMade } =
    applyAllergenSwaps(rawIngredients, steps, allergens);
  rawIngredients = allergenSafeIngredients;
  steps = allergenSafeSteps;

  const cuisineData = cuisineStyle !== "any" ? CUISINE_SEASONINGS[cuisineStyle] : null;
  if (cuisineData) {
    rawIngredients = [...rawIngredients, ...cuisineData.spices];
    const lastStepIdx = steps.length - 1;
    if (lastStepIdx >= 0) {
      const spiceNames = cuisineData.spices.map(s => s.item.split(",")[0].toLowerCase()).join(", ");
      steps = steps.map((s, i) => i === lastStepIdx
        ? { ...s, body: s.body + ` Finish with a sprinkle of ${spiceNames} for authentic ${cuisineStyle.replace("_", " ")} flavor.` }
        : s
      );
    }
  }

  const scaledIngredients = rawIngredients.map(i => scaleIngredient(i, scale));

  const timing = getTimingForRange(timeRange);

  const baseMacros = {
    calories: finalProtein === "fish" ? 420 : finalProtein === "chicken" ? 450 : 520,
    protein_g: finalProtein === "fish" ? 38 : finalProtein === "chicken" ? 42 : 40,
    carbs_g: finalProtein === "fish" ? 40 : 45,
    fat_g: finalProtein === "fish" ? 14 : finalProtein === "chicken" ? 12 : 18,
  };
  const macros = adjustMacrosForHealthiness(baseMacros, healthiness);

  const baseTitle = FALLBACK_TITLES[finalProtein] || `Quick ${proteinDisplay} — ${template.template_name}`;
  const title = cuisineData
    ? `${cuisineData.titlePrefix} ${baseTitle}`
    : baseTitle;

  const safety = PROTEIN_SAFETY[finalProtein] || PROTEIN_SAFETY.chicken;

  const allergenNote = swapsMade.length > 0
    ? ` Allergen swaps applied: ${swapsMade.join("; ")}.`
    : "";
  const whyItFits = `Quick, reliable ${proteinDisplay.toLowerCase()} meal for ${crewSize} — ready in about ${timing.total_minutes} minutes with simple ingredients your crew will love.${allergenNote}`;

  const proTips: string[] = [
    "Pat your protein dry before cooking — moisture prevents browning.",
    "Let meat rest after cooking so juices redistribute for a more flavourful result.",
  ];
  if (healthiness === "lean") {
    proTips.push("Swap butter for olive oil and reduce cheese portions to keep it lighter.");
  }

  let vegOption: { enabled: boolean; swap_protein: string; ingredients: { item: string; amount: string; notes: string }[]; steps: string[]; plating_notes: string } | undefined;
  if (request.vegetarian_swap_needed) {
    vegOption = {
      enabled: true,
      swap_protein: "Extra-firm tofu",
      ingredients: [
        { item: "Extra-firm tofu, pressed and cubed", amount: "1 block (14 oz)", notes: "Press for 10 minutes to remove moisture" },
        { item: "Olive oil", amount: "1 tbsp", notes: "" },
        { item: "Same seasonings as the main recipe", amount: "to taste", notes: "" },
      ],
      steps: [
        `Press tofu for 10 minutes between paper towels with a heavy pan on top.`,
        `Cut tofu into ¾-inch cubes.`,
        `Heat olive oil in a separate non-stick pan over medium-high heat.`,
        `Add tofu cubes in a single layer. Cook 3-4 minutes per side until golden and crispy on the outside.`,
        `Season with the same spices used for the ${proteinDisplay.toLowerCase()} and toss to coat.`,
      ],
      plating_notes: `Plate the tofu portion separately on the same sides (rice, vegetables). Label clearly so the vegetarian crew member can grab theirs easily.`,
    };
  }

  const hasStove = hasAppliance(appliances, "stove");
  const hasOvenAppliance = hasAppliance(appliances, "oven");
  const hasSlowCookerAppliance = hasAppliance(appliances, "slow cooker");
  const hasInstantPotAppliance = hasAppliance(appliances, "instant pot");
  const cookingMethod = hasInstantPotAppliance && !hasStove && !hasOvenAppliance ? "instant pot"
    : hasSlowCookerAppliance && !hasStove && !hasOvenAppliance ? "slow cooker"
    : hasOvenAppliance ? "oven + stovetop"
    : "stovetop";

  const logParts = [
    `protein: ${proteinDisplay}`,
    `crew: ${crewSize}`,
    `allergens: ${allergens.length ? allergens.join(",") : "none"}`,
    `swaps: ${swapsMade.length}`,
    `cuisine: ${cuisineStyle}`,
    `time: ${timeRange}`,
    `healthiness: ${healthiness}`,
    `budget: ${budgetLevel}`,
    `appliances: ${appliances.join(",")}`,
    `vegSwap: ${!!request.vegetarian_swap_needed}`,
  ];
  log(`Built fallback recipe: "${title}" (${logParts.join(" | ")})`, "fallback");

  return {
    template_id: parseInt(template.template_id),
    chosen_protein: proteinDisplay,
    title,
    why_it_fits_tonight: whyItFits,
    timing,
    protein_safety: [safety],
    ingredients: scaledIngredients,
    steps,
    cleanup_tip: "Line baking sheets with foil for easy cleanup. Soak the skillet with hot soapy water right after plating.",
    macros_per_serving: macros,
    budget_level: budgetLevel,
    budget_tips: getBudgetTips(budgetLevel),
    pro_tips: proTips,
    veg_option: vegOption,
    tags: {
      cuisine: cuisineData ? cuisineStyle.replace("_", " ") : "American",
      cooking_method: cookingMethod,
      base_carb: "rice",
      key_ingredients: [proteinDisplay, "rice", "vegetables"],
      high_protein: true,
      high_fiber: healthiness === "lean",
      quick_cleanup: true,
    },
    ingredients_used: [],
    extra_items_needed: [],
  } as GenerateResponse;
}
