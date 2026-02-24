import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";

const PROTEIN_INGREDIENTS: Record<string, { item: string; amount: string }[]> = {
  chicken: [
    { item: "Boneless skinless chicken breasts", amount: "2 lbs" },
    { item: "Olive oil", amount: "2 tbsp" },
    { item: "Garlic cloves, minced", amount: "4" },
    { item: "Salt", amount: "1 tsp" },
    { item: "Black pepper", amount: "½ tsp" },
    { item: "Paprika", amount: "1 tsp" },
    { item: "Rice", amount: "2 cups" },
    { item: "Mixed vegetables (broccoli, bell pepper, carrots)", amount: "4 cups" },
    { item: "Soy sauce", amount: "3 tbsp" },
    { item: "Chicken broth", amount: "1 cup" },
  ],
  beef: [
    { item: "Ground beef (lean)", amount: "2 lbs" },
    { item: "Olive oil", amount: "2 tbsp" },
    { item: "Onion, diced", amount: "1 large" },
    { item: "Garlic cloves, minced", amount: "4" },
    { item: "Salt", amount: "1 tsp" },
    { item: "Black pepper", amount: "½ tsp" },
    { item: "Chili powder", amount: "2 tsp" },
    { item: "Rice or pasta", amount: "2 cups" },
    { item: "Canned diced tomatoes", amount: "2 cans (14 oz)" },
    { item: "Shredded cheese", amount: "1 cup" },
  ],
  pork: [
    { item: "Pork tenderloin", amount: "2 lbs" },
    { item: "Olive oil", amount: "2 tbsp" },
    { item: "Garlic cloves, minced", amount: "3" },
    { item: "Salt", amount: "1 tsp" },
    { item: "Black pepper", amount: "½ tsp" },
    { item: "Brown sugar", amount: "2 tbsp" },
    { item: "Dijon mustard", amount: "2 tbsp" },
    { item: "Potatoes, cubed", amount: "2 lbs" },
    { item: "Green beans", amount: "1 lb" },
    { item: "Butter", amount: "2 tbsp" },
  ],
  turkey: [
    { item: "Ground turkey", amount: "2 lbs" },
    { item: "Olive oil", amount: "2 tbsp" },
    { item: "Onion, diced", amount: "1 large" },
    { item: "Garlic cloves, minced", amount: "3" },
    { item: "Salt", amount: "1 tsp" },
    { item: "Cumin", amount: "1 tsp" },
    { item: "Taco seasoning", amount: "2 tbsp" },
    { item: "Rice", amount: "2 cups" },
    { item: "Black beans, drained", amount: "1 can (15 oz)" },
    { item: "Shredded lettuce and salsa", amount: "for topping" },
  ],
  fish: [
    { item: "Salmon fillets", amount: "2 lbs" },
    { item: "Olive oil", amount: "2 tbsp" },
    { item: "Lemon juice", amount: "3 tbsp" },
    { item: "Garlic cloves, minced", amount: "3" },
    { item: "Salt", amount: "1 tsp" },
    { item: "Dill (dried)", amount: "1 tsp" },
    { item: "Asparagus", amount: "1 bunch" },
    { item: "Rice", amount: "2 cups" },
    { item: "Butter", amount: "2 tbsp" },
    { item: "Lemon wedges", amount: "for serving" },
  ],
};

const PROTEIN_STEPS: Record<string, { heading: string; body: string }[]> = {
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

export function buildFallbackRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string
): GenerateResponse {
  const protein = chosenProtein.toLowerCase();
  const proteinKey = Object.keys(PROTEIN_INGREDIENTS).includes(protein) ? protein : "chicken";
  const proteinDisplay = proteinKey.charAt(0).toUpperCase() + proteinKey.slice(1);
  const budgetLevel = request.budget_level || "standard";

  const title = FALLBACK_TITLES[proteinKey] || `Quick ${proteinDisplay} — ${template.template_name}`;
  const ingredients = (PROTEIN_INGREDIENTS[proteinKey] || PROTEIN_INGREDIENTS.chicken).map(i => ({
    item: i.item,
    amount: i.amount,
    notes: "",
  }));
  const steps = PROTEIN_STEPS[proteinKey] || PROTEIN_STEPS.chicken;
  const safety = PROTEIN_SAFETY[proteinKey] || PROTEIN_SAFETY.chicken;

  log(`Built deterministic fallback recipe: "${title}" (protein: ${proteinDisplay})`, "fallback");

  return {
    template_id: parseInt(template.template_id),
    chosen_protein: proteinDisplay,
    title,
    why_it_fits_tonight: `Quick, reliable ${proteinDisplay.toLowerCase()} meal — ready in under 30 minutes with simple ingredients your crew will love.`,
    timing: { prep_minutes: 10, cook_minutes: 20, total_minutes: 30 },
    protein_safety: [safety],
    ingredients,
    steps,
    cleanup_tip: "Line baking sheets with foil for easy cleanup. Soak the skillet with hot soapy water right after plating.",
    macros_per_serving: {
      calories: proteinKey === "fish" ? 420 : proteinKey === "chicken" ? 450 : 520,
      protein_g: proteinKey === "fish" ? 38 : proteinKey === "chicken" ? 42 : 40,
      carbs_g: proteinKey === "fish" ? 40 : 45,
      fat_g: proteinKey === "fish" ? 14 : proteinKey === "chicken" ? 12 : 18,
    },
    budget_level: budgetLevel,
    budget_tips: budgetLevel === "low" ? ["Buy protein in bulk and freeze portions.", "Frozen vegetables work just as well and cost less."] : [],
    pro_tips: [
      "Pat your protein dry before cooking — moisture prevents browning.",
      "Let meat rest after cooking so juices redistribute for a more flavourful result.",
    ],
    tags: {
      cuisine: template.style || "American",
      cooking_method: "stovetop",
      base_carb: "rice",
      key_ingredients: [proteinDisplay, "rice", "vegetables"],
      high_protein: true,
      high_fiber: false,
      quick_cleanup: true,
    },
    ingredients_used: [],
    extra_items_needed: [],
  } as GenerateResponse;
}
