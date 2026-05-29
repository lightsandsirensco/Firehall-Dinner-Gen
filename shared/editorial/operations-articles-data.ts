/**
 * Operational how-to guides — groceries, equipment, organizing crew dinners.
 */

import { buildSeoGuide, meal, STANDARD_FAQS } from "./seo-article-build.js";

export const OPERATIONS_HOWTO_ARTICLES = [
  buildSeoGuide({
    slug: "cooking-for-10-firefighters",
    title: "Cooking for 10 Firefighters",
    subtitle: "Portion math, line setup, and recipes that scale without chaos",
    description:
      "A practical guide to cooking for 10 firefighters: pick the right format, scale ingredients, and use hall-tested recipes built for volume and hold time.",
    keywords: [
      "cooking for 10 firefighters",
      "feeding a firehall crew",
      "firehouse meals for large crews",
      "station cooking",
    ],
    topic: "station_cooking",
    pillar: "operations_how_to",
    readMinutes: 8,
    intro:
      "Cooking for ten is not just doubling a recipe. It is choosing a format that scales, buying the right quantities, and setting up service so dinner does not turn into a traffic jam. The best meals for ten firefighters are forgiving: big pots, trays, and build-your-own lines that stay hot when the board interrupts everything.",
    practicalAdvice: [
      "Start the cook with the hold plan: where does the food live if the tones drop?",
      "Scale protein first. The rest of the plate is easier to stretch.",
      "Use trays and sheet pans for sides. Keep the stove for the main.",
      "Run a line when possible: protein first, then starch, then toppings.",
    ],
    sections: [
      {
        id: "choose-format",
        heading: "Pick the right format first",
        paragraphs: [
          "For ten people, formats beat fancy menus. Big pot (chili, soup), tray bake (ziti, lasagna), and bar night (tacos, loaded potatoes) are the station defaults because they survive interruptions.",
          "Avoid anything that needs precise batch timing in small pans. If it requires eight separate finish steps, it will fail when the tones drop.",
        ],
        tips: [
          "If you can hold it on low heat for 30–60 minutes, it is a good choice for ten.",
          "If everyone can build their own plate, you just solved picky eaters and portion differences.",
        ],
      },
      {
        id: "portion-math",
        heading: "Portion math crews actually use",
        paragraphs: [
          "Protein disappears first. Plan protein for ten, then backfill with starch and a cooked vegetable or salad. If you are short, the meal feels light no matter how many sides you make.",
          "The fastest way to keep portions fair is to run a line: protein first, then starch, then toppings. People pace themselves when the order is consistent.",
        ],
      },
      {
        id: "service-and-hold",
        heading: "Service flow and hold time",
        paragraphs: [
          "Ten people rarely sit down at the exact same minute. Plan for staggered eating: a pot on low, an oven on warm, or covered trays. Dinner should still be good after the second run comes back.",
          'Label one tray "late eaters" and keep it covered in a warm oven. You will prevent the pan-picking that makes a meal look wrecked.',
        ],
      },
    ],
    mealRecommendations: [
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "A true big-crew feeder that holds hot and improves over the shift."),
      meal("baked-ziti", "Baked Ziti", "Tray-format, easy to portion, and rookie-proof once it is in the oven."),
      meal("batch-lasagna", "Batch Lasagna", "Comfort-night volume with a clean service line."),
      meal("hall-taco-bar", "Hall Taco Bar Night", "Build-your-own solves preferences and keeps the kitchen from getting crowded."),
      meal("loaded-baked-potato-bar", "Loaded Baked Potato Bar", "Cheap to scale, filling, and the topping line keeps plates consistent."),
      meal("pulled-pork", "Pulled Pork", "Hold food for busy boards — serve as sandwiches or bowls."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "best-firehouse-meals-large-crews", "meals-feeding-10-firefighters"],
  }),

  buildSeoGuide({
    slug: "firehall-grocery-planning",
    title: "Firehall Grocery Planning",
    subtitle: "Lists that match crew size — not random cart chaos",
    description:
      "Firehall grocery planning for station dinners: quantity lists, staple pantry, and shopping once for the week instead of three emergency runs.",
    keywords: ["firehall grocery list", "fire station shopping", "crew grocery planning"],
    topic: "meal_planning",
    pillar: "operations_how_to",
    intro:
      "Grocery planning for the hall is half the battle. A list tied to one meal beats a cart full of 'maybe.' Start with crew count, pick a format (batch, line, grill), then buy protein first and starch second — everything else supports those two.",
    practicalAdvice: [
      "Shop protein and starch first — veg and extras follow.",
      "Buy one extra pound of protein — surprise visitors are normal.",
      "Keep a laminated pantry list on the fridge.",
      "Photo the receipt before you leave the store.",
    ],
    sections: [
      {
        id: "list",
        heading: "Build the list from the meal",
        paragraphs: [
          "Chili: meat, beans, tomatoes, onions, spices. Taco bar: protein, tortillas, toppings. Sheet pan: protein, peppers, oil, seasoning.",
        ],
      },
      {
        id: "pantry",
        heading: "Pantry staples to keep stocked",
        paragraphs: [
          "Oil, salt, pepper, garlic, onions, rice, pasta, canned tomatoes, and foil. When these exist, dinner is a decision — not a store run.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Predictable shopping list."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Staple batch — repeat monthly."),
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Short grocery list — one pan."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["how-crews-split-groceries", "feeding-a-firehall-crew"],
  }),

  buildSeoGuide({
    slug: "station-kitchen-essentials",
    title: "Station Kitchen Essentials",
    subtitle: "What every hall should have before dinner night",
    description:
      "Fire station kitchen essentials: pans, thermometers, foil, storage, and tools that make crew cooking possible without borrowing from three trucks.",
    keywords: ["fire station kitchen equipment", "hall kitchen essentials", "station cooking tools"],
    topic: "station_cooking",
    pillar: "operations_how_to",
    intro:
      "A hall kitchen without basics turns every meal into improvisation. Station kitchen essentials are not luxury — they are force multipliers: sheet pans, a large pot, a probe thermometer, and enough foil to survive a week of holds.",
    practicalAdvice: [
      "Two large sheet pans minimum — one pan crowds food.",
      "Probe thermometer — stops pink chicken debates.",
      "Large aluminum foil and zip bags — hold and storage.",
      "Label maker or tape — dates on leftovers.",
    ],
    sections: [
      {
        id: "gear",
        heading: "Gear worth funding",
        paragraphs: [
          "Dutch oven or large stock pot, cast iron or flat-top spatula, tongs, ladle, and a sharp chef knife someone actually maintains.",
        ],
      },
      {
        id: "storage",
        heading: "Storage and hold",
        paragraphs: [
          "Half-sheet pans with lids, a roll of foil, and labeled containers turn leftovers into tomorrow's lunch instead of science experiments.",
        ],
      },
    ],
    mealRecommendations: [
      meal("sheet-pan-fajitas", "Sheet Pan Chicken Fajitas", "Uses the pans you should already own."),
      meal("big-chili", "Hall-Sized Beef and Bean Chili", "Tests your largest pot."),
      meal("one-pot-chicken-rice", "One-Pot Chicken and Rice", "Minimal tools — one pot dinner."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["feeding-a-firehall-crew", "organize-firehall-dinners"],
  }),

  buildSeoGuide({
    slug: "organize-firehall-dinners",
    title: "How to Organize Firehall Dinners",
    subtitle: "Whiteboard, roles, and timing that works",
    description:
      "How to organize firehall dinners: who decides, who cooks, when to shop, and how to run the line so dinner happens on busy shifts.",
    keywords: ["organize fire station dinner", "firehall dinner planning", "crew dinner organization"],
    topic: "shift_operations",
    pillar: "operations_how_to",
    intro:
      "Organized hall dinners do not happen by accident. Someone owns the decision by mid-afternoon, someone owns the cook, and the whiteboard says what time food is ready. Without that, you get seventeen opinions and delivery apps.",
    practicalAdvice: [
      "Post menu and time on the whiteboard by 16:00.",
      "Assign cook and cleanup before shopping.",
      "Run lines for crews over six — plated service rarely scales.",
    ],
    sections: [
      {
        id: "timeline",
        heading: "Sample timeline",
        paragraphs: [
          "15:00 decide meal. 16:00 shop. 17:00 prep. 18:30 serve window opens. Cleanup assigned at start, not end.",
        ],
      },
      {
        id: "roles",
        heading: "Roles on the whiteboard",
        paragraphs: [
          "Cook, prep, cleanup lead, and shopper — even when one person does two jobs, names on the board prevent the 'everyone helped' trap.",
        ],
      },
    ],
    mealRecommendations: [
      meal("hall-taco-bar", "Hall Taco Bar Night", "Organized as a line."),
      meal("batch-lasagna", "Giant Batch Lasagna", "Prep ahead bake — feeds the line."),
      meal("sausage-egg-bake", "Sausage Egg Bake", "Morning timeline practice."),
    ],
    faqs: [STANDARD_FAQS.catalog, STANDARD_FAQS.generator],
    relatedArticleSlugs: ["planning-tonights-station-dinner", "busy-shift-dinner-strategies"],
  }),

];
