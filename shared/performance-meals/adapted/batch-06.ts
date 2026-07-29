import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

/**
 * Batch 06 — Performance Meals beef expansion.
 *
 * Started as 14 candidates; 4 were cut and 5 were reworked after a Fire Hall
 * Score pass (Crew Appeal / Ease of Cooking / Leftover Quality / Call
 * Interruption Tolerance / Meal Prep Value, avg must clear 8.5):
 *  - Cut: Greek Steak & Orzo Power Bowls (redundant with the reworked flank
 *    steak once both are grain-bowl format), Black Pepper Beef & Snap Pea
 *    Stir-Fry (format-saturated — beef already has 9 protein+grain+sauce
 *    dishes), Steak & Arugula Salad and Blackened Steak Caesar Wraps
 *    (dressed raw greens / bread can't be made hold-tolerant without losing
 *    the dish's identity).
 *  - Reworked with a real technique change (not a relabel): Thai Basil Beef
 *    (wok toss → simmered skillet), Flank Steak (grill → reverse-sear +
 *    oven-finish), Kofta (grilled skewers → sheet-pan bake), Burgers (bunned
 *    burger → burger bowl, no bread to go soggy), Keftedes (minor: oven-hold
 *    note, it was already a near-miss at 8.4).
 */
export const batch06: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "thai-basil-ground-beef-skillet",
      title: "Thai Basil Ground Beef Skillet",
      subtitle: "Garlic-chili ground beef simmered with green beans and basil over jasmine rice",
      protein: "beef",
      cuisine: "Thai-inspired",
      mealFormat: "skillet",
      hook: "A simmered skillet that holds through a call, not a 90-second wok flash",
      prep: 15,
      cook: 18,
      difficulty: "easy",
      sourceId: "htk-10",
    }),
    description:
      "Ground beef browns hard with garlic and chilies, then simmers with green beans in a savory-sweet fish sauce mixture until the sauce reduces and clings, finished with a big handful of basil folded in off heat.",
    whyCrewsLikeIt:
      "Tastes like a takeout order but comes together in one skillet — and actually holds if a call pulls the crew mid-cook, because the sauce just keeps reducing instead of overcooking the way a flash stir-fry would.",
    mealPrepNotes:
      "Chop garlic and chilies ahead. This one can simmer a few extra minutes without ruining the dish.",
    stationWorkflow: [
      "Brown the beef hard first, then let the sauce actually simmer and reduce — this is a skillet that can wait on the stove, not a 90-second flash-fry.",
      "Add basil off heat at the very end so it stays bright green, not wilted and black.",
      "If a call interrupts after the sauce goes in, just cover and hold on low — it won't overcook the way a stir-fry would.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3.5, unit: "lb", notes: "90/10" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "minced" },
      { name: "Thai or serrano chilies", quantity: 4, unit: "whole", notes: "minced" },
      { name: "shallots", quantity: 3, unit: "medium", notes: "sliced" },
      { name: "green beans", quantity: 1, unit: "lb", notes: "trimmed, cut into 1-inch pieces" },
      { name: "fish sauce", quantity: 0.33, unit: "cup" },
      { name: "soy sauce", quantity: 3, unit: "tbsp" },
      { name: "oyster sauce", quantity: 2, unit: "tbsp" },
      { name: "brown sugar", quantity: 2, unit: "tbsp" },
      { name: "beef broth", quantity: 0.5, unit: "cup", notes: "low sodium" },
      { name: "fresh Thai basil", quantity: 2, unit: "cups", notes: "packed, regular basil works too" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "vegetable oil", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Cook the rice",
        instruction:
          "Rinse jasmine rice until water runs clear. Cook with a pinch of salt per package directions; fluff and hold covered while the skillet comes together.",
        minutes: 20,
      },
      {
        title: "Mix the sauce",
        instruction:
          "Stir together fish sauce, soy sauce, oyster sauce, brown sugar, and beef broth in a bowl so it's ready to pour in one motion.",
        minutes: 3,
      },
      {
        title: "Brown the beef",
        instruction:
          "Heat oil in a large skillet over medium-high. Add beef in a flat layer, let it sear undisturbed 2 minutes before breaking apart, cooking 6–7 minutes until deeply browned with no pink.",
        minutes: 8,
        heatLevel: "medium-high",
      },
      {
        title: "Add aromatics and green beans",
        instruction:
          "Push beef to one side, add garlic, chilies, and shallots to the cleared space; cook 30 seconds until fragrant. Add green beans, stir everything together, cook 2–3 minutes until beans start to soften.",
        minutes: 5,
        heatLevel: "medium-high",
      },
      {
        title: "Simmer until saucy",
        instruction:
          "Pour in the sauce mixture, bring to a simmer, and cook 5–6 minutes, stirring occasionally, until beans are tender and the sauce has reduced and clings to the beef instead of pooling. This stage is forgiving — it can hold at a low simmer a few extra minutes if needed.",
        minutes: 6,
        heatLevel: "medium-low",
      },
      {
        title: "Finish with basil",
        instruction:
          "Kill the heat, fold in basil until just wilted — overcooked basil turns bitter and black.",
        minutes: 2,
      },
    ],
    nutrition: { calories: 510, protein: 40, carbs: 44, fats: 17, fiber: 5 },
    proTips: [
      "Reduce chilies to 2 for a milder version—offer sriracha at the line for heat seekers.",
      "A fried egg with a runny yolk on top makes this feel like a proper Thai street-food plate.",
      "This skillet can hold on low heat, covered, for up to 15 extra minutes if a call comes in—the sauce just reduces further, no harm done.",
    ],
    tonightSpread: ["Fried egg station.", "Cucumber slices with a squeeze of lime."],
    leftovers: [
      "Reheats well in a skillet or microwave—the sauce keeps the beef from drying out the way a plain flash stir-fry would.",
      "Stuff into lettuce cups for a lighter next-day lunch.",
    ],
    equipment: ["Large deep skillet", "Rice pot"],
    spiceLevel: "hot",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "southwest-beef-sweet-potato-skillet",
      title: "Southwest Beef & Sweet Potato Skillet",
      subtitle: "Chili-spiced ground beef with roasted sweet potato, black beans, and corn",
      protein: "beef",
      cuisine: "Southwest",
      mealFormat: "skillet",
      hook: "One skillet, no bowl-assembly required",
      prep: 20,
      cook: 30,
      difficulty: "easy",
      sourceId: "st-41",
    }),
    description:
      "Ground beef browns with Southwest spices, then simmers in one skillet with roasted sweet potato cubes, black beans, and corn until everything is tender and coated in a smoky chili-tomato sauce.",
    whyCrewsLikeIt:
      "Naturally sweet and savory without feeling like a diet dish. Beans and sweet potato mean it holds and reheats better than a plain beef skillet.",
    mealPrepNotes:
      "Cube sweet potatoes small (½ inch) so they roast in the same time it takes to brown the beef.",
    stationWorkflow: [
      "Roast sweet potato on a sheet pan while the beef browns on the stove—two things happening at once saves real time.",
      "Don't skip draining the beans—extra liquid waters down the skillet.",
      "Top station: avocado, lime wedges, cilantro, shredded cheese, sour cream.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3.5, unit: "lb", notes: "90/10" },
      { name: "sweet potatoes", quantity: 2.5, unit: "lb", notes: "peeled, ½-inch cubes" },
      { name: "black beans", quantity: 2, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "frozen corn", quantity: 2, unit: "cups" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "diced tomatoes with green chiles", quantity: 1, unit: "can", notes: "10 oz" },
      { name: "chili powder", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "avocado", quantity: 2, unit: "whole", notes: "sliced, for serving" },
      { name: "lime", quantity: 2, unit: "whole", notes: "cut into wedges" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Roast the sweet potato",
        instruction:
          "Toss sweet potato cubes with 2 tbsp oil and 1 tsp salt. Roast at 425°F 22–25 minutes, flipping once, until fork-tender and caramelized at the edges.",
        minutes: 25,
        heatLevel: "high",
      },
      {
        title: "Brown the beef",
        instruction:
          "Cook ground beef and onion in remaining oil over medium-high 8–10 minutes, breaking into crumbles, until no pink remains and onion is soft.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom the spices",
        instruction:
          "Add garlic, chili powder, cumin, and smoked paprika to the beef; cook 1 minute until fragrant and the spices coat every piece of meat.",
        minutes: 2,
      },
      {
        title: "Simmer the skillet",
        instruction:
          "Stir in diced tomatoes with chiles, black beans, and corn. Simmer 8–10 minutes uncovered until slightly thickened and everything is heated through.",
        minutes: 10,
        heatLevel: "medium-low",
      },
      {
        title: "Fold in sweet potato and serve",
        instruction:
          "Gently fold roasted sweet potato into the skillet so it doesn't break apart. Taste for salt, then serve with avocado slices and lime wedges at the line.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 510, protein: 40, carbs: 48, fats: 18, fiber: 10 },
    proTips: [
      "Roasting the sweet potato separately keeps it from turning to mush in the skillet.",
      "A dollop of Greek yogurt works as a lighter stand-in for sour cream.",
      "Shredded pepper jack on top adds a nice melt without much extra effort.",
    ],
    tonightSpread: ["Sliced avocado and lime.", "Shredded cheese and cilantro for topping."],
    leftovers: [
      "Wrap into burritos with rice for a fast next-day lunch.",
      "Reheats well covered in the microwave—add a splash of water if it looks dry.",
    ],
    equipment: ["Large skillet", "Half-sheet pan"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "beef-birria-with-consomme",
      title: "Beef Birria with Consommé for Dipping",
      subtitle: "Chile-braised beef shredded and served with its own dipping broth",
      protein: "beef",
      cuisine: "Mexican",
      mealFormat: "one_pot",
      hook: "Low-and-slow braise with a dipping ritual the crew won't forget",
      prep: 30,
      cook: 210,
      difficulty: "medium",
      sourceId: "se-32",
    }),
    description:
      "Chuck roast braises for hours in a blended guajillo-ancho chile broth with garlic, cumin, and warm spices until it shreds apart, then gets served with its own rich consommé for dipping.",
    whyCrewsLikeIt:
      "It's a genuine event, not just dinner—crews dip and slurp, and the deep chile broth tastes like it took all day because it did. Big beefy payoff for a shift that started slow.",
    mealPrepNotes:
      "Start the braise by early afternoon for a dinner-hour finish. Skim fat from the consommé before serving for a cleaner dipping broth.",
    stationWorkflow: [
      "Toast and rehydrate the dried chiles first—skipping this step leaves a flat, bitter broth.",
      "Skim the fat cap off the top of the consommé before ladling it into dipping cups.",
      "Set up a build line: shredded beef, warm tortillas, consommé cups, onion, cilantro, lime.",
    ],
    ingredients: [
      { name: "beef chuck roast", quantity: 4, unit: "lb", notes: "trimmed, cut into large chunks" },
      { name: "dried guajillo chiles", quantity: 5, unit: "whole", notes: "stemmed, seeded" },
      { name: "dried ancho chiles", quantity: 3, unit: "whole", notes: "stemmed, seeded" },
      { name: "white onion", quantity: 1, unit: "large", notes: "quartered, plus more diced for topping" },
      { name: "garlic cloves", quantity: 8, unit: "cloves" },
      { name: "plum tomatoes", quantity: 3, unit: "whole" },
      { name: "beef broth", quantity: 6, unit: "cups", notes: "low sodium" },
      { name: "ground cumin", quantity: 1, unit: "tbsp" },
      { name: "dried Mexican oregano", quantity: 1, unit: "tbsp" },
      { name: "cinnamon stick", quantity: 1, unit: "whole" },
      { name: "bay leaves", quantity: 2, unit: "whole" },
      { name: "apple cider vinegar", quantity: 2, unit: "tbsp" },
      { name: "corn tortillas", quantity: 24, unit: "whole", notes: "warmed" },
      { name: "fresh cilantro", quantity: 0.5, unit: "cup", notes: "chopped, for topping" },
      { name: "lime", quantity: 3, unit: "whole", notes: "cut into wedges" },
      { name: "kosher salt", quantity: 2, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Toast and blend the chiles",
        instruction:
          "Toast guajillo and ancho chiles in a dry pot 1–2 minutes per side until fragrant, not scorched. Soak in hot water 15 minutes, then blend with quartered onion, garlic, tomatoes, cumin, and 1 cup broth until smooth.",
        minutes: 20,
      },
      {
        title: "Sear the beef",
        instruction:
          "Pat chuck chunks dry, season with salt. Sear in a large Dutch oven over high heat in batches, 3–4 minutes per side, until deeply browned—this builds the base flavor for the broth.",
        minutes: 15,
        heatLevel: "high",
      },
      {
        title: "Build and braise",
        instruction:
          "Return beef to the pot, pour in the chile blend and remaining broth, add oregano, cinnamon stick, and bay leaves. Bring to a simmer, cover, and braise 3–3.5 hours until beef shreds apart with a fork.",
        minutes: 210,
        heatLevel: "low",
      },
      {
        title: "Shred and finish",
        instruction:
          "Remove beef, shred with two forks discarding excess fat. Strain the broth, skim the fat, stir in vinegar, and taste for salt—consommé should taste rich and deeply savory, not greasy.",
        minutes: 15,
      },
      {
        title: "Serve the dipping ritual",
        instruction:
          "Warm tortillas, pile with shredded beef, top with diced onion and cilantro. Ladle hot consommé into small cups for dipping tacos, with lime wedges alongside.",
        minutes: 10,
      },
    ],
    nutrition: { calories: 480, protein: 46, carbs: 32, fats: 18, fiber: 5 },
    proTips: [
      "Make it a day ahead—birria tastes even better after the flavors sit overnight.",
      "Crisp leftover tacos in a dry skillet with a little consommé brushed on for birria quesatacos.",
      "Reduce dried chiles to 6 total for a milder broth without losing the depth.",
    ],
    tonightSpread: ["Warm corn tortillas.", "Diced onion and cilantro.", "Extra consommé for refills."],
    leftovers: [
      "Shredded beef and broth both freeze well for up to 3 months.",
      "Crisp leftovers into quesatacos with melted cheese in a hot skillet.",
    ],
    equipment: ["Large Dutch oven", "Blender", "Fine mesh strainer"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "greek-beef-keftedes-lemon-orzo-tzatziki",
      title: "Greek Beef Meatballs (Keftedes) with Lemon Orzo & Tzatziki",
      subtitle: "Oregano-mint baked meatballs over lemon orzo with cool tzatziki",
      protein: "beef",
      cuisine: "Greek",
      mealFormat: "bake",
      hook: "Sheet-pan meatballs that hold warm through a shift, not just reheat clean for the next one",
      prep: 25,
      cook: 25,
      difficulty: "medium",
      sourceId: "ba-15",
      pools: ["healthy", "performance", "performance_meals_50"],
    }),
    description:
      "Ground beef mixes with grated onion, garlic, fresh mint, and oregano, bakes on sheet pans until browned, and gets served over lemony orzo with a cool cucumber-yogurt tzatziki.",
    whyCrewsLikeIt:
      "Herby and bright instead of heavy and Italian-marinara-coated. Baking a full sheet pan at once means the whole crew eats together, no standing at a skillet.",
    mealPrepNotes:
      "Form and portion meatballs ahead of time and refrigerate—they hold their shape better going into a hot oven cold.",
    stationWorkflow: [
      "Grate the onion instead of dicing it—it disappears into the meatball and keeps everything moist.",
      "Bake meatballs on a wire rack over the sheet pan if you have one, so they brown on all sides, not just the bottom.",
      "Meatballs and orzo both hold well in a covered dish at 275°F if a call interrupts—this dish is closer to a casserole than it looks.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3, unit: "lb", notes: "90/10" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "grated" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced, divided" },
      { name: "fresh mint", quantity: 0.33, unit: "cup", notes: "chopped" },
      { name: "dried oregano", quantity: 2, unit: "tbsp", notes: "divided" },
      { name: "plain breadcrumbs", quantity: 1, unit: "cup" },
      { name: "large eggs", quantity: 2, unit: "whole" },
      { name: "whole wheat orzo", quantity: 2.5, unit: "cups", notes: "dry" },
      { name: "lemon", quantity: 2, unit: "whole", notes: "zested and juiced" },
      { name: "English cucumber", quantity: 1, unit: "whole", notes: "grated and squeezed dry" },
      { name: "plain Greek yogurt", quantity: 2, unit: "cups" },
      { name: "fresh dill", quantity: 0.25, unit: "cup", notes: "chopped" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix the meatballs",
        instruction:
          "Combine beef, grated onion, half the garlic, mint, 1 tbsp oregano, breadcrumbs, eggs, and 1 tsp salt. Mix just until combined—overworking makes tough, dense meatballs.",
        minutes: 12,
      },
      {
        title: "Form and bake",
        instruction:
          "Roll into 2-oz balls, arrange on parchment-lined sheet pans with space between. Bake at 425°F 18–22 minutes until browned outside and 160°F at the center.",
        minutes: 20,
        heatLevel: "medium-high",
      },
      {
        title: "Cook the orzo",
        instruction:
          "Boil orzo in salted water 9–10 minutes until al dente. Drain and toss with olive oil, lemon zest, half the lemon juice, and remaining oregano until glossy.",
        minutes: 12,
      },
      {
        title: "Make tzatziki",
        instruction:
          "Stir grated, squeezed-dry cucumber into yogurt with remaining garlic, dill, remaining lemon juice, and a pinch of salt until smooth and thick enough to hold a spoon upright.",
        minutes: 10,
      },
      {
        title: "Plate and serve",
        instruction:
          "Portion orzo into bowls or a baking dish, top with meatballs, and finish with a generous spoonful of tzatziki. Meatballs should be juicy inside, not dry or crumbly.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 540, protein: 42, carbs: 44, fats: 20, fiber: 5 },
    proTips: [
      "A splash of milk in the meatball mix keeps them extra tender if your beef runs lean.",
      "Toasted pine nuts on top add classic Greek crunch if you have them on hand.",
      "If pulled away mid-shift, hold the whole pan covered in a low oven—keftedes stay juicy far longer than a plain grilled patty would.",
    ],
    tonightSpread: ["Warm pita wedges.", "Simple Greek salad with red onion and olives."],
    leftovers: [
      "Meatballs reheat well in a 350°F oven 8–10 minutes—microwave works in a pinch.",
      "Stuff leftover meatballs and orzo into pita pockets with extra tzatziki.",
    ],
    equipment: ["Two half-sheet pans", "Box grater", "Medium pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "mediterranean-beef-kofta-bowls",
      title: "Mediterranean Beef Kofta Bowls",
      subtitle: "Sheet-pan baked cumin-spiced beef kofta over rice pilaf with tahini-garlic sauce",
      protein: "beef",
      cuisine: "Middle Eastern",
      mealFormat: "bowl",
      hook: "Oven-baked kofta that holds warm through a shift, no grill required",
      prep: 25,
      cook: 22,
      difficulty: "medium",
      sourceId: "tmd-23",
    }),
    description:
      "Ground beef mixes with cumin, coriander, allspice, and grated onion, shapes into oblong kofta directly on a sheet pan, and roasts hot until deeply browned, served over toasted rice pilaf with a tahini-garlic sauce and a fresh tomato-cucumber salad.",
    whyCrewsLikeIt:
      "Warm-spiced and smoky-edged straight from the oven, not another meatball. Tahini sauce is a totally different flavor lane from tzatziki, so it never feels like a repeat night—and the whole batch bakes hands-off on one pan.",
    mealPrepNotes:
      "Shape kofta ahead and refrigerate on the sheet pan—they hold their shape better going into a hot oven cold.",
    stationWorkflow: [
      "Squeeze the grated onion dry before mixing it in, or the kofta mixture will be too loose to hold its shape on the pan.",
      "Roast on a wire rack over the sheet pan if you have one, so kofta brown on all sides, not just the bottom.",
      "The pan can hold in a turned-down oven (200°F) if a call interrupts—kofta stay juicy far longer than they would on an unattended grill.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3, unit: "lb", notes: "90/10" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "grated and squeezed dry" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced, divided" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "finely chopped, divided" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "ground coriander", quantity: 1, unit: "tbsp" },
      { name: "ground allspice", quantity: 1, unit: "tsp" },
      { name: "basmati rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "toasted vermicelli noodles", quantity: 0.25, unit: "cup", notes: "broken, or crushed angel hair" },
      { name: "chicken broth", quantity: 4.5, unit: "cups", notes: "low sodium" },
      { name: "tahini", quantity: 0.75, unit: "cup" },
      { name: "lemon juice", quantity: 0.33, unit: "cup", notes: "fresh, divided" },
      { name: "Roma tomatoes", quantity: 4, unit: "whole", notes: "diced" },
      { name: "English cucumber", quantity: 2, unit: "whole", notes: "diced" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix and shape the kofta",
        instruction:
          "Combine beef, grated onion, half the garlic, half the parsley, cumin, coriander, allspice, and 1 tsp salt. Mix gently and shape into oblong logs directly on a parchment-lined sheet pan—no skewers needed. Chill 20 minutes to firm up.",
        minutes: 25,
      },
      {
        title: "Toast and cook the rice pilaf",
        instruction:
          "Toast vermicelli in 1 tbsp oil until golden, add rinsed rice and stir 1 minute to coat. Add broth and a pinch of salt, bring to a boil, cover, and simmer 15–18 minutes until tender and fluffy.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        title: "Whisk the tahini sauce",
        instruction:
          "Whisk tahini with remaining garlic, half the lemon juice, and cold water 1 tbsp at a time until pourable and smooth—it will seize before it smooths out, keep whisking.",
        minutes: 8,
      },
      {
        title: "Toss the tomato-cucumber salad",
        instruction:
          "Combine diced tomato, cucumber, remaining parsley, remaining lemon juice, and remaining oil with a pinch of salt. Salad should taste bright and fresh, not soggy.",
        minutes: 8,
      },
      {
        title: "Roast the kofta",
        instruction:
          "Roast at 425°F for 18–20 minutes, flipping once, until deeply browned outside and 160°F at the center. Oven heat is far more forgiving than a grill grate—kofta won't dry out if the timing slips a few minutes.",
        minutes: 20,
        heatLevel: "high",
      },
      {
        title: "Build the bowls",
        instruction:
          "Portion rice pilaf, top with kofta, a generous scoop of tomato-cucumber salad, and a drizzle of tahini sauce. Kofta should be smoky-edged and juicy inside.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 560, protein: 40, carbs: 46, fats: 22, fiber: 5 },
    proTips: [
      "A finish under the broiler for the last 2 minutes adds real char if you want a grill-like crust.",
      "A pinch of cinnamon in the meat mix is traditional and adds real depth without tasting sweet.",
      "Reheat leftover kofta in a 350°F oven rather than the microwave to keep the edges from turning rubbery.",
    ],
    tonightSpread: ["Warm pita on the side.", "Extra tahini sauce for drizzling."],
    leftovers: [
      "Chop kofta and toss into the rice pilaf for a fast next-day bowl—they reheat cleanly in the oven.",
      "Tahini sauce keeps 5 days refrigerated—thin with water before reusing.",
    ],
    equipment: ["Half-sheet pan", "Wire rack (optional)", "Medium pot"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "unstuffed-cabbage-roll-skillet",
      title: "Unstuffed Cabbage Roll Skillet",
      subtitle: "Ground beef, rice, and cabbage simmered in paprika-tomato sauce",
      protein: "beef",
      cuisine: "Eastern European",
      mealFormat: "skillet",
      hook: "All the flavor of cabbage rolls, none of the rolling",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "ew-21",
    }),
    description:
      "Ground beef browns with onion and paprika, then simmers in one deep skillet with chopped cabbage, rice, and crushed tomatoes until the cabbage is tender and the rice has soaked up the sauce.",
    whyCrewsLikeIt:
      "Tastes exactly like grandma's stuffed cabbage without an hour of rolling individual leaves. Hearty, saucy, and genuinely new flavor territory for the collection.",
    mealPrepNotes:
      "Chop the whole head of cabbage before starting—once the beef is browned, everything moves quickly in one pot.",
    stationWorkflow: [
      "Use a wide, deep skillet or Dutch oven—the cabbage volume looks like too much at first but wilts down fast.",
      "Stir occasionally, not constantly, so the rice has time to actually absorb the sauce instead of staying crunchy.",
      "A dollop of sour cream or plain yogurt on top cuts the acidity nicely at the line.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3.25, unit: "lb", notes: "90/10" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "green cabbage", quantity: 1, unit: "large head", notes: "cored and chopped, about 3 lb" },
      { name: "long-grain white rice", quantity: 1.5, unit: "cups", notes: "uncooked" },
      { name: "crushed tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "beef broth", quantity: 1.5, unit: "cups", notes: "low sodium" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "sweet paprika", quantity: 2, unit: "tbsp" },
      { name: "Worcestershire sauce", quantity: 2, unit: "tbsp" },
      { name: "caraway seeds", quantity: 1, unit: "tsp", notes: "optional" },
      { name: "brown sugar", quantity: 1, unit: "tbsp" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Brown the beef",
        instruction:
          "Cook ground beef and onion in oil over medium-high 8–10 minutes, breaking into crumbles, until no pink remains and onion is soft and translucent.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom the spices",
        instruction:
          "Add garlic, paprika, and caraway seeds if using; cook 1 minute until fragrant and the paprika darkens slightly without burning.",
        minutes: 2,
      },
      {
        title: "Add cabbage and rice",
        instruction:
          "Stir in chopped cabbage a few handfuls at a time until it starts to wilt down and fit in the pan. Add rice, crushed tomatoes, broth, Worcestershire, brown sugar, salt, and pepper.",
        minutes: 8,
      },
      {
        title: "Simmer until tender",
        instruction:
          "Bring to a simmer, cover, and cook 25–30 minutes, stirring occasionally, until rice is tender and cabbage has softened completely but still has a little bite.",
        minutes: 28,
        heatLevel: "medium-low",
      },
      {
        title: "Rest and serve",
        instruction:
          "Let sit off heat 5 minutes to thicken slightly—sauce should coat a spoon, not be soupy. Taste and adjust salt before serving.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 470, protein: 40, carbs: 40, fats: 17, fiber: 7 },
    proTips: [
      "If it looks dry partway through cooking, add a splash more broth—cabbage releases water at different rates.",
      "A dollop of sour cream or plain Greek yogurt on top cuts the tomato acidity nicely.",
      "Smoked paprika instead of sweet adds a nice campfire note if you want to switch it up.",
    ],
    tonightSpread: ["Crusty rye bread.", "Sour cream or plain yogurt for topping."],
    leftovers: [
      "Reheats beautifully—flavor actually improves the next day.",
      "Freezes well in portioned containers for up to 3 months.",
    ],
    equipment: ["Large deep skillet or Dutch oven"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "cuban-beef-picadillo-bowls",
      title: "Cuban-Style Beef Picadillo Bowls",
      subtitle: "Sweet-savory ground beef with olives and raisins over rice and black beans",
      protein: "beef",
      cuisine: "Cuban",
      mealFormat: "bowl",
      hook: "A completely new cuisine lane—sweet, salty, and briny all at once",
      prep: 20,
      cook: 30,
      difficulty: "easy",
      sourceId: "nyt-15",
      pools: ["healthy", "performance", "performance_meals_50"],
    }),
    description:
      "Ground beef simmers with tomato sauce, green olives, raisins, and warm cumin-oregano spice until thick and glossy, served over rice with black beans for a completely different Latin flavor profile.",
    whyCrewsLikeIt:
      "Sweet raisins against salty olives is an unexpected combo that wins people over on the first bite. Nothing else on the menu tastes like this.",
    mealPrepNotes:
      "Mince olives and measure raisins ahead—once the beef is browned, this comes together fast as a one-pan simmer.",
    stationWorkflow: [
      "Don't skip the raisins even if it sounds strange—they melt into the sauce and balance the briny olives perfectly.",
      "Mix black beans into the rice or serve on the side—either works for the crew.",
      "Simmer uncovered near the end so the sauce thickens instead of staying soupy.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3, unit: "lb", notes: "90/10" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "green bell pepper", quantity: 1, unit: "whole", notes: "diced" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "tomato sauce", quantity: 2, unit: "cups" },
      { name: "green olives", quantity: 0.75, unit: "cup", notes: "pitted, roughly chopped" },
      { name: "raisins", quantity: 0.5, unit: "cup" },
      { name: "capers", quantity: 2, unit: "tbsp", notes: "drained" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "bay leaf", quantity: 1, unit: "whole" },
      { name: "red wine vinegar", quantity: 2, unit: "tbsp" },
      { name: "black beans", quantity: 2, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "long-grain white rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Cook the rice",
        instruction:
          "Rinse rice and cook per package directions with a pinch of salt; fluff and hold covered.",
        minutes: 20,
      },
      {
        title: "Brown the beef",
        instruction:
          "Cook ground beef, onion, and bell pepper in oil over medium-high 8–10 minutes, breaking into crumbles, until no pink remains and vegetables have softened.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom the spices",
        instruction:
          "Add garlic, cumin, and oregano; cook 1 minute until fragrant. This step is what keeps picadillo from tasting like plain taco meat.",
        minutes: 2,
      },
      {
        title: "Simmer the picadillo",
        instruction:
          "Stir in tomato sauce, olives, raisins, capers, bay leaf, and vinegar. Simmer uncovered 15–18 minutes until thickened and glossy, stirring occasionally so it doesn't stick.",
        minutes: 18,
        heatLevel: "medium-low",
      },
      {
        title: "Warm beans and build bowls",
        instruction:
          "Warm black beans in a small pot. Remove bay leaf from picadillo. Layer rice, beans, and picadillo in bowls—sauce should be thick enough to hold its shape on the rice.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 540, protein: 42, carbs: 52, fats: 18, fiber: 8 },
    proTips: [
      "Taste before adding extra salt—olives and capers already bring plenty.",
      "A pinch of cinnamon is a traditional addition that deepens the warm spice notes.",
      "Sliced avocado on top is not traditional but the crew won't complain.",
    ],
    tonightSpread: ["Fried or baked plantains if available.", "Simple green salad."],
    leftovers: [
      "Picadillo freezes beautifully for up to 3 months.",
      "Stuff into empanada dough or a baked potato for a next-day twist.",
    ],
    equipment: ["Large skillet or Dutch oven", "Rice pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "greek-spiced-beef-burger-bowls-tzatziki-slaw",
      title: "Greek-Spiced Beef Burger Bowls with Tzatziki Slaw",
      subtitle: "Oregano-feta beef patties over rice with a cool yogurt-dill cabbage slaw, no bun required",
      protein: "beef",
      cuisine: "Greek/Mediterranean",
      mealFormat: "bowl",
      hook: "All the smash-burger flavor, none of the soggy-bun problem",
      prep: 20,
      cook: 15,
      difficulty: "easy",
      sourceId: "dsl-11",
    }),
    description:
      "Ground beef mixes with grated onion, garlic, oregano, and crumbled feta, sears into juicy patties, and gets served open over rice with a crisp yogurt-dill cabbage slaw instead of a bun.",
    whyCrewsLikeIt:
      "Still a juicy, char-crusted patty with the same Greek flavor twist—just built in a bowl instead of a bun, so it holds and reheats like the rest of the collection instead of going soggy on a shelf.",
    mealPrepNotes:
      "Make the slaw at least 20 minutes ahead so the cabbage softens slightly. Patties can be formed and refrigerated a day ahead, then seared or broiled to order.",
    stationWorkflow: [
      "Make an indent in the center of each patty with your thumb before cooking—this stops the burger from puffing into a dome.",
      "Slaw can be made in bulk and refrigerated up to 2 days—it actually improves overnight.",
      "Sear patties on the stove or broil them—either holds better for a big batch than babysitting a grill.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3.25, unit: "lb", notes: "85/15" },
      { name: "yellow onion", quantity: 1, unit: "small", notes: "grated and squeezed dry" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "dried oregano", quantity: 2, unit: "tbsp" },
      { name: "feta cheese", quantity: 1, unit: "cup", notes: "crumbled, plus more for topping" },
      { name: "green cabbage", quantity: 4, unit: "cups", notes: "shredded" },
      { name: "English cucumber", quantity: 1, unit: "whole", notes: "grated and squeezed dry" },
      { name: "plain Greek yogurt", quantity: 1, unit: "cup" },
      { name: "fresh dill", quantity: 0.25, unit: "cup", notes: "chopped" },
      { name: "lemon juice", quantity: 2, unit: "tbsp", notes: "fresh" },
      { name: "long-grain white rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "cherry tomatoes", quantity: 1, unit: "pint", notes: "halved, for topping" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix and form patties",
        instruction:
          "Combine beef, grated onion, garlic, oregano, feta, and 1 tsp salt. Mix gently and form into 8 patties with a thumbprint indent in the center to prevent doming.",
        minutes: 12,
      },
      {
        title: "Make the tzatziki slaw",
        instruction:
          "Toss shredded cabbage with grated cucumber, yogurt, dill, lemon juice, and a pinch of salt. Let sit at least 20 minutes so the cabbage softens slightly and absorbs the dressing.",
        minutes: 20,
      },
      {
        title: "Cook the rice",
        instruction:
          "Rinse and cook rice per package directions with a pinch of salt; fluff and hold covered.",
        minutes: 20,
      },
      {
        title: "Sear or broil the patties",
        instruction:
          "Cook patties in a hot oiled skillet or under the broiler 4–5 minutes per side until well-charred outside and 160°F at the center—feta may ooze slightly, that's expected. No grill needed, and patties hold fine on a low oven rack if a call interrupts.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Build the bowls",
        instruction:
          "Portion rice into bowls, top each with a patty, a generous scoop of tzatziki slaw, and cherry tomatoes. Finish with extra crumbled feta. Slaw should be crisp and cool against the hot, juicy patty.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 580, protein: 42, carbs: 48, fats: 22, fiber: 6 },
    proTips: [
      "Don't press down on the patties while cooking—that squeezes out all the juice.",
      "Sliced red onion stirred into the slaw adds a little extra bite if the crew wants it.",
      "Lettuce cups on the side let anyone who wants a handheld bite build their own mini wrap.",
    ],
    tonightSpread: ["Sliced tomato and cucumber.", "Extra crumbled feta at the line."],
    leftovers: [
      "Store slaw and patties separately, then rewarm the patty in a skillet or oven before building a bowl—no soggy bun to worry about.",
      "Crumble leftover patties over a Greek salad for a fast next-day lunch.",
    ],
    equipment: ["Skillet or broiler", "Box grater", "Rice pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "herb-marinated-flank-steak-chimichurri-farro",
      title: "Herb-Marinated Flank Steak with Chimichurri Farro",
      subtitle: "Rosemary-thyme reverse-seared steak sliced over chimichurri-tossed farro",
      protein: "beef",
      cuisine: "Argentinian/American Grill",
      mealFormat: "skillet",
      hook: "Restaurant reverse-sear technique that holds far better than straight grilling",
      prep: 25,
      cook: 20,
      difficulty: "medium",
      sourceId: "ba-16",
      pools: ["healthy", "performance", "performance_meals_50"],
    }),
    description:
      "Flank steak marinates in garlic, rosemary, and thyme, sears hard in a cast iron skillet for a deep crust, then finishes in the oven to temperature and rests before slicing over nutty farro tossed through with a bright parsley-garlic chimichurri.",
    whyCrewsLikeIt:
      "Real steakhouse crust and flavor without needing a grill running or watching it every second—sear, oven, rest is a professional technique that's far more forgiving if a call pulls someone away mid-cook.",
    mealPrepNotes:
      "Marinate the steak the night before. Farro and chimichurri both hold and improve made a day ahead.",
    stationWorkflow: [
      "Make a double batch of chimichurri—toss half through the farro and save the rest to spoon over the steak.",
      "Sear hard for the crust, then finish in the oven—if a call interrupts during the oven phase, pull the pan, tent it, and it holds far better than steak left on a grill.",
      "Rest the steak the full 10 minutes; slicing early loses all the juice onto the cutting board.",
    ],
    ingredients: [
      { name: "flank steak", quantity: 3.5, unit: "lb" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "minced, divided" },
      { name: "fresh rosemary", quantity: 2, unit: "tbsp", notes: "chopped, divided" },
      { name: "fresh thyme", quantity: 2, unit: "tbsp", notes: "chopped" },
      { name: "red wine vinegar", quantity: 0.33, unit: "cup", notes: "divided" },
      { name: "farro", quantity: 2.5, unit: "cups", notes: "dry" },
      { name: "fresh parsley", quantity: 1.5, unit: "cups", notes: "packed, finely chopped" },
      { name: "fresh oregano", quantity: 2, unit: "tbsp", notes: "chopped" },
      { name: "red pepper flakes", quantity: 1, unit: "tsp" },
      { name: "extra-virgin olive oil", quantity: 0.75, unit: "cup", notes: "divided" },
      { name: "chicken broth", quantity: 5, unit: "cups", notes: "low sodium, for cooking farro" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Marinate the steak",
        instruction:
          "Whisk half the garlic, rosemary, thyme, 2 tbsp vinegar, 3 tbsp oil, salt, and pepper. Coat steak and marinate at least 2 hours, up to overnight refrigerated.",
        minutes: 120,
      },
      {
        title: "Cook the farro",
        instruction:
          "Rinse farro and simmer in chicken broth 25–30 minutes until tender with a slight chew, not mushy. Drain any excess liquid.",
        minutes: 30,
        heatLevel: "medium",
      },
      {
        title: "Make the chimichurri",
        instruction:
          "Combine parsley, oregano, remaining garlic, red pepper flakes, remaining vinegar, and remaining oil. Whisk until combined—chimichurri should be loose and pourable, not a thick paste.",
        minutes: 10,
      },
      {
        title: "Sear the steak",
        instruction:
          "Preheat the oven to 400°F. Pat steak dry. Sear in a hot, oven-safe cast iron skillet over high heat 2–3 minutes per side until a deep, dark crust forms.",
        minutes: 8,
        heatLevel: "high",
      },
      {
        title: "Finish in the oven and rest",
        instruction:
          "Transfer the skillet directly to the oven and roast 8–10 minutes until internal temp reads 130–135°F for medium. Rest 10 full minutes tented in foil—this reverse-sear method is far more forgiving than direct grilling if timing slips.",
        minutes: 18,
        heatLevel: "medium",
      },
      {
        title: "Toss farro and plate",
        instruction:
          "Toss warm farro with about half the chimichurri until evenly coated. Slice steak thin against the grain and serve over the farro with remaining chimichurri spooned on top.",
        minutes: 8,
      },
    ],
    nutrition: { calories: 540, protein: 42, carbs: 40, fats: 20, fiber: 7 },
    proTips: [
      "The sear-then-oven method means you can pull the steak at any point in the oven phase and it'll still turn out great—much more forgiving than a grill.",
      "Pearled farro cooks faster than whole farro if you're short on time—check the package for exact timing.",
      "Leftover chimichurri is excellent on eggs, grilled chicken, or roasted vegetables.",
    ],
    tonightSpread: ["Grilled or toasted bread with olive oil.", "Simple green salad."],
    leftovers: [
      "Reheat farro with a splash of broth to loosen it back up.",
      "Slice cold leftover steak thin over the farro for a fast next-day lunch bowl.",
    ],
    equipment: ["Oven-safe cast iron skillet", "Medium pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "one-pot-beef-orzo-skillet-spinach-feta",
      title: "One-Pot Beef & Orzo Skillet with Spinach and Feta",
      subtitle: "Ground beef and orzo simmered risotto-style with tomato, spinach, and feta",
      protein: "beef",
      cuisine: "Mediterranean",
      mealFormat: "pasta",
      hook: "Creamy risotto texture from orzo with only one pot to wash",
      prep: 15,
      cook: 30,
      difficulty: "easy",
      sourceId: "tmd-24",
    }),
    description:
      "Ground beef browns in one pot, then orzo simmers directly in tomato-broth alongside it, soaking up flavor as it cooks risotto-style, finished with a big handful of wilted spinach and crumbled feta.",
    whyCrewsLikeIt:
      "Creamy, cheesy-tasting comfort food that's actually just orzo, broth, and feta—no cream involved. One pot means fast cleanup on a busy night.",
    mealPrepNotes:
      "Have broth warm and ready to add—cold broth added to a hot pot slows down the simmer and orzo can turn gummy waiting.",
    stationWorkflow: [
      "Stir orzo occasionally while it simmers, the same way you'd stir risotto, so it releases starch and turns creamy.",
      "Add spinach in batches at the very end—it wilts down fast and looks like too much at first.",
      "Finish with feta and lemon zest tableside so it stays fresh, not melted into the pot.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3.5, unit: "lb", notes: "90/10" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "whole wheat orzo", quantity: 3, unit: "cups", notes: "dry" },
      { name: "crushed tomatoes", quantity: 1, unit: "can", notes: "28 oz" },
      { name: "chicken broth", quantity: 4, unit: "cups", notes: "low sodium, warmed" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "red pepper flakes", quantity: 0.5, unit: "tsp" },
      { name: "baby spinach", quantity: 8, unit: "cups", notes: "packed" },
      { name: "feta cheese", quantity: 1.5, unit: "cups", notes: "crumbled" },
      { name: "lemon", quantity: 1, unit: "whole", notes: "zested" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Brown the beef",
        instruction:
          "Cook ground beef and onion in oil over medium-high 8–10 minutes, breaking into crumbles, until no pink remains and onion is soft.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom aromatics",
        instruction:
          "Add garlic, oregano, and red pepper flakes; cook 1 minute until fragrant, stirring so nothing sticks or burns.",
        minutes: 2,
      },
      {
        title: "Simmer the orzo",
        instruction:
          "Stir in orzo, crushed tomatoes, and 3 cups warm broth. Bring to a simmer, stirring every few minutes and adding more broth as it absorbs, 15–18 minutes until orzo is tender and creamy.",
        minutes: 18,
        heatLevel: "medium-low",
      },
      {
        title: "Wilt in the spinach",
        instruction:
          "Fold in spinach a few handfuls at a time until wilted completely—the volume looks huge at first but cooks down fast.",
        minutes: 4,
      },
      {
        title: "Top with feta and lemon",
        instruction:
          "Remove from heat, taste for salt, and top with crumbled feta and lemon zest at the table. Mixture should look creamy and thick, not soupy.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 540, protein: 40, carbs: 46, fats: 19, fiber: 5 },
    proTips: [
      "If the orzo looks too thick before it's fully tender, stir in more warm broth a splash at a time.",
      "Kalamata olives stirred in at the end add a nice briny pop.",
      "A crack of black pepper and extra lemon zest right before serving brightens the whole dish.",
    ],
    tonightSpread: ["Crusty bread for scraping the pot.", "Simple side salad with lemon vinaigrette."],
    leftovers: [
      "Orzo thickens as it sits—loosen with a splash of broth or water when reheating.",
      "Reheat gently on the stove rather than the microwave to keep the texture creamy.",
    ],
    equipment: ["Large deep skillet or Dutch oven"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),
];
