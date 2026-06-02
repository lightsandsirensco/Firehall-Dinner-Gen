/**
 * Cornerstone blog content — shareable hall culture guides at /blog/{slug}.
 */

import { buildSeoGuide, meal, STANDARD_FAQS } from "./seo-article-build.js";

export const CORNERSTONE_BLOG_ARTICLES = [
  buildSeoGuide({
    slug: "10-classic-firehall-meals",
    seoTitle: "10 Classic Firehall Meals Firefighters Actually Cook",
    title: "10 Classic Firehall Meals Firefighters Actually Cook",
    subtitle: "The same ten dinners on the Classics Wheel — built for real shift timing",
    description:
      "A practical list of classic firehall meals, from jerk chicken and rice and peas to chili, steak sandwiches, BBQ chicken mac and cheese, and more.",
    keywords: [
      "classic firehall meals",
      "firefighter meals",
      "fire station food",
      "classics wheel",
      "firefighter dinner ideas",
    ],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    readMinutes: 8,
    intro:
      "When the whiteboard says \"dinner?\" and nobody wants to think, halls reach for the same short list. These ten are the Classics Wheel lineup — jerk, BBQ mac, steak sandwiches, smash burgers, parm, pulled pork, chili with garlic bread, caesar, beef dip, and street tacos. Not food-blog experiments. Meals that hold on low, feed staggered eaters, and still taste right after a run.",
    practicalAdvice: [
      "Pick one line meal, one tray bake, and one pot — that covers most weeks without burning out the cook.",
      "Post protein and hold time on the board before tones; the next cook should not guess what \"almost done\" meant.",
      "Spin the Classics Wheel at /wheel when the crew cannot agree — same ten meals, zero debate spiral.",
    ],
    sections: [
      {
        id: "why-ten",
        heading: "Why these ten and not twenty",
        paragraphs: [
          "A longer list looks impressive on paper and useless at 17:15. We trimmed to the meals firefighters actually repeat: formats that scale to six or twelve, survive interrupted prep, and do not need a pastry chef on duty.",
          "Every recipe below links to crew-sized steps on this site — portions, timing, and notes written for a shared kitchen, not a home stove.",
        ],
      },
      {
        id: "wheel",
        heading: "Same picks as the Classics Wheel",
        paragraphs: [
          "The wheel at /wheel spins these exact slugs. If your hall already trusts the wheel, this article is the cheat sheet — open a recipe, shop once, cook once.",
          "New cook on the line? Start with pulled pork or smash burgers. Training night with seniors watching? Chili and garlic bread forgives a late return from the apparatus floor.",
        ],
      },
      {
        id: "tonight",
        heading: "How to run one tonight",
        paragraphs: [
          "Read the full recipe before you shop — not just the title. Check headcount, gear, and whether you need a line or a single hotel pan.",
          "Assign one cook and one runner. Everyone else stays out of the kitchen until called. Sauces and buns on the side keep reheat from turning mushy for post-call eaters.",
        ],
      },
    ],
    mealRecommendations: [
      meal(
        "jerk-chicken",
        "Jerk Chicken & Rice and Peas",
        "Grill-night heat with coconut rice — charred thighs, island sides, feeds eight without a fussy pass.",
      ),
      meal(
        "bbq-chicken-mac-and-cheese",
        "BBQ Chicken Mac and Cheese",
        "Smoky shredded chicken folded into baked mac — tray comfort when the hall wants calories and zero drama.",
      ),
      meal(
        "steak-sandwiches",
        "Steak Sandwiches",
        "Sliced sirloin on toasted buns with fries and salad — flat-top speed, handheld portions, line-friendly.",
      ),
      meal(
        "smash-burgers",
        "Smash Burgers",
        "Double patties, lacy edges, potato buns — loud flat-top night everyone recognizes.",
      ),
      meal(
        "chicken-parm",
        "Chicken Parmesan",
        "Breaded cutlets, red sauce, melted cheese, pasta — Italian night that forgives rookie timing.",
      ),
      meal(
        "pulled-pork",
        "Pulled Pork Sandwiches",
        "Low-stress once the pork is done — buns and slaw do the portion work on the line.",
      ),
      meal(
        "chili-garlic-bread",
        "Firehall Chili & Garlic Bread",
        "Smoky beef chili with cheesy garlic pull-apart — the pot waits when tones drop mid-prep.",
      ),
      meal(
        "chicken-caesar",
        "Chicken Caesar Salad",
        "Grilled chicken over big romaine bowls — lighter night that still feels like a real feed.",
      ),
      meal(
        "beef-dip",
        "Beef Dip Sandwiches",
        "Au jus on the counter, pile of beef, soft rolls — Canadian hall legend, dip mandatory.",
      ),
      meal(
        "steak-tacos",
        "Street-Style Chimichurri Steak Tacos",
        "Charred steak, bright chimichurri, pickled onions — taco line energy without a rice side distraction.",
      ),
    ],
    faqs: [
      {
        question: "Are these the same meals on the Classics Wheel?",
        answer:
          "Yes. Same ten slugs, same recipes. Use the wheel when you want random; use this list when you want to pick deliberately.",
      },
      {
        question: "What if we only have four on duty tonight?",
        answer:
          "Each recipe scales — open the page, set your crew size, and follow the portions. Line meals like tacos and sandwiches stretch easiest when eaters trickle in.",
      },
      STANDARD_FAQS.catalog,
      STANDARD_FAQS.generator,
    ],
    relatedArticleSlugs: [
      "legendary-firehall-meals",
      "meals-every-firefighter-knows",
      "most-popular-firefighter-meals",
    ],
  }),

  buildSeoGuide({
    slug: "most-popular-firefighter-meals",
    seoTitle: "20 Most Popular Firefighter Meals for Station Kitchens",
    title: "20 Most Popular Firefighter Meals",
    subtitle: "What crews actually cook — not what sounds good in a survey",
    description:
      "The 20 most popular firefighter meals in station kitchens: big batches, line meals, and crew feeds that scale to 6–12 and survive interrupted dinners.",
    keywords: [
      "most popular firefighter meals",
      "fire station meals",
      "firehall dinner ideas",
      "crew meals",
      "feed a fire crew",
    ],
    topic: "meal_planning",
    pillar: "recipes_meals",
    readMinutes: 11,
    intro:
      "Popular firefighter meals share the same DNA: they feed six to twelve without a catering budget, survive tones mid-cook, and do not require everyone to eat at the same minute. This list is what we see on whiteboards and group chats — batch pots, sheet pans, lines, and handhelds that crews actually finish.",
    practicalAdvice: [
      "Round up on starches and lines before you cheap out on protein — hungry crews notice bread and rice first.",
      "Pick one hold-friendly format when the board feels loud — chili beats seared fish on busy nights.",
      "Post allergens on the line once — saves ten conversations during the meal.",
    ],
    sections: [
      {
        id: "why-popular",
        heading: "Why firefighters love these meals",
        paragraphs: [
          "Volume, flavor, and forgiveness. A popular hall meal still eats well at lukewarm, portions fast, and leaves room for seconds without recooking. Nobody wants a beautiful plate that dies the minute the tones drop.",
        ],
      },
      {
        id: "prep",
        heading: "Prep practicality on shift",
        paragraphs: [
          "The meals below split into three hall formats: batch and hold (chili, pulled pork), oven hands-off (lasagna, enchilada bake), and lines (tacos, bowls, potato bar). Match the format to your clock — not your ambition.",
          "Buy pre-cut veg when labor matters more than cost. On a busy night, fajita strips from the bag beat a hero knife session.",
        ],
      },
      {
        id: "crew-size",
        heading: "Crew-size and interruption math",
        paragraphs: [
          "Plan for everyone on duty plus one floater from a neighboring rig. Batch meals need a deep pot or two hotel pans — not a home-sized Dutch oven pretending it is enough.",
          "If you expect calls during dinner, avoid meals with a thirty-second finish window. Choose food that waits: pulled pork, baked pasta, rice bowls with protein held separately.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Most halls run a taco line monthly — fast custom plates, easy scale, broad appeal."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Top pot meal — cheap stretch, holds for late eaters, tops dogs and potatoes day two."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Feeds a crowd from one shoulder — buns portion for you, sauce on the side."),
      meal("smash-burgers", "Double Smash Burgers", "Flat-top speed — eight burgers faster than eight plated steaks."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Oven batch — one cut, many plates, minimal active time once it is in."),
      meal("chicken-parm", "Chicken Parm", "Crowd Italian — cutlets in pans, cheese melts, crew eats family-style."),
      meal("sheet-pan-fajitas", "Sheet Pan Fajitas", "One pan protein and peppers — tortillas turn it into a line."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Rookie-friendly batch — one pot, predictable timing, easy cleanup."),
      meal("buffalo-chicken-dip", "Buffalo Chicken Dip", "Game-day share — stays hot in a low oven, chips do the work."),
      meal("loaded-baked-potato-bar", "Loaded Baked Potato Bar", "Self-serve — baked potatoes hold in warmers while toppings stay cold."),
      meal("sunday-chili-batch", "Sunday Batch Chili", "Weekend batch — same chili logic, bigger pot, slower shift pace."),
      meal("enchilada-casserole", "Enchilada Casserole", "Stack-and-bake — feeds heavy, slices like lasagna, mild by default."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "Bowl line — rice base, protein, veg, sauce — everyone builds their ratio."),
      meal("bbq-chicken-bowls", "BBQ Chicken Bowls", "Line bowls — grilled or roasted chicken over rice with sharp slaw."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Flat-top cheesesteak without the food-truck wait — feeds fast."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Handheld stagger eating — griddle in batches, slice into wedges."),
      meal("game-day-nachos", "Game Day Nachos", "Sheet nachos — build layers, broil, feed the couch crew at the hall."),
      meal("pork-carnitas-tacos", "Pork Carnitas Tacos", "Crisp-edged pork — line tacos with bold flavor, holds in a warmer."),
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "Comfort anchor — pairs with anything grilled or smoked."),
      meal("slider-bar", "Slider Bar Night", "Mini sandwiches — two proteins, one line, fast second helpings."),
    ],
    faqs: [
      {
        question: "How much food do I need for a typical firehall dinner?",
        answer:
          "Start with one pound of raw protein per three to four eaters for mixed plates, closer to one pound per three for burgers and sandwiches. Starches are cheap insurance — extra rice, bread, or tortillas fix hungry crews without a second main.",
      },
      {
        question: "What meals hold up best if tones drop during dinner?",
        answer:
          "Chili, pulled pork, baked pasta, and line meals with components held separately. Avoid crispy-only mains that turn soggy in a warmer — fry to order or serve sauce on the side.",
      },
      {
        question: "Are these meals only for big career halls?",
        answer:
          "No — volunteer and combination halls run the same formats with smaller pots. Scale down the batch, keep the format. A taco line for six beats a fragile plated dinner for six.",
      },
      STANDARD_FAQS.catalog,
    ],
    relatedArticleSlugs: [
      "10-classic-firehall-meals",
      "feeding-a-firehall-crew",
      "25-firefighter-dinner-ideas",
    ],
  }),

  buildSeoGuide({
    slug: "firefighter-breakfast-guide",
    seoTitle: "Firefighter Breakfast Guide: 10 Hall Morning Meals",
    title: "The Firefighter Breakfast Guide",
    subtitle: "Sunday mornings, post-call fuel, and feeding a crew that eats in waves",
    description:
      "Firefighter breakfast guide for station mornings: why the meal matters, weekend hall culture, feeding large crews, and ten hall-tested breakfasts with crew-sized recipes.",
    keywords: [
      "firefighter breakfast",
      "fire station breakfast",
      "firehall breakfast",
      "Sunday breakfast shift",
      "crew breakfast",
    ],
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 10,
    intro:
      "Breakfast at the hall is more than calories — it is the table where the crew lands before the day gets loud. Coffee, eggs, something sizzling on the flat-top, guys giving each other a hard time while the news plays in the background. A good firefighter breakfast feeds people who eat at 07:00 and people who wander in at 09:30 after apparatus checks. This guide covers why that meal matters, how Sunday tradition shows up in kitchens, and ten breakfasts that actually work on shift.",
    practicalAdvice: [
      "Run a line or a bake — not eight individual omelette orders unless someone volunteered their sanity.",
      "Cook bacon and sausage on sheet pans — controls splatter in a shared kitchen.",
      "Coffee owner is a real assignment — assign it before the eggs go on.",
    ],
    sections: [
      {
        id: "why-breakfast",
        heading: "Why breakfast matters on shift",
        paragraphs: [
          "Morning is when the crew syncs — who is tired, who is wired, who forgot lunch money. A real breakfast steadies the room before training, inspections, and whatever the board throws at you. It is also practical fuel: you may not get a proper sit-down meal again until dinner.",
          "Post-night-call breakfasts hit different. After a long run, hot food at the table beats protein bars in the rig bay. The meal does not need to be fancy — it needs to be hot, plentiful, and ready when people sit.",
        ],
      },
      {
        id: "sunday-culture",
        heading: "Weekend firehall breakfast culture",
        paragraphs: [
          "Lots of halls treat Sunday like pancake-and-egg day — slower start, more people in the kitchen, someone on coffee detail. It is part commissary, part tradition. The cook is often whoever got roped in last night, but the food still lands because the format is forgiving.",
          "Red lead skillets, big bakes, and burrito lines show up on Sundays because they feed the whole hall from one or two pans. That is the point — nobody should still be flipping single orders when the church bells stop and the tones might drop.",
        ],
      },
      {
        id: "large-crews",
        heading: "Feeding large crews in the morning",
        paragraphs: [
          "Count who is eating, then add two — visitors, training staff, the officer who smelled bacon from the office. Bakes and lines scale; made-to-order plates do not.",
          "Hold proteins warm in a low oven, keep cold toppings cold, and put tortillas in a warmer not a microwave stack. Staggered eating is normal — design for it.",
        ],
      },
    ],
    mealRecommendations: [
      meal(
        "sausage-egg-bake",
        "1. Sausage and Egg Bake",
        "Senior-cook eggs, sausage, and cheese in one hotel pan — the post-call showpiece.",
      ),
      meal(
        "breakfast-burrito-bar",
        "2. Hall Breakfast Burritos",
        "Wrap-and-go line — scramble, protein, cheese, salsa; handles staggered eaters.",
      ),
      meal(
        "french-toast-casserole",
        "3. Overnight French Toast Bake",
        "Prep the night before, bake in the morning — slice and feed without griddle chaos.",
      ),
      meal(
        "sausage-egg-bake",
        "4. Sheet Pan Breakfast Bake",
        "Eggs, cheese, and sausage from one pan — portion control built in.",
      ),
      meal(
        "breakfast-burrito-bar",
        "5. Hall Breakfast Wraps",
        "Warm tortilla line — lighter than burritos, still scales for eight-plus.",
      ),
      meal(
        "pancake-short-stack",
        "6. Firehall Pancakes",
        "Short stack held warm between waves — syrup on the table, not on the plates.",
      ),
      meal(
        "chorizo-breakfast-tacos",
        "7. Chorizo Breakfast Hash",
        "Crisp potato base with bold sausage — one skillet, big flavor, easy double batch.",
      ),
      meal(
        "bacon-egg-hash",
        "8. Loaded Breakfast Hash",
        "Bacon, potato, and egg in one pan — the everything-in-the-skillet morning feed.",
      ),
      meal(
        "biscuits-gravy",
        "9. Sausage Gravy and Biscuits",
        "Southern hall favorite — gravy hides timing mistakes if the biscuits are warm.",
      ),
      meal("breakfast-burrito-bar", "10. Breakfast Burrito Bar (Hall Classic)", "Golden-catalog line format — same burrito logic crews already know from dinner planning."),
    ],
    faqs: [
      {
        question: "What is the easiest breakfast for a rookie cook on Sunday?",
        answer:
          "Overnight French toast bake or a burrito line. Both forgive timing, scale cleanly, and do not require flipping twelve individual omelettes while the crew watches.",
      },
      {
        question: "How early should we start cooking for a big hall breakfast?",
        answer:
          "For a bake, prep the night before and start the oven sixty to seventy-five minutes before you want to eat. For a line, cook components in the hour before — assemble at the counter so latecomers still get hot food.",
      },
      {
        question: "Does breakfast matter on a busy shift?",
        answer:
          "Yes — even a simple line beats running empty until lunch. A fifteen-minute burrito assembly saves morale and keeps people from living on gas station pastries.",
      },
      STANDARD_FAQS.catalog,
    ],
    relatedArticleSlugs: [
      "firehall-breakfast-and-brunch",
      "firefighter-breakfast-ideas",
      "feeding-a-firehall-crew",
    ],
  }),

  buildSeoGuide({
    slug: "rookie-firefighter-meal-guide",
    seoTitle: "10 Rookie-Proof Firehall Meals | Firehall Meals",
    title: "10 Rookie-Proof Firehall Meals",
    subtitle: "Build confidence, feed the crew, and avoid the legendary kitchen disaster",
    description:
      "Ten rookie-proof firehall meals: chili, pulled pork, tacos, lasagna, and more — hard to ruin, crew-sized, with common mistakes and success tips for new firefighters cooking on shift.",
    keywords: [
      "rookie firefighter meals",
      "fire station cooking for beginners",
      "easy firehall meals",
      "first time cooking at the hall",
      "crew dinner rookie",
    ],
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 9,
    intro:
      "Every hall has a story about a rookie who burned the garlic or salted the chili twice. You will cook on shift — that is part of the job. These ten meals are hard to ruin, feed a crew, and build confidence without culinary school. Read the full recipe before you start, grab a partner your first time, and remember: the crew cares more about hot food and a clean kitchen than perfect plating.",
    practicalAdvice: [
      "Read the recipe end-to-end before you touch a knife — surprises mid-cook are how pans get burned.",
      "Taste and season in layers — salt at the start, acid at the finish.",
      "Start cleanup while things hold — leaving the kitchen a mess wipes out a good meal.",
      "Post who is cooking on the whiteboard so late eaters know what is holding warm.",
    ],
    sections: [
      {
        id: "pick-rookie",
        heading: "What makes a meal rookie-proof",
        paragraphs: [
          "Forgiving timing, simple ingredients, one main pot or line, and food that still eats well if someone shows up twenty minutes late. If the recipe dies the moment it sits, wait until you have a quiet board.",
          "Big chili is the usual first win — it simmers, forgives, and the toppings hide a lot. Hall taco bar night teaches line setup without a fragile finish. Save the brisket ego project for year two.",
        ],
      },
      {
        id: "partner",
        heading: "Cook with a partner the first time",
        paragraphs: [
          "One cook, one runner, one person reading the next step aloud. Ask whichever senior always runs chili to stand in the kitchen with you once — not to take over, just to catch you before you double the salt.",
          "Nobody expects a Michelin plate. They expect you to own cleanup when it is done. I have seen rookies save a salty batch with beans and broth and earn more respect than the guy who ordered pizza and left the boxes.",
        ],
      },
      {
        id: "recover",
        heading: "When dinner goes sideways",
        paragraphs: [
          "Own it early. Thin oversalted chili with more beans and stock. Order backup bread if the main is fine but light. Do not disappear after service — halls remember who stayed to scrub.",
          "Probe poultry and pork. Guessing is how you serve pink chicken and get roasted in the bay for a month. Empty the grease trap before slider night; keep the right extinguisher where the grill cook can see it.",
        ],
      },
    ],
    mealRecommendations: [
      meal(
        "big-chili",
        "1. Hall-Sized Beef and Bean Chili",
        "Simmers — season late so you do not oversalt before it reduces. Hold on low; toppings fix a lot.",
      ),
      meal(
        "pulled-pork",
        "2. Pulled Pork Sandwiches",
        "Pork forgives long holds. Rest before you shred; sauce on the side.",
      ),
      meal(
        "hall-taco-bar",
        "3. Hall Taco Bar Night",
        "Lay out cold toppings before the meat hits — assembly, not plating stress.",
      ),
      meal(
        "batch-lasagna",
        "4. Giant Batch Lasagna",
        "Oven does the work. Rest ten minutes before you cut or the slices slide.",
      ),
      meal(
        "chicken-parm",
        "5. Chicken Parm",
        "Sear cutlets in batches — crowding steams instead of browning.",
      ),
      meal(
        "beef-dip",
        "6. Beef Dip Sandwiches",
        "Rest the roast before slice. Warm au jus separate from the rolls.",
      ),
      meal(
        "breakfast-burrito-bar",
        "7. Breakfast Burrito Bar",
        "Warm tortillas first or they tear when the line rush hits.",
      ),
      meal(
        "beef-barley-soup",
        "8. Beef Barley Soup (Soup Night)",
        "Low simmer — boiling makes the meat tough. Taste before the final salt.",
      ),
      meal(
        "one-pot-chicken-rice",
        "9. One-Pot Chicken and Rice",
        "Set a timer; lifting the lid every two minutes turns rice mushy.",
      ),
      meal(
        "slider-bar",
        "10. Slider Bar Night",
        "Toast the buns. Two proteins max so you are not running three flat-tops.",
      ),
    ],
    faqs: [
      {
        question: "What should a rookie cook first at the hall?",
        answer:
          "Chili or a taco bar. Both teach batch thinking and line setup without a fragile finish. Cook alongside someone who has done it before — ask questions before the pot is on, not after.",
      },
      {
        question: "How do I recover if I mess up dinner?",
        answer:
          "Own it, fix what you can — thin salty chili with more beans and broth, order backup bread if the main is fine but light — and finish cleanup without being asked. Halls remember attitude more than one bad night.",
      },
      {
        question: "Should rookies avoid the grill and smoker?",
        answer:
          "Start on batches and lines. Move to grill night once you are comfortable with temps and probe checks. Pull pork and burgers are fine first grill projects with a partner; brisket can wait.",
      },
    ],
    relatedArticleSlugs: [
      "rookie-cooking-mistakes",
      "feeding-a-firehall-crew",
      "10-classic-firehall-meals",
    ],
  }),
];
