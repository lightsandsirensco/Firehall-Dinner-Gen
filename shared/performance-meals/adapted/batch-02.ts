import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

export const batch02: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "korean-beef-rice-bowls",
      title: "Korean Beef Rice Bowls",
      subtitle: "Bulgogi-style ground beef over rice with quick cucumber pickle",
      protein: "beef",
      cuisine: "Korean",
      mealFormat: "bowl",
      hook: "Bold sweet-savory beef ready in one skillet after shift",
      prep: 25,
      cook: 15,
      difficulty: "medium",
      sourceId: "se-01",
    }),
    description:
      "Ground beef caramelizes in a soy-sesame-ginger glaze with grated pear for tenderness. Served over steamed rice with scallions, sesame seeds, and quick pickled cucumber.",
    whyCrewsLikeIt:
      "Big flavor without a marinade wait. Bowl format lets crew customize heat and keeps service moving on busy nights.",
    mealPrepNotes:
      "Mix sauce and slice cucumbers the night before. Marinate beef up to 4 hours for deeper flavor.",
    stationWorkflow: [
      "Cook rice first in a cooker so the skillet stays free for beef batches.",
      "Sear beef in two batches—crowded meat steams instead of browning.",
      "Set bowl line: rice, beef, cucumber, kimchi optional, sesame and scallion.",
    ],
    ingredients: [
      { name: "lean ground beef", quantity: 3, unit: "lb" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "low-sodium soy sauce", quantity: 0.5, unit: "cup" },
      { name: "brown sugar", quantity: 0.25, unit: "cup" },
      { name: "sesame oil", quantity: 3, unit: "tbsp" },
      { name: "fresh ginger", quantity: 3, unit: "tbsp", notes: "grated" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "Asian pear", quantity: 1, unit: "whole", notes: "grated, or 1 apple" },
      { name: "English cucumber", quantity: 2, unit: "whole", notes: "thinly sliced" },
      { name: "rice vinegar", quantity: 0.25, unit: "cup" },
      { name: "green onions", quantity: 8, unit: "whole", notes: "sliced" },
      { name: "toasted sesame seeds", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Quick pickle cucumbers",
        instruction:
          "Toss cucumber slices with rice vinegar and a pinch of salt. Refrigerate while cooking so they stay crisp-tender with a bright tang.",
        minutes: 5,
      },
      {
        title: "Cook rice",
        instruction:
          "Rinse jasmine rice and cook per package directions until fluffy grains separate easily with a fork, not sticky or gummy.",
        minutes: 20,
      },
      {
        title: "Mix bulgogi-style sauce",
        instruction:
          "Whisk soy sauce, brown sugar, sesame oil, ginger, garlic, and grated pear until sugar dissolves and mixture smells sweet-savory.",
        minutes: 5,
      },
      {
        title: "Brown beef in batches",
        instruction:
          "Cook ground beef over medium-high in a large skillet 8–10 minutes per batch until deeply browned and crumbly with crisp edges, not gray and steaming.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Glaze and build bowls",
        instruction:
          "Return all beef to pan, pour sauce, simmer 3–4 minutes until glaze coats meat and pan looks shiny, not soupy. Serve over rice with pickles and scallions.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 545, protein: 36, carbs: 52, fats: 22, fiber: 2 },
    proTips: [
      "Grated pear tenderizes lean beef—do not skip even if it feels unusual.",
      "Offer gochujang at the line for crews who want fermented heat.",
      "Drain excess fat after browning so the glaze stays glossy.",
    ],
    tonightSpread: ["Steamed edamame with flaky salt.", "Kimchi or quick cabbage slaw for crunch."],
    leftovers: [
      "Beef in lettuce cups next day with extra cucumber pickle.",
      "Fried rice with leftover beef, egg, and frozen peas.",
    ],
    equipment: ["Rice cooker", "Large skillet", "Mixing bowls"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "crispy-fish-taco-night",
      title: "Crispy Fish Taco Night",
      subtitle: "Oven-crisp cod with cabbage slaw and lime crema for eight",
      protein: "fish",
      cuisine: "Mexican",
      mealFormat: "tacos",
      hook: "Handheld taco line without deep-fryer grease on the floor",
      prep: 25,
      cook: 18,
      difficulty: "medium",
      sourceId: "se-05",
    }),
    description:
      "Cod fillets bake with a panko crust until flaky, then tuck into warm corn tortillas with shredded cabbage, pico, and lime crema.",
    whyCrewsLikeIt:
      "Fresh and light but still filling. Assembly keeps the crew engaged and portions stay consistent.",
    mealPrepNotes:
      "Shred cabbage and mix slaw dressing ahead. Keep cod chilled until breading—warm fish makes coating slide off.",
    stationWorkflow: [
      "Bake fish on wire racks set over sheet pans for airflow and even crisping.",
      "Warm tortillas wrapped in foil in a low oven so they stay flexible at the line.",
      "Set taco bar: fish, slaw, pico, crema, hot sauce, lime wedges.",
    ],
    ingredients: [
      { name: "cod fillets", quantity: 3.5, unit: "lb", notes: "1-inch thick portions" },
      { name: "panko breadcrumbs", quantity: 2, unit: "cups" },
      { name: "all-purpose flour", quantity: 1, unit: "cup" },
      { name: "large eggs", quantity: 3, unit: "whole", notes: "beaten" },
      { name: "green cabbage", quantity: 1, unit: "head", notes: "shredded fine" },
      { name: "Greek yogurt", quantity: 1, unit: "cup" },
      { name: "lime juice", quantity: 0.25, unit: "cup", notes: "fresh" },
      { name: "corn tortillas", quantity: 24, unit: "whole", notes: "6-inch" },
      { name: "pico de gallo", quantity: 2, unit: "cups" },
      { name: "chili powder", quantity: 1, unit: "tbsp" },
      { name: "garlic powder", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Prep slaw and crema",
        instruction:
          "Toss shredded cabbage with half the lime juice and a pinch of salt until lightly wilted but still crunchy. Stir yogurt with remaining lime for crema.",
        minutes: 10,
      },
      {
        title: "Set up breading station",
        instruction:
          "Season flour with chili powder, garlic powder, and salt. Mix panko with 2 tbsp oil on a sheet pan for extra oven crispness.",
        minutes: 5,
      },
      {
        title: "Bread cod fillets",
        instruction:
          "Pat cod dry. Dredge in flour, dip in egg, press into panko until fully coated with no bare spots showing through.",
        minutes: 10,
      },
      {
        title: "Bake until flaky",
        instruction:
          "Bake at 425°F on a wire rack 14–18 minutes until crust is golden and fish flakes at 145°F with opaque flesh throughout.",
        minutes: 16,
        heatLevel: "high",
      },
      {
        title: "Assemble tacos at the line",
        instruction:
          "Break fish into strips. Fill warm tortillas with slaw, fish, pico, and crema. Fish should feel firm but moist, not dry or stringy.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 380, protein: 32, carbs: 38, fats: 12, fiber: 5 },
    proTips: [
      "Pat fish extremely dry— moisture is the enemy of crispy panko.",
      "Double-stack tortillas for crews who want sturdier handhelds.",
      "Serve fish immediately; hold slaw and toppings separately.",
    ],
    tonightSpread: ["Black beans with cumin and cilantro.", "Baked tortilla chips with salsa verde."],
    leftovers: [
      "Flake fish into a salad with slaw and extra crema.",
      "Fish tacos do not reheat well—plan portions carefully.",
    ],
    equipment: ["Wire cooling racks", "Half-sheet pans", "Three shallow bowls"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "smoky-lentil-kale-soup",
      title: "Smoky Lentil and Kale Soup",
      subtitle: "Hearty vegetarian pot with fire-roasted tomatoes and smoked paprika",
      protein: "plant",
      cuisine: "American",
      mealFormat: "soup",
      hook: "Plant-forward backup that still fills up a hungry hall",
      prep: 20,
      cook: 40,
      difficulty: "easy",
      sourceId: "se-06",
    }),
    description:
      "Green lentils simmer with onion, carrot, celery, kale, and fire-roasted tomatoes until thick. Smoked paprika adds depth without meat.",
    whyCrewsLikeIt:
      "Budget-friendly and fiber-rich. Gives vegetarian crew a main dish that feels as substantial as meat nights.",
    mealPrepNotes:
      "Chop mirepoix ahead. Soup thickens overnight—thin with broth when reheating.",
    stationWorkflow: [
      "Use widest pot available so lentils cook evenly without scorching bottom.",
      "Stir kale in during last 5 minutes so it stays bright green, not army drab.",
      "Offer hot sauce and parmesan at side station for crew who want extra punch.",
    ],
    ingredients: [
      { name: "green lentils", quantity: 2, unit: "lb", notes: "rinsed" },
      { name: "yellow onion", quantity: 2, unit: "large", notes: "diced" },
      { name: "carrots", quantity: 4, unit: "whole", notes: "diced" },
      { name: "celery stalks", quantity: 4, unit: "whole", notes: "diced" },
      { name: "lacinato kale", quantity: 1, unit: "bunch", notes: "stemmed, chopped" },
      { name: "fire-roasted diced tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "vegetable broth", quantity: 10, unit: "cups", notes: "low sodium" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 1, unit: "tbsp" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "bay leaves", quantity: 2, unit: "whole" },
    ],
    stepLines: [
      {
        title: "Sweat aromatics",
        instruction:
          "Heat olive oil in an 8-quart pot over medium. Cook onion, carrot, and celery 8–10 minutes until softened and onion edges turn translucent.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        title: "Bloom spices",
        instruction:
          "Add garlic, smoked paprika, and cumin. Stir 1–2 minutes until spices smell toasty and paste-like, not raw or dusty.",
        minutes: 2,
      },
      {
        title: "Simmer lentils",
        instruction:
          "Add lentils, tomatoes, broth, and bay leaves. Bring to a boil, reduce to simmer, cook 30–35 minutes until lentils are tender but hold shape.",
        minutes: 35,
        heatLevel: "medium-low",
      },
      {
        title: "Wilt kale",
        instruction:
          "Stir in kale and simmer 5 minutes until leaves soften and turn deep green. Soup should be thick enough to coat a spoon lightly.",
        minutes: 5,
      },
      {
        title: "Season and serve",
        instruction:
          "Remove bay leaves. Adjust salt and pepper. Lentils should be tender with slight bite, not mushy or split open.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 310, protein: 18, carbs: 48, fats: 6, fiber: 14 },
    proTips: [
      "Rinse lentils well—dusty lentils make cloudy, gritty soup.",
      "A parmesan rind simmered in the pot adds umami without meat.",
      "Portion with a 12-oz ladle; crew can add bread for extra calories.",
    ],
    tonightSpread: ["Crusty whole-grain bread with olive oil.", "Shaved parmesan and red pepper flakes."],
    leftovers: [
      "Blend half into a creamy base and return to pot for texture variety.",
      "Freeze flat bags for emergency vegetarian nights.",
    ],
    equipment: ["8-quart stock pot", "Wooden spoon"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "crock-barbacoa-chicken",
      title: "Crock Barbacoa Chicken With Potato Wedges",
      subtitle: "Slow-cooked chipotle barbacoa with crispy roasted potato wedges",
      protein: "chicken",
      cuisine: "Mexican",
      mealFormat: "slow_cooker",
      hook: "Start before shift; shred at dinner with golden potato wedges on the side",
      prep: 20,
      cook: 360,
      difficulty: "easy",
      sourceId: "se-09",
    }),
    description:
      "Slow-cooked shredded barbacoa chicken piled beside crispy roasted potato wedges — chipotle, lime, and cumin braise until pull-apart tender while wedges roast golden in the oven.",
    whyCrewsLikeIt:
      "Set-and-forget protein with a hearty wedge side that holds hot on the line. Smoky heat without standing over a smoker all day.",
    mealPrepNotes:
      "Start crock on low by mid-morning. Roast potato wedges on sheet pans while chicken finishes. Shred with two forks directly in the pot to save dishes.",
    stationWorkflow: [
      "Do not lift lid during first 3 hours—each peek adds 15 minutes cook time.",
      "Skim fat before shredding for cleaner flavor and easier cleanup.",
      "Hold shredded chicken in juice at 165°F—dry holding ruins barbacoa texture.",
      "Crisp wedges on a hot sheet pan 5 minutes before service if they softened during hold.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 5, unit: "lb" },
      { name: "russet potatoes", quantity: 4, unit: "large", notes: "cut into wedges" },
      { name: "olive oil", quantity: 3, unit: "tbsp", notes: "for wedges" },
      { name: "chipotle peppers in adobo", quantity: 3, unit: "whole", notes: "minced" },
      { name: "adobo sauce", quantity: 3, unit: "tbsp", notes: "from can" },
      { name: "lime juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "limes", quantity: 4, unit: "whole", notes: "cut into wedges for service" },
      { name: "fresh cilantro", quantity: 1, unit: "cup", notes: "rough chopped" },
      { name: "apple cider vinegar", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp", notes: "for wedges" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "sliced" },
      { name: "chicken broth", quantity: 1, unit: "cup", notes: "low sodium" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Roast potato wedges",
        instruction:
          "Heat oven to 425°F. Toss potato wedges with olive oil, smoked paprika, salt, and pepper on two sheet pans in a single layer. Roast 28–35 minutes, turning once, until golden and crisp at the edges.",
        minutes: 35,
      },
      {
        title: "Layer crock ingredients",
        instruction:
          "Place onion slices in bottom of 8-quart slow cooker. Arrange chicken thighs on top in an even layer without stacking too deep.",
        minutes: 5,
      },
      {
        title: "Mix braising liquid",
        instruction:
          "Whisk chipotle, adobo sauce, lime juice, vinegar, cumin, oregano, garlic, salt, pepper, and broth until smooth.",
        minutes: 5,
      },
      {
        title: "Slow cook until tender",
        instruction:
          "Pour liquid over chicken. Cover and cook on low 6–8 hours until meat pulls apart easily and internal temp reaches 165°F throughout.",
        heatLevel: "low",
      },
      {
        title: "Shred in pot",
        instruction:
          "Transfer thighs to a cutting board if easier, or shred in crock with two forks. Meat should separate into moist strands, not dry clumps.",
        minutes: 10,
      },
      {
        title: "Reduce juices if needed",
        instruction:
          "If liquid is thin, simmer shredded chicken on high 20–30 minutes uncovered until sauce clings to meat with a glossy coat.",
        minutes: 25,
      },
      {
        title: "Platter for the line",
        instruction:
          "Pile shredded barbacoa on a large crew platter beside the roasted potato wedges. Garnish with lime wedges and cilantro. Keep rice and bowls off this spread — wedges are the carb.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 485, protein: 42, carbs: 38, fats: 22, fiber: 4 },
    proTips: [
      "Thighs beat breast here—long cook needs fat for tender shred.",
      "Roast wedges on parchment for easier cleanup after a long shift.",
      "Freeze shredded portions in cooking liquid for fast taco nights — re-crisp fresh wedges when you serve.",
    ],
    tonightSpread: ["Lime wedges and fresh cilantro on the platter.", "Simple shredded lettuce if crews want greens."],
    leftovers: [
      "Barbacoa breakfast burritos with eggs and salsa.",
      "Re-crisp leftover wedges in a hot oven 8 minutes.",
    ],
    equipment: ["8-quart slow cooker", "Two forks"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "shawarma-chicken-rice-bowls",
      title: "Shawarma Chicken Rice Bowls",
      subtitle: "Sheet-pan spiced chicken with turmeric rice and cucumber yogurt",
      protein: "chicken",
      cuisine: "Middle Eastern",
      mealFormat: "bowl",
      hook: "Meal-prep friendly bowls with bold spice and cool yogurt balance",
      prep: 30,
      cook: 28,
      difficulty: "medium",
      sourceId: "ak-01",
    }),
    description:
      "Chicken thighs roast with shawarma spices on sheet pans, served over turmeric rice with cucumber yogurt, tomatoes, and pickled onions.",
    whyCrewsLikeIt:
      "Big flavor profile without a vertical rotisserie. Bowls travel well for crew eating at different times.",
    mealPrepNotes:
      "Marinate chicken up to 24 hours. Pickle onions overnight for best tang.",
    stationWorkflow: [
      "Roast chicken on two pans with space between thighs for even char.",
      "Keep cucumber yogurt chilled on ice at the line—it balances hot chicken.",
      "Bowl assembly: rice, sliced chicken, tomato, onion, yogurt drizzle, parsley.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "basmati rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "Greek yogurt", quantity: 2, unit: "cups" },
      { name: "English cucumber", quantity: 1, unit: "whole", notes: "grated, drained" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "ground coriander", quantity: 1, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "ground turmeric", quantity: 1, unit: "tsp" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "lemon juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "olive oil", quantity: 0.33, unit: "cup" },
      { name: "cherry tomatoes", quantity: 2, unit: "cups", notes: "halved" },
      { name: "red onion", quantity: 1, unit: "large", notes: "thinly sliced" },
    ],
    stepLines: [
      {
        title: "Marinate chicken",
        instruction:
          "Toss thighs with half the olive oil, cumin, coriander, paprika, half the garlic, and 2 tbsp lemon juice. Marinate at least 30 minutes.",
        minutes: 30,
      },
      {
        title: "Cook turmeric rice",
        instruction:
          "Cook basmati with a pinch of turmeric and salt until fluffy. Grains should be separate and lightly golden, not clumped or wet.",
        minutes: 20,
      },
      {
        title: "Roast chicken",
        instruction:
          "Roast marinated thighs at 425°F on two sheet pans 22–28 minutes until charred at edges and internal temp hits 165°F.",
        minutes: 25,
        heatLevel: "high",
      },
      {
        title: "Make cucumber yogurt",
        instruction:
          "Mix yogurt, grated drained cucumber, remaining garlic, 2 tbsp lemon juice, and salt until creamy with no watery separation.",
        minutes: 5,
      },
      {
        title: "Build bowls",
        instruction:
          "Slice chicken and portion over rice with tomatoes and pickled onion. Drizzle yogurt. Chicken should be juicy with crisp spice crust.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 510, protein: 38, carbs: 48, fats: 18, fiber: 3 },
    proTips: [
      "Drain grated cucumber or yogurt sauce turns watery at the line.",
      "Quick-pickle onion in vinegar 15 minutes if you forgot overnight prep.",
      "Offer harissa paste for crews who want extra heat.",
    ],
    tonightSpread: ["Warm pita wedges.", "Hummus with olive oil and paprika."],
    leftovers: [
      "Shawarma wrap with leftover chicken and extra yogurt.",
      "Rice and chicken salad bowl with lemon dressing.",
    ],
    equipment: ["Two half-sheet pans", "Rice cooker", "Mixing bowls"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "honey-lime-chicken-tray",
      title: "Honey Lime Chicken Tray",
      subtitle: "Glazed chicken with roasted peppers and red onion on one sheet",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "sheet_pan",
      hook: "Bright citrus glaze that caramelizes without burning in a hot oven",
      prep: 18,
      cook: 28,
      difficulty: "easy",
      sourceId: "ak-02",
    }),
    description:
      "Bone-in chicken thighs roast with bell peppers and red onion, brushed with honey-lime glaze until sticky and golden at the edges.",
    whyCrewsLikeIt:
      "Sweet-tart flavor wakes up a tired crew. One tray means less cleanup after a long shift.",
    mealPrepNotes:
      "Mix glaze ahead in a jar. Line pans with foil for faster cleanup.",
    stationWorkflow: [
      "Brush glaze during last 10 minutes only—early application burns sugar.",
      "Rotate pans halfway for even caramelization in a crowded station oven.",
      "Rest 5 minutes before slicing so glaze sets instead of running off the tray.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "red bell pepper", quantity: 3, unit: "whole", notes: "chunked" },
      { name: "green bell pepper", quantity: 2, unit: "whole", notes: "chunked" },
      { name: "red onion", quantity: 2, unit: "large", notes: "wedge-cut" },
      { name: "honey", quantity: 0.33, unit: "cup" },
      { name: "lime juice", quantity: 0.25, unit: "cup", notes: "fresh" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "chili powder", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Heat oven and prep vegetables",
        instruction:
          "Heat oven to 425°F. Toss peppers and onion with 2 tbsp oil, salt, and pepper until evenly coated and lightly glossy.",
        minutes: 8,
      },
      {
        title: "Season chicken",
        instruction:
          "Pat thighs dry. Season with chili powder, salt, and pepper. Arrange skin-side up on two half-sheet pans with vegetables around edges.",
        minutes: 5,
      },
      {
        title: "Initial roast",
        instruction:
          "Roast 18 minutes without glaze until chicken skin starts to render fat and turn lightly golden at the edges.",
        minutes: 18,
        heatLevel: "high",
      },
      {
        title: "Glaze and finish",
        instruction:
          "Whisk honey, lime juice, garlic, and remaining oil. Brush over chicken and vegetables. Roast 10–12 more minutes until glaze bubbles and temp hits 165°F.",
        minutes: 12,
        heatLevel: "high",
      },
      {
        title: "Rest and portion",
        instruction:
          "Rest 5 minutes. Peppers should be tender with slight char; chicken juices should run clear, not pink, when pierced at the bone.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 455, protein: 40, carbs: 22, fats: 24, fiber: 3 },
    proTips: [
      "Watch glaze in last minutes—honey burns quickly above 425°F.",
      "Serve with extra lime wedges for crew who want sharper acidity.",
      "Swap thighs for drumsticks using same timing if that is what is in the walk-in.",
    ],
    tonightSpread: ["Cilantro-lime rice.", "Black beans with cumin."],
    leftovers: [
      "Slice chicken into salads with avocado and remaining peppers.",
      "Shred into wraps with the sticky pan glaze as sauce.",
    ],
    equipment: ["Two half-sheet pans", "Pastry brush"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-taco-skillet",
      title: "Turkey Taco Skillet",
      subtitle: "One-pan seasoned turkey with peppers, corn, and melted cheese",
      protein: "turkey",
      cuisine: "Mexican",
      mealFormat: "skillet",
      hook: "Taco filling ready in one pan when the clock is brutal",
      prep: 15,
      cook: 20,
      difficulty: "easy",
      sourceId: "ak-03",
    }),
    description:
      "Lean ground turkey browns with taco seasoning, bell pepper, corn, and black beans, finished with melted cheddar for scooping into tortillas or bowls.",
    whyCrewsLikeIt:
      "High protein, low grease, and one pan to wash. Familiar taco flavors without frying shells.",
    mealPrepNotes:
      "Pre-measure taco spice blend. Open and drain beans before the call comes in.",
    stationWorkflow: [
      "Use a 14-inch skillet or two 12-inch pans so turkey browns instead of steaming.",
      "Add cheese off heat so it melts without oil separating at the edges.",
      "Serve straight from skillet to warm tortillas at the adjacent counter.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 3, unit: "lb" },
      { name: "red bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "frozen corn", quantity: 2, unit: "cups", notes: "thawed" },
      { name: "black beans", quantity: 2, unit: "cans", notes: "15 oz, drained" },
      { name: "diced tomatoes with green chiles", quantity: 1, unit: "can", notes: "14.5 oz" },
      { name: "chili powder", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 1.5, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "shredded cheddar", quantity: 2, unit: "cups" },
      { name: "kosher salt", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Brown turkey",
        instruction:
          "Cook ground turkey in a large skillet over medium-high 8–10 minutes, breaking into fine crumbles until no pink remains and edges look lightly browned.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Add vegetables",
        instruction:
          "Stir in onion and bell pepper. Cook 5–6 minutes until softened and onion turns translucent with slightly softened pepper pieces.",
        minutes: 6,
      },
      {
        title: "Season and simmer",
        instruction:
          "Add garlic, chili powder, cumin, paprika, corn, beans, tomatoes, and salt. Simmer 8 minutes until liquid reduces and mixture looks thick, not soupy.",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Melt cheese",
        instruction:
          "Remove from heat, sprinkle cheddar evenly, cover 2 minutes until cheese melts into a glossy layer on top.",
        minutes: 2,
      },
      {
        title: "Serve immediately",
        instruction:
          "Scoop into tortillas or bowls. Turkey should stay moist with visible corn and pepper pieces throughout each portion.",
        minutes: 2,
      },
    ],
    nutrition: { calories: 385, protein: 36, carbs: 28, fats: 14, fiber: 7 },
    proTips: [
      "Add a splash of lime at the end—acid lifts turkey from bland to bright.",
      "Offer Greek yogurt as a cool topping instead of sour cream.",
      "Double recipe fits two skillets for faster browning on busy nights.",
    ],
    tonightSpread: ["Warm flour tortillas and shredded lettuce.", "Salsa and sliced jalapeños."],
    leftovers: [
      "Taco salad over romaine with crushed baked chips.",
      "Stuffed into bell pepper halves and baked 15 minutes.",
    ],
    equipment: ["14-inch skillet with lid", "Wooden spoon"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "maple-soy-salmon-bowls",
      title: "Maple Soy Salmon Bowls",
      subtitle: "Glazed salmon over brown rice with edamame and shredded carrot",
      protein: "salmon",
      cuisine: "Asian-American",
      mealFormat: "bowl",
      hook: "Omega-3 bowls with a sweet-savory glaze that holds on the line",
      prep: 20,
      cook: 18,
      difficulty: "medium",
      sourceId: "ak-04",
    }),
    description:
      "Salmon fillets roast with maple-soy glaze, served over brown rice with shelled edamame, shredded carrot, and sliced scallions.",
    whyCrewsLikeIt:
      "Brain food after a long shift. Balanced macros in a bowl that looks as good as it tastes.",
    mealPrepNotes:
      "Cook brown rice ahead—it takes longer than white. Mix glaze in advance.",
    stationWorkflow: [
      "Roast salmon on parchment for easy release and quick pan cleanup.",
      "Keep edamame warm in a small hotel pan separate from rice to avoid sogginess.",
      "Glaze salmon twice—mid-cook and final 2 minutes—for shiny lacquered finish.",
    ],
    ingredients: [
      { name: "salmon fillets", quantity: 4, unit: "lb", notes: "skin-on, 6 oz portions" },
      { name: "brown rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "shelled edamame", quantity: 3, unit: "cups", notes: "thawed if frozen" },
      { name: "carrots", quantity: 3, unit: "whole", notes: "shredded" },
      { name: "maple syrup", quantity: 0.25, unit: "cup" },
      { name: "low-sodium soy sauce", quantity: 0.25, unit: "cup" },
      { name: "rice vinegar", quantity: 2, unit: "tbsp" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 1, unit: "tbsp", notes: "grated" },
      { name: "sesame oil", quantity: 2, unit: "tbsp" },
      { name: "green onions", quantity: 6, unit: "whole", notes: "sliced" },
      { name: "toasted sesame seeds", quantity: 2, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Cook brown rice",
        instruction:
          "Simmer brown rice until tender and chewy, about 35–40 minutes. Fluff with fork so grains stay separate, not mashed or sticky.",
        minutes: 40,
      },
      {
        title: "Mix maple soy glaze",
        instruction:
          "Whisk maple syrup, soy sauce, vinegar, garlic, ginger, and 1 tbsp sesame oil until combined and slightly thickened.",
        minutes: 3,
      },
      {
        title: "Roast salmon",
        instruction:
          "Place salmon on parchment-lined pans. Brush half the glaze. Bake at 400°F 12–14 minutes, brush again, finish 2–4 minutes until 125–130°F at center.",
        minutes: 16,
        heatLevel: "medium-high",
      },
      {
        title: "Warm edamame",
        instruction:
          "Steam or microwave edamame 2–3 minutes until bright green and heated through. Toss with pinch of salt and remaining sesame oil.",
        minutes: 3,
      },
      {
        title: "Assemble bowls",
        instruction:
          "Flake or slice salmon over rice with edamame and carrot. Drizzle extra glaze, top with scallions and sesame seeds.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 495, protein: 36, carbs: 52, fats: 16, fiber: 5 },
    proTips: [
      "Do not overcook salmon—it keeps cooking on hot rice during assembly.",
      "Use real maple syrup; pancake syrup burns faster and tastes flat.",
      "Offer sriracha mayo for crews who want creamy heat.",
    ],
    tonightSpread: ["Miso soup in cups.", "Seaweed salad from the store if available."],
    leftovers: [
      "Salmon flaked into a grain salad with extra edamame.",
      "Cold salmon on greens with ginger dressing next shift.",
    ],
    equipment: ["Half-sheet pans", "Rice cooker or large pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-sweet-potato-chili",
      title: "Turkey Sweet Potato Chili",
      subtitle: "Crock chili with diced sweet potato, black beans, and warm spices",
      protein: "turkey",
      cuisine: "American",
      mealFormat: "slow_cooker",
      hook: "Comfort chili with better balance—sweet potato replaces some beans for crew variety",
      prep: 25,
      cook: 300,
      difficulty: "easy",
      sourceId: "ak-05",
    }),
    description:
      "Ground turkey simmers with sweet potato cubes, black beans, fire-roasted tomatoes, and chili spices until thick and fragrant.",
    whyCrewsLikeIt:
      "Familiar chili night with a lighter twist. Sweet potato adds body and keeps the pot gluten-free and filling.",
    mealPrepNotes:
      "Dice sweet potato uniform ½-inch so pieces cook evenly. Brown turkey before adding to crock.",
    stationWorkflow: [
      "Brown turkey in skillet first—raw turkey in crock makes greasy, bland chili.",
      "Add sweet potato in last 2 hours on high if starting from cold crock.",
      "Hold on warm with lid slightly vented so potatoes do not turn to mush.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 2.5, unit: "lb" },
      { name: "sweet potatoes", quantity: 2, unit: "lb", notes: "peeled, ½-inch dice" },
      { name: "black beans", quantity: 3, unit: "cans", notes: "15 oz, drained" },
      { name: "fire-roasted diced tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "red bell pepper", quantity: 1, unit: "whole", notes: "diced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "chicken broth", quantity: 3, unit: "cups", notes: "low sodium" },
      { name: "chili powder", quantity: 2, unit: "tbsp" },
      { name: "ground cumin", quantity: 1.5, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Brown turkey and aromatics",
        instruction:
          "Brown turkey with onion and bell pepper in a skillet 10–12 minutes until turkey is crumbly and vegetables soften with lightly golden edges.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom spices",
        instruction:
          "Add garlic, chili powder, cumin, and paprika. Cook 2 minutes until spices smell toasted and coat the turkey evenly.",
        minutes: 2,
      },
      {
        title: "Transfer to crock",
        instruction:
          "Scrape mixture into slow cooker. Add sweet potato, beans, tomatoes, broth, and salt. Stir until combined and potatoes submerged.",
        minutes: 5,
      },
      {
        title: "Slow cook until tender",
        instruction:
          "Cook on low 5–6 hours until sweet potato pierces easily with a fork but still holds cube shape, not falling apart.",
        heatLevel: "low",
      },
      {
        title: "Adjust and serve",
        instruction:
          "Taste and adjust salt. Chili should be thick enough to mound on a spoon without running off immediately.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 355, protein: 32, carbs: 42, fats: 8, fiber: 11 },
    proTips: [
      "Do not stir aggressively—broken sweet potato thickens too much and turns paste-like.",
      "Top with avocado and cilantro for fresh contrast to long-simmered flavors.",
      "Swap half sweet potato for butternut squash in fall without changing cook time.",
    ],
    tonightSpread: ["Cornbread baked in a 9x13 pan.", "Greek yogurt and hot sauce at the line."],
    leftovers: [
      "Chili baked over tater tots with cheese for a quick casserole.",
      "Freeze portions for backup meals—reheat with extra broth.",
    ],
    equipment: ["8-quart slow cooker", "Large skillet"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "asian-chicken-lettuce-cups",
      title: "Asian Chicken Lettuce Cups",
      subtitle: "Ginger-garlic ground chicken in crisp butter lettuce with hoisin drizzle",
      protein: "chicken",
      cuisine: "Asian",
      mealFormat: "handheld",
      hook: "Light handheld dinner that still delivers 35g protein per serving",
      prep: 20,
      cook: 15,
      difficulty: "medium",
      sourceId: "ak-09",
    }),
    description:
      "Ground chicken cooks with ginger, garlic, water chestnuts, and scallions, served in butter lettuce cups with hoisin, lime, and crushed peanuts.",
    whyCrewsLikeIt:
      "Low-carb option that does not feel like diet food. Interactive assembly keeps dinner lively after a quiet shift.",
    mealPrepNotes:
      "Wash and dry lettuce cups early—wet leaves tear when filled. Chop water chestnuts fine for even distribution.",
    stationWorkflow: [
      "Keep lettuce cups on ice until service—they wilt fast near a hot range.",
      "Cook chicken in two batches for better browning and texture.",
      "Set build station: lettuce, chicken, hoisin, peanuts, lime, scallion.",
    ],
    ingredients: [
      { name: "ground chicken", quantity: 3, unit: "lb" },
      { name: "butter lettuce", quantity: 3, unit: "heads", notes: "leaves separated" },
      { name: "water chestnuts", quantity: 1, unit: "can", notes: "8 oz, minced" },
      { name: "green onions", quantity: 8, unit: "whole", notes: "sliced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 3, unit: "tbsp", notes: "grated" },
      { name: "low-sodium soy sauce", quantity: 0.25, unit: "cup" },
      { name: "hoisin sauce", quantity: 0.33, unit: "cup" },
      { name: "sesame oil", quantity: 2, unit: "tbsp" },
      { name: "rice vinegar", quantity: 2, unit: "tbsp" },
      { name: "crushed roasted peanuts", quantity: 0.75, unit: "cup" },
      { name: "lime", quantity: 3, unit: "whole", notes: "cut into wedges" },
    ],
    stepLines: [
      {
        title: "Prep lettuce cups",
        instruction:
          "Wash butter lettuce leaves and dry thoroughly on towels. Keep chilled on a sheet pan until service so cups stay crisp and cup-shaped.",
        minutes: 10,
      },
      {
        title: "Brown ground chicken",
        instruction:
          "Cook chicken in batches over medium-high 8–10 minutes, breaking into small crumbles until fully cooked with lightly golden edges.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Add aromatics and chestnuts",
        instruction:
          "Add ginger, garlic, water chestnuts, and half the scallions. Cook 3–4 minutes until fragrant and chestnuts heated through with slight crunch.",
        minutes: 4,
      },
      {
        title: "Finish sauce",
        instruction:
          "Stir in soy sauce, 2 tbsp hoisin, sesame oil, and vinegar. Simmer 2 minutes until liquid mostly absorbs and mixture looks glossy, not wet.",
        minutes: 2,
      },
      {
        title: "Assemble cups at the line",
        instruction:
          "Spoon ¼ cup chicken into each lettuce cup. Drizzle hoisin, sprinkle peanuts and scallions, serve with lime. Leaves should crack lightly when bitten.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 295, protein: 35, carbs: 12, fats: 12, fiber: 2 },
    proTips: [
      "Offer rice on the side for crew who want more carbs without changing the core recipe.",
      "Substitute crushed cashews if peanut allergy is a concern at your hall.",
      "Double-stack small leaves for sturdier cups that do not tear when filled.",
    ],
    tonightSpread: ["Steamed jasmine rice for optional base.", "Cucumber salad with rice vinegar."],
    leftovers: [
      "Chicken filling over rice bowls next day—skip lettuce.",
      "Wrap filling in rice paper spring rolls with herbs.",
    ],
    equipment: ["Large skillet", "Sheet pans for lettuce"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),
];
