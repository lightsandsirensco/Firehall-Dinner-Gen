/**
 * Cooking-first guides: crew quantities, interruption-proof cooking, technique,
 * storage and reheating. Temperatures and storage times are taken from the
 * sources listed on each guide; where USDA and Health Canada differ, both are given.
 */

import type { EditorialArticle } from "./content-schema.js";
import { SRC } from "./guide-sources.js";
import { buildSeoGuide, meal } from "./seo-article-build.js";

const UPDATED = "2026-10-03T18:00:00.000Z";

const cookingForTen = buildSeoGuide({
  slug: "cooking-for-10-firefighters",
  title: "Cooking for 10 Firefighters: How Much Food, Which Pans, and How to Time It",
  seoTitle: "Cooking for 10 People: Quantities, Pans and Timing",
  subtitle:
    "Per-person quantities for crews of 4 to 12, what not to multiply when you scale a recipe, and how to get every component to the table hot.",
  description:
    "Cooking for 10 people: how much meat, pasta and rice to make for 4 to 12, what not to multiply when scaling a recipe, and how to time dinner.",
  topic: "station_cooking",
  pillar: "operations_how_to",
  readMinutes: 9,
  updatedAt: UPDATED,
  keywords: [
    "cooking for 10 people",
    "how much food for 10 people",
    "cooking for 10 firefighters",
    "feeding 10 firefighters",
    "how much meat per person",
    "scaling recipes for a crowd",
  ],
  intro:
    "For 10 hungry adults, plan on about 5 lb (2.3 kg) of boneless meat for a meat-forward main, or 3 1/2 lb (1.6 kg) of ground meat in chili, tacos or a meat sauce. For starch, that is 2 1/2 lb (1.1 kg) of dry pasta as the main, or 5 cups of raw rice as a side. Those amounts run higher than package serving sizes because a working crew eats more than a nutrition label assumes, and running out is worse than leftovers. What usually goes wrong at 10 is not the shopping but the cooking: too little pan space, a multiplied recipe that comes out thin or over-salted, and three components that are never hot at the same time.",
  sections: [
    {
      id: "how-much-per-person",
      heading: "How much food to cook per person",
      paragraphs: [
        "The table uses raw weights and assumes adults with big appetites and one or two sides. If you are serving a heavy starch, bread and a salad, you can come down about 20 percent on the protein. If the crew reliably goes back for seconds, round the protein up rather than the sides, because protein is what runs out first and it is the hardest thing to stretch at the last minute.",
        "Boneless and bone-in weights differ because bone and skin can be a third or more of the weight of chicken pieces. Ground meat in a mixed dish needs less per person than a steak or thigh on the plate, since beans, tomatoes, tortillas or pasta carry part of the meal.",
      ],
      table: {
        caption: "Planning quantities for hungry adults (raw weight, per person in brackets)",
        columns: ["Food", "Per person", "4", "6", "8", "10", "12"],
        rows: [
          ["Boneless meat, meat-forward main", "1/2 lb (225 g)", "2 lb", "3 lb", "4 lb", "5 lb", "6 lb"],
          ["Ground meat in chili, tacos, sauce", "1/3 lb (150 g)", "1 1/3 lb", "2 lb", "2 3/4 lb", "3 1/2 lb", "4 lb"],
          ["Bone-in chicken pieces", "3/4 lb (340 g)", "3 lb", "4 1/2 lb", "6 lb", "7 1/2 lb", "9 lb"],
          ["Dry pasta as the main", "4 oz (115 g)", "1 lb", "1 1/2 lb", "2 lb", "2 1/2 lb", "3 lb"],
          ["Raw long-grain rice as a side", "1/2 cup (90 g)", "2 cups", "3 cups", "4 cups", "5 cups", "6 cups"],
          ["Potatoes", "1/2 lb (225 g)", "2 lb", "3 lb", "4 lb", "5 lb", "6 lb"],
          ["Salad greens", "1 1/2 oz (40 g)", "6 oz", "9 oz", "12 oz", "15 oz", "18 oz"],
        ],
      },
    },
    {
      id: "what-not-to-multiply",
      heading: "What not to multiply when you scale a recipe",
      paragraphs: [
        "Multiplying the main ingredients of a recipe for 4 by 2.5 works. Multiplying everything does not, because several things in a recipe depend on the pot and the pan rather than on the amount of food.",
        "The biggest one is evaporation. Liquid evaporates from the surface, so two and a half times the chili in a pot that is only a little wider has far more liquid but not much more surface. It reduces proportionally less in the same time, which is why a scaled pot often comes out thin and tastes flat even though every spice was multiplied. Give it a longer uncovered simmer before you reach for more seasoning.",
        "Salt does scale with the amount of food, but hold back about a quarter of it, along with strong spices like cayenne, when you multiply a recipe. Stock, canned tomatoes, cheese, sausage and seasoning blends all vary in salt by brand, and multiplying the recipe multiplies that variation. Taste once the pot has simmered and adjust at the end. You can add salt; you can't take it out.",
      ],
      table: {
        caption: "How common ingredients and steps behave when you scale up",
        columns: ["Ingredient or step", "How it scales", "What to do"],
        rows: [
          ["Salt, dried chiles, strong spices", "Linear, with the amount of food", "Add about three-quarters at first, because salty ingredients vary; taste at the end and add the rest as needed"],
          ["Oil for searing", "Depends on pan surface, not food weight", "Use enough to film the pan for each batch instead of multiplying the recipe amount"],
          ["Liquid in soups, braises, sauces", "Reduces proportionally less in a big pot", "Start with about 90 percent of the scaled liquid; simmer uncovered longer if it is still thin"],
          ["Flour or cornstarch thickener", "Roughly linear", "Scale it fully; if the sauce is still thin, add a slurry at the end"],
          ["Baking powder, baking soda, yeast", "Linear by weight, but pan depth changes baking", "Scale by weight, and bake in several pans of the original depth rather than one deep pan"],
          ["Cooking time", "Depends on thickness, not total quantity", "Two pans at the original depth take about the original time; one pan twice as deep takes much longer and cooks unevenly"],
          ["Pan space for browning", "Fixed", "Brown in batches with space between pieces"],
        ],
      },
    },
    {
      id: "formats-that-scale",
      heading: "Choose a format that scales",
      paragraphs: [
        "At 10 people the format matters more than the recipe. A big pot (chili, stew, soup), a tray bake (baked ziti, lasagna, enchiladas), a sheet-pan dinner, or a build-your-own line (tacos, baked potatoes, rice bowls) all have one thing in common: the cooking happens in one or two vessels and the finish is simple. Anything that needs several small pans finished at the same minute, like individually seared steaks or pan sauces, gets harder with every extra person.",
        "Know the capacity of your pans. A half sheet pan (18 x 13 in, 46 x 33 cm) fits roughly 3 lb of boneless chicken thighs in a single layer with space between the pieces, which is what lets them brown instead of steam. For 5 lb, use two pans and swap their oven positions halfway through. A 9 x 13 in (23 x 33 cm) baking dish of baked pasta gives about eight hungry portions, so make two for 10 and freeze whatever is left.",
      ],
    },
    {
      id: "timing",
      heading: "Timing: work backward from when you want to eat",
      paragraphs: [
        "Getting everything done together is a scheduling problem, not a cooking one. Write down each component, how long it takes, and how well it holds once it is done. Then start the slowest and most forgiving item first and finish with the things that are ruined by waiting.",
      ],
      steps: [
        "Pick the serving time and count back from it for each component.",
        "Start the long, forgiving item first: a braise, chili, or baked pasta that can sit covered once it is done.",
        "Start starches that hold next. Rice keeps well in a covered pot off the heat for 20 to 30 minutes; roasted potatoes hold in a low oven.",
        "Leave the fast, fragile items for the last 15 minutes: green vegetables, anything seared, garlic bread, and dressing the salad.",
        "Hold finished food covered in a low oven or on the lowest heat until it is served.",
      ],
    },
    {
      id: "worked-examples",
      heading: "Two complete shopping lists for 10",
      paragraphs: [
        "These are the two dinners crews cook most for 10, turned into full lists with enough margin for seconds and one or two extra people at the table. If visitors from another company or the day shift regularly stay to eat, shop for 12.",
        "Baked ziti needs less dry pasta than a plain pasta dinner, because the pasta shares the pan with meat, ricotta and mozzarella. Two 9 x 13 in (23 x 33 cm) dishes hold it comfortably, with room for leftovers.",
      ],
      table: {
        caption: "Taco night and baked ziti for 10 hungry adults",
        columns: ["Taco night", "Amount", "Baked ziti night", "Amount"],
        rows: [
          ["Ground beef", "3 1/2 lb (1.6 kg)", "Dry ziti or penne", "2 lb (900 g)"],
          ["6 in (15 cm) tortillas", "30 (3 per person)", "Italian sausage or ground beef", "1 1/2 lb (680 g)"],
          ["Shredded cheese", "1 1/4 lb (570 g)", "Marinara", "3 jars, 24 oz (680 g) each"],
          ["Canned black or pinto beans", "3 cans, 15 oz (425 g) each", "Ricotta", "2 lb (900 g)"],
          ["Long-grain rice", "3 cups raw", "Mozzarella", "1 1/2 lb (680 g)"],
          ["Lettuce, tomato, onion", "1 head, 4 tomatoes, 1 onion", "Parmesan", "1 cup grated"],
          ["Salsa and sour cream", "32 oz (900 g) each", "Garlic bread and salad greens", "2 loaves, 15 oz (425 g)"],
        ],
      },
    },
    {
      id: "serving-ten",
      heading: "Serving 10 without running out",
      paragraphs: [
        "At 10, run a line instead of plating. Put the plates first, then starches and sides, then the protein, then sauces and toppings, so plates fill with the cheaper food before they reach the part most likely to run short. One person serving the protein keeps portions even and keeps everyone else away from the stove, which matters in a small station kitchen.",
        "When protein is tight, portion it before service starts: count the chicken thighs, slice the roast, or put a card at the pan that says two tacos' worth or one ladle. Set a covered plate aside in a low oven for anyone who is out on a call.",
        "Hot food is safe while it stays at 140°F (60°C) or above. Anything that has sat between 40 and 140°F (4 and 60°C) for two hours, or one hour above 90°F (32°C), should be thrown out, so get leftovers into shallow containers and into the fridge well before then. Reheat them to 165°F (74°C).",
      ],
    },
  ],
  practicalAdvice: [
    "Plan 1/2 lb (225 g) of raw boneless meat per person for a meat-forward main and 1/3 lb (150 g) of ground meat for chili, tacos or sauces.",
    "When you scale a recipe, scale the main ingredients fully, add about three-quarters of the salt and strong spices at first, and adjust at the end.",
    "Brown meat in batches and use two sheet pans instead of one crowded pan.",
    "Start the most forgiving dish first and finish with anything seared, dressed or fried.",
  ],
  mealRecommendations: [
    meal("big-chili", "Beef and Bean Chili", "Scales in one pot, holds on low for an hour, and uses the ground-meat quantities above."),
    meal("baked-ziti", "Baked Ziti", "Two 9 x 13 pans feed 10 to 12; assemble early and bake when the crew is close."),
    meal("batch-lasagna", "Batch Lasagna", "A tray bake that slices cleanly and reheats well the next shift."),
    meal("hall-taco-bar", "Taco Bar", "Build-your-own service: one pan of seasoned meat and a line of toppings handles different appetites."),
    meal("sheet-pan-fajitas", "Sheet-Pan Fajitas", "Two sheet pans in the oven at once, no batch searing at the stove."),
    meal("loaded-baked-potato-bar", "Baked Potato Bar", "Potatoes bake unattended and hold in the oven; toppings go on the line."),
    meal("pulled-pork", "Pulled Pork", "Cooks for hours without attention and holds moist in its juices."),
  ],
  faqs: [
    {
      question: "How much ground beef do I need for tacos for 10 people?",
      answer:
        "About 3 to 3 1/2 lb (1.4 to 1.6 kg) of raw ground beef, which is roughly 1/3 lb per person. Tacos come with tortillas, beans, cheese and toppings, so you need less meat per person than for a plated main. Go to 4 lb if the crew eats big or if you have no beans or rice on the side.",
    },
    {
      question: "How much pasta should I cook for 10 adults?",
      answer:
        "2 1/2 lb (1.1 kg) of dry pasta when pasta is the main dish, or about 1 1/4 lb (570 g) as a side. The 2 oz serving on the box is a side portion and runs short for hungry adults.",
    },
    {
      question: "Can I just multiply a recipe for 4 by 2.5?",
      answer:
        "Multiply the main ingredients, but not everything. Salt and strong spices scale with the food, but add about three-quarters at first because stock, canned tomatoes and cheese vary in salt, then taste and adjust at the end. Use pan-sized amounts of oil for searing, start with about 90 percent of the liquid because a big pot reduces proportionally less, and split the food across more pans rather than one deeper pan.",
    },
    {
      question: "How do I keep dinner hot for people who eat at different times?",
      answer:
        "Keep finished food covered at 140°F (60°C) or above: on the stove on low, in a slow cooker on warm, or in a low oven. Covering stops it drying out. Anything that won't be eaten within two hours goes in the fridge instead, and gets reheated to 165°F (74°C) later.",
    },
  ],
  relatedArticleSlugs: [
    "best-firehouse-meals-large-crews",
    "feeding-a-firehall-crew",
    "firehall-grocery-planning",
    "easy-firehall-pasta-recipes",
    "station-kitchen-essentials",
  ],
  sources: [SRC.usdaLeftovers, SRC.hcHome],
});

const interruptionProofDinner = buildSeoGuide({
  slug: "feeding-a-firehall-crew",
  title: "How to Cook a Crew Dinner That Survives Interruptions",
  seoTitle: "Meals That Hold Well: Crew Dinners That Survive a Call",
  subtitle:
    "Which dishes can wait and which can't, where to pause the cook, and what to do with the food when the crew has to leave mid-meal.",
  description:
    "Meals that hold well for a crew dinner that gets interrupted: which dishes wait, where to pause the cook, and when food left during a call is safe.",
  topic: "shift_operations",
  pillar: "operations_how_to",
  readMinutes: 8,
  updatedAt: UPDATED,
  keywords: [
    "meals that hold well",
    "keeping food warm for a crowd",
    "meals that can be interrupted",
    "keeping dinner warm",
    "is food left out safe to eat",
    "cooking for a crew on shift",
  ],
  intro:
    "Meals that hold well have a safe place to stop at every stage: chili, a braise or a baked pasta can sit covered in a 200°F (95°C) oven or a slow cooker on warm for an hour and come back just as good. Seared steak, fried food and dressed pasta cannot. Interrupted crew dinners usually go wrong in two places: components that keep cooking while they wait, and food left on a cold stove for longer than anyone noticed.",
  sections: [
    {
      id: "what-holds",
      heading: "Dishes that hold, and dishes that don't",
      paragraphs: [
        "Food holds well when it is surrounded by liquid, when it is already cooked past the point of tenderness, or when it was never crisp to begin with. It holds badly when its appeal depends on a precise doneness or a crisp surface, because both are lost to carryover heat and trapped steam.",
      ],
      table: {
        caption: "How long common dishes hold once they are cooked, and how to hold them",
        columns: ["Dish", "Holds for", "How to hold it"],
        rows: [
          ["Chili, stew, braises, soup", "1 to 2 hours", "Covered on the lowest heat; stir from the bottom when you return"],
          ["Baked pasta, lasagna, enchiladas", "About 1 hour", "Covered with foil in a 200°F (95°C) oven; uncover for the last 10 minutes"],
          ["Pulled pork, shredded chicken", "1 to 2 hours", "In its cooking liquid, covered, in a slow cooker on warm or a low oven"],
          ["Rice", "About 1 hour", "Rice cooker on warm, or a covered pot off the heat; fluff before serving"],
          ["Roast chicken, sheet-pan dinners", "30 to 45 minutes", "Uncovered in a low oven so the skin stays drier; a minute under the broiler brings it back"],
          ["Steak, chops, seared fish", "Poorly", "Cook in the last 15 minutes, or plan a different main on a busy night"],
          ["Fried or breaded food", "About 20 minutes", "On a wire rack, uncovered, in a 200°F (95°C) oven"],
          ["Dressed pasta, dressed salad", "Poorly", "Keep sauce and dressing separate until serving"],
        ],
      },
    },
    {
      id: "stopping-points",
      heading: "Build stopping points into the cook",
      paragraphs: [
        "Most interrupted dinners are ruined by components that keep cooking while they wait. Pasta is the clearest example: dressed pasta keeps absorbing sauce and goes soft before everyone gets back. If a pasta dinner might be interrupted, drain the pasta a couple of minutes short of al dente, toss it with a little oil and spread it on a sheet pan. It stops cooking almost immediately and comes back in 30 to 60 seconds in boiling water or simmering sauce.",
        "The same logic applies elsewhere. Keep gravies and sauces in their own pot. Roast vegetables until just tender rather than fully browned, then finish them in a hot oven when you're back. Cook starches and proteins separately so a delay only affects the one component that is actually sensitive to it.",
        "Partly cooked meat is never a planned stopping point. USDA advises against partially cooking meat or poultry to finish later, because partial cooking warms any bacteria without killing them. Don't brown chicken ahead with the idea of finishing it after dinner is called; start the meat only when you can take it all the way to a safe temperature.",
      ],
    },
    {
      id: "when-the-call-comes",
      heading: "What to do when a call comes in mid-cook",
      paragraphs: [
        "You usually have less than a minute, so these steps are in order of importance. Fully cooked food, covered, in a low oven or a running slow cooker is the safest way to leave dinner.",
      ],
      steps: [
        "Turn off open burners. If the main dish is fully cooked, move it into a low oven or leave it in the slow cooker.",
        "Cover everything. A lid or foil slows cooling and stops the surface drying out.",
        "Drain pasta or vegetables sitting in hot water; they keep cooking as long as they are in it.",
        "If seared meat is fully cooked, move it from the hot pan to a plate so carryover heat doesn't overcook it, cover it, and hold it in the low oven.",
        "If the meat isn't cooked through, put it straight into the fridge, along with anything raw and any cold ingredients that are out.",
      ],
    },
    {
      id: "is-it-safe",
      heading: "When you get back: is the food still safe?",
      paragraphs: [
        "Food that stayed at 140°F (60°C) or above the whole time, in a slow cooker or a low oven, is fine. Food left on the stove with the heat off has been cooling through the danger zone, 40 to 140°F (4 to 60°C), where bacteria multiply quickly. USDA and Health Canada both say cooked food left in that range for more than two hours should be thrown out, and USDA shortens that to one hour when the room is above 90°F (32°C).",
        "Under two hours, reheat the food to 165°F (74°C) and serve it; bring soups, sauces and gravies back to a rolling boil. If nobody knows how long it has been sitting, throw it out. Smell and appearance won't tell you whether it is safe.",
        "Partly cooked meat that went into the fridge before you left should be cooked all the way to a safe temperature as soon as you're back. Treat that as the fallback for a call you couldn't avoid, not as a way to plan dinner. If the meat sat in a warm pan or on the counter instead, throw it out.",
      ],
    },
    {
      id: "plan-for-call-volume",
      heading: "Plan the menu around how busy the day is",
      paragraphs: [
        "On a day that has already been busy, cook something that is done an hour early and holds: chili, a braise in the oven, pulled pork in the slow cooker, or a baked pasta that only needs reheating. Save steaks, stir-fries and fried food for quiet evenings, or cook them in stages so the fragile part happens only when everyone is actually sitting down.",
        "Decide the meal by mid-afternoon, even if the day is unpredictable. What can change later is the format, not whether dinner happens: a planned taco night can become a pot of seasoned meat held on low with tortillas warmed to order, and a planned sheet-pan dinner can go into the oven the moment the crew is back. Write the dish and the rough serving time where everyone can see it, so whoever picks up the cook after a call knows what state it is in.",
      ],
    },
    {
      id: "fallback",
      heading: "Keep a 30-minute fallback in the freezer",
      paragraphs: [
        "When the planned dinner falls through, the usual answer is ordering in. A few freezer and pantry items that go from frozen to the table in about 30 minutes give the crew a better option. Each one cooks from frozen or thaws quickly in cold water, and none needs more than one pan and a pot of water.",
      ],
      table: {
        caption: "Freezer fallbacks and how long they take from frozen",
        columns: ["Fallback", "From frozen to the table", "How"],
        rows: [
          ["Raw shrimp, peeled", "About 15 minutes", "Thaw in a colander under cold running water for 5 to 10 minutes, then sauté with garlic and butter over pasta or rice"],
          ["Ground beef frozen flat in 1 lb bags", "About 40 minutes", "Thaw in its bag in cold water (under an hour for a flat bag), then brown for tacos or a quick meat sauce"],
          ["Cooked meatballs", "About 25 minutes", "Simmer straight from frozen in jarred marinara until 165°F (74°C) in the center; serve on rolls or pasta"],
          ["Filled pasta (tortellini, ravioli)", "About 10 minutes", "Boil straight from frozen and toss with butter, parmesan and a vegetable"],
          ["Frozen dumplings or potstickers", "About 15 minutes", "Pan-fry and steam in a covered skillet, with rice and a frozen stir-fry vegetable blend"],
          ["Tortillas, cheese, canned beans", "About 20 minutes", "Bean and cheese quesadillas in batches on a griddle, held on a rack in a low oven"],
        ],
      },
    },
  ],
  practicalAdvice: [
    "Pick a main that holds: braises, chili, soups, baked pasta and shredded meats are the safest choices on a busy day.",
    "Keep pasta, sauces and dressings separate until serving so nothing goes soft while it waits.",
    "Before you leave, turn off open burners, cover everything, move fully cooked food to a low oven or slow cooker, and put meat that isn't cooked through in the fridge.",
    "Never stop partway through cooking meat as a plan; only start it when you can finish it to a safe temperature.",
    "Decide dinner by mid-afternoon and keep a few 30-minute freezer fallbacks for the nights the plan falls through.",
  ],
  mealRecommendations: [
    meal("big-chili", "Beef and Bean Chili", "Holds for hours on low and tastes as good two hours later as when it was ready."),
    meal("pulled-pork", "Pulled Pork", "Slow cooker or low oven; it stays moist in its juices while the crew is out."),
    meal("baked-ziti", "Baked Ziti", "Assemble early, bake when the crew is close, hold covered if they get called."),
    meal("pork-carnitas-tacos", "Pork Carnitas Tacos", "Braised pork shoulder holds in its juices; crisp it in a hot pan when the crew is back."),
    meal("beef-barley-soup", "Beef Barley Soup", "A pot that only improves on low heat; bring back to a boil to serve."),
    meal("hall-taco-bar", "Taco Bar", "Seasoned meat holds on low; tortillas and toppings go out when the crew is back."),
  ],
  faqs: [
    {
      question: "What meals can be left on warm if we get called out?",
      answer:
        "Dishes with plenty of liquid or that are already cooked past tender: chili, stews, soups, braises, pulled pork, shredded chicken and baked pastas. Keep them covered in a slow cooker on warm or in a low oven, where they stay hot enough to be safe.",
    },
    {
      question: "How do you keep food warm for a crowd without drying it out?",
      answer:
        "Hold it covered at 140°F (60°C) or above: in a slow cooker on warm, on the lowest burner, or in a 200°F (95°C) oven. Saucy dishes hold best; stir from the bottom and add a splash of water or stock if they thicken. Crisp food is the exception: hold it uncovered on a rack and serve it within about 20 minutes.",
    },
    {
      question: "Is food still safe if it sat on the stove during a call?",
      answer:
        "If the heat was off, it has been cooling since you left. Under two hours, reheat it to 165°F (74°C) and serve it. Over two hours, or if nobody knows how long it sat, throw it out. USDA and Health Canada give the same rule.",
    },
    {
      question: "How do I keep pasta from going mushy if dinner is delayed?",
      answer:
        "Cook it a couple of minutes short of al dente, drain it, toss it with a little oil and spread it out to stop the cooking. Keep the sauce hot separately. When the crew is back, dunk the pasta in boiling water for 30 to 60 seconds or finish it in the simmering sauce with a splash of pasta water.",
    },
    {
      question: "Can I finish cooking chicken that was half-cooked when we got a call?",
      answer:
        "Only if it went into the fridge before you left, and then cook it to 165°F (74°C) as soon as you're back. USDA advises never partially cooking meat or poultry to finish later, so treat this as a fallback, not a plan. If the chicken sat in a warm pan or on the counter, throw it out.",
    },
  ],
  relatedArticleSlugs: [
    "cooking-for-10-firefighters",
    "planning-tonights-station-dinner",
    "fast-firehall-meals-under-30-minutes",
    "firehall-meal-prep-ideas",
    "best-firefighter-crockpot-meals",
  ],
  sources: [SRC.usdaLeftovers, SRC.hcLeftovers, SRC.usdaThaw, SRC.usdaSlowCooker],
});

const groceryPlanning = buildSeoGuide({
  slug: "firehall-grocery-planning",
  title: "Grocery Planning for a Firehouse Crew: How Much to Buy and How to Shop",
  seoTitle: "Grocery Planning for a Crew: How Much Food to Buy",
  subtitle:
    "Turn a menu into a shopping list, buy protein by weight, thaw it in time, and keep a pantry that covers the nights the plan falls apart.",
  description:
    "Build a firehouse grocery list from the menu: per-person quantities, buying and thawing bulk meat safely, and pantry staples for bad nights.",
  topic: "meal_planning",
  pillar: "operations_how_to",
  readMinutes: 8,
  updatedAt: UPDATED,
  keywords: [
    "firehouse grocery list",
    "grocery planning for a crew",
    "how much food to buy for a group",
    "fire station groceries",
    "splitting grocery costs",
    "thawing meat safely",
  ],
  intro:
    "Plan crew groceries from the menu and the head count: decide the meals, multiply per-person amounts by the number eating, and buy protein by weight first, at about 1/2 lb (225 g) of raw boneless meat per person. Protein is the most expensive item and the one you can't improvise. The step crews most often miss is the thaw: even a 1 lb package of frozen meat needs about a full day in the fridge.",
  sections: [
    {
      id: "menu-to-list",
      heading: "Turn the menu into a list",
      paragraphs: [
        "Work from the meals, not from memory. A shift that covers dinner and breakfast for six needs very different quantities from a lunch for four, and guessing at the store is how you end up with three bags of onions and no garlic.",
      ],
      steps: [
        "Count who is eating each meal, including anyone detailed in for the shift.",
        "Choose the meals and write the main ingredients for each one.",
        "Convert to quantities with per-person numbers: about 1/2 lb (225 g) of raw boneless meat, 1/3 lb (150 g) of ground meat in mixed dishes, 4 oz (115 g) of dry pasta, or 1/2 cup of raw rice per hungry adult.",
        "Check the station fridge, freezer and pantry, and cross off what you already have.",
        "Group the list by store section (produce, meat, dairy, pantry, frozen) so one pass through the store covers it.",
      ],
    },
    {
      id: "protein",
      heading: "Buy protein by weight, and plan the thaw",
      paragraphs: [
        "Protein is where the money goes and where shortages are most obvious, so buy it first and buy it by weight. Family packs are usually cheaper per pound; portion the extra into meal-sized bags, press them flat, and freeze. Flat bags stack neatly and thaw much faster than a solid block.",
        "Thawing is where plans fail. In the fridge, which is the safest method, USDA says even a pound of ground meat or boneless chicken needs a full day, and large items need about 24 hours for every 5 lb. If dinner is tonight and the meat is still frozen, thaw it in cold water: keep it in a leak-proof bag, submerge it, and change the water every 30 minutes. A 1 lb package can thaw in an hour or less and a 3 to 4 lb package in 2 to 3 hours. Food thawed in cold water or the microwave should be cooked right away.",
        "You can also cook many things straight from frozen. USDA estimates it takes about 50 percent longer. The exception is the slow cooker: thaw meat before it goes in, because a slow cooker heats up too gradually to start from frozen safely.",
      ],
    },
    {
      id: "pantry",
      heading: "Pantry staples that rescue a bad night",
      paragraphs: [
        "A small set of long-lasting staples means the crew can still eat well when groceries didn't happen or the planned meal got derailed. With the list below you can make chili, fried rice, pasta with a quick tomato sauce, tacos, a frittata, or bean and cheese quesadillas without a shopping trip.",
      ],
      tips: [
        "Dry goods: rice, dry pasta, flour, oats, tortillas (they freeze well).",
        "Cans and jars: crushed tomatoes, beans, broth, salsa, peanut butter.",
        "Keepers: onions, garlic, potatoes, eggs, a block of cheese, frozen vegetables.",
        "Flavor: salt, pepper, cumin, chili powder, smoked paprika, oregano, soy sauce, hot sauce, vinegar, oil.",
      ],
    },
    {
      id: "cost",
      heading: "Keeping the cost down without cooking worse food",
      paragraphs: [
        "The cheaper cuts are often the better choice at a station anyway. Chicken thighs, pork shoulder and beef chuck cost less than breasts, loins and steaks, and they stay moist when dinner gets held or reheated, while lean cuts dry out. Compare unit prices rather than package prices, build meals around what is on sale that week, and use the pantry staples above to stretch expensive protein with beans, rice and potatoes.",
      ],
    },
    {
      id: "splitting-the-cost",
      heading: "Splitting the cost fairly",
      paragraphs: [
        "Most crews split the bill for each meal among the people who ate it, which avoids charging someone who was off sick or detailed elsewhere. The part that goes wrong is the staples: oil, salt, spices, foil and coffee get used by everyone but bought by whoever happened to shop. A small fixed amount added to each person's share, kept in a separate staples fund, pays for them without anyone tracking who used how much cumin.",
        "For example, a dinner for 8 costs $96 in groceries, or $12 a person. Add $1 each for the staples fund and everyone pays $13. When the fund runs low, whoever shops next restocks the staples from it.",
      ],
      steps: [
        "Photograph the receipt and post it for the crew before you put the groceries away.",
        "Divide the meal's cost by the number of people eating, not by the number on shift.",
        "Add a small fixed staples amount per person and keep it in its own fund or card.",
        "Settle up the same shift, through one shared payment app or card rather than cash owed later.",
        "Rotate who shops, so one person isn't always fronting the money and prices get a second set of eyes.",
      ],
    },
  ],
  practicalAdvice: [
    "Build the list from the menu and head count, then check the station stock before you shop.",
    "Buy protein by weight first; freeze extra in flat, meal-sized bags.",
    "Move frozen meat to the fridge a day ahead; use cold water, changed every 30 minutes, if you forgot.",
    "Keep a pantry that can produce three or four meals without a shopping trip.",
  ],
  mealRecommendations: [
    meal("hall-taco-bar", "Taco Bar", "Ground meat, tortillas and pantry toppings; easy to shop for and hard to run short on."),
    meal("big-chili", "Beef and Bean Chili", "Mostly pantry ingredients plus ground beef; stretches well with extra beans."),
    meal("sheet-pan-fajitas", "Sheet-Pan Fajitas", "Chicken thighs and peppers, a short list that scales by the pound."),
    meal("baked-ziti", "Baked Ziti", "Dry pasta, canned tomatoes and cheese, with room to add whatever meat is on sale."),
    meal("loaded-baked-potato-bar", "Baked Potato Bar", "Potatoes are cheap per serving, and the toppings clear out the fridge."),
  ],
  faqs: [
    {
      question: "How much food should I buy for a 24-hour shift for six people?",
      answer:
        "For dinner, about 3 lb (1.4 kg) of raw boneless meat or 2 lb (900 g) of ground meat in a mixed dish, plus 1 1/2 lb of dry pasta or 3 cups of raw rice. For breakfast, plan 12 to 18 eggs, around 1 lb of bacon or sausage, and bread or potatoes. Add whatever lunch the crew eats together, and check what is already at the station first.",
    },
    {
      question: "How long does frozen ground beef take to thaw?",
      answer:
        "In the fridge, USDA says to allow a full day for a 1 lb package, and about 24 hours per 5 lb for larger amounts; flat bags thaw faster than a block. In cold water, in a leak-proof bag with the water changed every 30 minutes, a 1 lb package can thaw in an hour or less. Cook meat thawed in cold water right away.",
    },
    {
      question: "How do you split grocery costs at a fire station?",
      answer:
        "Divide each meal's receipt by the number of people who ate it, not the number on shift. Add a small fixed amount per person, such as $1, to a staples fund that covers oil, spices, foil and coffee. Post a photo of the receipt and settle up the same shift through one shared payment app.",
    },
    {
      question: "Can we cook meat straight from frozen?",
      answer:
        "Yes, in the oven, on the stove or on the grill. Expect it to take about 50 percent longer, according to USDA, and check the final temperature with a thermometer. Don't put frozen meat in a slow cooker; thaw it first.",
    },
  ],
  relatedArticleSlugs: [
    "cooking-for-10-firefighters",
    "cheap-firehall-meals",
    "planning-tonights-station-dinner",
    "firehall-meal-prep-ideas",
  ],
  sources: [SRC.usdaThaw, SRC.usdaSlowCooker],
});

const rookieMistakes = buildSeoGuide({
  slug: "rookie-cooking-mistakes",
  title: "Rookie Cooking Mistakes at the Firehall, and How to Fix Them",
  seoTitle: "Beginner Cooking Mistakes to Avoid When Cooking for a Crowd",
  subtitle:
    "Grey ground beef, flat chili, dry chicken and a dinner that finishes in pieces: the mistakes behind most bad crew dinners, and what to do instead.",
  description:
    "Beginner cooking mistakes to avoid when cooking for a crowd: crowded pans, wet meat, salt in big batches, guessing doneness and leaving food out.",
  topic: "station_cooking",
  pillar: "operations_how_to",
  readMinutes: 10,
  updatedAt: UPDATED,
  keywords: [
    "beginner cooking mistakes",
    "cooking mistakes to avoid",
    "common cooking mistakes",
    "cooking for a crowd",
    "firehouse cooking",
    "why is my ground beef grey",
    "should you rinse raw chicken",
  ],
  intro:
    "Most bad crew dinners have nothing to do with the recipe. They come from a few technique mistakes that get worse as the batch gets bigger: three pounds of ground beef piled into one skillet so it steams grey, a pot of chili scaled up for ten that tastes flat, chicken cooked until it's dry because nobody checked the temperature. None of the fixes takes special skill. Most of them take a second pan, an instant-read thermometer, or ten minutes of planning before the stove goes on.",
  sections: [
    {
      id: "crowding",
      heading: "Crowding the pan",
      paragraphs: [
        "Meat and vegetables give off water as they heat. With space around each piece, that water evaporates almost as fast as it appears and the surface browns. Pile too much into one pan and the water comes out faster than it can boil off. The pan cools, the food simmers in its own juices, and it turns grey and greasy instead of brown. You lose the browned flavor that makes taco meat and chili taste savory.",
        "Brown in batches. A 12 in (30 cm) skillet handles about 1 to 1 1/2 lb (450 to 680 g) of ground meat at a time, or chicken pieces with roughly an inch of space around each one. Spread the meat out and leave it alone for the first few minutes so a crust can form before you start breaking it up.",
        "For a crew, that means 3 1/2 lb of taco meat is three batches. Run two skillets side by side, or brown the meat in the wide pot you'll finish the dish in. The same rule applies in the oven: a half sheet pan holds about 3 lb of boneless chicken thighs in a single layer, so use two pans for 10 people and swap their rack positions halfway through.",
      ],
    },
    {
      id: "wet-surface",
      heading: "Putting meat in the pan wet",
      paragraphs: [
        "A wet surface can't brown. The pan's heat goes into boiling off the water first, and water doesn't get much hotter than 212°F (100°C), well below the temperature where browning happens. Pat meat dry with paper towels before it goes in, especially chicken thighs, pork chops and anything that has been in a marinade. Scrape off excess marinade too; the sugar in it burns before the meat is done.",
        "Don't rinse raw chicken. It doesn't make the chicken safer, because cooking to 165°F (74°C) is what kills bacteria, and USDA warns that rinsing splashes those bacteria onto the sink, counters and anything nearby. Pat it dry, then wash your hands and anything the raw chicken touched.",
        "With a family pack, lay the pieces out on a sheet pan lined with paper towels and pat the tops dry in one pass. If you have time, salt the meat and leave it uncovered on a rack in the fridge for a few hours or overnight. The surface dries on its own and the meat is seasoned at the same time.",
      ],
    },
    {
      id: "pan-temperature",
      heading: "Adding food before the pan is hot, then moving it too soon",
      paragraphs: [
        "In a lukewarm pan, meat sticks and stews instead of searing. Moving it early makes things worse, because the crust tears off and stays on the pan.",
        "Heat a stainless steel or cast-iron skillet over medium-high for 2 to 3 minutes, add the oil, and wait until it shimmers. Then add the food and leave it for 3 to 4 minutes. When the crust has formed, the meat releases from the pan with a gentle nudge. If it is still stuck, give it another minute. Nonstick pans are the exception: don't heat them empty on high, because it damages the coating. Add the oil first and use medium to medium-high heat.",
        "When you brown several batches in a row, give the pan a minute to come back up to heat between them, and add a little fresh oil. If the bits on the bottom start to blacken rather than brown, wipe the pan out before the next batch, or the burnt taste ends up in the dish.",
      ],
    },
    {
      id: "seasoning",
      heading: "Salting at the wrong time, and scaling salt by guesswork",
      paragraphs: [
        "Salt sprinkled on a finished plate only seasons the surface. Salt added earlier has time to get into the food. Salt meat ahead when you can: an hour before cooking, or up to a day ahead in the fridge. Then season each part of the meal as it cooks: the pasta water, the vegetables, the sauce. Trying to fix a whole dinner with the salt shaker at the table doesn't work.",
        "Scaling needs more care. In principle, salt goes up with the amount of food. In practice, the salty ingredients in a big batch (stock, canned tomatoes, cheese, sausage, store-bought seasoning blends) vary by brand. A big pot also reduces differently from the small one the recipe was tested in, so it's hard to predict how strong it will taste. When you multiply a recipe, start with about three-quarters of the salt and strong spices like cayenne. Taste after 20 to 30 minutes of simmering, then adjust. You can always add salt. You can't take it out.",
        "If a big pot of chili or soup still tastes flat once the salt is right, it usually needs acid rather than more spice: a squeeze of lime or a spoonful of vinegar. If it tastes thin as well as flat, simmer it uncovered for longer so it can reduce.",
      ],
    },
    {
      id: "doneness",
      heading: "Guessing when meat is done",
      paragraphs: [
        "Color is not a reliable test. USDA notes that ground beef can turn brown before it reaches a safe temperature, and fully cooked chicken can still look pink near the bone. Cutting into meat to check lets juice run out, and cooks who guess usually make up for it by overcooking. That is where most dry chicken comes from.",
        "Use a digital instant-read thermometer. Push it into the thickest part of the meat, away from bone, fat and gristle, and take the meat off the heat when it reaches the target. On a crowded tray, pieces vary in size and ovens have hot spots, so check the biggest piece and a couple from different parts of the pan. Test the thermometer now and then in a glass of ice water, where it should read 32°F (0°C).",
        "USDA and Health Canada agree on most targets but not all. They differ on whole cuts of pork, whole poultry, fish and egg dishes, so the table shows both. Follow the guidance that applies where you cook.",
      ],
      table: {
        caption: "Safe minimum internal temperatures, USDA and Health Canada",
        columns: ["Food", "USDA", "Health Canada"],
        rows: [
          ["Chicken and turkey pieces, ground poultry", "165°F (74°C)", "74°C (165°F)"],
          ["Whole chicken or turkey", "165°F (74°C)", "82°C (180°F)"],
          ["Ground beef or pork (burgers, meatballs)", "160°F (71°C)", "71°C (160°F)"],
          ["Beef, veal, lamb steaks and roasts", "145°F (63°C) and rest 3 minutes", "63°C (145°F) for medium-rare"],
          ["Pork chops, loin and roasts", "145°F (63°C) and rest 3 minutes", "71°C (160°F)"],
          ["Fish", "145°F (63°C)", "70°C (158°F)"],
          ["Egg dishes", "160°F (71°C)", "74°C (165°F)"],
          ["Leftovers and casseroles", "165°F (74°C)", "74°C (165°F)"],
        ],
      },
    },
    {
      id: "resting",
      heading: "Slicing meat the moment it comes off the heat",
      paragraphs: [
        "Thick cuts keep cooking after they leave the heat, because the hot outside keeps pushing heat into the center. A roast can rise several degrees while it rests. Resting also lets the temperature even out, so less juice runs onto the board when you slice. USDA's 145°F (63°C) target for whole cuts of beef, pork and lamb includes a 3-minute rest.",
        "Rest steaks and chops for about 5 minutes and roasts for 10 to 20, loosely covered with foil. Then slice across the grain. Ground meat, chicken pieces and anything in a sauce don't need a rest. If a roast has to wait longer before a line opens, keep it covered in a low oven so it stays at 140°F (60°C) or above.",
      ],
    },
    {
      id: "scaling-a-batch",
      heading: "Treating a big batch like a small one",
      paragraphs: [
        "Cooking time depends on how thick the food is, not how much of it there is. Two pans of baked ziti at the original depth bake in about the original time. One pan twice as deep takes much longer, and the edges dry out before the center is hot. Split big batches across more pans rather than piling them higher.",
        "A full oven also cooks more slowly than the recipe says, because there is more cold food in it and less room for air to move. Add 10 to 15 minutes, swap the pans between racks halfway through, and go by the thermometer rather than the timer. For soups and braises, start with about 90 percent of the multiplied liquid. A wide pot that is only a little bigger than the original reduces more slowly, and it's easier to add liquid than to cook it off.",
      ],
    },
    {
      id: "timing",
      heading: "Starting everything at the same time",
      paragraphs: [
        "Start every part of the meal together and something will be done 30 minutes early and something else 10 minutes late. Write down the serving time, then work backward. Start the slowest, most forgiving dish first: chili, a braise or a tray bake that can sit covered once it's done. Rice and roasted potatoes come next, because they hold well. Leave the fast, fragile things for the last 15 minutes: green vegetables, anything seared, garlic bread, and dressing the salad.",
        "Give yourself a margin the first few times you cook for the crew. Add 20 minutes to the plan, and do all the chopping, measuring and can-opening before the heat goes on.",
      ],
    },
    {
      id: "food-safety",
      heading: "Leaving food out after dinner or during a call",
      paragraphs: [
        "Food left between 40 and 140°F (4 and 60°C) for more than two hours, or one hour above 90°F (32°C), should be thrown out. In a station kitchen that usually happens after dinner, when the pot sits on the stove while the crew cleans up or heads out on a call. Get leftovers into shallow containers and into the fridge within two hours. A full stockpot cools too slowly in the fridge, so divide it up first.",
        "If a call comes in partway through the cook, turn off open burners and cover everything. Don't leave raw or partly cooked meat sitting warm to finish later. Get it into the fridge before you leave, and finish cooking it to a safe temperature as soon as you're back. Keep raw meat on its own cutting board, and keep it on the bottom shelf of the fridge so it can't drip onto anything else.",
      ],
    },
    {
      id: "garlic-and-knives",
      heading: "Burning the garlic, and cooking with a dull knife",
      paragraphs: [
        "Garlic added with the onions over medium-high heat burns long before the onions soften, and burnt garlic makes the whole pot bitter. Cook the onions first, then add the garlic for the last minute before the liquid goes in.",
        "A dull knife slips off onion skins and tomatoes instead of cutting them, which makes it slower and more dangerous than a sharp one. Prepping for 10 means a lot of chopping, so keep a sharpener in the kitchen and use it.",
      ],
    },
  ],
  practicalAdvice: [
    "Brown about 1 to 1 1/2 lb of meat at a time in a 12 in skillet, or run two pans at once.",
    "Pat meat dry before it goes in a hot pan, and never rinse raw chicken.",
    "When you scale a recipe, start with three-quarters of the salt and strong spices, taste after it simmers, and finish with acid if it tastes flat.",
    "Check doneness with an instant-read thermometer, testing several pieces on a crowded tray.",
    "Get leftovers into shallow containers and into the fridge within two hours.",
  ],
  mealRecommendations: [
    meal("sheet-pan-parmesan-dijon-chicken-thigh-dinner", "Sheet-Pan Parmesan Dijon Chicken Thighs", "A forgiving first crew dinner: dry the thighs well, space them out, and check with a thermometer."),
    meal("big-chili", "Beef and Bean Chili", "Good practice for browning in batches and seasoning a big pot."),
    meal("hall-taco-bar", "Taco Bar", "Brown the meat properly and the rest is assembly."),
    meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "One pot, one timer, and a chance to practice searing before the rice goes in."),
    meal("baked-ziti", "Baked Ziti", "Hard to get wrong if you undercook the pasta slightly before baking."),
  ],
  faqs: [
    {
      question: "Why does my ground beef turn grey instead of brown?",
      answer:
        "Too much meat in the pan. It gives off water faster than the water can evaporate, so it simmers instead of searing. Brown it in batches of about 1 to 1 1/2 lb in a 12 in skillet over medium-high heat, and leave it alone for the first few minutes before breaking it up.",
    },
    {
      question: "Should you rinse raw chicken before cooking it?",
      answer:
        "No. USDA advises against it. Rinsing doesn't remove bacteria reliably, and the splashes spread them around the sink and counters. Cooking chicken to 165°F (74°C) is what makes it safe. Pat it dry with paper towels instead, then wash your hands and anything it touched.",
    },
    {
      question: "What temperature should chicken be cooked to?",
      answer:
        "165°F (74°C) for chicken pieces and ground chicken, according to both USDA and Health Canada. For a whole bird, Health Canada recommends 82°C (180°F), while USDA uses 165°F (74°C). Measure in the thickest part, away from the bone.",
    },
    {
      question: "Why does my chili taste bland even though I followed the recipe?",
      answer:
        "Usually it needs more salt, more reduction or some acid. Taste it after it has simmered for a while, add salt in small amounts, and simmer it uncovered if it's thin, because a big pot reduces slowly. If it still tastes flat, a squeeze of lime or a splash of vinegar usually fixes it.",
    },
    {
      question: "Do I really need to rest meat after cooking?",
      answer:
        "For steaks, chops and roasts, yes. The temperature evens out as the meat rests, and less juice runs out when you slice it. About 5 minutes for steaks and chops and 10 to 20 minutes for roasts is enough. Chicken pieces, ground meat and dishes in sauce don't need it.",
    },
  ],
  relatedArticleSlugs: [
    "rookie-firefighter-meal-guide",
    "cooking-for-10-firefighters",
    "station-kitchen-essentials",
    "feeding-a-firehall-crew",
    "best-station-chili-recipes",
  ],
  sources: [SRC.usdaTemps, SRC.hcTemps, SRC.usdaWashing, SRC.usdaLeftovers],
});

const pastaForACrowd = buildSeoGuide({
  slug: "easy-firehall-pasta-recipes",
  title: "Pasta for a Crowd: How Much to Cook and How to Keep It From Going Soft",
  seoTitle: "How Much Pasta for 8 or 10 People (and How to Hold It)",
  subtitle:
    "Quantities and sauce for 4 to 12, how to cook several pounds at once, and how to handle pasta when dinner might have to wait.",
  description:
    "How much dry pasta and sauce to cook for 4 to 12 people, how to boil several pounds at once, and how to hold pasta for a crew so it doesn't go mushy.",
  topic: "meal_planning",
  pillar: "recipes_meals",
  readMinutes: 8,
  updatedAt: UPDATED,
  keywords: [
    "how much pasta for 8 people",
    "how much pasta for 10 people",
    "pasta for a crowd",
    "firehouse pasta recipes",
    "keeping pasta warm",
  ],
  intro:
    "Plan on 4 oz (115 g) of dry pasta per hungry adult when pasta is the main dish: 2 lb for 8 people, 2 1/2 lb for 10 and 3 lb for 12. The 2 oz serving on the box is a side portion. For sauce, start with one 24 oz (680 ml) jar, or about 3 cups of homemade sauce, per pound of pasta. What goes wrong for a crowd is usually timing rather than quantity: pasta keeps absorbing liquid after it is drained, so a pot that is perfect when it comes off the stove is soft 45 minutes later.",
  sections: [
    {
      id: "quantities",
      heading: "How much pasta and sauce for 4 to 12 people",
      paragraphs: [
        "Use the main-dish column when pasta is the meal and the side column when it sits next to a protein. Thick sauces with meat, such as Bolognese, stretch a little further than thin tomato sauces; creamy sauces go further still because they are richer.",
      ],
      table: {
        caption: "Dry pasta, sauce and pot size by crew size",
        columns: ["Crew", "Pasta as main", "Pasta as side", "Sauce", "Pot"],
        rows: [
          ["4", "1 lb (450 g)", "1/2 lb (225 g)", "3 cups (1 jar)", "6 qt, about 4 qt of water"],
          ["6", "1 1/2 lb (680 g)", "3/4 lb (340 g)", "4 1/2 cups", "8 qt"],
          ["8", "2 lb (900 g)", "1 lb (450 g)", "6 cups", "12 qt, or two pots"],
          ["10", "2 1/2 lb (1.1 kg)", "1 1/4 lb (570 g)", "7 1/2 cups", "16 qt, or two pots"],
          ["12", "3 lb (1.4 kg)", "1 1/2 lb (680 g)", "9 cups", "16 to 20 qt, or two pots"],
        ],
      },
    },
    {
      id: "big-batch",
      heading: "Cooking several pounds at once",
      paragraphs: [
        "The traditional ratio is about 4 quarts of water per pound of pasta, which gets unwieldy past 2 lb. You can use less water if you stir often in the first two minutes, when the surface starch is sticky and the pieces clump. Two pots on two burners are often faster than one giant pot, because a very large volume of water takes a long time to boil on a home-style range.",
      ],
      steps: [
        "Start the water first, covered, because it takes longer to boil than anything else in the meal.",
        "Salt the water once it boils so it tastes noticeably seasoned; this is the only chance to season the pasta itself.",
        "Add the pasta gradually and stir well for the first two minutes to stop it sticking.",
        "Start timing when the water returns to a boil, and taste a piece a minute or two before the package time.",
        "Scoop out 2 cups of cooking water before draining; its starch helps the sauce cling and loosens pasta that has tightened up.",
        "Skip the oil in the cooking water. It doesn't stop sticking, and it coats the pasta so the sauce slides off.",
      ],
    },
    {
      id: "holding",
      heading: "Holding pasta when dinner might be delayed",
      paragraphs: [
        "Keep the pasta and sauce apart until the crew is ready to eat, because sauced pasta keeps soaking up liquid and goes soft. Drain the pasta about two minutes short of al dente, toss it with a spoonful of oil, and spread it on a sheet pan so it stops cooking. Keep the sauce hot in its own pot.",
        "To serve, drop the pasta into boiling water for 30 to 60 seconds, or toss it in the simmering sauce with a splash of the reserved cooking water. If it won't be eaten within two hours, refrigerate it.",
      ],
    },
    {
      id: "baked-pasta",
      heading: "Baked pasta is the interruption-proof version",
      paragraphs: [
        "Baked ziti, lasagna and pasta bakes can be assembled hours ahead, refrigerated, and baked when the crew is close to eating. Undercook the pasta by 2 to 3 minutes before it goes in the dish, because it keeps absorbing sauce in the oven, and use a little more sauce than seems necessary for the same reason. A dish going straight from the fridge into the oven often needs an hour or more; bake it covered and check that the center reaches 165°F (74°C) before serving.",
        "Short, sturdy shapes with ridges or tubes, such as rigatoni, penne and ziti, hold sauce and survive holding and baking. Thin long pasta like angel hair goes soft fastest and is the worst choice when dinner might wait.",
      ],
    },
  ],
  practicalAdvice: [
    "Plan 4 oz (115 g) of dry pasta per person as a main and about 3 cups of sauce per pound.",
    "Use two pots for more than 2 lb, and stir hard in the first two minutes.",
    "If dinner might be delayed, drain the pasta two minutes early and keep it separate from the sauce.",
    "Choose baked pasta on busy nights; undercook the pasta by 2 to 3 minutes before baking.",
  ],
  mealRecommendations: [
    meal("baked-ziti", "Baked Ziti", "The standard crew pasta: assemble early, bake late, and it holds covered if the crew gets called."),
    meal("batch-lasagna", "Batch Lasagna", "Built ahead and baked on schedule; slices cleanly once it rests."),
    meal("five-ingredient-pasta", "Five-Ingredient Pasta", "A fast weeknight pasta for the nights when the crew is actually sitting down on time."),
    meal("skillet-chicken-alfredo", "Skillet Chicken Alfredo", "Keep the sauce and pasta separate until serving so the cream sauce doesn't tighten."),
    meal("chicken-parm", "Chicken Parmesan", "Serve the chicken over pasta cooked at the last minute for the best texture."),
    meal("30-minute-pasta-e-fagioli-for-the-hall", "Pasta e Fagioli", "A pasta soup that holds; cook the pasta separately if the pot will sit."),
    meal("spaghetti-aglio-e-olio-for-the-hall", "Spaghetti Aglio e Olio", "Pantry pasta for a quiet night; it doesn't hold, so cook it to order."),
    meal("beef-stroganoff", "Beef Stroganoff", "Egg noodles cooked separately and sauced at the table stay intact."),
  ],
  faqs: [
    {
      question: "How much pasta do I need for 10 adults?",
      answer:
        "2 1/2 lb (1.1 kg) of dry pasta if it is the main dish, or about 1 1/4 lb (570 g) as a side. Budget about 7 1/2 cups of sauce for the main-dish amount.",
    },
    {
      question: "How much sauce do I need for 3 lb of pasta?",
      answer:
        "About 9 cups (2.1 L), or three 24 oz (680 ml) jars. Add a little more if the pasta is going to be baked or held, since it keeps absorbing sauce.",
    },
    {
      question: "Should I rinse pasta after cooking?",
      answer:
        "Not for hot dishes. Rinsing washes off the surface starch that helps sauce cling. The exception is cold pasta salad, where rinsing stops the cooking and keeps the pasta from clumping as it cools.",
    },
    {
      question: "Can I cook pasta ahead of time for a crowd?",
      answer:
        "Yes. Cook it about two minutes short, drain it, toss it with a little oil and spread it out to cool, then refrigerate it if it won't be used within two hours. Reheat it in boiling water for 30 to 60 seconds or in hot sauce.",
    },
  ],
  relatedArticleSlugs: ["cooking-for-10-firefighters", "feeding-a-firehall-crew", "one-pot-firehall-meals"],
  sources: [SRC.usdaTemps, SRC.usdaLeftovers],
});

const slowCooker = buildSeoGuide({
  slug: "best-firefighter-crockpot-meals",
  title: "Slow Cooker Meals for a Firehouse Crew: What Works and How to Do It Safely",
  seoTitle: "Slow Cooker Meals for a Crowd: Sizes, Timing and Safety",
  subtitle:
    "Which cuts and dishes suit a slow cooker, how big a cooker a crew needs, and the food-safety rules that matter when nobody is watching the pot.",
  description:
    "Slow cooker meals for a crowd: the best cuts, cooker sizes for 6 to 12, cooking times, and the safety rules for thawing, beans and leftovers.",
  topic: "meal_planning",
  pillar: "recipes_meals",
  readMinutes: 8,
  updatedAt: UPDATED,
  keywords: [
    "slow cooker meals for a crowd",
    "firefighter crockpot meals",
    "crockpot crew dinner",
    "slow cooker safety",
    "slow cooker pulled pork",
  ],
  intro:
    "The best slow cooker meals for a crowd use tough, collagen-rich cuts (pork shoulder, beef chuck, chicken thighs) or chili, soup and stew, cooked in a 7 to 8 qt (6.6 to 7.6 L) cooker for 10 to 12 people. USDA notes that food stays safe as long as the cooker is running, so a covered pot rides out a call better than almost anything else. The usual failures are lean chicken breast drying out on a long cook and frozen meat going in without being thawed.",
  sections: [
    {
      id: "size",
      heading: "Size the cooker to the crew",
      paragraphs: [
        "A 6 qt (5.7 L) cooker handles about 6 to 8 servings of stew, chili or pulled meat; a 7 to 8 qt (6.6 to 7.6 L) cooker handles 10 to 12. For more than that, run two cookers rather than overfilling one. Check the manual for the minimum and maximum fill: too little food cooks fast and can scorch, and an overfilled cooker takes longer to come up to a safe temperature.",
      ],
    },
    {
      id: "what-works",
      heading: "Cuts and dishes that work",
      paragraphs: [
        "Low, moist heat over several hours breaks down connective tissue into gelatin, which is what makes shoulder and chuck tender and juicy. Lean cuts have little connective tissue to break down, so a long cook only dries them out. Cooking times vary a lot between cookers, so treat these as starting points and check doneness with a thermometer or a fork.",
      ],
      table: {
        caption: "Typical slow cooker times (your cooker's manual takes priority)",
        columns: ["Cut or dish", "Low", "High", "Notes"],
        rows: [
          ["Pork shoulder, 4 to 5 lb", "8 to 10 hours", "5 to 6 hours", "Done when it shreds easily; ideal for pulled pork"],
          ["Beef chuck roast, 3 to 4 lb", "8 to 9 hours", "5 to 6 hours", "Pot roast or shredded beef"],
          ["Chicken thighs", "4 to 6 hours", "2 1/2 to 3 hours", "Stay moist; shred for tacos or bowls"],
          ["Chicken breasts", "3 to 4 hours", "About 2 hours", "Dry out if left longer; thighs are more forgiving"],
          ["Chili with browned ground beef", "6 to 8 hours", "3 to 4 hours", "Brown the meat first for better flavor"],
        ],
      },
    },
    {
      id: "safety",
      heading: "The rules that keep it safe",
      paragraphs: [
        "A slow cooker is safe because the direct heat, long cooking time and steam inside the covered pot together destroy bacteria. The rules below, mostly from USDA guidance, make sure the food actually gets hot enough, fast enough.",
      ],
      steps: [
        "Thaw meat and poultry before it goes in. Frozen meat keeps the pot too cold for too long.",
        "Keep prepped ingredients refrigerated, separately, until you start the cooker.",
        "Put vegetables in first, under the meat; they cook more slowly.",
        "If you can, run it on high for the first hour, then switch to low.",
        "Keep the lid on except to stir or check doneness.",
        "Don't reheat leftovers in the slow cooker. Reheat them on the stove, in the microwave or in the oven to 165°F (74°C), then hold them in a preheated cooker at 140°F (60°C) or above.",
        "If the power goes out while nobody is there, throw the food away even if it looks done.",
      ],
    },
    {
      id: "beans",
      heading: "A warning about dried red kidney beans",
      paragraphs: [
        "Dried red kidney beans contain a natural toxin, phytohemagglutinin, that boiling destroys but the lower temperatures in a slow cooker do not. FDA guidance, summarized by Kansas State University extension, is to soak dried kidney beans for at least five hours, drain them, and boil them hard in fresh water for at least 10 minutes (30 minutes to be sure) before they go into a slow cooker. Canned kidney beans are already cooked and can go straight into the pot.",
      ],
    },
    {
      id: "better-flavor",
      heading: "Getting better flavor out of a slow cooker",
      paragraphs: [
        "Brown the meat in a skillet before it goes in when you have ten minutes; the browned surface adds a depth of flavor that slow, moist cooking can't create on its own. Use less liquid than a stovetop recipe calls for, because the lid traps moisture and very little evaporates. Too much liquid gives you a watery sauce.",
        "Add dairy, fresh herbs and delicate vegetables like peas or spinach in the last 30 minutes; dairy can curdle and greens turn drab over a long cook. If the sauce is thin at the end, stir in a cornstarch slurry and cook on high with the lid off for 15 to 30 minutes, or reduce the liquid in a pan on the stove. A splash of vinegar or citrus just before serving sharpens flavors that have gone soft over hours of cooking.",
      ],
    },
  ],
  practicalAdvice: [
    "Use a 7 to 8 qt cooker for 10 to 12 people, or two smaller ones.",
    "Choose shoulder, chuck and thighs; lean breast dries out on a long cook.",
    "Always thaw meat first, and keep the lid on.",
    "Never put raw dried kidney beans straight into a slow cooker; boil them first or use canned.",
  ],
  mealRecommendations: [
    meal("pulled-pork", "Pulled Pork", "The model slow cooker dinner: pork shoulder, low heat, and it holds for hours."),
    meal("pork-carnitas-tacos", "Pork Carnitas Tacos", "Another pork shoulder dinner that adapts well to low, slow cooking; crisp the meat in a pan before serving."),
    meal("big-chili", "Beef and Bean Chili", "Brown the beef on the stove, then let the slow cooker hold it for late eaters. Canned beans need no pre-boiling."),
    meal("turkey-chili", "Turkey Chili", "A lighter chili that works on low all afternoon."),
    meal("beef-barley-soup", "Beef Barley Soup", "Chuck and barley both suit a long, gentle cook."),
    meal("chicken-dumpling-soup", "Chicken and Dumpling Soup", "Cook the soup base low and slow, and add the dumplings in the last stretch on high."),
  ],
  faqs: [
    {
      question: "Can I put frozen chicken in a slow cooker?",
      answer:
        "No. USDA advises thawing meat and poultry before putting it in a slow cooker, because frozen meat keeps the food in the unsafe temperature range for too long while the cooker heats up. Thaw it in the fridge overnight or in cold water first.",
    },
    {
      question: "How long can food stay on the warm setting?",
      answer:
        "USDA says food stays safe as long as the cooker is operating and keeping it hot, at 140°F (60°C) or above. Quality is a different matter: meat keeps softening and sauces thicken, so a couple of hours on warm is fine but a whole evening will make most dishes mushy.",
    },
    {
      question: "Why is my slow cooker chicken dry?",
      answer:
        "It is usually chicken breast cooked too long. Breast has little fat or connective tissue and dries out after 3 to 4 hours on low. Use thighs for long cooks, or check breasts with a thermometer and take them out at 165°F (74°C).",
    },
    {
      question: "Do I have to brown meat before slow cooking?",
      answer:
        "No, it is safe either way. Browning adds flavor, because the browned surface develops savory compounds that moist heat can't produce, so do it when you have ten minutes. Brown in batches so the meat sears instead of steaming.",
    },
  ],
  relatedArticleSlugs: [
    "feeding-a-firehall-crew",
    "one-pot-firehall-meals",
    "best-station-chili-recipes",
    "firehall-meal-prep-ideas",
  ],
  sources: [SRC.usdaSlowCooker, SRC.kidneyBeans, SRC.usdaTemps],
});

const mealPrepStorage = buildSeoGuide({
  slug: "firehall-meal-prep-ideas",
  title: "Firehouse Meal Prep: Cook Ahead, Store Safely, Reheat Without Ruining It",
  seoTitle: "Meal Prep for a Crew: Storing and Reheating Safely",
  subtitle:
    "What to prep ahead, how to cool a big batch quickly, how long leftovers keep, and the best way to reheat each kind of food.",
  description:
    "Firehouse meal prep: what to cook ahead, how to cool big batches, how long leftovers keep, and how to reheat each food without ruining it.",
  topic: "meal_planning",
  pillar: "operations_how_to",
  readMinutes: 9,
  updatedAt: UPDATED,
  keywords: [
    "firehouse meal prep",
    "meal prep for a crew",
    "how long do leftovers last",
    "reheating leftovers",
    "cooling food quickly",
  ],
  intro:
    "Firehouse meal prep works best when you cook components ahead (chili, sauces, grains, an assembled baked pasta), get them into shallow containers in the fridge within two hours, and reheat each one in the way that suits it. The two things that go wrong are a full stockpot cooling too slowly and leftovers nobody can date. In a fridge shared by rotating shifts, the label matters as much as the cooking.",
  sections: [
    {
      id: "what-to-prep",
      heading: "What to prep ahead, and what not to",
      paragraphs: [
        "The best prep-ahead items either hold their texture in the fridge or improve as they sit. Chili, soups, stews, braises and cooked grains all reheat well. Sauces, marinades and chopped aromatics like onions and peppers save a lot of time at the start of a busy dinner. Baked pastas and casseroles can be assembled and refrigerated unbaked, then baked when the crew is ready.",
        "Skip anything that depends on being crisp or freshly dressed. Fried food, dressed salads, pasta already mixed with its sauce, and cut avocado or apple all degrade quickly in the fridge. Prep the parts separately, such as the washed greens, the dressing and the croutons, and combine them at serving time.",
      ],
    },
    {
      id: "cooling",
      heading: "Cooling a big batch quickly",
      paragraphs: [
        "A full stockpot of chili cools very slowly because the center is insulated by everything around it, and that slow cooling keeps food in the temperature range where bacteria grow. Commercial kitchens follow the FDA Food Code's two-stage rule: from 135°F to 70°F (57 to 21°C) within 2 hours, and down to 41°F (5°C) within 6 hours in total. At a station, the practical guidance from USDA and Health Canada is to get cooked food into the fridge within two hours, in shallow containers.",
      ],
      steps: [
        "Divide the batch into shallow containers, ideally no more than 2 in (5 cm) deep. Metal pans cool faster than plastic.",
        "For a large pot, stir it in a sink of ice water for a few minutes first to take the heat off quickly.",
        "Refrigerate with the lid off or loosely covered until the food is cold, then seal it.",
        "Leave space around the containers; an overstuffed fridge can't circulate cold air.",
        "Label each container with what it is and the date it was cooked.",
      ],
    },
    {
      id: "how-long",
      heading: "How long cooked food keeps",
      paragraphs: [
        "USDA and Health Canada give slightly different fridge times for leftovers, so the table shows both. At a station where shifts rotate and the next crew may not know when something was cooked, the shorter window is the easier rule to follow. Freezing keeps food safe indefinitely, but quality drops after a few months.",
      ],
      table: {
        caption: "Storage guidance for cooked leftovers",
        columns: ["Guideline", "USDA", "Health Canada"],
        rows: [
          ["Fridge temperature", "40°F (4°C) or below", "4°C (40°F) or below"],
          ["Freezer temperature", "0°F (-18°C)", "-18°C (0°F) or below"],
          ["Cooked leftovers in the fridge", "3 to 4 days", "2 to 3 days (2 to 4 days for poultry)"],
          ["Frozen leftovers, best quality", "3 to 4 months", "Freeze promptly if not eaten in time"],
          ["Maximum time at room temperature", "2 hours (1 hour above 90°F)", "2 hours"],
        ],
      },
    },
    {
      id: "reheating",
      heading: "Reheating each type of food",
      paragraphs: [
        "Leftovers should be reheated to 165°F (74°C), and soups, sauces and gravies should be brought to a rolling boil. Health Canada also advises reheating leftovers only once, so heat what the crew will actually eat rather than the whole container. Within those rules, the method makes a big difference to texture.",
      ],
      table: {
        caption: "Best reheating method by food",
        columns: ["Food", "Best method", "Why"],
        rows: [
          ["Chili, soup, stew, sauces", "Stovetop, brought to a rolling boil, stirring", "Add a splash of water; starches thicken them in the fridge"],
          ["Baked pasta, casseroles", "Covered in a 350°F (175°C) oven with a splash of liquid", "Covering keeps moisture in; uncover for the last 10 minutes to recrisp the top"],
          ["Rice", "Microwave, covered, with 1 to 2 tbsp water per cup", "The added water steams it back to soft"],
          ["Fried or breaded food", "400°F (200°C) oven or air fryer, on a rack", "Dry heat recrisps; the microwave makes crusts soggy"],
          ["Roast chicken, pulled pork", "Covered in the oven with a little broth, or in sauce on the stove", "Liquid stops the meat drying out as it heats through"],
          ["Steak, chops", "Serve cold in salads or sandwiches", "Reheating fully will take them well past their original doneness"],
        ],
      },
      tips: [
        "Microwaves heat unevenly: cover the dish, stir or rotate halfway, let it stand, and check the temperature in several places.",
        "Reheat frozen soups, stews and casseroles straight from frozen if you are short on time; it is safe, it just takes longer.",
      ],
    },
  ],
  practicalAdvice: [
    "Prep components (sauces, grains, chopped aromatics, assembled casseroles), not dressed or crisp food.",
    "Cool big batches in shallow containers no more than 2 in (5 cm) deep and refrigerate within two hours.",
    "Label everything with the contents and the date, and use leftovers within 2 to 3 days.",
    "Reheat to 165°F (74°C), only once, using the method that suits the food.",
  ],
  mealRecommendations: [
    meal("turkey-chili", "Turkey Chili", "Cools well in shallow pans and reheats to a boil without losing texture."),
    meal("sheet-pan-meal-prep", "Sheet-Pan Meal Prep", "Protein and vegetables roasted together and portioned for the next few meals."),
    meal("pulled-pork", "Pulled Pork", "Store it with its juices so it reheats moist."),
    meal("big-chili", "Beef and Bean Chili", "A big batch that freezes well in 1 quart containers."),
    meal("beef-barley-soup", "Beef Barley Soup", "Thickens overnight; loosen with water when you reheat."),
    meal("baked-ziti", "Baked Ziti", "Assemble unbaked and refrigerate, then bake on the shift you need it."),
  ],
  faqs: [
    {
      question: "How long do leftovers last in the station fridge?",
      answer:
        "Health Canada recommends eating refrigerated leftovers within 2 to 3 days (2 to 4 for poultry); USDA says 3 to 4 days. With shifts rotating through the same fridge, labeling everything with the date and using the shorter window is the simplest rule.",
    },
    {
      question: "Can I put hot food straight into the fridge?",
      answer:
        "Yes. USDA says hot food can go directly into the fridge, and Health Canada suggests letting very hot food stop steaming first. What matters is dividing it into shallow containers and not putting a whole stockpot in, because a big pot cools too slowly and warms everything around it.",
    },
    {
      question: "Can you reheat leftovers more than once?",
      answer:
        "Health Canada advises against reheating the same leftovers more than once. Take out and reheat only the portion that will be eaten, and leave the rest in the fridge.",
    },
    {
      question: "How do you cool a big pot of chili quickly?",
      answer:
        "Stir the pot in a sink of ice water for a few minutes, then divide the chili into shallow containers no more than 2 in (5 cm) deep and refrigerate them uncovered or loosely covered until cold. The goal is to get it below 40°F (4°C) as quickly as possible.",
    },
  ],
  relatedArticleSlugs: [
    "best-meals-24-hour-shift",
    "best-station-chili-recipes",
    "feeding-a-firehall-crew",
    "best-firefighter-crockpot-meals",
  ],
  sources: [SRC.usdaLeftovers, SRC.hcLeftovers, SRC.hcHome, SRC.hcPoultry, SRC.foodCodeCooling],
});

const breakfastForACrowd = buildSeoGuide({
  slug: "firefighter-breakfast-guide",
  title: "Firehouse Breakfast for a Crowd: Eggs, Bacon, and Pancakes for 8 to 12",
  seoTitle: "Breakfast for a Crowd: Eggs, Bacon and Pancakes for 12",
  subtitle:
    "Quantities for 8 and 12, oven bacon, eggs that hold, make-ahead bakes, and how to time a crew breakfast around shift change.",
  description:
    "Breakfast for a crowd of 8 to 12: egg and bacon quantities, oven bacon, eggs that hold, overnight egg bakes, and pancakes that don't go soggy.",
  topic: "station_cooking",
  pillar: "recipes_meals",
  readMinutes: 9,
  updatedAt: UPDATED,
  keywords: [
    "breakfast for a crowd",
    "firefighter breakfast",
    "fire station breakfast",
    "breakfast burrito bar for a crowd",
    "how many eggs for 12 people",
    "bacon in the oven for a crowd",
  ],
  intro:
    "Breakfast for a crowd of 12 takes 2 to 3 dozen eggs, about 36 slices of bacon (2 1/2 to 3 lb) or sausage links, and potatoes or bread on the side. Getting it all hot at once means moving work off the stovetop: bacon on sheet pans in the oven, eggs baked in a pan or scrambled at the last minute, and an egg bake or French toast casserole assembled the night before. What goes wrong is scrambled eggs held too long and pancakes stacked until they go soggy.",
  sections: [
    {
      id: "quantities",
      heading: "How much to make for 8 and 12",
      paragraphs: [
        "These amounts assume a full breakfast with two or three components. If eggs are the only protein, stay at the top of the egg range; if there is bacon, sausage and potatoes, the low end is plenty.",
      ],
      table: {
        caption: "Breakfast quantities for a hungry crew",
        columns: ["Item", "Per person", "For 8", "For 12"],
        rows: [
          ["Eggs, scrambled or baked", "2 to 3", "16 to 24", "24 to 36"],
          ["Bacon", "3 slices", "24 slices (about 1 1/2 to 2 lb)", "36 slices (about 2 1/2 to 3 lb)"],
          ["Sausage links", "2 to 3", "16 to 24", "24 to 36"],
          ["Pancakes, 4 in (10 cm)", "3", "24", "36"],
          ["Hash browns or potatoes", "1/3 lb (150 g)", "2 3/4 lb", "4 lb"],
          ["Toast, muffins or biscuits", "2", "16", "24"],
        ],
      },
    },
    {
      id: "oven-bacon",
      heading: "Cook bacon in the oven, not in a skillet",
      paragraphs: [
        "Pan-frying 36 slices means six or seven batches and a stovetop covered in grease. In the oven, four sheet pans cook the whole lot at once, and the bacon cooks more evenly because it lies flat. Line the pans with foil, lay the slices close together without overlapping, and cook at 400°F (200°C) for 15 to 20 minutes for regular bacon, longer for thick-cut. There's no need to flip it.",
        "Swap the pans between racks halfway, because most ovens run hotter in some spots. For crisper bacon, set a wire rack in each pan. Pour the cooled fat into a can for the trash rather than down the sink.",
      ],
    },
    {
      id: "eggs",
      heading: "Eggs that hold, and eggs that don't",
      paragraphs: [
        "Scrambled eggs are best in the first few minutes. As they sit, the proteins keep tightening and squeeze out water, which is why a hotel pan of scrambled eggs turns rubbery with a puddle underneath. If the crew eats together, scramble in batches over medium-low heat and pull them while they still look slightly wet, since they finish cooking on the way to the table.",
        "If people will be eating over an hour, bake the eggs instead. Whisk 18 to 24 eggs with a splash of milk and seasoning, pour them into a greased half sheet pan, and bake at 350°F (175°C) until the center is just set. Cut them into squares for breakfast sandwiches or burritos. They hold and reheat far better than scrambled eggs. For egg bakes and casseroles, USDA's safe temperature is 160°F (71°C) and Health Canada's is 74°C (165°F).",
      ],
    },
    {
      id: "make-ahead",
      heading: "Make-ahead bakes for shift change",
      paragraphs: [
        "An egg bake or French toast casserole assembled the evening before is the easiest way to serve a hot breakfast at shift change. The bread soaks up the custard overnight, which is what gives French toast casserole its texture. In the morning, put the dish in the oven straight from the fridge. A cold dish takes longer than the recipe's time, so bake it covered for most of the time, uncover it to brown, and check that the center has reached a safe temperature rather than relying on the clock.",
      ],
    },
    {
      id: "pancakes",
      heading: "Pancakes for a crowd without a queue",
      paragraphs: [
        "Mix the batter just until the flour disappears; a few lumps are fine. Overmixing develops gluten, which makes pancakes tough and flat. A large griddle at about 375°F (190°C) cooks eight or more at a time. As each batch finishes, move it to a wire rack in a 200°F (95°C) oven in a single layer. Stacking pancakes traps steam and turns them soggy; a rack lets the steam escape.",
      ],
    },
    {
      id: "hash-browns",
      heading: "Hash browns that actually crisp",
      paragraphs: [
        "Wet potatoes steam instead of browning. Squeeze freshly shredded potatoes hard in a clean towel to get the water out, then spread them in a thin layer in a hot, well-oiled pan and leave them alone for several minutes before turning. For a crew, spread frozen or squeezed shredded potatoes on oiled sheet pans and roast them at 425°F (220°C), which frees up the griddle for eggs and pancakes.",
      ],
    },
    {
      id: "burrito-line",
      heading: "A breakfast burrito line for people eating at different times",
      paragraphs: [
        "When the crew will drift in over an hour or more, a burrito line beats any plated breakfast. Every filling can be cooked in the oven and held: baked eggs cut into strips, sausage or bacon from the sheet pans, and roasted potatoes. Put them out in shallow pans with cheese, salsa and hot sauce, and warm large 10 to 12 in (25 to 30 cm) flour tortillas just before the line opens. Wrapped in a clean towel inside a covered dish or a small cooler, warm tortillas stay soft for about an hour; cold ones crack when they are folded.",
        "Burritos can also be rolled ahead. Wrap each one tightly in foil and hold them in a 200°F (95°C) oven for up to about an hour, or chill them and reheat to 165°F (74°C) for the next morning. Leave salsa and sour cream out of any burrito you plan to hold, because they make the tortilla soggy.",
        "Breakfast usually overlaps with the shift change, so clear up before the next crew needs the kitchen. Soak sheet pans as soon as they are empty, scrape the griddle while it is still warm, and put leftover fillings in shallow, labeled containers in the fridge within two hours.",
      ],
    },
    {
      id: "timing",
      heading: "Timing breakfast around shift change",
      paragraphs: ["Work backward from when the crew sits down, and keep the stovetop for the last 15 minutes."],
      steps: [
        "The night before: assemble any egg bake or French toast casserole, and mix the dry ingredients for pancakes.",
        "About an hour out: preheat the oven and put in the make-ahead bake.",
        "About 30 minutes out: bacon and sheet-pan potatoes go in the oven.",
        "About 15 minutes out: start pancakes on the griddle, holding them on a rack in the low oven.",
        "Last 5 minutes: scramble eggs if you are making them, so they go to the table straight from the pan.",
      ],
    },
  ],
  practicalAdvice: [
    "Plan 2 to 3 eggs and 3 slices of bacon per person.",
    "Cook bacon on sheet pans at 400°F (200°C) and swap the pans halfway.",
    "Bake eggs in a sheet pan if the crew will eat over an hour; scrambled eggs don't hold.",
    "Hold pancakes on a wire rack in a 200°F (95°C) oven, never stacked.",
  ],
  mealRecommendations: [
    meal("sausage-egg-bake", "Sausage Egg Bake", "Assemble the night before and bake at shift change."),
    meal("overnight-french-toast-bake", "Overnight French Toast Bake", "Soaks overnight; one dish feeds a table.", "breakfast"),
    meal("hall-breakfast-burritos", "Hall Breakfast Burritos", "Sheet-pan eggs, potatoes and sausage on a line; burritos can be wrapped and held.", "breakfast"),
    meal("buttermilk-pancakes", "Buttermilk Pancakes for the Crew", "Use the rack-in-the-oven method to feed everyone at once.", "breakfast"),
    meal("sheet-pan-eggs-sausage-crew", "Sheet-Pan Eggs and Sausage", "The baked-egg method from this guide, with sausage on the same pan.", "breakfast"),
    meal("hash-brown-breakfast-casserole", "Hash Brown Breakfast Casserole", "Assemble the night before; the potatoes crisp on top as it bakes.", "breakfast"),
    meal("cast-iron-breakfast-skillet", "Cast Iron Breakfast Skillet", "A one-pan breakfast for a smaller crew.", "breakfast"),
    meal("hall-sausage-biscuits-gravy", "Sausage Biscuits and Gravy", "The gravy holds on low heat; bake the biscuits right before serving.", "breakfast"),
    meal("chorizo-breakfast-hash", "Chorizo Breakfast Hash", "Chorizo and potatoes on a sheet pan or in a big skillet; scales by the pound.", "breakfast"),
  ],
  faqs: [
    {
      question: "How many eggs do I need for 12 people?",
      answer:
        "24 to 36 eggs, or 2 to 3 per person. Use the lower number if you are also serving bacon or sausage and potatoes, and the higher number if eggs are the main protein.",
    },
    {
      question: "How do you keep scrambled eggs warm for a crowd?",
      answer:
        "They don't hold well; after 15 to 20 minutes they turn rubbery and watery. Pull them from the heat while slightly underdone and keep them covered in a low oven only briefly. If the crew will eat over a longer stretch, bake the eggs in a sheet pan instead, which holds and reheats much better.",
    },
    {
      question: "Can I make a breakfast casserole the night before?",
      answer:
        "Yes, and it is usually better for it, because the bread has time to soak up the eggs. Refrigerate it covered, then bake it straight from the fridge, allowing extra time. Check the center with a thermometer: 160°F (71°C) by USDA guidance, or 74°C (165°F) by Health Canada's.",
    },
    {
      question: "What's the best way to cook bacon for a crowd?",
      answer:
        "On foil-lined sheet pans in a 400°F (200°C) oven for about 15 to 20 minutes, without flipping. Swap the pans between racks halfway for even cooking, and use a wire rack in the pan if you like it extra crisp.",
    },
  ],
  relatedArticleSlugs: ["best-meals-24-hour-shift", "healthy-smoothies-at-the-hall", "cooking-for-10-firefighters"],
  sources: [SRC.usdaTemps, SRC.hcTemps, SRC.usdaLeftovers],
});

const chiliForACrowd = buildSeoGuide({
  slug: "best-station-chili-recipes",
  title: "Chili for a Crowd: How to Make, Hold, and Cool a Big Batch",
  seoTitle: "Chili for a Crowd: Quantities, Method and Safe Cooling",
  subtitle:
    "Quantities for 6 to 12, how to brown and season a big pot properly, how to hold it on a busy night, and how to cool the leftovers safely.",
  description:
    "How to make chili for a crowd: quantities for 6 to 12 people, browning and seasoning a big pot, holding it hot, and cooling and storing leftovers safely.",
  topic: "meal_planning",
  pillar: "recipes_meals",
  readMinutes: 8,
  updatedAt: UPDATED,
  keywords: [
    "chili for a crowd",
    "how much chili for 10 people",
    "station chili recipes",
    "firehouse chili",
    "big batch chili",
  ],
  intro:
    "Chili for a crowd of 10 takes about 3 1/2 lb (1.6 kg) of ground beef, four cans of beans and two large cans of crushed tomatoes. That makes about 5 quarts (4.7 L), a generous bowl each with room for seconds. Chili holds for hours on low heat and reheats well, which is why it suits a station. Big batches go wrong in four places: meat that steams grey instead of browning, seasoning that's hard to judge, a scorched bottom, and a full pot that takes too long to cool.",
  sections: [
    {
      id: "quantities",
      heading: "How much chili for 6 to 12 people",
      paragraphs: [
        "Plan about 1 1/2 cups (350 ml) of chili per serving, plus extra if the crew goes back for seconds. Use a pot that holds at least half as much again as the finished chili so you can stir without slopping it over: an 8 qt Dutch oven or stockpot for 10 people, and a 10 to 12 qt pot for 12.",
      ],
      table: {
        caption: "Chili quantities by crew size (beans in 15 to 19 oz / 425 to 540 ml cans, tomatoes in 28 oz / 796 ml cans)",
        columns: ["Crew", "Ground beef", "Cans of beans", "Cans of crushed tomatoes", "Onions", "Finished yield"],
        rows: [
          ["6", "2 lb (900 g)", "2", "1", "1 large", "About 3 qt"],
          ["8", "2 3/4 lb (1.2 kg)", "3", "2", "2", "About 4 1/2 qt"],
          ["10", "3 1/2 lb (1.6 kg)", "4", "2", "2", "About 5 qt"],
          ["12", "4 lb (1.8 kg)", "4", "3", "3", "About 6 1/2 qt"],
        ],
      },
    },
    {
      id: "method",
      heading: "Browning, blooming, and simmering a big pot",
      paragraphs: [
        "Brown the meat in batches of about 1 to 1 1/2 lb. Put all 3 1/2 lb in the pot at once and it releases more water than the pan can evaporate, so it turns grey and simmers instead of browning, and you lose the savory depth that makes chili taste like chili. Move each batch out as it browns, pour off most of the fat, and soften the onions in what is left.",
        "Add the chili powder, cumin and other dried spices to the hot fat for 30 to 60 seconds before the liquid goes in. Many of the flavor compounds in dried spices dissolve in fat, and a short time in hot oil makes them noticeably stronger and less dusty. Keep it moving so the spices don't scorch.",
        "Then add the meat back with the tomatoes and beans, and simmer uncovered for at least 45 minutes to an hour for ground beef, or 2 1/2 to 3 hours if you are using cubed chuck. A big pot needs longer than a small one to reduce and concentrate. Stir from the bottom every 10 to 15 minutes; thick chili scorches easily where it touches the base of the pot.",
      ],
    },
    {
      id: "seasoning",
      heading: "Seasoning a scaled-up pot",
      paragraphs: [
        "Salt and spice scale with the amount of food, but when you multiply a smaller recipe, start with about three-quarters of the chili powder, cayenne and salt. Canned tomatoes, beans, stock and chili powder blends all vary in salt and heat by brand, and both are easy to add but impossible to take out. Taste after 30 minutes of simmering and adjust.",
        "A big pot also reduces proportionally less than a small one, so a scaled chili can taste thin and flat even when the seasoning is right. Simmer it uncovered for longer before adding more spice. To thicken it faster, stir in a slurry of masa harina and water for the last 10 minutes, which also adds a light corn flavor. Finish with a squeeze of lime or a splash of vinegar; a little acid is often what a flat chili is missing.",
      ],
    },
    {
      id: "beans",
      heading: "Canned or dried beans",
      paragraphs: [
        "Canned beans are fully cooked and can go straight into the pot. If you use dried red kidney beans, soak them and boil them in fresh water first. Raw kidney beans contain a toxin that boiling destroys and lower temperatures don't, which matters most if the chili is going into a slow cooker.",
      ],
    },
    {
      id: "holding",
      heading: "Holding chili on a busy night",
      paragraphs: [
        "Chili holds for a couple of hours covered on the lowest heat or in a slow cooker on warm, as long as it stays at 140°F (60°C) or above. Stir it when you pass, and add a splash of water as it thickens. Keep the toppings (cheese, onions, sour cream) in the fridge until serving rather than sitting out beside the pot.",
      ],
    },
    {
      id: "cooling",
      heading: "Cooling and storing the leftovers",
      paragraphs: [
        "A full pot of chili is one of the slowest things in a kitchen to cool, because the center is insulated by everything around it. Don't put the pot in the fridge. Commercial kitchens follow the FDA Food Code, which requires cooked food to get from 135°F to 70°F (57 to 21°C) within 2 hours and to 41°F (5°C) within 6 hours in total; the home guidance from USDA and Health Canada is to refrigerate within two hours.",
      ],
      steps: [
        "Stir the pot in a sink of ice water for a few minutes to take the heat off.",
        "Divide the chili into shallow containers no more than 2 in (5 cm) deep.",
        "Refrigerate them uncovered or loosely covered until cold, then seal and label with the date.",
        "Eat within 2 to 3 days (Health Canada) or 3 to 4 days (USDA), or freeze in 1 quart containers or flat bags.",
        "Reheat to a rolling boil, stirring, before serving.",
      ],
    },
  ],
  practicalAdvice: [
    "For 10 people, use about 3 1/2 lb (1.6 kg) of ground beef in an 8 qt pot.",
    "Brown the meat in batches and bloom the spices in the fat before adding liquid.",
    "Start with three-quarters of the scaled spices and salt, then taste after 30 minutes.",
    "Cool leftovers in shallow containers, never in the pot, and refrigerate within two hours.",
  ],
  mealRecommendations: [
    meal("big-chili", "Beef and Bean Chili", "The classic crew pot, scaled for a full table."),
    meal("turkey-chili", "Turkey Chili", "A lighter version that still holds on low and freezes well."),
    meal("chili-mac", "Chili Mac", "Turns leftover chili into a second dinner with pasta and cheese."),
    meal("loaded-baked-potato-bar", "Baked Potato Bar", "Chili over baked potatoes stretches one pot across more people."),
    meal("loaded-potato-feed", "Loaded Potato Feed", "Another potato-based way to make a batch of chili go further."),
    meal("game-day-nachos", "Game Day Nachos", "A good use for the last quart of chili."),
  ],
  faqs: [
    {
      question: "How much chili do I need for 10 people?",
      answer:
        "About 5 quarts (4.7 L), which allows roughly 1 1/2 cups per person with room for seconds. That takes around 3 1/2 lb (1.6 kg) of ground beef, four 15 to 19 oz (425 to 540 ml) cans of beans, two 28 oz (796 ml) cans of crushed tomatoes and two onions.",
    },
    {
      question: "How do I thicken chili?",
      answer:
        "Simmer it uncovered longer so more liquid evaporates, or stir in a slurry of masa harina and water for the last 10 minutes. Mashing some of the beans against the side of the pot also thickens it.",
    },
    {
      question: "Why does my chili burn on the bottom?",
      answer:
        "Thick chili doesn't circulate much, so the layer touching the base of the pot sits over direct heat. Use a heavy-bottomed pot, keep the heat at a gentle simmer, and scrape the bottom every 10 to 15 minutes.",
    },
    {
      question: "How long does chili last in the fridge?",
      answer:
        "Health Canada recommends eating refrigerated leftovers within 2 to 3 days; USDA says 3 to 4 days. Frozen chili keeps its quality for about 3 to 4 months. Reheat it to a rolling boil.",
    },
  ],
  relatedArticleSlugs: [
    "firehall-meal-prep-ideas",
    "cooking-for-10-firefighters",
    "best-firefighter-crockpot-meals",
    "firehouse-comfort-meals",
  ],
  sources: [SRC.hcLeftovers, SRC.usdaLeftovers, SRC.foodCodeCooling, SRC.kidneyBeans],
});

const kitchenEquipment = buildSeoGuide({
  slug: "station-kitchen-essentials",
  title: "Station Kitchen Equipment: What You Need to Cook for 8 to 12",
  seoTitle: "Kitchen Equipment for Cooking for a Crowd (8 to 12)",
  subtitle:
    "The pans, pots and tools that matter when every meal feeds a crew, in the sizes that actually hold enough food.",
  description:
    "Kitchen equipment for cooking for a crowd of 8 to 12: pan and pot sizes, what each piece is for, and the one tool that matters most.",
  topic: "station_cooking",
  pillar: "operations_how_to",
  readMinutes: 7,
  updatedAt: UPDATED,
  keywords: [
    "kitchen equipment for cooking for a crowd",
    "fire station kitchen equipment",
    "station kitchen essentials",
    "what size dutch oven for 10 people",
    "sheet pans for a crowd",
  ],
  intro:
    "Cooking for a crew needs capacity more than gadgets. The short list is an instant-read thermometer, at least four half sheet pans with racks, a 7 to 9 qt Dutch oven, a 16 to 20 qt stockpot, two 12 in skillets, a couple of 9 x 13 in baking dishes, and plenty of shallow storage containers. With those, a station kitchen can handle almost any crew dinner without cooking in endless batches.",
  sections: [
    {
      id: "the-list",
      heading: "The essentials, in sizes that feed 8 to 12",
      paragraphs: [
        "Household equipment is sized for four people. The most common problem in a station kitchen is not a missing tool but a pan that is too small, which forces crowding and batch cooking. Buy fewer, larger, heavier pieces.",
      ],
      table: {
        caption: "Core equipment for a crew kitchen",
        columns: ["Item", "Size", "What it's for"],
        rows: [
          ["Instant-read thermometer", "Digital probe", "Checking doneness, reheating and hot-holding temperatures"],
          ["Half sheet pans, with wire racks", "18 x 13 in (46 x 33 cm), at least 4", "Roasting, oven bacon, sheet-pan dinners, holding fried food crisp"],
          ["Dutch oven", "7 to 9 qt (6.6 to 8.5 L)", "Chili, braises, soups; goes from stovetop to oven"],
          ["Stockpot, heavy base", "16 to 20 qt (15 to 19 L)", "Pasta for 10 to 12, big soups, blanching vegetables"],
          ["Skillets, cast iron or stainless", "Two at 12 in (30 cm)", "Searing and browning; two pans halve the batch time"],
          ["Baking dishes", "9 x 13 in (23 x 33 cm), at least 2", "Baked pasta, casseroles, egg bakes; about 8 hungry portions each"],
          ["Slow cooker", "7 to 8 qt (6.6 to 7.6 L)", "Hands-off dinners and keeping food hot for late eaters"],
          ["Griddle", "Two-burner or electric", "Pancakes, eggs and smash burgers in large batches"],
          ["Chef's knife and sharpener", "8 to 10 in (20 to 25 cm)", "A sharp knife is faster and safer than a dull one"],
          ["Cutting boards", "Large, with one kept for raw meat", "Keeping raw meat away from ready-to-eat food"],
          ["Shallow storage containers", "No more than 2 in (5 cm) deep", "Cooling leftovers quickly and storing them safely"],
        ],
      },
    },
    {
      id: "thermometer",
      heading: "The thermometer matters most",
      paragraphs: [
        "If a station kitchen buys only one thing, it should be a digital instant-read thermometer. It is the only reliable way to know that chicken has reached 165°F (74°C), that leftovers have been reheated to 165°F (74°C), and that food held for late eaters is still at 140°F (60°C) or above. It also stops the opposite problem, overcooking everything to be safe, which is where most dry chicken and tough pork chops come from. Check its accuracy occasionally in a glass of ice water, where it should read 32°F (0°C).",
      ],
    },
    {
      id: "pans",
      heading: "Getting more out of the pans you have",
      paragraphs: [
        "Preheat pans properly before food goes in; a heavy pan holds its heat when cold food hits it, which is what makes browning possible. Use two skillets at once rather than one skillet twice. In the oven, swap sheet pans between racks halfway through, because most ovens have hot spots and the pan on the top rack usually browns differently from the one below.",
        "Full-size hotel pans (roughly 12 x 20 in) are useful for holding food on a serving line, but measure the oven's interior before buying them; many residential ovens only fit half-size pans. Half sheet pans and half-size hotel pans fit almost anything.",
      ],
    },
    {
      id: "shared-kitchen",
      heading: "Keeping a shared kitchen usable",
      paragraphs: [
        "Equipment in a shared kitchen wears out faster when nobody owns it. Give knives a dedicated block or magnetic strip so they don't dull in a drawer, dry cast iron on a warm burner and wipe it with a little oil after washing, and keep a roll of tape and a marker with the storage containers so every leftover gets a date. A labeled shelf in the fridge for each shift stops food being thrown out by mistake, or eaten past its time.",
      ],
    },
  ],
  practicalAdvice: [
    "Buy capacity first: half sheet pans, a 7 to 9 qt Dutch oven and a 16 to 20 qt stockpot.",
    "Make a digital instant-read thermometer the first purchase and check it in ice water.",
    "Use two skillets instead of one to halve browning time.",
    "Keep shallow containers, tape and a marker together so every leftover is dated.",
  ],
  mealRecommendations: [
    meal("sheet-pan-fajitas", "Sheet-Pan Fajitas", "Two half sheet pans feed a crew with no batch searing."),
    meal("big-chili", "Beef and Bean Chili", "Built for an 8 qt Dutch oven."),
    meal("batch-lasagna", "Batch Lasagna", "Two 9 x 13 in dishes for a full table."),
    meal("beef-barley-soup", "Beef Barley Soup", "Sear the beef and simmer the soup in the same Dutch oven."),
    meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Makes the most of a single large pot."),
    meal("buttermilk-pancakes", "Buttermilk Pancakes for the Crew", "A griddle and a rack in a low oven are all you need to feed everyone at once.", "breakfast"),
  ],
  faqs: [
    {
      question: "What size Dutch oven do I need for 10 people?",
      answer:
        "7 to 9 qt (6.6 to 8.5 L). That fits about 5 quarts of chili or stew with room to stir, or a 4 to 5 lb roast with vegetables.",
    },
    {
      question: "What size pot do I need to cook 3 lb of pasta?",
      answer:
        "A 16 to 20 qt (15 to 19 L) stockpot, or split the pasta between two 8 to 12 qt pots. Two pots on two burners often boil faster than one very large one.",
    },
    {
      question: "Do full-size hotel pans fit in a home oven?",
      answer:
        "Often not. A full-size pan is roughly 12 x 20 in, and many residential ovens are too narrow or shallow for it. Measure the oven interior first, or use half-size hotel pans and half sheet pans, which fit almost any oven.",
    },
    {
      question: "What is the most important tool in a station kitchen?",
      answer:
        "A digital instant-read thermometer. It is the only reliable way to confirm meat is cooked to a safe temperature, leftovers are reheated to 165°F (74°C), and held food is still at 140°F (60°C) or above.",
    },
  ],
  relatedArticleSlugs: [
    "cooking-for-10-firefighters",
    "rookie-cooking-mistakes",
    "firehall-kitchen-culture",
    "feeding-a-firehall-crew",
  ],
  sources: [SRC.usdaTemps, SRC.usdaLeftovers, SRC.foodCodeCooling],
});

/** Rewritten cooking guides; each replaces the earlier entry with the same slug. */
export const CREW_COOKING_GUIDES: EditorialArticle[] = [
  cookingForTen,
  interruptionProofDinner,
  groceryPlanning,
  rookieMistakes,
  pastaForACrowd,
  slowCooker,
  mealPrepStorage,
  breakfastForACrowd,
  chiliForACrowd,
  kitchenEquipment,
];
