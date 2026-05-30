import type { FaqItem } from "./schema.js";
import {
  APPROVED_CATALOG_TOTAL,
  marketingRecipeCountCopy,
} from "../meal-catalog/curated-count.js";

export type SeoLandingPageSlug =
  | "firefighter-meals"
  | "firefighter-recipes"
  | "firehouse-recipes"
  | "fire-station-meals"
  | "healthy-firefighter-meals"
  | "firefighter-breakfast-recipes"
  | "firefighter-bbq-recipes";

export type SeoLandingPageSection = {
  heading: string;
  paragraphs: string[];
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
  /** Curated catalog slugs linked on the page */
  recipeSlugs: string[];
  relatedPages: Array<{ slug: SeoLandingPageSlug; label: string }>;
  faqs: FaqItem[];
};

export const SEO_LANDING_PAGES: SeoLandingPageDef[] = [
  {
    slug: "firefighter-meals",
    path: "/firefighter-meals",
    h1: "Firefighter Meals",
    title: "Firefighter Meals — Crew Dinners for the Hall | Firehall Meals",
    description:
      "Firefighter meals sized for the crew — hall-tested dinners, shift-friendly timing, and station portions. Built by firefighters. Tested in the firehall.",
    keywords: [
      "firefighter meals",
      "meals for firefighters",
      "crew meals",
      "firehall meals",
      "station meals",
    ],
    intro:
      "Every hall has the same argument before the tones drop: what's for dinner? Firefighter meals are not home-cooking scaled up — they are built for crews who eat together, cook between calls, and need food that still tastes good when someone gets back late. Firehall Meals exists to end that debate with real station dinners, not influencer food.",
    sections: [
      {
        heading: "What makes a meal work at the firehall",
        paragraphs: [
          "A good firefighter meal feeds eight to twelve without a prep marathon. It holds on the line after a call, scales when a neighboring hall drops in, and does not require three specialty gadgets nobody owns at the station.",
          "Skillet plates, sheet pans, slow cookers, and big-batch chili are hall staples because they survive interruptions. The best firefighter meals have clear steps a rookie can follow and enough flavor that the captain does not quietly order pizza afterward.",
          "Firehall Meals organizes every recipe by how halls actually cook: quick shift nights, BBQ feeds, healthy performance plates, comfort food after tough runs, and feeds for a crowd when the whole battalion shows up.",
        ],
      },
      {
        heading: "Crew-sized portions and honest timing",
        paragraphs: [
          "Blog recipes sized for four do not translate to a station kitchen. Our firefighter meals default to crew portions with shopping lists that match what you buy at the grocery store — not metric conversions buried in a comment section.",
          "Timing is written for real shift flow: prep that can pause when the tones go, steps that do not assume someone is watching a pot for forty uninterrupted minutes, and cleanup that does not leave the hall a disaster before bed.",
          "Browse the full catalog when you want to pick a specific plate, or use Find a Meal when the crew wants a fast answer based on protein, time, and head count.",
        ],
      },
      {
        heading: "Hall classics every crew recognizes",
        paragraphs: [
          "Chicken parm, smash burgers, pulled pork, steak tacos, beef dip, and big-batch chili show up in halls across North America for a reason — they feed people, they scale, and they taste like the kind of food firefighters actually want after a shift.",
          "Our Classics Wheel spins through ten hall-tested picks when nobody can decide. It is the same kitchen-table gamble every station knows, backed by full recipes with crew scaling built in.",
          "Whether you are cooking for two on a quiet night or feeding twelve after training, start with firefighter meals that were written on shift — not copied from a home kitchen blog.",
        ],
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
    ],
    relatedPages: [
      { slug: "firefighter-recipes", label: "Firefighter recipes" },
      { slug: "fire-station-meals", label: "Fire station meals" },
      { slug: "healthy-firefighter-meals", label: "Healthy firefighter meals" },
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
