import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

export const batch05: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-zoodle-bolognese",
      title: "Turkey Zoodle Bolognese",
      subtitle: "Lean turkey ragu over spiralized zucchini with parmesan",
      protein: "turkey",
      cuisine: "Italian-American",
      mealFormat: "pasta",
      hook: "Pasta night with fewer carbs—zoodles stay crisp at the line",
      prep: 25,
      cook: 30,
      difficulty: "medium",
      sourceId: "st-25",
    }),
    description:
      "Ground turkey simmers in tomato-wine bolognese while zucchini noodles stay separate for a lighter hall pasta alternative.",
    whyCrewsLikeIt:
      "Comfort food flavor without carb coma. Crew gets protein-heavy sauce with fresh vegetable base.",
    mealPrepNotes:
      "Spiralize zucchini day-of—pre-spiralized zoodles weep water. Salt and drain 10 minutes before cooking.",
    stationWorkflow: [
      "Cook zoodles in batches in hot skillet 2 minutes only—overcooking makes watery plates.",
      "Keep sauce and zoodles separate until plating for best texture.",
      "Offer regular pasta on the side for crew who want both options.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 2.5, unit: "lb" },
      { name: "zucchini", quantity: 6, unit: "large", notes: "spiralized" },
      { name: "crushed tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "tomato paste", quantity: 2, unit: "tbsp" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "finely diced" },
      { name: "carrots", quantity: 2, unit: "whole", notes: "finely diced" },
      { name: "celery stalks", quantity: 2, unit: "whole", notes: "finely diced" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "dry red wine", quantity: 0.75, unit: "cup" },
      { name: "dried Italian seasoning", quantity: 1, unit: "tbsp" },
      { name: "Parmesan cheese", quantity: 1, unit: "cup", notes: "grated" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Salt and drain zoodles",
        instruction:
          "Toss spiralized zucchini with 1 tsp salt, rest 10 minutes in a colander. Squeeze out moisture with towels so noodles stay firm when sauced.",
        minutes: 12,
      },
      {
        title: "Brown turkey",
        instruction:
          "Cook ground turkey in olive oil over medium-high 8–10 minutes, breaking into fine crumbles until no pink remains and edges look lightly golden.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Build bolognese base",
        instruction:
          "Add onion, carrot, celery; cook 6 minutes. Add garlic, tomato paste, Italian seasoning; cook 2 minutes until paste darkens to brick red.",
        minutes: 8,
      },
      {
        title: "Simmer sauce",
        instruction:
          "Add wine, reduce 3 minutes. Add crushed tomatoes, simmer 20 minutes uncovered until thick and spoon-coating with visible turkey throughout.",
        minutes: 23,
        heatLevel: "medium-low",
      },
      {
        title: "Sear zoodles and plate",
        instruction:
          "Sauté zoodles in hot oiled skillet 2–3 minutes until just warmed and slightly tender. Top with bolognese and parmesan at the line.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 320, protein: 32, carbs: 18, fats: 14, fiber: 5 },
    proTips: [
      "Do not sauce zoodles until plating—they turn soggy in holding pans.",
      "A pinch of nutmeg in bolognese adds classic depth.",
      "Regular spaghetti on the side keeps both camps happy.",
    ],
    tonightSpread: ["Garlic bread for crew who skip zoodles.", "Simple arugula salad."],
    leftovers: [
      "Sauce over regular pasta next day—zoodles do not reheat well.",
      "Freeze bolognese without zoodles for future pasta nights.",
    ],
    equipment: ["Spiralizer", "Large sauté pan", "Colander"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "cajun-chicken-rice-bowl",
      title: "Cajun Chicken Rice Bowl",
      subtitle: "Blackened chicken thighs over rice with bell pepper and creole spices",
      protein: "chicken",
      cuisine: "Cajun",
      mealFormat: "bowl",
      hook: "Bold Louisiana spice in a scalable bowl line",
      prep: 20,
      cook: 25,
      difficulty: "medium",
      sourceId: "se-16",
    }),
    description:
      "Cajun-spiced chicken thighs grill or sear until blackened, served over rice with sautéed trinity peppers and a light creole sauce.",
    whyCrewsLikeIt:
      "Big flavor wake-up after bland meal weeks. Bowl format handles mixed spice tolerances with hot sauce at the line.",
    mealPrepNotes:
      "Mix Cajun spice in bulk jar. Cook rice while chicken sears.",
    stationWorkflow: [
      "Vent hood on—blackening creates smoke at high heat.",
      "Sear chicken in batches for proper crust, not steamed gray meat.",
      "Bowl line: rice, chicken, peppers, sauce drizzle, green onion.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "long-grain white rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "red bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "green bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "celery stalks", quantity: 4, unit: "whole", notes: "diced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "garlic powder", quantity: 1, unit: "tbsp" },
      { name: "onion powder", quantity: 1, unit: "tbsp" },
      { name: "dried thyme", quantity: 1, unit: "tsp" },
      { name: "cayenne pepper", quantity: 1, unit: "tsp" },
      { name: "chicken broth", quantity: 1, unit: "cup", notes: "for sauce" },
    ],
    stepLines: [
      {
        title: "Mix Cajun spice blend in bulk",
        instruction:
          "Combine paprika, garlic powder, onion powder, thyme, cayenne, 1 tbsp salt, and 1 tsp pepper in a labeled jar until evenly blended and deeply red. Portion what you need for this cook — the rest stays on the spice shelf for the next bowl night.",
        minutes: 5,
      },
      {
        title: "Rinse and start the rice",
        instruction:
          "Rinse long-grain rice until water runs clear. Simmer in salted water or broth 18–20 minutes until grains separate with a fork — not sticky mush. Fluff and hold covered at 200°F in a baking dish while chicken sears.",
        minutes: 22,
        heatLevel: "medium",
      },
      {
        title: "Prep the trinity for the line",
        instruction:
          "Dice onion, bell peppers, and celery to uniform pieces so they cook evenly on the flat-top. Keep a dry towel nearby — blackening smoke will set off the hood if you forget to vent.",
        minutes: 10,
      },
      {
        title: "Sauté trinity until sweet",
        instruction:
          "Cook trinity in oil over medium 8–10 minutes until softened and edges turn light gold. Season with a pinch of salt. Hold warm at the edge of the range — do not let them steam to grey mush under a lid.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        title: "Coat chicken for blackening",
        instruction:
          "Pat thighs dry; press Cajun blend onto both sides until fully coated and visibly red. Cold, wet chicken steams instead of chars — room-temp meat blackens faster and more evenly.",
        minutes: 8,
      },
      {
        title: "Blacken chicken in batches",
        instruction:
          "Heat cast iron until a water drop dances. Sear thighs 5–6 minutes per side in batches until crust is nearly black and centers read 165°F. Vent hood on — this step smokes. Rest chicken 5 minutes tented before slicing.",
        minutes: 18,
        heatLevel: "high",
      },
      {
        title: "Deglaze pan sauce",
        instruction:
          "Pour chicken broth into the hot pan and scrape fond. Simmer 3 minutes until lightly thickened and mahogany. Taste for salt; add a knob of butter if the crew likes a richer drizzle.",
        minutes: 5,
        heatLevel: "medium",
      },
      {
        title: "Slice and verify temp",
        instruction:
          "Slice rested thighs across the grain. Probe the thickest slice — must read 165°F before it hits the bowl line. Any under-temp piece goes back to the skillet 2 minutes per side.",
        minutes: 5,
      },
      {
        title: "Build the bowl line",
        instruction:
          "Set up: rice pan, sliced chicken, trinity, sauce ladle, green onion, hot sauce. Portion ~1 cup rice, 6 oz chicken, generous trinity, light sauce drizzle per firefighter. Charred outside, juicy inside is the visual cue.",
        minutes: 8,
        heatLevel: "low",
      },
      {
        title: "Hold through call interruptions",
        instruction:
          "If tones drop, hold chicken covered at 140°F and rice at 200°F. Refresh sauce with a splash of broth if it tightens on the warm side of the range.",
        minutes: 5,
        heatLevel: "low",
      },
      {
        title: "Pack down leftovers safely",
        instruction:
          "Cool chicken and rice in shallow pans within two hours. Reheat chicken to 165°F next shift; refresh rice with stock. Cajun chicken over romaine with ranch is a solid next-day lunch.",
        minutes: 10,
      },
    ],
    nutrition: { calories: 495, protein: 38, carbs: 52, fats: 14, fiber: 3 },
    proTips: [
      "Reduce cayenne for mild crews—offer Louisiana hot sauce at the line.",
      "Cast iron delivers best blackening crust on flat-top or range.",
      "Andouille sausage slices optional for extra smoky depth.",
    ],
    tonightSpread: ["Cornbread muffins.", "Collard greens sautéed with garlic."],
    leftovers: [
      "Cajun chicken salad over romaine with ranch.",
      "Slice into wraps with remoulade-style mayo.",
    ],
    equipment: ["Cast iron skillet", "Rice cooker"],
    spiceLevel: "hot",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "chipotle-lime-chicken-tacos",
      title: "Chipotle Lime Chicken Tacos",
      subtitle: "Adobo-marinated grilled chicken with slaw and lime crema",
      protein: "chicken",
      cuisine: "Mexican",
      mealFormat: "tacos",
      hook: "Smoky taco night with real chipotle heat—not just hot sauce",
      prep: 25,
      cook: 18,
      difficulty: "medium",
      sourceId: "ak-15",
    }),
    description:
      "Chicken thighs marinate in chipotle-lime adobo, grill until charred, and serve in corn tortillas with cabbage slaw and crema.",
    whyCrewsLikeIt:
      "Smoky heat with bright lime balance. Taco assembly keeps dinner interactive and fast.",
    mealPrepNotes:
      "Marinate 2–24 hours. Warm tortillas in foil before service.",
    stationWorkflow: [
      "Grill or sear chicken for char—oven alone misses smoky taco-shop vibe.",
      "Keep slaw chilled until assembly so tacos stay crisp.",
      "Taco bar: chicken, slaw, crema, pico, cilantro, lime.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "chipotle peppers in adobo", quantity: 4, unit: "whole", notes: "minced" },
      { name: "adobo sauce", quantity: 3, unit: "tbsp" },
      { name: "lime juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "ground cumin", quantity: 1, unit: "tbsp" },
      { name: "green cabbage", quantity: 1, unit: "head", notes: "shredded" },
      { name: "Greek yogurt", quantity: 1, unit: "cup" },
      { name: "corn tortillas", quantity: 24, unit: "whole", notes: "6-inch" },
      { name: "fresh cilantro", quantity: 1, unit: "cup", notes: "chopped" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Marinate chicken",
        instruction:
          "Blend chipotle, adobo, lime juice, garlic, cumin, oil, and salt. Coat thighs, marinate at least 2 hours so flavors penetrate deep into meat.",
        minutes: 120,
      },
      {
        title: "Prep slaw and crema",
        instruction:
          "Toss cabbage with 2 tbsp lime juice and pinch of salt until lightly wilted but crunchy. Mix yogurt with remaining lime for crema.",
        minutes: 10,
      },
      {
        title: "Grill chicken",
        instruction:
          "Grill or sear thighs over medium-high 6–7 minutes per side until charred edges form and internal temp reaches 165°F throughout.",
        minutes: 16,
        heatLevel: "medium-high",
      },
      {
        title: "Rest and slice",
        instruction:
          "Rest chicken 5 minutes, slice against grain into strips. Meat should be moist with visible smoke char, not dry or stringy.",
        minutes: 5,
      },
      {
        title: "Assemble tacos",
        instruction:
          "Fill warm tortillas with chicken, slaw, crema, and cilantro. Each taco should hold together when picked up without filling falling out.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 385, protein: 36, carbs: 28, fats: 16, fiber: 5 },
    proTips: [
      "Double-stack tortillas for crews eating one-handed between tasks.",
      "Offer pickled red onion for extra tang without more prep.",
      "Reduce chipotle count for mild shift—start with 2 peppers.",
    ],
    tonightSpread: ["Black beans with cumin.", "Mexican rice in a baking dish."],
    leftovers: [
      "Chicken over rice bowl with slaw and crema.",
      "Quesadillas with leftover chicken and cheese.",
    ],
    equipment: ["Grill or cast iron skillet", "Mixing bowls"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "grilled-shrimp-quinoa-bowls",
      title: "Grilled Shrimp Quinoa Bowls",
      subtitle: "Charred shrimp skewers over quinoa with roasted vegetables",
      protein: "shrimp",
      cuisine: "Mediterranean",
      mealFormat: "grill",
      hook: "High-protein grain bowls from the grill line",
      prep: 25,
      cook: 20,
      difficulty: "medium",
      sourceId: "tmd-15",
    }),
    description:
      "Large shrimp marinate in lemon-garlic oil, grill on skewers, and serve over quinoa with roasted zucchini and cherry tomatoes.",
    whyCrewsLikeIt:
      "Light but protein-heavy. Grill marks make it feel like a cookout even on a Tuesday shift.",
    mealPrepNotes:
      "Soak wooden skewers 30 minutes. Cook quinoa ahead—it holds well.",
    stationWorkflow: [
      "Thread shrimp uniform for even grill timing—3 per skewer works well.",
      "Grill shrimp 2 minutes per side max—overcooked shrimp ruin the bowl.",
      "Bowl line: quinoa, veg, shrimp, lemon wedge, feta optional.",
    ],
    ingredients: [
      { name: "large shrimp", quantity: 3, unit: "lb", notes: "peeled, deveined, 16–20 count" },
      { name: "quinoa", quantity: 2, unit: "cups", notes: "dry, rinsed" },
      { name: "zucchini", quantity: 3, unit: "medium", notes: "chunked" },
      { name: "cherry tomatoes", quantity: 2, unit: "cups", notes: "halved" },
      { name: "lemon juice", quantity: 0.25, unit: "cup", notes: "fresh" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "extra-virgin olive oil", quantity: 0.33, unit: "cup" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "feta cheese", quantity: 1, unit: "cup", notes: "crumbled" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Cook quinoa",
        instruction:
          "Simmer quinoa in 4 cups water 15 minutes until tails appear and grains are tender but not mushy. Fluff with fork and season lightly.",
        minutes: 18,
      },
      {
        title: "Roast vegetables",
        instruction:
          "Toss zucchini and tomatoes with 2 tbsp oil, salt, and pepper. Roast at 425°F 18–20 minutes until zucchini tender and tomatoes burst.",
        minutes: 20,
        heatLevel: "high",
      },
      {
        title: "Marinate shrimp",
        instruction:
          "Toss shrimp with remaining oil, lemon juice, garlic, oregano, salt, and pepper. Marinate 15 minutes while vegetables roast.",
        minutes: 15,
      },
      {
        title: "Grill shrimp skewers",
        instruction:
          "Thread shrimp on skewers. Grill over medium-high 2 minutes per side until pink, opaque, and lightly charred—not curled tight or rubbery.",
        minutes: 6,
        heatLevel: "medium-high",
      },
      {
        title: "Assemble bowls",
        instruction:
          "Portion quinoa, roasted veg, and shrimp skewers. Top with feta and parsley. Shrimp should snap cleanly when bitten.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 395, protein: 38, carbs: 36, fats: 12, fiber: 5 },
    proTips: [
      "Pat shrimp dry before marinating—wet shrimp will not char.",
      "Offer tahini drizzle for crews who want creamy richness.",
      "Metal skewers skip soaking and speed up prep.",
    ],
    tonightSpread: ["Warm pita wedges.", "Hummus for dipping."],
    leftovers: [
      "Chop into a cold quinoa salad next day.",
      "Shrimp do not reheat well—plan portions carefully.",
    ],
    equipment: ["Grill", "Half-sheet pan", "Skewers"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "veggie-egg-casserole-tray",
      title: "Veggie Egg Casserole Tray",
      subtitle: "Baked egg casserole with spinach, bell pepper, and feta for eight",
      protein: "egg",
      cuisine: "American",
      mealFormat: "breakfast",
      hook: "Morning batch bake—slice and serve without stovetop juggling",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "ml-08",
    }),
    description:
      "Eggs whisk with milk and bake in a deep tray with spinach, bell pepper, onion, and feta into a sliceable morning casserole for the whole crew.",
    whyCrewsLikeIt:
      "Grab a square and go. High protein start without frying eggs to order during a busy turnover.",
    mealPrepNotes:
      "Bake night before and reheat morning of. Cut into 12 squares for easy portions.",
    stationWorkflow: [
      "Use a 4-inch deep baking dish for even bake and clean slicing.",
      "Squeeze spinach dry—excess moisture makes a soggy casserole center.",
      "Rest pan 10 minutes before cutting so squares hold their shape.",
    ],
    ingredients: [
      { name: "large eggs", quantity: 24, unit: "whole" },
      { name: "milk", quantity: 1.5, unit: "cups", notes: "2% or whole" },
      { name: "fresh spinach", quantity: 6, unit: "cups", notes: "chopped, squeezed dry" },
      { name: "red bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "feta cheese", quantity: 1.5, unit: "cups", notes: "crumbled" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "all-purpose flour", quantity: 0.25, unit: "cup" },
      { name: "baking powder", quantity: 1, unit: "tsp" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Preheat and sauté vegetables",
        instruction:
          "Heat oven to 375°F. Sauté onion and bell pepper in olive oil 6 minutes until softened. Add garlic and spinach, cook 2 minutes until wilted and dry.",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Whisk egg base",
        instruction:
          "Whisk eggs, milk, flour, baking powder, salt, and pepper until smooth with no flour lumps visible at the bottom of the bowl.",
        minutes: 5,
      },
      {
        title: "Combine filling",
        instruction:
          "Fold sautéed vegetables and feta into egg mixture until evenly distributed with vegetables suspended throughout, not sunk to bottom.",
        minutes: 3,
      },
      {
        title: "Bake casserole",
        instruction:
          "Pour into greased deep baking dish. Bake 32–38 minutes until center is set, puffed, and knife inserted in middle comes out clean.",
        minutes: 35,
        heatLevel: "medium",
      },
      {
        title: "Rest and slice",
        instruction:
          "Rest 10 minutes. Cut into 12 squares. Texture should be firm and springy, not wet or rubbery in the center.",
        minutes: 10,
      },
    ],
    nutrition: { calories: 245, protein: 16, carbs: 8, fats: 17, fiber: 2 },
    proTips: [
      "Add turkey sausage crumbles for extra protein without changing bake time much.",
      "Reheat squares covered with foil at 325°F for 15 minutes.",
      "Hot sauce at the line wakes up mild morning palates.",
    ],
    tonightSpread: ["Fresh fruit platter.", "Whole-grain toast and jam."],
    leftovers: [
      "Casserole squares in breakfast burritos with salsa.",
      "Freeze individually wrapped for backup shift breakfasts.",
    ],
    equipment: ["Deep baking dish", "Large skillet", "Whisk"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "maple-mustard-salmon-tray",
      title: "Maple Mustard Salmon Tray",
      subtitle: "Glazed salmon fillets with roasted Brussels sprouts and carrots",
      protein: "salmon",
      cuisine: "American",
      mealFormat: "sheet_pan",
      hook: "Sweet-tangy salmon tray that holds without drying on the line",
      prep: 18,
      cook: 20,
      difficulty: "easy",
      sourceId: "ba-07",
    }),
    description:
      "Salmon fillets bake with maple-mustard glaze alongside halved Brussels sprouts and carrot coins for a complete performance tray.",
    whyCrewsLikeIt:
      "Omega-3 dinner that feels special. Glaze caramelizes beautifully without a grill.",
    mealPrepNotes:
      "Halve Brussels sprouts through the stem so they stay intact. Mix glaze in squeeze bottle.",
    stationWorkflow: [
      "Place sprouts cut-side down for maximum caramelization on the flat cut surface.",
      "Glaze salmon twice—mid-cook and final 3 minutes—for lacquered finish.",
      "Hold at 150°F max—overholding dries salmon fast.",
    ],
    ingredients: [
      { name: "salmon fillets", quantity: 4, unit: "lb", notes: "skin-on, 6 oz portions" },
      { name: "Brussels sprouts", quantity: 2, unit: "lb", notes: "halved" },
      { name: "carrots", quantity: 1, unit: "lb", notes: "cut into coins" },
      { name: "maple syrup", quantity: 0.25, unit: "cup" },
      { name: "Dijon mustard", quantity: 3, unit: "tbsp" },
      { name: "whole-grain mustard", quantity: 1, unit: "tbsp" },
      { name: "apple cider vinegar", quantity: 1, unit: "tbsp" },
      { name: "garlic cloves", quantity: 3, unit: "cloves", notes: "minced" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Heat oven and prep vegetables",
        instruction:
          "Heat oven to 400°F. Toss Brussels sprouts and carrots with 2 tbsp oil, salt, and pepper. Arrange cut-side down on two half-sheets.",
        minutes: 10,
      },
      {
        title: "Mix maple mustard glaze",
        instruction:
          "Whisk maple syrup, both mustards, vinegar, garlic, and remaining oil until smooth and emulsified with no mustard clumps.",
        minutes: 3,
      },
      {
        title: "Season salmon",
        instruction:
          "Pat salmon dry, place skin-down among vegetables. Brush half the glaze over flesh side until evenly coated and glossy.",
        minutes: 5,
      },
      {
        title: "Bake until done",
        instruction:
          "Roast 14–18 minutes, brushing glaze again halfway, until salmon reads 125–130°F and sprouts are caramelized at cut edges.",
        minutes: 16,
        heatLevel: "medium-high",
      },
      {
        title: "Rest and serve",
        instruction:
          "Rest 3 minutes. Salmon should flake with gentle pressure and stay moist pink at center, not chalky throughout.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 410, protein: 36, carbs: 22, fats: 22, fiber: 6 },
    proTips: [
      "Real maple syrup matters—fake syrup burns and tastes one-note.",
      "Add dried cranberries to glaze for holiday-adjacent flavor crews love.",
      "Farro or wild rice pairs well with the sweet glaze.",
    ],
    tonightSpread: ["Wild rice pilaf.", "Arugula salad with lemon vinaigrette."],
    leftovers: [
      "Flake salmon into a grain bowl with roasted veg.",
      "Salmon salad with extra mustard dressing next day.",
    ],
    equipment: ["Two half-sheet pans", "Pastry brush"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "salsa-verde-crock-chicken",
      title: "Salsa Verde Crock Chicken",
      subtitle: "Slow-cooked tomatillo chicken that shreds for bowls and tacos",
      protein: "chicken",
      cuisine: "Mexican",
      mealFormat: "slow_cooker",
      hook: "Set before shift—shred at dinner for two service lines",
      prep: 15,
      cook: 360,
      difficulty: "easy",
      sourceId: "nyt-08",
    }),
    description:
      "Chicken thighs braise in salsa verde with onion and jalapeño until pull-apart tender for tacos, rice bowls, or lettuce wraps.",
    whyCrewsLikeIt:
      "Tangy tomatillo flavor without standing at the stove. One crock feeds tacos and bowls simultaneously.",
    mealPrepNotes:
      "Start crock by 11 a.m. for 6 p.m. dinner. Shred in pot to save dishes.",
    stationWorkflow: [
      "Do not lift lid first 3 hours—each peek adds significant cook time.",
      "Skim excess fat before shredding for cleaner tangy flavor.",
      "Hold shredded chicken in salsa at 165°F—dry hold kills texture.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 5, unit: "lb" },
      { name: "salsa verde", quantity: 4, unit: "cups", notes: "store-bought or homemade" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "sliced" },
      { name: "jalapeño peppers", quantity: 2, unit: "whole", notes: "seeded, minced" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
      { name: "chicken broth", quantity: 0.5, unit: "cup", notes: "low sodium" },
      { name: "lime juice", quantity: 3, unit: "tbsp", notes: "fresh" },
      { name: "fresh cilantro", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "kosher salt", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Layer crock",
        instruction:
          "Place onion slices in bottom of 8-quart slow cooker. Arrange chicken thighs on top in even layer without stacking too deep.",
        minutes: 5,
      },
      {
        title: "Add salsa verde",
        instruction:
          "Pour salsa verde over chicken. Add jalapeño, garlic, cumin, broth, and salt. Stir lightly so thighs are mostly submerged in liquid.",
        minutes: 5,
      },
      {
        title: "Slow cook until tender",
        instruction:
          "Cover and cook on low 6–8 hours until chicken shreds easily with forks and internal temp reaches 165°F throughout.",
        heatLevel: "low",
      },
      {
        title: "Shred and combine",
        instruction:
          "Shred chicken in crock with two forks. Mix with cooking liquid until meat is moist and coated, not dry or stringy.",
        minutes: 10,
      },
      {
        title: "Finish with lime and cilantro",
        instruction:
          "Stir in lime juice and cilantro off heat. Sauce should taste bright and tangy, not flat or overly salty.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 375, protein: 40, carbs: 8, fats: 20, fiber: 2 },
    proTips: [
      "Homemade salsa verde: blend tomatillos, jalapeño, onion, cilantro, lime.",
      "Offer both corn tortillas and rice bowls at the line.",
      "Freeze shredded portions in cooking liquid for fast taco nights.",
    ],
    tonightSpread: ["Warm corn tortillas.", "Cilantro-lime rice.", "Pickled red onion."],
    leftovers: [
      "Salsa verde chicken enchiladas baked with cheese.",
      "Huevos rancheros with leftover chicken next morning.",
    ],
    equipment: ["8-quart slow cooker", "Two forks"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-quinoa-stuffed-peppers",
      title: "Turkey Quinoa Stuffed Peppers",
      subtitle: "Colorful bell peppers filled with lean turkey, quinoa, and tomato",
      protein: "turkey",
      cuisine: "American",
      mealFormat: "bake",
      hook: "Batch stuffed peppers that reheat cleanly on the next shift",
      prep: 30,
      cook: 45,
      difficulty: "medium",
      sourceId: "st-26",
    }),
    description:
      "Bell peppers bake filled with ground turkey, cooked quinoa, diced tomato, and spices until tender and topped with melted cheese.",
    whyCrewsLikeIt:
      "Colorful plates that feel wholesome. Individual portions make serving eight predictable.",
    mealPrepNotes:
      "Cook quinoa ahead. Blanch peppers 3 minutes if you want softer shells.",
    stationWorkflow: [
      "Stand peppers upright in a deep baking dish packed tight so they do not tip.",
      "Do not overfill—expanding quinoa needs ½ inch headspace in each pepper.",
      "Rest 5 minutes before plating so filling sets and does not spill.",
    ],
    ingredients: [
      { name: "large bell peppers", quantity: 8, unit: "whole", notes: "tops removed, seeded" },
      { name: "lean ground turkey", quantity: 2, unit: "lb" },
      { name: "cooked quinoa", quantity: 2, unit: "cups" },
      { name: "diced tomatoes", quantity: 1, unit: "can", notes: "14.5 oz, drained" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "finely diced" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "tomato paste", quantity: 2, unit: "tbsp" },
      { name: "dried Italian seasoning", quantity: 1, unit: "tbsp" },
      { name: "Monterey Jack cheese", quantity: 1.5, unit: "cups", notes: "shredded" },
      { name: "chicken broth", quantity: 0.5, unit: "cup", notes: "low sodium" },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Cook turkey filling",
        instruction:
          "Brown ground turkey with onion in olive oil over medium-high 8–10 minutes until crumbly and no pink remains. Add garlic, tomato paste, seasoning.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        title: "Combine with quinoa",
        instruction:
          "Stir in cooked quinoa, diced tomatoes, and salt. Mix until filling looks moist and holds together when pressed, not crumbly or dry.",
        minutes: 5,
      },
      {
        title: "Stuff peppers",
        instruction:
          "Fill each pepper with ¾ cup filling, packing lightly. Stand upright in a baking dish with ½ cup broth in bottom to steam during bake.",
        minutes: 10,
      },
      {
        title: "Bake covered then uncovered",
        instruction:
          "Cover with foil, bake at 375°F 30 minutes. Uncover, top with cheese, bake 12–15 more minutes until peppers tender and cheese melted.",
        minutes: 45,
        heatLevel: "medium",
      },
      {
        title: "Rest and serve",
        instruction:
          "Rest 5 minutes. Pepper walls should yield to a fork but hold shape; filling should be hot throughout with no pink turkey.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 385, protein: 32, carbs: 28, fats: 16, fiber: 6 },
    proTips: [
      "Mix red, yellow, and orange peppers for visual appeal at the line.",
      "Vegetarian version: swap turkey for extra quinoa and black beans.",
      "Reheat covered with splash of broth to restore moisture.",
    ],
    tonightSpread: ["Simple green salad with vinaigrette.", "Garlic bread slices."],
    leftovers: [
      "Chop peppers into a hash with eggs for breakfast.",
      "Freeze stuffed peppers individually wrapped.",
    ],
    equipment: ["9x13 baking dish", "Large skillet", "Aluminum foil"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-shepherds-sweet-potato",
      title: "Turkey Shepherd's with Sweet Potato Top",
      subtitle: "Lean turkey and vegetable filling under whipped sweet potato mash",
      protein: "turkey",
      cuisine: "British-American",
      mealFormat: "bake",
      hook: "Comfort cottage pie remix with better balance and crew-scale portions",
      prep: 30,
      cook: 40,
      difficulty: "medium",
      sourceId: "ew-12",
    }),
    description:
      "Ground turkey and mixed vegetables simmer in savory gravy, topped with whipped sweet potato mash and baked until golden.",
    whyCrewsLikeIt:
      "Classic comfort food without heavy beef grease. Sweet potato top adds color and fiber crews appreciate.",
    mealPrepNotes:
      "Boil sweet potatoes while turkey filling simmers. Pipe or spread mash evenly for pretty portions.",
    stationWorkflow: [
      "Use a 4-inch deep baking dish for clean slice portions across eight servings.",
      "Let filling cool slightly before topping—hot filling melts mash into the gravy layer.",
      "Broil last 3 minutes for golden peaks if oven time allows.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 3, unit: "lb" },
      { name: "sweet potatoes", quantity: 4, unit: "lb", notes: "peeled, cubed" },
      { name: "frozen mixed vegetables", quantity: 4, unit: "cups", notes: "carrots, peas, corn" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "tomato paste", quantity: 2, unit: "tbsp" },
      { name: "chicken broth", quantity: 2, unit: "cups", notes: "low sodium" },
      { name: "Worcestershire sauce", quantity: 2, unit: "tbsp" },
      { name: "dried thyme", quantity: 1, unit: "tsp" },
      { name: "milk", quantity: 0.5, unit: "cup", notes: "warm" },
      { name: "butter", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Boil and mash sweet potatoes",
        instruction:
          "Boil sweet potato cubes 15–18 minutes until fork-tender. Drain well, mash with butter, milk, and 1 tsp salt until smooth and spreadable.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        title: "Brown turkey and onion",
        instruction:
          "Cook ground turkey and onion over medium-high 10 minutes, breaking into crumbles until no pink remains and onion turns translucent at edges.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Build savory filling",
        instruction:
          "Add garlic, tomato paste, thyme; cook 2 minutes. Stir in mixed vegetables, broth, Worcestershire. Simmer 10 minutes until thick and gravy-coated.",
        minutes: 12,
      },
      {
        title: "Assemble and top",
        instruction:
          "Spread filling in greased baking dish. Pipe or spread sweet potato mash evenly over top with textured peaks for browning.",
        minutes: 8,
      },
      {
        title: "Bake until golden",
        instruction:
          "Bake at 400°F 25–30 minutes until mash peaks turn golden and filling bubbles at edges. Center should be hot throughout when pierced.",
        minutes: 28,
        heatLevel: "medium-high",
      },
    ],
    nutrition: { calories: 425, protein: 34, carbs: 42, fats: 14, fiber: 7 },
    proTips: [
      "A pinch of cinnamon in sweet potato mash complements savory filling.",
      "Add rosemary to turkey filling for depth without extra salt.",
      "Portion with a square cutter for uniform crew servings.",
    ],
    tonightSpread: ["Steamed green beans with lemon.", "Simple mixed green salad."],
    leftovers: [
      "Reheat squares covered with foil—add broth if filling dried.",
      "Freeze individual portions for emergency comfort meals.",
    ],
    equipment: ["Deep baking dish", "Large pot for potatoes", "Large skillet"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "baked-falafel-hall-bowls",
      title: "Baked Falafel Hall Bowls",
      subtitle: "Crisp oven falafel, tahini drizzle, and cucumber-tomato salad",
      protein: "vegetarian",
      cuisine: "mediterranean",
      mealFormat: "bowl",
      hook: "Plant-forward line that still feels like a real dinner",
      prep: 30,
      cook: 28,
      difficulty: "medium",
      sourceId: "tmd-05",
    }),
    description:
      "Herb-packed falafel patties bake on sheet pans until crisp outside and green inside, then serve over rice with tahini, pickles, and fresh salad for a meatless hall night that satisfies.",
    whyCrewsLikeIt:
      "Crews get crunch, sauce, and volume without a fryer. Works when you need a lighter night between heavy grill shifts.",
    mealPrepNotes:
      "Chill formed falafel 15 minutes before baking — they hold together better on the tray.",
    stationWorkflow: [
      "Run a bowl line: rice, 3 falafel, salad, tahini, pickles — keeps patties crisp.",
      "Hold baked falafel on sheet pans at 200°F uncovered up to 25 minutes.",
      "Keep a backup pan of extra falafel for late eaters after calls.",
    ],
    ingredients: [
      { name: "dried chickpeas", quantity: 1.5, unit: "lb", notes: "soaked overnight, drained" },
      { name: "fresh parsley", quantity: 2, unit: "cups", notes: "packed" },
      { name: "fresh cilantro", quantity: 1, unit: "cup", notes: "packed" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "rough chopped" },
      { name: "garlic cloves", quantity: 6, unit: "cloves" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "ground coriander", quantity: 1, unit: "tbsp" },
      { name: "baking powder", quantity: 1.5, unit: "tsp" },
      { name: "long-grain rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "tahini", quantity: 0.75, unit: "cup" },
      { name: "lemon juice", quantity: 0.5, unit: "cup" },
      { name: "cherry tomatoes", quantity: 2, unit: "pints", notes: "halved" },
      { name: "English cucumbers", quantity: 3, unit: "whole", notes: "diced" },
      { name: "kosher salt", quantity: 2, unit: "tbsp" },
      { name: "olive oil", quantity: 0.5, unit: "cup", notes: "for brushing trays" },
    ],
    stepLines: [
      {
        title: "Soak and prep chickpeas",
        instruction:
          "Drain soaked chickpeas well and pat dry on towels — wet chickpeas make dense falafel. Pulse in food processor with herbs, onion, garlic, cumin, coriander, 1 tbsp salt, and baking powder until coarse meal holds a squeeze (not hummus smooth).",
        minutes: 12,
      },
      {
        title: "Form and chill patties",
        instruction:
          "Scoop 2-oz balls and flatten to ½-inch patties. Arrange on oiled sheet pans with space between. Refrigerate uncovered 15 minutes so edges set before baking.",
        minutes: 18,
      },
      {
        title: "Cook rice",
        instruction:
          "Rinse rice until water runs clear. Cook 1:1.75 rice to water with a pinch of salt; fluff and hold covered at low heat.",
        minutes: 22,
        heatLevel: "medium",
      },
      {
        title: "Bake falafel until crisp",
        instruction:
          "Brush patties lightly with olive oil. Bake at 425°F 22–26 minutes, flipping once at 12 minutes, until deep golden and crisp at edges — centers should read 165°F if checked.",
        minutes: 26,
        heatLevel: "medium-high",
      },
      {
        title: "Whisk tahini sauce",
        instruction:
          "Whisk tahini with lemon juice, ¼ cup cold water, and pinch of salt until pourable — add water 1 tbsp at a time if thick. Taste for bright lemon balance.",
        minutes: 5,
      },
      {
        title: "Build bowls at the line",
        instruction:
          "Toss cucumber and tomatoes with remaining olive oil and salt. Serve rice, hot falafel, salad, tahini, and optional hot sauce on a build-your-own line.",
        minutes: 8,
      },
    ],
    nutrition: { calories: 485, protein: 18, carbs: 62, fats: 20, fiber: 12 },
    proTips: [
      "Do not use canned chickpeas — baked texture will be pasty.",
      "A light spray of oil beats drowning patties — too much oil steams them soft.",
      "Pickled red onions at the line add snap without extra prep mid-shift.",
    ],
    tonightSpread: ["Warm pita wedges on the side.", "Harissa or hot sauce for heat seekers."],
    leftovers: [
      "Reheat falafel in a 400°F oven 8 minutes — microwave makes them rubbery.",
      "Extra tahini keeps 4 days refrigerated — thin with water when reheating.",
    ],
    equipment: ["Food processor", "Two half-sheet pans", "Large rice pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),
];
