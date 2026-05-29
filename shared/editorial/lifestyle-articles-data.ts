/**
 * Firehall lifestyle & culture guides — how crews actually eat together.
 */

import { buildSeoGuide, meal, STANDARD_FAQS } from "./seo-article-build.js";

export const STATION_LIFESTYLE_ARTICLES = [
  buildSeoGuide({
    slug: "firehall-kitchen-culture",
    title: "Firehall Kitchen Culture",
    subtitle: "How meals build (or break) a crew",
    description:
      "Firehall kitchen culture: who cooks, who cleans, how dinner decisions get made, and why food matters beyond calories on shift.",
    keywords: ["firehall kitchen culture", "fire station cooking culture", "crew meals"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Every hall has a kitchen culture whether anyone writes it down or not. Some stations rotate cooks; others have one person who always ends up at the stove. The culture shows up in who cleans, who shops, and whether rookies learn or get hazed. Good kitchen culture is fair, predictable, and good-natured — not competitive suffering.",
    practicalAdvice: [
      "Write unwritten rules on a whiteboard: cook rotation, cleanup owner, grocery day.",
      "Praise the cook publicly — criticism belongs one-on-one.",
      "Rookies cook with a partner, not alone on their first big meal.",
    ],
    sections: [
      {
        id: "roles",
        heading: "Roles that prevent resentment",
        paragraphs: [
          "Cook, cleanup lead, grocery shopper — three jobs, can be three people. When everyone 'helps' with no owner, dishes sit until morning.",
        ],
      },
      {
        id: "tone",
        heading: "Tone at the table",
        paragraphs: [
          "Meals are where crews decompress. Complaining about the food while someone cooked is a fast way to end volunteer cooks.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Line meals teach rookies assembly, not plating."),
      meal("sunday-chili-batch", "Sunday Batch Chili", "Batch cooking teaches timing and cleanup."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Forgiving format for new cooks."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["better-station-food-culture", "how-crews-split-groceries"],
  }),

  buildSeoGuide({
    slug: "how-crews-split-groceries",
    title: "How Crews Split Groceries",
    subtitle: "Fair splits without spreadsheet wars",
    description:
      "How firefighter crews split grocery costs for station dinners: apps, receipts, rotation, and simple rules that keep dinner from becoming politics.",
    keywords: ["fire station groceries", "crew grocery split", "firehall food budget"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Someone always pays first. The question is whether they get paid back before payday. Crews that split groceries cleanly cook more often; crews that 'figure it out later' order pizza. A simple system beats a perfect one.",
    practicalAdvice: [
      "One receipt per shop — photo it to the group chat immediately.",
      "Split by eaters on duty, not by seniority.",
      "Rotate who shops — spreads labor and catches price drift.",
      "Keep a hall card or Venmo dedicated to food — not mixed with personal tabs.",
    ],
    sections: [
      {
        id: "math",
        heading: "Simple math",
        paragraphs: [
          "Total ÷ eaters = share. Round up a dollar for staples (oil, salt, foil) that stay at the hall.",
        ],
      },
      {
        id: "tools",
        heading: "Tools that prevent drama",
        paragraphs: [
          "A shared payment app, one hall card, or a weekly cash float — pick one and stick with it. Mixed personal tabs are where grocery splits die.",
        ],
      },
    ],
    mealRecommendations: [
      meal("turkey-chili", "High-Protein Turkey Chili", "Budget-friendly batch."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Predictable cost per person."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Stretches ground beef with beans."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["firehall-grocery-planning", "avoid-living-on-takeout"],
  }),

  buildSeoGuide({
    slug: "legendary-firehall-meals",
    title: "Legendary Firehall Meals",
    subtitle: "The dishes halls still talk about",
    description:
      "Legendary firehall meals crews remember: chili, BBQ pulls, parm nights, and the recipes that become tradition — not one-off experiments.",
    keywords: ["legendary firehall meals", "fire station famous meals", "hall traditions"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Every hall has a short list of meals that became lore — the chili after the big job, the rookie's first burnt burgers, the BBQ that fed two companies. Legendary firehall meals are rarely complicated. They are reliable, generous, and tied to a story.",
    practicalAdvice: [
      "Repeat winners beat novelty — tradition is comfort.",
      "Document the recipe when a meal hits — 'Dave's chili' should be cookable after Dave transfers.",
      "Feed enough for seconds — legendary nights rarely end with empty pans.",
    ],
    sections: [
      {
        id: "patterns",
        heading: "What legends have in common",
        paragraphs: [
          "Big batches, strong flavor, enough for seconds, and someone who owned the cook without drama.",
        ],
      },
      {
        id: "stories",
        heading: "Why stories stick",
        paragraphs: [
          "Legendary meals are tied to nights — the storm, the transfer, the rookie who nailed it. Write the recipe down so the food survives the story.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chili-garlic-bread", "Firehall Chili", "The universal candidate."),
      meal("pulled-pork", "Pulled Pork Sandwiches", "BBQ lore starter at many halls."),
      meal("chicken-parm", "Chicken Parm", "Italian night legend."),
      meal("smoked-brisket", "Kansas City Smoked Brisket", "When the hall has time and a pit."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["meals-every-firefighter-knows", "bbq-night-at-the-station"],
  }),

  buildSeoGuide({
    slug: "meals-every-firefighter-knows",
    title: "Meals Every Firefighter Knows",
    subtitle: "The short list — chili, burgers, tacos, pasta",
    description:
      "Meals every firefighter knows from station kitchens: chili, burgers, tacos, pasta bakes, and BBQ — the shared vocabulary of hall food.",
    keywords: ["meals firefighters know", "classic fire station food", "firehall classics"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "You can walk into most halls and predict three dinners from the freezer and whiteboard. Chili, burgers, tacos, pasta bake, BBQ chicken — these are not clichés. They are the shared language of crews who cook under interruption.",
    practicalAdvice: [
      "Master one meal in each category — your hall will thank you.",
      "Teach rookies one batch meal and one line meal.",
      "Keep the shopping list for your hall canon posted — repetition builds speed.",
    ],
    sections: [
      {
        id: "list",
        heading: "The hall canon",
        paragraphs: [
          "Chili, smash burgers, taco bar, chicken parm, pulled pork, mac and cheese, sheet-pan fajitas. If you can cook these, you can feed most crews.",
        ],
      },
      {
        id: "why",
        heading: "Why the canon works",
        paragraphs: [
          "These meals scale, survive holds, and need no fine dining timing. They are what crews suggest when someone asks 'what should we make?'",
        ],
      },
    ],
    mealRecommendations: [
      meal("chili-garlic-bread", "Firehall Chili", "The baseline hall chili — batch friendly."),
      meal("smash-burgers", "Double Smash Burgers", "Handheld standard on flat-top night."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Line classic — self-serve tacos."),
      meal("chicken-parm", "Chicken Parm", "Table spread classic."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["meals-firefighters-actually-cook", "legendary-firehall-meals"],
  }),

  buildSeoGuide({
    slug: "rookie-cooking-mistakes",
    title: "Rookie Cooking Mistakes at the Hall",
    subtitle: "What to skip your first year on the stove",
    description:
      "Common rookie cooking mistakes in fire station kitchens: oversalting, crowding pans, ambitious menus, and cleanup failures that hurt trust.",
    keywords: ["rookie firefighter cooking", "station kitchen mistakes", "first hall meal"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Rookies want to impress. The hall wants dinner on time and the kitchen usable after. Rookie cooking mistakes usually come from trying too hard — twelve-ingredient fusion on a busy night — or from basics: crowded pans, raw centers, and dishes left for 'later.'",
    practicalAdvice: [
      "Cook with a senior on your first three hall meals.",
      "Pick one-pot or line formats — not a timing puzzle.",
      "Taste before you serve — salt is fixable before the line opens.",
      "Cleanup starts while food cooks — not after everyone leaves.",
    ],
    sections: [
      {
        id: "mistakes",
        heading: "Mistakes halls remember",
        paragraphs: [
          "Undercooked chicken, oversalted pasta water, smoke from oil past smoke point, and 'I'll do dishes tomorrow.'",
        ],
      },
      {
        id: "recovery",
        heading: "Recovering trust",
        paragraphs: [
          "A bad meal is fixable with honesty and cleanup. Own the miss, feed the crew something simple next time, and cook with a partner until basics are solid.",
        ],
      },
    ],
    mealRecommendations: [
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Forgiving first cook."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Hard to ruin the whole meal."),
      meal("sunday-chili-batch", "Sunday Batch Chili", "Teaches batch timing."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "firehall-kitchen-culture"],
  }),

  buildSeoGuide({
    slug: "feeding-ten-firefighters",
    title: "Feeding Ten Firefighters",
    subtitle: "Portion math and formats that scale",
    description:
      "How to feed ten firefighters: grocery quantities, line vs plated service, and recipes that scale without doubling cook stress.",
    keywords: ["feed 10 firefighters", "large crew dinner", "fire station portions"],
    topic: "station_lifestyle",
    pillar: "operations_how_to",
    intro:
      "Ten eaters is the point where home-recipe math breaks. Feeding ten firefighters means rounding up protein, using lines and batches, and accepting that two sheet pans beat one crowded pan. The goal is full plates, not perfect presentation.",
    practicalAdvice: [
      "Plan one pound raw protein per three to four eaters for mixed plates.",
      "Use two half-sheet pans or two pots — even heat matters.",
      "Taco bars and potato bars scale cleaner than ten plated entrees.",
    ],
    sections: [
      {
        id: "formats",
        heading: "Formats for ten",
        paragraphs: [
          "Chili, lasagna, taco bar, pulled pork, jambalaya — all proven at ten plus.",
        ],
      },
      {
        id: "quantities",
        heading: "Quantity shortcuts",
        paragraphs: [
          "Double sheet pans, two pots of chili, or two pork shoulders beat one crowded vessel. Uneven heat at ten portions is how dinner fails quietly.",
        ],
      },
    ],
    mealRecommendations: [
      meal("batch-lasagna", "Giant Batch Lasagna", "Built for big tables."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Self-serve at scale."),
      meal("jambalaya", "Cajun Jambalaya for the Hall", "One pot — loud flavor."),
      meal("loaded-potato-feed", "Loaded Potato Feed", "Ten-plus friendly self-serve line."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["best-firehouse-meals-large-crews", "feeding-a-firehall-crew"],
  }),

  buildSeoGuide({
    slug: "busy-shift-dinner-strategies",
    title: "Busy Shift Dinner Strategies",
    subtitle: "Dinner when the board will not cooperate",
    description:
      "Busy shift dinner strategies for fire stations: default meals, hold plans, and communication so food still happens when calls stack.",
    keywords: ["busy shift dinner", "fire station dinner strategy", "dinner between calls"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Busy shift dinner is a strategy problem. You need a default meal everyone knows, a cook assigned early, and formats that survive pause. Waiting until 18:30 to 'see how the board looks' is how halls end up with nothing.",
    practicalAdvice: [
      "Pick dinner by 16:00 — adjust format, not whether you eat.",
      "Keep a 30-minute fallback in the freezer.",
      "Communicate on the whiteboard: 'Chili 18:30 — line.'",
    ],
    sections: [
      {
        id: "defaults",
        heading: "Default meals",
        paragraphs: [
          "Chili, quesadillas, sheet pan, pasta — rotate defaults monthly so shopping stays automatic.",
        ],
      },
      {
        id: "hold",
        heading: "Hold and communicate",
        paragraphs: [
          "Tell the crew when food is ready and what format — line at 18:30, not 'food sometime.' Holds on low beat reheating twelve individual plates after a call.",
        ],
      },
    ],
    mealRecommendations: [
      meal("chili-mac", "Chili Mac Skillet", "One pan — fast when the board stays loud."),
      meal("chicken-quesadillas", "Chicken Quesadillas", "Handheld — staggered eating."),
      meal("garlic-butter-shrimp", "Garlic Butter Shrimp", "Minutes on heat — high flavor."),
      meal("fast-philly-skillet", "Fast Philly Cheesesteak Skillet", "Flat-top speed for busy nights."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["quick-meals-between-calls", "best-firehall-meals-busy-nights"],
  }),

  buildSeoGuide({
    slug: "better-station-food-culture",
    title: "Building a Better Station Food Culture",
    subtitle: "Small changes that stick",
    description:
      "How to build better fire station food culture: fair rotations, better groceries, rookie support, and meals that make cooking worth the effort.",
    keywords: ["station food culture", "improve firehall meals", "crew food culture"],
    topic: "station_lifestyle",
    pillar: "station_lifestyle",
    intro:
      "Better station food culture is not a wellness poster — it is fair labor, decent groceries, and meals people want to eat. Crews cook when cooking feels worth it: clear roles, reimbursement that works, and less public griping about the result.",
    practicalAdvice: [
      "Rotate cooks weekly — visibility prevents burnout.",
      "Stock the pantry with basics so dinner is not 'shop from zero.'",
      "Celebrate good meals — photos on the board, not only complaints.",
    ],
    sections: [
      {
        id: "start",
        heading: "Where to start",
        paragraphs: [
          "Fix cleanup fairness first. Then grocery splits. Then one recurring cook night with a reliable recipe.",
        ],
      },
      {
        id: "habits",
        heading: "Habits that compound",
        paragraphs: [
          "Stock basics, rotate cooks, and celebrate wins on the whiteboard. Culture shifts when cooking feels fair — not when someone gives a speech about wellness.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Low-risk culture win."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Teaches batch cooperation."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Shared cook night — low drama."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["firehall-kitchen-culture", "how-crews-split-groceries"],
  }),
];
