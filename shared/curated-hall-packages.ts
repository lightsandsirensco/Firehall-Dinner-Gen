import type {
  ClientRecipeResponse,
  ClientIngredient,
  ClientStep,
  MealPlate,
} from "./schema";
import {
  clampGoldenIngredientsForCrew,
} from "./recipe/crew-portion-limits.js";
import {
  getClassicHallMeal,
  resolveClassicHeroImage,
  validateClassicMealConsistency,
  validateAllClassicMeals,
  type ClassicHallMealMeta,
} from "./classic-hall-meals";

export type { ClassicHallMealMeta } from "./classic-hall-meals";
export {
  CLASSIC_HALL_MEALS,
  getClassicHallMeal,
  getClassicHeroImage,
  resolveClassicHeroImage,
  spoonacularHeroImage,
  validateClassicMealConsistency,
  validateAllClassicMeals,
} from "./classic-hall-meals";

export interface CuratedPackageDef {
  slug: string;
  title: string;
  displayTitle: string;
  emoji: string;
  heroImage: string;
  imageAlt: string;
  spoonacularRecipeId: number;
  spoonacularTitle: string;
  tags: string[];
  externalUrl?: string;
  tagline: string;
  crewLine: string;
  mealFormat: string;
  protein: string;
  cuisineLabel: string;
  prepMin: number;
  cookMin: number;
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  plate: MealPlate;
  ingredients: { name: string; qty: number; unit: string; category: string }[];
  steps: { title: string; heat: string; minutes: number; instructions: string }[];
  whyItFits: string;
  cleanupTip: string;
  proTips: string[];
}

const BASE_CREW = 6;

function scaleQty(qty: number, crewSize: number): number {
  const r = crewSize / BASE_CREW;
  return Math.round(qty * r * 10) / 10;
}

export function buildCuratedClientRecipe(
  def: CuratedPackageDef,
  crewSize: number = BASE_CREW,
): ClientRecipeResponse {
  const goldenIngs = def.ingredients.map((ing) => ({
    name: ing.name,
    quantity: ing.qty > 0 ? String(scaleQty(ing.qty, crewSize)) : undefined,
    unit: ing.unit || undefined,
  }));
  const clamped = clampGoldenIngredientsForCrew(goldenIngs, crewSize).ingredients;

  const ingredients: ClientIngredient[] = clamped.map((ing, i) => ({
    name: ing.name,
    qty: parseFloat(ing.quantity || "0") || def.ingredients[i]?.qty || 0,
    unit: ing.unit || def.ingredients[i]?.unit || "",
    category: def.ingredients[i]?.category || "",
  }));

  const steps: ClientStep[] = def.steps.map((s, i) => ({
    n: i + 1,
    title: s.title,
    heat: s.heat,
    minutes: s.minutes,
    instructions: s.instructions,
  }));

  const plate: MealPlate = {
    ...def.plate,
    main: def.plate.main.map((l) => ({
      ...l,
      amount: l.amount.replace(/\d+(\.\d+)?/, (m) => String(scaleQty(parseFloat(m), crewSize))),
    })),
    sides: def.plate.sides.map((l) => ({
      ...l,
      amount: l.amount.replace(/\d+(\.\d+)?/, (m) => String(scaleQty(parseFloat(m), crewSize))),
    })),
    optional: def.plate.optional?.map((l) => ({ ...l })) || [],
  };

  return {
    title: def.displayTitle,
    meal_plate: plate,
    meal_format: def.mealFormat,
    servings: crewSize,
    tags: def.tags.length > 0 ? [...def.tags, "Curated package"] : [def.cuisineLabel, "Hall classic", "Curated package"],
    timing: {
      prep_min: def.prepMin,
      cook_min: def.cookMin,
      total_min: def.prepMin + def.cookMin,
    },
    protein_safety: {
      protein: def.protein,
      internal_temp_f: def.protein.toLowerCase().includes("chicken") ? 165 : 160,
      rest_min: def.protein.toLowerCase().includes("beef") ? 5 : 3,
      notes: "Verify with instant-read thermometer before serving the crew.",
    },
    ingredients,
    steps,
    plating: {
      serve_style: "Family-style on the hall table",
      assembly_instructions: plate.optional?.length
        ? "Main in the center, sides in bowls, optional garnishes on the end."
        : "Main in the center, sides in bowls — line up and serve.",
      optional_toppings: plate.optional?.map((o) => o.name) || [],
    },
    macros_per_serving: def.macros,
    chosen_protein: def.protein.toLowerCase(),
    primary_protein_source: def.protein,
    why_it_fits_tonight: def.whyItFits,
    cleanup_tip: def.cleanupTip,
    pro_tips: def.proTips,
    _signature: `curated:${def.slug}`,
    _id: `curated-${def.slug}`,
  };
}

type CuratedPackageInput = Omit<
  CuratedPackageDef,
  "heroImage" | "imageAlt" | "spoonacularRecipeId" | "spoonacularTitle" | "tags"
> & { tags?: string[] };

function enrichCuratedPackage(input: CuratedPackageInput): CuratedPackageDef {
  const meta = getClassicHallMeal(input.slug);
  if (!meta) {
    throw new Error(`[curated-hall-packages] Missing classic-hall-meals meta for slug: ${input.slug}`);
  }
  const heroImage = resolveClassicHeroImage(meta);
  const def: CuratedPackageDef = {
    ...input,
    title: meta.title,
    displayTitle: meta.displayTitle,
    emoji: meta.emoji,
    tagline: meta.tagline,
    crewLine: meta.description,
    mealFormat: meta.mealFormat,
    protein: meta.protein,
    cuisineLabel: meta.cuisine,
    heroImage,
    imageAlt: meta.imageAlt,
    spoonacularRecipeId: meta.spoonacularRecipeId,
    spoonacularTitle: meta.spoonacularTitle,
    tags: input.tags ?? meta.tags,
    externalUrl: input.externalUrl ?? meta.externalUrl,
  };
  validateClassicMealConsistency(meta, `package:${input.slug}`, heroImage);
  return def;
}

/** All wheel / hall curated dinner packages (hero images from classic-hall-meals). */
const CURATED_HALL_PACKAGES_RAW: CuratedPackageInput[] = [
  {
    slug: "chicken-parm",
    title: "Chicken Parm",
    displayTitle: "Chicken Parm Night — Italian Hall Spread",
    emoji: "🍝",
    externalUrl: "https://www.allrecipes.com/recipe/223042/chicken-parmesan/",
    tagline: "Italian night at the station",
    crewLine: "Breaded cutlets, red sauce, pasta, and garlic bread — the full hall spread.",
    mealFormat: "pasta",
    protein: "Chicken",
    cuisineLabel: "Italian",
    prepMin: 25,
    cookMin: 35,
    macros: { calories: 640, protein_g: 44, carbs_g: 52, fat_g: 26 },
    plate: {
      display_title: "Chicken Parm Night — Italian Hall Spread",
      main: [{ name: "Chicken parmigiana", amount: "12 cutlets", role: "main" }],
      sides: [
        { name: "Penne marinara", amount: "3 lb dry pasta", role: "starch" },
        { name: "Caesar salad", amount: "2 large bowls", role: "veg" },
        { name: "Garlic bread", amount: "3 loaves", role: "starch" },
      ],
      optional: [{ name: "Grated parmesan", amount: "for the table", role: "optional" }],
      cuisine_label: "Italian",
    },
    ingredients: [
      { name: "Chicken breast cutlets", qty: 12, unit: "", category: "Proteins" },
      { name: "Marinara sauce", qty: 6, unit: "cups", category: "Pantry" },
      { name: "Penne pasta", qty: 3, unit: "lb", category: "Grains" },
      { name: "Mozzarella cheese", qty: 2, unit: "lb", category: "Dairy" },
      { name: "Parmesan cheese", qty: 2, unit: "cups", category: "Dairy" },
      { name: "Breadcrumbs", qty: 4, unit: "cups", category: "Pantry" },
      { name: "Eggs", qty: 6, unit: "", category: "Dairy" },
      { name: "Romaine lettuce", qty: 4, unit: "heads", category: "Produce" },
      { name: "Caesar dressing", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Croutons", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Italian bread loaves", qty: 3, unit: "", category: "Bakery" },
      { name: "Garlic butter", qty: 1, unit: "cup", category: "Dairy" },
      { name: "Italian seasoning", qty: 3, unit: "tbsp", category: "Pantry" },
    ],
    steps: [
      { title: "Bread the chicken (medium, 15 min)", heat: "medium", minutes: 15, instructions: "Dredge cutlets in flour, egg, then seasoned breadcrumbs. Lay on sheet pans." },
      { title: "Bake the chicken (425°F, 18 min)", heat: "high", minutes: 18, instructions: "Bake until golden and 165°F internal. Top with sauce and mozzarella; broil until bubbly." },
      { title: "Cook the pasta (boil, 12 min)", heat: "high", minutes: 12, instructions: "Boil penne al dente. Toss with warm marinara and hold." },
      { title: "Build Caesar salad (no heat, 10 min)", heat: "none", minutes: 10, instructions: "Chop romaine, toss with dressing and croutons. Keep cold until serve." },
      { title: "Toast garlic bread (425°F, 8 min)", heat: "high", minutes: 8, instructions: "Split loaves, spread garlic butter, bake until edges are crisp." },
      { title: "Plate for the hall (serve)", heat: "none", minutes: 5, instructions: "Family-style: chicken and pasta center, salad and bread on the sides." },
    ],
    whyItFits: "A complete Italian hall night — crispy parm, pasta, salad, and garlic bread without guessing sides.",
    cleanupTip: "Soak sheet pans while the crew eats — cheese bakes on easier when warm.",
    proTips: ["Hold sauced pasta separate from cutlets so breading stays crisp.", "Broil mozzarella only 1–2 min — watch the hall oven."],
  },
  {
    slug: "steak-tacos",
    title: "Street-Style Chimichurri Steak Tacos",
    displayTitle: "Street-Style Chimichurri Steak Tacos",
    emoji: "🌮",
    tagline: "Char, acid, and melty cotija",
    crewLine:
      "Skirt steak over open flame, charred tortillas, chimichurri, pickled onions, cotija, and lime crema — build-your-own street line.",
    mealFormat: "tacos",
    protein: "Beef",
    cuisineLabel: "Mexican",
    prepMin: 25,
    cookMin: 30,
    macros: { calories: 520, protein_g: 34, carbs_g: 38, fat_g: 26 },
    plate: {
      display_title: "Street-Style Chimichurri Steak Tacos",
      main: [{ name: "Charred skirt steak", amount: "3 lb cooked", role: "main" }],
      sides: [
        { name: "Charred corn tortillas", amount: "36 count", role: "starch" },
        { name: "Fresh chimichurri", amount: "2 cups", role: "veg" },
        { name: "Quick-pickled red onions", amount: "2 cups", role: "veg" },
      ],
      optional: [
        { name: "Cotija & lime crema", amount: "for the line", role: "optional" },
        { name: "Fresh jalapeño slices", amount: "for heat lovers", role: "optional" },
      ],
      cuisine_label: "Mexican",
    },
    ingredients: [
      { name: "Skirt or flank steak", qty: 3.5, unit: "lb", category: "Proteins" },
      { name: "Smoked paprika", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Chili powder", qty: 1, unit: "tbsp", category: "Pantry" },
      { name: "Ground cumin", qty: 2, unit: "tsp", category: "Pantry" },
      { name: "Garlic powder", qty: 1, unit: "tbsp", category: "Pantry" },
      { name: "Kosher salt", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Black pepper", qty: 1, unit: "tbsp", category: "Pantry" },
      { name: "Fresh parsley (flat-leaf)", qty: 2, unit: "cups packed", category: "Produce" },
      { name: "Fresh cilantro", qty: 1, unit: "cup packed", category: "Produce" },
      { name: "Garlic cloves", qty: 6, unit: "", category: "Produce" },
      { name: "Red wine vinegar", qty: 6, unit: "tbsp", category: "Pantry" },
      { name: "Extra-virgin olive oil", qty: 1, unit: "cup", category: "Pantry" },
      { name: "Red onion", qty: 2, unit: "large", category: "Produce" },
      { name: "White vinegar (pickling)", qty: 1, unit: "cup", category: "Pantry" },
      { name: "Sugar", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Corn tortillas", qty: 36, unit: "", category: "Bakery" },
      { name: "Cotija cheese", qty: 12, unit: "oz", category: "Dairy" },
      { name: "Sour cream", qty: 2, unit: "cups", category: "Dairy" },
      { name: "Limes", qty: 10, unit: "", category: "Produce" },
      { name: "Jalapeños", qty: 4, unit: "", category: "Produce" },
      { name: "Neutral oil (high heat)", qty: 3, unit: "tbsp", category: "Pantry" },
    ],
    steps: [
      {
        title: "Prep chimichurri (no heat, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Finely chop parsley and cilantro — you want small pieces, not a wet purée (blending too long turns chimichurri muddy). Mince garlic. Whisk olive oil, red wine vinegar, garlic, herbs, 1 tsp salt, and cracked pepper. Chimichurri should look like loose green confetti in glossy oil — sharp, herb-forward, not mayonnaise-thick. Taste: it should hit acid first, then garlic, then peppery herbs. Hold at room temp 20 minutes so flavors meld.",
      },
      {
        title: "Quick-pickle the onions (no heat, 8 min)",
        heat: "none",
        minutes: 8,
        instructions:
          "Slice red onions paper-thin on a mandoline if you have one — thick rings stay crunchy-raw instead of pickle-soft. Cover with white vinegar, pinch of salt, and sugar; toss and let sit at least 15 minutes. Done when rings turn hot pink and taste tangy-sweet (not harsh raw onion). Drain lightly before the line — keep a little brine for brightness.",
      },
      {
        title: "Season the steak (no heat, 5 min)",
        heat: "none",
        minutes: 5,
        instructions:
          "Pat skirt or flank completely dry — wet steak steams instead of chars. Rub with smoked paprika, chili powder, cumin, garlic powder, salt, and pepper. Skirt has more fat and forgiving texture; flank is leaner — either works, but slice against the grain extra thin for flank. Let sit 10 minutes at room temp so the salt seasons the interior.",
      },
      {
        title: "Sear steak hard (high, 8–10 min)",
        heat: "high",
        minutes: 10,
        instructions:
          "Heat cast iron or grill to screaming hot — oil should shimmer and barely smoke. Sear steak in batches; don't crowd. You want deep brown crust with grill marks, not gray steamed meat. Flip once. Skirt: 3–4 min per side for medium-rare. Flank: 4–5 min per side. Internal 125–130°F for pink center — carryover cooking will rise 5° while resting. Common mistake: flipping too early; wait until the crust releases cleanly.",
      },
      {
        title: "Rest & slice against the grain (no heat, 12 min)",
        heat: "none",
        minutes: 12,
        instructions:
          "Transfer steak to a cutting board and rest uncovered 8–10 minutes — juices redistribute so slices stay juicy, not a puddle on the board. Slice at a sharp angle against the grain into thin ribbons (⅛-inch). You should see short muscle fibers, not long chewy lines. Hold loosely covered with foil — don't stack hot slices or they'll steam soggy.",
      },
      {
        title: "Char tortillas (high, 6 min)",
        heat: "high",
        minutes: 6,
        instructions:
          "Work in batches over open flame, hot cast iron, or dry skillet. 20–40 seconds per side until you see leopard char spots and smell toasted corn — pliable in the center, not cracker-crisp. Stack wrapped in a towel so they steam slightly and stay warm. Cold tortillas crack when folded — warm is non-negotiable for street tacos.",
      },
      {
        title: "Lime crema & taco line (no heat, 8 min)",
        heat: "none",
        minutes: 8,
        instructions:
          "Whisk sour cream with lime juice and zest until pourable — balance fat (crema) with acid (lime) so each bite isn't heavy. Crumble cotija. Set chimichurri, pickled onions, crema, cilantro, and optional jalapeño slices on the counter. Assembly order for best texture: tortilla → thin steak → chimichurri → onions → cotija → crema → cilantro. Acid and herbs cut the rich steak; crema cools heat from jalapeños.",
      },
      {
        title: "Serve immediately (no heat, 3 min)",
        heat: "none",
        minutes: 3,
        instructions:
          "Call the crew when steak and tortillas are hot — street tacos fall apart when held under heat lamps. Lime wedges on the side for a final squeeze. Balance check on your first taco: char (steak/tortilla), fat (crema/cotija), acid (pickled onion/lime/chimichurri), spice (jalapeño/chili rub). Adjust chimichurri vinegar or salt at the line if needed.",
      },
    ],
    whyItFits:
      "Real street tacos — charred steak, chimichurri, pickles, and cotija — not ground beef with rice on the side.",
    cleanupTip: "Soak onion-pickle container while the crew eats — vinegar smell clears faster when warm.",
    proTips: [
      "Slice steak only after resting — rushing guarantees chewy tacos.",
      "Keep chimichurri loose; a thick paste won't cling to sliced steak.",
    ],
  },
  {
    slug: "pulled-pork",
    title: "Pulled Pork Sandwiches",
    displayTitle: "Pulled Pork Sandwiches — BBQ Hall Line",
    emoji: "🥪",
    mealFormat: "sandwich",
    protein: "Pork",
    cuisineLabel: "BBQ",
    tagline: "Sandwich line for the whole hall",
    crewLine: "Slow-smoked shoulder, soft buns, slaw, and pickles on the board.",
    prepMin: 20,
    cookMin: 240,
    macros: { calories: 620, protein_g: 38, carbs_g: 42, fat_g: 32 },
    plate: {
      display_title: "Pulled Pork Sandwiches — BBQ Hall Line",
      main: [{ name: "Pulled pork shoulder", amount: "8 lb cooked", role: "main" }],
      sides: [
        { name: "Brioche buns", amount: "24 buns", role: "starch" },
        { name: "Creamy coleslaw", amount: "2 large bowls", role: "veg" },
        { name: "BBQ baked beans", amount: "1 tray", role: "starch" },
      ],
      optional: [{ name: "Pickles & extra sauce", amount: "for the line", role: "optional" }],
      cuisine_label: "BBQ",
    },
    ingredients: [
      { name: "Pork shoulder", qty: 8, unit: "lb", category: "Proteins" },
      { name: "BBQ rub", qty: 1, unit: "cup", category: "Pantry" },
      { name: "BBQ sauce", qty: 4, unit: "cups", category: "Pantry" },
      { name: "Brioche buns", qty: 24, unit: "", category: "Bakery" },
      { name: "Coleslaw mix", qty: 3, unit: "bags", category: "Produce" },
      { name: "Coleslaw dressing", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Baked beans", qty: 4, unit: "cans", category: "Pantry" },
      { name: "Pickles", qty: 2, unit: "jars", category: "Pantry" },
    ],
    steps: [
      { title: "Rub & slow-cook pork (low, 4 hr)", heat: "low", minutes: 240, instructions: "Season shoulder, slow cook until pull-apart tender. Rest 20 min, then shred." },
      { title: "Toss pork with sauce (low, 15 min)", heat: "low", minutes: 15, instructions: "Mix shredded pork with BBQ sauce; hold warm." },
      { title: "Warm beans & toast buns (medium, 12 min)", heat: "medium", minutes: 12, instructions: "Heat beans with extra sauce; warm split buns on sheet pan." },
      { title: "Toss coleslaw (no heat, 8 min)", heat: "none", minutes: 8, instructions: "Dress slaw just before line opens so it stays crisp." },
      { title: "Run the sandwich line (serve)", heat: "none", minutes: 5, instructions: "Bun, pork, slaw, pickles — crew adds extra sauce if they want." },
    ],
    whyItFits: "A real BBQ sandwich spread — not a lone protein without buns or slaw.",
    cleanupTip: "Line sheet pans with foil before pork — saves scrub time after shift.",
    proTips: ["Start pork early — shoulder needs time more than attention.", "Keep slaw cold until the last minute."],
  },
  {
    slug: "smash-burgers",
    title: "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
    displayTitle: "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
    emoji: "🍔",
    mealFormat: "burger",
    protein: "Beef",
    cuisineLabel: "American",
    tagline: "Diner griddle · melty · viral stack",
    crewLine:
      "Two thin patties per bun, lacy crust, potato rolls, dirty sauce, caramelized onions, pickles, and shredded lettuce — bacon optional.",
    prepMin: 25,
    cookMin: 25,
    macros: { calories: 780, protein_g: 42, carbs_g: 46, fat_g: 44 },
    plate: {
      display_title: "Double Smash Burgers with Caramelized Onions & Dirty Sauce",
      main: [{ name: "Double smash burgers", amount: "8 stacks", role: "main" }],
      sides: [
        { name: "Caramelized onions", amount: "2 cups", role: "veg" },
        { name: "Shredded iceberg & pickles", amount: "for the line", role: "veg" },
        { name: "Crispy diner fries", amount: "4 lb", role: "starch" },
      ],
      optional: [{ name: "Crispy bacon", amount: "16 strips", role: "optional" }],
      cuisine_label: "American",
    },
    ingredients: [
      { name: "Ground beef (80/20)", qty: 3, unit: "lb", category: "Proteins" },
      { name: "Potato slider/burger buns", qty: 8, unit: "", category: "Bakery" },
      { name: "American cheese slices", qty: 16, unit: "", category: "Dairy" },
      { name: "Yellow onions", qty: 3, unit: "large", category: "Produce" },
      { name: "Unsalted butter", qty: 6, unit: "tbsp", category: "Dairy" },
      { name: "Mayonnaise", qty: 0.5, unit: "cup", category: "Pantry" },
      { name: "Ketchup", qty: 3, unit: "tbsp", category: "Pantry" },
      { name: "Yellow mustard", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Dill pickle relish", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Worcestershire sauce", qty: 1, unit: "tsp", category: "Pantry" },
      { name: "Garlic powder", qty: 0.5, unit: "tsp", category: "Pantry" },
      { name: "Smoked paprika", qty: 0.5, unit: "tsp", category: "Pantry" },
      { name: "Iceberg lettuce", qty: 1, unit: "head", category: "Produce" },
      { name: "Dill pickle chips", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Bacon (optional)", qty: 16, unit: "strips", category: "Proteins" },
      { name: "Frozen crinkle or diner fries", qty: 4, unit: "lb", category: "Frozen" },
      { name: "Neutral high-heat oil", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Kosher salt & black pepper", qty: 1, unit: "set", category: "Pantry" },
    ],
    steps: [
      {
        title: "Make dirty sauce (no heat, 5 min)",
        heat: "none",
        minutes: 5,
        instructions:
          "Whisk mayo, ketchup, mustard, relish, Worcestershire, garlic powder, and smoked paprika until creamy and pink-tan. Dirty sauce should taste tangy-savory-sweet — not plain mayo. Hold refrigerated until service; room-temp sauce on hot burgers is fine, but don't water it down.",
      },
      {
        title: "Caramelize onions (medium-low, 25–30 min)",
        heat: "medium",
        minutes: 30,
        instructions:
          "Slice onions into thin half-moons. Melt butter in a wide pan over medium-low — gentle heat is the secret (high heat burns before sweet). Stir every 3–4 minutes until onions turn jammy, mahogany, and smell like candy (25–30 min). They should melt when pressed, not hold crunch. Season lightly with salt. Common mistake: rushing — pale onions taste sharp, not diner-sweet.",
      },
      {
        title: "Prep & portion beef (no heat, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Divide beef into 2.5–3 oz loose balls per patty (16 balls for 8 double stacks). Do not pack tight — air pockets help the smash spread. Chill until smash time if kitchen is warm; cold fat renders into crispy edges. Shred iceberg fine; drain pickle chips on paper towels so buns don't sog.",
      },
      {
        title: "Toast potato buns (medium, 4 min)",
        heat: "medium",
        minutes: 4,
        instructions:
          "Butter cut sides of potato buns generously. Toast on griddle or skillet until edges are golden and centers still soft — you want a glossy, buttery shell that won't dissolve under sauce. Toast just before smashing so buns stay warm. Stack cut-side up on a sheet pan.",
      },
      {
        title: "Smash first patty — crust formation (high, 2 min)",
        heat: "high",
        minutes: 2,
        instructions:
          "Heat cast iron or flat griddle until a water droplet dances and evaporates in 2 seconds — that's smash heat. Oil lightly. Place a beef ball, immediately smash flat with a stiff spatula (use parchment on spatula if it sticks). Press 10 seconds so meat spreads thin with lacy edges creeping past the ball. Season with salt and pepper. Don't move — crust is forming. Cook until edges look deep brown and lacey, top still pink-red, about 90 seconds.",
      },
      {
        title: "Flip, cheese, stack second patty (high, 2 min)",
        heat: "high",
        minutes: 2,
        instructions:
          "Scrape and flip with confidence — the crust should release cleanly. Lay American cheese on the cooked side immediately; residual heat melts cheese in 30–45 seconds (cheese should drape, not sit solid). Add a fresh beef ball on the cheese, smash again, season, and cook second crust 90 seconds. Flip once more, add second cheese slice, and stack both patties cheese-side-in so you get a molten core. Timing matters: cheese goes on the hot face right after flip, not before — otherwise it oils out.",
      },
      {
        title: "Optional bacon (medium, 8 min)",
        heat: "medium",
        minutes: 8,
        instructions:
          "Lay bacon in cold pan, turn to medium, cook until shatter-crisp. Blot on towels — wet bacon steams the bun. Hold warm; add only at assembly so it stays crisp.",
      },
      {
        title: "Bake diner fries (425°F, 22 min)",
        heat: "high",
        minutes: 22,
        instructions:
          "Spread fries in a single layer — crowded pans steam instead of crisp. Bake until deeply golden with audible crunch when shaken. Season with salt immediately out of the oven (hot fat grabs seasoning). Hold in warm oven with door cracked.",
      },
      {
        title: "Assembly order (no heat, 3 min each)",
        heat: "none",
        minutes: 3,
        instructions:
          "Bottom bun → dirty sauce → shredded lettuce (barrier against juice) → pickles → double stack (cheese melted between patties) → spoon of caramelized onions → optional bacon → more dirty sauce on top bun → crown. Press lightly so stack sets. Serve within 2 minutes — smash burgers lose their crisp edge fast. Crew eats open-faced at the line if stacks are tall.",
      },
    ],
    whyItFits:
      "Restaurant-style doubles with caramelized onions and dirty sauce — not plain grilled patties on generic buns.",
    cleanupTip: "Deglaze the griddle while warm with water — scrape lacy bits before they weld on.",
    proTips: [
      "Smash once per side — re-smashing after crust forms tears the lace.",
      "American cheese melts faster than cheddar; use it for that diner drape.",
    ],
  },
  {
    slug: "big-chili",
    title: "Firehouse Smoked Beef Chili with Cheesy Garlic Bread",
    displayTitle: "Firehouse Smoked Beef Chili with Cheesy Garlic Bread",
    emoji: "🔥",
    mealFormat: "soup_chili",
    protein: "Beef",
    cuisineLabel: "Comfort",
    tagline: "Viral comfort-food hall night",
    crewLine:
      "Two stock pots of smoky, stick-to-your-ribs chili with a sheet-pan of cheesy garlic bread — topping bar for the crew.",
    prepMin: 25,
    cookMin: 50,
    macros: { calories: 580, protein_g: 36, carbs_g: 48, fat_g: 26 },
    plate: {
      display_title: "Firehouse Smoked Beef Chili with Cheesy Garlic Bread",
      main: [{ name: "Smoked beef chili", amount: "2 stock pots (8+ servings)", role: "main" }],
      sides: [
        { name: "Cheddar-mozzarella garlic bread", amount: "4 split loaves", role: "starch" },
        { name: "Topping bar", amount: "cheese, onion, jalapeño, sour cream", role: "optional" },
      ],
      optional: [
        { name: "Pickled jalapeños", amount: "for heat lovers", role: "optional" },
        { name: "Fresh cilantro", amount: "handful", role: "optional" },
      ],
      cuisine_label: "Comfort",
    },
    ingredients: [
      { name: "Ground beef (80/20)", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Yellow onions", qty: 3, unit: "large", category: "Produce" },
      { name: "Bell peppers (mixed)", qty: 3, unit: "", category: "Produce" },
      { name: "Garlic cloves", qty: 8, unit: "", category: "Produce" },
      { name: "Fire-roasted diced tomatoes", qty: 3, unit: "cans (14 oz)", category: "Pantry" },
      { name: "Crushed fire-roasted tomatoes", qty: 2, unit: "cans (28 oz)", category: "Pantry" },
      { name: "Tomato paste", qty: 3, unit: "tbsp", category: "Pantry" },
      { name: "Beef broth", qty: 4, unit: "cups", category: "Pantry" },
      { name: "Kidney beans", qty: 3, unit: "cans", category: "Pantry" },
      { name: "Chili powder", qty: 3, unit: "tbsp", category: "Pantry" },
      { name: "Smoked paprika", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Ground cumin", qty: 2, unit: "tsp", category: "Pantry" },
      { name: "Dried oregano", qty: 1, unit: "tsp", category: "Pantry" },
      { name: "Chipotle in adobo", qty: 2, unit: "tbsp sauce", category: "Pantry" },
      { name: "Brown sugar", qty: 1, unit: "tbsp", category: "Pantry" },
      { name: "Worcestershire sauce", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Italian bread or baguettes", qty: 4, unit: "loaves", category: "Bakery" },
      { name: "Unsalted butter (softened)", qty: 1, unit: "cup", category: "Dairy" },
      { name: "Shredded sharp cheddar", qty: 12, unit: "oz", category: "Dairy" },
      { name: "Shredded mozzarella", qty: 12, unit: "oz", category: "Dairy" },
      { name: "Fresh jalapeños", qty: 4, unit: "", category: "Produce" },
      { name: "Sour cream", qty: 2, unit: "cups", category: "Dairy" },
    ],
    steps: [
      {
        title: "Prep the station (no heat, 15 min)",
        heat: "none",
        minutes: 15,
        instructions:
          "Dice onions into ¼-inch pieces (you want even pieces so they caramelize together). Dice bell peppers. Mince garlic. Drain and rinse beans. Open all tomatoes. Line two sheet pans with parchment for garlic bread. Set out a large Dutch oven or stock pot — chili needs room to reduce without splashing.",
      },
      {
        title: "Caramelize the onions (medium, 12–15 min)",
        heat: "medium",
        minutes: 15,
        instructions:
          "Heat 2 tbsp oil in the pot over medium. Add onions with a pinch of salt and cook, stirring every 2–3 minutes, until edges turn golden and the centers are soft and sweet — not raw, not burnt. They should look like wet golden ribbons and smell sweet. Push onions to the side; you'll brown beef in the same pot.",
      },
      {
        title: "Brown the beef hard (medium-high, 10 min)",
        heat: "high",
        minutes: 10,
        instructions:
          "Raise heat to medium-high. Add beef in two batches so the pan sears instead of steams. Break into crumbles; cook until deeply browned with no pink (160°F). Drain excess grease if the pot looks oily — leave about 1 tbsp fat for flavor. Stir browned beef back with onions.",
      },
      {
        title: "Bloom spices & build the base (medium, 5 min)",
        heat: "medium",
        minutes: 5,
        instructions:
          "Add garlic, chili powder, smoked paprika, and cumin; stir 45 seconds until the kitchen smells smoky (don't let garlic burn). Stir in tomato paste and brown sugar; cook 1 minute until the paste darkens slightly. Add Worcestershire and chipotle adobo — taste later for heat.",
      },
      {
        title: "Simmer the chili (low, 35–40 min)",
        heat: "medium",
        minutes: 40,
        instructions:
          "Pour in fire-roasted diced tomatoes, crushed tomatoes, and beef broth. Add beans. Bring to a gentle bubble, then lower to a steady simmer — small bubbles breaking the surface, not a rolling boil. Cook uncovered 30 minutes, stirring every 10 minutes. Chili is ready when it coats the back of a spoon and a drag through the pot leaves a clear trail (like thick stew, not soup). If it's still thin, simmer 10 more minutes. Season with salt, pepper, and a splash of broth if too thick.",
      },
      {
        title: "Make garlic butter & prep bread (no heat, 5 min)",
        heat: "none",
        minutes: 5,
        instructions:
          "Mix softened butter with 3 minced garlic cloves, pinch of salt, and ½ tsp dried oregano. Halve loaves lengthwise. Spread cut sides generously — edge to edge. Combine cheddar and mozzarella in a bowl.",
      },
      {
        title: "Toast cheesy garlic bread (425°F, 10–12 min)",
        heat: "high",
        minutes: 12,
        instructions:
          "Preheat oven to 425°F while chili simmers. Lay bread cut-side up on sheet pans. Pile cheese evenly on buttered surfaces. Bake on the middle rack until cheese is fully melted with light golden spots and bread edges are crisp — about 10–12 minutes. Rotate pans halfway. Bread is done when you press the center and it springs back with melted cheese, not pale or raw dough.",
      },
      {
        title: "Optional jalapeño finish (low, 3 min)",
        heat: "low",
        minutes: 3,
        instructions:
          "For medium spice, stir sliced jalapeños into the chili for the last 3 minutes of simmer. For mild, keep jalapeños on the topping bar only. Skim any extra fat from the chili surface if needed.",
      },
      {
        title: "Topping bar & serve (no heat, 5 min)",
        heat: "none",
        minutes: 5,
        instructions:
          "Set sour cream, extra cheese, diced onion, cilantro, and jalapeños on the counter. Slice garlic bread into thick sticks. Ladle chili into bowls — deep fill, not skimpy. Serve bread hot on platters. Tell the crew to add toppings at the table so bread stays crisp.",
      },
      {
        title: "Leftovers & storage (cool, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Chili keeps 4 days refrigerated in shallow containers — reheat on the stove with a splash of broth. Freeze portions up to 3 months; thaw overnight. Garlic bread is best fresh; day-old bread can be rebaked 5 min at 400°F. Never store bread sealed with hot chili or it steams soggy.",
      },
    ],
    whyItFits:
      "Smoky, layered chili with real caramelized onions and cheese-pull garlic bread — the kind of cold-night spread crews actually fight over.",
    cleanupTip:
      "Deglaze the chili pot with hot water while the crew eats — baked-on tomato lifts easier when warm.",
    proTips: [
      "If chili tastes flat, add ½ tsp more smoked paprika and a pinch of salt — not more sugar.",
      "Hold garlic bread under loose foil on the counter; cut open only when the line forms.",
      "Scale beef + tomatoes 1.25× for 10+ crew; keep spice levels the same first, adjust heat on the bar.",
    ],
  },
  {
    slug: "chicken-caesar",
    title: "Chicken Caesar Salad",
    displayTitle: "Chicken Caesar Salad — Hearty Hall Spread",
    emoji: "🥗",
    mealFormat: "salad",
    protein: "Chicken",
    cuisineLabel: "American",
    tagline: "Big bowls, hot chicken, all the fixings",
    crewLine:
      "Blackened or grilled chicken Caesar with hot garlic bread, loud croutons, and parmesan at the pass — built for a hungry hall, not a sad side salad.",
    prepMin: 25,
    cookMin: 35,
    macros: { calories: 620, protein_g: 48, carbs_g: 38, fat_g: 32 },
    plate: {
      display_title: "Chicken Caesar Salad — Hearty Hall Spread",
      main: [{ name: "Grilled chicken Caesar salad", amount: "6 large bowls", role: "main" }],
      sides: [
        { name: "Garlic bread", amount: "3 loaves", role: "starch" },
        { name: "Crispy bacon bits", amount: "2 lb", role: "optional" },
        { name: "Homemade croutons", amount: "2 sheet pans", role: "starch" },
        { name: "Shaved parmesan", amount: "for the line", role: "optional" },
      ],
      optional: [
        { name: "Crispy bacon bits", amount: "2 lb", role: "optional" },
        { name: "Lemon wedges", amount: "for the line", role: "optional" },
      ],
      cuisine_label: "American",
    },
    ingredients: [
      { name: "Chicken breast", qty: 3, unit: "lb", category: "Proteins" },
      { name: "Romaine hearts", qty: 6, unit: "heads", category: "Produce" },
      { name: "Caesar dressing", qty: 4, unit: "cups", category: "Pantry" },
      { name: "Thick-cut bacon", qty: 2, unit: "lb", category: "Proteins" },
      { name: "Parmesan wedge", qty: 1, unit: "lb", category: "Dairy" },
      { name: "French bread / baguette", qty: 3, unit: "loaves", category: "Bakery" },
      { name: "Butter + garlic", qty: 1, unit: "batch", category: "Pantry" },
      { name: "Day-old bread cubes", qty: 8, unit: "cups", category: "Bakery" },
      { name: "Olive oil", qty: 0.5, unit: "cup", category: "Pantry" },
      { name: "Lemon", qty: 6, unit: "", category: "Produce" },
    ],
    steps: [
      {
        title: "Prep the station (no heat, 12 min)",
        heat: "none",
        minutes: 12,
        instructions:
          "Lay out chicken, romaine, dressing, parmesan, bread, sheet pans, and a large skillet or grill pan before any heat goes on. In a busy hall, cooking gets messy fast if you're hunting for ingredients halfway through.",
      },
      {
        title: "Cook the chicken (medium-high, 14–16 min)",
        heat: "high",
        minutes: 16,
        instructions:
          "Heat a large skillet over medium-high until a drop of water sizzles on contact. Season chicken with salt, pepper, garlic powder, and a little paprika. Add oil, then chicken in a single layer — overcrowd and it steams instead of coloring. Cook 5–6 minutes per side until golden outside and 165°F in the center. Rest 5 minutes, then slice across the grain so juices stay in the meat.",
      },
      {
        title: "Make the garlic bread (400°F oven, 8–10 min)",
        heat: "high",
        minutes: 10,
        instructions:
          "Spread garlic butter on halved loaves and sprinkle parmesan and parsley if you have them. Bake at 400°F until edges are crisp and the top is golden. Keep an eye on it — garlic burns fast and nobody wants black toast at the table.",
      },
      {
        title: "Toast the croutons (400°F, 8–10 min)",
        heat: "high",
        minutes: 10,
        instructions:
          "Toss bread cubes with oil, salt, and garlic powder. Spread on a sheet pan and bake until crunchy all the way through — soft centers will sog out the salad in minutes.",
      },
      {
        title: "Build the Caesar salad (no heat, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Chop romaine into bite-sized pieces and dry it well so dressing sticks instead of pooling. Toss lightly with Caesar dressing, parmesan, croutons, and a squeeze of lemon. Add dressing gradually — coated lettuce, not soup.",
      },
      {
        title: "Slice and serve (no heat, 5 min)",
        heat: "none",
        minutes: 5,
        instructions:
          "Slice rested chicken across the grain and lay it over the Caesar while still warm. Serve with hot garlic bread on the side and extra parmesan at the table for the crew.",
      },
    ],
    whyItFits:
      "Caesar night at the hall means protein, starch, and crunch — not a sad side salad. This is a full crew dinner.",
    cleanupTip: "Wash chicken boards and knives first — then tackle the salad bowls.",
    proTips: [
      "Slice chicken thick and against the grain so it feels like a main, not a garnish.",
      "Keep bacon and croutons in warm pans so the line stays loud and crunchy.",
      "Dress each bowl to order — soggy Caesar kills the vibe.",
    ],
  },
  {
    slug: "jerk-chicken",
    title: "Jerk Chicken & Peas and Rice",
    displayTitle: "Jerk Chicken & Peas and Rice — Island Hall Spread",
    emoji: "🔥",
    mealFormat: "grill",
    protein: "Chicken",
    cuisineLabel: "Caribbean",
    tagline: "Fire on the grill",
    crewLine: "Charred jerk thighs, coconut rice and peas, grilled pineapple, and sharp cabbage slaw.",
    prepMin: 35,
    cookMin: 75,
    macros: { calories: 620, protein_g: 48, carbs_g: 58, fat_g: 22 },
    plate: {
      display_title: "Jerk Chicken & Peas and Rice — Island Hall Spread",
      main: [{ name: "Jerk chicken thighs", amount: "5 lb bone-in", role: "main" }],
      sides: [
        { name: "Coconut rice and peas", amount: "8 cups cooked", role: "starch" },
        { name: "Grilled pineapple", amount: "1 pineapple", role: "veg" },
        { name: "Cabbage slaw", amount: "2 lb", role: "veg" },
      ],
      optional: [
        { name: "Hot sauce", amount: "for the line", role: "optional" },
        { name: "Lime wedges", amount: "12", role: "optional" },
      ],
      cuisine_label: "Caribbean",
    },
    ingredients: [
      { name: "Bone-in chicken thighs", qty: 5, unit: "lb", category: "Proteins" },
      { name: "Scotch bonnet peppers", qty: 2, unit: "", category: "Produce" },
      { name: "Green onions", qty: 8, unit: "", category: "Produce" },
      { name: "Fresh thyme", qty: 3, unit: "tbsp", category: "Produce" },
      { name: "Garlic", qty: 10, unit: "cloves", category: "Produce" },
      { name: "Fresh ginger", qty: 3, unit: "tbsp", category: "Produce" },
      { name: "Allspice", qty: 2, unit: "tbsp", category: "Pantry" },
      { name: "Long-grain rice", qty: 3, unit: "cups", category: "Grains" },
      { name: "Kidney beans", qty: 2, unit: "cans", category: "Pantry" },
      { name: "Coconut milk", qty: 2, unit: "cans", category: "Pantry" },
      { name: "Pineapple", qty: 1, unit: "", category: "Produce" },
      { name: "Coleslaw mix", qty: 2, unit: "lb", category: "Produce" },
    ],
    steps: [
      {
        title: "Trim and marinate chicken (no heat, 45+ min)",
        heat: "none",
        minutes: 45,
        instructions:
          "Pat thighs dry, score skin, and massage jerk marinade under the skin. Marinate at least 45 minutes in the fridge — 4–12 hours is better.",
      },
      {
        title: "Cook coconut rice and peas (simmer, 20 min)",
        heat: "medium",
        minutes: 20,
        instructions:
          "Simmer rinsed rice with kidney beans, coconut milk, stock, scallions, and thyme until tender. Fluff and hold covered at 200°F.",
      },
      {
        title: "Grill chicken to 165°F (375°F grill, 35 min)",
        heat: "high",
        minutes: 35,
        instructions:
          "Char skin over direct heat, finish on indirect with lid down until thickest thigh reads 165°F. Rest 10 minutes under foil.",
      },
      {
        title: "Grill pineapple and dress slaw (medium-high, 12 min)",
        heat: "high",
        minutes: 12,
        instructions: "Grill pineapple rings 2–3 minutes per side. Toss slaw with lime, salt, and oil; keep cold on ice.",
      },
      {
        title: "Open island line (serve)",
        heat: "none",
        minutes: 8,
        instructions:
          "Rice and peas first pan, sliced jerk chicken second, pineapple and slaw at the far end. Hot sauce and lime wedges between.",
      },
    ],
    whyItFits: "A full Caribbean hall dinner — jerk chicken with rice and peas and cooling sides, not solo protein on the grill.",
    cleanupTip: "Scrape grill grates while still warm; rinse the rice pot immediately so starch does not cement.",
    proTips: [
      "Thighs forgive the grill better than breasts — critical on call-heavy nights.",
      "Shake coconut milk cans before opening so rice cooks evenly.",
      "Keep slaw cold; hot rice and cold crunch on one plate is the whole point.",
    ],
  },
  {
    slug: "beef-dip",
    title: "Beef Dip Sandwiches",
    displayTitle: "French Dip — Au Jus Hall Line",
    emoji: "🥖",
    mealFormat: "sandwich",
    protein: "Beef",
    cuisineLabel: "Canadian",
    tagline: "Canadian hall legend",
    crewLine: "Roast beef on hoagies, au jus for dipping, fries, and coleslaw.",
    prepMin: 15,
    cookMin: 30,
    macros: { calories: 680, protein_g: 42, carbs_g: 50, fat_g: 30 },
    plate: {
      display_title: "French Dip — Au Jus Hall Line",
      main: [{ name: "Roast beef on hoagies", amount: "18 sandwiches", role: "main" }],
      sides: [
        { name: "Au jus", amount: "2 pitchers", role: "optional" },
        { name: "Steak fries", amount: "3 lb", role: "starch" },
        { name: "Coleslaw", amount: "1 large bowl", role: "veg" },
      ],
      optional: [{ name: "Provolone", amount: "18 slices", role: "optional" }],
      cuisine_label: "Canadian",
    },
    ingredients: [
      { name: "Deli roast beef", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Hoagie rolls", qty: 18, unit: "", category: "Bakery" },
      { name: "Au jus concentrate", qty: 4, unit: "packets", category: "Pantry" },
      { name: "Provolone cheese", qty: 18, unit: "slices", category: "Dairy" },
      { name: "Frozen fries", qty: 3, unit: "lb", category: "Frozen" },
      { name: "Coleslaw mix", qty: 2, unit: "bags", category: "Produce" },
    ],
    steps: [
      { title: "Simmer au jus (medium, 10 min)", heat: "medium", minutes: 10, instructions: "Prepare jus per packet; keep hot in pitchers." },
      { title: "Bake fries (425°F, 20 min)", heat: "high", minutes: 20, instructions: "Season fries; bake until crisp." },
      { title: "Build sandwiches (medium, 12 min)", heat: "medium", minutes: 12, instructions: "Warm rolls, pile beef and cheese, brief oven melt if desired." },
      { title: "Dress coleslaw (no heat, 5 min)", heat: "none", minutes: 5, instructions: "Toss slaw; keep cold." },
      { title: "Open dip line (serve)", heat: "none", minutes: 5, instructions: "Sandwiches, jus cups, fries, and slaw on the counter." },
    ],
    whyItFits: "The full French dip experience — jus, bread, fries, and slaw together.",
    cleanupTip: "Pour leftover jus into a container for freezer — makes great starter for soup.",
    proTips: ["Warm rolls before building — cold bread kills the line.", "Serve jus in mugs for easy dipping."],
  },
  {
    slug: "bbq-chicken-mac-and-cheese",
    title: "BBQ Chicken Mac and Cheese",
    displayTitle: "BBQ Chicken Mac and Cheese — Hall Comfort Tray",
    emoji: "🧀",
    mealFormat: "bake",
    protein: "Chicken",
    cuisineLabel: "BBQ",
    tagline: "BBQ meets mac on the line",
    crewLine:
      "Shredded BBQ chicken folded into creamy baked mac and cheese — smoky, cheesy, and built for a hungry shift.",
    prepMin: 20,
    cookMin: 45,
    macros: { calories: 820, protein_g: 54, carbs_g: 62, fat_g: 30 },
    plate: {
      display_title: "BBQ Chicken Mac and Cheese — Hall Comfort Tray",
      main: [{ name: "BBQ chicken mac bake", amount: "hotel pan (8 servings)", role: "main" }],
      sides: [{ name: "Garlic bread", amount: "2 loaves", role: "starch" }],
      optional: [
        { name: "Extra BBQ sauce", amount: "for the line", role: "optional" },
        { name: "Green onions", amount: "garnish", role: "optional" },
      ],
      cuisine_label: "BBQ",
    },
    ingredients: [
      { name: "Chicken thighs", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Dry elbow macaroni", qty: 1.5, unit: "lb", category: "Grains" },
      { name: "Sharp cheddar", qty: 16, unit: "oz", category: "Dairy" },
      { name: "Mozzarella", qty: 8, unit: "oz", category: "Dairy" },
      { name: "BBQ sauce", qty: 1.5, unit: "cups", category: "Pantry" },
      { name: "Whole milk", qty: 4, unit: "cups", category: "Dairy" },
    ],
    steps: [
      { title: "Shred BBQ chicken (medium, 25 min)", heat: "medium", minutes: 25, instructions: "Bake or grill thighs to 165°F; shred and toss with half the BBQ sauce." },
      { title: "Boil mac (rolling boil, 10 min)", heat: "high", minutes: 10, instructions: "Cook pasta al dente; drain well." },
      { title: "Make cheese sauce (medium, 12 min)", heat: "medium", minutes: 12, instructions: "Roux, whisk in milk, melt cheddar and mozzarella until smooth." },
      { title: "Assemble tray (no heat, 8 min)", heat: "none", minutes: 8, instructions: "Fold mac, sauce, and chicken into hotel pan; top with cheese and remaining BBQ." },
      { title: "Bake and serve (375°F, 20 min)", heat: "high", minutes: 20, instructions: "Bake until bubbling and golden; rest 5 min before the line." },
    ],
    whyItFits: "Comfort-tray night — smoky BBQ chicken in creamy mac, one pan feeds the whole hall.",
    cleanupTip: "Soak the mac pot immediately — cheese starch sets fast on stainless.",
    proTips: ["Shred chicken while hot — it mixes into the mac easier.", "Rest the tray before serving so the cheese sets for clean scoops."],
  },
  {
    slug: "steak-sandwiches",
    title: "Steak Sandwiches",
    displayTitle: "Steak Sandwiches — Hall Line Classic",
    emoji: "🥩",
    mealFormat: "sandwich",
    protein: "Beef",
    cuisineLabel: "American",
    tagline: "Grill marks, melted cheese, sandwich line",
    crewLine:
      "Sliced sirloin on toasted buns with garlic fries, Caesar salad, roasted vegetables, and a toppings bar — horseradish aioli, onions, mushrooms, and provolone.",
    prepMin: 25,
    cookMin: 35,
    macros: { calories: 710, protein_g: 46, carbs_g: 48, fat_g: 36 },
    plate: {
      display_title: "Steak Sandwiches — Hall Line Classic",
      main: [{ name: "Sliced steak sandwiches", amount: "18 sandwiches", role: "main" }],
      sides: [
        { name: "Garlic fries", amount: "4 lb", role: "starch" },
        { name: "Caesar salad", amount: "2 large bowls", role: "veg" },
        { name: "Roasted vegetables", amount: "2 sheet pans", role: "veg" },
      ],
      optional: [
        { name: "Onion rings", amount: "1 tray", role: "optional" },
        { name: "Horseradish aioli", amount: "for the line", role: "optional" },
        { name: "Sautéed onions & mushrooms", amount: "2 pans", role: "optional" },
        { name: "Melted provolone", amount: "18 slices", role: "optional" },
      ],
      cuisine_label: "American",
    },
    ingredients: [
      { name: "Sirloin or flank steak", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Sub rolls / ciabatta", qty: 18, unit: "", category: "Bakery" },
      { name: "Butter", qty: 1, unit: "lb", category: "Dairy" },
      { name: "Garlic", qty: 8, unit: "cloves", category: "Produce" },
      { name: "Frozen steak fries", qty: 4, unit: "lb", category: "Frozen" },
      { name: "Romaine hearts", qty: 4, unit: "bags", category: "Produce" },
      { name: "Caesar dressing", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Croutons", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Parmesan", qty: 1, unit: "cup", category: "Dairy" },
      { name: "Bell peppers & zucchini", qty: 6, unit: "lb", category: "Produce" },
      { name: "Olive oil", qty: 0.5, unit: "cup", category: "Pantry" },
      { name: "Yellow onions", qty: 4, unit: "", category: "Produce" },
      { name: "Mushrooms", qty: 2, unit: "lb", category: "Produce" },
      { name: "Provolone cheese", qty: 18, unit: "slices", category: "Dairy" },
      { name: "Horseradish", qty: 0.5, unit: "cup", category: "Pantry" },
      { name: "Mayonnaise", qty: 2, unit: "cups", category: "Pantry" },
      { name: "Frozen onion rings", qty: 2, unit: "bags", category: "Frozen" },
    ],
    steps: [
      {
        title: "Season & rest steak (no heat, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Pat steaks dry; salt and pepper generously. Let sit at room temp while ovens and grill heat.",
      },
      {
        title: "Roast vegetables (425°F, 22 min)",
        heat: "high",
        minutes: 22,
        instructions:
          "Toss peppers and zucchini with oil, salt, and garlic. Spread on sheet pans; roast until charred edges and tender.",
      },
      {
        title: "Grill steak (high, 12 min)",
        heat: "high",
        minutes: 12,
        instructions:
          "Grill sirloin or flank to medium-rare/medium (130–140°F). Rest 8 minutes, then slice thin against the grain.",
      },
      {
        title: "Garlic fries & onion rings (425°F, 20 min)",
        heat: "high",
        minutes: 20,
        instructions:
          "Bake fries until crisp; toss hot fries with butter and minced garlic. Bake onion rings on a second rack if serving.",
      },
      {
        title: "Sauté onions & mushrooms (medium-high, 10 min)",
        heat: "medium",
        minutes: 10,
        instructions: "Cook sliced onions until golden; add mushrooms until browned. Hold warm for the toppings bar.",
      },
      {
        title: "Build Caesar & aioli (no heat, 10 min)",
        heat: "none",
        minutes: 10,
        instructions:
          "Toss romaine with dressing, croutons, and parmesan. Mix horseradish into mayo for aioli; keep cold.",
      },
      {
        title: "Toast buns & run sandwich line (serve)",
        heat: "medium",
        minutes: 12,
        instructions:
          "Split and toast rolls. Layer steak, optional provolone melt, onions, mushrooms, and aioli. Fries, Caesar, and veg on the counter.",
      },
    ],
    whyItFits:
      "Steak sandwich night is a hall classic — hot protein, real buns, crispy sides, and a build-your-own line. Not deli slices on cold bread.",
    cleanupTip: "Deglaze the steak pan or grill tray while still warm — comes clean faster after service.",
    proTips: [
      "Slice steak thin after the rest — crew eats better and portions stretch.",
      "Toast buns hard enough to hold juice without falling apart.",
      "Keep Caesar and aioli on ice until the line opens.",
    ],
  },
];

export const CURATED_HALL_PACKAGES: CuratedPackageDef[] =
  CURATED_HALL_PACKAGES_RAW.map(enrichCuratedPackage);

validateAllClassicMeals("curated-packages");

const SLUG_MAP = new Map(CURATED_HALL_PACKAGES.map((p) => [p.slug, p]));

export function getCuratedPackageDef(slug: string): CuratedPackageDef | undefined {
  return SLUG_MAP.get(slug.toLowerCase().trim());
}

export function getCuratedPackageBySpoonacularId(
  spoonacularId: number,
): CuratedPackageDef | undefined {
  return CURATED_HALL_PACKAGES.find((p) => p.spoonacularRecipeId === spoonacularId);
}

export function getAllCuratedSlugs(): string[] {
  return CURATED_HALL_PACKAGES.map((p) => p.slug);
}

const TITLE_MATCHERS: { pattern: RegExp; slug: string }[] = [
  { pattern: /chicken\s*parm/i, slug: "chicken-parm" },
  { pattern: /chimichurri|steak\s*taco|skirt\s*steak\s*taco|flank\s*steak\s*taco/i, slug: "steak-tacos" },
  { pattern: /pulled\s*pork/i, slug: "pulled-pork" },
  { pattern: /double\s*smash|dirty\s*sauce|smash\s*burger/i, slug: "smash-burgers" },
  { pattern: /chili/i, slug: "big-chili" },
  { pattern: /caesar/i, slug: "chicken-caesar" },
  { pattern: /jerk/i, slug: "jerk-chicken" },
  { pattern: /steak\s*sandwich/i, slug: "steak-sandwiches" },
  { pattern: /french\s*dip|beef\s*dip/i, slug: "beef-dip" },
  { pattern: /bbq\s*chicken\s*mac|mac\s*and\s*cheese.*bbq|bbq.*mac/i, slug: "bbq-chicken-mac-and-cheese" },
  { pattern: /bbq\s*chicken/i, slug: "bbq-chicken-mac-and-cheese" },
];

export function resolveCuratedSlugFromTitle(title: string): string | undefined {
  const t = title.trim();
  for (const { pattern, slug } of TITLE_MATCHERS) {
    if (pattern.test(t)) return slug;
  }
  return undefined;
}
