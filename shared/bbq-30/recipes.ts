import { bbqRecipe, manifestEntry } from "./recipe-build.js";
import type { BbqRecipe } from "./types.js";

export const BBQ_30_RECIPES: BbqRecipe[] = [
  bbqRecipe({
    manifest: manifestEntry({
      slug: "honey-chipotle-chicken-thighs",
      title: "Honey Chipotle Grilled Chicken Thighs",
      subtitle: "Sticky glaze, charred edges, and a tray of lime slaw for ten",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "grill",
      pools: ["bbq", "chicken", "quick"],
      hook: "Fast thighs that hold warm and still eat like BBQ",
      prep: 20,
      cook: 25,
      difficulty: "easy",
    }),
    description:
      "Boneless thighs get a dry rub, then a honey-chipotle glaze that caramelizes over hot grates. Served with lime slaw and toasted buns so the crew can go plate or sandwich.",
    whyCrewsLikeIt:
      "Thighs forgive timing. The glaze is loud without being messy, and you can hold the chicken in a warm pan between calls without drying it out.",
    stationTimingNotes:
      "Rub can be applied early shift. Grill in two batches if needed. Hold finished thighs covered at 170°F up to 45 minutes; re-glaze right before service.",
    allergyNotes:
      "Contains honey. Optional buns contain gluten. Keep slaw dairy-free by using mayo-free dressing option.",
    equipment: ["grill", "instant-read thermometer", "tongs", "sheet pans", "mixing bowls", "basting brush"],
    ingredients: [
      { name: "boneless skinless chicken thighs", quantity: 5, unit: "lb" },
      { name: "kosher salt", quantity: 2.5, unit: "tbsp" },
      { name: "brown sugar", quantity: 3, unit: "tbsp" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "chili powder", quantity: 1.5, unit: "tbsp" },
      { name: "garlic powder", quantity: 2, unit: "tsp" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "neutral oil", quantity: 3, unit: "tbsp" },
      { name: "honey", quantity: 0.5, unit: "cup" },
      { name: "chipotle in adobo", quantity: 2, unit: "tbsp", notes: "minced, plus 1 tbsp sauce" },
      { name: "apple cider vinegar", quantity: 2, unit: "tbsp" },
      { name: "lime", quantity: 2, unit: "whole", notes: "zest + juice" },
      { name: "shredded cabbage mix", quantity: 10, unit: "cups" },
      { name: "green onions", quantity: 6, unit: "whole", notes: "sliced" },
      { name: "cilantro", quantity: 1, unit: "cup", notes: "chopped (optional)" },
      { name: "buns", quantity: 10, unit: "whole", notes: "optional for sandwiches" },
    ],
    stepLines: [
      {
        title: "Season the thighs",
        instruction:
          "Pat thighs dry. Toss with oil, salt, brown sugar, paprika, chili powder, garlic powder, and cumin until evenly coated. Let sit 15 minutes while you heat the grill.",
        minutes: 15,
      },
      {
        title: "Build the honey-chipotle glaze",
        instruction:
          "Whisk honey, minced chipotle + adobo sauce, vinegar, and half the lime juice. Pour half into a small bowl for basting; keep the rest clean for finishing.",
        minutes: 5,
      },
      {
        title: "Grill hot and fast",
        instruction:
          "Heat grill to medium-high (about 450°F). Grill thighs 4–6 minutes per side until well-marked and the thickest piece hits 170°F. Move flare-ups away from the fire instead of extinguishing them.",
        minutes: 15,
        heatLevel: "high",
      },
      {
        title: "Glaze and set",
        instruction:
          "During the last 2 minutes, brush with the basting glaze and let it set sticky. Pull to a tray, brush lightly with the reserved clean glaze, and rest 5 minutes before slicing or serving whole.",
        minutes: 7,
      },
      {
        title: "Make the lime slaw",
        instruction:
          "Toss cabbage with remaining lime juice, lime zest, green onions, and cilantro. Season with a pinch of salt. If you want creamy slaw, add 1/3 cup mayo and 1 tbsp vinegar.",
        minutes: 6,
      },
      {
        title: "Tonight’s board",
        instruction:
          "Serve thighs family-style with slaw and buns. Put extra glaze on the table. Call it: ‘Honey chipotle chicken, slaw, and buns—grab and go.’",
        minutes: 2,
      },
      {
        title: "Leftovers",
        instruction:
          "Cool chicken fast. Reheat covered in a 325°F oven until hot, then hit with a fresh brush of glaze. Slaw keeps 24 hours; drain before serving.",
        minutes: 4,
      },
    ],
    proTips: [
      "Thighs are done at 170°F—don’t stop at 165°F if you want tender, not rubbery.",
      "Keep one bowl of glaze clean for finishing so it never touches raw chicken.",
      "If the glaze starts to burn, shift to indirect heat for the final minute.",
    ],
    tonightSpread: [
      "Chicken thighs on a tray with extra glaze, slaw in a bowl, buns toasted on the top rack.",
      "Knife + tongs at the line so people can go whole thigh or sliced sandwich.",
    ],
    leftovers: [
      "Chop and fold into quesadillas with pepper jack.",
      "Dice and toss into a rice bowl with extra slaw and hot sauce.",
    ],
    substitutions: [
      "Swap honey for maple syrup (same amount).",
      "No chipotle? Use 2 tsp smoked paprika + 1 tsp cayenne + 1 tbsp ketchup for body.",
    ],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
    relatedSlugs: ["bbq-chicken-sliders", "jerk-chicken", "bbq-chicken-bowls"],
  }),

  bbqRecipe({
    manifest: manifestEntry({
      slug: "brisket-style-beef-sandwiches-au-jus",
      title: "Brisket-Style Beef Sandwiches",
      subtitle: "Smoky sliced roast, au jus dip, and pickled onions for ten",
      protein: "beef",
      cuisine: "American",
      mealFormat: "sandwich",
      pools: ["bbq", "beef", "comfort"],
      hook: "Brisket vibes without an overnight cook",
      prep: 25,
      cook: 210,
      difficulty: "medium",
    }),
    description:
      "Chuck roast gets a BBQ-forward rub and smoke, then finishes wrapped until slice-tender. Serve on toasted rolls with a peppery au jus and quick pickled onions.",
    whyCrewsLikeIt:
      "It scratches the brisket itch with a timeline that fits a shift. Slices clean, dips well, and holds hot without turning dry.",
    stationTimingNotes:
      "Smoke early. Once wrapped, it can finish in the oven. Hold the roast wrapped in a warm box, slice right before service.",
    allergyNotes:
      "Rolls contain gluten. Au jus may contain Worcestershire (check fish).",
    equipment: ["smoker", "foil", "instant-read thermometer", "sharp knife", "saucepan", "sheet pans"],
    ingredients: [
      { name: "beef chuck roast", quantity: 8, unit: "lb" },
      { name: "kosher salt", quantity: 2.5, unit: "tbsp" },
      { name: "black pepper", quantity: 2.5, unit: "tbsp" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "granulated garlic", quantity: 2, unit: "tbsp" },
      { name: "brown sugar", quantity: 2, unit: "tbsp" },
      { name: "yellow mustard", quantity: 0.25, unit: "cup", notes: "binder" },
      { name: "beef broth", quantity: 6, unit: "cups" },
      { name: "Worcestershire sauce", quantity: 2, unit: "tbsp" },
      { name: "apple cider vinegar", quantity: 0.5, unit: "cup" },
      { name: "red onion", quantity: 1, unit: "whole", notes: "thin-sliced" },
      { name: "sugar", quantity: 2, unit: "tbsp" },
      { name: "cracked black pepper", quantity: 1, unit: "tsp" },
      { name: "hoagie rolls", quantity: 10, unit: "whole" },
    ],
    stepLines: [
      { title: "Quick pickle the onions", instruction: "Heat vinegar with sugar and pepper until dissolved. Pour over sliced onion. Let sit 30 minutes.", minutes: 30 },
      { title: "Rub the roast", instruction: "Coat roast with mustard. Mix salt, pepper, paprika, garlic, and sugar; rub all sides. Heat smoker to 275°F.", minutes: 15 },
      { title: "Smoke to color", instruction: "Smoke 2–2.5 hours until bark is dark and internal hits ~165°F.", minutes: 150 },
      { title: "Wrap and finish", instruction: "Wrap tightly in foil. Finish at 275°F until probe-tender and 200–205°F, about 60–90 minutes.", minutes: 75 },
      { title: "Au jus", instruction: "Simmer broth with Worcestershire and a pinch of pepper. Taste and salt lightly; keep hot.", minutes: 10 },
      { title: "Slice and serve", instruction: "Rest wrapped 20 minutes. Slice against the grain. Toast rolls. Tonight’s board: sandwiches + au jus cups + pickled onions.", minutes: 25 },
      { title: "Leftovers", instruction: "Chop into tacos or hash. Reheat slices in hot au jus so they stay juicy.", minutes: 5 },
    ],
    proTips: ["Chuck slices best after a short rest—don’t rush the knife.", "Use the au jus as the reheat method.", "If slices shred, it’s overcooked—serve as ‘chopped beef sandwiches’."],
    tonightSpread: ["Sliced beef on a tray, au jus in a pot, pickled onions, toasted rolls."],
    leftovers: ["Chopped beef nachos.", "Beef and egg breakfast burritos."],
    substitutions: ["No smoker? Roast covered at 300°F with 1 tsp smoked paprika extra; finish same temps."],
    cleanupDifficulty: "medium",
  }),

  bbqRecipe({
    manifest: manifestEntry({
      slug: "hot-honey-grilled-sausage-peppers",
      title: "Hot Honey Grilled Sausage & Peppers",
      subtitle: "Charred links, sweet heat, and toasted buns for ten",
      protein: "pork",
      cuisine: "American",
      mealFormat: "sandwich",
      pools: ["bbq", "quick", "handheld"],
      hook: "Weeknight-fast BBQ energy with zero stress",
      prep: 15,
      cook: 25,
      difficulty: "easy",
    }),
    description:
      "Sausage links grill alongside peppers and onions, then get tossed with hot honey and vinegar so they taste like BBQ without needing a smoker.",
    whyCrewsLikeIt:
      "It’s fast, it’s loud, and it stays good even if you have to hold it. Perfect for a one-cook night.",
    stationTimingNotes:
      "Grill everything, then hold in a covered pan. Toast buns last minute so they don’t steam.",
    allergyNotes: "Buns contain gluten. Check sausage for dairy fillers if needed.",
    equipment: ["grill", "tongs", "sheet pan", "knife", "mixing bowl"],
    ingredients: [
      { name: "Italian sausage links", quantity: 10, unit: "links" },
      { name: "bell peppers", quantity: 6, unit: "whole", notes: "sliced" },
      { name: "yellow onions", quantity: 2, unit: "whole", notes: "sliced" },
      { name: "neutral oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 2, unit: "tsp" },
      { name: "honey", quantity: 0.5, unit: "cup" },
      { name: "hot sauce", quantity: 2, unit: "tbsp" },
      { name: "apple cider vinegar", quantity: 1.5, unit: "tbsp" },
      { name: "sub rolls", quantity: 10, unit: "whole" },
    ],
    stepLines: [
      { title: "Heat grill", instruction: "Heat grill to medium-high. Oil grates. Toss peppers/onions with oil, salt, pepper.", minutes: 5 },
      { title: "Grill sausage", instruction: "Grill links 12–15 minutes, turning, until browned and 160°F internal. Move to indirect if flare-ups.", minutes: 15, heatLevel: "high" },
      { title: "Char the veg", instruction: "Grill peppers/onions in a basket or on a plancha until softened and charred, 8–10 minutes.", minutes: 10 },
      { title: "Hot honey glaze", instruction: "Whisk honey, hot sauce, and vinegar. Toss sausage and veg in a tray with the glaze.", minutes: 3 },
      { title: "Tonight’s board", instruction: "Toast rolls. Pile sausage + peppers. Put extra hot honey on the table.", minutes: 5 },
      { title: "Leftovers", instruction: "Slice and fold into pasta, or scramble with eggs. Reheat covered so links don’t split.", minutes: 4 },
    ],
    proTips: ["Use a thermometer—sausage looks done before it’s safe.", "Vinegar keeps the honey from tasting flat.", "Toast buns last to keep them from steaming."],
    tonightSpread: ["Sausage tray, peppers/onions tray, buns, hot honey bottle."],
    leftovers: ["Sausage breakfast skillet.", "Sausage pepper subs on garlic bread."],
    substitutions: ["Swap chicken sausage; cook to 165°F."],
    cleanupDifficulty: "medium",
  }),

  bbqRecipe({
    manifest: manifestEntry({
      slug: "carolina-vinegar-pulled-pork",
      title: "Carolina Vinegar Pulled Pork",
      subtitle: "Shoulder smoke, tangy mop sauce, and a slaw bar for ten sandwiches",
      protein: "pork",
      cuisine: "American",
      mealFormat: "bbq",
      pools: ["bbq", "big_crew", "sandwich"],
      hook: "All-day smoke that turns into the easiest line service",
      prep: 25,
      cook: 540,
      difficulty: "medium",
    }),
    description:
      "Pork shoulder rides low and slow, gets mopped with a Carolina vinegar sauce, then pulled into a pan of drippings. Build-your-own sandwiches with slaw and pickles.",
    whyCrewsLikeIt:
      "It feeds a crowd, holds forever, and tastes even better after it rests. Perfect for a crew meal where calls might interrupt the cook.",
    stationTimingNotes:
      "Start early. Once pulled, hold covered at 170°F for 2 hours with a splash of vinegar sauce. If the smoker schedule slips, wrap earlier and finish in the oven.",
    allergyNotes:
      "Vinegar sauce is gluten-free. Buns contain gluten. Mustard optional.",
    equipment: ["smoker", "instant-read thermometer", "foil", "large pan", "heat-proof gloves", "tongs"],
    ingredients: [
      { name: "bone-in pork shoulder", quantity: 10, unit: "lb" },
      { name: "kosher salt", quantity: 4, unit: "tbsp" },
      { name: "black pepper", quantity: 2, unit: "tbsp" },
      { name: "paprika", quantity: 2, unit: "tbsp" },
      { name: "brown sugar", quantity: 3, unit: "tbsp" },
      { name: "garlic powder", quantity: 2, unit: "tsp" },
      { name: "yellow mustard", quantity: 0.25, unit: "cup", notes: "binder" },
      { name: "apple cider vinegar", quantity: 1.5, unit: "cups" },
      { name: "water", quantity: 0.5, unit: "cup" },
      { name: "hot sauce", quantity: 3, unit: "tbsp" },
      { name: "red pepper flakes", quantity: 2, unit: "tsp" },
      { name: "brown sugar", quantity: 2, unit: "tbsp", notes: "for sauce" },
      { name: "kosher salt", quantity: 1, unit: "tsp", notes: "for sauce" },
      { name: "buns", quantity: 12, unit: "whole" },
      { name: "coleslaw mix", quantity: 12, unit: "cups" },
      { name: "dill pickles", quantity: 1, unit: "jar" },
    ],
    stepLines: [
      {
        title: "Season the shoulder",
        instruction:
          "Coat shoulder with mustard binder. Mix salt, pepper, paprika, brown sugar, and garlic powder; rub all over. Let sit 20 minutes while smoker heats.",
        minutes: 20,
      },
      {
        title: "Smoke low and steady",
        instruction:
          "Heat smoker to 250°F. Smoke shoulder fat side up until bark is dark and the internal temp reaches about 165°F, 5–7 hours. Spritz with water if the surface looks dry.",
        minutes: 360,
        heatLevel: "low",
      },
      {
        title: "Mix the vinegar mop",
        instruction:
          "Whisk vinegar, water, hot sauce, flakes, sugar, and salt. Reserve 1/3 cup clean for finishing; use the rest for mopping and pulling.",
        minutes: 5,
      },
      {
        title: "Wrap and finish",
        instruction:
          "Wrap tightly in foil. Return to smoker (or a 275°F oven) until the probe slides in like butter and the internal temp is 203–205°F, about 2–3 hours.",
        minutes: 180,
      },
      {
        title: "Rest, then pull",
        instruction:
          "Rest wrapped 45 minutes. Pour juices into a pan. Pull pork, discarding large fat pieces. Stir in a few ladles of juices plus the reserved clean vinegar sauce to taste.",
        minutes: 60,
      },
      {
        title: "Tonight’s board",
        instruction:
          "Pan of pulled pork, buns, slaw, pickles, and extra vinegar sauce. Call it out on the board so the crew can build fast and get back on shift.",
        minutes: 3,
      },
      {
        title: "Leftovers",
        instruction:
          "Reheat covered with a splash of water or sauce. Use in nachos, tacos, or loaded baked potatoes.",
        minutes: 5,
      },
    ],
    proTips: [
      "If the bark is right, wrap—don’t chase a specific hour count.",
      "Resting is not optional; it keeps pulled pork juicy and easier to shred.",
      "Finishing with a clean sauce gives punch without raw-meat risk.",
    ],
    tonightSpread: [
      "Pulled pork in a hotel pan with ladle, buns stacked, slaw + pickles on ice.",
      "Optional: set out mustard and hot sauce so everyone can tune their sandwich.",
    ],
    leftovers: [
      "Pulled pork quesadillas with cheddar and jalapeños.",
      "BBQ pork fried rice with scallions and scrambled eggs.",
    ],
    substitutions: [
      "No smoker? Use a 275°F oven and add 1 tsp liquid smoke to the vinegar sauce. Finish the same temps.",
      "Swap buns for tortillas and run it as taco night.",
    ],
    cleanupDifficulty: "heavy",
  }),

  // NOTE: Remaining 28 recipes will be added in the next patch chunk.
  bbqRecipe({
    manifest: manifestEntry({
      slug: "smoked-chicken-quarters-white-sauce",
      title: "Smoked Chicken Quarters with White Sauce",
      subtitle: "Alabama-style tangy sauce, char finish, and potato salad for ten",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "bbq",
      pools: ["bbq", "chicken", "big_crew"],
      hook: "Smoke it, sauce it, finish hot — holds well between calls",
      prep: 25,
      cook: 120,
      difficulty: "easy",
    }),
    description:
      "Chicken quarters ride a steady 275°F smoke, then get kissed over hotter heat to tighten the skin. Serve with a punchy white sauce and a tray of potato salad.",
    whyCrewsLikeIt:
      "Quarters are cheap, forgiving, and they feed ten without fuss. White sauce cuts the smoke and keeps the plate from feeling heavy.",
    stationTimingNotes:
      "Season early. Smoke until done, then hold in a covered pan at 170°F. Crisp skin right before service if you have the time.",
    allergyNotes:
      "White sauce contains egg (mayo). Serve sauce on the side. Potato salad contains egg/mustard.",
    equipment: ["smoker", "grill (optional)", "instant-read thermometer", "sheet pans", "mixing bowl"],
    ingredients: [
      { name: "chicken leg quarters", quantity: 10, unit: "pieces", notes: "about 8–10 lb total" },
      { name: "kosher salt", quantity: 3, unit: "tbsp" },
      { name: "black pepper", quantity: 2, unit: "tbsp" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "garlic powder", quantity: 2, unit: "tbsp" },
      { name: "onion powder", quantity: 1, unit: "tbsp" },
      { name: "brown sugar", quantity: 2, unit: "tbsp" },
      { name: "mayonnaise", quantity: 1.25, unit: "cups" },
      { name: "apple cider vinegar", quantity: 0.5, unit: "cup" },
      { name: "lemon juice", quantity: 3, unit: "tbsp" },
      { name: "prepared horseradish", quantity: 2, unit: "tbsp" },
      { name: "Dijon mustard", quantity: 1.5, unit: "tbsp" },
      { name: "cayenne", quantity: 1, unit: "tsp" },
      { name: "Yukon gold potatoes", quantity: 5, unit: "lb" },
      { name: "celery", quantity: 4, unit: "stalks", notes: "diced" },
      { name: "red onion", quantity: 1, unit: "whole", notes: "diced" },
      { name: "dill pickles", quantity: 0.5, unit: "cup", notes: "chopped" },
    ],
    stepLines: [
      {
        title: "Season the quarters",
        instruction:
          "Mix salt, pepper, paprika, garlic, onion powder, and brown sugar. Pat chicken dry and season heavily on all sides. Let sit 15–20 minutes while smoker heats.",
        minutes: 20,
      },
      {
        title: "Smoke steady",
        instruction:
          "Heat smoker to 275°F. Smoke chicken skin-side up until the thickest thigh hits 175–180°F and juices run clear, about 1 hour 45 minutes to 2 hours.",
        minutes: 115,
      },
      {
        title: "Make the white sauce",
        instruction:
          "Whisk mayo, vinegar, lemon juice, horseradish, mustard, cayenne, and a pinch of salt. Chill until service; it tightens up and tastes better cold.",
        minutes: 6,
      },
      {
        title: "Optional crisp finish",
        instruction:
          "If skin needs help, finish chicken over a hot grill (450°F) 2–3 minutes skin-side down. Don’t burn the sugar in the rub—move to indirect if it flares.",
        minutes: 6,
        heatLevel: "high",
      },
      {
        title: "Potato salad (fast tray method)",
        instruction:
          "Boil potatoes in salted water until tender. Drain, cool 10 minutes, then toss with 3/4 cup of the white sauce, celery, onion, and pickles. Salt to taste.",
        minutes: 35,
      },
      {
        title: "Tonight’s board",
        instruction:
          "Tray of smoked quarters, white sauce on the side, potato salad, and extra napkins. Call temps: chicken is pulled at 175–180°F for dark meat tenderness.",
        minutes: 3,
      },
      {
        title: "Leftovers",
        instruction:
          "Pull meat off bones for wraps or quesadillas. Reheat covered in a 325°F oven until hot; keep sauce cold.",
        minutes: 4,
      },
    ],
    proTips: [
      "Dark meat wants higher temps—175–180°F eats tender; 165°F can be chewy.",
      "Sauce stays clean: never brush raw chicken with the serving sauce.",
      "If the skin is rubbery, it needs heat, not time.",
    ],
    tonightSpread: [
      "Chicken tray with tongs; sauce bottle; potato salad in a cold pan on ice.",
    ],
    leftovers: ["White-sauce chicken wraps with pickles.", "Chop into a quick chicken salad."],
    substitutions: ["No horseradish? Use 1 tsp garlic + extra mustard for bite."],
    cleanupDifficulty: "medium",
  }),

  bbqRecipe({
    manifest: manifestEntry({
      slug: "bbq-bacon-cheddar-burgers",
      title: "BBQ Bacon Cheddar Burgers",
      subtitle: "Griddle-seared patties, smoky sauce, and onion rings for ten",
      protein: "beef",
      cuisine: "American",
      mealFormat: "burger",
      pools: ["bbq", "handheld", "comfort"],
      hook: "Classic BBQ burger night with a clean, fast line",
      prep: 25,
      cook: 20,
      difficulty: "easy",
    }),
    description:
      "Smash-style burgers on a hot griddle with bacon, cheddar, and a quick house BBQ sauce. Onion rings optional but they anchor the board.",
    whyCrewsLikeIt:
      "Burgers are morale. The sauce is built for a station line—sweet, smoky, and not watery.",
    stationTimingNotes:
      "Sauce can be made any time. Patties can be portioned and chilled. Cook bacon first, then burgers on the same surface.",
    allergyNotes:
      "Buns contain gluten. Sauce contains Worcestershire (may contain fish). Dairy in cheddar.",
    equipment: ["flat-top griddle or cast iron", "spatulas", "instant-read thermometer", "sheet pans"],
    ingredients: [
      { name: "ground beef (80/20)", quantity: 4.5, unit: "lb" },
      { name: "kosher salt", quantity: 1.5, unit: "tbsp" },
      { name: "black pepper", quantity: 2, unit: "tsp" },
      { name: "American or cheddar cheese slices", quantity: 12, unit: "slices" },
      { name: "bacon", quantity: 1.5, unit: "lb" },
      { name: "buns", quantity: 12, unit: "whole" },
      { name: "yellow onion", quantity: 2, unit: "whole", notes: "thin-sliced" },
      { name: "pickle chips", quantity: 1, unit: "cup" },
      { name: "ketchup", quantity: 0.75, unit: "cup" },
      { name: "BBQ sauce", quantity: 0.75, unit: "cup" },
      { name: "Worcestershire sauce", quantity: 2, unit: "tbsp" },
      { name: "apple cider vinegar", quantity: 1.5, unit: "tbsp" },
      { name: "smoked paprika", quantity: 2, unit: "tsp" },
      { name: "onion rings (frozen)", quantity: 2, unit: "lb", notes: "optional" },
    ],
    stepLines: [
      {
        title: "Make the house BBQ burger sauce",
        instruction:
          "Whisk ketchup, BBQ sauce, Worcestershire, vinegar, and smoked paprika. Taste: it should be smoky-sweet with a little tang so it cuts the fat.",
        minutes: 5,
      },
      {
        title: "Cook bacon and onions",
        instruction:
          "Cook bacon on the griddle until crisp; drain on a rack. Cook sliced onions in the bacon fat with a pinch of salt until browned and jammy, 8–10 minutes.",
        minutes: 12,
      },
      {
        title: "Portion and smash",
        instruction:
          "Portion beef into 10–12 balls (6–7 oz for big burgers, 4 oz for regular). Heat griddle ripping hot. Season balls with salt and pepper, smash hard, and sear 2 minutes.",
        minutes: 8,
        heatLevel: "high",
      },
      {
        title: "Flip, cheese, and finish",
        instruction:
          "Flip, top with cheese, and cook 1–2 minutes more. Target 155°F for juicy burgers (or cook to your station standard). Toast buns on the side.",
        minutes: 6,
      },
      {
        title: "Tonight’s board",
        instruction:
          "Build a line: toasted buns, sauce, burgers, bacon, onions, pickles. Call: ‘BBQ bacon cheddar burgers—grab toppings and clear the line.’",
        minutes: 3,
      },
      {
        title: "Leftovers",
        instruction:
          "Chop patties into ‘burger fried rice’ or breakfast hash. Reheat burgers covered on low heat; don’t nuke them dry.",
        minutes: 4,
      },
    ],
    proTips: [
      "Smash once—don’t press after the flip or you squeeze out the juice.",
      "Use two spatulas if you’re smashing heavy portions on a smaller cast iron.",
      "Sauce should be thick; watery sauce slides right off the burger.",
    ],
    tonightSpread: ["Burgers + buns + toppings in a straight line to keep service moving."],
    leftovers: ["Burger hash with eggs.", "Chop into loaded nachos with BBQ sauce."],
    substitutions: ["Swap beef for 5 lb ground turkey + add 2 tbsp oil to the mix."],
    cleanupDifficulty: "heavy",
  }),

  bbqRecipe({
    manifest: manifestEntry({
      slug: "st-louis-ribs-dry-rub",
      title: "St. Louis Ribs (Dry Rub + Glaze)",
      subtitle: "Tender ribs with a fast glaze that sets without going candy-sweet",
      protein: "pork",
      cuisine: "American",
      mealFormat: "bbq",
      pools: ["bbq", "comfort", "big_crew"],
      hook: "Rib night that’s beginner-proof with temps and timing",
      prep: 25,
      cook: 330,
      difficulty: "medium",
    }),
    description:
      "St. Louis racks run a steady smoke, get wrapped to finish tender, then glazed quickly so the sauce sets shiny without burning.",
    whyCrewsLikeIt:
      "It feels like a special night but the method is repeatable. Wrap stage buys you time if the tones drop.",
    stationTimingNotes:
      "Smoke first half early shift. Wrap can finish in smoker or oven. Hold wrapped racks in a warm box; glaze right before cut.",
    allergyNotes:
      "Glaze may contain gluten depending on BBQ sauce brand. Verify labels.",
    equipment: ["smoker", "foil", "sheet pans", "tongs", "instant-read thermometer", "knife"],
    ingredients: [
      { name: "St. Louis pork ribs", quantity: 3, unit: "racks", notes: "about 8–9 lb total" },
      { name: "yellow mustard", quantity: 0.25, unit: "cup", notes: "binder" },
      { name: "kosher salt", quantity: 2.5, unit: "tbsp" },
      { name: "black pepper", quantity: 2, unit: "tbsp" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "brown sugar", quantity: 3, unit: "tbsp" },
      { name: "garlic powder", quantity: 2, unit: "tbsp" },
      { name: "onion powder", quantity: 1, unit: "tbsp" },
      { name: "cayenne", quantity: 1, unit: "tsp" },
      { name: "apple juice", quantity: 0.75, unit: "cup" },
      { name: "butter", quantity: 6, unit: "tbsp" },
      { name: "BBQ sauce", quantity: 1.25, unit: "cups" },
      { name: "apple cider vinegar", quantity: 2, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Rub the ribs",
        instruction:
          "Remove membrane if present. Coat with mustard. Mix salt, pepper, paprika, sugar, garlic, onion, and cayenne. Rub generously. Rest 15 minutes while smoker heats.",
        minutes: 20,
      },
      {
        title: "Smoke to bark",
        instruction:
          "Smoke at 250°F for about 2.5 hours until the color is deep mahogany and the rub is set (it doesn’t smear when you touch it lightly).",
        minutes: 150,
      },
      {
        title: "Wrap to tenderness",
        instruction:
          "Wrap each rack tightly in foil with 1/4 cup apple juice and 2 tbsp butter. Return to heat (smoker or 275°F oven) for 1.5–2 hours until a toothpick slides in with little resistance.",
        minutes: 105,
      },
      {
        title: "Glaze and set",
        instruction:
          "Mix BBQ sauce with vinegar. Unwrap ribs, brush with glaze, and cook unwrapped 15–20 minutes to set. Don’t burn it—if sugars darken fast, drop to indirect heat.",
        minutes: 20,
      },
      {
        title: "Slice and serve",
        instruction:
          "Rest 10 minutes. Slice between bones. Tonight’s board: ribs on a cutting tray, extra sauce, and a stack of napkins.",
        minutes: 15,
      },
      {
        title: "Leftovers",
        instruction:
          "Reheat wrapped in foil at 300°F until hot. Add a splash of apple juice before sealing the foil to keep them juicy.",
        minutes: 6,
      },
    ],
    proTips: [
      "Bark first, then wrap—wrapping too early makes ribs pale and soft.",
      "Toothpick test beats a specific temp for ribs.",
      "Set glaze last-minute so it stays shiny, not scorched.",
    ],
    tonightSpread: ["Ribs + sauce + pickles. Add coleslaw if you want a full board."],
    leftovers: ["Rib meat chopped into mac and cheese.", "Rib tacos with onions and cilantro."],
    substitutions: ["No apple juice? Use cola or chicken stock."],
    cleanupDifficulty: "heavy",
  }),
];

