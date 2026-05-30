/**
 * Blog content architecture — detailed outlines for firefighter meal SEO articles.
 * Full articles publish at /guides/{slug} when written from these outlines.
 */

export type BlogOutline = {
  slug: string;
  path: string;
  title: string;
  targetKeyword: string;
  metaDescription: string;
  audience: string;
  sections: Array<{ heading: string; bullets: string[] }>;
  internalLinks: string[];
  curatedRecipeSlugs: string[];
};

export const BLOG_OUTLINES: BlogOutline[] = [
  {
    slug: "best-firefighter-meals",
    path: "/blog/best-firefighter-meals",
    title: "Best Firefighter Meals for Station Kitchens",
    targetKeyword: "best firefighter meals",
    metaDescription:
      "The best firefighter meals crews actually cook — hall classics, quick shift plates, and feeds for the whole station.",
    audience: "Crew cooks deciding what to make this week",
    sections: [
      {
        heading: "What makes a meal hall-worthy",
        bullets: [
          "Crew yield 8–12 without a prep marathon",
          "Holds after tones drop",
          "Rookie-friendly steps",
          "Budget-conscious grocery lists",
        ],
      },
      {
        heading: "Top hall classics",
        bullets: [
          "Chicken parm, smash burgers, pulled pork",
          "Big chili and taco bars",
          "Steak tacos and beef dip",
          "Link each to catalog recipe pages",
        ],
      },
      {
        heading: "Quick shift picks",
        bullets: [
          "Sheet-pan fajitas, one-pot chicken rice",
          "Skillet philly and pasta bakes",
          "When to use Find a Meal vs browse",
        ],
      },
      {
        heading: "FAQ",
        bullets: ["Budget per crew", "Rookie recommendations", "Healthy rotation"],
      },
    ],
    internalLinks: ["/firefighter-meals", "/recipes", "/wheel"],
    curatedRecipeSlugs: ["chicken-parm", "smash-burgers", "pulled-pork", "big-chili"],
  },
  {
    slug: "firefighter-breakfast-ideas",
    path: "/blog/firefighter-breakfast-ideas",
    title: "Firefighter Breakfast Ideas After Night Shift",
    targetKeyword: "firefighter breakfast ideas",
    metaDescription:
      "Firefighter breakfast ideas for after a busy night — burrito bars, egg bakes, and hall spreads sized for the crew.",
    audience: "Crews cooking morning meal after overnight runs",
    sections: [
      { heading: "After the night shift", bullets: ["Self-serve formats", "Oven vs stovetop load", "Cleanup reality"] },
      { heading: "Batch breakfast formats", bullets: ["Burrito bar", "French toast bake", "Egg bake trays", "Hash skillets"] },
      { heading: "Breakfast-for-dinner", bullets: ["Pancake stacks", "Breakfast pizza", "When halls flip meal timing"] },
      { heading: "FAQ", bullets: ["Feeding 12", "Rookie breakfast cooks", "Healthy options"] },
    ],
    internalLinks: ["/firefighter-breakfast-recipes", "/breakfast", "/fire-station-meals"],
    curatedRecipeSlugs: ["breakfast-burrito-bar", "sausage-egg-bake", "pancake-short-stack"],
  },
  {
    slug: "healthy-firefighter-meals",
    path: "/blog/healthy-firefighter-meals",
    title: "Healthy Firefighter Meals That Still Taste Like Dinner",
    targetKeyword: "healthy firefighter meals",
    metaDescription:
      "Healthy firefighter meals for long shifts — high-protein hall plates without diet-culture punishment food.",
    audience: "Crews balancing performance and hall culture",
    sections: [
      { heading: "Nutrition on shift", bullets: ["Recovery vs restriction", "Protein targets", "Hydration"] },
      { heading: "Performance catalog picks", bullets: ["Salmon trays", "Turkey chili", "Bowls and fajitas"] },
      { heading: "Healthy + comfort balance", bullets: ["Rotating comfort nights", "Line-and-serve flexibility"] },
      { heading: "FAQ", bullets: ["Macro-friendly hall food", "Crew buy-in", "Budget"] },
    ],
    internalLinks: ["/healthy-firefighter-meals", "/categories/healthy_options", "/recipes"],
    curatedRecipeSlugs: ["ginger-salmon-bowls", "lean-turkey-bean-chili", "sheet-pan-chicken-fajitas-lite"],
  },
  {
    slug: "firehouse-cooking-tips",
    path: "/blog/firehouse-cooking-tips",
    title: "Firehouse Cooking Tips for Station Kitchens",
    targetKeyword: "firehouse cooking tips",
    metaDescription:
      "Firehouse cooking tips from crews who cook on shift — workflow, interruptions, grocery runs, and hall etiquette.",
    audience: "New cooks and officers setting kitchen expectations",
    sections: [
      { heading: "Station kitchen workflow", bullets: ["Prep before tones", "Line-and-serve", "Hold strategies"] },
      { heading: "Grocery and budget", bullets: ["Pool math", "Shop once", "Batch proteins"] },
      { heading: "Crew dynamics", bullets: ["Rotating cooks", "Rookie nights", "Dietary differences"] },
      { heading: "FAQ", bullets: ["Interrupted dinner", "Equipment limits", "Cleanup standards"] },
    ],
    internalLinks: ["/guides/topic/station-cooking", "/firehouse-recipes", "/faq"],
    curatedRecipeSlugs: ["hall-taco-bar", "big-chili", "sheet-pan-fajitas"],
  },
  {
    slug: "bbq-recipes-for-firefighters",
    path: "/blog/bbq-recipes-for-firefighters",
    title: "BBQ Recipes for Firefighters — Grill & Smoker Hall Nights",
    targetKeyword: "bbq recipes for firefighters",
    metaDescription:
      "BBQ recipes for firefighters — brisket, ribs, pulled pork, and crew-sized sides for hall grill nights.",
    audience: "Crews planning smoker or pad BBQ events",
    sections: [
      { heading: "Hall BBQ culture", bullets: ["Smoker on the pad", "Hold times", "Weather and calls"] },
      { heading: "Long smokes vs quick grill", bullets: ["Brisket days", "Slider nights", "When to simplify"] },
      { heading: "Sides that scale", bullets: ["Mac bakes", "Corn", "Bowls and slaw lines"] },
      { heading: "FAQ", bullets: ["Budget proteins", "Interrupted smokes", "Feeding visitors"] },
    ],
    internalLinks: ["/firefighter-bbq-recipes", "/categories/bbq_smoker", "/recipes"],
    curatedRecipeSlugs: ["smoked-brisket", "pulled-pork", "memphis-dry-rub-ribs"],
  },
  {
    slug: "fire-station-meal-planning",
    path: "/blog/fire-station-meal-planning",
    title: "Fire Station Meal Planning for the Week",
    targetKeyword: "fire station meal planning",
    metaDescription:
      "Fire station meal planning — grocery pools, rotating cooks, and a practical weekly hall meal rhythm.",
    audience: "Officers and senior firefighters planning the week",
    sections: [
      { heading: "Weekly hall rhythm", bullets: ["Comfort vs healthy nights", "BBQ weekends", "Quick shift defaults"] },
      { heading: "Grocery pool math", bullets: ["Per-person targets", "Batch shopping", "Leftover strategy"] },
      { heading: "Tools on Firehall Meals", bullets: ["Catalog browse", "Find a Meal", "Classics Wheel", "Saved favorites"] },
      { heading: "FAQ", bullets: ["8–12 crew budgets", "Multiple dietary needs", "Rookie rotation"] },
    ],
    internalLinks: ["/fire-station-meals", "/firefighter-meals", "/recipes"],
    curatedRecipeSlugs: ["one-pot-chicken-rice", "big-chili", "meatloaf-mashed"],
  },
  {
    slug: "top-25-firehall-classics",
    path: "/blog/top-25-firehall-classics",
    title: "Top 25 Firehall Classics Every Firefighter Should Know",
    targetKeyword: "firehall classics",
    metaDescription:
      "The top 25 firehall classics crews cook across North America — with links to full firefighter recipes.",
    audience: "Rookies and crews building their hall rotation",
    sections: [
      { heading: "The definitive list", bullets: ["Rank 1–25 with one-line why", "Link each to /recipes/{slug}"] },
      { heading: "Regional variations", bullets: ["East vs Midwest vs West BBQ", "Breakfast traditions"] },
      { heading: "Classics Wheel overlap", bullets: ["Ten wheel picks", "How to use the wheel"] },
      { heading: "FAQ", bullets: ["Easiest classics", "Budget classics", "Healthy alternates"] },
    ],
    internalLinks: ["/wheel", "/firefighter-recipes", "/recipes"],
    curatedRecipeSlugs: ["chicken-parm", "smash-burgers", "beef-dip", "steak-tacos", "chili-garlic-bread"],
  },
  {
    slug: "rookie-firefighter-meals",
    path: "/blog/rookie-firefighter-meals",
    title: "Rookie Firefighter Meals — Easy Crew Dinners to Start With",
    targetKeyword: "rookie firefighter meals",
    metaDescription:
      "Easy rookie firefighter meals with clear steps and forgiving timing — start your first crew dinners with confidence.",
    audience: "Probationary firefighters cooking for the crew",
    sections: [
      { heading: "First crew dinner anxiety", bullets: ["Hall expectations", "Captain standards", "It's OK to keep it simple"] },
      { heading: "Start here recipes", bullets: ["Meatloaf", "Chicken parm", "Sheet-pan fajitas", "Egg bakes"] },
      { heading: "Formats that forgive mistakes", bullets: ["Slow cooker", "Line-and-serve", "One-pot"] },
      { heading: "FAQ", bullets: ["Budget", "Timing", "When to ask for help"] },
    ],
    internalLinks: ["/firefighter-meals", "/categories/crew_favorites", "/faq"],
    curatedRecipeSlugs: ["meatloaf-mashed", "chicken-parm", "sheet-pan-fajitas"],
  },
];

export const BLOG_OUTLINE_PATHS = BLOG_OUTLINES.map((o) => o.path);
