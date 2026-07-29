import { manifestEntry, perfRecipe } from "./recipe-build.js";
import type { PerformanceAdaptedRecipe } from "../types.js";

/**
 * Batch 07 — Performance Meals chicken expansion.
 *
 * Started as 14 candidates; 3 were cut and 7 were reworked after a Fire Hall
 * Score pass (Crew Appeal / Ease of Cooking / Leftover Quality / Call
 * Interruption Tolerance / Meal Prep Value, avg must clear 8.5):
 *  - Cut: Baked Orange-Sesame Chicken and Gochujang Grilled Chicken Thighs
 *    (both redundant once General Tso's-Style is reworked into the
 *    baked-glaze-in lane), Sesame Chicken Noodle Stir-Fry (noodles clump on
 *    reheat regardless of method; redundant once Kung Pao becomes a rice bowl).
 *  - Reworked with a real technique change (not a relabel): Peruvian and
 *    Chimichurri chicken (open grill → sheet-pan roast), General Tso's
 *    (glaze tossed at the end → baked into the coating), Marsala (seared
 *    cutlets → braised thighs), Kung Pao (wok stir-fry → braised rice
 *    bowl), Vietnamese (grilled lemongrass → caramel-braise, a genuinely
 *    famous Vietnamese homestyle technique), Cajun Po'Boy (sandwich →
 *    dirty rice bowl, removes the soggy-bread failure mode).
 */
export const batch07: PerformanceAdaptedRecipe[] = [
  perfRecipe({
    manifest: manifestEntry({
      slug: "filipino-chicken-adobo",
      title: "Filipino-Style Chicken Adobo",
      subtitle: "Soy-vinegar braised chicken thighs with garlic and bay leaf over rice",
      protein: "chicken",
      cuisine: "Filipino",
      mealFormat: "one_pot",
      hook: "One-pot braise that gets better the longer it sits",
      prep: 15,
      cook: 35,
      difficulty: "easy",
      sourceId: "nyt-16",
    }),
    description:
      "Chicken thighs braise in a tangy soy-vinegar-garlic sauce with bay leaf and black peppercorns until fall-apart tender, then get served over rice with the reduced pan sauce spooned on top.",
    whyCrewsLikeIt:
      "Salty-sour-savory in a way nothing else on the menu tastes like. One pot, minimal prep, and it holds through call interruptions better than almost anything else in the collection.",
    mealPrepNotes:
      "Do not stir too often while it simmers—let the sauce reduce undisturbed so it thickens properly.",
    stationWorkflow: [
      "Use real cane vinegar or apple cider vinegar—white vinegar alone tastes harsh and flat.",
      "Let the sauce reduce uncovered at the end; a thin, watery adobo is a common mistake.",
      "Hold covered at 165°F if calls interrupt—adobo actually improves with extra time in the sauce.",
    ],
    ingredients: [
      { name: "boneless, skinless chicken thighs", quantity: 4, unit: "lb" },
      { name: "soy sauce", quantity: 0.75, unit: "cup" },
      { name: "apple cider vinegar", quantity: 0.5, unit: "cup" },
      { name: "garlic cloves", quantity: 12, unit: "cloves", notes: "smashed" },
      { name: "bay leaves", quantity: 4, unit: "whole" },
      { name: "whole black peppercorns", quantity: 1, unit: "tbsp" },
      { name: "brown sugar", quantity: 2, unit: "tbsp" },
      { name: "chicken broth", quantity: 1, unit: "cup", notes: "low sodium" },
      { name: "long-grain white rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "vegetable oil", quantity: 2, unit: "tbsp" },
      { name: "scallions", quantity: 4, unit: "whole", notes: "sliced, for garnish" },
    ],
    stepLines: [
      {
        title: "Marinate briefly",
        instruction:
          "Combine chicken, soy sauce, vinegar, garlic, bay leaves, and peppercorns in a bowl. Marinate 15–30 minutes at room temperature while you prep everything else.",
        minutes: 15,
      },
      {
        title: "Sear the chicken",
        instruction:
          "Remove chicken from marinade, reserving the liquid. Sear in oil over medium-high 3–4 minutes per side until lightly browned—it will finish cooking in the braise.",
        minutes: 8,
        heatLevel: "medium-high",
      },
      {
        title: "Braise until tender",
        instruction:
          "Pour reserved marinade and broth over chicken, add brown sugar, bring to a simmer. Cover and cook 20–25 minutes until chicken is fork-tender and reads 165°F.",
        minutes: 25,
        heatLevel: "medium-low",
      },
      {
        title: "Reduce the sauce",
        instruction:
          "Uncover, remove chicken, and simmer sauce 5–8 minutes until thickened and glossy enough to coat the back of a spoon. Return chicken to the pan to coat.",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Serve over rice",
        instruction:
          "Cook rice according to package directions while the sauce reduces. Serve chicken and sauce over rice, topped with sliced scallions.",
        minutes: 20,
      },
    ],
    nutrition: { calories: 480, protein: 46, carbs: 38, fats: 14, fiber: 2 },
    proTips: [
      "Adobo tastes even better the next day—make it ahead if your schedule allows.",
      "A hard-boiled egg simmered in the sauce for the last 10 minutes is a classic Filipino addition.",
      "Crisp up leftover chicken skin-on in a hot pan for adobo flakes over rice.",
    ],
    tonightSpread: ["Steamed white rice.", "Quick pickled cucumber on the side."],
    leftovers: [
      "Shred leftover chicken into fried rice with the extra sauce.",
      "Reheats beautifully—sauce may need a splash of water to loosen.",
    ],
    equipment: ["Large Dutch oven or deep skillet", "Rice pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "peruvian-sheet-pan-chicken-aji-verde",
      title: "Peruvian-Style Sheet-Pan Chicken with Aji Verde",
      subtitle: "Cumin-lime marinated chicken thighs and potatoes roasted together with a spicy green herb sauce",
      protein: "chicken",
      cuisine: "Peruvian",
      mealFormat: "sheet_pan",
      hook: "Pollo a la brasa flavor from one sheet pan, no grill required",
      prep: 25,
      cook: 35,
      difficulty: "easy",
      sourceId: "nyt-17",
    }),
    description:
      "Chicken thighs marinate in soy sauce, lime, garlic, and cumin, then roast on a sheet pan alongside potato wedges until deeply browned and charred at the edges, served with a bright, spicy aji verde sauce made from cilantro, jalapeño, and lime.",
    whyCrewsLikeIt:
      "The green sauce is the real star—crews end up putting it on everything on the plate. Roasting chicken and potatoes together on one pan means less to watch and far more forgiving timing than babysitting a grill.",
    mealPrepNotes:
      "Marinate at least 2 hours, ideally overnight—this is what makes the chicken taste like the real rotisserie version. Aji verde can be made a day ahead.",
    stationWorkflow: [
      "Pat chicken dry before it goes on the pan even though it's been marinating—wet chicken steams instead of browning.",
      "Aji verde sauce keeps for days—make a double batch and use leftovers on eggs or sandwiches.",
      "The sheet pan holds fine in a low oven if a call interrupts—unlike a grill, nothing dries out or burns unattended.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "soy sauce", quantity: 0.25, unit: "cup" },
      { name: "lime juice", quantity: 0.33, unit: "cup", notes: "fresh, divided" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "divided" },
      { name: "ground cumin", quantity: 2, unit: "tbsp" },
      { name: "smoked paprika", quantity: 1, unit: "tbsp" },
      { name: "fresh cilantro", quantity: 2, unit: "cups", notes: "packed" },
      { name: "jalapeño peppers", quantity: 2, unit: "whole", notes: "seeded" },
      { name: "mayonnaise", quantity: 0.5, unit: "cup" },
      { name: "plain Greek yogurt", quantity: 0.25, unit: "cup" },
      { name: "red-skinned potatoes", quantity: 2.5, unit: "lb", notes: "quartered" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Marinate the chicken",
        instruction:
          "Blend soy sauce, half the lime juice, half the garlic, cumin, paprika, and 2 tbsp oil. Coat chicken and marinate at least 2 hours, up to overnight refrigerated.",
        minutes: 15,
      },
      {
        title: "Blend the aji verde",
        instruction:
          "Blend cilantro, jalapeño, remaining garlic, remaining lime juice, mayonnaise, and yogurt until smooth and bright green. Thin with a splash of water if too thick to drizzle.",
        minutes: 8,
      },
      {
        title: "Arrange the sheet pan",
        instruction:
          "Toss potatoes with remaining oil and 1 tsp salt; spread on one side of a large sheet pan. Pat chicken dry from the marinade and arrange on the other side.",
        minutes: 5,
      },
      {
        title: "Roast together",
        instruction:
          "Roast at 425°F 30–35 minutes, flipping potatoes and chicken once, until chicken is deeply browned and reads 165°F throughout and potatoes are golden and fork-tender. One pan, no grill to babysit.",
        minutes: 35,
        heatLevel: "high",
      },
      {
        title: "Rest and serve",
        instruction:
          "Rest chicken 5 minutes. Serve with roasted potatoes and a generous drizzle of aji verde, extra sauce on the side.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 500, protein: 44, carbs: 34, fats: 20, fiber: 3 },
    proTips: [
      "Two jalapeños makes a medium sauce—use one for a milder crowd.",
      "Aji verde also works great as a dip for the roasted potatoes on its own.",
      "A wire rack on the sheet pan crisps the chicken skin-side texture on all sides if using skin-on thighs.",
    ],
    tonightSpread: ["Roasted potato wedges.", "Simple sliced tomato and onion salad."],
    leftovers: [
      "Shred leftover chicken over rice with extra aji verde.",
      "Aji verde keeps 4 days refrigerated—great on eggs or sandwiches too.",
    ],
    equipment: ["Half-sheet pan", "Blender"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "kung-pao-chicken-rice-bowls",
      title: "Kung Pao Chicken & Rice Bowls",
      subtitle: "Braised chicken thighs in a tangy soy-vinegar kung pao sauce with peanuts and scallions over rice",
      protein: "chicken",
      cuisine: "Sichuan/Chinese",
      mealFormat: "bowl",
      hook: "Kung pao flavor built to hold and reheat, not a 90-second wok flash",
      prep: 20,
      cook: 25,
      difficulty: "easy",
      sourceId: "se-34",
    }),
    description:
      "Chicken thigh chunks braise directly in a tangy soy-vinegar-chili kung pao sauce with garlic and ginger until tender and glossy, served over rice with roasted peanuts and scallions scattered on fresh at the table for crunch.",
    whyCrewsLikeIt:
      "All the sweet-tangy-savory kung pao flavor the crew already loves, minus the flash-wok timing pressure—this one simmers, holds, and reheats like a real braise. Peanuts added fresh at the end keep the crunch nobody expects from a healthy dinner.",
    mealPrepNotes:
      "This braises hands-off once it's going—stir occasionally but there's no wok-timing pressure. Add peanuts only at serving so they stay crunchy.",
    stationWorkflow: [
      "Brown the chicken first for flavor, then let the sauce actually simmer—this is a braise, not a flash stir-fry.",
      "Add peanuts and scallions fresh at serving, not during cooking, so they don't go soft sitting in the sauce.",
      "If a call interrupts mid-simmer, cover and hold on low—kung pao only gets better with extra time.",
    ],
    ingredients: [
      { name: "boneless, skinless chicken thighs", quantity: 3.5, unit: "lb", notes: "cut into 1.5-inch chunks" },
      { name: "cornstarch", quantity: 2, unit: "tbsp" },
      { name: "soy sauce", quantity: 0.33, unit: "cup" },
      { name: "dried red chilies", quantity: 8, unit: "whole" },
      { name: "Sichuan peppercorns", quantity: 1, unit: "tsp", notes: "optional" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "minced" },
      { name: "roasted unsalted peanuts", quantity: 1, unit: "cup" },
      { name: "black vinegar or rice vinegar", quantity: 3, unit: "tbsp" },
      { name: "sugar", quantity: 2, unit: "tbsp" },
      { name: "chicken broth", quantity: 0.75, unit: "cup", notes: "low sodium" },
      { name: "scallions", quantity: 6, unit: "whole", notes: "cut into 1-inch pieces" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "vegetable oil", quantity: 3, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Cook the rice",
        instruction:
          "Rinse and cook jasmine rice per package directions; fluff and hold covered while the braise comes together.",
        minutes: 20,
      },
      {
        title: "Brown the chicken",
        instruction:
          "Heat 2 tbsp oil in a large skillet or wok over medium-high. Add chicken chunks and brown 5–6 minutes until golden outside—it will finish cooking in the braise.",
        minutes: 6,
        heatLevel: "medium-high",
      },
      {
        title: "Bloom chilies and aromatics",
        instruction:
          "Push chicken to one side, add remaining oil, dried chilies, and Sichuan peppercorns; stir 30 seconds until fragrant and the oil turns red. Add garlic and ginger, stir 20 seconds more.",
        minutes: 2,
        heatLevel: "medium-high",
      },
      {
        title: "Braise in the sauce",
        instruction:
          "Whisk soy sauce, vinegar, sugar, cornstarch, and broth; pour over the chicken. Bring to a simmer, cover, and cook 12–15 minutes until chicken is tender and the sauce has thickened and turned glossy.",
        minutes: 15,
        heatLevel: "medium-low",
      },
      {
        title: "Finish with peanuts and scallions",
        instruction:
          "Off heat, stir in peanuts and scallions right before serving so they stay crunchy, not soft. Serve over rice.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 530, protein: 42, carbs: 44, fats: 19, fiber: 3 },
    proTips: [
      "The dried chilies are for aroma, not necessarily for eating—warn the crew not to bite into them whole.",
      "Cashews work as a substitute if peanuts aren't on hand.",
      "This braises hands-off—no need to watch it every second the way a wok stir-fry demands.",
    ],
    tonightSpread: ["Steamed jasmine rice.", "Quick cucumber salad with rice vinegar."],
    leftovers: [
      "Reheats beautifully on the stove or microwave—braised thighs don't turn rubbery the way stir-fried breast can.",
      "Chop into fried rice with leftover jasmine rice.",
    ],
    equipment: ["Large skillet or wok", "Rice pot"],
    spiceLevel: "hot",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "vietnamese-caramel-braised-chicken-bowls",
      title: "Vietnamese Caramel-Braised Chicken Bowls",
      subtitle: "Chicken thighs braised in a savory-sweet caramel-fish sauce glaze over rice with pickled vegetables",
      protein: "chicken",
      cuisine: "Vietnamese",
      mealFormat: "one_pot",
      hook: "A famous Vietnamese homestyle braise (ga kho)—richer and saucier than a grilled marinade",
      prep: 25,
      cook: 30,
      difficulty: "medium",
      sourceId: "ba-17",
    }),
    description:
      "Sugar caramelizes in a hot pot until deep amber, then chicken thighs braise right in it with fish sauce, garlic, and shallot until fall-tender and glazed a deep mahogany, served hot over rice with quick-pickled carrot and daikon and fresh herbs.",
    whyCrewsLikeIt:
      "Bright, funky, and completely unlike anything else on the menu—the caramel-fish sauce combination hits totally different than every other marinade in the collection. This is a genuine braise, so it holds through an interruption instead of drying out over a grill.",
    mealPrepNotes:
      "The caramel step takes a few minutes of attention, but once the liquid goes in, this braises hands-off. Pickled vegetables can be made a day ahead.",
    stationWorkflow: [
      "Watch the sugar closely—it goes from amber to burnt fast, but once the liquid goes in it's a forgiving braise.",
      "Nestle chicken in a single layer so the sauce reduces evenly around all of it.",
      "Holds beautifully if a call interrupts—cover and hold on low, it only deepens in flavor.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb", notes: "cut into large pieces" },
      { name: "granulated sugar", quantity: 0.33, unit: "cup" },
      { name: "fish sauce", quantity: 0.33, unit: "cup" },
      { name: "shallots", quantity: 3, unit: "medium", notes: "sliced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 1, unit: "tbsp", notes: "minced" },
      { name: "coconut water", quantity: 1.5, unit: "cups", notes: "or water" },
      { name: "black pepper", quantity: 1, unit: "tsp", notes: "freshly cracked" },
      { name: "carrots", quantity: 3, unit: "whole", notes: "julienned" },
      { name: "daikon radish", quantity: 1, unit: "whole", notes: "julienned" },
      { name: "rice vinegar", quantity: 0.5, unit: "cup" },
      { name: "brown sugar", quantity: 1, unit: "tbsp", notes: "for pickling liquid" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "fresh cilantro and mint", quantity: 1, unit: "cup", notes: "combined, for garnish" },
      { name: "Thai or serrano chili", quantity: 1, unit: "whole", notes: "sliced, for garnish" },
      { name: "vegetable oil", quantity: 2, unit: "tbsp" },
    ],
    stepLines: [
      {
        title: "Quick-pickle the vegetables",
        instruction:
          "Toss carrot and daikon with rice vinegar, brown sugar, and a pinch of salt. Let sit at least 20 minutes, tossing occasionally, until slightly softened and tangy.",
        minutes: 20,
      },
      {
        title: "Cook the rice",
        instruction:
          "Rinse and cook jasmine rice per package directions; fluff and hold covered while the braise comes together.",
        minutes: 20,
      },
      {
        title: "Caramelize the sugar",
        instruction:
          "Heat oil and sugar in a Dutch oven over medium heat, swirling (not stirring) until it turns deep amber, 4–5 minutes—watch closely, it burns fast in the last minute.",
        minutes: 5,
        heatLevel: "medium",
      },
      {
        title: "Braise the chicken",
        instruction:
          "Carefully add chicken (it will sputter), shallots, garlic, and ginger, stirring to coat in the caramel. Add fish sauce, coconut water, and black pepper. Bring to a simmer, cover, and braise 20–25 minutes until chicken is tender and the sauce has reduced to a glossy, dark glaze.",
        minutes: 25,
        heatLevel: "medium-low",
      },
      {
        title: "Build the bowls",
        instruction:
          "Layer rice, braised chicken with sauce spooned over, pickled vegetables, and fresh herbs. Top with sliced chili for those who want heat.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 500, protein: 42, carbs: 42, fats: 16, fiber: 3 },
    proTips: [
      "If the caramel seizes when the chicken goes in, don't panic—it melts back down as the braise simmers.",
      "A hard-boiled egg simmered in the sauce for the last 10 minutes is a classic addition.",
      "Crushed peanuts on top add nice texture if the crew likes extra crunch.",
    ],
    tonightSpread: ["Extra fresh herbs.", "Lime wedges at the line."],
    leftovers: [
      "Reheats beautifully—the glaze only gets stickier and richer.",
      "Shred into rice for a fast next-day lunch.",
    ],
    equipment: ["Dutch oven or deep pot", "Rice pot"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "trinidadian-curry-chicken-potatoes",
      title: "Trinidadian-Style Curry Chicken with Potatoes",
      subtitle: "Dry curry powder chicken stew with potatoes, a Caribbean flavor first for the menu",
      protein: "chicken",
      cuisine: "Caribbean",
      mealFormat: "one_pot",
      hook: "A bloomed curry-powder stew, not a cream-based Indian curry",
      prep: 20,
      cook: 40,
      difficulty: "easy",
      sourceId: "nyt-18",
    }),
    description:
      "Chicken thighs and potatoes simmer in a stew built on Caribbean curry powder bloomed hard in hot oil until it darkens, with onion, garlic, ginger, and a touch of Scotch bonnet for real heat.",
    whyCrewsLikeIt:
      "Completely different technique and flavor from any cream-based curry—dry, deeply spiced, and genuinely new Caribbean territory for the collection. Hearty stew format holds perfectly through a call.",
    mealPrepNotes:
      "Toast the curry powder in oil until it darkens a shade before adding liquid—this is what separates real Trinidadian curry from flat, powdery curry.",
    stationWorkflow: [
      "Bloom the curry powder in hot oil 60–90 seconds until it darkens and smells toasty, not raw.",
      "Cut potatoes uniform so they finish cooking with the chicken.",
      "Leave the Scotch bonnet whole for aroma; remove before serving for a milder plate.",
    ],
    ingredients: [
      { name: "bone-in, skin-on chicken thighs", quantity: 4, unit: "lb", notes: "skin removed" },
      { name: "Caribbean-style curry powder", quantity: 0.33, unit: "cup" },
      { name: "yellow onion", quantity: 1, unit: "large", notes: "diced" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "minced" },
      { name: "Scotch bonnet or habanero pepper", quantity: 1, unit: "whole", notes: "left whole for aroma, pierced once" },
      { name: "russet potatoes", quantity: 1.5, unit: "lb", notes: "peeled, cut into 1.5-inch chunks" },
      { name: "chicken broth", quantity: 2, unit: "cups", notes: "low sodium" },
      { name: "fresh thyme", quantity: 2, unit: "tsp" },
      { name: "long-grain white rice", quantity: 2.5, unit: "cups", notes: "dry" },
      { name: "vegetable oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Season the chicken",
        instruction:
          "Toss chicken thighs with half the curry powder and 1 tsp salt. Let sit 15 minutes while you prep the vegetables.",
        minutes: 15,
      },
      {
        title: "Bloom the curry powder",
        instruction:
          "Heat oil in a large pot over medium. Add remaining curry powder, stir constantly 60–90 seconds until it darkens a shade and smells deeply toasty—do not let it burn.",
        minutes: 3,
        heatLevel: "medium",
      },
      {
        title: "Build the base",
        instruction:
          "Add onion, garlic, and ginger to the bloomed curry oil; cook 5 minutes until softened. Add seasoned chicken, searing 2–3 minutes per side in the curry paste.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        title: "Simmer the stew",
        instruction:
          "Add potatoes, broth, thyme, and the whole Scotch bonnet. Bring to a simmer, cover, and cook 25–30 minutes until chicken is tender and potatoes are soft but holding shape.",
        minutes: 28,
        heatLevel: "medium-low",
      },
      {
        title: "Cook rice and finish",
        instruction:
          "Cook rice while the stew simmers. Remove the Scotch bonnet before serving unless the crew wants extra heat. Sauce should be thick and cling to the chicken, not watery.",
        minutes: 20,
      },
    ],
    nutrition: { calories: 520, protein: 44, carbs: 40, fats: 18, fiber: 5 },
    proTips: [
      "Removing the Scotch bonnet whole (not chopped) gives real heat and aroma without overwhelming spice.",
      "Coconut milk swapped for half the broth makes a richer, slightly sweeter version if the crew prefers it.",
      "Leftover curry is even better the next day once the spices have had time to settle.",
    ],
    tonightSpread: ["Steamed white rice.", "Simple cucumber and tomato salad."],
    leftovers: [
      "Reheats beautifully on the stove with a splash of broth if it's thickened too much.",
      "Shred into a curry chicken roti or wrap for a fast next-day lunch.",
    ],
    equipment: ["Large Dutch oven", "Rice pot"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "chicken-marsala-lightened",
      title: "Chicken Marsala (Lightened)",
      subtitle: "Braised chicken thighs and mushrooms in a marsala wine pan sauce",
      protein: "chicken",
      cuisine: "Italian",
      mealFormat: "skillet",
      hook: "A classic Italian-American dish built as a real braise, not a quick sauté",
      prep: 20,
      cook: 35,
      difficulty: "medium",
      sourceId: "atk-05",
    }),
    description:
      "Chicken thighs sear until golden, then braise directly in a mountain of browned mushrooms and marsala wine sauce until fall-tender, finished glossy with a swirl of butter.",
    whyCrewsLikeIt:
      "Real restaurant Italian-American comfort food—nothing else on the menu tastes like a marsala pan sauce. Braising thighs instead of quick-searing thin cutlets means it's far more forgiving and holds beautifully through a call.",
    mealPrepNotes:
      "Braise ahead of time if needed—marsala chicken reheats just as well as a stew, unlike a quick pan-seared cutlet.",
    stationWorkflow: [
      "Don't crowd the mushrooms—they need room in the pan to brown instead of steam.",
      "Deglaze with marsala off the heat first to avoid a flare-up, then return to the burner.",
      "This braises like a stew—if a call interrupts during the simmer, cover and hold on low; it only gets better.",
    ],
    ingredients: [
      { name: "boneless, skinless chicken thighs", quantity: 3.5, unit: "lb" },
      { name: "all-purpose flour", quantity: 0.5, unit: "cup" },
      { name: "cremini mushrooms", quantity: 2, unit: "lb", notes: "sliced" },
      { name: "shallots", quantity: 2, unit: "medium", notes: "minced" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "dry marsala wine", quantity: 1.25, unit: "cups" },
      { name: "chicken broth", quantity: 1.5, unit: "cups", notes: "low sodium" },
      { name: "fresh thyme", quantity: 1, unit: "tbsp" },
      { name: "unsalted butter", quantity: 2, unit: "tbsp" },
      { name: "olive oil", quantity: 4, unit: "tbsp", notes: "divided" },
      { name: "whole wheat egg noodles", quantity: 12, unit: "oz", notes: "dry" },
      { name: "fresh parsley", quantity: 0.25, unit: "cup", notes: "chopped" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Dredge and sear the chicken",
        instruction:
          "Season chicken thighs with salt and pepper, dredge lightly in flour, shaking off excess. Sear in 2 tbsp oil over medium-high 3–4 minutes per side until golden—thighs are forgiving here, a little extra time in the pan won't dry them out. Remove to a plate; they'll finish cooking in the braise.",
        minutes: 12,
        heatLevel: "medium-high",
      },
      {
        title: "Cook the noodles",
        instruction:
          "Boil egg noodles in salted water per package directions until al dente. Drain and toss with a drizzle of oil so they don't clump while the sauce finishes.",
        minutes: 12,
      },
      {
        title: "Brown the mushrooms",
        instruction:
          "Add remaining oil to the same skillet. Cook mushrooms in a single layer, undisturbed 3–4 minutes, then stir and cook 4–5 more minutes until deeply browned and any liquid has evaporated.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Build the marsala sauce",
        instruction:
          "Add shallots and garlic, cook 1 minute. Off heat, pour in marsala wine, then return to heat and simmer 3–4 minutes to cook off the alcohol. Add broth and thyme, simmer 6–8 minutes until slightly reduced.",
        minutes: 12,
        heatLevel: "medium",
      },
      {
        title: "Braise the chicken",
        instruction:
          "Return chicken thighs to the pan, nestle into the sauce, cover, and simmer 20–25 minutes until fall-tender and 165°F at the center. Swirl in butter off heat until glossy. Serve over noodles topped with parsley.",
        minutes: 25,
        heatLevel: "medium-low",
      },
    ],
    nutrition: { calories: 520, protein: 44, carbs: 38, fats: 19, fiber: 5 },
    proTips: [
      "Cremini mushrooms give deeper flavor than white button, but either works.",
      "Cook marsala down fully before adding broth—undercooked wine tastes harsh and boozy.",
      "Steamed green beans on the side round this out without adding many carbs.",
    ],
    tonightSpread: ["Steamed green beans.", "Simple side salad with vinaigrette."],
    leftovers: [
      "Reheats gently on the stove with a splash of broth to loosen the sauce—holds up far better than a seared cutlet would.",
      "Slice cold leftover chicken over a salad for a fast next-day lunch.",
    ],
    equipment: ["Large skillet", "Large pot for noodles"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "cajun-chicken-dirty-rice-bowls",
      title: "Cajun Chicken & Dirty Rice Bowls with Remoulade",
      subtitle: "Blackened chicken sliced over Cajun trinity dirty rice with black-eyed peas and a tangy remoulade",
      protein: "chicken",
      cuisine: "Cajun",
      mealFormat: "bowl",
      hook: "A genuine New Orleans flavor built as a bowl, not a sandwich that goes soggy on a shelf",
      prep: 25,
      cook: 25,
      difficulty: "easy",
      sourceId: "se-35",
    }),
    description:
      "Chicken breast gets coated in a bold Cajun blackening rub and seared hard in cast iron—never fried—then sliced over a skillet of Cajun trinity dirty rice with black-eyed peas, finished with a tangy light remoulade and fresh lettuce and tomato.",
    whyCrewsLikeIt:
      "Same genuine New Orleans flavor as a po'boy, minus the soggy-bread problem—rice and beans hold and reheat all week instead of going stale on a shelf.",
    mealPrepNotes:
      "Mix the remoulade ahead—it improves after an hour in the fridge as the flavors meld. Dirty rice and chicken both reheat well together in one container.",
    stationWorkflow: [
      "Vent the hood—blackening in cast iron creates real smoke.",
      "Rice and beans hold in a covered pan far better than a sandwich roll ever would—build the bowl instead of rushing to serve it fast.",
      "Add lettuce and tomato fresh at serving so they stay crisp.",
    ],
    ingredients: [
      { name: "boneless, skinless chicken breasts", quantity: 3.5, unit: "lb", notes: "pounded to even thickness" },
      { name: "smoked paprika", quantity: 2, unit: "tbsp" },
      { name: "garlic powder", quantity: 1, unit: "tbsp" },
      { name: "onion powder", quantity: 1, unit: "tbsp" },
      { name: "dried thyme", quantity: 1, unit: "tsp" },
      { name: "cayenne pepper", quantity: 1, unit: "tsp" },
      { name: "long-grain white rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "green bell pepper", quantity: 1, unit: "whole", notes: "diced" },
      { name: "celery", quantity: 2, unit: "stalks", notes: "diced" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "diced" },
      { name: "garlic cloves", quantity: 4, unit: "cloves", notes: "minced" },
      { name: "black-eyed peas", quantity: 2, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "Cajun seasoning", quantity: 1, unit: "tbsp" },
      { name: "chicken broth", quantity: 3, unit: "cups", notes: "low sodium" },
      { name: "mayonnaise", quantity: 0.5, unit: "cup" },
      { name: "plain Greek yogurt", quantity: 0.25, unit: "cup" },
      { name: "Creole mustard", quantity: 2, unit: "tbsp", notes: "or whole-grain mustard" },
      { name: "capers", quantity: 1, unit: "tbsp", notes: "chopped" },
      { name: "hot sauce", quantity: 1, unit: "tsp" },
      { name: "romaine lettuce", quantity: 1, unit: "head", notes: "shredded" },
      { name: "tomato", quantity: 2, unit: "whole", notes: "diced" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Mix the remoulade",
        instruction:
          "Whisk mayonnaise, yogurt, Creole mustard, capers, hot sauce, and a pinch of salt until smooth. Refrigerate while everything else cooks so the flavors meld.",
        minutes: 8,
      },
      {
        title: "Season and sear the chicken",
        instruction:
          "Combine paprika, garlic powder, onion powder, thyme, cayenne, and salt; coat chicken breasts evenly. Sear in oil in a hot cast iron skillet 4–5 minutes per side until deeply charred and 165°F at the center. Rest 5 minutes, then slice.",
        minutes: 15,
        heatLevel: "high",
      },
      {
        title: "Build the dirty rice",
        instruction:
          "Cook onion, bell pepper, and celery in oil over medium 5–6 minutes until softened. Add garlic and Cajun seasoning, cook 1 minute. Add rice, broth, and black-eyed peas; bring to a boil, cover, and simmer 18–20 minutes until rice is tender and liquid is absorbed.",
        minutes: 22,
        heatLevel: "medium-low",
      },
      {
        title: "Build the bowls",
        instruction:
          "Portion dirty rice into bowls, top with sliced blackened chicken, shredded lettuce, and diced tomato, and drizzle with remoulade.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 510, protein: 41, carbs: 46, fats: 13, fiber: 6 },
    proTips: [
      "Reduce cayenne by half for a milder version—the smoked paprika still carries plenty of flavor.",
      "Double the remoulade—crews always want extra to drizzle on the bowl.",
      "A dash of hot sauce at the line keeps with the classic po'boy shop presentation.",
    ],
    tonightSpread: ["Extra hot sauce at the line.", "Lemon wedges for the rice."],
    leftovers: [
      "Rice, beans, and chicken all keep and reheat together for up to 4 days.",
      "Slice cold chicken over a salad with extra remoulade as a dressing.",
    ],
    equipment: ["Cast iron skillet", "Large pot", "Mixing bowls"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "sheet-pan-chimichurri-chicken-charred-vegetables",
      title: "Sheet-Pan Chimichurri Chicken with Charred Vegetables",
      subtitle: "Herb-marinated chicken thighs roasted hot with zucchini, bell pepper, and red onion, finished with fresh chimichurri",
      protein: "chicken",
      cuisine: "Argentinian/American Grill",
      mealFormat: "sheet_pan",
      hook: "Chimichurri lands on chicken instead of steak, charred hot enough without a grill",
      prep: 25,
      cook: 25,
      difficulty: "easy",
      sourceId: "ba-18",
    }),
    description:
      "Chicken thighs marinate in a bright parsley-garlic chimichurri, then roast at high heat on a sheet pan alongside zucchini, bell pepper, and red onion until everything chars at the edges, finished with a drizzle of fresh chimichurri.",
    whyCrewsLikeIt:
      "Same bold grill-night flavor as chimichurri steak nights, but everything roasts hands-off on one pan instead of needing someone at the grill the whole time. A full tray of charred vegetables makes the plate feel generous.",
    mealPrepNotes:
      "Make a double batch of chimichurri—half goes into the marinade, half stays fresh for drizzling at the end.",
    stationWorkflow: [
      "Reserve fresh, uncooked chimichurri to spoon on at the end—cooked marinade loses its bright color and punch.",
      "Cut vegetables into large, uniform pieces so they char at the edges without turning mushy.",
      "The sheet pan can hold in a low oven if a call interrupts—much more forgiving than chicken left over open flame.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "fresh parsley", quantity: 2, unit: "cups", notes: "packed, finely chopped, divided" },
      { name: "fresh oregano", quantity: 2, unit: "tbsp", notes: "chopped" },
      { name: "garlic cloves", quantity: 10, unit: "cloves", notes: "minced, divided" },
      { name: "red wine vinegar", quantity: 0.33, unit: "cup", notes: "divided" },
      { name: "red pepper flakes", quantity: 1, unit: "tsp" },
      { name: "extra-virgin olive oil", quantity: 0.75, unit: "cup", notes: "divided" },
      { name: "zucchini", quantity: 3, unit: "medium", notes: "sliced into thick planks" },
      { name: "red bell peppers", quantity: 2, unit: "whole", notes: "quartered" },
      { name: "red onion", quantity: 2, unit: "medium", notes: "cut into thick rounds" },
      { name: "long-grain white rice", quantity: 2.5, unit: "cups", notes: "dry" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Make the chimichurri",
        instruction:
          "Combine parsley, oregano, garlic, vinegar, red pepper flakes, and oil in a bowl. Whisk until combined—should be loose and pourable, not a thick paste. Divide into two portions.",
        minutes: 10,
      },
      {
        title: "Marinate the chicken",
        instruction:
          "Coat chicken thighs with one portion of chimichurri, salt, and pepper. Marinate at least 30 minutes, up to 4 hours refrigerated.",
        minutes: 30,
      },
      {
        title: "Cook the rice",
        instruction:
          "Rinse and cook rice per package directions; fluff and hold covered while the sheet pan roasts.",
        minutes: 20,
      },
      {
        title: "Arrange the sheet pan",
        instruction:
          "Brush zucchini, bell pepper, and red onion with oil and salt. Arrange around the edges of a large sheet pan with the marinated chicken thighs in the center.",
        minutes: 8,
      },
      {
        title: "Roast until charred",
        instruction:
          "Roast at 450°F 20–22 minutes, flipping vegetables once, until chicken is well-browned and reads 165°F throughout and vegetables are tender with charred edges.",
        minutes: 22,
        heatLevel: "high",
      },
      {
        title: "Plate and finish",
        instruction:
          "Arrange chicken and charred vegetables together, drizzle generously with the reserved fresh chimichurri, and serve with rice on the side.",
        minutes: 5,
      },
    ],
    nutrition: { calories: 490, protein: 44, carbs: 32, fats: 18, fiber: 5 },
    proTips: [
      "Let chimichurri sit at room temperature 30 minutes before serving—the flavor opens up as it warms slightly.",
      "A finish under the broiler for the last 2–3 minutes deepens the char if the oven runs cool.",
      "Leftover chimichurri is excellent on eggs, sandwiches, or roasted potatoes.",
    ],
    tonightSpread: ["Steamed rice.", "Crusty bread for extra sauce."],
    leftovers: [
      "Slice cold chicken over greens with extra chimichurri as a dressing.",
      "Reheat vegetables in a hot skillet to bring back some char.",
    ],
    equipment: ["Half-sheet pan", "Rice pot"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "high-protein-chicken-fried-rice",
      title: "High-Protein Chicken Fried Rice",
      subtitle: "Wok-fried rice with diced chicken, scrambled egg, and vegetables",
      protein: "chicken",
      cuisine: "Chinese-American",
      mealFormat: "skillet",
      hook: "Real fried rice technique, not just chicken dumped over plain rice",
      prep: 20,
      cook: 15,
      difficulty: "easy",
      sourceId: "wol-14",
    }),
    description:
      "Day-old jasmine rice fries hot and fast in a wok with diced chicken, scrambled egg, peas, and carrots, seasoned simply with soy sauce and sesame oil so every grain stays separate and slightly crisp.",
    whyCrewsLikeIt:
      "Genuinely different structurally from every other rice or noodle dish on the menu—it's fried rice, not a bowl or stir-fry over rice. Built on cold, day-old rice, which is exactly what makes it one of the best make-ahead and reheat dishes in the collection.",
    mealPrepNotes:
      "Cook rice the day before and refrigerate uncovered—cold, dried-out rice fries up separate and crisp, while fresh warm rice turns mushy and clumps.",
    stationWorkflow: [
      "Scramble the eggs separately first and set aside—adding raw egg straight to the rice makes it gummy.",
      "Keep the wok hot throughout; a cool pan is the number one reason fried rice turns soggy.",
      "Break up any rice clumps with the back of a spatula before adding sauce.",
    ],
    ingredients: [
      { name: "boneless, skinless chicken breast", quantity: 3, unit: "lb", notes: "diced small" },
      { name: "jasmine rice", quantity: 4, unit: "cups", notes: "cooked and refrigerated overnight" },
      { name: "large eggs", quantity: 8, unit: "whole", notes: "beaten" },
      { name: "frozen peas and carrots", quantity: 2, unit: "cups" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "diced" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "soy sauce", quantity: 0.33, unit: "cup" },
      { name: "toasted sesame oil", quantity: 2, unit: "tbsp" },
      { name: "white pepper", quantity: 0.5, unit: "tsp" },
      { name: "scallions", quantity: 5, unit: "whole", notes: "sliced" },
      { name: "vegetable oil", quantity: 4, unit: "tbsp", notes: "divided" },
      { name: "kosher salt", quantity: 1.5, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Scramble the eggs",
        instruction:
          "Heat 1 tbsp oil in a wok over medium-high. Pour in beaten eggs, scramble 1–2 minutes until just set but still soft. Remove to a plate.",
        minutes: 3,
        heatLevel: "medium-high",
      },
      {
        title: "Cook the chicken",
        instruction:
          "Add 1 tbsp oil to the wok. Season chicken with salt, cook 5–6 minutes, stirring occasionally, until browned and cooked through. Remove to the plate with the eggs.",
        minutes: 6,
        heatLevel: "high",
      },
      {
        title: "Cook the vegetables",
        instruction:
          "Add onion to the wok, cook 3 minutes until softened. Add garlic and peas and carrots, cook 2 minutes until heated through and fragrant.",
        minutes: 5,
        heatLevel: "high",
      },
      {
        title: "Fry the rice",
        instruction:
          "Push vegetables to one side, add remaining oil, then add cold rice, breaking up clumps with a spatula. Stir-fry 4–5 minutes, tossing frequently, until rice is heated through and slightly crisp in spots.",
        minutes: 6,
        heatLevel: "high",
      },
      {
        title: "Combine and finish",
        instruction:
          "Return chicken and egg to the wok, add soy sauce, sesame oil, and white pepper. Toss 1–2 minutes until everything is evenly combined and glossy. Stir in scallions off heat.",
        minutes: 3,
        heatLevel: "high",
      },
    ],
    nutrition: { calories: 500, protein: 40, carbs: 42, fats: 16, fiber: 3 },
    proTips: [
      "Day-old rice really does matter—fresh rice is too moist and clumps together in the wok.",
      "A splash of oyster sauce added with the soy sauce deepens the savory flavor.",
      "Diced ham or leftover cooked chicken both work in place of raw chicken for a fast pantry-clean-out version.",
    ],
    tonightSpread: ["Extra scallions.", "Soy sauce and chili oil at the line."],
    leftovers: [
      "Reheats well in a hot skillet—microwave can leave it gummy.",
      "Great cold the next day straight from the fridge for a quick lunch.",
    ],
    equipment: ["Wok or large skillet"],
    spiceLevel: "mild",
    cleanupDifficulty: "easy",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "general-tsos-baked-chicken",
      title: "General Tso's-Style Baked Chicken",
      subtitle: "Crispy oven-baked chicken with a sweet-spicy chili glaze baked right in",
      protein: "chicken",
      cuisine: "Chinese-American",
      mealFormat: "sheet_pan",
      hook: "A chili glaze that bakes into the chicken instead of sitting on top, so it actually holds",
      prep: 20,
      cook: 30,
      difficulty: "easy",
      sourceId: "st-43",
    }),
    description:
      "Chicken thigh chunks get a light cornstarch coating and bake until crisp-edged, then get brushed with a glossy General Tso's-style glaze built on dried chilies, hoisin, garlic, and ginger and baked again until the sauce sets into the coating, served over rice with broccoli.",
    whyCrewsLikeIt:
      "Sweet-heat glaze that's genuinely takeout-shop familiar—more chili-forward than a mild honey-garlic chicken. Baking the glaze on instead of tossing it at the end means it actually holds through a hold-and-reheat instead of going soft.",
    mealPrepNotes:
      "Spread chicken pieces with real space on the sheet pan so they crisp instead of steam.",
    stationWorkflow: [
      "Flip chicken halfway through the first bake for even browning on all sides.",
      "Brush the glaze on and bake again briefly so it sets into the coating rather than sitting wet on top—this is what makes it hold and reheat well.",
      "Steam broccoli while the chicken bakes so everything finishes together.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 3.5, unit: "lb", notes: "cut into 1.5-inch chunks" },
      { name: "cornstarch", quantity: 0.5, unit: "cup", notes: "divided" },
      { name: "large eggs", quantity: 2, unit: "whole", notes: "beaten" },
      { name: "soy sauce", quantity: 0.33, unit: "cup" },
      { name: "hoisin sauce", quantity: 3, unit: "tbsp" },
      { name: "rice vinegar", quantity: 2, unit: "tbsp" },
      { name: "brown sugar", quantity: 3, unit: "tbsp" },
      { name: "dried red chilies", quantity: 6, unit: "whole", notes: "or 1 tsp red pepper flakes" },
      { name: "garlic cloves", quantity: 6, unit: "cloves", notes: "minced" },
      { name: "fresh ginger", quantity: 2, unit: "tbsp", notes: "minced" },
      { name: "broccoli florets", quantity: 1.5, unit: "lb" },
      { name: "scallions", quantity: 4, unit: "whole", notes: "sliced" },
      { name: "jasmine rice", quantity: 3, unit: "cups", notes: "dry" },
      { name: "olive oil spray", quantity: 1, unit: "can", notes: "or 2 tbsp oil, for coating" },
    ],
    stepLines: [
      {
        title: "Coat and bake the chicken",
        instruction:
          "Toss chicken chunks in beaten egg, then dredge in ¼ cup cornstarch. Arrange on a well-oiled sheet pan with space between pieces. Bake at 425°F 22–25 minutes, flipping halfway, until golden and crisp-edged.",
        minutes: 25,
        heatLevel: "high",
      },
      {
        title: "Cook the rice",
        instruction:
          "Rinse and cook jasmine rice per package directions; fluff and hold covered while the chicken bakes.",
        minutes: 20,
      },
      {
        title: "Make the glaze",
        instruction:
          "Combine soy sauce, hoisin, vinegar, brown sugar, and remaining cornstarch in a saucepan. Add dried chilies, garlic, and ginger, simmer 5–6 minutes, whisking, until thickened and glossy enough to coat a spoon thickly (thicker than a tossing glaze—this one gets brushed on and baked).",
        minutes: 8,
        heatLevel: "medium",
      },
      {
        title: "Steam the broccoli",
        instruction:
          "Steam broccoli florets 4–5 minutes until bright green and just fork-tender.",
        minutes: 5,
      },
      {
        title: "Glaze and bake again",
        instruction:
          "Brush the glaze generously over the baked chicken right on the sheet pan. Return to the oven 6–8 minutes until the glaze sets into a sticky, caramelized coating instead of sitting wet on top. Top with scallions, serve over rice with broccoli alongside.",
        minutes: 8,
        heatLevel: "high",
      },
    ],
    nutrition: { calories: 540, protein: 42, carbs: 48, fats: 18, fiber: 5 },
    proTips: [
      "The dried chilies are for aroma more than eating—warn the crew not to bite into them whole.",
      "A wire rack on the sheet pan crisps the chicken on all sides, not just the bottom.",
      "Reduce dried chilies to 3 for a milder, more kid-friendly version at home.",
    ],
    tonightSpread: ["Steamed broccoli.", "Extra scallions and sesame seeds."],
    leftovers: [
      "Reheat in the oven or air fryer—the baked-in glaze holds up far better than a tossed-on sauce would.",
      "Chop into fried rice the next night with leftover rice.",
    ],
    equipment: ["Half-sheet pan", "Small saucepan", "Rice pot"],
    spiceLevel: "medium",
    cleanupDifficulty: "medium",
  }),

  perfRecipe({
    manifest: manifestEntry({
      slug: "mediterranean-chicken-white-bean-skillet",
      title: "Mediterranean Chicken & White Bean Skillet",
      subtitle: "Seared chicken thighs simmered with white beans, tomatoes, spinach, and feta",
      protein: "chicken",
      cuisine: "Mediterranean",
      mealFormat: "skillet",
      hook: "A bean-forward one-pot dinner, distinct from the farro-bowl and platter formats already live",
      prep: 15,
      cook: 30,
      difficulty: "easy",
      sourceId: "ew-22",
    }),
    description:
      "Chicken thighs sear until golden, then simmer in one skillet with cannellini beans, cherry tomatoes, garlic, and oregano until the beans turn creamy, finished with wilted spinach, olives, and crumbled feta.",
    whyCrewsLikeIt:
      "Genuinely one-pot and bean-forward rather than another grain bowl—beans make it filling and add fiber without extra starch. Feels like a rustic Mediterranean stew, not a diet dinner.",
    mealPrepNotes:
      "Sear the chicken skin-side down first if using skin-on thighs for extra flavor in the pan before the beans go in.",
    stationWorkflow: [
      "Don't rinse all the liquid off the beans—a little bean liquid helps the sauce thicken naturally.",
      "Nestle chicken back into the beans skin-side up so it doesn't turn soggy while simmering.",
      "Crusty bread on the side is non-negotiable for scraping up the sauce.",
    ],
    ingredients: [
      { name: "boneless chicken thighs", quantity: 4, unit: "lb" },
      { name: "cannellini beans", quantity: 3, unit: "cans", notes: "15 oz, drained and rinsed" },
      { name: "cherry tomatoes", quantity: 2, unit: "pints", notes: "whole" },
      { name: "garlic cloves", quantity: 8, unit: "cloves", notes: "minced" },
      { name: "yellow onion", quantity: 1, unit: "medium", notes: "diced" },
      { name: "dried oregano", quantity: 1, unit: "tbsp" },
      { name: "chicken broth", quantity: 1, unit: "cup", notes: "low sodium" },
      { name: "lemon", quantity: 1, unit: "whole", notes: "juiced" },
      { name: "baby spinach", quantity: 6, unit: "cups", notes: "packed" },
      { name: "kalamata olives", quantity: 0.5, unit: "cup", notes: "pitted, halved" },
      { name: "feta cheese", quantity: 1, unit: "cup", notes: "crumbled" },
      { name: "olive oil", quantity: 3, unit: "tbsp" },
      { name: "kosher salt", quantity: 2, unit: "tsp" },
      { name: "black pepper", quantity: 1, unit: "tsp" },
    ],
    stepLines: [
      {
        title: "Sear the chicken",
        instruction:
          "Pat chicken dry, season with salt and pepper. Sear in oil over medium-high 4–5 minutes per side until deeply golden. Remove to a plate; it will finish cooking in the sauce.",
        minutes: 10,
        heatLevel: "medium-high",
      },
      {
        title: "Build the base",
        instruction:
          "In the same skillet, cook onion 4–5 minutes until softened. Add garlic and oregano, cook 1 minute until fragrant.",
        minutes: 6,
        heatLevel: "medium",
      },
      {
        title: "Simmer with beans and tomatoes",
        instruction:
          "Add beans, cherry tomatoes, and broth. Nestle chicken back into the skillet, cover, and simmer 15–18 minutes until chicken reaches 165°F and tomatoes have burst into the sauce.",
        minutes: 18,
        heatLevel: "medium-low",
      },
      {
        title: "Wilt in spinach",
        instruction:
          "Stir in lemon juice and spinach a few handfuls at a time until wilted. Sauce should look thick and stew-like, not watery.",
        minutes: 4,
      },
      {
        title: "Top with olives and feta",
        instruction:
          "Top with olives and crumbled feta right before serving so the feta stays creamy rather than fully melting into the sauce.",
        minutes: 3,
      },
    ],
    nutrition: { calories: 510, protein: 46, carbs: 34, fats: 20, fiber: 8 },
    proTips: [
      "Smash a few beans against the side of the pan partway through simmering for a naturally thicker sauce.",
      "Crusty bread or a small portion of rice on the side rounds this into a full meal.",
      "A pinch of red pepper flakes at the start adds background heat without overpowering.",
    ],
    tonightSpread: ["Crusty bread for scraping the pan.", "Simple green salad."],
    leftovers: [
      "Reheats beautifully—flavor deepens the next day.",
      "Freezes well without the spinach and feta; add those fresh after reheating.",
    ],
    equipment: ["Large deep skillet or Dutch oven"],
    spiceLevel: "mild",
    cleanupDifficulty: "medium",
  }),
];
