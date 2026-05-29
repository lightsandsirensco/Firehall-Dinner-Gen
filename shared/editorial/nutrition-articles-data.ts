/**
 * Nutrition & performance guides — shift-work fuel, recovery, hydration.
 */

import { buildSeoGuide, meal, STANDARD_FAQS } from "./seo-article-build.js";

const NUTRITION_FAQ = [STANDARD_FAQS.nutrition, STANDARD_FAQS.catalog];

export const NUTRITION_PERFORMANCE_ARTICLES = [
  buildSeoGuide({
    slug: "healthy-meals-that-still-taste-good",
    title: "Healthy Meals That Still Taste Good",
    subtitle: "Protein-forward hall dinners that feel like dinner — not a lecture",
    description:
      "Healthy firefighter meals do not have to be sad salads. Practical station-friendly ways to keep meals lighter without losing flavor, plus recipe picks crews actually finish.",
    keywords: ["healthy firefighter meals", "healthy firehall meals", "high protein dinners", "station cooking"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 7,
    intro:
      "Most crews are not asking for diet food. They are asking for dinner that tastes good and does not leave everyone wrecked at 21:00. The best “healthy” hall meals are balanced and operational: enough protein to satisfy, smart carbs you can scale, and sauces that carry flavor without turning everything into a sugar bomb.",
    practicalAdvice: [
      "Do not announce “healthy night.” Just cook a meal that tastes good and moves well.",
      "Make sauce a real component: yogurt, citrus, garlic, herbs — not a vague drizzle.",
      "If you need speed, go grill or sheet-pan. Hands-off beats heroic stovetop work on busy tours.",
      "If you want seconds, make the vegetable side bigger — not the rice pot.",
    ],
    sections: [
      {
        id: "what-healthy-means",
        heading: 'What "healthy" looks like at the station',
        paragraphs: [
          "Healthy does not mean low-calorie. For most crews it means protein-forward, vegetables that are actually cooked well, and portions that do not knock you out for the rest of the tour.",
          "The station constraint is real: you need food that holds for late eaters, survives interruptions, and does not require perfect prep to taste good.",
        ],
        tips: [
          "Keep the base simple: rice, potatoes, or tortillas — then win with protein + sauce.",
          "Use sheet pans and grills when the board is loud. Hands-off cooking beats stress eating.",
        ],
      },
      {
        id: "flavor-without-bloat",
        heading: 'Flavor without the "food coma"',
        paragraphs: [
          "Most post-dinner crashes come from heavy fat + heavy starch + heavy portions, not one ingredient. Shift the ratio: more lean protein, a normal carb portion, and sauce that tastes intentional.",
          "Use acid and spice the right way: citrus, vinegar, yogurt, herbs, and chiles. That is how you get big flavor without drowning everything in sugar or cheese.",
        ],
      },
      {
        id: "formats",
        heading: "Formats that work when you are short on time",
        paragraphs: [
          "Bowls, trays, and grills win because they scale. They also let each person self-serve, which fixes portions without a lecture.",
          "If the crew is split between comfort and performance, keep the main plate balanced and make indulgent extras optional at the end of the line.",
        ],
      },
    ],
    mealRecommendations: [
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Balanced bowls with real flavor — easy to portion."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Lighter-feeling dinner that still eats like a real plate."),
      meal("sheet-pan-fajitas", "Sheet Pan Fajitas", "Hands-off and fast; build-your-own keeps everyone happy."),
      meal("lemon-herb-salmon", "Lemon Herb Grilled Salmon", "Premium-feeling hall meal that stays clean and bright."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Chili still counts — leaner batch that holds all shift."),
      meal("mediterranean-chickpea", "Mediterranean Chickpea Bowl Night", "Plant-forward option that still feels like dinner."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["healthy-meals-for-active-crews", "high-protein-firehall-meals", "meals-wont-wreck-energy-levels"],
  }),

  buildSeoGuide({
    slug: "eating-well-on-24-hour-shifts",
    title: "Eating Well on 24-Hour Shifts",
    subtitle: "Three meals in one tour — without living on gas-station food",
    description:
      "How firefighters can eat well across a full tour: dinner that holds, overnight snacks that help, and breakfast that does not wreck the kitchen for the next crew.",
    keywords: ["24 hour shift nutrition", "firefighter shift meals", "fire station eating"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 8,
    intro:
      "A full tour is not one dinner. It is an evening meal for the arriving crew, optional fuel overnight if the board stays loud, and breakfast before handoff. Eating well on a 24-hour shift means planning hold-friendly food and stopping the slow drift toward vending machines — not eating perfectly every hour.",
    practicalAdvice: [
      "Cook dinner so it still eats well at 22:00 — chili, pulled pork, and baked pasta beat crispy food that dies on hold.",
      "Keep overnight options simple: fruit, yogurt, sandwich fixings — not a second full cook at 02:00.",
      "Breakfast should be a line or a bake, not twelve individual omelets.",
      "Drink water before coffee number three — dehydration feels like hunger.",
    ],
    sections: [
      {
        id: "dinner",
        heading: "Dinner that survives the first half",
        paragraphs: [
          "Anchor the tour with protein and starch you can reheat. Bowls, batches, and lines let late eaters build a plate without reheating the whole kitchen.",
          "Skip meals that only taste right in a two-minute window after plating. After a long call, nobody is eating on your schedule.",
        ],
      },
      {
        id: "overnight",
        heading: "Overnight without a second production",
        paragraphs: [
          "If the hall stocks the fridge, keep credible snacks visible — not buried behind condiments. Crews grab what they see.",
          "A pot of chili on low is not glamorous. It is effective when four people eat between 23:00 and 03:00.",
        ],
      },
      {
        id: "morning",
        heading: "Breakfast and handoff",
        paragraphs: [
          "Egg bakes and burrito bars tolerate a ninety-minute eating window. Pancakes hold in a warm oven between waves.",
          "Clean as you go. The crew on next owes you the same courtesy.",
        ],
      },
    ],
    mealRecommendations: [
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Reheats across the tour."),
      meal("breakfast-burrito-bar", "Breakfast Burrito Bar", "Morning line for staggered eaters."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Late-night sandwiches still work."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Hands-off morning bake."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["best-meals-24-hour-shift", "hydration-for-firefighters"],
  }),

  buildSeoGuide({
    slug: "best-foods-for-long-shifts",
    title: "Best Foods for Long Shifts",
    subtitle: "What keeps you steady — not what spikes and crashes",
    description:
      "Best foods for long firefighter shifts: protein-forward plates, smart carbs, hydration, and hall meals that do not leave the crew crashing at hour ten.",
    keywords: ["long shift meals", "firefighter energy food", "shift work nutrition"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Long shifts punish empty calories and reward steady fuel. The best foods for a long tour combine protein, usable carbs, and salt you actually lose — without turning every meal into a grease bomb. You are not optimizing for a photoshoot. You are staying functional until relief.",
    practicalAdvice: [
      "Pair protein with starch every time you sit down — not carbs alone.",
      "Eat before you are furiously hungry; judgment gets worse when blood sugar drops.",
      "Keep electrolytes in rotation on hot days — water alone is not always enough.",
      "Heavy grease at 18:00 can feel fine at 19:00 and awful at 02:00.",
    ],
    sections: [
      {
        id: "steady",
        heading: "Steady beats flashy",
        paragraphs: [
          "Rice bowls, chili, roasted chicken, and bean-heavy batches release energy slower than a tray of fries alone.",
          "Fat is not the enemy — unbalanced fat with no protein is. A burger with a side beats a burger with nothing.",
        ],
      },
      {
        id: "avoid",
        heading: "What to dial back on long tours",
        paragraphs: [
          "Massive sugar hits without protein — donuts for dinner, then wondering why focus tanks.",
          "Relying on energy drinks instead of food. Caffeine masks hunger; it does not replace it.",
        ],
      },
    ],
    mealRecommendations: [
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Protein, grain, veg — steady line."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Lean batch that still fills."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "Balanced bowl — predictable portions."),
      meal("beef-barley-soup", "Beef Barley Soup", "Slow-burn bowl food."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["meals-wont-wreck-energy-levels", "healthy-meals-for-active-crews"],
  }),

  buildSeoGuide({
    slug: "firefighter-recovery-nutrition",
    title: "Firefighter Recovery Nutrition",
    subtitle: "After the hard job — food that helps you come down",
    description:
      "Recovery nutrition for firefighters after tough calls: protein, fluids, and familiar meals that support sleep and next-day function — not guilt-driven diet talk.",
    keywords: ["firefighter recovery nutrition", "post call meals", "recovery food shift work"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Recovery nutrition is not a powder tub in the gear room. After a hard job, your crew needs fluids, protein, and food that feels normal — hot, salty, familiar. The body recovers better when you eat real food and hydrate than when you skip dinner because the shift 'was not a workout.'",
    practicalAdvice: [
      "Drink water before alcohol — always.",
      "Include protein within a few hours of a demanding job when you can — chili, chicken, eggs, yogurt.",
      "Do not punish the crew with 'light' food after a bad call — comfort and recovery can coexist.",
      "Magnesium-rich foods (beans, greens, nuts) help some people sleep — not magic, just useful.",
    ],
    sections: [
      {
        id: "fluids",
        heading: "Fluids first",
        paragraphs: [
          "Heat, gear, and adrenaline pull fluid. Rehydrate with water and electrolytes before you treat beer as recovery.",
        ],
      },
      {
        id: "food",
        heading: "Food that matches the night",
        paragraphs: [
          "Post-call meals should be easy to eat, plentiful, and warm. Mac and cheese is not a failure — it is a signal that the room can breathe again.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chili-garlic-bread", "Firehall Chili", "Protein-rich batch — communal bowls."),
      meal("chicken-pot-pie", "Chicken Pot Pie", "Warm, familiar, filling."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Lighter recovery night option."),
      meal("beef-barley-soup", "Beef Barley Soup", "Hydrating broth base."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["recovery-meals-after-hard-calls", "comfort-food-after-a-long-shift"],
  }),

  buildSeoGuide({
    slug: "hydration-for-firefighters",
    title: "Hydration for Firefighters",
    subtitle: "Water, electrolytes, and the habits that actually stick",
    description:
      "Hydration guide for firefighters: how much to drink on shift, when electrolytes matter, and how hall meals support fluid balance without gimmicks.",
    keywords: ["firefighter hydration", "shift hydration", "electrolytes firefighters"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Hydration on shift is boring until it is not. Headaches, cramps, and bad decisions show up when water intake drifts. Firefighters lose fluid in heat, gear, and dry station air — coffee does not count as a hydration strategy.",
    practicalAdvice: [
      "Start the shift with a full bottle — not an empty one you 'will fill later.'",
      "Add electrolytes on hot days or after heavy work — especially if you sweat through gear.",
      "Soup, fruit, and chili count toward fluid — not only plain water.",
      "Alcohol after the job dehydrates — pair it with water if you drink.",
    ],
    sections: [
      {
        id: "when",
        heading: "When electrolytes matter",
        paragraphs: [
          "Long hot jobs, back-to-back calls, and tours where you sweat more than you notice. Lightheadedness with clear urine can still mean sodium need on heavy days.",
        ],
      },
      {
        id: "hall",
        heading: "Hall habits that help",
        paragraphs: [
          "Keep a water cooler visible in the kitchen. Out of sight is out of mind.",
          "Broth-based soups at dinner add sodium and fluid — useful when appetites are low.",
        ],
      },
    ],
    mealRecommendations: [
      meal("beef-barley-soup", "Beef Barley Soup", "Broth-forward bowl — fluids and protein."),
      meal("chicken-dumpling-soup", "Chicken and Dumplings", "Hydrating comfort pot."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Cucumber and tzatziki add fluid."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Salty batch — sip water with it."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["eating-well-on-24-hour-shifts", "best-foods-for-long-shifts"],
  }),

  buildSeoGuide({
    slug: "nutrition-after-overnight-calls",
    title: "Nutrition After Overnight Calls",
    subtitle: "When the board never really went quiet",
    description:
      "What to eat after overnight firefighter activity: light morning options, rehydration, and meals that do not compound exhaustion with a sugar crash.",
    keywords: ["overnight shift nutrition", "firefighter overnight meals", "post night call food"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Overnight calls fragment sleep and appetite. Nutrition after a busy night is about rehydration, gentle protein, and breakfast formats that do not require a short-order cook. The crew is tired — food should be easy, not ambitious.",
    practicalAdvice: [
      "Rehydrate before heavy coffee.",
      "Breakfast: eggs, yogurt, fruit, toast — not only sugar pastries.",
      "If dinner was skipped, eat something real in the morning — not just caffeine.",
    ],
    sections: [
      {
        id: "morning",
        heading: "Morning after a loud board",
        paragraphs: [
          "Burrito bars and egg bakes let people eat when they surface. Avoid relying on doughnuts as the only option.",
        ],
      },
      {
        id: "fluids",
        heading: "Rehydrate before you caffeinate",
        paragraphs: [
          "Overnight tours dehydrate quietly. Water and electrolytes before the second pot of coffee prevents the shaky, hollow feeling crews mistake for exhaustion.",
        ],
      },
    ],
    mealRecommendations: [
      meal("breakfast-burrito-bar", "Breakfast Burrito Bar", "Staggered morning eating — line format."),
      meal("biscuits-gravy", "Biscuits and Gravy", "Hearty when the night was thin on food."),
      meal("chorizo-breakfast-tacos", "Chorizo Breakfast Tacos", "Fast protein line for morning after calls."),
      meal("pancake-short-stack", "Pancake Short Stack", "Pair with eggs or sausage for balance."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["firefighter-breakfast-ideas", "eating-well-on-24-hour-shifts"],
  }),

  buildSeoGuide({
    slug: "high-protein-firehall-meals",
    title: "High-Protein Firehall Meals",
    subtitle: "Crew portions that actually deliver protein — not powder hype",
    description:
      "High-protein firehall meals for active crews: chili, bowls, grilled chicken, turkey batches, and hall recipes with realistic protein per plate.",
    keywords: ["high protein firefighter meals", "protein crew dinners", "firehall protein"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "High-protein hall food means a full plate of real food — not six ounces of dry chicken breast while everyone else eats pasta. Crews need volume and protein together. Chili, bowls, thighs on the grill, and turkey batches hit both without feeling like a gym meal.",
    practicalAdvice: [
      "Shoot for visible protein on every plate — not protein hidden in a shake.",
      "Turkey chili and Greek bowls scale well for mixed appetites.",
      "Sauce on the side keeps bowls flexible.",
    ],
    sections: [
      {
        id: "sources",
        heading: "Protein sources that scale",
        paragraphs: [
          "Ground meats, chicken thighs, beans plus meat, eggs, and dairy in bakes. Thighs beat breast for flavor per dollar on crew night.",
        ],
      },
      {
        id: "portions",
        heading: "Portions crews will actually eat",
        paragraphs: [
          "Protein on the plate should be obvious, not hidden in sauce alone. Mixed plates — chili with bread, bowls with yogurt — beat dry chicken with no sides.",
        ],
      },
    ],
    mealRecommendations: [
      meal("turkey-chili", "High-Protein Turkey Chili", "Lean batch — still hearty."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Chicken, tzatziki, feta."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Beef and beans — hall classic."),
      meal("chicken-souvlaki", "Grilled Chicken Souvlaki", "Marinated skewers — pita ready."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Morning protein hit for the line."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["healthy-firefighter-meals-fill-you-up", "performance-nutrition-firefighters"],
  }),

  buildSeoGuide({
    slug: "avoid-living-on-takeout",
    title: "How Firefighters Can Avoid Living on Takeout",
    subtitle: "Station cooking beats delivery — when the system supports it",
    description:
      "Practical ways firefighter crews cut takeout dependence: batch cooking, grocery splits, fast hall formats, and meals cheaper than delivery for eight.",
    keywords: ["firefighter meal planning", "station cooking vs takeout", "firehall groceries"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Takeout is easy when the board is loud and nobody planned dinner. The fix is not willpower — it is a hall system: a default fast meal, a shared grocery run, and cooks who know three reliable formats. When station food is credible, delivery stops being the nightly fallback.",
    practicalAdvice: [
      "Keep one 'always possible' dinner: taco bar, chili, sheet pan — under 45 minutes.",
      "Split grocery costs weekly — takeout is expensive at crew scale.",
      "Assign a cook before 17:00 — ambiguity becomes pizza.",
    ],
    sections: [
      {
        id: "system",
        heading: "Systems beat motivation",
        paragraphs: [
          "A whiteboard dinner plan and a stocked pantry matter more than recipe ambition. Crews that cook twice a week break the takeout habit.",
        ],
      },
      {
        id: "fallback",
        heading: "The fallback meal list",
        paragraphs: [
          "Post three dinners the hall can cook in under forty-five minutes. When the board goes loud, you pick from the list — not from a delivery app.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Cheaper than eight delivered burritos."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "One pan — minimal cleanup."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Pantry-friendly crew dinner."),
      meal("chili-garlic-bread", "Firehall Chili", "Batch beats delivery buckets."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["planning-tonights-station-dinner", "firehall-grocery-planning"],
  }),

  buildSeoGuide({
    slug: "performance-nutrition-firefighters",
    title: "Performance Nutrition for Firefighters",
    subtitle: "Fuel for work that is not predictable",
    description:
      "Performance nutrition for firefighters: balanced plates on shift, timing around calls, and hall meals that support strength and endurance without fad diets.",
    keywords: ["performance nutrition firefighters", "firefighter athlete meals", "shift athlete food"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Performance nutrition on the job is not bodybuilding meal prep in Tupperware. It is eating enough protein, enough carbs for the work, and enough fluid to think clearly at hour fourteen. The hall wins when meals taste like food and still support the job.",
    practicalAdvice: [
      "Carbs fuel calls — do not fear rice, potatoes, or pasta on active days.",
      "Protein repairs — distribute it across the tour, not only post-gym.",
      "Sleep and food interact — heavy grease at midnight affects both.",
    ],
    sections: [
      {
        id: "plate",
        heading: "A performance plate at the hall",
        paragraphs: [
          "Half the plate protein and veg, starch for the shift length, sauce for flavor. Bowls make this automatic.",
        ],
      },
      {
        id: "timing",
        heading: "Timing around the job",
        paragraphs: [
          "Eat before long jobs when you can. After, prioritize fluids and a real meal — not only supplements. Performance nutrition is tour-long, not one heroic plate.",
        ],
      },
    ],
    mealRecommendations: [
      meal("performance-burrito-bowls", "Performance Chicken Burrito Bowls", "Macros-friendly bowl line."),
      meal("bulgogi-bowls", "Korean Bulgogi Rice Bowls", "Protein and rice — steady fuel."),
      meal("herb-roasted-thighs", "Herb Roasted Chicken Thighs", "Protein-forward oven night."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Omega-3s plus carbs."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["healthy-meals-for-active-crews", "high-protein-firehall-meals"],
  }),

  buildSeoGuide({
    slug: "healthy-station-snacks",
    title: "Healthy Station Snacks",
    subtitle: "Fridge and shelf ideas that crews actually eat",
    description:
      "Healthy snacks for fire stations: fruit, yogurt, nuts, hummus, and protein options that beat vending machines between meals.",
    keywords: ["fire station snacks", "healthy firefighter snacks", "hall fridge snacks"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Station snacks fail when they are 'healthy' but invisible. A fruit bowl on the counter beats asparagus wilting in the crisper. The goal is credible options between meals — not a lecture while someone eats chips because nothing else is ready.",
    practicalAdvice: [
      "Stock snacks at eye level — yogurt, fruit, string cheese, hummus.",
      "Keep nuts and trail mix in labeled bins — portion beats mindless bag eating.",
      "Rotate weekly — old fruit erodes trust in the whole program.",
    ],
    sections: [
      {
        id: "fridge",
        heading: "Fridge that works",
        paragraphs: [
          "Designate a snack shelf. Date labels. One person owns rotation. Chaos fridges become takeout fridges.",
        ],
      },
      {
        id: "counter",
        heading: "Counter snacks that disappear",
        paragraphs: [
          "Bananas, oranges, and a nut bin on the counter beat hidden 'healthy' food in the back of the fridge. Visibility drives use on busy tours.",
        ],
      },
    ],
    mealRecommendations: [
      meal("mediterranean-chickpea", "Mediterranean Chickpea Bowls", "Plant protein tray for lunch bowls."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Prep components for quick plates."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Reheat cup between meals."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["avoid-living-on-takeout", "best-foods-for-long-shifts"],
  }),

  buildSeoGuide({
    slug: "meals-wont-wreck-energy-levels",
    title: "Meals That Won't Wreck Energy Levels",
    subtitle: "Avoid the 21:00 food coma",
    description:
      "Firefighter meals that keep energy steady: balanced bowls, reasonable portions of fat, and hall dinners that do not leave the crew useless on the couch.",
    keywords: ["firefighter energy meals", "meals steady energy shift", "avoid food coma"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "Some hall dinners taste great at 18:00 and end the shift at 20:30. Meals that wreck energy are usually heavy fat with no balance, or sugar without protein. Steady energy comes from familiar food in reasonable portions — not from eating like it is a holiday every night.",
    practicalAdvice: [
      "Balance starch with protein — pasta with meat, rice with chicken.",
      "Serve veg or salad when you can — fiber slows the crash.",
      "Save the heaviest grease for slow nights.",
    ],
    sections: [
      {
        id: "picks",
        heading: "Hall picks that stay steady",
        paragraphs: [
          "Bowls, chili, grilled proteins with rice, and soups beat deep-fried-only spreads for a long tour.",
        ],
      },
      {
        id: "timing",
        heading: "When you eat matters",
        paragraphs: [
          "A huge greasy plate at 22:00 after skipping lunch hits harder than the same meal at 18:00. Spread fuel across the tour when the board allows.",
        ],
      },
    ],
    mealRecommendations: [
      meal("teriyaki-donburi", "Teriyaki Donburi", "Balanced bowl — steady energy."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Veg and protein — one pan."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Bean and turkey — steady."),
      meal("lemon-herb-salmon", "Lemon Herb Grilled Salmon", "Lighter grill night."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["best-foods-for-long-shifts", "healthy-meals-for-active-crews"],
  }),

  buildSeoGuide({
    slug: "eating-during-high-stress-shifts",
    title: "Eating During High-Stress Shifts",
    subtitle: "When appetite disappears — and still need fuel",
    description:
      "How to eat during high-stress firefighter shifts when crews skip meals, and which hall foods are easy to eat when adrenaline is high.",
    keywords: ["stress shift eating", "firefighter stress nutrition", "eat during busy shift"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "High-stress shifts kill appetite. Crews still need fuel — especially before a long job and after. Small, familiar foods win: broth, sandwiches, banana with peanut butter, chili in a cup. Forcing a huge plate mid-crisis rarely works.",
    practicalAdvice: [
      "Keep grab-and-go options visible before tones stack.",
      "After the job, warm simple food — do not skip because 'nobody is hungry.'",
      "Broth and soup are underrated — easy to sip.",
    ],
    sections: [
      {
        id: "before",
        heading: "Before the board stacks",
        paragraphs: [
          "If dinner is early, eat while you can. A bowl now beats nothing later.",
        ],
      },
      {
        id: "after",
        heading: "After intensity",
        paragraphs: [
          "Salt, protein, and warmth signal safety. That is when chili and sandwiches land.",
        ],
      },
    ],
    mealRecommendations: [
      meal("beef-barley-soup", "Beef Barley Soup", "Sippable bowl food when appetite is low."),
      meal("chili-garlic-bread", "Firehall Chili", "Cup portions — easy between calls."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Handheld — low ceremony."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["best-meals-after-busy-shift", "firefighter-recovery-nutrition"],
  }),

  buildSeoGuide({
    slug: "recovery-meals-after-hard-calls",
    title: "Recovery Meals After Hard Calls",
    subtitle: "Hot food when the room needs to exhale",
    description:
      "Recovery meals for firefighters after difficult calls: comfort, protein, hydration, and hall food that supports the crew without performative 'wellness.'",
    keywords: ["recovery meals firefighters", "post incident meals", "hard call food"],
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    intro:
      "After a hard call, food is emotional infrastructure. Recovery meals should be hot, plentiful, and familiar — not a surprise health experiment. The kitchen can be where the crew lands without forcing conversation.",
    practicalAdvice: [
      "Start water and simple food — not alcohol first.",
      "Let people eat in silence if they want.",
      "Comfort food is appropriate — pair with protein when you can.",
    ],
    sections: [
      {
        id: "kitchen",
        heading: "Let the kitchen do quiet work",
        paragraphs: [
          "Mac and cheese, chili, pot pie — foods people eat without thinking. Hold seconds on a warm tray.",
        ],
      },
      {
        id: "room",
        heading: "Read the room",
        paragraphs: [
          "Some nights need quiet and food, not a speech. Let the kitchen stay open late without forcing a group moment — presence matters more than menu creativity.",
        ],
      },
    ],
    mealRecommendations: [
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "Warm tray — low friction."),
      meal("chicken-pot-pie", "Chicken Pot Pie", "Familiar bowl — warm and filling."),
      meal("chili-garlic-bread", "Firehall Chili", "Communal pot — protein rich."),
      meal("loaded-baked-potato-bar", "Loaded Baked Potato Bar", "Self-serve — no pressure."),
    ],
    faqs: NUTRITION_FAQ,
    relatedArticleSlugs: ["comfort-food-after-a-long-shift", "firefighter-recovery-nutrition"],
  }),
];
