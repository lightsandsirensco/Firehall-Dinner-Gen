import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

export const batch04: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "turkey-lettuce-wrap-night",
      title: "Turkey Lettuce Wrap Night",
      subtitle: "Ginger-garlic ground turkey in crisp romaine with hoisin and peanuts",
      protein: "turkey",
      cuisine: "Asian-American",
      mealFormat: "handheld",
      hook: "Light handheld dinner that still delivers serious protein",
      prep: 20,
      cook: 15,
      difficulty: "easy",
      sourceId: "ew-02",
    }),
    description:
      "Lean ground turkey cooks with water chestnuts, ginger, and soy, served in romaine leaves with hoisin, lime, and crushed peanuts.",
    whyCrewsLikeIt:
      "Low-carb option without feeling like punishment. Interactive assembly keeps dinner fun on quiet nights.",
    mealPrepNotes:
      "Wash and dry lettuce cups early. Keep filling warm in a hotel pan at the line.",
    stationWorkflow: [
      "Keep lettuce on ice until service—warm filling wilts leaves instantly.",
      "Cook turkey in batches for better browning and crisper texture.",
      "Build station: lettuce, turkey, hoisin, peanuts, lime, scallions.",
    ],
    ingredients: [
      { name: "lean ground turkey", quantity: 3, unit: "lb" },
      { name: "romaine lettuce hearts", quantity: 4, unit: "heads", notes: "leaves separated" },
      { name: "water chestnuts", quantity: 1, unit: "can", notes: "8 oz, minced" },
      { name: "green onions", quantity: 8, unit: "whole", notes: "sliced" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "grated" },
      { name: "low-sodium soy sauce", quantity: 0.25, unit: "cup" },
      { name: "hoisin sauce", quantity: 0.33, unit: "cup" },
      { name: "sesame oil", quantity: 2, unit: "tbsp" },
      { name: "rice vinegar", quantity: 2, unit: "tbsp" },
      { name: "crushed roasted peanuts", quantity: 0.5, unit: "cup" },
      { name: "lime", quantity: 3, unit: "whole", notes: "wedged" },
    ],
    stepLines: [
      {
        title: "Prep lettuce cups",
        instruction:
          "Wash romaine leaves and dry completely on towels. Store chilled on sheet pans so cups stay rigid and snap lightly when folded.",
        minutes: 10,
      },
      {
        title: "Brown turkey",
        instruction:
          "Cook ground turkey in batches over medium-high 8–10 minutes, crumbling until fully cooked with lightly golden edges and no pink remaining.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Add aromatics",
        instruction:
          "Stir in ginger, garlic, and water chestnuts. Cook 3–4 minutes until fragrant and chestnuts heated through with slight crunch remaining.",
        minutes: 4,
      },
      {
        title: "Finish sauce",
        instruction:
          "Add soy sauce, 2 tbsp hoisin, sesame oil, and vinegar. Simmer 2 minutes until liquid mostly absorbs and turkey looks glossy, not soupy.",
        minutes: 2,
      },
      {
        title: "Assemble at the line",
        instruction:
          "Fill each leaf with ¼ cup turkey, drizzle hoisin, sprinkle peanuts and scallions. Serve with lime wedges for squeezing.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 275, protein: 34, carbs: 10, fats: 11, fiber: 2 },
    proTips: [
      "Offer jasmine rice on the side for crew who want more carbs.",
      "Use butter lettuce if romaine cups tear—more flexible for heavy fills.",
      "Check for peanut allergies before serving crushed peanuts.",
    ],
    tonightSpread: ["Steamed jasmine rice.", "Cucumber salad with rice vinegar."],
    leftovers: [
      "Turkey filling over rice bowls—skip lettuce next day.",
      "Wrap in rice paper with fresh herbs.",
    ],
    equipment: ["Large skillet", "Sheet pans"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "caprese-chicken-bake",
      title: "Caprese Chicken Bake",
      subtitle: "Baked chicken breasts with tomato, mozzarella, and balsamic glaze",
      protein: "chicken",
      cuisine: "Italian",
      mealFormat: "bake",
      hook: "Sheet pan caprese with protein—minimal effort, maximum color",
      prep: 15,
      cook: 25,
      difficulty: "easy",
      sourceId: "ew-03",
    }),
    description:
      "Chicken breasts bake with grape tomatoes, fresh mozzarella, and basil, finished with balsamic reduction for a colorful hall tray.",
    whyCrewsLikeIt:
      "Looks impressive with almost no skill required. Bright flavors after weeks of heavy comfort food.",
    mealPrepNotes:
      "Pound chicken to even thickness for uniform baking. Reduce balsamic while chicken roasts.",
    stationWorkflow: [
      "Pound breasts to ¾-inch even thickness—thick spots dry before thin spots finish.",
      "Add mozzarella last 8 minutes so it melts without rubberizing.",
      "Drizzle balsamic at the line, not before hold—reduction stays glossy.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 4, unit: "lb", notes: "pounded even" },
      { name: "grape tomatoes", quantity: 2, unit: "lb", notes: "halved" },
      { name: "fresh mozzarella", quantity: 1.5, unit: "lb", notes: "sliced or torn" },
      { name: "fresh basil", quantity: 1, unit: "cup", notes: "torn" },
      { name: "balsamic vinegar", quantity: 1, unit: "cup" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "extra-virgin olive oil", quantity: 3, unit: "tbsp" },
      { name: "dried Italian seasoning", quantity: 1, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Reduce balsamic",
        instruction:
          "Simmer balsamic vinegar in a small pot 10–12 minutes until reduced by half and coats a spoon with syrupy consistency, not thin and runny.",
        minutes: 12,
        heatLevel: "medium",
      },
      {
        title: "Season chicken and tomatoes",
        instruction:
          "Rub chicken with olive oil, Italian seasoning, salt, and pepper. Arrange on two half-sheets with halved tomatoes tucked around edges.",
        minutes: 8,
      },
      {
        title: "Bake chicken through",
        instruction:
          "Bake at 400°F 16–18 minutes until chicken reads 165°F and tomatoes begin to burst and release juice into the pan.",
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        title: "Add mozzarella",
        instruction:
          "Top each breast with mozzarella slices. Return to oven 6–8 minutes until cheese melts with light golden spots, not rubbery and stiff.",
        minutes: 8,
      },
      {
        title: "Finish with basil and balsamic",
        instruction:
          "Scatter basil over tray. Drizzle balsamic reduction at the line. Chicken should slice cleanly with juices running clear.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 385, protein: 42, carbs: 12, fats: 18, fiber: 2 },
    proTips: [
      "Use ciliegine mozzarella for faster, even melting.",
      "Serve over arugula for a one-plate meal without extra cooking.",
      "Store balsamic reduction in squeeze bottle for consistent drizzle.",
    ],
    tonightSpread: ["Whole-wheat pasta with olive oil and garlic.", "Simple green salad."],
    leftovers: [
      "Slice into caprese chicken sandwiches on ciabatta.",
      "Chop over a grain bowl with extra balsamic.",
    ],
    equipment: ["Two half-sheet pans", "Small saucepan"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "blackened-cod-taco-night",
      title: "Blackened Cod Taco Night",
      subtitle: "Spice-crusted cod with lime slaw and avocado crema in corn tortillas",
      protein: "fish",
      cuisine: "Mexican",
      mealFormat: "tacos",
      hook: "Bold blackened fish tacos without a deep fryer",
      prep: 25,
      cook: 12,
      difficulty: "medium",
      sourceId: "ew-04",
    }),
    description:
      "Cod fillets crust with blackening spice in a hot skillet, then tuck into corn tortillas with cabbage slaw and avocado crema.",
    whyCrewsLikeIt:
      "Big spice and fresh crunch. Handheld format keeps service moving when everyone hits the kitchen at once.",
    mealPrepNotes:
      "Mix blackening spice in bulk. Pat cod dry right before cooking.",
    stationWorkflow: [
      "Vent hood on—blackening spice smokes at high heat.",
      "Cook fish in batches in cast iron for best crust.",
      "Taco bar: fish, slaw, crema, pico, lime, hot sauce.",
    ],
    ingredients: [
      { name: "cod fillets", quantity: 3.5, unit: "lb", notes: "1-inch thick" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "garlic powder", quantity: 1, unit: "tbsp" },
      { name: "onion powder", quantity: 1, unit: "tbsp" },
      { name: "dried thyme", quantity: 1, unit: "tsp" },
      { name: "cayenne pepper", quantity: 1, unit: "tsp" },
      { name: "green cabbage", quantity: 1, unit: "head", notes: "shredded fine" },
      { name: "avocado", quantity: 3, unit: "whole", notes: "ripe" },
      { name: "Greek yogurt", quantity: 1, unit: "cup" },
      { name: "lime juice", quantity: 0.25, unit: "cup", notes: "fresh" },
      { name: "corn tortillas", quantity: 24, unit: "whole", notes: "6-inch" },
      { name: "vegetable oil", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Mix blackening spice",
        instruction:
          "Combine paprika, garlic powder, onion powder, thyme, cayenne, 1 tbsp salt, and 1 tsp pepper. Rub should smell smoky and evenly blended.",
        minutes: 3,
      },
      {
        title: "Prep slaw and crema",
        instruction:
          "Toss cabbage with half the lime juice and pinch of salt until lightly wilted but still crunchy. Blend avocado, yogurt, and remaining lime for crema.",
        minutes: 10,
      },
      {
        title: "Coat and sear cod",
        instruction:
          "Pat cod dry, coat generously with blackening spice. Sear in hot oiled skillet 3–4 minutes per side until crust is dark and fish reads 145°F.",
        minutes: 10,
        heatLevel: "high",
      },
      {
        title: "Rest and flake fish",
        instruction:
          "Rest fish 3 minutes, break into large chunks. Flesh should be opaque, moist, and flake cleanly without drying into strings.",
        minutes: 3,
      },
      {
        title: "Assemble tacos",
        instruction:
          "Warm tortillas in foil. Fill with fish, slaw, and crema. Crust should stay spicy and crisp-tender, not soggy from over-filling.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 365, protein: 30, carbs: 32, fats: 14, fiber: 6 },
    proTips: [
      "Do not move fish early—crust releases when properly seared.",
      "Reduce cayenne for mild crews; offer hot sauce at the line instead.",
      "Double-stack tortillas for sturdier handhelds.",
    ],
    tonightSpread: ["Black beans with cumin.", "Pickled red onion."],
    leftovers: [
      "Fish over rice bowl with slaw and crema.",
      "Blackened fish salad—skip tortillas.",
    ],
    equipment: ["Cast iron skillet", "Blender for crema"],
    spiceLevel: "hot",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "pesto-tomato-chicken-tray",
      title: "Pesto Tomato Chicken Tray",
      subtitle: "Basil pesto chicken with roasted cherry tomatoes and zucchini",
      protein: "chicken",
      cuisine: "Italian",
      mealFormat: "sheet_pan",
      hook: "Colorful oven tray with green pesto and burst tomatoes",
      prep: 18,
      cook: 28,
      difficulty: "easy",
      sourceId: "ba-01",
    }),
    description:
      "Chicken thighs roast with cherry tomatoes and zucchini, brushed with basil pesto until golden and fragrant.",
    whyCrewsLikeIt:
      "Summer flavors year-round. One tray, minimal cleanup, and the kitchen smells incredible.",
    mealPrepNotes:
      "Use store pesto or make a batch ahead. Zucchini adds moisture—do not skip.",
    stationWorkflow: [
      "Brush pesto last 12 minutes—early application burns basil.",
      "Cut zucchini thick so it roasts, not steams, under chicken.",
      "Finish with fresh basil at the line for bright color.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "cherry tomatoes", quantity: 2, unit: "lb", notes: "halved" },
      { name: "zucchini", quantity: 3, unit: "large", notes: "thick half-moons" },
      { name: "basil pesto", quantity: 1, unit: "cup" },
      { name: "extra-virgin olive oil", quantity: 2, unit: "tbsp" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "Parmesan cheese", quantity: 0.5, unit: "cup", notes: "grated" },
      { name: "kosher salt", quantity: 1, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
      { name: "fresh basil", quantity: 0.5, unit: "cup", notes: "for garnish" },
    ],
    stepLines: [
      {
        title: "Heat oven and prep vegetables",
        instruction:
          "Heat oven to 425°F. Toss tomatoes and zucchini with olive oil, salt, and pepper on two half-sheets until lightly coated.",
        minutes: 8,
      },
      {
        title: "Season chicken",
        instruction:
          "Pat thighs dry, season with salt and pepper. Nest skin-side up among vegetables with space between pieces for air circulation.",
        minutes: 5,
      },
      {
        title: "Initial roast",
        instruction:
          "Roast 18 minutes until chicken skin renders fat and turns lightly golden while tomatoes begin to soften at edges.",
        minutes: 18,
        heatLevel: "high",
      },
      {
        title: "Brush with pesto",
        instruction:
          "Brush pesto over chicken and vegetables. Sprinkle parmesan. Roast 10–12 more minutes until chicken hits 165°F and pesto edges caramelize.",
        minutes: 12,
      },
      {
        title: "Garnish and serve",
        instruction:
          "Top with fresh basil. Tomatoes should burst with juice; zucchini tender with slight bite at center.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 465, protein: 40, carbs: 10, fats: 30, fiber: 3 },
    proTips: [
      "Thin pesto with 1 tbsp olive oil if too thick to brush evenly.",
      "Serve over polenta or pasta for a fuller plate.",
      "Sun-dried tomato pesto swap works if basil pesto is unavailable.",
    ],
    tonightSpread: ["Creamy polenta in a hotel pan.", "Arugula salad with lemon."],
    leftovers: [
      "Slice chicken into pesto pasta next day.",
      "Chop into a wrap with extra pesto and mozzarella.",
    ],
    equipment: ["Two half-sheet pans", "Pastry brush"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "boneless-chicken-thighs-sweet-potato-spinach",
      title: "Boneless Chicken Thighs with Sweet Potato & Fresh Spinach",
      subtitle: "Seared thighs with roasted sweet potato and garlicky spinach",
      protein: "chicken",
      cuisine: "American",
      mealFormat: "plated_main",
      hook: "High-protein hall plate — seared chicken, roasted carbs, bright greens",
      prep: 20,
      cook: 35,
      difficulty: "medium",
      sourceId: "ba-02",
    }),
    description:
      "Boneless chicken thighs sear golden in a hot skillet while sweet potato wedges roast until caramelized. Fresh spinach hits garlic oil at the line for a complete performance plate.",
    whyCrewsLikeIt:
      "Clean protein-forward plate without stew vibes. Thighs stay juicy, sweet potato fuels the shift, spinach adds volume without feeling like diet food.",
    mealPrepNotes:
      "Cut sweet potato wedges uniform for even roasting. Pat thighs completely dry before searing.",
    stationWorkflow: [
      "Roast sweet potatoes first—they hold hot while thighs sear to order.",
      "Sear thighs in batches; crowded pans steam instead of brown.",
      "Wilt spinach off heat so it stays bright green at service.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb", notes: "trimmed, patted dry" },
      { name: "sweet potatoes", quantity: 3, unit: "lb", notes: "peeled, cut into 1-inch wedges" },
      { name: "fresh spinach", quantity: 8, unit: "cups", notes: "packed" },
      { name: "extra-virgin olive oil", quantity: 0.25, unit: "cup" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "smoked paprika", quantity: 2, unit: "tsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
      { name: "lemon", quantity: 2, unit: "whole", notes: "cut into wedges" },
      { name: "red pepper flakes", quantity: 0.5, unit: "tsp", notes: "optional" },
    ],
    stepLines: [
      {
        title: "Season and prep thighs",
        instruction:
          "Trim excess fat from thighs and pat completely dry. Season both sides with salt, pepper, and half the paprika so the sear builds a spiced crust.",
        minutes: 8,
      },
      {
        title: "Roast sweet potato wedges",
        instruction:
          "Toss wedges with 2 tbsp olive oil, 1 tsp salt, and paprika. Spread on two half-sheets in a single layer. Roast at 425°F 28–32 minutes until edges caramelize and centers pierce easily.",
        minutes: 32,
        heatLevel: "high",
      },
      {
        title: "Sear chicken thighs",
        instruction:
          "Heat remaining oil in skillets over medium-high. Season thighs with salt and pepper. Sear 5–6 minutes per side until deep golden with crisp edges and internal temp reaches 165°F. Rest 5 minutes, then slice.",
        minutes: 14,
        heatLevel: "medium-high",
      },
      {
        title: "Sauté spinach",
        instruction:
          "In the same pan over medium, cook garlic 30 seconds until fragrant. Add spinach in batches, tossing until just wilted and bright green. Finish with a pinch of salt and lemon juice.",
        minutes: 4,
      },
      {
        title: "Plate for service",
        instruction:
          "Portion two sliced thighs per plate with a mound of sweet potato wedges and sautéed spinach on the side. Protein should dominate the plate; vegetables and carbs stay distinct, not mixed into sauce.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 485, protein: 42, carbs: 32, fats: 22, fiber: 6 },
    proTips: [
      "Swap half the paprika for cumin if crews want a warmer spice profile.",
      "Hold roasted wedges in a 200°F oven while batch-searing thighs on busy nights.",
      "Offer hot sauce at the line—keeps the plate lean without extra fat.",
    ],
    tonightSpread: ["Simple green salad with lemon.", "Brown rice for crews wanting extra carbs."],
    leftovers: [
      "Slice thighs over spinach for next-day power bowls.",
      "Re-crisp sweet potato wedges in a hot oven 8 minutes.",
    ],
    equipment: ["Two half-sheet pans", "Large skillets", "Instant-read thermometer"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "spanish-chicken-chorizo-rice",
      title: "Spanish Chicken and Chorizo Rice",
      subtitle: "One-pot saffron rice with chicken thighs, chorizo, and peas",
      protein: "chicken",
      cuisine: "Spanish",
      mealFormat: "one_pot",
      hook: "Paella vibes in one Dutch oven—no specialty pan required",
      prep: 25,
      cook: 45,
      difficulty: "medium",
      sourceId: "nyt-01",
    }),
    description:
      "Chicken thighs and chorizo cook with bomba or short-grain rice, saffron, bell pepper, and peas into a fragrant one-pot crew dinner.",
    whyCrewsLikeIt:
      "Bold Spanish flavors feel like a special occasion. One pot means one cleanup after a long shift.",
    mealPrepNotes:
      "Bloom saffron in warm broth 10 minutes before cooking. Use wide Dutch oven for even rice.",
    stationWorkflow: [
      "Do not stir rice after initial mix—stirring releases starch and makes mush.",
      "Crisp chorizo first and reserve fat for browning chicken.",
      "Rest pot 5 minutes covered off heat before serving for fluffy rice.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 12, unit: "pieces", notes: "about 4.5 lb" },
      { name: "Spanish chorizo", quantity: 12, unit: "oz", notes: "sliced into coins" },
      { name: "short-grain rice", quantity: 3, unit: "cups", notes: "bomba or arborio" },
      { name: "red bell pepper", quantity: 2, unit: "whole", notes: "diced" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "garlic cloves", quantity: 5, unit: "cloves", notes: "minced" },
      { name: "chicken broth", quantity: 5, unit: "cups", notes: "low sodium" },
      { name: "saffron threads", quantity: 0.5, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "frozen peas", quantity: 1.5, unit: "cups" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Bloom saffron",
        instruction:
          "Steep saffron in warm broth 10 minutes until liquid turns golden and smells distinctly floral and earthy.",
        minutes: 10,
      },
      {
        title: "Crisp chorizo and brown chicken",
        instruction:
          "Cook chorizo in Dutch oven until fat renders and edges crisp. Remove. Brown chicken thighs in chorizo fat 4 minutes per side until golden.",
        minutes: 15,
        heatLevel: "medium-high",
      },
      {
        title: "Build rice base",
        instruction:
          "Sauté onion and pepper 5 minutes. Add garlic, paprika, and rice. Toast 2 minutes until rice edges look translucent and smell nutty.",
        minutes: 7,
      },
      {
        title: "Simmer covered",
        instruction:
          "Add saffron broth, nest chicken and chorizo on top. Simmer covered 25–30 minutes without stirring until rice absorbs liquid and is tender.",
        minutes: 30,
        heatLevel: "medium-low",
      },
      {
        title: "Add peas and rest",
        instruction:
          "Stir in peas off heat, cover 5 minutes. Rice should be fluffy with slight socarrat crust at bottom if heat was even.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 545, protein: 38, carbs: 52, fats: 22, fiber: 4 },
    proTips: [
      "Wide pot is essential—deep narrow pots cook unevenly.",
      "Lemon wedges at the line brighten rich chorizo fat.",
      "Substitute andouille if Spanish chorizo unavailable—adjust salt.",
    ],
    tonightSpread: ["Simple green salad with sherry vinaigrette.", "Crusty bread for scraping pan."],
    leftovers: [
      "Reheat covered with splash of broth to restore moisture.",
      "Arancini-style balls from leftover rice—deep fry or bake.",
    ],
    equipment: ["7-quart Dutch oven with lid", "Wooden spoon"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "yogurt-marinated-grill-chicken",
      title: "Yogurt Marinated Grill Chicken",
      subtitle: "Tender spiced chicken thighs from an overnight yogurt marinade",
      protein: "chicken",
      cuisine: "Middle Eastern",
      mealFormat: "grill",
      hook: "Batch grill chicken that stays juicy even if service runs late",
      prep: 20,
      cook: 20,
      difficulty: "medium",
      sourceId: "nyt-02",
    }),
    description:
      "Chicken thighs marinate in Greek yogurt with lemon, garlic, and warm spices, then grill until charred outside and juicy inside.",
    whyCrewsLikeIt:
      "Yogurt tenderizes lean meat for foolproof grilling. Smoky char without drying out—ideal for summer hall nights.",
    mealPrepNotes:
      "Marinate 4–24 hours. Bring to room temp 20 minutes before grilling.",
    stationWorkflow: [
      "Oil grill grates well—yogurt marinade sticks if grates are dry.",
      "Grill skin-side down first for crisp char, finish flesh-side down.",
      "Hold finished chicken in foil at 170°F max to prevent drying.",
    ],
    ingredients: [
      { name: "bone-in chicken thighs", quantity: 16, unit: "pieces", notes: "about 6 lb" },
      { name: "plain Greek yogurt", quantity: 2, unit: "cups" },
      { name: "lemon juice", quantity: 0.33, unit: "cup", notes: "fresh" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "ground cumin", quantity: 2, unit: "tsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "ground coriander", quantity: 1, unit: "tsp" },
      { name: "kosher salt", quantity: 2, unit: "tbsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "fresh parsley", quantity: 0.5, unit: "cup", notes: "chopped" },
    ],
    stepLines: [
      {
        title: "Mix marinade",
        instruction:
          "Combine yogurt, lemon juice, garlic, cumin, paprika, coriander, salt, pepper, and 2 tbsp oil until smooth and evenly spiced throughout.",
        minutes: 5,
      },
      {
        title: "Marinate chicken",
        instruction:
          "Coat thighs thoroughly in marinade. Refrigerate at least 4 hours or overnight so yogurt enzymes tenderize meat and flavors penetrate.",
      },
      {
        title: "Preheat grill",
        instruction:
          "Heat grill to medium-high 400–450°F. Scrape and oil grates so chicken releases cleanly without tearing skin.",
        minutes: 10,
        heatLevel: "high",
      },
      {
        title: "Grill until done",
        instruction:
          "Grill skin-side down 6–7 minutes until charred. Flip, cook 8–10 more minutes until internal temp hits 165°F and juices run clear.",
        minutes: 18,
        heatLevel: "medium-high",
      },
      {
        title: "Rest and garnish",
        instruction:
          "Rest 5 minutes in foil. Scatter parsley. Meat should pull cleanly from bone with moist, white interior near bone.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 455, protein: 40, carbs: 4, fats: 30, fiber: 0 },
    proTips: [
      "Oven backup at 425°F works if rain cancels grill night—same marinade.",
      "Serve with toum or tzatziki for cooling contrast.",
      "Save marinade never—discard after raw chicken contact.",
    ],
    tonightSpread: ["Grilled pita and hummus.", "Tomato-cucumber salad."],
    leftovers: [
      "Slice into wraps with yogurt sauce.",
      "Chop over a grain bowl with pickled onions.",
    ],
    equipment: ["Grill or flat-top", "Large mixing bowl", "Instant-read thermometer"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "lentil-mushroom-bolognese",
      title: "Lentil Mushroom Bolognese",
      subtitle: "Plant-forward ragu with green lentils, cremini, and whole-wheat pasta",
      protein: "plant",
      cuisine: "Italian",
      mealFormat: "pasta",
      hook: "Hearty pasta night for vegetarian crew without sacrificing depth",
      prep: 25,
      cook: 40,
      difficulty: "medium",
      sourceId: "nyt-03",
    }),
    description:
      "Green lentils and finely chopped mushrooms simmer with tomato, wine, and herbs into a rich bolognese served over whole-wheat spaghetti.",
    whyCrewsLikeIt:
      "Meaty texture without meat. Budget-friendly and fiber-rich for crews trying to eat more plants.",
    mealPrepNotes:
      "Pulse mushrooms in food processor for fine crumb texture. Cook lentils separately if using pre-cooked.",
    stationWorkflow: [
      "Brown mushrooms in batches—crowded mushrooms steam instead of caramelize.",
      "Simmer sauce wide and uncovered so it reduces to thick ragu consistency.",
      "Toss pasta with sauce in largest pot or hotel pan for even coating.",
    ],
    ingredients: [
      { name: "green lentils", quantity: 2, unit: "cups", notes: "dry, rinsed" },
      { name: "cremini mushrooms", quantity: 2, unit: "lb", notes: "finely chopped" },
      { name: "whole-wheat spaghetti", quantity: 2, unit: "lb" },
      { name: "crushed tomatoes", quantity: 2, unit: "cans", notes: "28 oz" },
      { name: "tomato paste", quantity: 3, unit: "tbsp" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "finely diced" },
      { name: "carrots", quantity: 2, unit: "whole", notes: "finely diced" },
      { name: "celery stalks", quantity: 2, unit: "whole", notes: "finely diced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "dry red wine", quantity: 1, unit: "cup" },
      { name: "vegetable broth", quantity: 2, unit: "cups", notes: "low sodium" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Cook lentils",
        instruction:
          "Simmer lentils in broth 20–25 minutes until tender but holding shape. Drain excess liquid so sauce does not turn watery.",
        minutes: 25,
        heatLevel: "medium",
      },
      {
        title: "Brown mushrooms",
        instruction:
          "Cook mushrooms in olive oil over high heat in batches 8–10 minutes until deeply browned and moisture evaporates, not gray and wet.",
        minutes: 10,
        heatLevel: "high",
      },
      {
        title: "Build soffritto base",
        instruction:
          "Sauté onion, carrot, celery 8 minutes until softened. Add garlic and tomato paste, cook 2 minutes until paste darkens to brick red.",
        minutes: 10,
      },
      {
        title: "Simmer ragu",
        instruction:
          "Add wine, reduce 3 minutes. Add crushed tomatoes and cooked lentils. Simmer 20 minutes uncovered until thick and spoon-coating.",
        minutes: 23,
        heatLevel: "medium-low",
      },
      {
        title: "Toss with pasta",
        instruction:
          "Boil spaghetti al dente, drain, toss with ragu. Sauce should cling to noodles with visible mushroom and lentil pieces throughout.",
        minutes: 12,
      },
    ],
    nutrition: { calories: 420, protein: 20, carbs: 68, fats: 10, fiber: 14 },
    proTips: [
      "A parmesan rind simmered in sauce adds umami without meat.",
      "Offer grated parmesan at the line for crew who want extra richness.",
      "Sauce freezes well—thaw and toss with fresh pasta.",
    ],
    tonightSpread: ["Garlic bread from split baguette.", "Simple arugula salad."],
    leftovers: [
      "Bolognese baked ziti with mozzarella top.",
      "Lasagna layers with ricotta and sauce.",
    ],
    equipment: ["Large stock pot", "Wide sauté pan", "Food processor"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "chicken-enchilada-skillet-light",
      title: "Light Chicken Enchilada Skillet",
      subtitle: "One-pan shredded chicken with tortillas, enchilada sauce, and cheese",
      protein: "chicken",
      cuisine: "Mexican",
      mealFormat: "skillet",
      hook: "Enchilada flavor without rolling twenty tortillas",
      prep: 20,
      cook: 25,
      difficulty: "easy",
      sourceId: "st-23",
    }),
    description:
      "Shredded chicken simmers with black beans, corn, enchilada sauce, and torn tortillas, topped with melted cheese for a deconstructed enchilada skillet.",
    whyCrewsLikeIt:
      "All the comfort of enchiladas with half the prep. One skillet from stove to table.",
    mealPrepNotes:
      "Poach and shred chicken ahead. Use corn tortillas torn—not flour—for better texture.",
    stationWorkflow: [
      "Tear tortillas into strips—they thicken sauce like dumplings.",
      "Add cheese off heat and cover so it melts without oil separating.",
      "Serve straight from skillet with toppings bar adjacent.",
    ],
    ingredients: [
      { name: "boneless chicken breasts", quantity: 2.5, unit: "lb" },
      { name: "corn tortillas", quantity: 12, unit: "whole", notes: "cut into strips" },
      { name: "red enchilada sauce", quantity: 4, unit: "cups" },
      { name: "black beans", quantity: 2, unit: "cans", notes: "15 oz, drained" },
      { name: "frozen corn", quantity: 2, unit: "cups" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "green chiles", quantity: 1, unit: "can", notes: "4 oz, diced" },
      { name: "Monterey Jack cheese", quantity: 2, unit: "cups", notes: "shredded" },
      { name: "chili powder", quantity: 1, unit: "tbsp" },
      { name: "ground cumin", quantity: 1, unit: "tsp" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "kosher salt", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Poach and shred chicken",
        instruction:
          "Simmer chicken in salted water 15–18 minutes until 165°F. Rest, shred into bite-size strands that hold together when sauced.",
        minutes: 20,
      },
      {
        title: "Sweat onion and spices",
        instruction:
          "Sauté onion in a large skillet 5 minutes until soft. Add garlic, chili powder, and cumin; cook 1 minute until fragrant and toasty.",
        minutes: 6,
      },
      {
        title: "Simmer filling",
        instruction:
          "Add enchilada sauce, beans, corn, green chiles, and shredded chicken. Simmer 10 minutes until mixture thickens slightly and smells rich.",
        minutes: 10,
        heatLevel: "medium",
      },
      {
        title: "Add tortilla strips",
        instruction:
          "Stir in tortilla strips, simmer 5 minutes until they soften and absorb sauce like dumplings, not dissolve into paste.",
        minutes: 5,
      },
      {
        title: "Melt cheese and serve",
        instruction:
          "Remove from heat, top with cheese, cover 3 minutes until melted and glossy. Skillet should look bubbly at edges, not dry.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 445, protein: 38, carbs: 42, fats: 16, fiber: 8 },
    proTips: [
      "Use two skillets if your largest pan cannot fit eight portions comfortably.",
      "Top with avocado and cilantro at the line for fresh contrast.",
      "Green enchilada sauce swap works for milder, tangier flavor.",
    ],
    tonightSpread: ["Shredded lettuce and diced tomato.", "Greek yogurt instead of sour cream."],
    leftovers: [
      "Reheat covered with extra sauce to restore moisture.",
      "Scoop into burritos with rice next day.",
    ],
    equipment: ["14-inch skillet with lid", "Tongs"],
    spiceLevel: "medium",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "italian-sausage-veg-sheet-pan",
      title: "Italian Sausage and Veg Sheet Pan",
      subtitle: "Sweet Italian sausage with roasted peppers, onion, and zucchini",
      protein: "pork",
      cuisine: "Italian",
      mealFormat: "sheet_pan",
      hook: "Hands-off tray dinner—slice sausage and veg, roast, serve",
      prep: 15,
      cook: 28,
      difficulty: "easy",
      sourceId: "st-24",
    }),
    description:
      "Sweet Italian sausage links roast with bell peppers, red onion, and zucchini until caramelized and ready for hoagie rolls or straight tray service.",
    whyCrewsLikeIt:
      "Minimal prep, maximum flavor. Familiar Italian combo that feels like a sub shop without leaving the hall.",
    mealPrepNotes:
      "Slice sausage links into 2-inch pieces for faster cooking. Cut veg uniform for even roast.",
    stationWorkflow: [
      "Use two half-sheets so sausage browns instead of steaming in released fat.",
      "Rotate pans halfway for even caramelization in a crowded oven.",
      "Offer hoagie rolls at the line for sausage-and-pepper subs.",
    ],
    ingredients: [
      { name: "sweet Italian sausage", quantity: 3, unit: "lb", notes: "cut into 2-inch pieces" },
      { name: "red bell pepper", quantity: 3, unit: "whole", notes: "chunked" },
      { name: "green bell pepper", quantity: 2, unit: "whole", notes: "chunked" },
      { name: "yellow onion", quantity: 2, unit: "large", notes: "wedge-cut" },
      { name: "zucchini", quantity: 3, unit: "large", notes: "thick half-moons" },
      { name: "cherry tomatoes", quantity: 2, unit: "cups", notes: "halved" },
      { name: "olive oil", quantity: 0.25, unit: "cup" },
      { name: "dried Italian seasoning", quantity: 2, unit: "tbsp" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "smashed" },
      { name: "red pepper flakes", quantity: 0.5, unit: "tsp" },
      { name: "kosher salt", quantity: 1, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Heat oven and toss ingredients",
        instruction:
          "Heat oven to 425°F. Toss sausage, peppers, onion, zucchini, tomatoes, garlic, oil, Italian seasoning, salt, and pepper until evenly coated.",
        minutes: 10,
      },
      {
        title: "Spread on sheet pans",
        instruction:
          "Divide between two half-sheets in a single layer with sausage pieces spaced for airflow and veg in gaps between meat.",
        minutes: 5,
      },
      {
        title: "Roast until sausage is done",
        instruction:
          "Roast 24–28 minutes, stirring once halfway, until sausage reads 165°F and pepper edges char lightly with softened centers.",
        minutes: 26,
        heatLevel: "high",
      },
      {
        title: "Rest and check texture",
        instruction:
          "Rest 3 minutes. Sausage should snap when bitten with juicy interior; vegetables tender with slight char, not mushy.",
        minutes: 3,
      },
      {
        title: "Serve on rolls or tray",
        instruction:
          "Pile onto hoagie rolls with provolone or serve straight from tray with crusty bread for soaking pan juices.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 485, protein: 24, carbs: 18, fats: 36, fiber: 4 },
    proTips: [
      "Hot Italian sausage swap adds heat—offer separately for mixed crews.",
      "Provolone under broiler 2 minutes makes instant sausage subs.",
      "Line pans with foil for faster cleanup of rendered sausage fat.",
    ],
    tonightSpread: ["Hoagie rolls and sliced provolone.", "Mixed green salad with vinaigrette."],
    leftovers: [
      "Sausage and veg over polenta next day.",
      "Chop into a pasta skillet with olive oil and parmesan.",
    ],
    equipment: ["Two half-sheet pans", "Instant-read thermometer"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),
];
