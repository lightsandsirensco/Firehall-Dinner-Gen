/**
 * Editorial guides — source of truth. Run `npm run content:generate-guides` to publish JSON.
 */

import type { EditorialArticle } from "./content-schema.js";
import { NUTRITION_PERFORMANCE_ARTICLES } from "./nutrition-articles-data.js";
import { OPERATIONS_HOWTO_ARTICLES } from "./operations-articles-data.js";
import { SEO_TRAFFIC_ARTICLES } from "./seo-articles-data.js";
import { STATION_LIFESTYLE_ARTICLES } from "./lifestyle-articles-data.js";
import { HEALTHY_HALL_SMOOTHIES_ARTICLE } from "./smoothie-guide-article.js";
import { CORNERSTONE_BLOG_ARTICLES } from "./cornerstone-articles-data.js";

const PUBLISHED = "2026-05-27T12:00:00.000Z";

const CORE_EDITORIAL_ARTICLES: EditorialArticle[] = [
  {
    slug: "feeding-a-firehall-crew",
    title: "How to Feed a Firehall Crew Without Losing the Shift",
    seoTitle: "Firefighter Meals: Feed a Firehall Crew on Shift",
    subtitle: "Scaling, timing, and station-kitchen reality — not food-blog fantasy",
    description:
      "Firefighter meals for a full crew on shift: portion math, hold times, line setup, and hall-tested recipes that survive tones dropping mid-dinner.",
    topic: "shift_operations",
    pillar: "operations_how_to",
    readMinutes: 8,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: [
      "firefighter meals",
      "firehall meals",
      "feed a crew",
      "fire station meals",
      "crew dinner",
    ],
    intro:
      "Feeding a hall is not the same as cooking dinner at home. You are planning for mixed appetites, uneven arrival times, and the very real chance that tones drop mid-prep. The goal is not a perfect plate — it is a reliable spread that still tastes good when someone eats at 7:10 and someone else eats at 8:45. This is how crews actually run dinner on shift.",
    practicalAdvice: [
      "Cook the protein and starch as separate anchors so you can hold, reheat, or scale without starting over.",
      "Set up a self-serve line when possible — it cuts complaints and speeds second helpings.",
      "Plan one 'always ready' side (bread, rice, or salad) that can sit while the main finishes.",
      "If you expect a busy night, pick a recipe with a 15-minute 'good enough' checkpoint, not an all-or-nothing finish.",
      "Label allergens and spice level on the line — it prevents the 'what's in this?' loop during the meal.",
    ],
    sections: [
      {
        id: "crew-size",
        heading: "Start with honest crew size",
        paragraphs: [
          "Most station meals land between six and twelve people eating, but you should cook for the people who actually show — plus one or two floaters from neighboring companies. Round up on starches before you round up on expensive protein.",
          "A practical rule on our hall: one pound of raw protein per three hungry firefighters for handhelds (burgers, sandwiches), and one pound per four for mixed plates (bowls, pasta bakes). Adjust down only if you know the crew is eating elsewhere.",
        ],
        tips: [
          "Count who is on duty at 17:00, not who was on the board at 08:00.",
          "Keep a backup frozen protein in the freezer for surprise visitors.",
        ],
      },
      {
        id: "timing",
        heading: "Cook for interruption, not for applause",
        paragraphs: [
          "The best firehall meals have a window where they are 'done enough' to eat but not ruined if they sit twenty minutes. Chili, sheet-pan chicken, pulled pork, and casserole bakes tolerate delay better than seared fish or crispy tempura.",
          "Build prep so the last ten minutes are assembly, not panic. If tones drop at minute forty, you should still have something edible when you return — not a burned skillet and a cold oven.",
        ],
      },
      {
        id: "line-setup",
        heading: "Run the line like a small incident",
        paragraphs: [
          "Assign one cook, one runner, one cleanup lead. Everyone else stays out of the kitchen unless called. Chaos in a station kitchen is how people get burned and meals get oversalted by committee.",
          "Put hot food hot, cold food cold, and sauces on the side. Sauces on the side save diets, spice tolerance, and leftovers.",
        ],
      },
    ],
    mealRecommendations: [
      {
        slug: "big-chili",
        title: "Big Chili Batch",
        blurb: "Holds on the stove, scales clean, and still eats well after a call.",
      },
      {
        slug: "hall-taco-bar",
        title: "Hall Taco Bar",
        blurb: "Self-serve line — people build what they want, when they show up.",
      },
      {
        slug: "batch-lasagna",
        title: "Giant Batch Lasagna",
        blurb: "Oven does the work; slice and feed when the crew trickles in.",
      },
      {
        slug: "sheet-pan-fajitas",
        title: "Sheet Pan Fajitas",
        blurb: "One pan, fast cleanup, easy to rewarm on the flat-top.",
      },
    ],
    faqs: [
      {
        question: "How much food should I make for a firehall crew?",
        answer:
          "Plan for everyone on duty plus one or two extras. For mixed plates, about ¼ to ⅓ lb raw protein per person is a solid starting point; for sandwiches and burgers, go closer to ⅓ lb. Starches are cheap insurance — rice, pasta, or bread fix 'still hungry' without cooking a second main.",
      },
      {
        question: "What meals hold up best if we get a call during dinner?",
        answer:
          "Batches and braises: chili, pulled pork, baked pasta, rice bowls with protein on the side. Avoid meals that die on the pass — crispy fried chicken, medium-rare steaks held too long, anything that needs a last-second sear for texture.",
      },
      {
        question: "Should we do plated dinners or a line?",
        answer:
          "For crews over six, a line almost always wins. It reduces waste, handles late eaters, and keeps the kitchen from becoming a traffic jam when second shift wanders in.",
      },
    ],
    relatedArticleSlugs: ["planning-tonights-station-dinner", "quick-meals-between-calls"],
  },
  {
    slug: "quick-meals-between-calls",
    title: "Quick Firefighter Meals Between Calls",
    subtitle: "When the shift is hot and dinner cannot be a two-hour project",
    description:
      "Operational guide to fast fire station meals: what to cook when time is tight, how to cheat smart, and recipe picks under 45 minutes.",
    topic: "shift_operations",
    pillar: "recipes_meals",
    readMinutes: 7,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["quick firefighter meals", "busy shift dinner", "firehall dinner ideas", "fast crew meals"],
    intro:
      "Some nights the board is quiet until it is not. You do not need a lecture about meal prep — you need a dinner that respects the clock. Quick firehall meals are not 'lazy'; they are operational. The trick is picking formats that taste like you meant it, not like you gave up.",
    practicalAdvice: [
      "Use high-heat tools you already trust: flat-top, air fryer, ripping-hot oven — not a new technique on a busy night.",
      "Buy pre-cut vegetables when the labor savings beat the cost (fajitas, stir-fry, sheet pan).",
      "Default to one-pan or one-pot formats — fewer dishes means faster turn-around for the next run.",
      "Keep a hall stash: taco shells, burger buns, rice, frozen protein, quality jarred sauce.",
      "If you are under 30 minutes, do not launch a recipe with a long rest or multi-stage bake.",
    ],
    sections: [
      {
        id: "formats",
        heading: "Formats that actually finish on time",
        paragraphs: [
          "Skillet meals, sheet-pan dinners, and handhelds (tacos, burgers, quesadillas) are the backbone of quick shift cooking. They hit hot, portion fast, and do not require plating finesse.",
          "Pasta is underrated for speed if you sauce in the same pan and accept a slightly less Instagram final toss. Crews care about flavor and volume, not swirl geometry.",
        ],
      },
      {
        id: "cheats",
        heading: "Cheats that crews respect",
        paragraphs: [
          "Rotisserie chicken is not a failure — it is resource management. Shred it for tacos, bowls, or soup and add one fresh element (lime, cilantro, pickled onion) so it tastes intentional.",
          "Frozen fries in the air fryer plus a real protein is a legitimate meal when the alternative is gas station pizza.",
        ],
        tips: [
          "Season at every layer — salt in the pan, acid at the end.",
          "One bold flavor (chipotle, garlic butter, lemon) beats five mild ones.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "fast-philly-skillet", title: "Fast Philly Cheesesteak Skillet", blurb: "Flat-top friendly, feeds fast, tastes like effort." },
      { slug: "garlic-butter-shrimp", title: "Garlic Butter Shrimp", blurb: "Minutes on heat — pair with bread or rice." },
      { slug: "five-ingredient-pasta", title: "Garlic Butter Pasta", blurb: "Pantry pasta when the shift needs food now." },
      { slug: "one-pot-chicken-rice", title: "One-Pot Chicken and Rice", blurb: "Minimal dishes, predictable timing." },
      { slug: "chicken-quesadillas", title: "Chicken Quesadillas", blurb: "Handheld line — great when people eat staggered." },
      { slug: "pad-thai", title: "Firehall Pad Thai", blurb: "High flavor, wok-or-skillet fast finish." },
      {
        slug: "hall-blt-sandwich-feed",
        title: "Hall BLT Sandwich Feed",
        blurb: "Crispy bacon, tomato, and lettuce on toasted bread — line-friendly handheld feed.",
      },
    ],
    faqs: [
      {
        question: "What is a realistic cook time for a busy firehall night?",
        answer:
          "Under 45 minutes total is the sweet spot for most halls. That includes prep. If the recipe says 60 minutes without a hold window, save it for a slower night or start earlier than you think.",
      },
      {
        question: "Are frozen ingredients bad for crew meals?",
        answer:
          "No — unmaintained freezers are the problem, not frozen food. Frozen veg, fries, and portioned protein reduce labor and waste. Fresh garnishes at the end sell the plate.",
      },
    ],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "planning-tonights-station-dinner"],
  },
  {
    slug: "bbq-night-at-the-station",
    title: "BBQ Night at the Fire Station",
    subtitle: "Smoke, grills, and feeding a crew without babysitting the pit all shift",
    description:
      "How to run a fire station BBQ night: timing, safety, sides, and firefighter meal picks for grill-forward crews.",
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 7,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["fire station BBQ", "firefighter BBQ meals", "grill night", "firehall meals"],
    intro:
      "BBQ night is morale food — but it is also a logistics exercise. You are managing heat, smoke, grease, and a crew that will absolutely 'just check the grill' until someone opens the lid too often. A good station BBQ has a simple protein plan, one reliable side, and a backup if weather or calls kill the outdoor cook.",
    practicalAdvice: [
      "Pick one star protein (pulled pork, chicken thighs, burgers) — not three competing timelines.",
      "Prep sides indoors so the grill person is not also chopping onions during the cook.",
      "Use probe temps — guessing is how halls serve pink chicken and tough brisket.",
      "Keep a flat-top or oven finish for stragglers and post-call eaters.",
      "Grease management is safety: empty traps, keep a lid nearby, know your extinguisher class.",
    ],
    sections: [
      {
        id: "plan",
        heading: "Plan the cook around the shift, not the recipe clock",
        paragraphs: [
          "Low-and-slow fits weekends and training days. On a weeknight, think hot-and-fast: thighs, burgers, sausages, or a partial smoke then finish in the oven.",
          "If you are feeding eight or more, pulled pork or batch chicken beats individual steaks for cost and stress.",
        ],
      },
      {
        id: "sides",
        heading: "Sides that do not fight the grill",
        paragraphs: [
          "Coleslaw, corn, beans, and simple potatoes travel well on a BBQ line. Mac and cheese can hold warm in a covered baking dish; green salads wilt — plate them last or keep dressing separate.",
          "Put sauces and buns on the end of the line so the protein stays hot and people build sandwiches without blocking the grill.",
        ],
        tips: [
          "Corn can finish on the upper rack while thighs cook below.",
          "Keep a foil tray for resting meat — carryover heat finishes cook without drying.",
        ],
      },
      {
        id: "safety",
        heading: "Grease, lids, and post-call eaters",
        paragraphs: [
          "Empty grease traps before you light up, keep a lid within arm's reach, and know which extinguisher class covers grease. BBQ night injuries are almost always preventable.",
          "Hold finished meat in a warm oven or on the flat-top corner so late-returning crews still get a hot plate — not cold leftovers from the first wave.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "pulled-pork", title: "Pulled Pork Sandwiches", blurb: "Feeds a crowd, forgives hold time, classic hall win." },
      { slug: "smoked-brisket", title: "Smoked Brisket", blurb: "When you have time and want a centerpiece." },
      { slug: "beer-can-chicken", title: "Beer Can Chicken", blurb: "Grill showpiece that still scales to multiple birds." },
      { slug: "bbq-chicken-bowls", title: "BBQ Chicken Bowls", blurb: "Line-friendly if you want bowls instead of buns." },
      { slug: "grilled-corn-cotija", title: "Grilled Street Corn", blurb: "Fast side that feels like an event." },
    ],
    faqs: [
      {
        question: "Can we BBQ if we might get a call?",
        answer:
          "Yes — choose proteins that tolerate hold (pulled pork, thighs) or finish indoors. Avoid recipes where the only safe window is a two-minute rest at perfect temp.",
      },
      {
        question: "What is the easiest BBQ for a rookie cook?",
        answer:
          "Burgers or chicken thighs on medium heat with a probe thermometer. Pull pork is easy on labor but needs time — start early or use a slow cooker assist.",
      },
    ],
    relatedArticleSlugs: ["comfort-food-after-a-long-shift", "feeding-a-firehall-crew"],
  },
  {
    slug: "comfort-food-after-a-long-shift",
    title: "Comfort Food After a Long Call",
    subtitle: "What crews actually want when the shift finally slows down",
    description:
      "Firefighter comfort meals for post-call nights: what works, what to avoid, and hall-tested recipes that hit the spot.",
    topic: "crew_culture",
    pillar: "station_lifestyle",
    readMinutes: 6,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["firefighter comfort food", "post call meal", "firehall comfort meals", "station dinner"],
    intro:
      "After a long job, nobody wants a precious small plate. Comfort food at the hall means salt, starch, heat, and enough volume that people stop picking at leftovers an hour later. It is not about guilt — it is about recovery and crew mood.",
    practicalAdvice: [
      "Lead with familiar flavors — chili, pasta bakes, parm, mac and cheese, loaded potatoes.",
      "Serve something crunchy or toasted if the main is soft — texture wakes up tired appetites.",
      "Have hot sauce and salt on the table; people will self-correct to taste.",
      "Do not run a complicated garnish pass — people want a bowl and a seat.",
    ],
    sections: [
      {
        id: "what-works",
        heading: "What lands after a hard shift",
        paragraphs: [
          "Braises, baked pastas, cheesy trays, and big bowls beat delicate proteins. The meal should still taste good at lukewarm — because that is how some people will eat it.",
        ],
      },
      {
        id: "what-to-skip",
        heading: "What to skip when everyone is fried",
        paragraphs: [
          "Fussy timelines, strong bitter greens as the main, or anything that requires perfect crispness to enjoy. Save the experimental fusion for a slow Tuesday.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "chicken-parm", title: "Chicken Parm", blurb: "Hall classic — cheese, sauce, feeds a table." },
      { slug: "mac-and-cheese-bake", title: "Mac and Cheese Bake", blurb: "Pure comfort, scales, holds warm." },
      { slug: "beef-stroganoff", title: "Beef Stroganoff", blurb: "Savory, rich, good over noodles or rice." },
      { slug: "loaded-potato-feed", title: "Loaded Potato Feed", blurb: "Self-serve, customizable, filling." },
      { slug: "chicken-pot-pie", title: "Chicken Pot Pie", blurb: "All-in-one bowl energy without the debate." },
      {
        slug: "french-onion-soup-for-the-hall",
        title: "French Onion Soup for the Hall",
        blurb: "Dark onion broth with a broiled Gruyère cap.",
      },
      {
        slug: "tomato-soup-grilled-cheese-croutons",
        title: "Tomato Soup with Grilled Cheese Croutons",
        blurb: "Creamy tomato soup topped with real grilled-cheese cubes.",
      },
    ],
    faqs: [
      {
        question: "Is comfort food bad for a crew on duty?",
        answer:
          "Comfort is context. After a tough call, a familiar hot meal stabilizes the room. Balance the week with lighter meals when you can — not by denying dinner after a hard job.",
      },
      {
        question: "What comfort meals reheat best for late eaters?",
        answer:
          "Bakes, chili, mac and cheese, and saucy pasta. Keep crispy items separate until the last minute or accept that some people will get the soft version — they still will.",
      },
    ],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "bbq-night-at-the-station"],
  },
  {
    slug: "firehall-breakfast-and-brunch",
    title: "Firehall Breakfast and Brunch That Actually Get Eaten",
    subtitle: "Morning shift fuel without turning the kitchen into a disaster zone",
    description:
      "Breakfast and brunch ideas for fire stations: timing, line setup, and recipes crews finish — not tray waste.",
    topic: "station_cooking",
    pillar: "recipes_meals",
    readMinutes: 6,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["fire station breakfast", "firehall brunch", "firefighter breakfast", "shift meals"],
    intro:
      "Breakfast at the hall is either the best meal of the shift or a pile of cold eggs and guilt. The difference is format: bakes and bars beat made-to-order unless you have a dedicated cook and a quiet board.",
    practicalAdvice: [
      "Egg bakes, burrito bars, and sheet-pan breakfast beat standing at the stove for twelve orders.",
      "Cook sausage and bacon in the oven on racks — splatter control matters in shared kitchens.",
      "Coffee first, food second — morale is a ingredient.",
      "If brunch runs long, keep proteins warm and acids cold (salsa, hot sauce, fruit).",
    ],
    sections: [
      {
        id: "formats",
        heading: "Formats that survive a busy morning",
        paragraphs: [
          "Breakfast burrito bars, frittata bakes, and pancake short stacks (held warm) fit staggered eating. Avoid eggs benedict for eight unless someone volunteers their sanity.",
        ],
      },
      {
        id: "cleanup",
        heading: "Cleanup and handoff to the day shift",
        paragraphs: [
          "Breakfast mess at 08:00 makes enemies. Line everything into one trash, soak pans immediately, and wipe the flat-top while it is still warm. The crew that follows should find coffee, not crust.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "breakfast-burrito-bar", title: "Breakfast Burrito Bar", blurb: "Build-your-own — handles staggered eaters." },
      { slug: "sausage-egg-bake", title: "Sausage Egg Bake", blurb: "One pan, slice and serve, minimal active time." },
      { slug: "pancake-short-stack", title: "Pancake Short Stack", blurb: "Crowd pleaser — hold warm in oven between waves." },
      { slug: "chorizo-breakfast-tacos", title: "Chorizo Breakfast Tacos", blurb: "Bold flavor, fast line, easy scale." },
    ],
    faqs: [
      {
        question: "How early should we start breakfast for a big crew?",
        answer:
          "For a bake, 60–75 minutes before you want to eat. For a burrito bar, cook components in the hour before — assemble at the line so latecomers still get a hot tortilla.",
      },
      {
        question: "What is the easiest hall breakfast for a rookie cook?",
        answer:
          "Sausage egg bake or a burrito bar. Both forgive timing, scale cleanly, and do not require plating eight individual orders at once.",
      },
    ],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "meal-prep-for-shift-workers"],
  },
  {
    slug: "meal-prep-for-shift-workers",
    title: "Meal Prep for Firefighters and Shift Workers",
    subtitle: "Leftovers that crews will eat — not Tupperware archaeology",
    description:
      "Shift-worker meal prep for fire halls: batch cooking, storage, reheat rules, and recipes that eat well the second day.",
    topic: "meal_planning",
    pillar: "operations_how_to",
    readMinutes: 7,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["meal prep firefighters", "shift worker meals", "fire station leftovers", "batch cooking"],
    intro:
      "Meal prep at a station is not about identical containers for Instagram — it is about cooking once and winning twice. The hall wins when Tuesday's chili becomes Wednesday's baked potato topper, or when a sheet-pan protein becomes lunch bowls without a full re-cook.",
    practicalAdvice: [
      "Prep components, not only finished plates — rice, proteins, roasted veg recombines faster than one locked menu.",
      "Label and date everything — rotation matters more than recipe genius.",
      "Cool food safely before the walk-in; shallow pans beat deep buckets.",
      "Plan one 'leftover night' into the week so the fridge does not become a science project.",
    ],
    sections: [
      {
        id: "storage",
        heading: "Storage that respects the walk-in",
        paragraphs: [
          "Flat containers stack better and cool faster. Separate sauces when possible — they often outlast the base and refresh a dry reheat.",
          "If the walk-in has six pans labeled 'chili' with no dates, someone will eat the wrong one and someone else will throw out good food. Tape, marker, date — same night you put it away.",
        ],
        tips: [
          "Shallow baking dishes cool faster than deep buckets — food safety and fridge space.",
          "Sauce in a squeeze bottle beats re-scooping from a pot that crusted overnight.",
        ],
      },
      {
        id: "reheat",
        heading: "Reheat like you mean it",
        paragraphs: [
          "Add splash of water or broth to rice and pasta before the microwave. Finish under the broiler or on the flat-top when you need texture back. The oven at 350°F is the hall's unsung hero for batch reheat.",
          "Pulled pork mac reheats better if pork and mac stay separate until service — combine on the line so the pasta does not turn to paste in the serving container.",
        ],
      },
      {
        id: "leftover-night",
        heading: "Plan the second shift on purpose",
        paragraphs: [
          "Sunday big chili is not 'leftovers' if the crew knows Wednesday is chili dogs or nachos night. You cooked once; now you are just assembling.",
          "The halls that waste food are the ones that treat prep as punishment. The ones that eat well rotate batches before the walk-in turns into a guessing game.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "sunday-chili-batch", title: "Sunday Chili Batch", blurb: "Better day two — top dogs, potatoes, or nachos." },
      { slug: "sheet-pan-meal-prep", title: "Sheet Pan Chicken Trays", blurb: "Portioned trays that reheat cleanly." },
      { slug: "pulled-pork-mac", title: "Pulled Pork Mac", blurb: "Combines two hall favorites — feeds heavy." },
      { slug: "big-chili", title: "Big Chili Batch", blurb: "The original double-shift insurance policy." },
    ],
    faqs: [
      {
        question: "How long are leftovers safe in a station fridge?",
        answer:
          "Follow your department food-safety guidance. As a practical hall rule: eat cooked proteins within 3–4 days when properly cooled and stored, and when in doubt, throw it out — sick crew is worse than wasted food.",
      },
      {
        question: "What batches freeze well for a fire hall?",
        answer:
          "Chili, pulled pork, and saucy pasta bases (without the noodles mixed in) freeze better than fried or delicate seafood. Label with date and reheat target temp.",
      },
    ],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "planning-tonights-station-dinner"],
  },
  {
    slug: "planning-tonights-station-dinner",
    title: "Planning Tonight's Station Dinner (Without the 6 PM Panic)",
    seoTitle: "Firehall Dinner Ideas: Plan Tonight's Station Meal",
    subtitle: "A simple decision tree for firehall dinner ideas",
    description:
      "Firehall dinner ideas for tonight: pick by time, crew size, and appliances — with hall-tested recipes crews actually cook on shift.",
    topic: "meal_planning",
    pillar: "operations_how_to",
    readMinutes: 6,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: [
      "firehall dinner ideas",
      "firefighter dinner ideas",
      "tonight's dinner",
      "station meal planning",
    ],
    intro:
      "Firehall dinner ideas should be decided before 17:00 — not argued about at 18:45 while someone stares into the walk-in. The hardest part of dinner is not cooking; it is picking a format that matches time, crew size, and how loud the board feels. Use a simple filter: minutes available, mouths to feed, which appliance is free, then choose tacos, a batch, or a bake — not a Pinterest fantasy.",
    practicalAdvice: [
      "Quiet board + 60 minutes → bake, braise, or BBQ.",
      "Busy board + 40 minutes → skillet, sheet pan, tacos, pasta.",
      "Unknown board → chili, taco bar, or bowls — hold and serve.",
      "Ask about allergies once, write it on a sticky, stop re-asking mid-cook.",
      "When stuck, use Find a Meal on the home page — it matches crew size and time to curated hall recipes.",
    ],
    sections: [
      {
        id: "decision-tree",
        heading: "A hall-tested decision tree",
        paragraphs: [
          "Start with time. Under 35 minutes? Handhelds, stir-fry, quesadillas. 35–60? Sheet pan, pasta, rice bowls. Over 60? Bakes, BBQ, big batches.",
          "Next, crew size. Above ten? Think lines and batches, not individual plating.",
          "Last, appliance: if the oven is occupied with gear drying (it happens), pivot to flat-top or slow cooker.",
        ],
      },
      {
        id: "when-stuck",
        heading: "When nobody will pick",
        paragraphs: [
          "Put two options on the whiteboard, not ten. Run a quick vote, then commit. Indecision burns more time than cooking the wrong pasta.",
          "If the board is still loud, default to a line meal. Tacos and bowls end debates because people customize.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "smash-burgers", title: "Double Smash Burgers", blurb: "Fast crowd-pleaser when time is medium." },
      { slug: "enchilada-casserole", title: "Enchilada Casserole", blurb: "Oven bake — hands-off middle." },
      { slug: "teriyaki-donburi", title: "Teriyaki Donburi", blurb: "Bowl line — balanced and quick." },
      { slug: "stuffed-peppers", title: "Stuffed Peppers", blurb: "Make-ahead friendly bake." },
    ],
    faqs: [
      {
        question: "What if nobody agrees on dinner?",
        answer:
          "Default to a line format (tacos, bowls, baked potato bar). Agreement is easier when people assemble their own plate. If two factions remain, make one base protein and two sauces.",
      },
      {
        question: "Where do I find firefighter-tested recipes?",
        answer:
          "Browse all recipes — every one is structured for crew scale, realistic timing, and station kitchens. Use Explore to browse by situation, or Find a Meal when you need a pick for tonight.",
      },
    ],
    relatedArticleSlugs: ["quick-meals-between-calls", "feeding-a-firehall-crew"],
  },
  {
    slug: "healthy-meals-for-active-crews",
    title: "Healthy Meals for Active Crews (Without the Lecture)",
    subtitle: "Performance-friendly firehall food that still feels like dinner",
    description:
      "Lighter firefighter meals for active crews: protein-forward bowls, grill options, and how to balance comfort with performance on shift.",
    topic: "nutrition_performance",
    pillar: "nutrition_performance",
    readMinutes: 6,
    publishedAt: PUBLISHED,
    updatedAt: PUBLISHED,
    keywords: ["healthy firefighter meals", "performance meals", "fire station nutrition", "crew meals"],
    intro:
      "Healthy at the hall does not mean sad salads while everyone else eats real food. It means protein forward, reasonable portions of starch, and flavor that does not taste like punishment. Crews accept lighter meals when they are filling and seasoned — not when they are obviously 'diet food.'",
    practicalAdvice: [
      "Build bowls: protein + grain + veg + sauce — people control their own ratio.",
      "Grill or roast instead of fry when you want lighter — flavor comes from char and acid.",
      "Serve sauce on the side so healthy does not mean dry.",
      "Pair lighter mains with one indulgent side if morale needs it — corn, garlic bread, etc.",
    ],
    sections: [
      {
        id: "balance",
        heading: "Balance the week, not every single plate",
        paragraphs: [
          "One lighter dinner after a heavy weekend BBQ is smart. Seven days of grilled chicken breast is how halls order pizza at 22:00.",
        ],
      },
      {
        id: "flavor",
        heading: "Flavor tricks that are not 'diet food'",
        paragraphs: [
          "Acid at the end (lemon, vinegar, pickled onion), char from the grill pan, and enough salt on the protein beat bland healthy every time.",
          "Use bold sauces on the side — crews will use more sauce on comfort nights anyway; this just formalizes the habit.",
        ],
      },
    ],
    mealRecommendations: [
      { slug: "greek-chicken-bowls", title: "Greek Chicken Bowls", blurb: "Bright, line-friendly, easy to portion." },
      { slug: "ginger-salmon-bowls", title: "Ginger Salmon Rice Bowls", blurb: "Omega-rich protein with big flavor." },
      { slug: "turkey-meatball-zoodles", title: "Turkey Meatball Zoodles", blurb: "Lighter tray when carbs need a break." },
      { slug: "cedar-plank-salmon", title: "Cedar Plank Salmon", blurb: "Grill night without heavy sides required." },
      { slug: "mediterranean-chickpea", title: "Mediterranean Chickpea Tray", blurb: "Plant-forward option that still satisfies." },
    ],
    faqs: [
      {
        question: "Will the crew actually eat healthy meals?",
        answer:
          "They will eat flavorful, filling meals with protein. Lead with taste and portion choice. A optional side of fries beats preaching — let people self-select.",
      },
      {
        question: "How do I add lighter options without cooking two full meals?",
        answer:
          "One base protein, two sauces, and a big salad or roasted veg on the side. Bowls make this easy — the hall builds their own plate.",
      },
    ],
    relatedArticleSlugs: ["comfort-food-after-a-long-shift", "planning-tonights-station-dinner"],
  },
];

/** Core guides + SEO pillars + nutrition + lifestyle + operations + listicles. */
export const EDITORIAL_ARTICLES: EditorialArticle[] = [
  ...CORE_EDITORIAL_ARTICLES,
  ...SEO_TRAFFIC_ARTICLES,
  ...NUTRITION_PERFORMANCE_ARTICLES,
  ...STATION_LIFESTYLE_ARTICLES,
  ...OPERATIONS_HOWTO_ARTICLES,
  ...CORNERSTONE_BLOG_ARTICLES,
  HEALTHY_HALL_SMOOTHIES_ARTICLE,
];

export function getEditorialArticleBySlug(slug: string): EditorialArticle | undefined {
  return EDITORIAL_ARTICLES.find((a) => a.slug === slug);
}
