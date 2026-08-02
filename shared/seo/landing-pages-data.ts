import type { FaqItem } from "./schema.js";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCountCopy,
} from "../meal-catalog/curated-count.js";

export type SeoLandingPageSlug =
  | "firefighter-meals"
  | "firefighter-recipes"
  | "firehouse-recipes"
  | "firehouse-meals"
  | "firefighter-dinner-ideas"
  | "crew-meals"
  | "fire-station-meals"
  | "healthy-firefighter-meals"
  | "firefighter-breakfast-recipes"
  | "firefighter-bbq-recipes";

export type SeoLandingPageSection = {
  heading: string;
  paragraphs: string[];
};

/**
 * A categorized recipe grid within a landing page (e.g. "Quick Firehouse
 * Meals", "High-Protein Firefighter Meals"). Optional — pages that don't
 * set this fall back to the single flat `recipeSlugs` grid, so existing
 * simple landing pages are unaffected.
 */
export type SeoLandingRecipeSection = {
  heading: string;
  /** Short 1-2 sentence lead-in for the section — optional. */
  intro?: string;
  recipeSlugs: string[];
  /** e.g. link to /breakfast for the "Breakfast at the Firehall" section. */
  viewAllPath?: string;
  viewAllLabel?: string;
};

export type SeoLandingGeneratorCta = {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
};

export type SeoLandingPageDef = {
  slug: SeoLandingPageSlug;
  path: string;
  h1: string;
  title: string;
  description: string;
  keywords: string[];
  intro: string;
  sections: SeoLandingPageSection[];
  /** Curated catalog slugs linked on the page (flat grid — used when
   * `recipeSections` is not set, and always used for schema/validation
   * as the flattened union of every slug on the page). */
  recipeSlugs: string[];
  /** Optional categorized recipe grids — supersedes the flat `recipeSlugs`
   * grid on render when present (see `firefighter-meals` for the primary
   * use case: Popular / Quick / High-Protein / Healthy / Classics / Breakfast). */
  recipeSections?: SeoLandingRecipeSection[];
  /** Optional editorial section(s) rendered AFTER `recipeSections` (and
   * before the Generator CTA / FAQs) — e.g. "Cooking for a Firehouse Crew". */
  secondarySections?: SeoLandingPageSection[];
  /** Optional "Find Tonight's Meal" callout linking to the Generator. */
  generatorCta?: SeoLandingGeneratorCta;
  relatedPages: Array<{ slug: SeoLandingPageSlug; label: string }>;
  faqs: FaqItem[];
};

export const SEO_LANDING_PAGES: SeoLandingPageDef[] = [
  {
    slug: "firefighter-meals",
    path: "/firefighter-meals",
    h1: "Firefighter Meals: Easy Firehouse Meals for the Whole Crew",
    title: "Firefighter Meals: Easy Firehouse Meals for the Crew | Firehall Meals",
    description:
      "Firefighter meals for the whole crew — quick shift dinners, high-protein plates, healthy options, hall classics, and firehouse breakfast. Built by firefighters.",
    keywords: [
      "firefighter meals",
      "firehouse meals",
      "fire station meals",
      "firefighter recipes",
      "firehouse recipes",
      "firehouse dinner ideas",
      "meals for firefighters",
      "crew meals",
    ],
    intro:
      "A good firefighter meal feeds the whole crew, scales without a spreadsheet, and survives a call mid-prep. This hub is the starting point: quick shift dinners, high-protein plates, healthier options, and the hall classics every station rotates through, plus firehouse breakfast when the shift starts before the sun does. Every recipe below is written for station kitchens — crew-sized portions, honest cook times, and steps a rookie can follow solo. Built by firefighters. Tested on real shifts, not photographed for a blog.",
    sections: [
      {
        heading: "What makes a meal work at the firehall",
        paragraphs: [
          "A good firefighter meal feeds eight to twelve without a prep marathon. It holds on the line after a call, scales when a neighboring hall drops in, and does not require three specialty gadgets nobody owns at the station.",
          "Skillet plates, sheet pans, slow cookers, and big-batch chili are hall staples because they survive interruptions. The best firefighter meals have clear steps a rookie can follow and enough flavor that the captain does not quietly order pizza afterward.",
          "Firehall Meals organizes every recipe by how halls actually cook: quick shift nights, BBQ feeds, healthy performance plates, comfort food after tough runs, and feeds for a crowd when the whole battalion shows up.",
        ],
      },
    ],
    recipeSections: [
      {
        heading: "Popular Firefighter Meals",
        intro:
          "The dinners that show up on hall menus most often — reliable, crew-tested, and easy to defend when someone asks what's for dinner.",
        recipeSlugs: [
          "chicken-parm",
          "smash-burgers",
          "pulled-pork",
          "big-chili",
          "bbq-chicken-bowls",
          "steak-tacos",
          "meatloaf-mashed",
          "sheet-pan-fajitas",
          "baked-ziti",
          "shepherds-pie",
        ],
      },
      {
        heading: "Quick Firehouse Meals",
        intro: "Twenty-five minutes or less on the clock — built for shifts where dinner has to happen fast.",
        recipeSlugs: [
          "cast-iron-chicken-fajitas",
          "korean-beef-rice-bowls",
          "buffalo-chicken-sweet-potato-bowls",
          "chipotle-lime-chicken-tacos",
          "turkey-taco-skillet",
          "caprese-chicken-bake",
          "cajun-chicken-rice-bowl",
        ],
      },
      {
        heading: "High-Protein Firefighter Meals",
        intro: "Bigger plates for crews training on shift or just tired of running out of gas by 2 a.m.",
        recipeSlugs: [
          "batch-lasagna",
          "chicken-tikka-masala",
          "turkey-chili",
          "white-bean-chicken-chili",
          "crock-barbacoa-chicken",
          "bbq-chicken-mac-and-cheese",
          "beef-birria-with-consomme",
          "performance-burrito-bowls",
        ],
      },
      {
        heading: "Healthy Firefighter Meals",
        intro: "Lighter plates that still feel like a real hall dinner — no rabbit food, no fitness-blog portions.",
        recipeSlugs: [
          "mediterranean-baked-fish-tray",
          "herb-baked-salmon-tray",
          "baked-turkey-meatball-marinara",
          "chicken-souvlaki",
          "cedar-plank-salmon",
          "turkey-sweet-potato-chili",
          "crispy-fish-taco-night",
        ],
        viewAllPath: "/healthy-firefighter-meals",
        viewAllLabel: "See all healthy firefighter meals",
      },
      {
        heading: "Firehouse Classics",
        intro: "Pasta, chicken parm, chili, tacos, subs — the crew-friendly standards every hall rotates through.",
        recipeSlugs: [
          "chicken-caesar",
          "beef-dip",
          "meatball-hoagies",
          "loaded-nacho-skillet",
          "parm-hero-subs",
          "steak-sandwiches",
          "jerk-chicken",
          "crispy-chicken-cutlets",
        ],
      },
      {
        heading: "Breakfast at the Firehall",
        intro:
          "Shifts start before the sun most days. The full firehouse breakfast collection lives at /breakfast — here are a few crew favorites to start with.",
        recipeSlugs: [
          "cast-iron-breakfast-skillet",
          "buttermilk-pancakes",
          "hall-breakfast-burritos",
          "bagel-lox-breakfast-board",
          "belgian-waffle-platter",
          "chorizo-breakfast-hash",
        ],
        viewAllPath: "/breakfast",
        viewAllLabel: "See the full firehouse breakfast collection",
      },
    ],
    recipeSlugs: [
      "chicken-parm",
      "smash-burgers",
      "pulled-pork",
      "big-chili",
      "bbq-chicken-bowls",
      "steak-tacos",
      "meatloaf-mashed",
      "sheet-pan-fajitas",
      "baked-ziti",
      "shepherds-pie",
      "cast-iron-chicken-fajitas",
      "korean-beef-rice-bowls",
      "buffalo-chicken-sweet-potato-bowls",
      "chipotle-lime-chicken-tacos",
      "turkey-taco-skillet",
      "caprese-chicken-bake",
      "cajun-chicken-rice-bowl",
      "batch-lasagna",
      "chicken-tikka-masala",
      "turkey-chili",
      "white-bean-chicken-chili",
      "crock-barbacoa-chicken",
      "bbq-chicken-mac-and-cheese",
      "beef-birria-with-consomme",
      "performance-burrito-bowls",
      "mediterranean-baked-fish-tray",
      "herb-baked-salmon-tray",
      "baked-turkey-meatball-marinara",
      "chicken-souvlaki",
      "cedar-plank-salmon",
      "turkey-sweet-potato-chili",
      "crispy-fish-taco-night",
      "chicken-caesar",
      "beef-dip",
      "meatball-hoagies",
      "loaded-nacho-skillet",
      "parm-hero-subs",
      "steak-sandwiches",
      "jerk-chicken",
      "crispy-chicken-cutlets",
      "cast-iron-breakfast-skillet",
      "buttermilk-pancakes",
      "hall-breakfast-burritos",
      "bagel-lox-breakfast-board",
      "belgian-waffle-platter",
      "chorizo-breakfast-hash",
    ],
    secondarySections: [
      {
        heading: "Cooking for a Firehouse Crew",
        paragraphs: [
          "Most Firehall Meals recipes are written for four, six, eight, or ten-plus and scale cleanly — double the protein and starch, keep aromatics and seasoning close to the original ratio, and taste before you salt a triple batch. A recipe that serves four rarely needs exactly 2.5x for ten; round to what your pot, sheet pan, or oven trays can actually hold.",
          "Time dinner around the shift, not the other way around: pick something that can pause at a safe stopping point (browned and simmering, not mid-sear) if the tones drop, and hold on low heat or in the oven at 200°F until the crew is back at the table.",
          "Slow cookers, braises, chili, and sheet pans reheat well for late arrivals — they're the safer pick on a busy night. Pan-fried, delicate seafood, and anything meant to be served the instant it leaves the pan are better saved for quieter shifts.",
          "When picking tonight's meal, match the recipe to the shift: quick skillet or sheet-pan meals on busy nights, a slow cooker or braise when calls are unpredictable, and the bigger builds — lasagna, brisket, a full taco bar — for a shift that's actually calm.",
        ],
      },
    ],
    generatorCta: {
      heading: "Find Tonight's Meal",
      body: "Not sure what to cook? Tell the Generator your crew size, time on hand, and protein — it picks a real recipe from this catalog and swaps to a different meal if the first one is not it.",
      ctaLabel: "Pick Tonight's Meal",
      ctaPath: "/generator",
    },
    relatedPages: [
      { slug: "firefighter-recipes", label: "Firefighter recipes" },
      { slug: "fire-station-meals", label: "Fire station meals" },
      { slug: "healthy-firefighter-meals", label: "Healthy firefighter meals" },
      { slug: "firefighter-breakfast-recipes", label: "Firefighter breakfast recipes" },
    ],
    faqs: [
      {
        question: "What are the most popular firefighter meals?",
        answer:
          "Chicken parm, smash burgers, pulled pork, chili, taco bars, and sheet-pan fajitas rank among the most cooked hall dinners. They scale for crews, hold after calls, and do not require fine-dining skills.",
      },
      {
        question: "How many people does a firefighter meal serve?",
        answer:
          "Most Firehall Meals recipes scale from 2 to 12 at the table. Shopping lists and steps adjust with crew size so you are not mentally doubling a four-person blog recipe.",
      },
      {
        question: "What's a good quick firehouse meal when the tones might drop mid-shift?",
        answer:
          "Skillet dinners, rice bowls, and sheet-pan meals under 25 minutes are the safest bet — see Quick Firehouse Meals above. They have short active-cooking windows and hold fine if dinner gets pushed back.",
      },
      {
        question: "What counts as a \"healthy\" firefighter meal on this site?",
        answer:
          "Our healthy tag is based on real computed nutrition — calories and fat per serving, or performance macros for high-protein plates — not a keyword guess. See Healthy Firefighter Meals above or the full healthy-firefighter-meals collection.",
      },
      {
        question: "Do you have firehouse breakfast recipes too?",
        answer:
          "Yes — breakfast lives at /breakfast with its own full collection (skillets, burritos, bakes, and sandwiches). It's kept separate from the dinner Generator on purpose. A few crew favorites are linked above.",
      },
      {
        question: "How does Find Tonight's Meal (the Generator) work?",
        answer:
          "Set your crew size, time on hand, protein, and any dietary restrictions, and it picks a real recipe from the same catalog featured on this page — no fake filler meals, no relaxed dietary rules to force a match.",
      },
      {
        question: "What makes these recipes different from a regular recipe blog?",
        answer:
          "Every recipe is written and portioned for station kitchens by firefighters — crew-sized default servings, timing that survives interruptions, and steps a rookie can run without a captain hovering over the pan.",
      },
    ],
  },
  {
    slug: "firefighter-recipes",
    path: "/firefighter-recipes",
    h1: "Firefighter Recipes",
    title: "Firefighter Recipes — Hall-Tested Crew Dinners | Firehall Meals",
    description:
      `${marketingRecipeCountCopy(APPROVED_CATALOG_TOTAL)} with crew portions, clear station-kitchen steps, and honest timing. From rookies to captains — built by firefighters.`,
    keywords: [
      "firefighter recipes",
      "firehall recipes",
      "firehouse recipes",
      "crew cooking recipes",
    ],
    intro:
      "Firefighter recipes should read like instructions from someone who has actually cooked on shift — not a food blogger guessing at portions. Every recipe in the Firehall Meals catalog is written for station kitchens: crew scaling, interruption-friendly steps, and ingredients you can find at a normal grocery store.",
    sections: [
      {
        heading: "Recipes built for the station, not the scroll",
        paragraphs: [
          "Most recipe sites optimize for photos and ad clicks. Firefighter recipes need to work when the tones drop mid-chop, when a probationary is on their first crew dinner, and when the hall budget is real — not theoretical.",
          "Our catalog spans hall classics, performance meals for crews watching protein and recovery, breakfast plates for after night shift, and Explore picks for when you want something new without gambling on a random internet find.",
          "Each recipe includes prep and cook time, difficulty, crew yield, nutrition basics, and steps with titles that tell you what is happening — not generic \"Step 3\" filler.",
        ],
      },
      {
        heading: "Categories that match how halls cook",
        paragraphs: [
          "Quick shift meals for busy nights. BBQ and smoker plates for hall favorites. Comfort food when the crew needs something familiar. Healthy options that still taste like dinner — not diet culture on a tray.",
          "Feed-a-crowd batches for training nights. Game day spreads when the whole hall is watching. Rookie-friendly picks with forgiving timing and clear instructions.",
          "Use category pages to browse by station need, or search Explore when you know the protein and time window you are working with.",
        ],
      },
      {
        heading: "From hall package to your table",
        paragraphs: [
          "Many firefighter recipes link to hall packages — the full shopping list, scaling notes, and side suggestions crews use in real halls. That is the difference between a recipe card and a station dinner plan.",
          "Save favorites, share tonight's pick with the crew, or spin the Classics Wheel when debate is eating more time than cooking would.",
          "Firehall Meals is the largest curated collection of firefighter recipes online — maintained by firefighters, tested in real halls, and updated as crews send feedback.",
        ],
      },
    ],
    recipeSlugs: [
      "beef-dip",
      "chicken-parm",
      "chili-garlic-bread",
      "steak-tacos",
      "jerk-chicken",
      "pad-thai",
      "shepherds-pie",
      "smoked-brisket",
    ],
    relatedPages: [
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "firehouse-recipes", label: "Firehouse recipes" },
      { slug: "firefighter-bbq-recipes", label: "BBQ firefighter recipes" },
    ],
    faqs: [
      {
        question: "How are firefighter recipes different from regular recipes?",
        answer:
          "Crew portions, station-kitchen steps, honest timing for interrupted cooking, and categories organized by shift reality — not cuisine trends.",
      },
      {
        question: "Can rookies follow these firefighter recipes?",
        answer:
          "Yes. Rookie-friendly recipes use clear step titles, forgiving timing, and ingredients available at standard grocery stores. Start with chicken parm, meatloaf, or sheet-pan fajitas.",
      },
    ],
  },
  {
    slug: "firehouse-recipes",
    path: "/firehouse-recipes",
    h1: "Firehouse Recipes",
    title: "Firehouse Recipes — Classic Hall Cooking | Firehall Meals",
    description:
      "Firehouse recipes crews actually cook — comfort plates, BBQ nights, big-batch feeds, and hall classics. Crew-sized steps for station kitchens.",
    keywords: ["firehouse recipes", "firehouse cooking", "firehall recipes", "station cooking"],
    intro:
      "Firehouse cooking has its own rhythm — grocery runs on the way in, prep while gear dries, and dinner that has to survive when the tones drop. Firehouse recipes on this site are written for that rhythm: big flavors, crew portions, and steps that do not assume a quiet home kitchen.",
    sections: [
      {
        heading: "The firehouse kitchen is not a home kitchen",
        paragraphs: [
          "You might have one oven, two burners busy, and six opinions at the counter. Firehouse recipes account for batch cooking, line-and-serve setups, and sides that can wait without turning to mush.",
          "Hall culture shows up in the food — taco bars, pizza nights, smoked meats on the pad, and breakfast spreads after a long night. Our catalog mirrors what North American halls actually cook, not what tests well on social media.",
          "Every firehouse recipe links to scaling for the crew at your table tonight — whether that is four or twelve.",
        ],
      },
      {
        heading: "Comfort, BBQ, and feeds for the whole hall",
        paragraphs: [
          "Mac and cheese bakes, enchilada casseroles, meatloaf with mashed, and chicken pot pie are the kind of firehouse recipes that calm a room after a tough shift.",
          "BBQ and smoker nights call for brisket, ribs, pulled pork, and wings with sides that scale on sheet pans. We tag these clearly so you are not guessing at cook times on a work night.",
          "When the whole hall eats together — training nights, visiting crews, or the annual open house — feed-a-crowd recipes keep portions and shopping lists honest.",
        ],
      },
      {
        heading: "Preserve firehall cooking culture",
        paragraphs: [
          "Firehouse recipes are how crews bond. The meal is not separate from the job — it is part of station life. Firehall Meals documents that culture with recipes firefighters share across departments, not content farm copy.",
          "Browse firehouse recipes by category, explore the Classics Wheel for hall favorites, or read our guides on station cooking workflow and grocery strategy.",
          "Built by firefighters. Tested in the firehall. That is the standard every recipe here is held to.",
        ],
      },
    ],
    recipeSlugs: [
      "mac-and-cheese-bake",
      "enchilada-casserole",
      "meatloaf-mashed",
      "chicken-pot-pie",
      "smoked-brisket",
      "memphis-dry-rub-ribs",
      "pulled-pork",
      "loaded-baked-potato-bar",
    ],
    relatedPages: [
      { slug: "firefighter-recipes", label: "Firefighter recipes" },
      { slug: "fire-station-meals", label: "Fire station meals" },
      { slug: "firefighter-bbq-recipes", label: "BBQ firefighter recipes" },
    ],
    faqs: [
      {
        question: "What are common firehouse recipes across North America?",
        answer:
          "Chili, chicken parm, burgers, tacos, pizza night, pulled pork, and breakfast spreads after night shift rank among the most common firehouse recipes in halls across the US and Canada.",
      },
      {
        question: "How do firehouse recipes handle dietary differences on the crew?",
        answer:
          "Build-your-own formats — taco bars, potato bars, bowls, and sheet-pan lines — let firefighters adjust portions and toppings without cooking separate meals for every dietary need.",
      },
    ],
  },
  {
    slug: "fire-station-meals",
    path: "/fire-station-meals",
    h1: "Fire Station Meals",
    title: "Fire Station Meals — Shift Dinners for the Crew | Firehall Meals",
    description:
      "Fire station meals for busy shifts — quick plates, big-batch feeds, and crew dinners that survive interrupted cooking. Hall-tested recipes.",
    keywords: ["fire station meals", "station meals", "shift meals", "crew dinners"],
    intro:
      "Fire station meals have to work within shift reality — limited time, shared grocery budgets, and cooking that stops when the tones go. This collection focuses on station meals that fit those constraints: quick wins under forty-five minutes, slow-cooker setups that forgive interruptions, and batch recipes when the whole platoon eats together.",
    sections: [
      {
        heading: "Shift-friendly station meals",
        paragraphs: [
          "When calls stack up, the crew needs meals with clear pause points — sheet pans in the oven, slow cookers holding, or skillet plates that reheat without punishment.",
          "Quick shift categories filter recipes by honest cook time, not best-case blogger estimates. Look for pasta bakes, fajita trays, stir-fry bowls, and one-pot chicken and rice when the night is moving fast.",
          "Station meals should not require three trips to specialty stores. Ingredients are chosen for what you can grab on the way to the hall.",
        ],
      },
      {
        heading: "Budget-conscious crew dinners",
        paragraphs: [
          "Most halls run a grocery pool — station meals need to feed eight to twelve without blowing the weekly budget. Ground proteins, batch starches, and seasonal produce keep costs predictable.",
          "Chili, casseroles, taco bars, and sheet-pan proteins stretch dollars without feeling like penalty food. Our recipes note crew yield so you can plan shopping once.",
          "A typical hall dinner runs roughly ten to fifteen dollars per person depending on protein and market — less when you batch smart and use line-and-serve formats.",
        ],
      },
      {
        heading: "When calls interrupt dinner",
        paragraphs: [
          "The best fire station meals hold on low heat, reheat cleanly, or taste fine at room temp for the crew that gets back last. Avoid finicky emulsions and last-second plating when the tones are unpredictable.",
          "Set up line-and-serve when possible — bowls, burrito bars, and loaded potatoes let late arrivals eat without redoing the whole plate.",
          "Firehall Meals documents these patterns in every station meal recipe so rookies learn hall workflow, not just ingredient lists.",
        ],
      },
    ],
    recipeSlugs: [
      "one-pot-chicken-rice",
      "fast-philly-skillet",
      "sheet-pan-fajitas",
      "big-chili",
      "hall-taco-bar",
      "skillet-chicken-alfredo",
      "philly-cheesesteak-skillet",
      "teriyaki-donburi",
    ],
    relatedPages: [
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "healthy-firefighter-meals", label: "Healthy firefighter meals" },
      { slug: "firefighter-breakfast-recipes", label: "Firefighter breakfast recipes" },
    ],
    faqs: [
      {
        question: "What fire station meals feed 8–12 people on a budget?",
        answer:
          "Chili, taco bars, pasta bakes, sheet-pan fajitas, and rice bowls scale affordably. Plan one primary protein, one starch, and a simple side rather than multiple entrees.",
      },
      {
        question: "What meals work when calls interrupt dinner?",
        answer:
          "Slow-cooker barbacoa, sheet-pan proteins, big-batch chili, and line-and-serve bowls hold well. Avoid dishes that require precise last-minute timing.",
      },
    ],
  },
  {
    slug: "healthy-firefighter-meals",
    path: "/healthy-firefighter-meals",
    h1: "Healthy Firefighter Meals",
    title: "Healthy Firefighter Meals — High-Protein Station Dinners | Firehall Meals",
    description:
      "Healthy firefighter meals with real flavor — high-protein hall plates, performance recipes, and shift-friendly nutrition without diet culture.",
    keywords: [
      "healthy firefighter meals",
      "healthy firefighter recipes",
      "firefighter nutrition",
      "performance meals",
    ],
    intro:
          "Healthy firefighter meals are not sad chicken and broccoli on a tray. Crews on long shifts need protein, recovery, and food that still tastes like dinner — not punishment plates from a wellness slide deck. Our performance catalog and healthy category focus on hall-realistic nutrition: lean proteins, batch vegetables, and flavors that keep the crew actually eating the meal.",
    sections: [
      {
        heading: "Performance meals for the job",
        paragraphs: [
          "Firefighting is physical work. Healthy firefighter meals prioritize protein for recovery, reasonable carbs for energy, and fats that keep you satisfied — not ultra-processed \"health food\" that nobody finishes.",
          "The Performance Meals catalog includes fifty adapted recipes — sheet-pan fajitas, salmon trays, lentil bolognese, turkey chili, and bowl nights — with nutrition notes crews can actually use.",
          "These are not bodybuilder meal prep clones. They are station dinners adjusted for crews who train, sleep irregular hours, and still want flavor.",
        ],
      },
      {
        heading: "Healthy options that still feel like hall food",
        paragraphs: [
          "Grilled proteins, rice bowls, lettuce-wrap nights, and vegetable-forward sheet pans belong in the hall rotation alongside comfort food — especially after heavy weeks.",
          "Browse the healthy options category for hall-tested picks, or explore performance meals when you want macro-friendly plates with full crew scaling.",
          "Smoothies and breakfast guides cover shift-start fuel without pretending a protein shake replaces a crew dinner.",
        ],
      },
      {
        heading: "Sustainable habits, not crash diets",
        paragraphs: [
          "Station culture around food matters. Healthy firefighter meals work best when the whole crew buys in — line-and-serve formats, balanced sides, and rotating cooks who are not mocked for lighter plates.",
          "Firehall Meals guides cover firefighter nutrition, recovery after tough calls, and how to balance comfort nights with performance weeks — written for firefighters, not influencers.",
          "Start with honey-lime chicken trays, Mediterranean baked fish, or turkey quinoa stuffed peppers when you want a healthy hall night that still gets cleaned plates back.",
        ],
      },
    ],
    recipeSlugs: [
      "ginger-salmon-bowls",
      "greek-chicken-bowls",
      "sheet-pan-chicken-fajitas-lite",
      "lean-turkey-bean-chili",
      "honey-garlic-chicken-rice-bowls",
      "mediterranean-baked-fish-tray",
      "turkey-quinoa-stuffed-peppers",
      "lentil-mushroom-bolognese",
    ],
    relatedPages: [
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "fire-station-meals", label: "Fire station meals" },
      { slug: "firefighter-breakfast-recipes", label: "Firefighter breakfast recipes" },
    ],
    faqs: [
      {
        question: "What are the best healthy firefighter meals for long shifts?",
        answer:
          "High-protein sheet pans, salmon bowls, turkey chili, and chicken fajita trays balance recovery and satisfaction. Pair with hydration and reasonable portions — not restrictive rules.",
      },
      {
        question: "Can healthy meals still feed the whole crew?",
        answer:
          "Yes. Performance and healthy category recipes scale to full hall portions with shopping lists adjusted for crew size.",
      },
    ],
  },
  {
    slug: "firefighter-breakfast-recipes",
    path: "/firefighter-breakfast-recipes",
    h1: "Firefighter Breakfast Recipes",
    title: "Firefighter Breakfast Recipes — Station Morning Meals | Firehall Meals",
    description:
      "Firefighter breakfast recipes for after night shift — burritos, egg bakes, pancake trays, and hall spreads sized for the crew.",
    keywords: [
      "firefighter breakfast recipes",
      "firehall breakfast",
      "station breakfast",
      "shift breakfast",
    ],
    intro:
      "Breakfast at the hall hits different — after a night run, before training, or during a weekend shift when the crew eats together before the day starts. Firefighter breakfast recipes here are built for batch cooking: egg bakes, burrito lines, pancake trays, and skillet hashes that scale beyond a single plate.",
    sections: [
      {
        heading: "After the night shift",
        paragraphs: [
          "When the sun comes up and the crew is still at the table, breakfast needs to be hearty without requiring a short-order cook. Egg bakes, burrito bars, and big skillets let people serve themselves while gear gets stowed.",
          "Our breakfast catalog includes hall burritos, sausage egg bakes, protein pancake trays, and hash skillets with crew scaling and shopping lists built in.",
          "Timing accounts for ovens already in use and counters that double as prep space — station reality, not studio kitchen fantasy.",
        ],
      },
      {
        heading: "Batch formats that scale",
        paragraphs: [
          "Burrito lines, French toast bakes, and sheet-pan hashes feed eight to twelve without custom orders. Prep proteins and tortillas ahead so service is assembly, not chaos.",
          "Breakfast-for-dinner also belongs in the hall rotation — pancakes, bacon and egg hash, and breakfast pizza night when the crew wants comfort before a busy evening.",
          "Link breakfast recipes to the full catalog when you want sides or smoothies from our fuel guides.",
        ],
      },
      {
        heading: "Rookie-friendly morning cooks",
        paragraphs: [
          "Egg bakes and sheet-pan formats forgive timing mistakes better than hollandaise and omelette stations. Start rookies on burrito prep and oven bakes before you hand them the whole breakfast line.",
          "Clear step titles and crew yield on every firefighter breakfast recipe help probationary firefighters contribute without guessing portions.",
          "Browse breakfast by category or explore the full breakfast index for every hall morning plate we publish.",
        ],
      },
    ],
    recipeSlugs: [
      "breakfast-burrito-bar",
      "pancake-short-stack",
      "bacon-egg-hash",
      "sausage-egg-bake",
      "french-toast-casserole",
      "chorizo-breakfast-tacos",
      "breakfast-sausage-pizza",
      "biscuits-gravy",
    ],
    relatedPages: [
      { slug: "fire-station-meals", label: "Fire station meals" },
      { slug: "healthy-firefighter-meals", label: "Healthy firefighter meals" },
      { slug: "firefighter-meals", label: "Firefighter meals" },
    ],
    faqs: [
      {
        question: "What are the best firefighter breakfast recipes after night shift?",
        answer:
          "Burrito bars, egg bakes, French toast casseroles, and big skillets let crews serve themselves while winding down. Batch formats beat made-to-order when everyone is tired.",
      },
      {
        question: "Can breakfast recipes feed a full hall?",
        answer:
          "Yes. Breakfast catalog recipes include crew scaling from small platoons to full twelve-person tables with adjusted shopping lists.",
      },
    ],
  },
  {
    slug: "firefighter-bbq-recipes",
    path: "/firefighter-bbq-recipes",
    h1: "BBQ Firefighter Recipes",
    title: "BBQ Firefighter Recipes — Grill & Smoker Hall Nights | Firehall Meals",
    description:
      "BBQ firefighter recipes for grill and smoker nights — brisket, ribs, pulled pork, wings, and crew-sized sides. Hall-tested BBQ plates.",
    keywords: [
      "bbq firefighter recipes",
      "firehall bbq",
      "firehouse bbq",
      "smoker recipes firefighters",
    ],
    intro:
      "BBQ nights are hall holidays — smoker on the pad, grill fired up behind the bay, and sides that have to keep up with the protein. BBQ firefighter recipes here cover brisket and ribs for patient cooks, quick grill plates for busy shifts, and sides that scale on sheet pans when the whole crew eats.",
    sections: [
      {
        heading: "Smoker and grill hall culture",
        paragraphs: [
          "Every hall has someone who owns the smoker and someone who pretends they do. Our BBQ recipes spell out timing, rest periods, and hold strategies so dinner survives when calls interrupt — not just perfect-weather backyard BBQ.",
          "Smoked brisket, Memphis dry-rub ribs, pulled pork, beer-can chicken, and white-sauce wings appear in halls from the South to the Midwest for a reason — they feed crews and taste like celebration food.",
          "When you do not have all day, grill-night shortcuts — chicken sliders, BBQ bowls, and sausage-pepper trays — still feel like hall events without an 8-hour smoke.",
        ],
      },
      {
        heading: "Crew-sized sides and lines",
        paragraphs: [
          "BBQ without sides is just meat. Mac and cheese bakes, cornbread, grilled corn, slaw-friendly bowls, and loaded potato bars round out BBQ firefighter recipes with portions that match the protein.",
          "Line-and-serve works for BBQ bowls — rice, slaw, protein, sauce — so late returns from calls still get a plate without replating the whole spread.",
          "Browse the BBQ and smoker category for the full rotation, or start with burnt ends and brisket when the crew has time to do it right.",
        ],
      },
      {
        heading: "Budget and batch planning",
        paragraphs: [
          "BBQ can stretch or break a grocery pool depending on protein choice. Pulled pork and chicken stretch farther than premium brisket on a tight week — rotate accordingly.",
          "Shop once, prep rubs and sides early, and use hold times documented in each recipe so the meal does not peak before the crew sits down.",
          "Firehall Meals BBQ recipes include crew scaling so you are not guessing how much rub to buy for twelve hungry firefighters.",
        ],
      },
    ],
    recipeSlugs: [
      "smoked-brisket",
      "bbq-brisket-burnt-ends",
      "memphis-dry-rub-ribs",
      "pulled-pork",
      "beer-can-chicken",
      "smoked-wings-white-sauce",
      "bbq-chicken-sliders",
      "carolina-mustard-pork",
    ],
    relatedPages: [
      { slug: "firehouse-recipes", label: "Firehouse recipes" },
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "firefighter-recipes", label: "Firefighter recipes" },
    ],
    faqs: [
      {
        question: "What BBQ recipes work best for firefighter crews?",
        answer:
          "Pulled pork, brisket, ribs, and smoked wings scale well with sheet-pan sides. Use bowls or lines when you need flexibility for late-arriving crew members.",
      },
      {
        question: "Can you do BBQ on a busy shift?",
        answer:
          "Quick grill plates and slow-cooker BBQ chicken work when you cannot tend a smoker all day. Save full brisket smokes for days with predictable downtime.",
      },
    ],
  },
  {
    slug: "firehouse-meals",
    path: "/firehouse-meals",
    h1: "Firehouse Meals",
    title: "Firehouse Meals — Classic Station Dinners | Firehall Meals",
    description:
      "Firehouse meals built for real station kitchens — crew-sized classics, interruption-friendly timing, and dinners firefighters actually cook on shift.",
    keywords: [
      "firehouse meals",
      "firehouse dinner",
      "firehouse cooking",
      "station dinners",
      "firefighter meals",
    ],
    intro:
      "Firehouse meals are the dinners that show up on the white board week after week — chicken parm, chili, smash burgers, taco night, and the sheet-pan spreads that survive when tones drop mid-cook. They are not restaurant plating. They are crew food: honest portions, clear steps, and leftovers that still taste good at 0200.",
    sections: [
      {
        heading: "What counts as a real firehouse meal",
        paragraphs: [
          "A firehouse meal feeds the table without a culinary degree. It scales from a quiet two-person night to a full company, holds under foil when someone gets back late, and uses grocery-store ingredients — not specialty pantry items nobody restocks.",
          "The classics earn their place because they are reliable under interruption. Slow cookers, sheet pans, Dutch ovens, and big skillets are the tools that match station life better than delicate sauces that need constant attention.",
          "Firehall Meals documents those dinners with crew scaling built in, so you are not mentally multiplying a four-person blog recipe while the bay doors open.",
        ],
      },
      {
        heading: "Culture on the plate",
        paragraphs: [
          "Firehouse cooking is part of station culture. The meal is where rookies learn timing, veterans pass on shortcuts, and the crew reconnects after a tough run. Getting dinner right matters more than getting it fancy.",
          "That is why our firehouse meals lean on recognizable hall favorites — not trendy restaurant copy. When the captain asks what is for dinner, you want a confident answer, not a science experiment.",
          "Browse the catalog for the full rotation, spin the Classics Wheel when nobody can decide, or use Find a Meal when the grocery run already happened and you need a fast answer.",
        ],
      },
      {
        heading: "Portions for 2 to 20",
        paragraphs: [
          "Station head count swings. Firehouse meals here are written for crew tables and adjusted with a crew-size control so shopping lists and steps stay honest whether you are feeding four or fourteen.",
          "Beginner-friendly instructions matter when the cook of the day is a probationary firefighter. Every recipe assumes limited kitchen experience and a shared kitchen that may not have every gadget.",
          "Start with chicken parm, big chili, or smash burgers if you want guaranteed buy-in — then branch into bowls, BBQ nights, and healthy plates as the crew trusts the rotation.",
        ],
      },
    ],
    recipeSlugs: [
      "chicken-parm",
      "smash-burgers",
      "big-chili",
      "pulled-pork",
      "meatloaf-mashed",
      "steak-tacos",
      "sheet-pan-fajitas",
      "beef-dip",
    ],
    relatedPages: [
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "firehouse-recipes", label: "Firehouse recipes" },
      { slug: "crew-meals", label: "Crew meals" },
    ],
    faqs: [
      {
        question: "What are classic firehouse meals?",
        answer:
          "Chicken parm, chili, smash burgers, taco bars, pulled pork, meatloaf, and sheet-pan fajitas are staples in firehouses across North America because they scale, hold, and taste like real crew food.",
      },
      {
        question: "How are firehouse meals different from home recipes?",
        answer:
          "They are written for shared kitchens, interruption-friendly timing, and crew portions — not single-plate plating or specialty equipment most stations do not own.",
      },
      {
        question: "Can a rookie cook firehouse meals?",
        answer:
          "Yes. Firehall Meals recipes emphasize clear steps, visual cues, and common-mistake notes so a firefighter with little cooking experience can still get dinner on the table.",
      },
    ],
  },
  {
    slug: "firefighter-dinner-ideas",
    path: "/firefighter-dinner-ideas",
    h1: "Firefighter Dinner Ideas",
    title: "Firefighter Dinner Ideas for Stuck Crews | Firehall Meals",
    description:
      "Firefighter dinner ideas when the hall is stuck on what to cook — quick shift plates, crew classics, BBQ nights, and healthy options that scale.",
    keywords: [
      "firefighter dinner ideas",
      "fire station dinner ideas",
      "what to cook at the firehouse",
      "firefighter meals",
      "crew dinner ideas",
    ],
    intro:
      "When the whiteboard is blank and the debate starts, you need firefighter dinner ideas that end the argument — not another scroll through generic recipe apps. These ideas are sized for the hall, timed for real shifts, and proven enough that someone will actually eat a second plate.",
    sections: [
      {
        heading: "When nobody can decide",
        paragraphs: [
          "Stuck crews usually need three paths: a fast skillet or sheet-pan night, a comfort classic everyone already likes, or a build-your-own bowl/taco line that lets picky eaters customize without cooking three dinners.",
          "If the grocery run already happened, match dinner to what is in the fridge. If you still have to shop, pick a meal with a short list and Costco-friendly packs so you are not hunting specialty sauces at 1600.",
          "Firehall Meals Find a Meal and the Classics Wheel exist for this exact moment — when the debate is louder than the appetite.",
        ],
      },
      {
        heading: "Ideas by shift mood",
        paragraphs: [
          "Busy night: sheet-pan fajitas, skillet pasta, or teriyaki bowls that finish in under an hour. Quiet night: smoked protein, Dutch-oven comfort, or a longer braise that can hold.",
          "After a tough run: chili, meatloaf, chicken parm — food that feels like the hall, not a diet plan. Training day: high-protein plates and simple sides that do not wreck the kitchen.",
          "Breakfast-for-dinner still counts when the crew wants eggs, burritos, or red lead energy. The catalog covers those nights too.",
        ],
      },
      {
        heading: "Turn an idea into a cooked meal",
        paragraphs: [
          "Every idea below links to a full crew-scaled recipe with shopping lists, steps, and hold notes for when tones interrupt. Pick one, set crew size, and cook.",
          "If you want more browsing, jump into firefighter meals, firehouse meals, or the full Explore catalog by protein and time.",
          "The goal is simple: fewer takeout nights, less whiteboard arguing, and dinners that still work when half the crew is late from a run.",
        ],
      },
    ],
    recipeSlugs: [
      "sheet-pan-fajitas",
      "chicken-parm",
      "smash-burgers",
      "bbq-chicken-bowls",
      "steak-tacos",
      "big-chili",
      "pad-thai",
      "beef-stroganoff",
    ],
    relatedPages: [
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "crew-meals", label: "Crew meals" },
      { slug: "firehouse-meals", label: "Firehouse meals" },
    ],
    faqs: [
      {
        question: "What should firefighters cook for dinner tonight?",
        answer:
          "Start with a hall classic the crew already likes — chicken parm, chili, fajitas, or smash burgers — or use Find a Meal to match protein, time, and head count.",
      },
      {
        question: "What are easy firefighter dinner ideas for rookies?",
        answer:
          "Sheet-pan fajitas, skillet bowls, taco bars, and slow-cooker meals are forgiving. Look for recipes with clear visual cues and hold instructions.",
      },
      {
        question: "How do we feed late-returning crew members?",
        answer:
          "Choose meals that hold well — chili, bowls, taco lines, pulled pork — and keep a covered backup pan above safe holding temperature.",
      },
    ],
  },
  {
    slug: "crew-meals",
    path: "/crew-meals",
    h1: "Crew Meals",
    title: "Crew Meals for Firefighters & Firehalls | Firehall Meals",
    description:
      "Crew meals designed for firefighters cooking together — portions for 2–20, shift-friendly timing, and station dinners built for a shared kitchen.",
    keywords: [
      "crew meals",
      "meals for a crew",
      "firefighter crew dinner",
      "firehall crew meals",
      "meals for 10 firefighters",
    ],
    intro:
      "Crew meals are the opposite of single-plate cooking. Someone shops, someone cooks, everyone eats — and the portions have to match the table, not a food blog serving of four. Firehall Meals builds every recipe around that reality: scalable amounts, shared-kitchen steps, and food that still works when half the company is late.",
    sections: [
      {
        heading: "Cooking for the table, not Instagram",
        paragraphs: [
          "A good crew meal has a clear protein, a starch or line that stretches, and sides that can wait without turning to mush. Bowls, taco bars, pasta bakes, and sheet pans dominate for a reason — they portion cleanly and forgive interruptions.",
          "Beginner cooks should not be set up to fail. Our crew meals spell out pans, times, temperatures, and common mistakes so a rookie can run dinner without the crew ordering pizza behind their back.",
          "Whether you are feeding two on a quiet night or twenty after mutual aid, set the crew size and let the shopping list and steps adjust.",
        ],
      },
      {
        heading: "Built for station workflow",
        paragraphs: [
          "Station cooking is teamwork with bad timing. Prep what you can before the busy window, keep hot and cold components separate, and use large baking dishes or sheet pans that fit a real firehouse kitchen.",
          "Call interruptions are normal. Recipes that hold — chili, pulled pork, bowl bars, braises — beat delicate dishes that peak in a ten-minute window.",
          "Use Find a Meal when you need a fast crew answer, or browse firefighter dinner ideas when the whiteboard debate will not end.",
        ],
      },
      {
        heading: "Budget and leftover sense",
        paragraphs: [
          "Crew meals should respect the grocery pool. Batch proteins, use Costco-friendly packs, and plan leftovers that become next-shift lunches instead of trash.",
          "Leftover guidance on each recipe helps the next cook turn yesterday's chili into nachos or bowl toppings without guessing.",
          "Firehall Meals exists so crew cooking feels like a system — not a nightly scramble.",
        ],
      },
    ],
    recipeSlugs: [
      "big-chili",
      "pulled-pork",
      "chicken-parm",
      "bbq-chicken-bowls",
      "sheet-pan-fajitas",
      "steak-tacos",
      "smash-burgers",
      "meatloaf-mashed",
    ],
    relatedPages: [
      { slug: "firefighter-dinner-ideas", label: "Firefighter dinner ideas" },
      { slug: "firefighter-meals", label: "Firefighter meals" },
      { slug: "fire-station-meals", label: "Fire station meals" },
    ],
    faqs: [
      {
        question: "What are crew meals for firefighters?",
        answer:
          "Crew meals are dinners cooked and eaten together at the firehall — sized for multiple firefighters, timed for shift work, and designed for a shared kitchen.",
      },
      {
        question: "How many people do these recipes feed?",
        answer:
          "Most Firehall Meals recipes scale from small crews to larger companies (roughly 2–20). Set crew size on the recipe page to adjust portions and shopping lists.",
      },
      {
        question: "What crew meals work best for beginners?",
        answer:
          "Chili, taco bowls, sheet-pan fajitas, and slow-cooker pulled pork are forgiving. Look for recipes with clear steps and hold instructions.",
      },
    ],
  },
];

const PAGE_BY_SLUG = new Map(SEO_LANDING_PAGES.map((p) => [p.slug, p]));

export function getSeoLandingPage(slug: string): SeoLandingPageDef | undefined {
  return PAGE_BY_SLUG.get(slug as SeoLandingPageSlug);
}

export function seoLandingPagePath(slug: SeoLandingPageSlug): string {
  return PAGE_BY_SLUG.get(slug)?.path ?? `/${slug}`;
}

export function allSeoLandingPagePaths(): string[] {
  return SEO_LANDING_PAGES.map((p) => p.path);
}
