import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

export const batch01: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "lemon-garlic-chicken-tray",
      title: "Lemon Garlic Chicken Tray Bake",
      subtitle: "Bright citrus thighs with roasted broccoli and baby potatoes for eight",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "sheet_pan",
      hook: "One tray, big flavor, holds warm in the oven between calls",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "st-01",
    }),
    description:
      "Bone-in chicken thighs roast on a half-sheet with lemon, garlic, broccoli, and halved baby potatoes. The pan juices become a simple finishing sauce at the line.",
    whyCrewsLikeIt:
      "High-protein comfort without heavy cream. Everything finishes on one tray, portions fast, and reheats cleanly on the next shift.",
    mealPrepNotes:
      "Marinate thighs up to 24 hours. Chop veg the night before in labeled bins. Hold finished trays at 170°F up to 90 minutes.",
    stationWorkflow: [
      "Split two half-sheet pans so thighs char instead of steam across eight portions.",
      "Rest trays 5 minutes before portioning so juices redistribute into the meat.",
      "Line a sheet pan with foil under the serving tray for fast post-meal cleanup.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "skin-on, about 6 lb total" },
      { name: "baby Yukon gold potatoes", quantity: 3, unit: "lb", notes: "halved" },
      { name: "broccoli crowns", quantity: 2, unit: "lb", notes: "cut into florets" },
      { name: "fresh lemons", quantity: 4, unit: "whole", notes: "zested and juiced" },
      { name: "garlic cloves", quantity: 12, unit: "cloves", notes: "minced" },
      { name: "extra-virgin olive oil", quantity: 0.5, unit: "cup" },
      { name: "dried oregano", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tbsp", notes: "freshly cracked" },
    ],
    stepLines: [
      {
        title: "Heat oven and prep pans",
        instruction:
          "Heat oven to 425°F. Line two half-sheet pans with parchment. Pat chicken dry so skin crisps instead of steaming in the oven.",
        minutes: 5,
      },
      {
        title: "Build the lemon garlic marinade",
        instruction:
          "Whisk olive oil, lemon zest, lemon juice, minced garlic, oregano, salt, and pepper until emulsified and fragrant.",
        minutes: 5,
      },
      {
        title: "Season chicken and vegetables",
        instruction:
          "Toss thighs with half the marinade until coated. Toss potatoes and broccoli with remaining marinade until glossy and evenly seasoned.",
        minutes: 8,
      },
      {
        title: "Roast until chicken is done",
        instruction:
          "Arrange thighs skin-side up with potatoes around edges and broccoli in gaps. Roast 32–38 minutes until internal temp hits 165°F and skin is golden.",
        minutes: 35,
        heatLevel: "high",
      },
      {
        title: "Rest and serve from the tray",
        instruction:
          "Rest pans 5 minutes. Spoon pan juices over portions at the line. Chicken should feel firm with clear juices, not pink at the bone.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 485, protein: 42, carbs: 28, fats: 24, fiber: 5 },
    proTips: [
      "Dry thighs thoroughly—wet skin never crisps on a crowded hall tray.",
      "Rotate pans top to bottom halfway for even browning in a busy oven.",
      "Add lemon slices only for the last 10 minutes so they caramelize, not burn.",
    ],
    tonightSpread: [
      "Warm whole-wheat pita with tzatziki for scooping pan juices.",
      "Simple arugula salad with shaved parmesan and lemon vinaigrette.",
    ],
    leftovers: [
      "Shred leftover thighs into a next-day grain bowl with cucumber and feta.",
      "Chop roasted potatoes into a breakfast hash with scrambled eggs.",
    ],
    substitutions: ["Swap broccoli for green beans or asparagus in season."],
    equipment: ["Two half-sheet pans", "Instant-read thermometer", "Large mixing bowls"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "herb-baked-salmon-tray",
      title: "Herb-Crusted Baked Salmon Tray",
      subtitle: "Flaky fillets with dill, parsley, and roasted asparagus for the crew",
      protein: "salmon",
      cuisine: "American",
      mealFormat: "sheet_pan",
      hook: "Omega-3 protein that holds without drying out on the line",
      prep: 15,
      cook: 18,
      difficulty: "easy",
      sourceId: "st-02",
    }),
    description:
      "Salmon fillets bake on a sheet with a fresh herb crust, lemon, and asparagus spears. Designed for quick portioning and gentle hold in a low oven.",
    whyCrewsLikeIt:
      "Lean protein that feels like a treat. Cooks fast after calls and does not leave the kitchen smelling like fried fish.",
    mealPrepNotes:
      "Pat fillets dry ahead and keep chilled. Mix herb topping in a squeeze bottle for fast application before baking.",
    stationWorkflow: [
      "Space fillets 2 inches apart so heat circulates and edges stay tender, not rubbery.",
      "Use a fish spatula at the line to keep fillets intact during portioning.",
      "Hold finished salmon at 150°F max—higher heat dries omega-3-rich fillets quickly.",
    ],
    ingredients: [
      { name: "salmon fillets", quantity: 4, unit: "lb", notes: "skin-on, 6–8 oz portions" },
      { name: "asparagus spears", quantity: 2, unit: "lb", notes: "woody ends trimmed" },
      { name: "fresh dill", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "lemon", quantity: 2, unit: "whole", notes: "zested and sliced" },
      { name: "extra-virgin olive oil", quantity: 0.25, unit: "cup" },
      { name: "Dijon mustard", quantity: 2, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Preheat and prep asparagus",
        instruction:
          "Heat oven to 400°F. Toss asparagus with 1 tbsp olive oil and a pinch of salt until spears look lightly coated, not dripping.",
        minutes: 5,
      },
      {
        title: "Make herb crust paste",
        instruction:
          "Combine dill, parsley, garlic, lemon zest, Dijon, remaining olive oil, salt, and pepper into a thick paste that clings to fish.",
        minutes: 5,
      },
      {
        title: "Season salmon fillets",
        instruction:
          "Pat salmon dry. Spread herb paste evenly on flesh side of each fillet, pressing gently so it adheres during baking.",
        minutes: 5,
      },
      {
        title: "Bake until just opaque",
        instruction:
          "Place salmon on parchment-lined pans with asparagus alongside. Bake 12–16 minutes until thickest part reads 125–130°F and flakes with gentle pressure.",
        minutes: 16,
        heatLevel: "medium-high",
      },
      {
        title: "Finish with lemon and rest",
        instruction:
          "Top with lemon slices, rest 3 minutes off heat. Flesh should look opaque pink at center, not chalky or gray throughout.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 390, protein: 38, carbs: 6, fats: 24, fiber: 3 },
    proTips: [
      "Pull salmon 5°F early—it keeps cooking on the hot tray during rest.",
      "Buy center-cut fillets of similar thickness so nothing overcooks while waiting on thick pieces.",
      "Wipe pans immediately after service; baked-on herb crust comes off easier when warm.",
    ],
    tonightSpread: [
      "Farro or brown rice pilaf with toasted almonds.",
      "Cucumber-dill yogurt sauce for spooning over salmon.",
    ],
    leftovers: [
      "Flake cold salmon into a green salad with capers and red onion.",
      "Salmon cakes next shift: mix flakes with egg, panko, and herbs, pan-sear until crisp.",
    ],
    equipment: ["Half-sheet pans", "Parchment paper", "Fish spatula"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lean-turkey-bean-chili",
      title: "Lean Turkey and Bean Chili",
      subtitle: "Double-batch crock chili with kidney beans and fire-roasted tomatoes",
      protein: "turkey",
      cuisine: "American",
      mealFormat: "slow_cooker",
      hook: "Set the crock before shift change; feed the hall from one pot",
      prep: 25,
      cook: 240,
      difficulty: "easy",
      sourceId: "st-03",
    }),
    description:
      "Ground turkey browns with onion and bell pepper, then simmers low with beans, fire-roasted tomatoes, and chili spices until thick enough to hold on a spoon.",
    whyCrewsLikeIt:
      "Classic hall chili flavor with less grease. Scales in a large crock and stays hot for late-arriving crew without drying out.",
    mealPrepNotes:
      "Brown turkey the night before and refrigerate. Morning crew adds tomatoes and beans, starts crock on low by 10 a.m.",
    stationWorkflow: [
      "Keep crock on warm (not boil) at the line so beans stay intact and turkey stays tender.",
      "Set out toppings bar: shredded cheese, jalapeños, cilantro, lime wedges.",
      "Use a 8-oz ladle for consistent cup-and-bowl portions across the crew.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 3, unit: "lb" },
      { name: "yellow onion", quantity: 2, unit: "large", notes: "diced" },
      { name: "red bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "kidney beans", quantity: 3, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "black beans", quantity: 2, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "fire-roasted diced tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "tomato paste", quantity: 3, unit: "tbsp" },
      { name: "chili powder", quantity: 3, unit: "tbsp" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "chicken broth", quantity: 4, unit: "cups", notes: "low sodium" },
    ],
    stepLines: [
      {
        title: "Brown turkey with aromatics",
        instruction:
          "In a large skillet over medium-high heat, brown ground turkey 8–10 minutes, breaking into fine crumbles until no pink remains and edges look lightly golden.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Sweat onion and pepper",
        instruction:
          "Add onion and bell pepper to the skillet. Cook 6–8 minutes, stirring, until softened and onion turns translucent at the edges.",
        minutes: 8,
      },
      {
        title: "Bloom spices and tomato paste",
        instruction:
          "Stir in garlic, chili powder, cumin, paprika, and tomato paste. Cook 2 minutes until paste darkens and spices smell toasty, not raw.",
        minutes: 2,
      },
      {
        title: "Transfer to crock and simmer",
        instruction:
          "Scrape turkey mixture into a 8-quart slow cooker. Add beans, tomatoes, and broth. Stir, cover, cook on low 4–6 hours until chili is thick and flavors melded.",
        heatLevel: "low",
      },
      {
        title: "Adjust seasoning at the line",
        instruction:
          "Skim excess fat if needed. Taste and adjust salt. Chili should coat the back of a spoon and beans should stay whole, not mushy.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 365, protein: 35, carbs: 38, fats: 9, fiber: 12 },
    proTips: [
      "A splash of apple cider vinegar at the end brightens long-simmered chili.",
      "Double beans if feeding vegetarian crew—turkey can be omitted in half the pot.",
      "Freeze flat quart bags for emergency backup meals on busy weeks.",
    ],
    tonightSpread: [
      "Cornbread squares baked in a sheet pan.",
      "Shredded iceberg, sour cream, and hot sauce at a topping station.",
    ],
    leftovers: [
      "Chili over baked potatoes for a loaded second-day lunch.",
      "Reduce leftover chili and use as nacho topping with melted cheese.",
    ],
    equipment: ["8-quart slow cooker", "Large skillet", "8-oz ladle"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "sheet-pan-chicken-fajitas-lite",
      title: "Sheet Pan Chicken Fajitas Lite",
      subtitle: "Charred peppers and onions with spiced chicken strips—no heavy oil",
      protein: "chicken",
      cuisine: "Mexican",
      mealFormat: "sheet_pan",
      hook: "Fajita night without the flat-top mess",
      prep: 20,
      cook: 22,
      difficulty: "easy",
      sourceId: "st-04",
    }),
    description:
      "Chicken breast strips roast with tri-color bell peppers and red onion on two sheet pans. Warm tortillas and lime finish the line.",
    whyCrewsLikeIt:
      "Build-your-own format keeps everyone happy. Less grease than traditional fajitas but still delivers char and smoke from a hot oven.",
    mealPrepNotes:
      "Slice peppers and onion into uniform strips for even roasting. Marinate chicken up to 4 hours in the walk-in.",
    stationWorkflow: [
      "Broil the last 2 minutes if you want more char without overcooking lean breast strips.",
      "Keep tortillas wrapped in foil in a low oven so they stay pliable at the line.",
      "Portion chicken and veg into baking dishes for fast assembly during a short dinner window.",
    ],
    ingredients: [
      { name: "chicken breast", quantity: 4, unit: "lb", notes: "cut into ½-inch strips" },
      { name: "red bell pepper", quantity: 3, unit: "whole", notes: "sliced" },
      { name: "green bell pepper", quantity: 3, unit: "whole", notes: "sliced" },
      { name: "yellow bell pepper", quantity: 2, unit: "whole", notes: "sliced" },
      { name: "red onion", quantity: 2, unit: "large", notes: "sliced into half-moons" },
      { name: "lime juice", quantity: 0.25, unit: "cup", notes: "fresh" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "chili powder", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 1.5, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp" },
      { name: "garlic powder", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Heat oven and mix spice blend",
        instruction:
          "Heat oven to 425°F. Combine chili powder, cumin, paprika, garlic powder, and salt in a small bowl until evenly blended.",
        minutes: 3,
      },
      {
        title: "Season chicken and vegetables",
        instruction:
          "Toss chicken strips with half the spice blend, lime juice, and 2 tbsp oil. Toss peppers and onion with remaining spice and 1 tbsp oil until coated.",
        minutes: 10,
      },
      {
        title: "Spread on sheet pans",
        instruction:
          "Divide chicken and vegetables across two parchment-lined half-sheets in a single layer. Strips should not overlap or they will steam instead of roast.",
        minutes: 5,
      },
      {
        title: "Roast until chicken is cooked",
        instruction:
          "Roast 18–22 minutes, stirring once halfway, until chicken reads 165°F and pepper edges blister and char lightly.",
        minutes: 22,
        heatLevel: "high",
      },
      {
        title: "Rest and serve with warm tortillas",
        instruction:
          "Rest 3 minutes off heat. Vegetables should still have bite; chicken should be juicy when sliced, not chalky in the center.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 320, protein: 38, carbs: 18, fats: 11, fiber: 4 },
    proTips: [
      "Cut chicken uniform so thin ends do not dry before thick pieces finish.",
      "A cast-iron under the sheet pan boosts bottom char if your oven runs cool.",
      "Offer Greek yogurt instead of sour cream for a lighter topping that still cools spice.",
    ],
    tonightSpread: [
      "Warm flour or corn tortillas in foil.",
      "Pico de gallo, shredded lettuce, and light shredded cheese at the line.",
    ],
    leftovers: [
      "Fajita filling in breakfast burritos with scrambled eggs.",
      "Toss leftovers over romaine for a taco salad with crushed baked tortilla chips.",
    ],
    equipment: ["Two half-sheet pans", "Instant-read thermometer"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-sausage-egg-muffins",
      title: "Turkey Sausage Egg Muffins",
      subtitle: "Grab-and-go protein cups with spinach and bell pepper for shift breakfast",
      protein: "turkey",
      cuisine: "American",
      mealFormat: "breakfast",
      hook: "Bake 24 muffins before the crew rolls out—no stovetop babysitting",
      prep: 20,
      cook: 22,
      difficulty: "easy",
      sourceId: "st-06",
    }),
    description:
      "Lean turkey sausage browns with spinach and diced bell pepper, then bakes in muffin tins with eggs and a touch of cheddar for portable morning protein.",
    whyCrewsLikeIt:
      "Hands-free breakfast that survives a delayed alarm. Each muffin packs protein without the grease of traditional breakfast sandwiches.",
    mealPrepNotes:
      "Bake Sunday for Monday shift. Cool completely before storing in labeled containers. Reheat 45 seconds per muffin.",
    stationWorkflow: [
      "Use two 12-cup muffin tins or one 24-cup commercial tin for even batch timing.",
      "Spray tins generously—egg sticks badly on rushed cleanup nights.",
      "Line a sheet pan under tins to catch overflow and protect the oven floor.",
    ],
    ingredients: [
      { name: "lean turkey breakfast sausage", quantity: 1.5, unit: "lb", notes: "casings removed" },
      { name: "large eggs", quantity: 18, unit: "whole" },
      { name: "egg whites", quantity: 2, unit: "cups" },
      { name: "fresh spinach", quantity: 4, unit: "cups", notes: "chopped" },
      { name: "red bell pepper", quantity: 1, unit: "large", notes: "finely diced" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "finely diced" },
      { name: "sharp cheddar cheese", quantity: 1.5, unit: "cups", notes: "shredded" },
      { name: "garlic cloves", quantity: 3, unit: "cloves", notes: "minced" },
      { name: "kosher salt", quantity: 1, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Preheat and brown sausage",
        instruction:
          "Heat oven to 375°F. Cook turkey sausage in a skillet over medium heat 8–10 minutes, crumbling until fully browned and no pink remains.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        title: "Wilt spinach and soften pepper",
        instruction:
          "Add onion, bell pepper, and garlic to the skillet. Cook 4 minutes until softened. Stir in spinach until wilted and moisture mostly evaporates.",
        minutes: 5,
      },
      {
        title: "Whisk egg base",
        instruction:
          "Whisk whole eggs, egg whites, salt, and pepper in a large bowl until frothy and uniform in color with no streaks of yolk.",
        minutes: 3,
      },
      {
        title: "Fill muffin cups",
        instruction:
          "Divide sausage-vegetable mix among 24 greased muffin cups. Top each with shredded cheddar. Pour egg mixture evenly until cups are ¾ full.",
        minutes: 8,
      },
      {
        title: "Bake until set",
        instruction:
          "Bake 20–24 minutes until centers are puffed and firm to the touch, not jiggly. A knife inserted in center should come out clean.",
        minutes: 22,
        heatLevel: "medium",
      },
    ],
    nutrition: { calories: 195, protein: 18, carbs: 4, fats: 11, fiber: 1 },
    proTips: [
      "Cool muffins on a rack so bottoms do not steam soggy in the tin.",
      "Add hot sauce to the egg mix for crews who want morning heat without extra dishes.",
      "Freeze individually wrapped; thaw overnight in the walk-in for backup breakfasts.",
    ],
    tonightSpread: [
      "Fresh fruit platter and coffee for a full morning line.",
      "Whole-grain English muffins for crew who want a bread base.",
    ],
    leftovers: [
      "Crumble muffins into a breakfast burrito with salsa.",
      "Chop and toss into a hash with diced potatoes and hot sauce.",
    ],
    equipment: ["Two 12-cup muffin tins", "Large skillet", "Mixing bowls"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lemon-garlic-shrimp-pasta",
      title: "Lemon Garlic Shrimp Pasta",
      subtitle: "Fast skillet pasta with parsley, capers, and peeled shrimp",
      protein: "shrimp",
      cuisine: "Italian-American",
      mealFormat: "pasta",
      hook: "Restaurant-style pasta in under 30 minutes after a late call",
      prep: 15,
      cook: 18,
      difficulty: "medium",
      sourceId: "st-07",
    }),
    description:
      "Large shrimp sauté with garlic and red pepper flakes, then tossed with whole-wheat linguine, lemon, capers, and parsley. Built for two large skillets on the station range.",
    whyCrewsLikeIt:
      "Feels indulgent but stays lean. Comes together fast when the crew is hungry and the clock is short.",
    mealPrepNotes:
      "Peel and devein shrimp ahead; keep on ice. Pre-measure pasta water salt and lemon juice in squeeze bottles.",
    stationWorkflow: [
      "Boil pasta in the biggest pot available—crowded pasta water returns to boil slowly.",
      "Finish shrimp in two skillets so they sear rather than stew in their own liquid.",
      "Toss pasta off heat so shrimp stay tender and garlic does not scorch.",
    ],
    ingredients: [
      { name: "large shrimp", quantity: 3, unit: "lb", notes: "peeled and deveined, 16–20 count" },
      { name: "whole-wheat linguine", quantity: 2, unit: "lb" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "thinly sliced" },
      { name: "lemon", quantity: 3, unit: "whole", notes: "zested and juiced" },
      { name: "extra-virgin olive oil", quantity: 0.33, unit: "cup" },
      { name: "unsalted butter", quantity: 4, unit: "tbsp" },
      { name: "capers", quantity: 0.25, unit: "cup", notes: "drained" },
      { name: "fresh parsley", quantity: 0.75, unit: "cup", notes: "chopped" },
      { name: "red pepper flakes", quantity: 0.5, unit: "tsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Boil pasta in salted water",
        instruction:
          "Bring a large pot of water to a rolling boil with 2 tbsp salt. Cook linguine 9–11 minutes until al dente with a slight firm bite at the center.",
        minutes: 11,
        heatLevel: "high",
      },
      {
        title: "Sear shrimp quickly",
        instruction:
          "Heat olive oil in two large skillets over medium-high. Sear shrimp 1–2 minutes per side until pink and curled, not rubbery. Work in batches.",
        minutes: 6,
        heatLevel: "medium-high",
      },
      {
        title: "Build lemon garlic sauce",
        instruction:
          "Reduce heat to medium. Add butter and garlic to skillets; cook 45 seconds until fragrant. Add lemon zest, juice, capers, and pepper flakes.",
        minutes: 2,
      },
      {
        title: "Toss pasta with shrimp",
        instruction:
          "Add drained pasta with 1 cup pasta water. Toss 2–3 minutes until sauce emulsifies and coats noodles with a silky gloss, not a pool of oil.",
        minutes: 3,
      },
      {
        title: "Finish with parsley and serve",
        instruction:
          "Fold in parsley off heat. Shrimp should be opaque throughout; pasta should slide on the plate without clumping.",
        minutes: 2,
      },
    ],
    nutrition: { calories: 445, protein: 36, carbs: 52, fats: 12, fiber: 6 },
    proTips: [
      "Pat shrimp bone-dry before searing—wet shrimp steam instead of caramelize.",
      "Reserve extra pasta water; whole-wheat pasta absorbs more liquid than white.",
      "Serve immediately—this dish doesn't hold up well if it sits around waiting to be served.",
    ],
    tonightSpread: [
      "Simple mixed green salad with balsamic vinaigrette.",
      "Garlic bread made from split baguette under the broiler.",
    ],
    leftovers: [
      "Reheat gently with splash of water; avoid microwave on high or shrimp turn rubbery.",
      "Chill leftovers into a next-day pasta salad with cherry tomatoes.",
    ],
    equipment: ["Large stock pot", "Two 12-inch skillets", "Tongs"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "baked-turkey-meatball-marinara",
      title: "Baked Turkey Meatball Marinara",
      subtitle: "Oven-baked lean meatballs in slow-simmered tomato basil sauce",
      protein: "turkey",
      cuisine: "Italian-American",
      mealFormat: "bake",
      hook: "Crowd-size meatballs without standing at the fryer",
      prep: 25,
      cook: 28,
      difficulty: "medium",
      sourceId: "st-08",
    }),
    description:
      "Turkey meatballs with parmesan and herbs bake on sheet pans, then simmer in a big pot of marinara. Serve over whole-wheat spaghetti or polenta.",
    whyCrewsLikeIt:
      "Comfort food that feels like Sunday dinner. Baking keeps grease down and makes portioning predictable for eight hungry firefighters.",
    mealPrepNotes:
      "Roll meatballs uniform golf-ball size for even baking. Sauce can simmer 2 hours ahead on low and hold.",
    stationWorkflow: [
      "Bake meatballs on parchment so they release cleanly and brown on all sides with one flip.",
      "Simmer sauce in the widest pot on the range for fast meatball absorption.",
      "Hold sauced meatballs in a baking dish at 165°F—do not boil or turkey dries out.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 3, unit: "lb" },
      { name: "plain breadcrumbs", quantity: 1.5, unit: "cups" },
      { name: "Parmesan cheese", quantity: 1, unit: "cup", notes: "grated" },
      { name: "large eggs", quantity: 3, unit: "whole" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "crushed tomatoes", quantity: 2, unit: "cans", notes: "28 oz", group: "Marinara sauce" },
      { name: "tomato paste", quantity: 3, unit: "tbsp", group: "Marinara sauce" },
      { name: "fresh basil leaves", quantity: 1, unit: "cup", notes: "torn", group: "Marinara sauce" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "finely diced" },
      { name: "dried Italian seasoning", quantity: 2, unit: "tbsp" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix and shape meatballs",
        instruction:
          "Combine turkey, breadcrumbs, parmesan, eggs, parsley, half the garlic, Italian seasoning, and 1 tsp salt. Roll 48 golf-ball-size meatballs without overworking the mix.",
        minutes: 15,
      },
      {
        title: "Bake meatballs until set",
        instruction:
          "Arrange on two parchment-lined half-sheets. Bake at 400°F for 18–22 minutes until internal temp reaches 165°F and exteriors look lightly browned.",
        minutes: 20,
        heatLevel: "medium-high",
      },
      {
        title: "Start marinara base",
        instruction:
          "Sauté onion in olive oil over medium heat 6 minutes until soft. Add remaining garlic and tomato paste; cook 2 minutes until paste deepens to brick red.",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Simmer sauce and add meatballs",
        instruction:
          "Pour in crushed tomatoes with 1 cup water. Simmer 15 minutes, stirring occasionally, until sauce thickens enough to coat a spoon. Add baked meatballs.",
        minutes: 15,
        heatLevel: "medium-low",
      },
      {
        title: "Rest and portion at the line",
        instruction:
          "Simmer gently 10 more minutes so meatballs absorb sauce. Meatballs should feel springy, not dense, when cut open.",
        minutes: 10,
      },
    ],
    nutrition: { calories: 420, protein: 38, carbs: 32, fats: 16, fiber: 5 },
    proTips: [
      "A panade of breadcrumbs and milk (2 tbsp per lb) keeps turkey meatballs juicy.",
      "Flash meatballs under broiler 2 minutes before saucing for extra browning.",
      "Freeze half the batch sauced for an emergency pasta night.",
    ],
    tonightSpread: [
      "Whole-wheat spaghetti with grated parmesan at the line.",
      "Garlic sautéed green beans with lemon.",
    ],
    leftovers: [
      "Meatball subs on whole-grain rolls with melted mozzarella.",
      "Meatball soup: slice and simmer in chicken broth with orzo.",
    ],
    equipment: ["Two half-sheet pans", "Large Dutch oven or stock pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "cottage-cheese-protein-pasta",
      title: "Cottage Cheese Protein Pasta Bake",
      subtitle: "High-protein baked penne with marinara and melted mozzarella",
      protein: "mixed",
      cuisine: "Italian-American",
      mealFormat: "pasta",
      hook: "Creamy baked pasta without a quart of heavy cream",
      prep: 20,
      cook: 35,
      difficulty: "medium",
      sourceId: "st-09",
    }),
    description:
      "Blended cottage cheese creates a high-protein sauce layered with penne, marinara, and part-skim mozzarella. Bakes in a deep baking dish for easy hold.",
    whyCrewsLikeIt:
      "Mac-and-cheese energy with better macros. One pan feeds the whole hall and slices into clean portions.",
    mealPrepNotes:
      "Blend cottage cheese smooth ahead of time. Undercook penne by 2 minutes—it finishes in the oven.",
    stationWorkflow: [
      "Use a 4-inch deep baking dish so the bake holds heat without drying at the edges.",
      "Tent foil first 20 minutes, uncover last 10 for golden cheese without overcooking pasta.",
      "Rest pan 10 minutes before cutting so layers set and portions stay intact.",
    ],
    ingredients: [
      { name: "whole-wheat penne", quantity: 2, unit: "lb" },
      { name: "low-fat cottage cheese", quantity: 3, unit: "cups" },
      { name: "marinara sauce", quantity: 4, unit: "cups" },
      { name: "part-skim mozzarella", quantity: 3, unit: "cups", notes: "shredded" },
      { name: "Parmesan cheese", quantity: 1, unit: "cup", notes: "grated" },
      { name: "large eggs", quantity: 2, unit: "whole" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "dried basil", quantity: 1, unit: "tbsp" },
      { name: "dried oregano", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Par-cook penne",
        instruction:
          "Boil penne in salted water 7–8 minutes until flexible but still firm in the center. Drain well so excess water does not thin the bake.",
        minutes: 8,
        heatLevel: "high",
      },
      {
        title: "Blend cottage cheese sauce",
        instruction:
          "Blend cottage cheese, eggs, garlic, basil, oregano, salt, and pepper until completely smooth with no curd texture remaining.",
        minutes: 5,
      },
      {
        title: "Layer pasta and sauces",
        instruction:
          "Toss penne with cottage cheese mixture and half the marinara in a large bowl until evenly coated and glossy.",
        minutes: 5,
      },
      {
        title: "Assemble and top with cheese",
        instruction:
          "Spread half the pasta in a greased baking dish. Drizzle remaining marinara, then top with remaining pasta and mozzarella-parmesan blend.",
        minutes: 5,
      },
      {
        title: "Bake until bubbling",
        instruction:
          "Bake at 375°F for 30–35 minutes until edges bubble and cheese turns golden brown with a few crisp spots on top.",
        minutes: 35,
        heatLevel: "medium",
      },
    ],
    nutrition: { calories: 465, protein: 32, carbs: 58, fats: 14, fiber: 7 },
    proTips: [
      "Blend cottage cheese while cold—warm curds resist smoothing.",
      "Add sautéed spinach or roasted red peppers for color and fiber without changing bake time.",
      "Portion with a square cutter for uniform macros across the crew.",
    ],
    tonightSpread: [
      "Caesar salad with light dressing.",
      "Steamed broccoli with lemon and chili flakes.",
    ],
    leftovers: [
      "Reheat squares covered with foil; add splash of marinara to restore moisture.",
      "Cut cold leftovers into meal-prep cubes for shift lunches.",
    ],
    equipment: ["Blender", "Deep baking dish", "Large stock pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "honey-garlic-chicken-rice-bowls",
      title: "Honey Garlic Chicken Rice Bowls",
      subtitle: "Skillet glazed chicken thighs over jasmine rice with steamed broccoli",
      protein: "chicken",
      cuisine: "Asian-American",
      mealFormat: "bowl",
      hook: "Sweet-savory bowl line that scales on two burners",
      prep: 20,
      cook: 25,
      difficulty: "medium",
      sourceId: "st-10",
    }),
    description:
      "Boneless chicken thighs sear in a honey-garlic-soy glaze, then serve over fluffy jasmine rice with steamed broccoli and sesame seeds.",
    whyCrewsLikeIt:
      "Takeout-style bowls with less sodium and more protein. A build-your-own line keeps service fast when everyone hits the kitchen at once.",
    mealPrepNotes:
      "Cook rice in a rice cooker while chicken sears. Mix glaze in a jar and shake before adding to the pan.",
    stationWorkflow: [
      "Set up bowl line: rice base, chicken, broccoli, sauce drizzle, sesame and green onion.",
      "Keep glaze warm in a squeeze bottle for portion control and consistent sweetness.",
      "Use two skillets so all thighs finish searing at the same time.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb", notes: "trimmed" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "broccoli crowns", quantity: 2, unit: "lb", notes: "cut into florets" },
      { name: "low-sodium soy sauce", quantity: 0.5, unit: "cup" },
      { name: "honey", quantity: 0.33, unit: "cup" },
      { name: "rice vinegar", quantity: 3, unit: "tbsp" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "grated" },
      { name: "sesame oil", quantity: 2, unit: "tbsp" },
      { name: "cornstarch", quantity: 2, unit: "tbsp" },
      { name: "green onions", quantity: 6, unit: "whole", notes: "sliced" },
      { name: "toasted sesame seeds", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Cook rice and steam broccoli",
        instruction:
          "Cook jasmine rice per package directions. Steam broccoli 4–5 minutes until bright green and tender-crisp, not olive drab or mushy.",
        minutes: 20,
      },
      {
        title: "Sear chicken thighs",
        instruction:
          "Heat 1 tbsp oil in two skillets over medium-high. Sear thighs 4–5 minutes per side until golden and internal temp reaches 165°F.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        title: "Prepare honey garlic glaze",
        instruction:
          "Whisk soy sauce, honey, vinegar, garlic, ginger, sesame oil, and cornstarch until smooth with no starch lumps at the bottom.",
        minutes: 3,
      },
      {
        title: "Glaze chicken in pan",
        instruction:
          "Pour glaze over seared thighs. Simmer 3–4 minutes, turning often, until sauce thickens to a glossy coat that clings to the meat.",
        minutes: 4,
        heatLevel: "medium",
      },
      {
        title: "Build bowls at the line",
        instruction:
          "Slice chicken and portion over rice with broccoli. Drizzle extra glaze, top with green onion and sesame seeds.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 520, protein: 40, carbs: 58, fats: 14, fiber: 4 },
    proTips: [
      "Do not crowd the pan—searing in batches keeps the glaze from turning soupy.",
      "Use low-sodium soy so the honey sweetness does not taste cloying.",
      "Offer sriracha at the line for heat without changing the base recipe.",
    ],
    tonightSpread: [
      "Quick miso soup cups for a light starter.",
      "Cucumber salad with rice vinegar and sesame.",
    ],
    leftovers: [
      "Pack rice and chicken together; refresh with microwave and extra soy-honey drizzle.",
      "Shred chicken into fried rice next shift with frozen peas and carrots.",
    ],
    equipment: ["Rice cooker", "Two 12-inch skillets", "Steamer basket"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "white-bean-chicken-chili",
      title: "White Bean Chicken Chili",
      subtitle: "Creamy cannellini chili with green chiles and shredded rotisserie-style chicken",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "soup",
      hook: "High-protein soup that ladles fast and holds hot all evening",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "st-11",
    }),
    description:
      "Shredded chicken simmers with cannellini beans, green chiles, cumin, and a touch of cream cheese for body. Cup-and-bowl service for the whole crew.",
    whyCrewsLikeIt:
      "Lighter than red chili but still hearty. Perfect after cold-weather calls when the crew wants something warm and sippable.",
    mealPrepNotes:
      "Poach chicken breasts ahead and shred. Chili thickens as it rests—add broth when reheating.",
    stationWorkflow: [
      "Keep pot on back burner at gentle simmer, not rolling boil, so cream cheese stays smooth.",
      "Offer crushed tortilla chips and cilantro at a side station to keep soup texture crisp.",
      "Use 12-oz bowls as default portion—crew can come back for seconds without draining the pot.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 2.5, unit: "lb" },
      { name: "cannellini beans", quantity: 4, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "green chiles", quantity: 2, unit: "cans", notes: "4 oz, diced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "chicken broth", quantity: 6, unit: "cups", notes: "low sodium" },
      { name: "cream cheese", quantity: 8, unit: "oz", notes: "light, cubed" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "lime juice", quantity: 3, unit: "tbsp", notes: "fresh" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "cilantro", quantity: 0.5, unit: "cup", notes: "chopped" },
    ],
    stepLines: [
      {
        title: "Poach and shred chicken",
        instruction:
          "Simmer chicken breasts in 4 cups broth 15–18 minutes until internal temp hits 165°F. Rest 5 minutes, then shred into bite-size strands with two forks.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        title: "Sweat onion and garlic",
        instruction:
          "In a large pot, sauté onion in 1 tbsp oil over medium heat 5–6 minutes until translucent. Add garlic and cumin; cook 1 minute until fragrant.",
        minutes: 6,
      },
      {
        title: "Simmer beans and chiles",
        instruction:
          "Add remaining broth, beans, green chiles, oregano, and shredded chicken. Bring to a gentle simmer and cook 15 minutes so flavors meld.",
        minutes: 15,
        heatLevel: "medium-low",
      },
      {
        title: "Stir in cream cheese",
        instruction:
          "Reduce heat to low. Whisk in cream cheese cubes until fully melted and chili looks creamy with no white streaks remaining.",
        minutes: 5,
      },
      {
        title: "Finish with lime and serve",
        instruction:
          "Stir in lime juice and cilantro. Chili should coat a ladle lightly; adjust salt before cup service at the line.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 385, protein: 42, carbs: 35, fats: 10, fiber: 9 },
    proTips: [
      "Blend one can of beans for extra body without adding more cream cheese.",
      "Hold lime and cilantro off the pot until serving so bright flavors stay fresh.",
      "Rotisserie chicken works in a pinch—add at the end to avoid stringy overcooked breast.",
    ],
    tonightSpread: [
      "Cornbread muffins baked in a muffin tin.",
      "Shredded Monterey Jack and sliced jalapeños at the line.",
    ],
    leftovers: [
      "Thicken leftovers into a dip with extra cheese for game-day snack.",
      "Freeze in quart containers; thin with broth when reheating.",
    ],
    equipment: ["8-quart stock pot", "Immersion blender (optional)"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),
];
