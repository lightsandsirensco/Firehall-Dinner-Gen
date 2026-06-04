import type { BreakfastRecipePageDraft } from "./new-breakfast-pages.js";

const now = new Date().toISOString();
const hero = (slug: string) => `/images/breakfast/${slug}.jpg`;
const thumb = (slug: string) => `/images/thumbs/breakfast/${slug}.jpg`;

/** Tier 1 inspiration URLs (structure only — instructions are Firehall-original). */
export const BATCH_A_BREAKFAST_SOURCE_URLS: Record<string, string> = {
  "shakshuka-for-the-hall": "https://www.americastestkitchen.com/recipes/12003-shakshuka",
  "menemen-for-the-crew": "https://www.seriouseats.com/menemen-turkish-style-scrambled-eggs-tomatoes-chilies-recipe",
  "baked-oatmeal-mixed-berries": "https://www.americastestkitchen.com/recipes/15707-blueberry-baked-oatmeal",
};

export const BATCH_A_BREAKFAST_PAGES: BreakfastRecipePageDraft[] = [
  {
    slug: "shakshuka-for-the-hall",
    title: "Shakshuka for the Hall",
    subtitle: "Eggs poached in a spiced tomato-pepper skillet for the whole crew.",
    description:
      "A one-pan hall breakfast: onions and peppers simmer in a thick tomato sauce, then eggs poach right in the skillet so every firefighter gets runny yolks and warm sauce for bread. Sauce can be made ahead and reheated before the eggs go in.",
    filters: ["feed_a_crew", "skillets", "high_protein"],
    tags: ["shakshuka", "eggs", "skillet", "tomato", "one-pan"],
    crewSize: 8,
    baseServings: 8,
    prepTime: 20,
    cookTime: 35,
    totalTime: 55,
    difficulty: "medium",
    ingredients: [
      { group: "Sauce", quantity: "3", name: "yellow onions", notes: "sliced pole to pole" },
      { group: "Sauce", quantity: "3", name: "bell peppers", notes: "red or mixed, sliced" },
      { group: "Sauce", quantity: "6", name: "garlic cloves", notes: "minced" },
      { group: "Sauce", quantity: "2", name: "cans crushed tomatoes", notes: "28 oz" },
      { group: "Sauce", quantity: "1", name: "can diced tomatoes", notes: "14.5 oz with juice" },
      { group: "Sauce", quantity: "2", name: "roasted red peppers", notes: "jarred, chopped, or 2 fresh charred" },
      { group: "Seasoning", quantity: "2", name: "tbsp tomato paste" },
      { group: "Seasoning", quantity: "2", name: "tsp ground cumin" },
      { group: "Seasoning", quantity: "1", name: "tsp smoked paprika" },
      { group: "Seasoning", quantity: "0.5", name: "tsp cayenne", notes: "optional" },
      { group: "Protein", quantity: "16", name: "large eggs" },
      { group: "Finish", quantity: "1.5", name: "cups crumbled feta" },
      { group: "Finish", quantity: "1", name: "bunch fresh cilantro", notes: "plus crusty bread for the line" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Build the tomato base",
        minutes: 20,
        instruction:
          "Heat olive oil in a 12-inch skillet (use two skillets for 14) over medium-high. Cook onions and peppers with salt until softened and starting to brown, 8–10 minutes. Stir in garlic, tomato paste, cumin, paprika, and cayenne; cook until paste darkens slightly, about 3 minutes.",
      },
      {
        stepNumber: 2,
        title: "Simmer the sauce",
        minutes: 15,
        instruction:
          "Add crushed and diced tomatoes and chopped roasted peppers. Simmer over medium-low, stirring occasionally, until thick enough that a spoon leaves a trail, 12–15 minutes. Taste and adjust salt — the sauce should be bold before eggs go in.",
      },
      {
        stepNumber: 3,
        title: "Make wells and add eggs",
        minutes: 10,
        instruction:
          "Off heat, make shallow wells in the sauce with the back of a spoon — two eggs per well for eight firefighters. Crack eggs into wells, season with salt and pepper, cover, and return to medium-low heat.",
      },
      {
        stepNumber: 4,
        title: "Poach covered",
        minutes: 8,
        instruction:
          "Cook covered until whites are set and yolks are still runny (or jammy if your crew prefers), 5–10 minutes. Peek once — overcooked yolks cannot be fixed. If whites are slow, spoon hot sauce over them before covering again.",
      },
      {
        stepNumber: 5,
        title: "Plate with feta and bread at the line",
        minutes: 5,
        instruction:
          "Scatter feta and cilantro over the top. Serve straight from the skillet with warm bread for dipping. Hold covered off heat up to 10 minutes; do not reheat aggressively or yolks will set hard.",
      },
    ],
    stationWorkflow: [
      "Simmer sauce on the back burner while a second cook manages eggs on the line — sauce holds 30 minutes covered on low.",
      "For 14 firefighters, split across two 12-inch skillets with 7 eggs each so poaching stays even.",
      "Keep bread in a warm oven (200°F) so the crew has something to drag through the sauce immediately.",
    ],
    cleanupNotes: [
      "Soak the skillet as soon as service ends — tomato sugars glue to dry pans fast.",
      "Wipe any egg overflow while warm; cold egg protein scrapes harder.",
    ],
    leftovers: [
      "Sauce without eggs reheats well — poach fresh eggs tomorrow for a fast second breakfast.",
      "Leftover sauce over rice or pasta makes a solid shift lunch.",
    ],
    heroImage: hero("shakshuka-for-the-hall"),
    thumbImage: thumb("shakshuka-for-the-hall"),
    imageAlt: "Shakshuka with poached eggs in spiced tomato sauce in a cast-iron skillet",
    publishedAt: now,
    updatedAt: now,
    readMinutes: 8,
    seoTitle: "Shakshuka for the Hall | Firehall Breakfast",
  },
  {
    slug: "menemen-for-the-crew",
    title: "Menemen for the Crew",
    subtitle: "Turkish-style soft scrambled eggs with tomatoes, peppers, and olive oil.",
    description:
      "Soft-scrambled eggs folded into a slow-cooked tomato-pepper base with plenty of olive oil — a skillet breakfast that scales cleanly and tastes great with warm pita or bread from the oven.",
    filters: ["feed_a_crew", "skillets", "quick_breakfasts"],
    tags: ["menemen", "turkish", "eggs", "skillet", "tomato"],
    crewSize: 8,
    baseServings: 8,
    prepTime: 15,
    cookTime: 25,
    totalTime: 40,
    difficulty: "easy",
    ingredients: [
      { group: "Base", quantity: "0.75", name: "cup extra-virgin olive oil", notes: "quality oil matters here" },
      { group: "Base", quantity: "2", name: "yellow onions", notes: "finely diced" },
      { group: "Base", quantity: "4", name: "long green peppers", notes: "shishito, poblano, or bell, diced" },
      { group: "Base", quantity: "2", name: "cups chopped tomatoes", notes: "ripe fresh or drained canned" },
      { group: "Seasoning", quantity: "1", name: "tsp hot paprika" },
      { group: "Seasoning", quantity: "0.5", name: "tsp dried oregano", notes: "optional" },
      { group: "Protein", quantity: "16", name: "large eggs", notes: "beaten lightly with salt" },
      { group: "Finish", quantity: "0.25", name: "cup chopped chives or parsley" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Slow-cook peppers and onion",
        minutes: 10,
        instruction:
          "Heat olive oil in a large nonstick or cast-iron skillet over low until barely warm. Add paprika, oregano, onion, and peppers with a generous pinch of salt and pepper. Cook, stirring often, until very soft and sweet, about 8 minutes — do not rush this step.",
      },
      {
        stepNumber: 2,
        title: "Cook tomatoes down",
        minutes: 8,
        instruction:
          "Add tomatoes and cook, stirring, until the mixture deepens in color and excess liquid cooks off, about 6–8 minutes. Reserve half the mixture in a bowl — you will fold it back in after the eggs.",
      },
      {
        stepNumber: 3,
        title: "Scramble eggs softly",
        minutes: 6,
        instruction:
          "Pour beaten eggs into the skillet. Season lightly. Cook over medium-low, stirring gently and constantly, until eggs are just set but still glossy and soft — they should look like thick ribbons, not dry curds.",
      },
      {
        stepNumber: 4,
        title: "Fold and serve",
        minutes: 3,
        instruction:
          "Remove from heat immediately and fold in the reserved pepper-tomato mixture. Garnish with chives. Serve at once with warm pita — menemen does not hold well on a steam table.",
      },
    ],
    stationWorkflow: [
      "Low heat is the secret — assign the most patient cook to the skillet, not the fastest.",
      "Beat all eggs in one pitcher so you can pour in one motion when the base is ready.",
      "Toast pita in the oven while the base cooks so bread lands hot when eggs finish.",
    ],
    cleanupNotes: [
      "Wipe olive oil pans with paper towels before soap — it cuts grease time in half.",
      "Do not soak nonstick with cold water while hot; let pans cool 2 minutes first.",
    ],
    leftovers: [
      "Not ideal reheated — if you must, warm gently with a splash of oil and fresh eggs beaten in.",
      "The pepper-tomato base alone wraps well into breakfast burritos for the next shift.",
    ],
    heroImage: hero("menemen-for-the-crew"),
    thumbImage: thumb("menemen-for-the-crew"),
    imageAlt: "Soft Turkish menemen scrambled eggs with tomatoes and peppers in a skillet",
    publishedAt: now,
    updatedAt: now,
    readMinutes: 7,
    seoTitle: "Menemen for the Crew | Firehall Breakfast",
  },
  {
    slug: "baked-oatmeal-mixed-berries",
    title: "Baked Oatmeal with Mixed Berries",
    subtitle: "Make-ahead baked oatmeal squares with berries for staggered eaters.",
    description:
      "A 9x13 baked oatmeal that feeds the hall from one pan — quick oats baked with milk, eggs, and cinnamon, studded with mixed berries. Bake the night before or early shift; reheat portions in the microwave between calls.",
    filters: ["feed_a_crew", "healthy_breakfasts", "quick_breakfasts"],
    tags: ["oatmeal", "baked", "berries", "make-ahead", "9x13"],
    crewSize: 8,
    baseServings: 8,
    prepTime: 15,
    cookTime: 45,
    totalTime: 60,
    difficulty: "easy",
    ingredients: [
      { group: "Bake", quantity: "4", name: "cups quick oats", notes: "not steel-cut" },
      { group: "Bake", quantity: "0.75", name: "cup brown sugar", notes: "light or dark" },
      { group: "Bake", quantity: "2", name: "tsp baking powder" },
      { group: "Bake", quantity: "1.5", name: "tsp cinnamon" },
      { group: "Bake", quantity: "0.5", name: "tsp kosher salt" },
      { group: "Wet", quantity: "3", name: "cups whole milk" },
      { group: "Wet", quantity: "2", name: "large eggs" },
      { group: "Wet", quantity: "0.25", name: "cup melted butter", notes: "plus spray for the dish" },
      { group: "Fruit", quantity: "3", name: "cups mixed berries", notes: "fresh or frozen, thawed and drained" },
      { group: "Line", quantity: "1", name: "cup maple syrup", notes: "for serving" },
      { group: "Line", quantity: "2", name: "cups Greek yogurt", notes: "optional at the line" },
    ],
    steps: [
      {
        stepNumber: 1,
        title: "Heat oven and prep the dish",
        tempF: 350,
        minutes: 5,
        instruction:
          "Heat oven to 350°F. Spray a 9x13 baking dish with oil. For 10 or 14 firefighters, use two dishes and split the batter evenly rather than one overflowing pan.",
      },
      {
        stepNumber: 2,
        title: "Mix dry and wet",
        minutes: 8,
        instruction:
          "Whisk oats, brown sugar, baking powder, cinnamon, and salt in a large bowl. In another bowl, whisk milk, eggs, and melted butter until smooth. Pour wet into dry and stir until no dry pockets remain.",
      },
      {
        stepNumber: 3,
        title: "Fold in berries and bake",
        tempF: 350,
        minutes: 45,
        instruction:
          "Gently fold in berries. Spread level in the dish. Bake 40–45 minutes until the center is set, edges are golden, and a knife in the center comes out clean. Cool 10 minutes before cutting — hot oatmeal squares fall apart if rushed.",
      },
      {
        stepNumber: 4,
        title: "Portion and hold",
        minutes: 10,
        instruction:
          "Cut into squares — one generous square per firefighter at base 8. Hold covered at room temp up to 2 hours or refrigerate overnight. Reheat squares 1–2 minutes in the microwave until warm through; pass maple syrup and yogurt at the line.",
      },
    ],
    stationWorkflow: [
      "Bake before the crew arrives so breakfast is grab-and-go between apparatus checks.",
      "Label the pan with bake time — overnight oats cement to the dish if you skip soaking later.",
      "Set out a sheet pan of warm squares and let firefighters top their own — faster than plating every bowl.",
    ],
    cleanupNotes: [
      "Soak the baking dish in warm water immediately after cutting — baked oatmeal glue is easier hot.",
      "Wipe berry stains on counters before they set; sugar syrup gets tacky fast.",
    ],
    leftovers: [
      "Squares keep 4 days refrigerated; reheat covered with a splash of milk to restore moisture.",
      "Crumble cold leftovers into a parfait with yogurt and granola for a fast second breakfast.",
    ],
    heroImage: hero("baked-oatmeal-mixed-berries"),
    thumbImage: thumb("baked-oatmeal-mixed-berries"),
    imageAlt: "Golden baked oatmeal squares with mixed berries in a 9x13 pan",
    publishedAt: now,
    updatedAt: now,
    readMinutes: 7,
    seoTitle: "Baked Oatmeal with Mixed Berries | Firehall Breakfast",
  },
];
