import type {
  ClientRecipeResponse,
  ClientIngredient,
  ClientStep,
  MealPlate,
} from "./schema";

export interface CuratedPackageDef {
  slug: string;
  title: string;
  displayTitle: string;
  emoji: string;
  heroImage: string;
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
  const ingredients: ClientIngredient[] = def.ingredients.map((ing) => ({
    name: ing.name,
    qty: scaleQty(ing.qty, crewSize),
    unit: ing.unit,
    category: ing.category,
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
    tags: [def.cuisineLabel, "Hall classic", "Curated package"],
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

/** All wheel / hall curated dinner packages */
export const CURATED_HALL_PACKAGES: CuratedPackageDef[] = [
  {
    slug: "chicken-parm",
    title: "Chicken Parm",
    displayTitle: "Chicken Parm Night — Italian Hall Spread",
    emoji: "🍝",
    heroImage: "https://img.spoonacular.com/recipes/716429-556x370.jpg",
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
    slug: "taco-night",
    title: "Taco Night",
    displayTitle: "Taco Night — Build-Your-Own Hall Line",
    emoji: "🌮",
    heroImage: "https://img.spoonacular.com/recipes/716426-556x370.jpg",
    tagline: "Build-your-own crew favorite",
    crewLine: "Seasoned beef, warm tortillas, and all the fixings on the counter.",
    mealFormat: "tacos",
    protein: "Beef",
    cuisineLabel: "Mexican",
    prepMin: 20,
    cookMin: 25,
    macros: { calories: 580, protein_g: 36, carbs_g: 45, fat_g: 28 },
    plate: {
      display_title: "Taco Night — Build-Your-Own Hall Line",
      main: [{ name: "Seasoned ground beef", amount: "4 lb", role: "main" }],
      sides: [
        { name: "Flour & corn tortillas", amount: "60 count", role: "starch" },
        { name: "Shredded lettuce & pico", amount: "2 trays", role: "veg" },
        { name: "Mexican rice", amount: "6 cups cooked", role: "starch" },
      ],
      optional: [
        { name: "Shredded cheese", amount: "2 lb", role: "optional" },
        { name: "Sour cream & salsa", amount: "for the line", role: "optional" },
      ],
      cuisine_label: "Mexican",
    },
    ingredients: [
      { name: "Ground beef", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Taco seasoning", qty: 4, unit: "packets", category: "Pantry" },
      { name: "Flour tortillas", qty: 36, unit: "", category: "Bakery" },
      { name: "Corn tortillas", qty: 36, unit: "", category: "Bakery" },
      { name: "Long-grain rice", qty: 3, unit: "cups", category: "Grains" },
      { name: "Shredded lettuce", qty: 2, unit: "bags", category: "Produce" },
      { name: "Tomatoes", qty: 6, unit: "", category: "Produce" },
      { name: "Onions", qty: 4, unit: "", category: "Produce" },
      { name: "Shredded cheddar", qty: 2, unit: "lb", category: "Dairy" },
      { name: "Sour cream", qty: 2, unit: "cups", category: "Dairy" },
      { name: "Salsa", qty: 2, unit: "jars", category: "Pantry" },
      { name: "Lime", qty: 8, unit: "", category: "Produce" },
    ],
    steps: [
      { title: "Cook Mexican rice (simmer, 18 min)", heat: "medium", minutes: 18, instructions: "Simmer rice with tomato, onion, and seasoning until fluffy." },
      { title: "Brown the beef (medium-high, 12 min)", heat: "high", minutes: 12, instructions: "Brown ground beef, drain fat, add taco seasoning and splash of water." },
      { title: "Warm tortillas (dry skillet, 5 min)", heat: "medium", minutes: 5, instructions: "Heat stacks in dry skillet or wrapped in foil in oven." },
      { title: "Prep topping bar (no heat, 15 min)", heat: "none", minutes: 15, instructions: "Dice pico, shred lettuce, set cheese, salsa, sour cream, and lime wedges." },
      { title: "Open the line (serve)", heat: "none", minutes: 5, instructions: "Crew builds tacos — beef, rice, and toppings to taste." },
    ],
    whyItFits: "The full taco line — protein, tortillas, rice, and toppings — not just seasoned meat alone.",
    cleanupTip: "Line trash cans at the end of the counter — taco night creates wrappers fast.",
    proTips: ["Keep beef on low steam table so it stays moist.", "Offer both corn and flour — crew preference splits every time."],
  },
  {
    slug: "pulled-pork",
    title: "Pulled Pork Sandwiches",
    displayTitle: "Pulled Pork Sandwiches — BBQ Hall Line",
    emoji: "🥪",
    heroImage: "https://img.spoonacular.com/recipes/664678-556x370.jpg",
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
    title: "Smash Burgers",
    displayTitle: "Smash Burgers & Fries — Griddle Night",
    emoji: "🍔",
    heroImage: "https://img.spoonacular.com/recipes/715421-556x370.jpg",
    mealFormat: "burger",
    protein: "Beef",
    cuisineLabel: "American",
    tagline: "Griddle night energy",
    crewLine: "Crispy-edged patties, melty cheese, fries, and all the fixings.",
    prepMin: 20,
    cookMin: 30,
    macros: { calories: 720, protein_g: 40, carbs_g: 48, fat_g: 38 },
    plate: {
      display_title: "Smash Burgers & Fries — Griddle Night",
      main: [{ name: "Smash burgers", amount: "12 patties", role: "main" }],
      sides: [
        { name: "Steak fries", amount: "4 lb", role: "starch" },
        { name: "Fixings bar", amount: "lettuce, tomato, onion", role: "veg" },
      ],
      optional: [{ name: "American cheese slices", amount: "12 slices", role: "optional" }],
      cuisine_label: "American",
    },
    ingredients: [
      { name: "Ground beef (80/20)", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Burger buns", qty: 12, unit: "", category: "Bakery" },
      { name: "American cheese", qty: 12, unit: "slices", category: "Dairy" },
      { name: "Frozen steak fries", qty: 4, unit: "lb", category: "Frozen" },
      { name: "Lettuce", qty: 2, unit: "heads", category: "Produce" },
      { name: "Tomatoes", qty: 6, unit: "", category: "Produce" },
      { name: "Onions", qty: 3, unit: "", category: "Produce" },
      { name: "Pickles", qty: 1, unit: "jar", category: "Pantry" },
      { name: "Ketchup & mustard", qty: 1, unit: "set", category: "Pantry" },
    ],
    steps: [
      { title: "Bake fries (425°F, 22 min)", heat: "high", minutes: 22, instructions: "Spread fries on sheets; season and bake until crisp." },
      { title: "Smash patties (high, 3 min each batch)", heat: "high", minutes: 18, instructions: "Ball, smash on hot griddle, season, flip, add cheese to melt." },
      { title: "Toast buns (griddle, 2 min)", heat: "medium", minutes: 2, instructions: "Butter cut sides and toast until golden." },
      { title: "Set fixings bar (no heat, 10 min)", heat: "none", minutes: 10, instructions: "Slice tomatoes and onions; wash lettuce; set condiments." },
      { title: "Serve burger line (serve)", heat: "none", minutes: 5, instructions: "Fries in bowls, burgers from the line, crew builds their own." },
    ],
    whyItFits: "Burgers plus fries and a fixings bar — the complete griddle-night package.",
    cleanupTip: "Deglaze the griddle while warm — scrape beats soaking overnight.",
    proTips: ["Work in small batches so the griddle stays screaming hot.", "Season fries right out of the oven."],
  },
  {
    slug: "chili-garlic-bread",
    title: "Chili & Garlic Bread",
    displayTitle: "Chili & Garlic Bread — One-Pot Hall Night",
    emoji: "🌶️",
    heroImage: "https://img.spoonacular.com/recipes/660405-556x370.jpg",
    mealFormat: "soup_chili",
    protein: "Beef",
    cuisineLabel: "Comfort",
    tagline: "Stick-to-your-ribs hall fuel",
    crewLine: "Big pot of chili, garlic bread, and shredded cheese for the table.",
    prepMin: 15,
    cookMin: 45,
    macros: { calories: 540, protein_g: 32, carbs_g: 46, fat_g: 24 },
    plate: {
      display_title: "Chili & Garlic Bread — One-Pot Hall Night",
      main: [{ name: "Firehall beef chili", amount: "2 stock pots", role: "main" }],
      sides: [
        { name: "Garlic bread", amount: "4 loaves", role: "starch" },
        { name: "Shredded cheese & onions", amount: "topping bar", role: "optional" },
      ],
      optional: [{ name: "Sour cream", amount: "for topping", role: "optional" }],
      cuisine_label: "Comfort",
    },
    ingredients: [
      { name: "Ground beef", qty: 4, unit: "lb", category: "Proteins" },
      { name: "Kidney beans", qty: 4, unit: "cans", category: "Pantry" },
      { name: "Diced tomatoes", qty: 4, unit: "cans", category: "Pantry" },
      { name: "Tomato paste", qty: 2, unit: "cans", category: "Pantry" },
      { name: "Chili powder", qty: 4, unit: "tbsp", category: "Pantry" },
      { name: "Onions", qty: 3, unit: "", category: "Produce" },
      { name: "Bell peppers", qty: 4, unit: "", category: "Produce" },
      { name: "Italian bread", qty: 4, unit: "loaves", category: "Bakery" },
      { name: "Garlic butter", qty: 1.5, unit: "cups", category: "Dairy" },
      { name: "Shredded cheddar", qty: 2, unit: "lb", category: "Dairy" },
    ],
    steps: [
      { title: "Brown beef & build chili (simmer, 40 min)", heat: "medium", minutes: 40, instructions: "Brown beef with onion and pepper; add tomatoes, beans, paste, and spices. Simmer until thick." },
      { title: "Bake garlic bread (425°F, 10 min)", heat: "high", minutes: 10, instructions: "Split loaves, garlic butter, bake until golden." },
      { title: "Set topping bar (no heat, 5 min)", heat: "none", minutes: 5, instructions: "Cheese, diced onion, sour cream for the counter." },
      { title: "Ladle for the crew (serve)", heat: "none", minutes: 5, instructions: "Bowls of chili, bread on the side, toppings within reach." },
    ],
    whyItFits: "Chili night means bread and toppings — not a lone pot on the stove.",
    cleanupTip: "Soak the chili pot with hot water while bread trays cool.",
    proTips: ["Simmer uncovered last 10 min to tighten the pot.", "Hold bread covered with foil so it stays soft inside."],
  },
  {
    slug: "chicken-caesar",
    title: "Chicken Caesar Salad",
    displayTitle: "Chicken Caesar — Grilled Protein & Big Salad",
    emoji: "🥗",
    heroImage: "https://img.spoonacular.com/recipes/640803-556x370.jpg",
    mealFormat: "salad",
    protein: "Chicken",
    cuisineLabel: "American",
    tagline: "When the crew wants something lighter",
    crewLine: "Grilled chicken over romaine, parmesan, croutons — garlic bread on the side.",
    prepMin: 20,
    cookMin: 20,
    macros: { calories: 480, protein_g: 42, carbs_g: 22, fat_g: 24 },
    plate: {
      display_title: "Chicken Caesar — Grilled Protein & Big Salad",
      main: [{ name: "Grilled chicken breast", amount: "10 lb", role: "main" }],
      sides: [
        { name: "Caesar salad", amount: "2 deli tubs", role: "veg" },
        { name: "Garlic bread sticks", amount: "2 boxes", role: "starch" },
      ],
      optional: [{ name: "Extra parmesan", amount: "for the table", role: "optional" }],
      cuisine_label: "American",
    },
    ingredients: [
      { name: "Chicken breast", qty: 10, unit: "lb", category: "Proteins" },
      { name: "Romaine hearts", qty: 8, unit: "bags", category: "Produce" },
      { name: "Caesar dressing", qty: 3, unit: "cups", category: "Pantry" },
      { name: "Croutons", qty: 4, unit: "cups", category: "Pantry" },
      { name: "Parmesan", qty: 2, unit: "cups", category: "Dairy" },
      { name: "Garlic bread sticks", qty: 2, unit: "boxes", category: "Frozen" },
    ],
    steps: [
      { title: "Grill chicken (medium-high, 14 min)", heat: "high", minutes: 14, instructions: "Season and grill to 165°F; rest 5 min, slice for the line." },
      { title: "Build Caesar (no heat, 12 min)", heat: "none", minutes: 12, instructions: "Chop romaine, toss with dressing, croutons, and half the parmesan." },
      { title: "Bake bread sticks (425°F, 8 min)", heat: "high", minutes: 8, instructions: "Bake until golden; wrap to hold warmth." },
      { title: "Serve salad line (serve)", heat: "none", minutes: 5, instructions: "Big bowls of salad, sliced chicken on the side, bread at the end." },
    ],
    whyItFits: "A full lighter night — grilled protein, big salad, and bread still on the table.",
    cleanupTip: "Sanitize cutting boards right after chicken — don't wait until after the meal.",
    proTips: ["Slice chicken against the grain for tender bites.", "Dress salad just before the crew hits the line."],
  },
  {
    slug: "jerk-chicken",
    title: "Jerk Chicken",
    displayTitle: "Jerk Chicken — Rice & Island Sides",
    emoji: "🔥",
    heroImage: "https://img.spoonacular.com/recipes/716004-556x370.jpg",
    mealFormat: "grill",
    protein: "Chicken",
    cuisineLabel: "Caribbean",
    tagline: "Fire on the grill",
    crewLine: "Charred jerk thighs, coconut rice, and cooling cucumber salad.",
    prepMin: 25,
    cookMin: 35,
    macros: { calories: 590, protein_g: 40, carbs_g: 44, fat_g: 26 },
    plate: {
      display_title: "Jerk Chicken — Rice & Island Sides",
      main: [{ name: "Jerk chicken thighs", amount: "24 pieces", role: "main" }],
      sides: [
        { name: "Coconut jasmine rice", amount: "6 cups cooked", role: "starch" },
        { name: "Cucumber-lime salad", amount: "2 bowls", role: "veg" },
      ],
      optional: [{ name: "Hot sauce", amount: "for the brave", role: "optional" }],
      cuisine_label: "Caribbean",
    },
    ingredients: [
      { name: "Chicken thighs", qty: 24, unit: "pieces", category: "Proteins" },
      { name: "Jerk seasoning", qty: 1, unit: "cup", category: "Pantry" },
      { name: "Jasmine rice", qty: 3, unit: "cups", category: "Grains" },
      { name: "Coconut milk", qty: 2, unit: "cans", category: "Pantry" },
      { name: "Cucumbers", qty: 6, unit: "", category: "Produce" },
      { name: "Lime", qty: 10, unit: "", category: "Produce" },
    ],
    steps: [
      { title: "Marinate chicken (no heat, 20 min)", heat: "none", minutes: 20, instructions: "Coat thighs in jerk paste; longer if time allows." },
      { title: "Cook coconut rice (simmer, 18 min)", heat: "medium", minutes: 18, instructions: "Simmer rice in coconut milk and water until fluffy." },
      { title: "Grill chicken (medium-high, 20 min)", heat: "high", minutes: 20, instructions: "Grill to 165°F with char marks; hold warm." },
      { title: "Toss cucumber salad (no heat, 8 min)", heat: "none", minutes: 8, instructions: "Slice cucumbers, dress with lime, salt, and a touch of oil." },
      { title: "Plate for the hall (serve)", heat: "none", minutes: 5, instructions: "Rice base, chicken on top, salad on the side." },
    ],
    whyItFits: "Jerk night with rice and a cooling side — not chicken alone on the grill.",
    cleanupTip: "Scrape grill grates while still warm after service.",
    proTips: ["Use thighs — they forgive the grill and stay juicy.", "Keep extra lime at the end of the line."],
  },
  {
    slug: "loaded-nachos",
    title: "Loaded Nachos",
    displayTitle: "Loaded Nachos — Sheet Pan Hall Feast",
    emoji: "🧀",
    heroImage: "https://img.spoonacular.com/recipes/660366-556x370.jpg",
    mealFormat: "loaded_fries",
    protein: "Beef",
    cuisineLabel: "Mexican",
    tagline: "Game-night at the hall",
    crewLine: "Chip layers, seasoned beef, melted cheese, and all the toppings.",
    prepMin: 15,
    cookMin: 25,
    macros: { calories: 650, protein_g: 34, carbs_g: 52, fat_g: 36 },
    plate: {
      display_title: "Loaded Nachos — Sheet Pan Hall Feast",
      main: [{ name: "Loaded nachos", amount: "4 sheet pans", role: "main" }],
      sides: [
        { name: "Guacamole & salsa", amount: "2 bowls each", role: "veg" },
        { name: "Sour cream", amount: "2 cups", role: "optional" },
      ],
      optional: [{ name: "Jalapeños", amount: "sliced", role: "optional" }],
      cuisine_label: "Mexican",
    },
    ingredients: [
      { name: "Tortilla chips", qty: 6, unit: "bags", category: "Pantry" },
      { name: "Ground beef", qty: 3, unit: "lb", category: "Proteins" },
      { name: "Taco seasoning", qty: 3, unit: "packets", category: "Pantry" },
      { name: "Shredded Mexican cheese", qty: 3, unit: "lb", category: "Dairy" },
      { name: "Salsa", qty: 2, unit: "jars", category: "Pantry" },
      { name: "Sour cream", qty: 2, unit: "cups", category: "Dairy" },
      { name: "Guacamole", qty: 3, unit: "cups", category: "Produce" },
      { name: "Jalapeños", qty: 2, unit: "cans", category: "Pantry" },
    ],
    steps: [
      { title: "Brown seasoned beef (medium-high, 10 min)", heat: "high", minutes: 10, instructions: "Brown beef with taco seasoning; hold warm." },
      { title: "Layer & melt nachos (425°F, 12 min)", heat: "high", minutes: 12, instructions: "Chips, beef, cheese on sheet pans; bake until cheese bubbles." },
      { title: "Set topping station (no heat, 8 min)", heat: "none", minutes: 8, instructions: "Salsa, guac, sour cream, jalapeños in bowls." },
      { title: "Serve pans hot (serve)", heat: "none", minutes: 5, instructions: "Put pans on the table — crew digs in family-style." },
    ],
    whyItFits: "Game-night nachos with toppings bar — built for a hungry hall, not a snack.",
    cleanupTip: "Soak sheet pans with hot water — cheese releases faster.",
    proTips: ["Layer cheese between chip layers so it binds.", "Serve straight from the oven — nachos wait for no one."],
  },
  {
    slug: "beef-dip",
    title: "Beef Dip Sandwiches",
    displayTitle: "French Dip — Au Jus Hall Line",
    emoji: "🥖",
    heroImage: "https://img.spoonacular.com/recipes/636602-556x370.jpg",
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
    slug: "bbq-chicken-bowls",
    title: "BBQ Chicken Bowls",
    displayTitle: "BBQ Chicken Bowls — Rice Line",
    emoji: "🍗",
    heroImage: "https://img.spoonacular.com/recipes/715540-556x370.jpg",
    mealFormat: "bowl",
    protein: "Chicken",
    cuisineLabel: "BBQ",
    tagline: "Line up the bowls",
    crewLine: "Sweet BBQ chicken, rice, corn, and slaw in a build-your-own bowl line.",
    prepMin: 20,
    cookMin: 30,
    macros: { calories: 560, protein_g: 38, carbs_g: 52, fat_g: 18 },
    plate: {
      display_title: "BBQ Chicken Bowls — Rice Line",
      main: [{ name: "BBQ grilled chicken", amount: "8 lb", role: "main" }],
      sides: [
        { name: "Steamed rice", amount: "6 cups cooked", role: "starch" },
        { name: "Corn & slaw", amount: "2 sides", role: "veg" },
      ],
      optional: [{ name: "Extra BBQ sauce", amount: "on the line", role: "optional" }],
      cuisine_label: "BBQ",
    },
    ingredients: [
      { name: "Chicken thighs", qty: 8, unit: "lb", category: "Proteins" },
      { name: "BBQ sauce", qty: 3, unit: "cups", category: "Pantry" },
      { name: "Jasmine rice", qty: 3, unit: "cups", category: "Grains" },
      { name: "Corn kernels", qty: 4, unit: "cups", category: "Frozen" },
      { name: "Coleslaw mix", qty: 2, unit: "bags", category: "Produce" },
    ],
    steps: [
      { title: "Cook rice (simmer, 18 min)", heat: "medium", minutes: 18, instructions: "Fluffy rice in the steamer or pot; hold warm." },
      { title: "Grill BBQ chicken (medium-high, 18 min)", heat: "high", minutes: 18, instructions: "Grill thighs, glaze with sauce last 5 min; 165°F internal." },
      { title: "Warm corn (medium, 6 min)", heat: "medium", minutes: 6, instructions: "Butter-season corn; hold on the line." },
      { title: "Toss slaw (no heat, 5 min)", heat: "none", minutes: 5, instructions: "Dress coleslaw; keep cold." },
      { title: "Run bowl line (serve)", heat: "none", minutes: 5, instructions: "Rice, chicken, corn, slaw — crew builds bowls." },
    ],
    whyItFits: "BBQ bowl night with rice and two sides — a complete line, not solo chicken.",
    cleanupTip: "Rinse rice pot immediately — starch sets fast.",
    proTips: ["Glaze sauce at the end so it doesn't burn on the grill.", "Keep slaw on ice under the counter."],
  },
];

const SLUG_MAP = new Map(CURATED_HALL_PACKAGES.map((p) => [p.slug, p]));

export function getCuratedPackageDef(slug: string): CuratedPackageDef | undefined {
  return SLUG_MAP.get(slug.toLowerCase().trim());
}

export function getAllCuratedSlugs(): string[] {
  return CURATED_HALL_PACKAGES.map((p) => p.slug);
}

const TITLE_MATCHERS: { pattern: RegExp; slug: string }[] = [
  { pattern: /chicken\s*parm/i, slug: "chicken-parm" },
  { pattern: /taco/i, slug: "taco-night" },
  { pattern: /pulled\s*pork/i, slug: "pulled-pork" },
  { pattern: /smash\s*burger/i, slug: "smash-burgers" },
  { pattern: /chili/i, slug: "chili-garlic-bread" },
  { pattern: /caesar/i, slug: "chicken-caesar" },
  { pattern: /jerk/i, slug: "jerk-chicken" },
  { pattern: /nacho/i, slug: "loaded-nachos" },
  { pattern: /french\s*dip|beef\s*dip/i, slug: "beef-dip" },
  { pattern: /bbq\s*chicken|chicken\s*bowl/i, slug: "bbq-chicken-bowls" },
];

export function resolveCuratedSlugFromTitle(title: string): string | undefined {
  const t = title.trim();
  for (const { pattern, slug } of TITLE_MATCHERS) {
    if (pattern.test(t)) return slug;
  }
  return undefined;
}
