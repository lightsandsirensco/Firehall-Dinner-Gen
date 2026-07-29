/**
 * Batch B — hall lunch sandwiches (Tier 1 ATK–inspired, Firehall-original copy).
 */
import type { ExpansionRecipeDef } from "../types.js";
import { def, ing, step } from "../recipe-build.js";

export const BATCH_B_SANDWICH_SOURCE_URLS: Record<string, string> = {
  "classic-patty-melt-for-the-crew":
    "https://www.americastestkitchen.com/recipes/14928-diner-style-patty-melts",
  "best-tuna-melt-for-the-hall":
    "https://www.americastestkitchen.com/recipes/16853-diner-style-sheet-pan-tuna-melts",
  "hall-blt-sandwich-feed": "https://www.americastestkitchen.com/recipes/8985-ultimate-blt-sandwich",
};

export const BATCH_B_SANDWICH_RECIPES: ExpansionRecipeDef[] = [
  def({
    slug: "classic-patty-melt-for-the-crew",
    title: "Classic Patty Melt for the Crew",
    subtitle: "Griddled beef patties with caramelized onions and Swiss on rye",
    category: "crew_feeders",
    protein: "beef",
    cuisine: "american",
    mealFormat: "sandwich",
    explorePools: ["handheld", "comfort", "beef", "hall_expansion"],
    hookLine: "Diner-style patty melts scaled for the whole shift — rye, Swiss, and onions you can smell down the hall",
    description:
      "Thin beef patties and a big batch of sweet caramelized onions hit the griddle, then stack onto marbled rye with Swiss cheese and butter for a second press until the cheese oozes and the bread crisps. Built in waves so eight to fourteen firefighters eat hot sandwiches, not steamy ones.",
    whyCrewsLikeIt:
      "Patty melts scratch the burger craving but eat easier on the line — no tall stack falling apart. Rye and Swiss read as classic diner food, and the onion batch can start while the crew is still on apparatus check.",
    mealPrepNotes:
      "Slice onions and shape patties up to 4 hours ahead; refrigerate patties between parchment. Caramelize onions in a Dutch oven earlier in the shift and reheat on the griddle before assembly. Keep melted sandwiches in a 200°F oven up to 20 minutes on a rack, not stacked.",
    stationWorkflow: [
      "Run two cast-iron griddles or flat tops for 14 — one for patties, one for sandwich presses.",
      "Butter the outside of every rye slice so the press gives golden crust, not pale steamed bread.",
      "Cut sandwiches on the diagonal and hold on sheet pans in a warm oven with foil tented loosely, not sealed.",
    ],
    prepMinutes: 25,
    cookMinutes: 35,
    difficulty: "medium",
    crewSizeDefault: 8,
    ingredients: [
      ing("ground beef (80/20)", "3", { unit: "lb", group: "Patties" }),
      ing("yellow onions", "3", { unit: "lb", notes: "halved and sliced ¼ inch", group: "Onions" }),
      ing("marbled rye bread", "24", { unit: "slices", notes: "about 2 loaves", group: "Bread" }),
      ing("Swiss cheese", "24", { unit: "slices", notes: "about 1½ lb", group: "Cheese" }),
      ing("unsalted butter", "0.75", { unit: "cup", notes: "softened for spreading", group: "Press" }),
      ing("vegetable oil", "3", { unit: "tbsp", group: "Griddle" }),
      ing("Worcestershire sauce", "2", { unit: "tbsp", group: "Patties" }),
      ing("kosher salt and black pepper", "1", { unit: "batch", group: "Seasoning" }),
      ing("dill pickle chips", "2", { unit: "cups", notes: "optional at the line", group: "Sides" }),
    ],
    steps: [
      step(
        1,
        "Caramelize onions for the whole batch",
        "Heat 2 tablespoons oil in a large skillet over medium-low. Add onions with a pinch of salt and cook, stirring every few minutes, until deep golden and jammy, 35–45 minutes. Hold warm in a covered pan — these go on every sandwich.",
        { minutes: 40, heatLevel: "low" },
      ),
      step(
        2,
        "Shape and season thin patties",
        "Divide beef into 12 equal portions for base 8 (18 for 14). Gently press each into a thin 4-inch oval about ¼ inch thick — thicker patties will not melt into the sandwich. Season with salt, pepper, and a few drops of Worcestershire per patty.",
        { minutes: 12 },
      ),
      step(
        3,
        "Griddle patties in batches",
        "Heat griddle over medium-high with a thin film of oil. Cook patties in batches without crowding until well browned and 160°F in the center, about 2 minutes per side. Transfer to a sheet pan and tent — wipe griddle between batches if needed.",
        { minutes: 15, heatLevel: "medium-high" },
      ),
      step(
        4,
        "Build on rye with Swiss and onions",
        "Butter one side of each rye slice. Lay unbuttered sides up, top with Swiss, patty, and a spoon of caramelized onions. Close with second slice, buttered side out. For 14, run two assembly lines so presses do not backlog.",
        { minutes: 10 },
      ),
      step(
        5,
        "Press until cheese melts and serve",
        "Griddle sandwiches over medium until bread is crisp and cheese melts, 3–4 minutes per side, pressing with spatulas. Cut diagonal, hold on a rack in a 200°F oven up to 20 minutes. Serve with pickles. Re-crisp 30 seconds per side on the griddle if a call delays seating.",
        { minutes: 12, heatLevel: "medium" },
      ),
    ],
    proTips: [
      "Swiss melts smoother than cheddar here — save cheddar for other sandwiches.",
      "If rye is thin, double-stack only the press side butter — too much butter leaks and smokes.",
      "Mark one griddle zone lower heat for holding finished melts without burning crust.",
    ],
    tonightSpread: [
      "Patty melts with dill pickles and kettle chips.",
      "Thin dill pickle spear and a simple iceberg salad with ranch for crunch.",
    ],
    leftovers: [
      "Chop cold patties and onions into a grilled cheese for next-day lunch.",
      "Crumble patties over a sheet-pan cheese fries bake.",
    ],
    equipment: ["Cast-iron griddle or flat top", "Spatulas", "Sheet pans", "Instant-read thermometer", "Warm holding oven"],
    nutrition: { calories: 620, protein: 34, carbs: 42, fats: 36, fiber: 4 },
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
    searchTerms: ["patty melt firehall", "diner patty melt crew", "rye swiss patty melt"],
    sourceUrl: BATCH_B_SANDWICH_SOURCE_URLS["classic-patty-melt-for-the-crew"],
  }),

  def({
    slug: "best-tuna-melt-for-the-hall",
    title: "Best Tuna Melt for the Hall (Diner Style)",
    subtitle: "Open-faced tuna melts on rye with cheddar — sheet-pan batch for the crew",
    category: "crew_feeders",
    protein: "seafood",
    cuisine: "american",
    mealFormat: "sandwich",
    explorePools: ["handheld", "comfort", "seafood", "hall_expansion"],
    hookLine: "Broiler-batch tuna melts that stay open-faced so cheese bubbles across the whole hall at once",
    description:
      "Well-drained tuna folds into a seasoned salad, spreads onto buttered rye, and tops with sharp cheddar for a sheet-pan broil until every melt bubbles. Open-faced means faster batch cooking and an obvious tuna-melt identity — no mystery hot sandwiches.",
    whyCrewsLikeIt:
      "Tuna melts are cheap, fast, and familiar — perfect when the crew wants comfort without firing up the smoker. Sheet-pan broiling beats one-at-a-time skillets when ten people walk in together after a call.",
    mealPrepNotes:
      "Mix tuna salad up to 6 hours ahead; cover and refrigerate. Butter rye and portion salad onto trays just before broiling so bread does not sog. Hold finished melts in a warm oven 200°F up to 15 minutes — cheese sets but reheats fine under broiler 1 minute.",
    stationWorkflow: [
      "Drain tuna aggressively — watery salad steams the bread before cheese melts.",
      "Line sheet pans with parchment for easy release of melty cheese.",
      "Run broiler in waves for 14: two full-size pans, 6–8 melts per pan.",
    ],
    prepMinutes: 20,
    cookMinutes: 15,
    difficulty: "easy",
    crewSizeDefault: 8,
    ingredients: [
      ing("canned tuna", "48", { unit: "oz", notes: "in water, drained and pressed dry", group: "Salad" }),
      ing("mayonnaise", "1", { unit: "cup", group: "Salad" }),
      ing("celery stalks", "4", { unit: "count", notes: "finely diced", group: "Salad" }),
      ing("red onion", "0.5", { unit: "cup", notes: "finely diced", group: "Salad" }),
      ing("lemon juice", "2", { unit: "tbsp", group: "Salad" }),
      ing("Dijon mustard", "1", { unit: "tbsp", group: "Salad" }),
      ing("marbled rye bread", "16", { unit: "slices", group: "Bread" }),
      ing("sharp cheddar cheese", "1.5", { unit: "lb", notes: "grated or 16 slices", group: "Cheese" }),
      ing("unsalted butter", "0.5", { unit: "cup", notes: "softened", group: "Toast" }),
      ing("kosher salt and black pepper", "1", { unit: "batch", group: "Seasoning" }),
      ing("paprika", "1", { unit: "tsp", notes: "optional dusting before broil", group: "Finish" }),
      ing("dill pickles", "2", { unit: "cups", notes: "sliced, for the line", group: "Sides" }),
    ],
    steps: [
      step(
        1,
        "Drain tuna and make the salad",
        "Open tuna, drain, and press dry in a colander or on paper towels — dry tuna is the difference between melts and mush. Fold with mayonnaise, celery, onion, lemon, Dijon, salt, and pepper until creamy but not soupy. Taste and adjust acid.",
        { minutes: 12 },
      ),
      step(
        2,
        "Butter rye and portion salad",
        "Heat broiler with rack in upper third. Butter one side of each rye slice and lay buttered-side down on parchment-lined sheet pans. Spread a generous ½ cup tuna salad on each slice, mounding slightly in the center.",
        { minutes: 8 },
      ),
      step(
        3,
        "Top with cheddar",
        "Cover each open face with cheddar — sliced or grated — all the way to the edges so broiler melt seals to bread. Dust lightly with paprika if you want diner color.",
        { minutes: 5 },
      ),
      step(
        4,
        "Broil until bubbling",
        "Broil until cheese melts, bubbles, and browns in spots, 4–6 minutes — rotate pans and watch constantly. Cheese should look glossy and split at the edges, not pale and rubbery.",
        { minutes: 6, tempF: 500, heatLevel: "high" },
      ),
      step(
        5,
        "Hold warm and serve open-faced",
        "Slide melts onto serving platters or leave on parchment in a 200°F oven up to 15 minutes. Serve open-faced with pickles so the crew sees tuna and rye immediately. Re-broil 1 minute if cheese tightens on hold.",
        { minutes: 5 },
      ),
    ],
    proTips: [
      "A squeeze of hot sauce in the salad wakes up canned tuna without hiding it.",
      "For 14, use two ovens or stagger pans — crowded broilers steam instead of brown.",
      "Do not cover finished melts with foil — condensation kills crisp rye.",
    ],
    tonightSpread: [
      "Open-faced tuna melts with pickle chips and tomato soup on the side if available.",
      "Simple potato chips or slaw — this sandwich is the main event.",
    ],
    leftovers: [
      "Tuna salad keeps 2 days refrigerated — broil fresh bread tomorrow.",
      "Fold leftover salad into a pasta bake with extra cheddar.",
    ],
    equipment: ["Sheet pans", "Parchment paper", "Broiler or oven", "Colander", "Mixing bowl"],
    nutrition: { calories: 480, protein: 32, carbs: 28, fats: 26, fiber: 3 },
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
    searchTerms: ["tuna melt sheet pan", "hall tuna melt", "diner tuna melt rye"],
    sourceUrl: BATCH_B_SANDWICH_SOURCE_URLS["best-tuna-melt-for-the-hall"],
  }),

  def({
    slug: "hall-blt-sandwich-feed",
    title: "Hall BLT Sandwich Feed",
    subtitle: "Thick-cut bacon, ripe tomato, and crisp lettuce on toasted sandwich bread",
    category: "crew_feeders",
    protein: "pork",
    cuisine: "american",
    mealFormat: "sandwich",
    explorePools: ["handheld", "comfort", "hall_expansion"],
    hookLine: "A true BLT feed — bacon cooked flat in batches, bread toasted, assembly line ready for the crew",
    description:
      "Bacon cooks low on sheet pans until flat and crisp, sandwich bread toasts golden, and the line builds BLTs with mayo, thick tomato, and crisp lettuce so every sandwich shows bacon, lettuce, and tomato without digging. Built for volume, not tea-party portions.",
    whyCrewsLikeIt:
      "Everyone knows a BLT — no explanation needed on a busy day. Cooking bacon in the oven frees the stove for soup or eggs, and toasted bread keeps the feed from turning soggy while the second wave eats.",
    mealPrepNotes:
      "Oven bacon can finish 30 minutes ahead and hold warm on paper towels. Toast bread in the same oven after bacon comes out. Hold assembled BLTs up to 20 minutes in a warm box with lettuce and tomato added last if you pre-stage bacon and toast only.",
    stationWorkflow: [
      "Lay bacon on rimmed sheet pans in a single layer — overlapping bacon steams instead of crisps.",
      "Set up a mayo station, tomato plate, and lettuce bowl so firefighters can build or cooks can batch-assemble.",
      "For 14, plan 3 slices bacon per sandwich and two full sheet pans of bacon per wave.",
    ],
    prepMinutes: 15,
    cookMinutes: 25,
    difficulty: "easy",
    crewSizeDefault: 8,
    ingredients: [
      ing("thick-cut bacon", "4", { unit: "lb", group: "Bacon" }),
      ing("sandwich bread", "24", { unit: "slices", notes: "soft white or potato bread, not thin toast", group: "Bread" }),
      ing("ripe tomatoes", "6", { unit: "large", notes: "¼-inch slices, pat dry", group: "Produce" }),
      ing("romaine or iceberg lettuce", "2", { unit: "heads", notes: "leaves separated, crisp", group: "Produce" }),
      ing("mayonnaise", "1.5", { unit: "cups", group: "Spread" }),
      ing("unsalted butter", "0.5", { unit: "cup", notes: "softened for toasting", group: "Toast" }),
      ing("kosher salt and black pepper", "1", { unit: "batch", group: "Seasoning" }),
      ing("avocado", "4", { unit: "count", notes: "sliced, optional at the line", group: "Optional" }),
    ],
    steps: [
      step(
        1,
        "Oven-crisp the bacon",
        "Heat oven to 400°F. Lay bacon on foil-lined sheet pans in a single layer. Bake, rotating pans, until flat, crisp, and deep brown, 18–22 minutes. Drain on paper towels. Hold warm up to 30 minutes — do not stack hot bacon or it steams soft.",
        { minutes: 22, tempF: 400 },
      ),
      step(
        2,
        "Toast the sandwich bread",
        "Brush bread slices lightly with butter. Toast on sheet pans at 400°F until golden on both sides, 6–8 minutes total, flipping once. Warm toast holds better than untoasted bread against tomato juice.",
        { minutes: 10, tempF: 400 },
      ),
      step(
        3,
        "Prep tomato and lettuce",
        "Slice tomatoes ¼ inch thick and pat dry with paper towels — wet tomato is the main reason BLTs fail. Separate lettuce into cupped leaves and rinse if needed; dry in a spinner so leaves stay crisp on the line.",
        { minutes: 10 },
      ),
      step(
        4,
        "Build BLTs on toasted bread",
        "Spread mayo on both inner faces of every toast slice. For batch build: layer lettuce, tomato seasoned with salt and pepper, then 3 bacon strips per sandwich. For self-serve, lay bacon, lettuce, and tomato in baking dishes so the crew assembles clear BLTs with visible layers.",
        { minutes: 10 },
      ),
      step(
        5,
        "Serve immediately or brief hold",
        "Cut sandwiches diagonal and serve while bacon still crackles. If holding for late crew, add tomato and lettuce only when the bell rings; keep bacon and toast warm separately up to 20 minutes. Re-toast 2 minutes if bread softens.",
        { minutes: 5 },
      ),
    ],
    proTips: [
      "Thick-cut bacon gives meaty bites; thin bacon disappears under tomato.",
      "Season tomato slices lightly — it wakes up winter tomatoes.",
      "Avocado at the line turns this into a hall ABLT without rewriting the recipe.",
    ],
    tonightSpread: [
      "BLTs with chips and cold slaw.",
      "Extra toast on the side for crews who want open-face doubles.",
    ],
    leftovers: [
      "Crumble bacon into breakfast potatoes tomorrow.",
      "Chop leftover tomato into a quick salsa for tacos.",
    ],
    equipment: ["Rimmed sheet pans", "Foil", "Paper towels", "Serrated knife", "Cutting board"],
    nutrition: { calories: 540, protein: 22, carbs: 38, fats: 34, fiber: 3 },
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
    searchTerms: ["BLT sandwich crew", "hall BLT feed", "bacon lettuce tomato batch"],
    sourceUrl: BATCH_B_SANDWICH_SOURCE_URLS["hall-blt-sandwich-feed"],
  }),
];
