/**
 * SEO traffic pillar guides — high-intent firefighter / firehall meal keywords.
 */

import { buildSeoGuide, meal } from "./seo-article-build.js";

const REL = {
  busy: ["quick-meals-between-calls", "planning-tonights-station-dinner"],
  crew: ["feeding-a-firehall-crew", "meals-feeding-10-firefighters"],
  comfort: ["comfort-food-after-a-long-shift", "firehouse-comfort-meals"],
  prep: ["meal-prep-for-shift-workers", "firehall-meal-prep-ideas"],
};

export const SEO_TRAFFIC_ARTICLES = [
  buildSeoGuide({
    slug: "best-firehall-meals-busy-nights",
    title: "Best Firehall Meals for Busy Nights",
    subtitle: "Crew dinners that still happen when the board stays loud",
    description:
      "The best firehall meals for busy nights hold on the stove, scale fast, and taste good when eaters show up late — skillet, sheet-pan, and line meals crews actually finish.",
    keywords: ["best firehall meals", "busy night dinner", "firefighter meals", "fire station meals"],
    intro:
      "A busy night is not the night to debut a twelve-step recipe. The best firehall meals for busy nights share the same DNA: one clear protein, one starch or wrap, and a format that tolerates a twenty-minute pause when the tones drop. This is what halls cook when the clock is lying and the crew still needs real food.",
    practicalAdvice: [
      "Pick one protein and one format — do not run two mains.",
      "Set a 'serve window' instead of a single dinner time.",
      "Keep sauce and heat on the side so reheat does not kill texture.",
      "Post the menu on the whiteboard — it stops seventeen versions of 'what's for food?'",
    ],
    sections: [
      {
        id: "what-works",
        heading: "What works when time is tight",
        paragraphs: [
          "Skillet meals, tacos, quesadillas, and sheet-pan dinners finish fast and portion on a line. Pasta with a pan sauce beats baked-from-scratch anything that needs a rest.",
          "Avoid recipes where the only good version is served in a two-minute window — busy nights do not grant that window.",
        ],
      },
      {
        id: "hall-move",
        heading: "The hall move on a chaotic shift",
        paragraphs: [
          "Cook to 'done enough,' hold hot, and finish crisp elements last (toast, fresh herbs, a quick sear) when the first wave sits down.",
        ],
      },
    ],
    mealRecommendations: [
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Flat-top friendly — feeds fast after a late call."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "One pan, peppers, easy line."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Handhelds for staggered eaters."),
      meal("garlic-butter-shrimp", "Garlic Butter Shrimp", "Minutes on heat — pair with bread or rice."),
      meal("pad-thai", "Hall Rush Pad Thai", "High flavor wok/skillet finish."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Low dish count, predictable."),
    ],
    faqs: [
      {
        question: "What's a good meal to cook when the board might interrupt dinner?",
        answer:
          "Skillet meals, sheet-pan dinners, and tacos — anything that survives being turned to low and covered for twenty minutes. A Philly cheesesteak skillet or sheet-pan fajitas hold their shape better than a sauce that needs constant attention.",
      },
      {
        question: "How do you keep a busy-night dinner from turning into three separate meals?",
        answer:
          "Pick one protein and one format, then set a serve window instead of a single dinner time. Post it on the whiteboard so people know food is ready between 18:00 and 19:00, not exactly at 18:00 sharp.",
      },
    ],
    relatedArticleSlugs: REL.busy,
  }),

  buildSeoGuide({
    slug: "25-firefighter-dinner-ideas",
    title: "25 Firefighter Dinner Ideas",
    subtitle: "Hall-tested picks — not random internet lists",
    description:
      "Twenty-five firefighter dinner ideas for station kitchens: handhelds, bakes, grills, and bowls crews actually cook on shift — each links to a full crew-sized recipe.",
    keywords: ["firefighter dinner ideas", "firehall dinner ideas", "fire station meals", "crew dinner list"],
    readMinutes: 12,
    intro:
      "Most 'dinner idea' lists are written for two people at home. This one is built for a fire hall: crew-sized portions, realistic timing, and formats that survive interruptions. Below are twenty-five dinners firefighters actually cook — with notes on when to use each.",
    practicalAdvice: [
      "Bookmark five picks that match your usual shift length — rotate those before chasing novelty.",
      "Tag two 'tones-drop safe' meals per month (chili, pulled pork, baked pasta).",
      "Run one line meal monthly so picky eaters self-serve.",
    ],
    sections: [
      {
        id: "how-to-use",
        heading: "How to use this list on shift",
        paragraphs: [
          "Match time first, protein second. Under forty minutes? Stay in the handheld and skillet section. Quiet board? Smoke, bake, or batch.",
        ],
      },
      {
        id: "rotate",
        heading: "Rotate without burning out the cook",
        paragraphs: [
          "Assign a 'theme night' per week — taco, pasta, grill, bowl — and pull from that slice of the list so shopping stays predictable.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chicken-parm", "Chicken Parm", "Italian night — feeds a table, holds in the oven."),
      meal("smash-burgers", "Double Smash Burgers", "Handheld classic — fast line."),
      meal("steak-tacos", "Chimichurri Steak Tacos", "Steak night without plating stress."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Hold warm — ideal when eaters trickle in."),
      meal("turkey-chili", "Firehall Chili", "Batch hero for busy weeks."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Self-serve — ends protein debates."),
      meal("bbq-chicken-bowls", "BBQ Chicken Bowls", "Line-friendly bowl night."),
      meal("texas-central-brisket-crew", "Kansas City Smoked Brisket", "When you have time and want a centerpiece."),
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "Comfort that scales."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Feeds twelve without drama."),
      meal("pad-thai", "Hall Rush Pad Thai", "Wok energy, weeknight speed."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Rookie-proof one pot."),
      meal("garlic-butter-shrimp", "Garlic Butter Shrimp", "Fast protein on heat — pair with bread or rice."),
      meal("five-ingredient-pasta", "Garlic Butter Pasta", "Pantry pasta save when the clock is short."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Flat-top favorite — one-pan crew feed."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Quick handhelds for staggered eaters."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "Balanced bowl line — predictable portions."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "One pan — peppers, chicken, easy cleanup."),
      meal("beer-can-chicken", "Beer Can Chicken", "Grill showpiece — still practical."),
      meal("baked-ziti", "Baked Ziti", "Cheesy bake — crew pleaser."),
      meal("chili-mac", "Sunday Batch Chili", "Cook once, eat twice."),
      meal("jerk-chicken", "Jerk Chicken", "Big flavor grill night."),
      meal("meatball-hoagies", "Firehall Meatball Hoagies", "Saucy subs — easy portions."),
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Lighter bowl option."),
      meal("pork-carnitas-tacos", "Quick Pork Carnitas Tacos", "Crispy pork taco line."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "When the whole hall is hungry."),
    ],
    faqs: [
      {
        question: "How do you pick from a big list of dinner ideas without wasting time?",
        answer:
          "Match time first, protein second. Under forty minutes, stay with handhelds and skillets; if the board is quiet, go for a bake or a batch. Filtering by the clock cuts twenty-five options down to two or three fast.",
      },
      {
        question: "How often should a hall repeat the same dinner ideas?",
        answer:
          "Rotate through five or six picks that fit your usual shift length instead of chasing something new every night. Tag a couple as tones-drop safe — chili, pulled pork, baked pasta — so there's always a fallback.",
      },
    ],
    relatedArticleSlugs: ["planning-tonights-station-dinner", "meals-firefighters-actually-cook"],
  }),

  buildSeoGuide({
    slug: "best-firehouse-meals-large-crews",
    title: "Best Firehouse Meals for Large Crews",
    subtitle: "When you are cooking for ten, twelve, or the whole hall",
    description:
      "Best firehouse meals for large crews: batches, lines, and bakes that scale past eight eaters without doubling your stress or your grocery bill.",
    keywords: ["firehouse meals", "large crew meals", "feed a fire hall", "fire station dinner"],
    intro:
      "Large-crew cooking is portion math plus line discipline. The best firehouse meals for big tables are not 'fancy' — they are repeatable formats where protein, starch, and sauce can be held hot while stragglers eat. Think trays, not plates.",
    practicalAdvice: [
      "Round up starch before protein — rice, pasta, and buns are cheaper insurance.",
      "Use two half-sheet pans instead of one crowded pan — even cooking beats faster stacking.",
      "Run a single line with one person plating — everyone else stays out of the kitchen.",
    ],
    sections: [
      {
        id: "formats",
        heading: "Formats that scale past eight",
        paragraphs: [
          "Chili, lasagna, taco bars, baked ziti, pulled pork, and jambalaya are hall winners because they forgive timing and self-portion.",
        ],
      },
      {
        id: "math",
        heading: "Quick portion math",
        paragraphs: [
          "For mixed plates, plan roughly one pound raw protein per four eaters. For sandwiches and tacos, plan one pound per three. Add one extra starch tray always.",
        ],
      },
    ],
    mealRecommendations: [
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Built for the biggest appetite nights."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Slice and feed — classic large-crew move."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Everyone builds — reduces waste."),
      meal("jambalaya", "Cajun Jambalaya for the Hall", "One pot, loud flavor, full table."),
      meal("loaded-potato-feed", "Loaded Potato Feed", "Self-serve spuds — customizable."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Hold in a covered container — fast service."),
    ],
    faqs: [
      {
        question: "What's an easy way to portion protein for a large firehouse crew?",
        answer:
          "Round up rather than trying to hit an exact number — an extra pound of chicken thighs is cheap compared to running short. Add an extra tray of starch too; rice, pasta, or buns fill in fast if the protein runs light before everyone's been through the line.",
      },
      {
        question: "What's the easiest format for feeding a dozen firefighters at once?",
        answer:
          "Chili, lasagna, taco bars, and pulled pork win because they forgive timing and let people self-portion. Use two half-sheet pans instead of one crowded pan — even cooking beats faster stacking.",
      },
    ],
    relatedArticleSlugs: REL.crew,
  }),

  buildSeoGuide({
    slug: "meals-firefighters-actually-cook",
    title: "Meals Firefighters Actually Cook",
    subtitle: "What shows up on station tables — not food-blog fiction",
    description:
      "Meals firefighters actually cook at the station: chili, tacos, pasta bakes, grill nights, and skillets — real patterns from hall kitchens, with recipes attached.",
    keywords: ["meals firefighters actually cook", "fire station cooking", "firehall meals", "crew food"],
    topic: "crew_culture",
    intro:
      "Scroll long enough and you will see truffle risotto pitched for shift dinner. Most halls are not cooking that. What shows up again and again is big, familiar food: chili, burgers, tacos, pasta bakes, grilled chicken, sheet pans. The job favors volume, hold time, and a kitchen that can survive interruptions.",
    practicalAdvice: [
      "If a recipe needs constant attention at the stove, it loses on busy nights.",
      "Crews vote with volume — protein + starch + optional heat wins.",
      "The best cooks at the hall are organizers, not magicians.",
    ],
    sections: [
      {
        id: "patterns",
        heading: "Patterns you see again and again",
        paragraphs: [
          "Handheld nights (burgers, tacos, subs), one-pot batches (chili, jambalaya), and oven bakes (lasagna, ziti, mac) dominate because they scale and reheat.",
        ],
      },
      {
        id: "why",
        heading: "Why halls avoid 'chef food' on shift",
        paragraphs: [
          "Interruptions, mixed skill levels, and cleanup limits push crews toward forgiving recipes. That is not lack of ambition — it is operational reality.",
        ],
      },
    ],
    mealRecommendations: [
      meal("big-chili", "Firehall Chili", "The universal hall baseline."),
      meal("smash-burgers", "Double Smash Burgers", "Flat-top culture is real."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Weekly at many halls."),
      meal("chicken-parm", "Chicken Parm", "Italian night never dies."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "BBQ hold food — crew favorite."),
      meal("sheet-pan-sausage-peppers", "Sheet Pan Sausage and Peppers", "Low drama, high yield."),
    ],
    faqs: [
      {
        question: "Why don't firehouse crews cook more ambitious meals?",
        answer:
          "Interruptions, mixed skill levels, and limited cleanup time push crews toward forgiving recipes — not lack of ambition. A recipe that needs constant stove attention loses on a busy night no matter how good it tastes.",
      },
      {
        question: "What meals show up again and again at fire stations?",
        answer:
          "Chili, burgers, tacos, pasta bakes, and grilled chicken. These formats scale, hold, and reheat, which matters more on shift than novelty.",
      },
    ],
    relatedArticleSlugs: ["25-firefighter-dinner-ideas", "feeding-a-firehall-crew"],
  }),

  buildSeoGuide({
    slug: "best-meals-24-hour-shift",
    title: "Best Meals for a 24 Hour Shift",
    subtitle: "Dinner, overnight, and next-day fuel without kitchen burnout",
    description:
      "Best meals for a 24-hour shift: hold-friendly dinners, lighter overnight options, and breakfast that does not wreck the kitchen for the next crew.",
    keywords: ["24 hour shift meals", "firefighter shift meals", "fire station food", "overnight crew meals"],
    intro:
      "A full tour is three kitchens in one: evening dinner for the arriving crew, something manageable overnight if the board stays up, and breakfast before handoff. The best 24-hour shift meals are not one heroic dinner — they are a plan that spreads effort and uses hold-friendly food.",
    practicalAdvice: [
      "Cook dinner so it holds until late eaters arrive — do not peak at 18:00 sharp.",
      "Keep overnight snacks off the formal menu — fruit, yogurt, sandwich fixings in the fridge.",
      "Breakfast should be bake-or-line format — not made-to-order eggs for twelve.",
      "Label leftovers with time and date for the next shift.",
    ],
    sections: [
      {
        id: "dinner",
        heading: "Dinner that survives the first half",
        paragraphs: [
          "Chili, pulled pork, baked pasta, and rice bowls reheat well when the second run goes out at 22:00.",
        ],
      },
      {
        id: "morning",
        heading: "Breakfast without chaos",
        paragraphs: [
          "Egg bakes and burrito bars let people eat across a two-hour window. Pancakes hold warm in the oven between waves.",
        ],
      },
    ],
    mealRecommendations: [
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Dinner anchor — reheats all tour."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Late-night sandwiches still work."),
      meal("breakfast-burrito-bar", "Breakfast Burrito Bar", "Morning line — staggered eaters."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Hands-off morning bake."),
      meal("turkey-chili", "Sunday Batch Chili", "If dinner doubles as overnight option."),
    ],
    faqs: [
      {
        question: "How do you plan meals across an entire 24-hour shift?",
        answer:
          "Treat it as three kitchens in one: a dinner that still holds for late eaters, light overnight snacks if the board stays busy, and a breakfast bake or line before handoff. One heroic dinner that's supposed to cover the whole tour usually falls apart by midnight.",
      },
      {
        question: "What's a good overnight option if people are still hungry at 2 a.m.?",
        answer:
          "Keep fruit, yogurt, and sandwich fixings in the fridge, or leave a pot of chili on low. Nobody needs a second full cook overnight — just something that's already ready.",
      },
    ],
    relatedArticleSlugs: ["firefighter-breakfast-ideas", "meal-prep-for-shift-workers"],
  }),

  buildSeoGuide({
    slug: "healthy-firefighter-meals-fill-you-up",
    title: "Healthy Firefighter Meals That Fill You Up",
    subtitle: "Protein-forward hall food that is not sad lettuce",
    description:
      "Protein-forward hall food that still fills a crew: bowls, grills, and lean batches with real flavor — not sad plates that send everyone to pizza.",
    keywords: ["healthy firefighter meals", "fire station healthy meals", "high protein crew meals"],
    intro:
      "Healthy on shift does not mean small. Firefighters need volume and protein; 'healthy' fails when people leave hungry. The meals that work are bowls, grills, and lean batches with bold seasoning — crews self-select sauce and starch so it still feels like dinner.",
    practicalAdvice: [
      "Lead with protein grams, not calorie lectures.",
      "Sauce on the side keeps bowls flexible.",
      "Offer one indulgent side so the main feels like a choice, not punishment.",
    ],
    sections: [
      {
        id: "bowls",
        heading: "Bowl nights win",
        paragraphs: [
          "Grain, protein, veg, sauce — people build heavy or light. Greek chicken, salmon bowls, and turkey chili fit this model.",
        ],
      },
      {
        id: "grill",
        heading: "Grill without going light on portions",
        paragraphs: [
          "Salmon planks, souvlaki, and lean chili still feel like dinner when sides are generous. Offer bread, rice, or potatoes so nobody leaves hungry.",
        ],
      },
    ],
    mealRecommendations: [
      meal("greek-chicken-bowls", "Greek Chicken Power Bowls", "Bright, filling, line-friendly."),
      meal("ginger-salmon-bowls", "Ginger Salmon Rice Bowls", "Omega-rich — big flavor."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Lean batch — still hearty."),
      meal("cedar-plank-salmon", "Cedar Plank Grilled Salmon", "Grill night without heavy sides on the plate."),
      meal("chicken-souvlaki", "Grilled Chicken Souvlaki", "Pita-ready protein — easy line."),
      meal("mediterranean-chickpea", "Mediterranean Chickpea Tray", "Plant-forward tray that still fills."),
      meal("turkey-burgers", "Black Bean Turkey Burgers", "Juicy lean burgers that still satisfy the crew."),
    ],
    faqs: [
      {
        question: "How do you make a healthy meal that doesn't leave the crew hungry?",
        answer:
          "Build bowls — grain, protein, vegetable, sauce — so people control their own portions instead of getting a fixed diet plate. Greek chicken bowls and salmon rice bowls fill up the same way a regular dinner does; they just lead with protein instead of extra starch.",
      },
      {
        question: "Can you grill light without the meal feeling small?",
        answer:
          "Yes — salmon, souvlaki, and lean chili still feel like dinner when the sides are generous. Offer bread, rice, or potatoes on the side so a lighter main doesn't mean a lighter plate.",
      },
    ],
    relatedArticleSlugs: ["healthy-meals-for-active-crews"],
  }),

  buildSeoGuide({
    slug: "fast-firehall-meals-under-30-minutes",
    title: "Fast Firehall Meals Under 30 Minutes",
    subtitle: "From walk-in to eating — realistic station timers",
    description:
      "Easy firehouse meals — skillet, pasta, shrimp, quesadillas, and flat-top dinners that respect a real hall clock, not magazine prep times.",
    keywords: ["fast firehall meals", "30 minute crew dinner", "quick firefighter meals", "easy firehouse meals"],
    intro:
      "Thirty minutes on a hall clock is closer to twenty-two after someone asks a 'quick question' in the kitchen. Fast firehall meals skip rests, brines, and multi-stage bakes. They hit high heat, short ingredient lists, and formats you have cooked before — garlic butter shrimp on the flat-top, a philly skillet, carnitas tacos when the board already looks ugly at 18:15.",
    practicalAdvice: [
      "Pre-heat while you chop — never wait on the oven idle.",
      "Frozen veg is allowed on fast nights.",
      "One pan, one protein, one starch — done.",
      "Sauces on the side so late eaters do not get gluey reheat.",
    ],
    sections: [
      {
        id: "picks",
        heading: "What actually clears 30 minutes",
        paragraphs: [
          "Shrimp, thin chicken, ground beef, and pasta with jar-plus-fresh finishes. Skip whole birds and large roasts unless they started before you arrived.",
          "Last busy night we ran garlic butter shrimp while two guys portioned rice and a third warmed tortillas for pork carnitas tacos — eaters grabbed plates between 17:40 and 19:10 and nobody waited on a single finish time.",
        ],
        tips: [
          "Thaw protein before shift if you know the board is stacked.",
          "Frozen peppers are fine — nobody on the rig cares if you chopped them at 16:00.",
        ],
      },
      {
        id: "kitchen-traffic",
        heading: "Keep the kitchen from filling up",
        paragraphs: [
          "One cook on heat, one runner for plates and drinks, everyone else out until called. The fastest meal dies when four people 'just stir' the same pan.",
          "Write on the whiteboard: protein, hold temp, who is finishing. When tones drop at minute eighteen, the returning cook should not be guessing whether the skillet is off or just turned down.",
        ],
      },
      {
        id: "when-not-to-rush",
        heading: "When to pick a different format",
        paragraphs: [
          "If you are feeding twelve after a working fire and morale is thin, a taco line or chili batch beats a fragile pasta that clumps while you are still on scene.",
          "Fast nights are for food that forgives a ten-minute hold — quesadillas, bowls, shrimp — not a sauce that breaks if nobody stirs it.",
        ],
      },
    ],
    mealRecommendations: [
      meal("garlic-butter-shrimp", "Garlic Butter Shrimp", "Fastest protein on the flat-top."),
      meal("five-ingredient-pasta", "Garlic Butter Pasta", "Pantry pasta night — minimal ingredients."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Cheese, steak, peppers — one pan."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Handheld speed — great for late eaters."),
      meal("pork-carnitas-tacos", "Quick Pork Carnitas Tacos", "Taco night on a clock."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "Bowl line — quick assembly."),
      meal(
        "sheet-pan-parmesan-dijon-chicken-thigh-dinner",
        "Sheet Pan Parmesan-Dijon Chicken Thigh Dinner",
        "Crispy thighs, Dijon potatoes, and green beans on one pan.",
      ),
    ],
    faqs: [
      {
        question: "What if tones drop right before dinner hits the table?",
        answer:
          "Turn the heat down but keep it hot rather than warm, cover it, and post the hold on the whiteboard so it doesn't sit forgotten. Shrimp and skillet meals hold up reasonably well for a short wait; seared chicken cutlets dry out fast, so those are better finished fresh when you're back.",
      },
      {
        question: "What's the biggest time-saver for a meal under 30 minutes?",
        answer:
          "Skip anything that needs a rest, a brine, or a multi-stage bake. Shrimp, thin-cut chicken, ground beef, and pasta with a jarred-plus-fresh sauce clear thirty minutes because there's no dead time waiting on the oven or a resting protein.",
      },
    ],
    relatedArticleSlugs: REL.busy,
  }),

  buildSeoGuide({
    slug: "best-firefighter-crockpot-meals",
    title: "Best Firefighter Crockpot Meals",
    subtitle: "Set it, cover it, and survive a busy board",
    description:
      "Best firefighter crockpot meals for station kitchens: pulled pork, chili, soups, and braises that hold hot while the crew runs calls.",
    keywords: ["firefighter crockpot meals", "slow cooker fire station", "crockpot crew dinner"],
    intro:
      "A crockpot is not cheating — it is shift scheduling. The best firefighter crockpot meals turn low-attention time into hot food when people finally sit down. The trap is recipes that need last-minute precision; lean toward braises, beans, and pulls.",
    practicalAdvice: [
      "Brown meat when you can — color still matters in slow cookers.",
      "Do not overfill — two medium pots beat one overflowing.",
      "Transfer to a large serving container for service — easier than scooping from the ceramic insert on the line.",
    ],
    sections: [
      {
        id: "safety",
        heading: "Slow cooker station etiquette",
        paragraphs: [
          "Keep cords off walk paths, vent lids away from faces, and label 'hot' on the counter. Overnight cooks need a signed-off plan — not surprise at 03:00.",
        ],
      },
      {
        id: "when",
        heading: "When to start the pot",
        paragraphs: [
          "Start pulls and chili mid-afternoon on training days. On busy nights, use the crockpot as a hold vessel after a quick stove sear — not as a gamble at 18:00.",
        ],
      },
    ],
    mealRecommendations: [
      meal("pulled-pork", "Pulled Pork Sandwiches", "Classic slow-cooker win."),
      meal("big-chili", "Sunday Batch Chili", "Bean and beef — holds all shift."),
      meal("beef-barley-soup", "Beef Barley Soup", "Cold-night pot — filling."),
      meal("chicken-dumpling-soup", "Chicken and Dumplings", "Comfort in a slow pot."),
      meal("bbq-pulled-pork-bowls", "Carolina Mustard Pulled Pork", "Tangy pull — low labor."),
    ],
    faqs: [
      {
        question: "What crockpot meals hold up best on a busy shift?",
        answer:
          "Pulled pork, chili, and braises — anything that forgives being left on low for hours instead of needing last-minute precision. Brown the meat first when you can; color still matters even in a slow cooker.",
      },
      {
        question: "When should you start a crockpot meal for dinner?",
        answer:
          "Start pulls and chili mid-afternoon on quieter days. On busy nights, use the crockpot as a hold vessel after a quick stovetop sear instead of gambling on a full slow-cook starting at 18:00.",
      },
    ],
    relatedArticleSlugs: ["one-pot-firehall-meals"],
  }),

  buildSeoGuide({
    slug: "firehouse-comfort-meals",
    title: "Firehouse Comfort Meals",
    subtitle: "Post-call food that hits — mac, parm, chili, and bakes",
    description:
      "Firehouse comfort meals crews ask for again: cheesy bakes, chili, parm, mashed plates, and loaded bowls after long jobs.",
    keywords: ["firehouse comfort meals", "firefighter comfort food", "post call meal"],
    intro:
      "Comfort food at the station is half the reset after a tough job. Crews want salt, starch, and enough volume that nobody hits the vending machine later. These meals are not gourmet — they are familiar, hot, and big.",
    practicalAdvice: [
      "Serve something crunchy or toasted if the main is soft.",
      "Keep hot sauce on the table — instant customization.",
      "Do not apologize for comfort night — balance the week instead.",
    ],
    sections: [
      {
        id: "hits",
        heading: "Hall hits that never get voted off",
        paragraphs: [
          "Mac and cheese, chicken parm, chili, meatloaf, pot pie, and loaded potatoes. These are not creative — they are effective.",
        ],
      },
      {
        id: "serve",
        heading: "How to serve comfort without a mess",
        paragraphs: [
          "Tray format, one ladle per pot, and buns or garlic bread on the side. Comfort food fails when the line backs up — keep movement simple.",
        ],
      },
    ],
    mealRecommendations: [
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "Cheesy tray — universal."),
      meal("chicken-parm", "Chicken Parm", "Italian comfort king."),
      meal("big-chili", "Firehall Chili", "Bowl food after hard weather."),
      meal("meatloaf-mashed", "Classic Meatloaf with Mashed Potatoes", "Sunday-dinner energy on a weeknight."),
      meal("chicken-pot-pie", "Chicken Pot Pie", "All-in-one bowl meal."),
      meal("beef-stroganoff", "Beef Stroganoff", "Rich, savory noodles."),
      meal(
        "crispy-chicken-cutlets",
        "Crispy Chicken Cutlets Marinara",
        "Golden cutlets with bubbling sauce — Italian night energy.",
      ),
    ],
    faqs: [
      {
        question: "What comfort meals do firehouse crews ask for again and again?",
        answer:
          "Mac and cheese, chicken parm, chili, meatloaf, and loaded potatoes. None of it is creative — it's effective, and it reheats well for people eating in shifts.",
      },
      {
        question: "How do you serve comfort food without backing up the line?",
        answer:
          "Use a tray format with one ladle per pot and buns or garlic bread on the side. Comfort food fails fast when the line backs up, so keep the setup simple even if the menu is rich.",
      },
    ],
    relatedArticleSlugs: REL.comfort,
  }),

  buildSeoGuide({
    slug: "easy-firehall-pasta-recipes",
    title: "Easy Firehall Pasta Recipes",
    subtitle: "Feeds a crew without a culinary degree",
    description:
      "Easy firehall pasta recipes: baked ziti, garlic butter pasta, stroganoff, chicken parm, and one-skillet alfredo for station dinners.",
    keywords: ["firehall pasta recipes", "easy pasta crew dinner", "fire station pasta"],
    intro:
      "Pasta is hall currency — cheap, familiar, and scalable. Easy firehall pasta recipes focus on one pot or one tray, sauce that can be held hot, and protein mixed in so plates feel complete. Nuance is optional; volume is not.",
    practicalAdvice: [
      "Salt the pasta water hard — it carries the dish.",
      "Finish with butter or good olive oil if sauce is thin.",
      "Hold pasta slightly underdone if it will sit — it finishes in the tray.",
    ],
    sections: [
      {
        id: "bake-vs-skillet",
        heading: "Bake vs skillet — pick one",
        paragraphs: [
          "Bakes (ziti, lasagna) feed the most people with the least active time. Skillet pastas (alfredo, garlic butter) finish faster when the board is loud.",
        ],
      },
      {
        id: "sauce",
        heading: "Sauce that survives the line",
        paragraphs: [
          "Hold sauce slightly loose — pasta keeps absorbing. Refresh with pasta water or butter at service instead of cooking dry in the tray.",
        ],
      },
    ],
    mealRecommendations: [
      meal("baked-ziti", "Baked Ziti", "Tray bake — crew classic."),
      meal("five-ingredient-pasta", "Garlic Butter Pasta", "Fastest pantry save."),
      meal("beef-stroganoff", "Beef Stroganoff", "Hearty noodle night."),
      meal("chicken-parm", "Chicken Parm", "Over pasta — hall tradition."),
      meal("skillet-chicken-alfredo", "One-Skillet Chicken Alfredo", "Creamy skillet finish."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Maximum pasta for big tables."),
      meal(
        "30-minute-pasta-e-fagioli-for-the-hall",
        "30-Minute Pasta e Fagioli for the Hall",
        "Bean-and-pasta soup that lands in half an hour.",
      ),
      meal(
        "spaghetti-aglio-e-olio-for-the-hall",
        "Spaghetti Aglio e Olio for the Hall",
        "Garlic, oil, and pasta — emulsified the right way.",
      ),
    ],
    faqs: [
      {
        question: "What's the easiest pasta dish for a big crew?",
        answer:
          "A baked ziti or lasagna — assemble it in a tray, put it in the oven, and it feeds the whole hall with almost no active time once it's in. Skillet pastas like garlic butter or alfredo are faster if the board is loud and dinner needs to happen in under 30 minutes.",
      },
      {
        question: "How do you keep pasta from drying out if it sits before people eat?",
        answer:
          "Hold the sauce slightly loose since the pasta keeps absorbing liquid, and refresh it with a splash of pasta water or butter at service instead of cooking it dry in the tray.",
      },
    ],
    relatedArticleSlugs: ["one-pot-firehall-meals"],
  }),

  // NOTE: a "firefighter-bbq-recipes" guide previously lived here. It
  // targeted the same search intent as the /firefighter-bbq-recipes SEO
  // landing page (shared/seo/landing-pages-data.ts) — same head keyword,
  // 5 of its 6 recommended recipes overlapping — while the landing page
  // carries every BBQ recipe's internal "pillar" link (see
  // shared/seo/recipe-authority-links.ts) and this guide had none.
  // Consolidated: /guides/firefighter-bbq-recipes now 301s to
  // /firefighter-bbq-recipes (see server/routes.ts) instead of maintaining
  // two competing pages for one query.

  buildSeoGuide({
    slug: "meals-feeding-10-firefighters",
    title: "Meals for Feeding 10 Firefighters",
    subtitle: "Portion math, line setup, and recipes that land",
    description:
      "Portion math, shopping lists, and recipe picks when you are cooking for ten at the table.",
    keywords: ["feeding 10 firefighters", "meals for 10 people", "fire station portions", "crew size 10"],
    intro:
      "Ten eaters is the point where home-cooking instincts break. You are officially running a small cafeteria. Meals for feeding ten firefighters need one main format, one reliable starch, and a line — not ten custom plates.",
    practicalAdvice: [
      "Shop for 12 portions — you will feed floaters.",
      "Two full trays of protein beat one overcrowded pan.",
      "Write portions on a card at the line: 'two tacos / one cup chili.'",
    ],
    sections: [
      {
        id: "shop",
        heading: "Shopping for ten",
        paragraphs: [
          "Rough guide: 3–4 lb raw protein for mixed plates, 2 lb pasta dry for bakes, two dozen buns for handhelds. Adjust up if your hall runs hungry.",
        ],
      },
      {
        id: "line",
        heading: "Line setup for ten eaters",
        paragraphs: [
          "One person plates, everyone else stays out. Two trays of main, one starch, toppings in bowls — not a free-for-all at the stove.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Built for ten-plus builds."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Double-pot energy for ten-plus eaters."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Slices for the whole table."),
      meal("smash-burgers", "Double Smash Burgers", "Two burgers each if hungry."),
      meal("bbq-chicken-bowls", "BBQ Chicken Bowls", "Rice line — predictable."),
    ],
    faqs: [
      {
        question: "How do you make sure you've cooked enough food for 10 firefighters?",
        answer:
          "Round up rather than trying to land on an exact amount — floaters and second helpings are normal, so a little extra protein or a second batch of starch is cheap insurance. Two trays of protein beat one overcrowded pan, since crowding is what actually causes food to run short or cook unevenly.",
      },
      {
        question: "What's the best way to serve dinner for a table of ten?",
        answer:
          "Run a line instead of plating: one person serves, everyone else stays out of the kitchen, and toppings go in bowls instead of a free-for-all at the stove.",
      },
    ],
    relatedArticleSlugs: REL.crew,
  }),

  buildSeoGuide({
    slug: "cheap-firehall-meals",
    title: "Cheap Firehall Meals That Still Taste Good",
    subtitle: "Stretch the grocery budget without crew complaints",
    description:
      "Pasta, chili, tacos, egg bakes, and chicken thighs that taste good on a tight budget — flavor from technique, not price tags.",
    keywords: ["cheap firehall meals", "budget fire station meals", "affordable crew dinner"],
    intro:
      "Budget nights are normal — dues, fundraisers, and 'we already spent too much this month' happen. Cheap firehall meals lean on pasta, beans, chicken thighs, ground beef, and eggs. Flavor comes from browning, acid, and salt — not expensive cuts.",
    practicalAdvice: [
      "Buy whole birds or thighs instead of breasts when appropriate.",
      "Beans and lentils stretch chili without complaint if seasoned boldly.",
      "Frozen veg and bulk rice are hall allies.",
    ],
    sections: [
      {
        id: "flavor",
        heading: "Cheap does not mean bland",
        paragraphs: [
          "Toast spices, brown meat, finish with lemon or vinegar. Crews notice technique more than truffle oil.",
        ],
      },
      {
        id: "shop-smart",
        heading: "Shop smart for the hall",
        paragraphs: [
          "Buy in bulk for staples, thighs over breasts when appropriate, and one 'splurge' topping so budget night still feels intentional.",
        ],
      },
    ],
    mealRecommendations: [
      meal("five-ingredient-pasta", "Garlic Butter Pasta", "Low cost — high return."),
      meal("big-chili", "Firehall Chili", "Bean and beef stretch far."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Ground beef line — economical."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Cheap breakfast for many."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Lean and budget-friendly."),
      meal("baked-ziti", "Baked Ziti", "Tray feed — crowd pleaser."),
    ],
    faqs: [
      {
        question: "What's a cheap meal that still feeds a big crew well?",
        answer:
          "Chili, tacos, and baked pasta stretch a grocery budget the furthest — beans and lentils can stretch chili while keeping it filling, and thighs cost less than breasts for a similar amount of protein. Flavor comes from browning the meat and finishing with acid, not from spending more.",
      },
      {
        question: "How do you keep a budget meal from tasting cheap?",
        answer:
          "Toast your spices, brown the meat properly, and finish with lemon or vinegar — technique reads louder than ingredient cost. One inexpensive splurge topping, like real cheese or good bread, makes a budget dinner feel intentional instead of like a compromise.",
      },
    ],
    relatedArticleSlugs: ["feeding-a-firehall-crew"],
  }),

  buildSeoGuide({
    slug: "best-station-chili-recipes",
    title: "Best Station Chili Recipes",
    subtitle: "The hall's default batch — beef, turkey, and big pots",
    description:
      "Best station chili recipes for firefighters: classic beef chili, turkey lean batch, and hall-sized pots that hold across the shift.",
    keywords: ["station chili recipes", "firefighter chili", "fire hall chili", "batch chili"],
    intro:
      "Chili is the station's universal backup plan. It scales, holds on the stove, tops potatoes or hot dogs, and tastes better the next day. The best station chili recipes are not secret — they are consistent batches with enough seasoning to stand up to cheese and crackers.",
    practicalAdvice: [
      "Brown meat before the pot — depth matters.",
      "Simmer longer than you think after adding beans.",
      "Offer toppings bar: cheese, onion, jalapeño, Fritos — crew happiness multiplier.",
    ],
    sections: [
      {
        id: "variations",
        heading: "Beef vs turkey vs double pot",
        paragraphs: [
          "Beef for classic nights, turkey when the crew wants leaner, double pot when appetite is unknown. Same line setup for all three.",
        ],
      },
      {
        id: "toppings",
        heading: "Toppings bar that actually gets used",
        paragraphs: [
          "Cheese, onion, jalapeño, sour cream, and something crunchy. Label mild vs hot — it prevents the usual salsa argument.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chili-mac", "Firehall Chili", "Garlic bread night pairing built in."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Maximum batch when appetite is unknown."),
      meal("turkey-chili", "High-Protein Turkey Chili", "Leaner pot — still hearty."),
      meal("white-bean-chicken-chili", "Sunday Batch Chili", "Meal-prep chili base."),
      meal("loaded-potato-feed", "Loaded Potato Feed", "Chili topping option on potato bar."),
    ],
    faqs: [
      {
        question: "What's the difference between beef and turkey station chili?",
        answer:
          "Beef chili is the classic, heavier pick for a cold or rough shift; turkey chili is leaner but still holds up with the same seasoning and simmer time. A double pot of both covers a crew when appetite is unknown.",
      },
      {
        question: "What toppings should a chili bar have?",
        answer:
          "Cheese, diced onion, jalapeño, sour cream, and something crunchy like Fritos or crackers. Label a mild and a hot pot separately — it heads off the usual argument about spice level before it starts.",
      },
    ],
    relatedArticleSlugs: ["firehouse-comfort-meals"],
  }),

  buildSeoGuide({
    slug: "firehall-taco-night-ideas",
    title: "Firehall Taco Night Ideas",
    subtitle: "Lines, proteins, and toppings that keep peace",
    description:
      "Ground beef bars, carnitas, chicken, and toppings that let ten people build without kitchen chaos.",
    keywords: ["firehall taco night", "taco bar fire station", "firefighter tacos", "crew taco night"],
    intro:
      "Taco night works because it is a line, not a plating job. Firehall taco night ideas center on two proteins max, warm tortillas in a cooler, and toppings in bowls with spoons — not one cook assembling to order.",
    practicalAdvice: [
      "Two tortillas per person in the warmer.",
      "Keep lettuce and tomato cold — separate from hot line.",
      "Label mild vs hot salsa — prevents drama.",
    ],
    sections: [
      {
        id: "proteins",
        heading: "Pick your proteins",
        paragraphs: [
          "Ground beef seasoned simple, shredded chicken, or carnitas for busy nights. Veg option: seasoned beans in its own pan.",
        ],
      },
      {
        id: "tortillas",
        heading: "Tortillas and toppings",
        paragraphs: [
          "Warm tortillas in a cooler, keep cold toppings cold, and put hot salsa where people expect heat. Two tortillas per person in the warmer.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "The baseline hall taco spread."),
      meal("pork-carnitas-tacos", "Quick Pork Carnitas Tacos", "Crispy pork — fast line."),
      meal("steak-tacos", "Chimichurri Steak Tacos", "Steak night upgrade."),
      meal("street-corn-chicken", "Street Corn Chicken Tacos", "Bright street-corn vibe."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Fajita filling crossover."),
    ],
    faqs: [
      {
        question: "How many proteins should you run on taco night?",
        answer:
          "Two max — ground beef and shredded chicken, or beef and carnitas — plus a seasoned bean option for anyone skipping meat. More than two proteins turns a simple line into a second kitchen to manage.",
      },
      {
        question: "How do you keep a taco line moving for ten-plus people?",
        answer:
          "Warm tortillas in a cooler instead of a microwave stack, keep cold toppings separate from the hot line, and label the mild and hot salsa. Two tortillas per person in the warmer keeps the line from running out mid-service.",
      },
    ],
    relatedArticleSlugs: ["best-firehall-meals-busy-nights"],
  }),

  buildSeoGuide({
    slug: "best-meals-after-busy-shift",
    title: "Best Meals After a Busy Shift",
    subtitle: "When the job was hard and the crew needs hot food",
    description:
      "Best meals after a busy shift: comfort trays, chili, pasta bakes, and proteins that hold while people decompress.",
    keywords: ["meals after busy shift", "post call firefighter meal", "fire station comfort dinner"],
    intro:
      "After a busy shift, dinner is not nutrition — it is reset. The best meals after a hard job are familiar, hot, and plentiful. This is not the night for experimental flavors or small portions.",
    practicalAdvice: [
      "Start comfort food early if the board hints busy — do not wait until 21:00.",
      "Let people eat in shifts without commentary about 'late eaters.'",
      "Keep cleanup assigned — exhaustion plus dishes causes fights.",
    ],
    sections: [
      {
        id: "food",
        heading: "Food that matches the mood",
        paragraphs: [
          "Mac, parm, chili, pulled pork, potato bars. Soft + salty + optional heat wins over 'light and elegant.'",
        ],
      },
      {
        id: "timing",
        heading: "Timing dinner after a hard job",
        paragraphs: [
          "Start comfort food early if the board hints busy. Let people eat in shifts without commentary — the meal is for recovery, not performance reviews.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chicken-pot-pie", "Chicken Pot Pie", "Bowl meal — calming."),
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "Cheese and carbs — the usual reset."),
      meal("big-chili", "Firehall Chili", "Deep bowls — communal."),
      meal("beef-stroganoff", "Beef Stroganoff", "Rich — feels substantial."),
      meal("loaded-baked-potato-bar", "Loaded Baked Potato Bar", "Self-serve — no pressure."),
    ],
    faqs: [
      {
        question: "What should you cook after a genuinely hard shift?",
        answer:
          "Something familiar, hot, and plentiful — mac and cheese, chili, pulled pork, or a potato bar. This isn't the night to try a new recipe; soft, salty, and generous beats light and elegant every time.",
      },
      {
        question: "Should you wait for everyone to eat dinner together after a tough call?",
        answer:
          "No — let people eat in shifts without commentary about late eaters. The meal is for recovery, not a group performance, so start comfort food early if the board hints at being busy.",
      },
    ],
    relatedArticleSlugs: REL.comfort,
  }),

  buildSeoGuide({
    slug: "firefighter-breakfast-ideas",
    title: "Firefighter Breakfast Ideas",
    subtitle: "Morning crew fuel — bakes, burritos, and pancake stacks",
    description:
      "Firefighter breakfast ideas for station mornings: burrito bars, egg bakes, pancakes, and tacos that feed staggered eaters.",
    keywords: ["firefighter breakfast ideas", "fire station breakfast", "firehall brunch", "shift breakfast"],
    intro:
      "Breakfast at the hall is a logistics problem disguised as a meal. Crew members eat across ninety minutes — some before rig checks, some after a run, some while the coffee pot is already on its second cycle. Firefighter breakfast ideas that actually work are build-your-own lines and sheet-pan bakes, not a short-order griddle with one cook drowning in custom orders.",
    practicalAdvice: [
      "Cook sausage and bacon on sheet pans in the oven — less splatter, more even crisp, and the flat-top stays free for eggs.",
      "Keep tortillas in a warmer or covered dish, not a stack in the microwave.",
      "Assign coffee owner and dish crew before anyone cracks an egg — breakfast chaos is half food and half who forgot the pot.",
      "Hold pancakes and egg bakes warm at 200°F with foil vented — dry heat beats a lid that steams everything soggy.",
    ],
    sections: [
      {
        id: "lines",
        heading: "Line formats beat plated breakfast",
        paragraphs: [
          "Burrito bars, sausage egg bakes, pancake trays in the oven, and chorizo taco lines all scale past eight people without plating eight individual orders. Each person builds when they show up, which is how mornings actually run on shift.",
          "Put proteins, eggs, cheese, salsa, and hot sauce on the counter in baking dishes. Keep cold toppings on ice if you are running late into summer shifts. The line should take thirty seconds per person, not a conversation with the cook.",
        ],
        tips: [
          "Pre-scramble eggs for burritos in a large baking dish — faster than cooking to order.",
          "Slice fruit or open yogurt cups only if you have spare hands — do not let sides derail the hot food.",
        ],
      },
      {
        id: "timing",
        heading: "Timing breakfast around tones",
        paragraphs: [
          "If tones drop during prep, leave the oven on low and finish eggs when you return. Bakes and bacon forgive a pause better than pancakes on a griddle.",
          "On slow mornings, start bacon first — it perfumes the hall and buys you ten minutes of goodwill while eggs finish.",
        ],
      },
      {
        id: "coffee",
        heading: "Coffee and cleanup",
        paragraphs: [
          "Assign one person to coffee and one to dishes before cooking starts. When everyone 'helps' the cook, eggs overcook and nobody owns the sink.",
          "Run breakfast cleanup like dinner: soak sheet pans immediately, knock scraps into compost, and wipe the flat-top while it is still warm.",
        ],
      },
    ],
    mealRecommendations: [
      meal("breakfast-burrito-bar", "Breakfast Burrito Bar", "Build-your-own morning line."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Slice and serve — easy."),
      meal("pancake-short-stack", "Pancake Short Stack", "Hold warm in the oven between waves."),
      meal("chorizo-breakfast-tacos", "Chorizo Breakfast Tacos", "Bold morning tacos — fast line."),
      meal("cast-iron-breakfast-skillet", "Bacon Egg Hash Skillet", "Skillet feed — hearty."),
    ],
    faqs: [
      {
        question: "What do you cook when half the crew already ate?",
        answer:
          "Hold the bake or burrito components warm and let late arrivals build a plate. A second wave of scrambled eggs in a baking dish beats cooking a fresh full breakfast for two people.",
      },
      {
        question: "What's the fastest hall breakfast when the morning is already behind schedule?",
        answer:
          "A burrito bar or taco line — components cook in batches and people build their own plate in seconds. Skip made-to-order eggs entirely once you're running late; nobody has time to wait on individual orders.",
      },
    ],
    relatedArticleSlugs: ["firehall-breakfast-and-brunch"],
  }),

  buildSeoGuide({
    slug: "firehall-meal-prep-ideas",
    title: "Firehall Meal Prep Ideas",
    subtitle: "Cook once on a slow day — feed the loud ones",
    description:
      "Firehall meal prep ideas: batch chili, sheet-pan components, pulled pork, and rice bases that reheat clean on busy shifts.",
    keywords: ["firehall meal prep", "fire station meal prep", "shift meal prep firefighters"],
    intro:
      "Meal prep at a station means cooking components when the board is quiet so busy nights are assembly, not invention. Firehall meal prep ideas focus on proteins and sauces that reheat — not pre-plated meals that dry out.",
    practicalAdvice: [
      "Prep proteins and sauces — assemble day-of.",
      "Date and label everything — rotation prevents science experiments.",
      "One prep cook, one list — avoid three people 'helping' differently.",
    ],
    sections: [
      {
        id: "components",
        heading: "Components that reheat clean",
        paragraphs: [
          "Chili, pulled pork, roasted chicken thighs, cooked rice, roasted veg. Combine into bowls, tacos, or bakes in under thirty minutes.",
        ],
      },
      {
        id: "labels",
        heading: "Label and rotate",
        paragraphs: [
          "Date everything, freeze what you will not use in three days, and post a fridge map so the next shift does not duplicate prep.",
        ],
      },
    ],
    mealRecommendations: [
      meal("turkey-chili", "Sunday Batch Chili", "Prep star — multi-day use."),
      meal("sheet-pan-meal-prep", "Sheet Pan Meal Prep", "Components for bowls — reheat clean."),
      meal("pulled-pork", "Pulled Pork Mac", "Uses prep-friendly pulled pork."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Big pot Sunday — feeds the week."),
    ],
    faqs: [
      {
        question: "What components are worth prepping ahead at a fire station?",
        answer:
          "Chili, pulled pork, roasted chicken thighs, cooked rice, and roasted vegetables — proteins and bases that reheat clean instead of drying out. Combine them into bowls, tacos, or bakes in under thirty minutes on a busy night.",
      },
      {
        question: "How do you keep prepped food from getting lost in the fridge?",
        answer:
          "Date and label everything the same night you cook it, and post a simple fridge map so the next shift doesn't duplicate the same prep. One prep cook working off one list beats three people helping in different directions.",
      },
    ],
    relatedArticleSlugs: REL.prep,
  }),

  buildSeoGuide({
    slug: "dutch-oven-meals-firefighters",
    title: "Best Dutch Oven Meals for Firefighters",
    subtitle: "Braises, chili, and bake-from-coals when the station allows",
    description:
      "Best Dutch oven meals for firefighters: chili, braised beef, jambalaya, and cobblers when outdoor cooks or kitchen ovens fit the plan.",
    keywords: ["dutch oven firefighter meals", "dutch oven station cooking", "camp dutch oven crew"],
    intro:
      "Dutch ovens are hall tools on training weekends, outdoor cooks, and slow Sunday shifts — heavy, forgiving, and built for batch mindset. The best Dutch oven meals for firefighters are chili, stew, and braised pots that feed eight to twelve without precision plating. You are not trying to impress a food critic; you are trying to feed a crew that will still be hungry after the first bowl.",
    practicalAdvice: [
      "Use foil liners for sweet cobblers if dessert is on the menu — scrub time matters on Sunday night.",
      "Assign one charcoal boss outdoors — lid lifts are how coals lose heat and chicken stays underdone.",
      "Indoors, treat the Dutch oven as a heavy casserole: same recipes, less romance, faster cleanup.",
      "Brown meat in a skillet first if the pot is tight — color equals flavor when you cannot see inside.",
    ],
    sections: [
      {
        id: "indoor-outdoor",
        heading: "Indoor station vs outdoor pit",
        paragraphs: [
          "Indoor: chili, baked ziti-style pasta, and shepherd's pie toppings work in the station oven with the same pot. Outdoor: bean pots, jambalaya, and cobbler shine when coals are steady and the wind is not fighting you.",
          "Match the meal to the venue. Weeknight inside beats fighting weather for a marginal outdoor cook.",
        ],
      },
      {
        id: "coals",
        heading: "Coals and crew roles",
        paragraphs: [
          "One fire boss manages heat, one cook stirs, everyone else stays out of the lid zone. Dutch oven night fails when three people 'check' the pot and drop ash into the food.",
          "Rotate coals on a schedule — top and bottom heat is not set-and-forget unless you like burnt bottoms.",
        ],
        tips: [
          "Keep a lid lifter and heavy gloves staged before you light charcoal.",
          "Probe stew meats to 203°F for pull-apart texture — time estimates lie outdoors.",
        ],
      },
      {
        id: "meals",
        heading: "Meals crews actually finish",
        paragraphs: [
          "Chili and jambalaya win because they are spoon food with obvious doneness. Cobblers win because they feel like an event without extra work.",
          "Skip delicate fish in a Dutch oven on a busy shift — broth splatter and timing are not worth the risk.",
        ],
      },
    ],
    mealRecommendations: [
      meal("jambalaya", "Cajun Jambalaya for the Hall", "One-pot Dutch oven hero."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Beans and beef — classic."),
      meal("beef-barley-soup", "Beef Barley Soup", "Slow simmer — filling."),
      meal("shepherds-pie", "Shepherd's Pie", "Potato cap — tray friendly."),
    ],
    faqs: [
      {
        question: "What meals work best in a Dutch oven at the station?",
        answer:
          "Chili, jambalaya, and braised stews — spoon food with obvious doneness that doesn't need precision plating. Cobblers are a good outdoor pick too since they feel like an event without much extra work.",
      },
      {
        question: "Can you cook Dutch oven meals indoors instead of over coals?",
        answer:
          "Yes — treat it like a heavy casserole dish and use the station oven. You lose some of the campfire romance but gain faster, more predictable cleanup, which matters more on a weeknight than a training day.",
      },
    ],
    relatedArticleSlugs: ["best-firefighter-crockpot-meals"],
  }),

  buildSeoGuide({
    slug: "one-pot-firehall-meals",
    title: "One-Pot Firehall Meals",
    subtitle: "Fewer dishes, fewer arguments, faster cleanup",
    description:
      "One-pot firehall meals: jambalaya, chicken and rice, chili, and skillets that keep the crew fed and the sink empty.",
    keywords: ["one pot firehall meals", "one pot firefighter dinner", "single pot crew meal"],
    intro:
      "Cleanup drives what halls cook more than cookbooks admit. One-pot firehall meals trade a little browning glamour for dishes that fit in one sink. On busy nights, that trade is always worth it.",
    practicalAdvice: [
      "Brown in the pot before liquid — always.",
      "Add a splash of stock or water to the hot pan and scrape up the browned bits stuck to the bottom — free flavor.",
      "Serve from the pot or one large container — not twelve individual pans.",
    ],
    sections: [
      {
        id: "types",
        heading: "Skillet vs Dutch oven vs deep pot",
        paragraphs: [
          "Skillets for fast. Dutch ovens and stock pots for simmer. Pick one vessel and commit — do not migrate mid-recipe.",
        ],
      },
      {
        id: "cleanup",
        heading: "Cleanup is the real win",
        paragraphs: [
          "One pot means one soak. Assign washer before you start cooking — otherwise the cook owns dishes and morale drops.",
        ],
      },
    ],
    mealRecommendations: [
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Hall rookie classic."),
      meal("jambalaya", "Cajun Jambalaya for the Hall", "Deep pot — big flavor."),
      meal("big-chili", "Firehall Chili", "One deep pot — holds hot across the shift."),
      meal("sausage-peppers-onions", "Sausage Peppers and Onions", "Skillet one-pan — low dish count."),
      meal("pad-thai", "Hall Rush Pad Thai", "One wok finish — one wash."),
    ],
    faqs: [
      {
        question: "What are the best one-pot meals for a fire station kitchen?",
        answer:
          "Jambalaya, chicken and rice, and firehall chili — all built in a single pot or skillet so there's one thing to soak afterward instead of a stack of pans. Brown the protein in the pot first, then build the rest of the dish on top of that flavor.",
      },
      {
        question: "Why do one-pot meals work so well for busy shifts?",
        answer:
          "Cleanup drives more of what halls cook than most people admit. A one-pot meal means one soak and one washer assigned before cooking starts — not the cook stuck doing dishes after everyone else has left the kitchen.",
      },
    ],
    relatedArticleSlugs: ["easy-firehall-pasta-recipes"],
  }),
];
