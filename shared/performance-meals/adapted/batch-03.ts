import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

export const batch03: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "mediterranean-baked-fish-tray",
      title: "Mediterranean Baked Fish Tray",
      subtitle: "White fish with cherry tomatoes, olives, and capers on one sheet",
      protein: "fish",
      cuisine: "Mediterranean",
      mealFormat: "sheet_pan",
      hook: "One-tray fish dinner with briny Mediterranean punch",
      prep: 18,
      cook: 20,
      difficulty: "easy",
      sourceId: "tmd-01",
    }),
    description:
      "Cod or halibut bakes with cherry tomatoes, Kalamata olives, capers, garlic, and olive oil until flaky. Designed for hall-scale portioning.",
    whyCrewsLikeIt:
      "Light but satisfying after heavy training days. Minimal dishes and big flavor from pantry staples.",
    mealPrepNotes:
      "Pit olives if needed. Keep fish cold until it hits the oven.",
    stationWorkflow: [
      "Use parchment on half-sheets for fish release without sticking.",
      "Nest fish between tomatoes so fillets stay moist during high-heat roast.",
      "Spoon pan juices over portions at the line for extra flavor.",
    ],
    ingredients: [
      { name: "cod or halibut fillets", quantity: 4, unit: "lb", notes: "6 oz portions" },
      { name: "cherry tomatoes", quantity: 2, unit: "lb", notes: "halved" },
      { name: "Kalamata olives", quantity: 1, unit: "cup", notes: "pitted, halved" },
      { name: "capers", quantity: 0.25, unit: "cup", notes: "drained" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "sliced" },
      { name: "red onion", quantity: 1, unit: "large", notes: "thinly sliced" },
      { name: "extra-virgin olive oil", quantity: 0.33, unit: "cup" },
      { name: "dried oregano", quantity: 2, unit: "tsp" },
      { name: "lemon", quantity: 2, unit: "whole", notes: "juiced and sliced" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Heat oven and toss vegetables",
        instruction:
          "Heat oven to 400°F. Toss tomatoes, olives, capers, onion, garlic, oregano, half the olive oil, and salt on two half-sheets until evenly coated.",
        minutes: 8,
      },
      {
        title: "Season fish",
        instruction:
          "Pat fish dry. Nest fillets among vegetables. Drizzle remaining oil and lemon juice over fish so surfaces look lightly glossed.",
        minutes: 5,
      },
      {
        title: "Roast until flaky",
        instruction:
          "Roast 16–20 minutes until fish reads 145°F and flakes with gentle pressure. Tomatoes should burst and release juice into the pan.",
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        title: "Finish with lemon and herbs",
        instruction:
          "Top with lemon slices and parsley. Fish flesh should look opaque and moist, not chalky or separating into dry strands.",
        minutes: 2,
      },
      {
        title: "Portion with pan juices",
        instruction:
          "Serve each fillet with a spoonful of tomato-olive mixture and pan juices spooned over the top for brightness.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 320, protein: 34, carbs: 10, fats: 16, fiber: 3 },
    proTips: [
      "Do not use fish thinner than 1 inch—it overcooks before tomatoes soften.",
      "Add crumbled feta after baking for extra salt and creaminess.",
      "Crusty bread for sopping pan juices keeps crew happy without extra cooking.",
    ],
    tonightSpread: ["Orzo with lemon and parsley.", "Simple arugula salad with shaved parmesan."],
    leftovers: [
      "Flake fish into a Mediterranean grain salad next day.",
      "Fish tacos with leftover tomato-olive mix as salsa.",
    ],
    equipment: ["Two half-sheet pans", "Parchment paper"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "greek-lemon-chicken-potatoes",
      title: "Greek Lemon Chicken and Potatoes",
      subtitle: "Roast chicken thighs with oregano potatoes and pan jus",
      protein: "chicken",
      cuisine: "Greek",
      mealFormat: "roast",
      hook: "Complete tray dinner—protein and starch on one pan",
      prep: 20,
      cook: 45,
      difficulty: "medium",
      sourceId: "tmd-03",
    }),
    description:
      "Bone-in chicken thighs roast over lemon-garlic potatoes until golden. Pan juices become the finishing sauce at the line.",
    whyCrewsLikeIt:
      "Sunday-roast energy on a weeknight. Potatoes soak up chicken fat and lemon for maximum flavor per bite.",
    mealPrepNotes:
      "Par-boil potatoes 8 minutes for extra crisp edges if time allows.",
    stationWorkflow: [
      "Arrange potatoes in a single layer beneath chicken so they fry in rendered fat.",
      "Rotate pans and baste chicken with pan juices halfway through roast.",
      "Rest tray 5 minutes before portioning so juices redistribute into meat.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "Yukon gold potatoes", quantity: 4, unit: "lb", notes: "cut into wedges" },
      { name: "lemon", quantity: 4, unit: "whole", notes: "juiced and wedged" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "smashed" },
      { name: "dried oregano", quantity: 2, unit: "tbsp" },
      { name: "extra-virgin olive oil", quantity: 0.5, unit: "cup" },
      { name: "chicken broth", quantity: 1, unit: "cup", notes: "low sodium" },
      { name: "kosher salt", quantity: 2, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tbsp" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
    ],
    stepLines: [
      {
        title: "Heat oven and season potatoes",
        instruction:
          "Heat oven to 425°F. Toss potato wedges with half the oil, oregano, salt, and pepper until evenly coated and lightly glossy on all sides.",
        minutes: 10,
      },
      {
        title: "Arrange chicken over potatoes",
        instruction:
          "Nest seasoned chicken thighs skin-side up among potatoes on two half-sheets. Tuck lemon wedges and smashed garlic around the pan.",
        minutes: 5,
      },
      {
        title: "Roast and baste",
        instruction:
          "Roast 35–40 minutes, basting once with pan juices, until chicken reads 165°F and potato edges turn golden and crisp.",
        minutes: 38,
        heatLevel: "high",
      },
      {
        title: "Deglaze pan juices",
        instruction:
          "Transfer chicken to a holding pan. Add broth to sheet pans, scrape browned bits, simmer on stovetop 2 minutes into a thin jus.",
        minutes: 5,
      },
      {
        title: "Serve with parsley",
        instruction:
          "Portion chicken and potatoes, spoon jus over top. Potatoes should be tender inside with crisp exterior; chicken skin should crackle lightly.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 520, protein: 42, carbs: 38, fats: 24, fiber: 4 },
    proTips: [
      "Dry chicken skin thoroughly—moist skin never crisps in a hall oven.",
      "Add halved cherry tomatoes last 15 minutes for color and acidity.",
      "Feta crumble at the line adds salt without extra cooking.",
    ],
    tonightSpread: ["Horiatiki salad with cucumber and tomato.", "Warm pita bread."],
    leftovers: [
      "Shred chicken into a lemon-oregano wrap with potatoes.",
      "Chop potatoes into a breakfast hash with eggs.",
    ],
    equipment: ["Two half-sheet pans", "Instant-read thermometer"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "moroccan-chicken-chickpea-tray",
      title: "Moroccan Chicken Chickpea Tray",
      subtitle: "Warm-spiced thighs with chickpeas, apricots, and roasted carrots",
      protein: "chicken",
      cuisine: "Moroccan",
      mealFormat: "sheet_pan",
      hook: "Big North African flavor from one oven tray",
      prep: 22,
      cook: 35,
      difficulty: "medium",
      sourceId: "tmd-04",
    }),
    description:
      "Chicken thighs roast with chickpeas, carrots, dried apricots, and ras el hanout-inspired spices until fragrant and caramelized.",
    whyCrewsLikeIt:
      "Adventurous flavor without exotic equipment. Sweet apricots balance warm spices for broad crew appeal.",
    mealPrepNotes:
      "Mix spice blend in bulk for future trays. Soak apricots 10 minutes if very dry.",
    stationWorkflow: [
      "Drain and pat chickpeas dry—they crisp better when not dripping.",
      "Use two pans so chickpeas roast instead of steam under crowded chicken.",
      "Scatter fresh cilantro at the line, not before hold—herbs wilt in hot pans.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "canned chickpeas", quantity: 3, unit: "cans", notes: "15 oz, drained, patted dry" },
      { name: "carrots", quantity: 1.5, unit: "lb", notes: "cut into batons" },
      { name: "dried apricots", quantity: 1.5, unit: "cups", notes: "quartered" },
      { name: "yellow onion", quantity: 2, unit: "large", notes: "wedge-cut" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "ground cinnamon", quantity: 1, unit: "tsp" },
      { name: "ground ginger", quantity: 1, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "olive oil", quantity: 0.33, unit: "cup" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix spice blend",
        instruction:
          "Combine cumin, cinnamon, ginger, paprika, garlic, salt, and olive oil into a paste that coats a spoon without separating.",
        minutes: 5,
      },
      {
        title: "Coat chicken and vegetables",
        instruction:
          "Toss thighs, chickpeas, carrots, onion, and apricots with spice paste until every piece looks evenly coated and lightly glossy.",
        minutes: 10,
      },
      {
        title: "Roast until chicken is done",
        instruction:
          "Spread on two half-sheets in a single layer. Roast at 425°F 32–38 minutes until chicken reads 165°F and chickpeas crisp at edges.",
        minutes: 35,
        heatLevel: "high",
      },
      {
        title: "Rest and check texture",
        instruction:
          "Rest 5 minutes. Apricots should be plump and lightly caramelized; carrots tender with slight bite at the center.",
        minutes: 5,
      },
      {
        title: "Serve with couscous",
        instruction:
          "Portion chicken with chickpea mixture. Pan should smell warm-spiced, not burnt; chicken juices should run clear.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 495, protein: 40, carbs: 42, fats: 20, fiber: 9 },
    proTips: [
      "Ras el hanout blend works if you have it—use 2 tbsp instead of individual spices.",
      "Offer harissa at the line for heat without changing the base tray.",
      "Couscous cooks in 5 minutes—ideal side while tray rests.",
    ],
    tonightSpread: ["Fluffy couscous with lemon.", "Plain Greek yogurt for cooling contrast."],
    leftovers: [
      "Moroccan grain bowl with leftover couscous and chickpeas.",
      "Shred chicken into a wrap with hummus spread.",
    ],
    equipment: ["Two half-sheet pans", "Large mixing bowl"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "hummus-chicken-platter",
      title: "Hummus Chicken Platter",
      subtitle: "Sliced spiced chicken over creamy hummus with veg and pita",
      protein: "chicken",
      cuisine: "Middle Eastern",
      mealFormat: "plated",
      hook: "Shareable platter that feeds eight without a formal sit-down",
      prep: 25,
      cook: 22,
      difficulty: "medium",
      sourceId: "tmd-06",
    }),
    description:
      "Spiced grilled or roasted chicken breast slices fan over a base of hummus with cucumber, tomato, olives, and warm pita for scooping.",
    whyCrewsLikeIt:
      "Interactive platter format feels special but scales easily. High protein from chicken with fiber from hummus and veg.",
    mealPrepNotes:
      "Make hummus smooth in a food processor ahead. Slice chicken against the grain for tender bites.",
    stationWorkflow: [
      "Spread hummus in a large shallow hotel pan for maximum scoop surface.",
      "Arrange chicken in overlapping rows so portions look generous at the line.",
      "Keep pita wrapped in foil in low oven until service.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 4, unit: "lb" },
      { name: "canned chickpeas", quantity: 3, unit: "cans", notes: "15 oz, drained" },
      { name: "tahini", quantity: 0.5, unit: "cup" },
      { name: "lemon juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "4 for hummus, 4 minced" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "English cucumber", quantity: 2, unit: "whole", notes: "diced" },
      { name: "cherry tomatoes", quantity: 2, unit: "cups", notes: "halved" },
      { name: "Kalamata olives", quantity: 1, unit: "cup", notes: "pitted" },
      { name: "whole-wheat pita", quantity: 12, unit: "rounds" },
      { name: "olive oil", quantity: 0.25, unit: "cup" },
    ],
    stepLines: [
      {
        title: "Make hummus base",
        instruction:
          "Blend chickpeas, tahini, half the lemon juice, 4 garlic cloves, cumin, and 2 tbsp olive oil until silky smooth, adding ice water as needed.",
        minutes: 8,
      },
      {
        title: "Season and cook chicken",
        instruction:
          "Rub chicken with paprika, minced garlic, salt, and 2 tbsp oil. Roast at 425°F 18–22 minutes until 165°F with lightly charred edges.",
        minutes: 20,
        heatLevel: "high",
      },
      {
        title: "Rest and slice chicken",
        instruction:
          "Rest chicken 5 minutes, then slice ¼-inch against the grain. Slices should be moist with no pink center and clean cut edges.",
        minutes: 8,
      },
      {
        title: "Assemble platter",
        instruction:
          "Spread hummus in a large pan, drizzle olive oil and paprika. Arrange chicken over hummus with cucumber, tomatoes, and olives around edges.",
        minutes: 8,
      },
      {
        title: "Warm pita and serve",
        instruction:
          "Warm pita 5 minutes wrapped in foil at 300°F until soft and pliable. Serve for scooping hummus and chicken together.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 445, protein: 42, carbs: 38, fats: 16, fiber: 8 },
    proTips: [
      "Ice water in hummus makes it fluffier—add 2 tbsp at a time while blending.",
      "Sumac sprinkle at the line adds tartness without extra prep.",
      "Grill chicken on flat-top if oven is occupied—same spice rub works.",
    ],
    tonightSpread: ["Pickled red onion.", "Tabbouleh salad on the side."],
    leftovers: [
      "Chicken and hummus wrap with extra cucumber.",
      "Hummus dip with raw veg for next-shift snack.",
    ],
    equipment: ["Food processor", "Half-sheet pan", "Large serving platter or hotel pan"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "tabbouleh-chicken-bowls",
      title: "Tabbouleh Chicken Bowls",
      subtitle: "Herb-heavy bulgur salad topped with lemon grilled chicken",
      protein: "chicken",
      cuisine: "Lebanese",
      mealFormat: "bowl",
      hook: "Fresh bowl night that feels light but packs 40g protein",
      prep: 30,
      cook: 18,
      difficulty: "medium",
      sourceId: "tmd-07",
    }),
    description:
      "Fine bulgur tabbouleh with parsley, mint, tomato, and cucumber tops with grilled lemon chicken for a bright, herb-forward bowl line.",
    whyCrewsLikeIt:
      "Reset meal after heavy comfort-food weeks. Huge flavor from herbs without heavy sauces.",
    mealPrepNotes:
      "Soak bulgur while prepping herbs. Chop herbs coarse—not puréed—for authentic texture.",
    stationWorkflow: [
      "Drain bulgur well or bowls turn watery at the line.",
      "Grill chicken on flat-top or roast on sheet pan depending on equipment.",
      "Bowl line: tabbouleh base, sliced chicken, extra lemon, feta optional.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 3.5, unit: "lb" },
      { name: "fine bulgur", quantity: 2, unit: "cups", notes: "dry" },
      { name: "fresh parsley", quantity: 3, unit: "cups", notes: "finely chopped" },
      { name: "fresh mint", quantity: 1, unit: "cup", notes: "finely chopped" },
      { name: "cherry tomatoes", quantity: 2, unit: "cups", notes: "diced small" },
      { name: "English cucumber", quantity: 2, unit: "whole", notes: "diced small" },
      { name: "lemon juice", quantity: 0.5, unit: "cup", notes: "fresh" },
      { name: "extra-virgin olive oil", quantity: 0.33, unit: "cup" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "green onions", quantity: 6, unit: "whole", notes: "sliced" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Soak bulgur",
        instruction:
          "Cover bulgur with boiling water, cover bowl, soak 15–20 minutes until tender and fluffy. Drain thoroughly and fluff with a fork.",
        minutes: 20,
      },
      {
        title: "Build tabbouleh",
        instruction:
          "Toss bulgur with parsley, mint, tomato, cucumber, half the lemon juice, olive oil, garlic, and salt until herbs evenly distributed.",
        minutes: 15,
      },
      {
        title: "Season and cook chicken",
        instruction:
          "Rub chicken with remaining lemon juice, salt, and pepper. Grill or roast 16–18 minutes until 165°F with light char marks on exterior.",
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        title: "Rest and slice",
        instruction:
          "Rest chicken 5 minutes, slice thin. Meat should be white throughout with juices running clear, not pink at the center.",
        minutes: 5,
      },
      {
        title: "Assemble bowls",
        instruction:
          "Portion tabbouleh into bowls, top with sliced chicken and green onions. Salad should taste bright and herb-forward, not oily.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 410, protein: 40, carbs: 32, fats: 14, fiber: 7 },
    proTips: [
      "More parsley than bulgur is traditional—do not skimp on herbs.",
      "Prep tabbouleh 2 hours ahead so flavors meld; add chicken at service.",
      "Feta crumble adds salt if crew finds tabbouleh too lean.",
    ],
    tonightSpread: ["Warm pita wedges.", "Baba ganoush if available from store."],
    leftovers: [
      "Tabbouleh keeps 2 days; add fresh chicken when serving.",
      "Wrap in pita with hummus spread.",
    ],
    equipment: ["Grill or half-sheet pan", "Large mixing bowl"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "zaatar-roasted-chicken-thighs",
      title: "Za'atar Roasted Chicken Thighs",
      subtitle: "Middle Eastern spice-crusted thighs with roasted onions and lemon",
      protein: "chicken",
      cuisine: "Middle Eastern",
      mealFormat: "roast",
      hook: "Minimal ingredients, maximum aroma—hall favorite tray roast",
      prep: 15,
      cook: 38,
      difficulty: "easy",
      sourceId: "tmd-08",
    }),
    description:
      "Chicken thighs roast with za'atar, olive oil, lemon, and red onion until the spice crust is fragrant and skin crisps.",
    whyCrewsLikeIt:
      "Three-ingredient vibe with serious flavor. Smells incredible when crew walks in the door.",
    mealPrepNotes:
      "Mix za'atar oil ahead. Marinate thighs 30 minutes if time allows.",
    stationWorkflow: [
      "Skin-side up always—za'atar crust needs exposed skin to toast.",
      "Roast on parchment for easy cleanup of stuck spice crust.",
      "Serve with extra za'atar oil drizzle at the line for brightness.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "za'atar spice blend", quantity: 0.33, unit: "cup" },
      { name: "extra-virgin olive oil", quantity: 0.5, unit: "cup" },
      { name: "lemon", quantity: 4, unit: "whole", notes: "juiced and wedged" },
      { name: "red onion", quantity: 3, unit: "large", notes: "thick slices" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "smashed" },
      { name: "kosher salt", quantity: 1, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
    ],
    stepLines: [
      {
        title: "Mix za'atar oil",
        instruction:
          "Stir za'atar, olive oil, lemon juice, salt, and pepper until combined into a loose paste that coats the back of a spoon evenly.",
        minutes: 3,
      },
      {
        title: "Coat chicken and onion",
        instruction:
          "Pat thighs dry. Rub generously with za'atar oil. Nest among onion slices and garlic on two half-sheets, skin-side up.",
        minutes: 8,
      },
      {
        title: "Roast until crisp",
        instruction:
          "Roast at 425°F 35–40 minutes until skin is deep golden, za'atar fragrant, and internal temp hits 165°F at the thickest point.",
        minutes: 38,
        heatLevel: "high",
      },
      {
        title: "Rest with lemon wedges",
        instruction:
          "Rest 5 minutes. Tuck lemon wedges on tray for squeezing. Onion should be soft with charred edges; skin should crackle lightly.",
        minutes: 5,
      },
      {
        title: "Garnish and portion",
        instruction:
          "Scatter parsley over tray before portioning. Pan juices should smell lemony and herbal, not acrid or burnt.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 475, protein: 40, carbs: 8, fats: 32, fiber: 2 },
    proTips: [
      "Make your own za'atar if blend is stale—sumac should taste tart, not dusty.",
      "Pair with simple rice or pita—let the chicken be the star.",
      "Leftover za'atar oil works as salad dressing next day.",
    ],
    tonightSpread: ["Cucumber yogurt sauce.", "Warm pita and hummus."],
    leftovers: [
      "Slice into wraps with tahini drizzle.",
      "Shred over a grain bowl with pickled onions.",
    ],
    equipment: ["Two half-sheet pans", "Instant-read thermometer"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lemon-salmon-orzo-skillet",
      title: "Lemon Salmon Orzo Skillet",
      subtitle: "One-pan salmon with orzo, spinach, and capers",
      protein: "salmon",
      cuisine: "Mediterranean",
      mealFormat: "pasta",
      hook: "Complete skillet meal—fish and starch without multiple pots",
      prep: 18,
      cook: 25,
      difficulty: "medium",
      sourceId: "tmd-09",
    }),
    description:
      "Salmon sears in a large skillet while orzo simmers with lemon, spinach, and capers into a one-pan crew dinner.",
    whyCrewsLikeIt:
      "Feels restaurant-plated but cooks on one burner line. Omega-3 plus carbs in one ladle portion.",
    mealPrepNotes:
      "Use two skillets if station range is tight on space. Pat salmon dry before searing.",
    stationWorkflow: [
      "Sear salmon first, remove, finish orzo in same pan for flavor absorption.",
      "Wilt spinach off heat so it stays bright green, not olive drab.",
      "Return salmon on top for final 3 minutes to reheat without overcooking.",
    ],
    ingredients: [
      { name: "salmon fillets", quantity: 3.5, unit: "lb", notes: "6 oz portions, skin-on" },
      { name: "orzo pasta", quantity: 1.5, unit: "lb" },
      { name: "fresh spinach", quantity: 8, unit: "cups", notes: "packed" },
      { name: "lemon", quantity: 3, unit: "whole", notes: "zested and juiced" },
      { name: "capers", quantity: 0.25, unit: "cup", notes: "drained" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "chicken broth", quantity: 5, unit: "cups", notes: "low sodium" },
      { name: "extra-virgin olive oil", quantity: 0.25, unit: "cup" },
      { name: "Parmesan cheese", quantity: 0.75, unit: "cup", notes: "grated" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 0.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Sear salmon",
        instruction:
          "Heat 2 tbsp oil in large skillets over medium-high. Sear salmon skin-side down 4 minutes until skin crisps, flip, cook 2 minutes. Remove.",
        minutes: 8,
        heatLevel: "medium-high",
      },
      {
        title: "Toast orzo",
        instruction:
          "Add 1 tbsp oil and orzo to pan. Toast 2–3 minutes, stirring, until grains smell nutty and turn lightly golden at edges.",
        minutes: 3,
      },
      {
        title: "Simmer orzo in broth",
        instruction:
          "Add garlic, broth, lemon zest, salt, and pepper. Simmer 10–12 minutes, stirring often, until orzo is tender and broth mostly absorbed.",
        minutes: 12,
        heatLevel: "medium",
      },
      {
        title: "Fold in spinach and capers",
        instruction:
          "Stir spinach, capers, lemon juice, and parmesan off heat until spinach wilts and orzo looks creamy, not soupy or stuck.",
        minutes: 3,
      },
      {
        title: "Top with salmon and serve",
        instruction:
          "Nest salmon on orzo, cover 2 minutes to reheat. Salmon should flake at 125°F center, orzo glossy and al dente.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 520, protein: 38, carbs: 48, fats: 20, fiber: 4 },
    proTips: [
      "Stir orzo frequently—it sticks faster than long pasta in a wide pan.",
      "Pull salmon early; it finishes during the covered reheat step.",
      "Add halved cherry tomatoes with spinach for color and sweetness.",
    ],
    tonightSpread: ["Garlic bread from split baguette.", "Simple mixed green salad."],
    leftovers: [
      "Reheat gently with splash of broth—microwave on medium power.",
      "Orzo salad cold next day with extra lemon.",
    ],
    equipment: ["Two 12-inch skillets with lids", "Wooden spoon"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "white-bean-kale-soup",
      title: "White Bean and Kale Soup",
      subtitle: "Tuscan-style cannellini soup with garlic, rosemary, and parmesan rind",
      protein: "plant",
      cuisine: "Italian",
      mealFormat: "soup",
      hook: "Fiber-rich pot that feeds eight on a tight grocery budget",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "ml-01",
    }),
    description:
      "Cannellini beans simmer with kale, garlic, rosemary, and parmesan rind into a thick, rustic soup. Blend partial batch for creamy body.",
    whyCrewsLikeIt:
      "Vegetarian main that still fills up firefighters. Cheap, hearty, and holds well on the back burner.",
    mealPrepNotes:
      "Save parmesan rinds in the freezer for soup weeks. Chop kale day-of so it stays green.",
    stationWorkflow: [
      "Blend one can of beans for body without adding cream.",
      "Add kale last 5 minutes—longer cooking turns it bitter and drab.",
      "Serve with parmesan and olive oil drizzle at the line.",
    ],
    ingredients: [
      { name: "cannellini beans", quantity: 4, unit: "cans", notes: "15 oz, drained" },
      { name: "lacinato kale", quantity: 1, unit: "bunch", notes: "stemmed, chopped" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "carrots", quantity: 2, unit: "whole", notes: "diced" },
      { name: "celery stalks", quantity: 3, unit: "whole", notes: "diced" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "vegetable broth", quantity: 8, unit: "cups", notes: "low sodium" },
      { name: "fresh rosemary", quantity: 2, unit: "sprigs" },
      { name: "Parmesan rind", quantity: 1, unit: "piece", notes: "2-inch chunk" },
      { name: "crushed tomatoes", quantity: 1, unit: "can", notes: "14.5 oz" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Sweat mirepoix",
        instruction:
          "Heat olive oil in an 8-quart pot over medium. Cook onion, carrot, and celery 8 minutes until softened and onion turns translucent at edges.",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Add garlic and tomatoes",
        instruction:
          "Stir in garlic, cook 1 minute until fragrant. Add crushed tomatoes and cook 3 minutes until color deepens slightly and raw tomato smell fades.",
        minutes: 4,
      },
      {
        title: "Simmer beans and broth",
        instruction:
          "Add 3 cans beans, broth, rosemary, and parmesan rind. Simmer 20 minutes so flavors meld and broth reduces slightly.",
        minutes: 20,
        heatLevel: "medium-low",
      },
      {
        title: "Blend partial batch",
        instruction:
          "Blend 1 can beans with 1 cup soup until smooth. Return to pot for creamy body without heavy cream.",
        minutes: 5,
      },
      {
        title: "Wilt kale and serve",
        instruction:
          "Stir in kale, simmer 5 minutes until tender-bright green. Soup should coat a spoon; adjust salt before ladle service.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 285, protein: 14, carbs: 42, fats: 8, fiber: 12 },
    proTips: [
      "Parmesan rind is free flavor—never throw them away.",
      "Crusty bread for dipping turns this into a full hall meal.",
      "Red pepper flakes at the line add heat without changing the pot.",
    ],
    tonightSpread: ["Crusty Italian bread.", "Shaved parmesan and olive oil drizzle."],
    leftovers: [
      "Thickens overnight—thin with broth when reheating.",
      "Freeze quart portions for backup vegetarian nights.",
    ],
    equipment: ["8-quart stock pot", "Immersion blender"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lemon-chicken-orzo-soup",
      title: "Lemon Chicken Orzo Soup",
      subtitle: "Bright broth with shredded chicken, orzo, and tender carrots",
      protein: "chicken",
      cuisine: "Greek",
      mealFormat: "soup",
      hook: "Post-call comfort soup that ladles fast and feels restorative",
      prep: 20,
      cook: 35,
      difficulty: "easy",
      sourceId: "ml-02",
    }),
    description:
      "Shredded chicken simmers in lemony broth with orzo, carrots, and dill until the soup is bright, silky, and filling.",
    whyCrewsLikeIt:
      "Avgolemono vibes without the egg tempering fuss. Gentle on the stomach after a rough shift.",
    mealPrepNotes:
      "Cook orzo separately and add at service to prevent bloating in the pot.",
    stationWorkflow: [
      "Poach chicken in broth for maximum flavor—do not use plain water.",
      "Stir lemon juice off heat so broth stays bright, not curdled-looking.",
      "Keep orzo in a separate hotel pan and add per bowl for best texture.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 2, unit: "lb" },
      { name: "orzo pasta", quantity: 1.5, unit: "cups", notes: "dry" },
      { name: "carrots", quantity: 3, unit: "whole", notes: "diced small" },
      { name: "celery stalks", quantity: 3, unit: "whole", notes: "diced small" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "diced" },
      { name: "chicken broth", quantity: 10, unit: "cups", notes: "low sodium" },
      { name: "lemon juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "lemon zest", quantity: 1, unit: "tbsp" },
      { name: "fresh dill", quantity: 0.33, unit: "cup", notes: "chopped" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "bay leaves", quantity: 2, unit: "whole" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Poach chicken",
        instruction:
          "Simmer chicken breasts in 6 cups broth with bay leaves 15–18 minutes until 165°F. Rest, shred into bite-size strands with two forks.",
        minutes: 20,
        heatLevel: "medium",
      },
      {
        title: "Cook orzo separately",
        instruction:
          "Boil orzo in salted water 8–9 minutes until al dente. Drain, toss with 1 tsp oil to prevent clumping.",
        minutes: 10,
      },
      {
        title: "Build soup base",
        instruction:
          "Sauté onion, carrot, celery, and garlic in pot 6 minutes until softened. Add remaining broth and shredded chicken, simmer 10 minutes.",
        minutes: 16,
      },
      {
        title: "Finish with lemon",
        instruction:
          "Remove from heat. Stir lemon juice, zest, and dill. Broth should taste bright and balanced, not harsh or overly tart.",
        minutes: 3,
      },
      {
        title: "Serve with orzo",
        instruction:
          "Add cooked orzo to bowls, ladle soup over top. Orzo should stay separate, not swollen and mushy in the pot.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 340, protein: 32, carbs: 36, fats: 8, fiber: 3 },
    proTips: [
      "Never boil after adding lemon—it dulls the bright flavor.",
      "Rotisserie chicken works in a pinch—add at the end.",
      "Extra dill at the line makes the soup smell incredible.",
    ],
    tonightSpread: ["Warm pita or crusty rolls.", "Greek salad on the side."],
    leftovers: [
      "Store orzo separate from soup or it absorbs all broth overnight.",
      "Freeze soup base without orzo for easy reheat.",
    ],
    equipment: ["8-quart stock pot", "Medium saucepan for orzo"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lean-beef-broccoli-rice",
      title: "Lean Beef and Broccoli Rice",
      subtitle: "Flat-top stir-fry with flank steak, broccoli, and brown rice",
      protein: "beef",
      cuisine: "Chinese-American",
      mealFormat: "stir_fry",
      hook: "Takeout remake with half the grease and double the broccoli",
      prep: 25,
      cook: 15,
      difficulty: "medium",
      sourceId: "ew-01",
    }),
    description:
      "Flank steak strips sear fast with broccoli florets in a ginger-garlic soy sauce, served over brown rice for a classic hall stir-fry line.",
    whyCrewsLikeIt:
      "Familiar takeout flavor without the food-coma. High protein and ready in one wok rotation after calls.",
    mealPrepNotes:
      "Slice beef against the grain paper-thin. Mix sauce in a bowl before the fire hits the pan.",
    stationWorkflow: [
      "Cook rice first in a cooker—wok stays hot for beef without interruption.",
      "Sear beef in two batches; overcrowding steams meat gray instead of browned.",
      "Blanch broccoli 2 minutes first for consistent tender-crisp texture at scale.",
    ],
    ingredients: [
      { name: "flank steak", quantity: 3, unit: "lb", notes: " sliced thin against grain" },
      { name: "broccoli crowns", quantity: 2.5, unit: "lb", notes: "cut into florets" },
      { name: "brown rice", quantity: 3, unit: "cups", notes: "uncooked" },
      { name: "low-sodium soy sauce", quantity: 0.5, unit: "cup" },
      { name: "oyster sauce", quantity: 3, unit: "tbsp" },
      { name: "beef broth", quantity: 0.5, unit: "cup", notes: "low sodium" },
      { name: "cornstarch", quantity: 2, unit: "tbsp" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "grated" },
      { name: "sesame oil", quantity: 2, unit: "tbsp" },
      { name: "vegetable oil", quantity: 3, unit: "tbsp" },
      { name: "green onions", quantity: 6, unit: "whole", notes: "sliced" },
    ],
    stepLines: [
      {
        title: "Cook brown rice",
        instruction:
          "Simmer brown rice until tender and chewy, 35–40 minutes. Fluff with fork and hold warm in rice cooker until stir-fry is ready.",
        minutes: 40,
      },
      {
        title: "Blanch broccoli",
        instruction:
          "Boil broccoli florets 2 minutes until bright green and slightly tender. Drain and shock in ice water so florets stay crisp, not mushy.",
        minutes: 5,
      },
      {
        title: "Mix stir-fry sauce",
        instruction:
          "Whisk soy sauce, oyster sauce, broth, cornstarch, half the garlic, and ginger until smooth with no starch lumps at the bottom.",
        minutes: 3,
      },
      {
        title: "Sear beef in batches",
        instruction:
          "Heat wok or skillet over high with vegetable oil. Sear beef strips 2–3 minutes per batch until browned edges appear, not gray and steaming.",
        minutes: 8,
        heatLevel: "high",
      },
      {
        title: "Combine and glaze",
        instruction:
          "Return all beef, add broccoli and sauce. Toss 2–3 minutes until sauce thickens to a glossy coat. Finish with sesame oil and green onions.",
        minutes: 4,
      },
    ],
    nutrition: { calories: 485, protein: 38, carbs: 52, fats: 14, fiber: 6 },
    proTips: [
      "Freeze flank 20 minutes for easier thin slicing on a busy prep board.",
      "Do not skip oyster sauce—it adds depth soy alone cannot.",
      "Offer chili crisp at the line for crews who want crunchy heat.",
    ],
    tonightSpread: ["Fortune cookies if available—crew morale boost.", "Quick miso soup cups."],
    leftovers: [
      "Reheat in skillet with splash of broth to restore sauce gloss.",
      "Beef and broccoli omelet next morning with sriracha.",
    ],
    equipment: ["Wok or large skillet", "Rice cooker", "Mixing bowls"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),
];
