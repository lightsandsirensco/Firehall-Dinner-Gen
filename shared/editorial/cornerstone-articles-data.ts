/**
 * Cornerstone guides: the Classics Wheel companion, the most-cooked crew
 * dinners, and a first-time cook's starter list.
 */

import { SRC } from "./guide-sources.js";
import { buildSeoGuide, meal } from "./seo-article-build.js";

const UPDATED = "2026-10-03T18:00:00.000Z";

export const CORNERSTONE_BLOG_ARTICLES = [
  buildSeoGuide({
    slug: "10-classic-firehall-meals",
    seoTitle: "10 Classic Firehall Meals: Quantities and How to Cook Them",
    title: "10 Classic Firehall Meals Firefighters Actually Cook",
    subtitle:
      "The ten dinners on the Classics Wheel, with quantities for 8, the step that makes each one work, and which ones hold if dinner runs late.",
    description:
      "Ten classic firehall meals from the Classics Wheel, with quantities for 8, the technique that makes each work, and which hold if dinner runs late.",
    keywords: [
      "classic firehall meals",
      "classics wheel",
      "fire station dinner classics",
      "crew dinner recipes",
    ],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "The ten classic firehall meals on the Classics Wheel are jerk chicken with rice and peas, BBQ chicken mac and cheese, steak sandwiches, smash burgers, chicken parm, pulled pork, chili with garlic bread, chicken Caesar, beef dip and steak tacos. Each one feeds a crew of 8 from one or two pans without a fussy finish. Where they differ is how well they wait: chili and pulled pork hold for hours, while smash burgers and steak tacos need to be cooked when people sit down. On a night when calls are likely, that difference matters more than which dish you'd prefer.",
    sections: [
      {
        id: "at-a-glance",
        heading: "The ten at a glance: quantities for 8",
        paragraphs: [
          "Quantities are for 8 hungry adults with the usual sides. Active time is hands-on work; several of these have long unattended stretches in the oven or on the grill. The full recipe for each is linked below, with crew-size scaling.",
        ],
        table: {
          caption: "The ten Classics Wheel meals for 8 people",
          columns: ["Meal", "Main quantities for 8", "Active time", "Holds?"],
          rows: [
            ["Jerk chicken with rice and peas", "6 lb bone-in thighs, 3 cups rice, 1 can coconut milk, 1 can kidney beans", "40 min, plus marinating", "About 30 min, covered"],
            ["BBQ chicken mac and cheese", "3 lb chicken thighs, 1 1/2 lb pasta, 1 1/2 lb cheese", "45 min", "Well, covered in a low oven"],
            ["Steak sandwiches", "4 lb sirloin, 8 rolls, 2 onions", "30 min", "No; slice as you serve"],
            ["Smash burgers", "4 lb 80/20 ground beef as 16 balls, 8 buns", "25 min", "No; cook to order"],
            ["Chicken parm", "3 lb chicken breast as 8 cutlets, 2 lb pasta, 1 jar marinara, 1 lb mozzarella", "50 min", "About 20 min, uncovered"],
            ["Pulled pork", "5 lb bone-in pork shoulder, 12 buns, 1 cabbage for slaw", "30 min, plus 8 hours cooking", "Hours, in its juices"],
            ["Chili with garlic bread", "2 3/4 lb ground beef, 3 cans beans, 2 large cans crushed tomatoes, 2 loaves", "40 min, plus simmering", "Hours, on low"],
            ["Chicken Caesar", "3 lb chicken breast, 3 heads romaine, 1 cup Parmesan", "35 min", "Chicken holds; dress the salad at serving"],
            ["Beef dip", "4 lb sirloin tip or inside round roast, 8 rolls, 4 cups beef stock", "30 min, plus roasting", "Jus holds; slice the beef to order"],
            ["Steak tacos", "3 lb flank or skirt steak, 24 small tortillas", "30 min", "No; cook and slice last"],
          ],
        },
      },
      {
        id: "hold-or-order",
        heading: "Hold-friendly or cook-to-order",
        paragraphs: [
          "The ten split into two groups, and on any given night, which group to pick from matters more than which dish. Chili, pulled pork, BBQ chicken mac and cheese, and the jus for beef dip all hold for an hour or more with the heat on low and a lid on, so they suit nights when people may eat in waves. Chicken parm and jerk chicken hold for a shorter time before the coating softens or the chicken dries.",
          "Smash burgers, steak sandwiches, steak tacos and a dressed Caesar are best eaten within minutes. They are quick to cook but need someone at the griddle or grill at serving time. If the wheel lands on one of these on a night when people are likely to be late, cook the parts that hold (onions, sauces, toppings) and leave the meat until everyone is back.",
        ],
      },
      {
        id: "technique",
        heading: "The step that makes each one work",
        paragraphs: [
          "Each of these has one step that decides whether it comes out right. Get that step right and the rest of the recipe is forgiving. For safety, whole cuts of beef need 145°F (63°C) with a 3-minute rest under USDA guidance (Health Canada gives 145°F for medium-rare), ground beef 160°F (71°C), and chicken 165°F (74°C).",
        ],
        table: {
          caption: "The key step for each classic",
          columns: ["Meal", "The step that matters", "Why"],
          rows: [
            ["Jerk chicken", "Marinate at least 4 hours, then start over indirect heat and char at the end", "The marinade needs time to reach the meat; direct heat alone burns the outside first"],
            ["BBQ chicken mac and cheese", "Toss the chicken in sauce separately and fold it in at the end", "Acidic sauce stirred into the cheese sauce can make it grainy"],
            ["Steak sandwiches", "Rest the steak 5 to 10 minutes, then slice thin across the grain", "Short fibers make even a firmer cut tender to bite"],
            ["Smash burgers", "Smash hard within the first 30 seconds on a very hot griddle, then leave them alone", "Wide contact while the fat is cold builds the crust"],
            ["Chicken parm", "Bake breaded cutlets on a wire rack and put sauce under the cheese", "Air under the cutlet and cheese over the sauce keep the crust crisp"],
            ["Pulled pork", "Cook to about 200°F (93°C), well past any safe minimum", "Connective tissue needs the extra heat before the meat will pull"],
            ["Chili", "Brown the meat in batches and toast the spices in the fat", "Browning and toasted spices give it depth"],
            ["Chicken Caesar", "Dress the lettuce just before serving and keep croutons separate", "Dressing wilts romaine within about 20 minutes"],
            ["Beef dip", "Slice the roast paper-thin and build the jus from the pan drippings", "Thin slices soak up jus; drippings give it body"],
            ["Steak tacos", "Very high heat for a short time, then rest and slice across the grain", "Flank and skirt are tender only when sliced thin"],
          ],
        },
      },
      {
        id: "wheel",
        heading: "Using the list with the Classics Wheel",
        paragraphs: [
          "The wheel is for nights when the crew can't decide and nobody wants to argue about it; this list is for when you want to choose deliberately, usually because of the time available or how the night is likely to go. Both use the same ten recipes.",
          "A practical rule for the wheel is to allow one re-spin if it lands on a cook-to-order meal on a night when calls are likely, or on something that needs a long cook when there's less than an hour left. The recipe pages scale each dish to your crew size, so quantities for 4 or 12 are one click from the numbers above.",
        ],
      },
    ],
    practicalAdvice: [
      "Pick from the hold-friendly group (chili, pulled pork, BBQ chicken mac) on nights when people may eat late.",
      "Cook smash burgers, steak sandwiches and steak tacos last, once everyone is at the table.",
      "Rest steaks and roasts before slicing, and slice across the grain.",
      "Dress salads and add crisp toppings at serving time, not before.",
    ],
    mealRecommendations: [
      meal("jerk-chicken", "Jerk Chicken and Rice and Peas", "Bone-in thighs marinated ahead and finished over direct heat."),
      meal("bbq-chicken-mac-and-cheese", "BBQ Chicken Mac and Cheese", "A tray bake that holds covered in a low oven."),
      meal("steak-sandwiches", "Steak Sandwiches", "Sirloin sliced thin across the grain on toasted rolls."),
      meal("smash-burgers", "Smash Burgers", "Griddle burgers cooked to order in a few minutes each."),
      meal("chicken-parm", "Chicken Parmesan", "Cutlets baked on a rack so the crust stays crisp under the sauce."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "The most forgiving of the ten; holds for hours."),
      meal("big-chili", "Firehall Chili and Garlic Bread", "Holds on low for as long as the night needs."),
      meal("chicken-caesar", "Chicken Caesar Salad", "Grilled chicken with the salad dressed just before serving."),
      meal("beef-dip", "Beef Dip Sandwiches", "Thin-sliced roast beef with jus from the pan drippings."),
      meal("steak-tacos", "Chimichurri Steak Tacos", "Flank or skirt seared hot and sliced last."),
      meal("classic-patty-melt-for-the-crew", "Classic Patty Melt for the Crew", "Not on the wheel, but a griddle alternative to smash burgers."),
    ],
    faqs: [
      {
        question: "Are these the same meals as the Classics Wheel?",
        answer:
          "Yes. The first ten recipes here are the ten on the wheel. Use the wheel when you want a random pick and this list when you want to choose by time, crew size or how well a dish holds.",
      },
      {
        question: "Which classic firehall meals hold best if dinner runs late?",
        answer:
          "Chili, pulled pork and BBQ chicken mac and cheese hold for an hour or more, covered, on low heat or in a 200°F (95°C) oven. The jus for beef dip holds too, but slice the beef to order. Smash burgers, steak sandwiches, steak tacos and a dressed Caesar should be cooked or dressed when the crew sits down.",
      },
    ],
    relatedArticleSlugs: [
      "most-popular-firefighter-meals",
      "planning-tonights-station-dinner",
      "bbq-night-at-the-station",
    ],
    sources: [SRC.usdaTemps, SRC.hcTemps],
  }),

  buildSeoGuide({
    slug: "most-popular-firefighter-meals",
    seoTitle: "20 Most Popular Firefighter Meals, Grouped by Format",
    title: "20 Most Popular Firefighter Meals",
    subtitle:
      "The dinners crews cook most, grouped by format, with quantities for 10 for the top five and what makes each format work for a crew.",
    description:
      "The 20 most popular firefighter meals grouped by format, with quantities for 10, how well each holds, and why these dinners suit station crews.",
    keywords: [
      "most popular firefighter meals",
      "meals firefighters cook",
      "popular crew dinners",
    ],
    topic: "meal_planning",
    pillar: "recipes_meals",
    readMinutes: 9,
    updatedAt: UPDATED,
    intro:
      "The meals firefighters cook most are chili, tacos, burgers, pulled pork and baked pasta, followed by a familiar group of bakes, bowl lines and sheet-pan dinners. They keep coming back for practical reasons: they scale in one pot or pan, their parts can be held separately, a few extra minutes won't ruin them, and cheap starches fill out the plate. Group them by format (pot meal, bake, line, handheld or sheet pan) and you know most of what matters on a busy night, because the format decides how a dinner holds and how much last-minute cooking it needs.",
    sections: [
      {
        id: "by-format",
        heading: "The 20, grouped by format",
        paragraphs: [
          "Almost every popular crew dinner falls into one of five formats. Pot meals and oven bakes hold longest; lines handle mixed appetites and dietary needs best; handhelds are fastest but mostly need to be cooked close to serving; sheet-pan dinners and shareables sit in between. Knowing the format tells you most of what you need about timing and holding before you open the recipe.",
        ],
        table: {
          caption: "The 20 most popular crew dinners by format",
          columns: ["Format", "Meals", "Best when", "How it holds"],
          rows: [
            ["Pot meals", "Beef and bean chili, turkey chili, one-pot chicken and rice", "The night is unpredictable; 8 to 30 people", "Hours on low, covered"],
            ["Oven bakes", "Batch lasagna, enchilada casserole, baked mac and cheese, chicken parm", "You can assemble ahead", "30 to 60 minutes covered in a low oven"],
            ["Lines", "Taco bar, baked potato bar, teriyaki donburi, BBQ chicken bowls, slider bar", "Appetites and diets vary", "Components hold separately"],
            ["Handhelds", "Smash burgers, pulled pork, Philly cheesesteak skillet, quesadillas, carnitas tacos", "Time is short, or pulled pork was cooked ahead", "Pulled pork and carnitas hold; the rest are cook-to-order"],
            ["Sheet pan and shareables", "Sheet-pan fajitas, game-day nachos, buffalo chicken dip", "One oven and little time for dishes", "20 to 30 minutes; nachos only minutes"],
          ],
        },
      },
      {
        id: "why",
        heading: "Why these dinners keep coming back",
        paragraphs: [
          "The popular meals are the ones that don't get harder as the crew gets bigger. A pot of chili for 12 takes about the same effort as one for 6; a taco line takes a few more minutes to set up but the same cooking. Compare that with pan-seared fish or individually plated steaks, where each extra person adds another piece to cook at the last minute. Formats where the work stays roughly the same as the numbers grow win in a station kitchen.",
          "The second reason is forgiving doneness. Braised and simmered dishes, bakes and pulled meats are cooked well past the point where a few extra minutes matter, so a 20-minute delay doesn't ruin them. The third is that the meat, starch and sauce can be kept apart. On a line, tortillas, rice and toppings wait separately, so nothing goes soggy while people are late.",
        ],
      },
      {
        id: "top-five",
        heading: "Quantities for 10: the five most common",
        paragraphs: [
          "These are shopping amounts for 10 hungry adults for the five dinners crews cook most. They use the same per-person planning figures as the 10-person guide, which covers scaling in more detail.",
        ],
        table: {
          caption: "Shopping amounts for 10 people",
          columns: ["Dinner", "Protein", "Starch", "Also buy"],
          rows: [
            ["Taco bar", "3 1/2 lb (1.6 kg) ground beef", "30 small tortillas, 3 cups raw rice", "1 1/4 lb cheese, 3 cans beans, lettuce, tomatoes, salsa, sour cream"],
            ["Beef and bean chili", "3 1/2 lb (1.6 kg) ground beef", "2 loaves bread or 5 cups raw rice", "4 cans beans, 2 large cans crushed tomatoes, 2 onions, chili powder, cumin"],
            ["Batch lasagna", "2 lb (900 g) Italian sausage or beef", "1 1/2 lb (680 g) lasagna noodles", "3 jars marinara, 2 lb ricotta, 2 lb mozzarella, Parmesan"],
            ["Pulled pork", "6 lb (2.7 kg) bone-in pork shoulder", "15 buns", "1 cabbage for slaw, barbecue sauce"],
            ["Smash burgers", "5 lb (2.3 kg) 80/20 ground beef", "20 buns", "Cheese slices, onions, pickles, lettuce"],
          ],
        },
      },
      {
        id: "choosing",
        heading: "Choosing between them tonight",
        paragraphs: [
          "Choose the format first. With under 45 minutes, the handhelds and sheet-pan dinners are realistic. With an hour or more, the bakes. If the night is likely to be interrupted, choose a pot meal or a line, because both hold and let people eat when they can. If a few people on the crew have allergies or eat differently, a line solves it without cooking a second dinner.",
          "Rotation matters too. Many crews settle into the same four or five dinners; that is not a problem if the shopping and cooking get faster each time, but mixing in one different format a week keeps it from feeling repetitive. The planning guide covers the decision in more detail, including what to do when the meat is still frozen.",
        ],
      },
      {
        id: "better",
        heading: "Small changes that make the classics better",
        paragraphs: [
          "The popular meals get cooked so often that small improvements pay off. Brown ground meat harder and in batches, rather than stirring grey meat in a crowded pan. Toast burger and sandwich buns cut side down for a minute; they stay firmer under sauce. Salt pasta water until it tastes seasoned. Finish rich dishes with something sharp, such as pickled onions on pulled pork or tacos, or lime on chili. Rest roasts and steaks before slicing so the juices stay in the meat.",
        ],
      },
    ],
    practicalAdvice: [
      "Choose the format first: pot, bake, line, handheld or sheet pan.",
      "On unpredictable nights, choose pot meals or lines, which hold and let people eat when they can.",
      "Use a line when crew members have allergies or different diets.",
      "Brown meat in batches and toast the buns; both improve the most common dinners.",
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "The most common line meal; scales from 6 to 30."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "The standard pot meal; holds on low for hours."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "Cook ahead and reheat in its juices."),
      meal("smash-burgers", "Double Smash Burgers", "Fast on a griddle, cooked to order."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Assemble ahead and bake when the crew is close."),
      meal("chicken-parm", "Chicken Parm", "Cutlets baked on racks, sauce under the cheese."),
      meal("sheet-pan-fajitas", "Sheet Pan Fajitas", "Two pans in the oven, tortillas warming alongside."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "One pot, predictable timing."),
      meal("buffalo-chicken-dip", "Buffalo Chicken Dip", "A shareable that stays hot in a low oven."),
      meal("loaded-baked-potato-bar", "Loaded Baked Potato Bar", "Potatoes hold in the oven while toppings stay cold."),
      meal("turkey-chili", "Turkey Chili", "A leaner pot meal that holds like beef chili."),
      meal("enchilada-casserole", "Enchilada Casserole", "Stacks and slices like lasagna."),
      meal("teriyaki-donburi", "Teriyaki Donburi", "A rice bowl line with the sauce on the side."),
      meal("bbq-chicken-bowls", "BBQ Chicken Bowls", "Chicken over rice with a sharp slaw."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Thin-sliced beef cooked hot in batches."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Griddled in batches and cut into wedges."),
      meal("game-day-nachos", "Game Day Nachos", "Built in layers on sheet pans and broiled."),
      meal("pork-carnitas-tacos", "Pork Carnitas Tacos", "Braised ahead and crisped before serving."),
      meal("mac-and-cheese-bake", "Baked Mac and Cheese", "A side or a main that holds covered."),
      meal("slider-bar", "Slider Bar Night", "Two proteins on one line, with quick second helpings."),
    ],
    faqs: [
      {
        question: "What is the most common dinner cooked at fire stations?",
        answer:
          "There is no official count, but chili and taco nights come up in almost every station kitchen, with burgers, pulled pork and baked pasta close behind. They all scale easily, hold well or can be kept in separate parts, and rely on inexpensive starches.",
      },
      {
        question: "What is a good dinner for a fire station on a busy night?",
        answer:
          "A pot meal or a line. Chili, one-pot chicken and rice, or a taco bar with the meat held on low all wait for an interrupted crew and let people eat when they get back. Avoid anything cooked to order, like smash burgers or steak, unless the crew is already at the table.",
      },
    ],
    relatedArticleSlugs: [
      "10-classic-firehall-meals",
      "planning-tonights-station-dinner",
      "cooking-for-10-firefighters",
      "feeding-a-firehall-crew",
    ],
    sources: [SRC.usdaTemps, SRC.hcTemps],
  }),

  buildSeoGuide({
    slug: "rookie-firefighter-meal-guide",
    seoTitle: "10 Rookie-Proof Firehall Meals for a First-Time Crew Cook",
    title: "10 Rookie-Proof Firehall Meals",
    subtitle:
      "Ten crew dinners that are hard to ruin, a plan for your first cook, and what each meal teaches you about cooking at crew scale.",
    description:
      "Ten rookie-proof firehall meals for a first-time crew cook: forgiving dishes, a step-by-step plan for your first dinner, and the skill each one teaches.",
    keywords: [
      "rookie firefighter meals",
      "easy meals for a crowd",
      "first time cooking for a crew",
      "easy firehall meals",
      "beginner crowd recipes",
    ],
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 8,
    updatedAt: UPDATED,
    intro:
      "For your first cook for the crew, pick chili, a taco bar or pulled pork. Like the other rookie-proof meals here, they are hard to ruin: a few extra minutes won't overcook them, they cook in one pot, tray or line, and they still taste good if people come to the table late. Each also teaches a skill you'll use on harder dishes, such as browning in batches, seasoning a big pot, or getting several components to finish together. Most first-time problems are planning problems: starting too late, missing an ingredient, or running out of pan space.",
    sections: [
      {
        id: "forgiving",
        heading: "What makes a meal hard to ruin",
        paragraphs: [
          "Forgiving meals have a wide window between done and overdone. A braise, a pot of chili or a tray of lasagna is fine at 2 hours or 2 1/2, and fine eaten at 18:00 or 18:40. A seared steak or a piece of fish is right for a minute or two, which is a hard target the first time you cook for 10. Forgiving meals also cook in one vessel or as a line, so there's one thing to watch rather than four, and the pieces that could go soggy stay separate until serving.",
          "Save the smoker, the fryer and anything cooked to order for later. Start with dishes that simmer, bake or braise, and build up to the griddle once you're comfortable timing a meal.",
        ],
      },
      {
        id: "first-cook",
        heading: "A plan for your first crew dinner",
        paragraphs: [
          "The most common first-cook problems are starting too late, discovering a missing ingredient halfway, and running out of pan space. A short plan heads off all three. If you can, cook the first one with someone who has done it before; ask them to stay nearby rather than take over.",
        ],
        steps: [
          "Read the whole recipe, including the method, before you shop, and note every pan and appliance it needs.",
          "Check crew size and scale the recipe on its page. Buy a little extra starch rather than extra protein.",
          "Write down the serving time and count back to your start time. Add 20 minutes, because first cooks run long.",
          "Prep everything before you turn on the heat: chop, measure spices, open cans.",
          "Brown meat in batches with space between pieces, and use two pans instead of one crowded one.",
          "Taste before serving and adjust salt and acid. Check meat and poultry with a thermometer.",
          "Start cleanup while the dish simmers or bakes, so the pile at the end is small.",
        ],
      },
      {
        id: "skills",
        heading: "What each meal teaches",
        paragraphs: [
          "Working through the list roughly in order builds the skills needed for most crew cooking. None of these dishes needs special equipment beyond a large pot, a sheet pan and a 9 x 13 in baking dish.",
        ],
        table: {
          caption: "The skill each rookie-proof meal teaches",
          columns: ["Meal", "Skill it teaches", "The thing to watch"],
          rows: [
            ["Beef and bean chili", "Browning in batches and seasoning a big pot", "Hold back some salt until the end; canned goods vary and the pot reduces"],
            ["Pulled pork", "Low-and-slow cooking to a target temperature", "Cook to about 200°F (93°C) so it pulls; rest before shredding"],
            ["Taco bar", "Setting up and running a line", "Put out cold toppings before the meat is done"],
            ["Batch lasagna", "Assembling ahead and baking a deep tray", "Rest 15 minutes before cutting or the slices slide"],
            ["Chicken parm", "Breading and baking cutlets evenly", "Bake on a rack at 425°F (220°C) until 165°F (74°C)"],
            ["Beef dip", "Roasting and resting a whole cut", "Rest 15 minutes, then slice thin across the grain"],
            ["Breakfast burritos", "Cooking eggs and fillings in batches", "Warm tortillas first so they fold without tearing"],
            ["Beef barley soup", "Simmering gently without boiling", "A hard boil toughens the beef; keep a bare simmer"],
            ["One-pot chicken and rice", "Liquid ratios and leaving the lid on", "Don't lift the lid for the 18 to 20 minute cook"],
            ["Slider bar", "Timing two proteins on one line", "Toast the buns; keep to two proteins"],
          ],
        },
      },
      {
        id: "fixes",
        heading: "Quick fixes when something goes wrong",
        paragraphs: [
          "Most first-cook problems can be fixed before the food reaches the table. Too salty: add more of the unsalted base (another can of beans and tomatoes to chili, more unsalted stock to soup) rather than water alone, which thins the flavor. Too thin: simmer uncovered for 10 to 15 minutes, or stir in a slurry of 1 tbsp cornstarch per cup of liquid mixed with cold water and bring it back to a simmer. Bland: add salt first, then a squeeze of lemon or a splash of vinegar.",
          "If the bottom of a pot scorches, stop stirring and move the unburned food to a clean pot without scraping the bottom. If chicken is underdone at the center, put it back in the oven and check it again in 5 to 10 minutes. If everything is running late, serve the parts that are ready and hold the rest covered. The common-mistakes guide covers these and others in more detail.",
        ],
      },
    ],
    practicalAdvice: [
      "Start with dishes that simmer, bake or braise; leave cook-to-order meals for later.",
      "Read the full recipe before shopping and add 20 minutes to your first timeline.",
      "Prep everything before the heat goes on, and brown meat in batches.",
      "Check meat and poultry with a thermometer rather than by the clock.",
      "Start cleaning while the dish cooks.",
    ],
    mealRecommendations: [
      meal("big-chili", "1. Hall-Sized Beef and Bean Chili", "Simmers for as long as you need; season late so it doesn't end up too salty."),
      meal("pulled-pork", "2. Pulled Pork Sandwiches", "Very forgiving: cook it to temperature, rest it, shred it."),
      meal("hall-taco-bar", "3. Hall Taco Bar Night", "Teaches line setup without a fragile finish."),
      meal("batch-lasagna", "4. Giant Batch Lasagna", "The oven does the work; rest before cutting."),
      meal("chicken-parm", "5. Chicken Parm", "Bread in an assembly line and bake on racks."),
      meal("beef-dip", "6. Beef Dip Sandwiches", "Roast, rest, and slice thin; the jus holds on low."),
      meal("hall-breakfast-burritos", "7. Hall Breakfast Burritos", "Eggs and fillings on sheet pans; warm the tortillas first.", "breakfast"),
      meal("beef-barley-soup", "8. Beef Barley Soup", "A gentle simmer; taste before the final salt."),
      meal("one-pot-chicken-rice", "9. One-Pot Chicken and Rice", "Set a timer and leave the lid on."),
      meal("slider-bar", "10. Slider Bar Night", "Two proteins and toasted buns on one line."),
    ],
    faqs: [
      {
        question: "What should I cook the first time I cook for the crew?",
        answer:
          "Chili or a taco bar. Both are forgiving, feed any crew size, and teach the basics of browning in batches and setting up a line. Read the recipe fully, prep everything before you start, and give yourself an extra 20 minutes.",
      },
      {
        question: "How do you fix chili or soup that is too salty?",
        answer:
          "Add more of the unsalted base: another can of beans and tomatoes to chili, or more unsalted stock and vegetables to soup, then simmer to bring it back together. Water alone thins the flavor along with the salt. A squeeze of lime or a splash of vinegar won't remove salt, but it makes a salty dish taste more balanced.",
      },
    ],
    relatedArticleSlugs: [
      "rookie-cooking-mistakes",
      "cooking-for-10-firefighters",
      "10-classic-firehall-meals",
      "firehall-kitchen-culture",
    ],
    sources: [SRC.usdaTemps, SRC.hcTemps],
  }),
];
