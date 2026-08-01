import type { FaqItem } from "./schema.js";

/**
 * Public educational product SEO pages.
 * Never expose private hall data — explain problems, workarounds, and Firehall Meals solutions.
 */

export type ProductSeoPageSlug =
  | "hall-meal-planner"
  | "firefighter-dinner-vote"
  | "fire-hall-pantry"
  | "canteen-manager"
  | "cost-per-plate-calculator"
  | "fire-hall-grocery-list"
  | "fire-station-kitchen-inventory"
  | "firefighter-meal-calendar"
  | "crew-grocery-budget"
  | "classics-wheel";

export type ProductSeoScreenshot = {
  /** Optional public asset under /images/product/ — mock UI renders when absent */
  src?: string;
  alt: string;
  caption: string;
  /** Short label shown on the mock preview frame */
  mockTitle: string;
  mockLines: string[];
};

export type ProductSeoCta = {
  href: string;
  label: string;
  variant?: "primary" | "outline";
};

export type ProductSeoPageDef = {
  slug: ProductSeoPageSlug;
  path: string;
  h1: string;
  title: string;
  description: string;
  keywords: string[];
  intro: string;
  problem: { heading: string; paragraphs: string[] };
  currentWorkaround: { heading: string; paragraphs: string[] };
  solution: { heading: string; paragraphs: string[] };
  screenshots: ProductSeoScreenshot[];
  recipeSlugs: string[];
  guideSlugs: Array<{ slug: string; label: string }>;
  relatedProducts: Array<{ slug: ProductSeoPageSlug; label: string }>;
  ctas: ProductSeoCta[];
  faqs: FaqItem[];
  /** Schema.org SoftwareApplication name */
  appName: string;
};

export const PRODUCT_SEO_PAGES: ProductSeoPageDef[] = [
  {
    slug: "hall-meal-planner",
    path: "/hall-meal-planner",
    h1: "Hall Meal Planner",
    title: "Hall Meal Planner for Fire Stations | Firehall Meals",
    description:
      "Plan fire hall dinners by shift — crew portions, shopping lists, and hold-friendly meals. End the whiteboard debate with a real hall meal planner.",
    keywords: [
      "fire hall meal planner",
      "fire station meal planner",
      "firefighter meal planner",
      "hall meal planner",
      "crew meal planning",
    ],
    intro:
      "A hall meal planner is how stations stop arguing at 16:00 and start cooking with a plan. Firehall Meals turns “what’s for dinner?” into a shared shift plan — recipes sized for the crew, shopping that matches a real grocery run, and timing written for tones dropping mid-prep.",
    problem: {
      heading: "The problem every fire hall knows",
      paragraphs: [
        "Dinner at the station is not one person’s weeknight cook. Head count changes when a neighboring hall drops in. Someone is late from a call. The whiteboard still says “???” and the rookie is staring at the fridge.",
        "Without a plan, crews default to takeout, the same three meals on rotation, or whoever speaks loudest. That burns the grocery budget, wastes protein sitting in the freezer, and leaves nobody happy after a long shift.",
      ],
    },
    currentWorkaround: {
      heading: "How firefighters usually “plan” dinner today",
      paragraphs: [
        "Most halls still run dinner on group texts, sticky notes, and institutional memory. One firefighter shops. Another cooks. Nobody writes down what worked last tour — so the next crew reinvents the same argument.",
        "Paper calendars fall apart when overtime changes the roster. Spreadsheets help for a week, then go stale. Recipe blogs sized for four do not scale to ten hungry firefighters with forty minutes before the next run.",
      ],
    },
    solution: {
      heading: "How Firehall Meals plans hall dinners",
      paragraphs: [
        "Firehall Meals is a hall meal planner built for station kitchens: pick protein, time, and head count; get a crew-sized dinner with a shopping list; spin the Classics Wheel when nobody can decide; and keep hall tools (voting, canteen, shopping) behind a private hall space so public SEO pages never expose your roster or budget.",
        "Public tools like Find a Meal and the Classics Wheel work without joining a hall. Hall features — shared plans, dinner votes, pantry — stay private to your station. Educational pages like this one explain the workflow so searchers find the product; your hall data never gets indexed.",
      ],
    },
    screenshots: [
      {
        alt: "Hall meal planner UI showing protein, time, and crew size filters for tonight’s dinner",
        caption: "Filter by protein, cook time, and head count — then pick a shift-ready dinner.",
        mockTitle: "Find a Meal",
        mockLines: [
          "Protein · Time · Head count",
          "Chicken · Under 45 min · Crew of 8",
          "Suggested: Sheet Pan Fajitas",
          "Open recipe → shopping list",
        ],
      },
      {
        alt: "Crew dinner plan with shopping list preview for a fire hall meal",
        caption: "Every plan ties to a full recipe page with crew scaling and a grocery-ready list.",
        mockTitle: "Tonight’s plan",
        mockLines: [
          "Dinner: Smash Burgers",
          "Serves 8–10 · ~35 min",
          "Shopping: beef, buns, pickles…",
          "Share with the cook / shopper",
        ],
      },
    ],
    recipeSlugs: [
      "chicken-parm",
      "smash-burgers",
      "sheet-pan-fajitas",
      "big-chili",
      "pulled-pork",
      "steak-tacos",
    ],
    guideSlugs: [
      { slug: "planning-tonights-station-dinner", label: "Planning tonight’s station dinner" },
      { slug: "feeding-a-firehall-crew", label: "Feeding a firehall crew" },
      { slug: "best-firehall-meals-busy-nights", label: "Best firehall meals for busy nights" },
      { slug: "meals-feeding-10-firefighters", label: "Meals for feeding 10 firefighters" },
    ],
    relatedProducts: [
      { slug: "firefighter-dinner-vote", label: "Dinner Voting" },
      { slug: "classics-wheel", label: "Classics Wheel" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
      { slug: "firefighter-meal-calendar", label: "Meal Calendar" },
    ],
    ctas: [
      { href: "/generator", label: "Find a Meal", variant: "primary" },
      { href: "/wheel", label: "Spin the Classics Wheel", variant: "outline" },
      { href: "/hall/join", label: "Join your hall", variant: "outline" },
    ],
    faqs: [
      {
        question: "What is a hall meal planner?",
        answer:
          "A hall meal planner helps a fire station decide and prep dinner for the crew — with portions, timing, and shopping that match station life, not a home kitchen of four.",
      },
      {
        question: "Can we use Firehall Meals without sharing private hall data publicly?",
        answer:
          "Yes. Recipe pages, Find a Meal, and the Classics Wheel are public. Hall voting, pantry, and shopping stay inside your private hall space and are not indexed for search.",
      },
      {
        question: "How is this different from a normal meal planning app?",
        answer:
          "Recipes default to crew portions, hold notes for call interruptions, and station shopping lists. The product language and tools are built around firehall shifts — not family meal kits.",
      },
      {
        question: "Where do we start if the whiteboard is blank tonight?",
        answer:
          "Use Find a Meal or spin the Classics Wheel for a fast pick, then open the recipe for shopping and steps. Join a hall when you want shared voting and pantry tools across the crew.",
      },
    ],
    appName: "Firehall Meals Hall Meal Planner",
  },
  {
    slug: "firefighter-dinner-vote",
    path: "/firefighter-dinner-vote",
    h1: "Firefighter Dinner Voting",
    title: "Firefighter Dinner Vote — End the Hall Argument | Firehall Meals",
    description:
      "Run a firefighter dinner vote so the whole crew picks tonight’s meal. Fair, fast, and built for fire stations — not endless group chats.",
    keywords: [
      "firefighter dinner vote",
      "fire hall dinner vote",
      "crew dinner voting",
      "station meal vote",
      "what’s for dinner firefighters",
    ],
    intro:
      "Firefighter dinner voting settles the loudest argument in the kitchen: who gets to decide what’s for dinner. Instead of captain’s choice forever or a group chat that dies mid-shift, the crew votes on real hall-ready options.",
    problem: {
      heading: "Why dinner turns into an argument",
      paragraphs: [
        "Everybody has a preference. Nobody wants to be the one who picks wrong. The same two people always decide, or the newest firefighter gets stuck cooking whatever was yelled first.",
        "When votes live in texts and whiteboards, results disappear, late arrivals never get a say, and you cannot prove the crew actually agreed on chili night.",
      ],
    },
    currentWorkaround: {
      heading: "How stations vote today",
      paragraphs: [
        "Show of hands in the kitchen. Sticky notes on the fridge. A poll in the chat that half the crew never opens because they are on a call or asleep after nights.",
        "Some halls rotate “cook’s choice,” which is fair in theory and chaotic when the cook is a rookie staring at an empty pantry with twenty minutes left.",
      ],
    },
    solution: {
      heading: "Dinner voting in Firehall Meals",
      paragraphs: [
        "Hall dinner voting lets the crew choose between real Firehall Meals options — classics and catalog dinners sized for the station — then locks a result the cook can act on. Voting lives in the private hall space so your roster and choices stay off the public web.",
        "Pair voting with Find a Meal and the Classics Wheel when you need nominees fast. Public pages explain the workflow; your hall’s vote history never becomes SEO content.",
      ],
    },
    screenshots: [
      {
        alt: "Firefighter dinner vote ballot with three crew meal options",
        caption: "Put real hall dinners on the ballot — not vague categories like “something Mexican.”",
        mockTitle: "Tonight’s vote",
        mockLines: [
          "Option A: Chicken Parm",
          "Option B: Big Chili",
          "Option C: Steak Tacos",
          "Votes in · Lock dinner",
        ],
      },
      {
        alt: "Dinner vote results screen for a fire hall crew",
        caption: "Clear winner, clear cook assignment — then open the recipe and shopping list.",
        mockTitle: "Results",
        mockLines: [
          "Winner: Steak Tacos",
          "8 votes · Locked",
          "Cook: kitchen lead",
          "Open recipe → shop",
        ],
      },
    ],
    recipeSlugs: [
      "chicken-parm",
      "big-chili",
      "steak-tacos",
      "smash-burgers",
      "bbq-chicken-bowls",
      "meatloaf-mashed",
    ],
    guideSlugs: [
      { slug: "planning-tonights-station-dinner", label: "Planning tonight’s station dinner" },
      { slug: "meals-firefighters-actually-cook", label: "Meals firefighters actually cook" },
      { slug: "25-firefighter-dinner-ideas", label: "25 firefighter dinner ideas" },
      { slug: "firehall-taco-night-ideas", label: "Firehall taco night ideas" },
    ],
    relatedProducts: [
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
      { slug: "classics-wheel", label: "Classics Wheel" },
      { slug: "firefighter-meal-calendar", label: "Meal Calendar" },
    ],
    ctas: [
      { href: "/hall/join", label: "Set up hall voting", variant: "primary" },
      { href: "/wheel", label: "Spin for nominees", variant: "outline" },
      { href: "/explore", label: "Browse recipes", variant: "outline" },
    ],
    faqs: [
      {
        question: "How does a firefighter dinner vote work?",
        answer:
          "The hall puts a few crew-ready meals on a ballot. Firefighters vote in the private hall space. The winning recipe becomes tonight’s plan with shopping and steps attached.",
      },
      {
        question: "Is our vote history public?",
        answer:
          "No. Dinner voting is private to your hall. This page is educational only — we do not index your ballots, roster, or results.",
      },
      {
        question: "What if nobody can agree on options?",
        answer:
          "Spin the Classics Wheel or use Find a Meal to generate nominees, then run a short vote so the crew still owns the final pick.",
      },
      {
        question: "Can late arrivals still vote?",
        answer:
          "Hall voting is designed for shift life — open the ballot when you are on duty. Exact timing windows depend on how your hall runs the vote before shopping and cook time.",
      },
    ],
    appName: "Firehall Meals Dinner Voting",
  },
  {
    slug: "fire-hall-pantry",
    path: "/fire-hall-pantry",
    h1: "Fire Hall Pantry Manager",
    title: "Fire Station Pantry Manager | Firehall Meals",
    description:
      "Run a fire hall pantry that the whole crew can trust — staples, low-stock alerts, and fewer “we’re out of rice” surprises mid-shift.",
    keywords: [
      "fire station pantry",
      "fire hall pantry",
      "firefighter pantry",
      "station kitchen pantry",
      "hall pantry manager",
    ],
    intro:
      "A fire station pantry is shared infrastructure. When staples are invisible, somebody buys duplicates, somebody invents dinner from three sad onions, and the grocery budget quietly evaporates. A pantry manager keeps the hall stocked without a clipboard war.",
    problem: {
      heading: "The shared-fridge problem",
      paragraphs: [
        "Station pantries are owned by everyone and no one. Oil, rice, spices, and canteen staples vanish between tours. The cook discovers the gap when dinner is already supposed to be on the stove.",
        "Without a living list, halls overbuy “just in case,” underbuy the boring staples, and argue about who was supposed to restock after last week’s chili night.",
      ],
    },
    currentWorkaround: {
      heading: "How halls track pantry today",
      paragraphs: [
        "Whiteboard inventory that never gets erased. A binder nobody opens. Mental notes from the last person who shopped. Costco runs based on vibes.",
        "Some crews keep a shared note on a phone — until the phone owner is off for a week and the note dies with them.",
      ],
    },
    solution: {
      heading: "Pantry tools in Firehall Meals",
      paragraphs: [
        "Firehall Meals pantry and canteen tools live inside the private hall: staples lists, needs-attention signals, and order handoffs that match how stations actually restock — including Costco-style bulk runs without storing payment credentials on our pages.",
        "Public SEO pages explain pantry discipline for searchers. Your on-hand counts, vendors, and hall-specific inventory stay private and are never published as indexable content.",
      ],
    },
    screenshots: [
      {
        alt: "Fire hall pantry staples list with low-stock items highlighted",
        caption: "See what is low before the cook opens the cupboard mid-recipe.",
        mockTitle: "Hall staples",
        mockLines: [
          "Rice · Low",
          "Chicken stock · OK",
          "Oil · Low",
          "Add to this week’s order",
        ],
      },
      {
        alt: "Needs attention panel for fire station pantry restock",
        caption: "Needs Attention pulls the restock list so shopping is intentional, not panic-driven.",
        mockTitle: "Needs attention",
        mockLines: [
          "3 staples running low",
          "Build this week’s order",
          "Hand off to shopper",
          "Mark delivered when back",
        ],
      },
    ],
    recipeSlugs: [
      "big-chili",
      "chicken-parm",
      "pulled-pork",
      "sheet-pan-fajitas",
      "meatloaf-mashed",
      "bbq-chicken-bowls",
    ],
    guideSlugs: [
      { slug: "cheap-firehall-meals", label: "Cheap firehall meals" },
      { slug: "firehall-meal-prep-ideas", label: "Firehall meal prep ideas" },
      { slug: "one-pot-firehall-meals", label: "One-pot firehall meals" },
      { slug: "avoid-living-on-takeout", label: "Avoid living on takeout" },
    ],
    relatedProducts: [
      { slug: "canteen-manager", label: "Canteen Manager" },
      { slug: "fire-station-kitchen-inventory", label: "Kitchen Inventory" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
      { slug: "crew-grocery-budget", label: "Hall Grocery Budget" },
    ],
    ctas: [
      { href: "/hall/join", label: "Open hall pantry tools", variant: "primary" },
      { href: "/canteen-manager", label: "Canteen Manager overview", variant: "outline" },
      { href: "/explore", label: "Browse recipes", variant: "outline" },
    ],
    faqs: [
      {
        question: "What belongs in a fire station pantry?",
        answer:
          "Staples the whole crew uses across dinners — oils, rice, pasta, stocks, spices, canned tomatoes, and hall canteen basics — not one person’s leftovers in a labeled container.",
      },
      {
        question: "Will our pantry counts show up on Google?",
        answer:
          "No. Pantry and canteen data stay in the private hall. This page teaches the concept for SEO; it does not publish your inventory.",
      },
      {
        question: "How does pantry connect to shopping?",
        answer:
          "Low staples feed this week’s order and the crew shopping list so restocks and dinner ingredients land in one grocery run when possible.",
      },
      {
        question: "Is this the same as Canteen Manager?",
        answer:
          "Pantry covers kitchen staples and stock awareness. Canteen Manager focuses on hall canteen staples, weekly orders, deliveries, and Costco-style handoffs. Most halls use both together.",
      },
    ],
    appName: "Firehall Meals Pantry Manager",
  },
  {
    slug: "canteen-manager",
    path: "/canteen-manager",
    h1: "Canteen Manager",
    title: "Canteen Manager for Fire Halls | Firehall Meals",
    description:
      "Canteen Manager for fire halls — staples, this week’s order, deliveries, and Costco handoffs without losing the list between tours.",
    keywords: [
      "canteen manager",
      "fire hall canteen",
      "fire station canteen",
      "hall canteen list",
      "firefighter canteen",
    ],
    intro:
      "Canteen Manager is how a fire hall keeps shared staples, weekly orders, and delivery check-ins in one place — so the canteen is not rebuilt from scratch every tour.",
    problem: {
      heading: "When the canteen falls apart",
      paragraphs: [
        "Hall canteens die the same way every year: someone shops once, the list lives in their head, the next tour guesses, and you end up with three kinds of mustard and zero paper towels.",
        "Bulk store runs get expensive when nobody knows what is already on the shelf. Deliveries show up and half the crew never hears about it.",
      ],
    },
    currentWorkaround: {
      heading: "Clipboard and Costco chaos",
      paragraphs: [
        "Paper lists taped to the fridge. Texts that say “grab the usual.” Screenshots of last month’s Costco receipt. A shared drive folder that was “temporary” in 2019.",
        "None of that survives overtime, vacation, or a busy stretch of calls when restocking is the last thing on anyone’s mind.",
      ],
    },
    solution: {
      heading: "Firehall Meals Canteen Manager",
      paragraphs: [
        "Canteen Manager (hall Pro tools) surfaces Needs Attention, This Week’s Order, Hall Staples, and Recent Deliveries — plus an external Costco handoff flow that does not store passwords or cards on Firehall Meals pages.",
        "Like all hall operations data, canteen lists stay private. This public page ranks for “canteen manager” and fire-hall canteen searches while teaching the workflow — never your hall’s SKUs or spend.",
      ],
    },
    screenshots: [
      {
        alt: "Canteen Manager dashboard with Needs Attention and This Week’s Order",
        caption: "One dashboard for low staples, the week’s order, and what just got delivered.",
        mockTitle: "Canteen Manager",
        mockLines: [
          "Needs Attention · 4 items",
          "This Week’s Order · Ready",
          "Hall Staples · Tracked",
          "Recent Deliveries · Logged",
        ],
      },
      {
        alt: "Costco handoff checklist for fire hall canteen restock",
        caption: "Handoff the list for a bulk run — credentials stay with the shopper, not the website.",
        mockTitle: "Costco handoff",
        mockLines: [
          "Export / copy order list",
          "Shopper runs the store",
          "Mark delivered at the hall",
          "No passwords stored here",
        ],
      },
    ],
    recipeSlugs: [
      "big-chili",
      "pulled-pork",
      "chicken-parm",
      "smash-burgers",
      "sheet-pan-fajitas",
      "bbq-chicken-bowls",
    ],
    guideSlugs: [
      { slug: "cheap-firehall-meals", label: "Cheap firehall meals" },
      { slug: "feeding-a-firehall-crew", label: "Feeding a firehall crew" },
      { slug: "firehall-meal-prep-ideas", label: "Firehall meal prep ideas" },
      { slug: "meals-feeding-10-firefighters", label: "Meals for feeding 10 firefighters" },
    ],
    relatedProducts: [
      { slug: "fire-hall-pantry", label: "Fire Hall Pantry" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
      { slug: "crew-grocery-budget", label: "Hall Grocery Budget" },
      { slug: "fire-station-kitchen-inventory", label: "Kitchen Inventory" },
    ],
    ctas: [
      { href: "/hall/join", label: "Open Canteen Manager", variant: "primary" },
      { href: "/hall/features", label: "See hall features", variant: "outline" },
      { href: "/fire-hall-pantry", label: "Pantry overview", variant: "outline" },
    ],
    faqs: [
      {
        question: "What is a canteen manager for a fire hall?",
        answer:
          "It is the system that tracks shared canteen staples, builds the weekly restock order, logs deliveries, and helps hand the list to whoever is running the bulk store that week.",
      },
      {
        question: "Does Firehall Meals store Costco passwords?",
        answer:
          "No. Costco handoff is external — you take the list to your own account. We do not store store passwords or payment cards on product pages.",
      },
      {
        question: "Is canteen data public?",
        answer:
          "No. Canteen Manager is private to your hall. This educational page is what search engines index — not your staples or orders.",
      },
      {
        question: "How is this different from a grocery list for tonight’s dinner?",
        answer:
          "Dinner shopping lists follow a recipe. Canteen Manager tracks ongoing hall staples and restocks that keep every tour cooking — even when tonight’s meal changes.",
      },
    ],
    appName: "Firehall Meals Canteen Manager",
  },
  {
    slug: "cost-per-plate-calculator",
    path: "/cost-per-plate-calculator",
    h1: "Cost Per Plate Calculator",
    title: "Fire Hall Cost Per Plate Calculator | Firehall Meals",
    description:
      "Estimate cost per plate for fire hall dinners — crew portions, grocery reality, and budget conversations without a spreadsheet fight.",
    keywords: [
      "cost per plate calculator",
      "fire hall cost per plate",
      "crew meal cost",
      "station dinner budget",
      "firefighter meal cost",
    ],
    intro:
      "Cost per plate is how halls talk honestly about dinner money. A calculator built for crew portions beats guessing from a receipt for four and hoping it scales.",
    problem: {
      heading: "Nobody knows what dinner actually costs",
      paragraphs: [
        "Crews argue about “expensive” meals without numbers. One tour spends big on steak night; the next tour gets blamed for the budget even when they cooked chili.",
        "Home blog servings hide the real firehall math: eight to twelve plates, bulk proteins, and waste when plans change mid-shift.",
      ],
    },
    currentWorkaround: {
      heading: "Receipts and napkin math",
      paragraphs: [
        "Divide the grocery total by head count and call it done — even when leftovers, staples, and canteen restocks are mixed into the same bag.",
        "Spreadsheets work until the person who maintains them transfers. Then the hall is back to vibes.",
      ],
    },
    solution: {
      heading: "Cost awareness with Firehall Meals",
      paragraphs: [
        "Firehall Meals centers crew-sized recipes and shopping lists so cost conversations start from real plates, not influencer portions. Pair recipe shopping with hall grocery budget and canteen tools to separate tonight’s dinner spend from ongoing staples.",
        "Use this page to learn the framework and link into recipes and budget tools. Any hall-specific spend stays private — we never publish your station’s receipts as public SEO content.",
      ],
    },
    screenshots: [
      {
        alt: "Cost per plate breakdown for a fire hall crew dinner",
        caption: "Start from crew head count and grocery lines — not a recipe written for four.",
        mockTitle: "Cost per plate",
        mockLines: [
          "Head count: 10",
          "Grocery total: $84",
          "≈ $8.40 / plate",
          "Compare to last tour",
        ],
      },
      {
        alt: "Crew dinner shopping list with rough cost notes",
        caption: "Shopping lists from hall recipes make plate cost easier to estimate before you buy.",
        mockTitle: "Shopping → cost",
        mockLines: [
          "Recipe: Big Chili",
          "Protein + staples list",
          "Estimate before checkout",
          "Log spend in hall budget",
        ],
      },
    ],
    recipeSlugs: [
      "big-chili",
      "sheet-pan-fajitas",
      "pulled-pork",
      "chicken-parm",
      "meatloaf-mashed",
      "bbq-chicken-bowls",
    ],
    guideSlugs: [
      { slug: "cheap-firehall-meals", label: "Cheap firehall meals" },
      { slug: "meals-feeding-10-firefighters", label: "Meals for feeding 10 firefighters" },
      { slug: "feeding-a-firehall-crew", label: "Feeding a firehall crew" },
      { slug: "avoid-living-on-takeout", label: "Avoid living on takeout" },
    ],
    relatedProducts: [
      { slug: "crew-grocery-budget", label: "Hall Grocery Budget" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
    ],
    ctas: [
      { href: "/explore", label: "Browse crew recipes", variant: "primary" },
      { href: "/crew-grocery-budget", label: "Crew grocery budget", variant: "outline" },
      { href: "/hall/join", label: "Join your hall", variant: "outline" },
    ],
    faqs: [
      {
        question: "How do you calculate cost per plate for a fire hall?",
        answer:
          "Add the groceries bought for that dinner, divide by the number of plates served (including late eaters), and keep staples that belong to the canteen out of the dinner total when you can.",
      },
      {
        question: "Why are blog recipes bad for cost math?",
        answer:
          "They are written for four servings. Fire halls cook for crews — the protein line alone can double or triple, which changes cost per plate completely.",
      },
      {
        question: "Do you publish our hall’s spending?",
        answer:
          "Never. Budget and spend stay private. This page is educational so stations can search “cost per plate” and find a firehall-specific approach.",
      },
      {
        question: "What is a reasonable cost per plate?",
        answer:
          "It depends on region and protein. Track your own hall baseline for a few tours — chili nights and steak nights should not be judged by the same number.",
      },
    ],
    appName: "Firehall Meals Cost Per Plate Calculator",
  },
  {
    slug: "fire-hall-grocery-list",
    path: "/fire-hall-grocery-list",
    h1: "Crew Shopping List",
    title: "Fire Hall Grocery List for Crews | Firehall Meals",
    description:
      "Build a fire hall grocery list from crew recipes — one list for the shopper, sized for the station, not a family of four.",
    keywords: [
      "fire hall grocery list",
      "crew shopping list",
      "fire station grocery list",
      "firefighter shopping list",
      "hall grocery list",
    ],
    intro:
      "A fire hall grocery list should come from the meal you are actually cooking — crew portions, aisle-ready items, and nothing left to “figure it out at the store.”",
    problem: {
      heading: "Shopping without a real list",
      paragraphs: [
        "The cook texts “grab burger stuff.” The shopper improvises. You come home with the wrong buns, no pickles, and a protein size meant for a backyard BBQ of four.",
        "When lists live in six chats, nobody knows what was already bought for the canteen versus tonight’s dinner.",
      ],
    },
    currentWorkaround: {
      heading: "Texts, screenshots, and memory",
      paragraphs: [
        "Screenshot of a blog ingredient list. A note app that only one phone has. Walking Costco while on the phone with the hall kitchen.",
        "It works until reception dies in the store — or the person who “always shops” is off.",
      ],
    },
    solution: {
      heading: "Shopping lists from Firehall Meals",
      paragraphs: [
        "Every hall-ready recipe can drive a crew shopping list. Public recipe pages teach the meals; private hall shopping tools let the crew share and check off without putting your list on the public internet.",
        "Searchers looking for “fire hall grocery list” land here, then move into recipes and hall join — not into anyone else’s private cart.",
      ],
    },
    screenshots: [
      {
        alt: "Crew shopping list generated from a fire hall dinner recipe",
        caption: "Generate the list from the recipe so portions match the crew, not a blog serving of four.",
        mockTitle: "Crew shopping list",
        mockLines: [
          "From: Smash Burgers · Crew 8",
          "☐ Ground beef",
          "☐ Buns · Pickles · Cheese",
          "☐ Onions · Condiment check",
        ],
      },
      {
        alt: "Shared hall shopping list with checked-off items",
        caption: "Share the list with the shopper; keep canteen restocks separate when you need to.",
        mockTitle: "Shared list",
        mockLines: [
          "Shopper: on the run",
          "Dinner items · 12",
          "Canteen add-ons · 3",
          "Check off as you bag",
        ],
      },
    ],
    recipeSlugs: [
      "smash-burgers",
      "chicken-parm",
      "steak-tacos",
      "sheet-pan-fajitas",
      "big-chili",
      "pulled-pork",
    ],
    guideSlugs: [
      { slug: "planning-tonights-station-dinner", label: "Planning tonight’s station dinner" },
      { slug: "cheap-firehall-meals", label: "Cheap firehall meals" },
      { slug: "feeding-a-firehall-crew", label: "Feeding a firehall crew" },
      { slug: "fast-firehall-meals-under-30-minutes", label: "Fast firehall meals under 30 minutes" },
    ],
    relatedProducts: [
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
      { slug: "canteen-manager", label: "Canteen Manager" },
      { slug: "crew-grocery-budget", label: "Hall Grocery Budget" },
      { slug: "cost-per-plate-calculator", label: "Cost Per Plate" },
    ],
    ctas: [
      { href: "/generator", label: "Pick a meal first", variant: "primary" },
      { href: "/explore", label: "Browse recipes", variant: "outline" },
      { href: "/hall/join", label: "Share lists in your hall", variant: "outline" },
    ],
    faqs: [
      {
        question: "How do I make a fire hall grocery list?",
        answer:
          "Choose the dinner first, scale to crew size, then list ingredients by how you shop — protein, produce, dairy, pantry — and separate canteen restocks from tonight’s meal when needed.",
      },
      {
        question: "Are shopping lists public?",
        answer:
          "Recipe ingredient lists on public recipe pages are educational. Shared hall checklists and live carts stay private to your hall and are not indexed.",
      },
      {
        question: "Can one list cover dinner and canteen?",
        answer:
          "Yes — many halls combine them for one store run. Canteen Manager and dinner lists work together so you do not double-buy staples.",
      },
      {
        question: "What if head count changes after shopping?",
        answer:
          "Build a little buffer into proteins for drop-ins, and prefer meals that hold and stretch — chili, pulled pork, sheet pans — when the roster is unpredictable.",
      },
    ],
    appName: "Firehall Meals Crew Shopping List",
  },
  {
    slug: "fire-station-kitchen-inventory",
    path: "/fire-station-kitchen-inventory",
    h1: "Kitchen Inventory",
    title: "Fire Station Kitchen Inventory | Firehall Meals",
    description:
      "Track fire station kitchen inventory — gear, staples, and what the crew can actually cook with on shift.",
    keywords: [
      "fire station kitchen inventory",
      "hall kitchen inventory",
      "firefighter kitchen inventory",
      "station kitchen checklist",
      "firehall kitchen stock",
    ],
    intro:
      "Kitchen inventory is more than counting pans. It is knowing whether the hall can execute the dinner you just voted on — tools, staples, and protein — before the shopper leaves.",
    problem: {
      heading: "Assuming the kitchen is ready",
      paragraphs: [
        "Recipes fail in stations when the sheet pan is warped beyond use, the slow cooker is “somewhere,” or the spice rack is empty of the one seasoning the recipe needs.",
        "New firefighters do not know what the hall owns. Veterans assume everyone knows. Dinner plans collapse into takeout.",
      ],
    },
    currentWorkaround: {
      heading: "Tribal knowledge",
      paragraphs: [
        "Ask the senior firefighter. Dig through drawers. Keep a laminated checklist that has not been updated since the renovation.",
        "Inventory days happen once after a complaint, then never again until the next complaint.",
      ],
    },
    solution: {
      heading: "Inventory awareness with Firehall Meals",
      paragraphs: [
        "Combine pantry/canteen staples with recipe requirements so the crew picks dinners the kitchen can actually run. Hall tools keep living lists private; public recipe and guide pages teach what a working station kitchen needs.",
        "This page ranks for kitchen inventory searches without exposing your hall’s asset list or on-hand counts.",
      ],
    },
    screenshots: [
      {
        alt: "Fire station kitchen inventory checklist for cookware and staples",
        caption: "Know the tools and staples before you commit the crew to a method-heavy dinner.",
        mockTitle: "Kitchen inventory",
        mockLines: [
          "Sheet pans · 2 OK",
          "Dutch oven · OK",
          "Slow cooker · Missing",
          "Pick a skillet dinner instead",
        ],
      },
      {
        alt: "Recipe fit check against hall kitchen inventory",
        caption: "Match tonight’s method to what the hall owns — sheet pan, skillet, slow cooker, BBQ.",
        mockTitle: "Can we cook this?",
        mockLines: [
          "Recipe: Pulled Pork",
          "Needs: Dutch oven / slow cooker",
          "Hall status: Ready",
          "Proceed → shopping list",
        ],
      },
    ],
    recipeSlugs: [
      "pulled-pork",
      "sheet-pan-fajitas",
      "big-chili",
      "smash-burgers",
      "chicken-parm",
      "meatloaf-mashed",
    ],
    guideSlugs: [
      { slug: "one-pot-firehall-meals", label: "One-pot firehall meals" },
      { slug: "dutch-oven-meals-firefighters", label: "Dutch oven meals for firefighters" },
      { slug: "best-firefighter-crockpot-meals", label: "Best firefighter crockpot meals" },
      { slug: "bbq-night-at-the-station", label: "BBQ night at the station" },
    ],
    relatedProducts: [
      { slug: "fire-hall-pantry", label: "Fire Hall Pantry" },
      { slug: "canteen-manager", label: "Canteen Manager" },
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
    ],
    ctas: [
      { href: "/hall/join", label: "Track inventory in your hall", variant: "primary" },
      { href: "/guides", label: "Station cooking guides", variant: "outline" },
      { href: "/explore", label: "Browse recipes", variant: "outline" },
    ],
    faqs: [
      {
        question: "What should a fire station kitchen inventory include?",
        answer:
          "Core cookware (sheet pans, skillets, stockpot, Dutch oven or slow cooker), thermometers, knives, and the staples pantry — enough to run the dinners your crew actually votes for.",
      },
      {
        question: "Is inventory data indexed by Google?",
        answer:
          "No. Living inventory stays private. This educational page is public; your checklist is not.",
      },
      {
        question: "How often should halls update inventory?",
        answer:
          "After big restocks and whenever gear breaks or disappears. A quick check before shopping beats discovering gaps at 17:30.",
      },
      {
        question: "What if we are missing a tool a recipe needs?",
        answer:
          "Pick another method — skillet, sheet pan, or one-pot — from the catalog, or borrow from a neighboring hall before you buy specialty gear you will not use twice.",
      },
    ],
    appName: "Firehall Meals Kitchen Inventory",
  },
  {
    slug: "firefighter-meal-calendar",
    path: "/firefighter-meal-calendar",
    h1: "Meal Calendar",
    title: "Firefighter Meal Calendar for Shifts | Firehall Meals",
    description:
      "Plan a firefighter meal calendar across tours — fewer repeats, clearer shop days, and dinners that match shift reality.",
    keywords: [
      "firefighter meal calendar",
      "fire hall meal calendar",
      "station meal schedule",
      "crew dinner calendar",
      "shift meal planner",
    ],
    intro:
      "A firefighter meal calendar spreads dinners across the tour so the crew is not eating the same skillet three nights in a row — and the shopper is not blindsided every afternoon.",
    problem: {
      heading: "Dinner amnesia between tours",
      paragraphs: [
        "Without a calendar, halls repeat the same hits until people revolt, then swing to takeout. Protein in the freezer never gets a plan. BBQ night never gets weather or staffing.",
        "Platoon calendars exist for training and leave — dinner somehow stays improvisational.",
      ],
    },
    currentWorkaround: {
      heading: "Whiteboard weeks that never stick",
      paragraphs: [
        "Write Mon–Sun on the board, erase it after the first call-heavy night, and never look back. Or keep a shared calendar that only one lieutenant updates.",
        "Paper meal plans do not survive overtime or a mutual aid stretch.",
      ],
    },
    solution: {
      heading: "Calendar thinking with Firehall Meals",
      paragraphs: [
        "Use Find a Meal, voting, and the recipe catalog to fill a tour with variety — quick nights, slow cooker days, BBQ when staffing and weather allow. Hall history and plans stay private; public pages teach the rhythm.",
        "Link calendar planning to shopping lists and canteen restocks so grocery days are intentional.",
      ],
    },
    screenshots: [
      {
        alt: "Firefighter meal calendar week view with crew dinners",
        caption: "Block the week by method and energy — quick skillet, hold-friendly chili, BBQ night.",
        mockTitle: "Tour meal calendar",
        mockLines: [
          "Mon · Sheet Pan Fajitas",
          "Tue · Big Chili (hold)",
          "Wed · Vote night",
          "Thu · Classics Wheel",
        ],
      },
      {
        alt: "Shop day tied to firefighter meal calendar",
        caption: "Attach shop days to the calendar so the list matches the next two dinners, not panic buying.",
        mockTitle: "Shop day",
        mockLines: [
          "Shop · Before Tue chili",
          "List: dinner + canteen",
          "Budget check",
          "Assign shopper",
        ],
      },
    ],
    recipeSlugs: [
      "sheet-pan-fajitas",
      "big-chili",
      "pulled-pork",
      "chicken-parm",
      "steak-tacos",
      "bbq-chicken-bowls",
    ],
    guideSlugs: [
      { slug: "meal-prep-for-shift-workers", label: "Meal prep for shift workers" },
      { slug: "best-meals-24-hour-shift", label: "Best meals for a 24-hour shift" },
      { slug: "planning-tonights-station-dinner", label: "Planning tonight’s station dinner" },
      { slug: "firehall-meal-prep-ideas", label: "Firehall meal prep ideas" },
    ],
    relatedProducts: [
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
      { slug: "firefighter-dinner-vote", label: "Dinner Voting" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
    ],
    ctas: [
      { href: "/generator", label: "Fill tonight’s slot", variant: "primary" },
      { href: "/hall/join", label: "Plan with your hall", variant: "outline" },
      { href: "/guides", label: "Shift cooking guides", variant: "outline" },
    ],
    faqs: [
      {
        question: "What belongs on a firefighter meal calendar?",
        answer:
          "Dinners matched to shift energy: fast options for busy nights, hold-friendly pots when calls are likely, and bigger projects when staffing and weather cooperate.",
      },
      {
        question: "Do you publish our hall’s calendar?",
        answer:
          "No. Calendars and history stay private. This page is the public explainer for search.",
      },
      {
        question: "How far ahead should we plan?",
        answer:
          "Many halls plan the next two dinners solidly and keep a short list of backups. Over-planning a full month usually collapses on the first overtime week.",
      },
      {
        question: "How do we avoid repeating the same meals?",
        answer:
          "Rotate methods and proteins, use the Classics Wheel for a fair wild card, and check recent hall history when you are on a shared hall plan.",
      },
    ],
    appName: "Firehall Meals Meal Calendar",
  },
  {
    slug: "crew-grocery-budget",
    path: "/crew-grocery-budget",
    h1: "Hall Grocery Budget",
    title: "Crew Grocery Budget for Fire Halls | Firehall Meals",
    description:
      "Run a crew grocery budget for the fire hall — dinner spend, canteen restocks, and cost per plate without losing the plot between tours.",
    keywords: [
      "crew grocery budget",
      "fire hall grocery budget",
      "station food budget",
      "firefighter grocery budget",
      "hall meal budget",
    ],
    intro:
      "A crew grocery budget keeps dinner fair across tours. When spend is invisible, one steak night becomes a month-long argument — and takeout quietly costs more than cooking.",
    problem: {
      heading: "Budget by blame",
      paragraphs: [
        "Without a shared budget frame, halls judge meals by feeling. The tour that cooked thrifty chili still gets blamed if the previous tour blew the protein budget.",
        "Canteen restocks and dinner groceries get mixed, so nobody can say what plates actually cost.",
      ],
    },
    currentWorkaround: {
      heading: "Cash envelopes and group-chat IOUs",
      paragraphs: [
        "Pass the hat. Venmo threads. A lieutenant who tracks everything in their head. It works until that person is off or the hall grows.",
        "Annual “we should be better about this” talks do not survive the first busy week.",
      ],
    },
    solution: {
      heading: "Budget clarity with Firehall Meals",
      paragraphs: [
        "Tie dinners to shopping lists and cost-per-plate thinking, keep canteen restocks visible in Canteen Manager, and use private hall space for real numbers. Public pages teach the model for SEO; your hall’s dollars never become public content.",
        "Cheap firehall meal guides and crew-sized recipes give stations lower-cost options when the budget is tight — without pretending every night is steak night.",
      ],
    },
    screenshots: [
      {
        alt: "Hall grocery budget overview separating dinner and canteen spend",
        caption: "Separate tonight’s dinner from canteen restocks so debates stay honest.",
        mockTitle: "Grocery budget",
        mockLines: [
          "Dinner spend · This tour",
          "Canteen restock · Separate",
          "Avg cost / plate",
          "Notes for next shop",
        ],
      },
      {
        alt: "Budget-friendly crew meal picks for a fire hall",
        caption: "When the budget is tight, pick hold-friendly, crew-scaled dinners — not random coupons.",
        mockTitle: "Budget picks",
        mockLines: [
          "Big Chili · Stretches",
          "Sheet Pan Fajitas",
          "Pulled Pork · Leftovers",
          "Open cheap meals guide",
        ],
      },
    ],
    recipeSlugs: [
      "big-chili",
      "sheet-pan-fajitas",
      "pulled-pork",
      "meatloaf-mashed",
      "bbq-chicken-bowls",
      "chicken-parm",
    ],
    guideSlugs: [
      { slug: "cheap-firehall-meals", label: "Cheap firehall meals" },
      { slug: "avoid-living-on-takeout", label: "Avoid living on takeout" },
      { slug: "meals-feeding-10-firefighters", label: "Meals for feeding 10 firefighters" },
      { slug: "feeding-a-firehall-crew", label: "Feeding a firehall crew" },
    ],
    relatedProducts: [
      { slug: "cost-per-plate-calculator", label: "Cost Per Plate Calculator" },
      { slug: "fire-hall-grocery-list", label: "Crew Shopping List" },
      { slug: "canteen-manager", label: "Canteen Manager" },
    ],
    ctas: [
      { href: "/cost-per-plate-calculator", label: "Cost per plate framework", variant: "primary" },
      { href: "/guides/cheap-firehall-meals", label: "Cheap firehall meals guide", variant: "outline" },
      { href: "/hall/join", label: "Join your hall", variant: "outline" },
    ],
    faqs: [
      {
        question: "How should a fire hall set a grocery budget?",
        answer:
          "Agree on a per-plate or per-firefighter target for dinner, keep canteen staples as a separate line, and review after a few tours instead of after one emotional steak night.",
      },
      {
        question: "Is our budget visible to the public?",
        answer:
          "No. Hall spend stays private. This page is educational content for people searching crew grocery budget topics.",
      },
      {
        question: "What meals help a tight budget?",
        answer:
          "Chili, sheet pans, pulled pork, and other stretch-friendly dinners from the catalog — see the cheap firehall meals guide for patterns that still taste like real food.",
      },
      {
        question: "How do we stop takeout from blowing the budget?",
        answer:
          "Pre-decide two backup quick meals, keep staples stocked, and use voting or the Classics Wheel early enough to shop — takeout thrives on 17:45 panic.",
      },
    ],
    appName: "Firehall Meals Hall Grocery Budget",
  },
  {
    slug: "classics-wheel",
    // 301-redirects to /wheel (see server/routes.ts) — this is the real
    // destination so every other product page's `relatedProducts` link
    // (resolved via `productSeoPagePath`) points straight at the live tool
    // instead of through a redirect.
    path: "/wheel",
    h1: "Classics Wheel",
    title: "Classics Wheel — Hall Dinner Picker | Firehall Meals",
    description:
      "Spin the Classics Wheel when the fire hall cannot decide. Fair kitchen-table picks from hall-tested firefighter dinners.",
    keywords: [
      "classics wheel",
      "firehall classics wheel",
      "firefighter dinner wheel",
      "hall meal spinner",
      "what’s for dinner firefighters",
    ],
    intro:
      "The Classics Wheel is the firehall version of spinning for dinner — fair, fast, and limited to meals crews actually cook. When the debate is stuck, spin once and cook.",
    problem: {
      heading: "Decision fatigue at 16:00",
      paragraphs: [
        "Open-ended “what do you want?” guarantees silence or sarcasm. Endless scrolling through recipe sites wastes the cook’s window.",
        "Captain’s choice every night breeds resentment. Rookie choice every night breeds panic.",
      ],
    },
    currentWorkaround: {
      heading: "Coin flips and kitchen chaos",
      paragraphs: [
        "Flip a coin between two meals. Draw names. Let the TV remote decide. Or argue until someone orders pizza.",
        "Random pickers on the internet serve date-night pasta for two — useless for a crew of ten.",
      ],
    },
    solution: {
      heading: "Spin the Firehall Meals Classics Wheel",
      paragraphs: [
        "The Classics Wheel is a public tool — ten hall-tested classics with full recipes, crew scaling, and shopping lists behind each result. No private hall data required to spin.",
        "Every landing opens onto a real recipe, ready to cook. Pair with dinner voting when you want nominees from the wheel and a final crew ballot.",
      ],
    },
    screenshots: [
      {
        alt: "Classics Wheel spinner for firefighter dinner picks",
        caption: "One spin. One classic. Full recipe ready for the crew.",
        mockTitle: "Classics Wheel",
        mockLines: [
          "Spinning hall classics…",
          "Result: Chicken Parm",
          "Crew portions · Steps",
          "Cook this one →",
        ],
      },
      {
        alt: "Classics Wheel result linked to a firehall recipe page",
        caption: "Every landing spots you on a real Firehall Meals recipe — not a vague category.",
        mockTitle: "You’re cooking",
        mockLines: [
          "Chicken Parm",
          "Open full recipe",
          "Shopping list ready",
          "Spin again if needed",
        ],
      },
    ],
    recipeSlugs: [
      "chicken-parm",
      "smash-burgers",
      "pulled-pork",
      "big-chili",
      "steak-tacos",
      "bbq-chicken-bowls",
    ],
    guideSlugs: [
      { slug: "meals-firefighters-actually-cook", label: "Meals firefighters actually cook" },
      { slug: "25-firefighter-dinner-ideas", label: "25 firefighter dinner ideas" },
      { slug: "planning-tonights-station-dinner", label: "Planning tonight’s station dinner" },
      { slug: "best-station-chili-recipes", label: "Best station chili recipes" },
    ],
    relatedProducts: [
      { slug: "hall-meal-planner", label: "Hall Meal Planner" },
      { slug: "firefighter-dinner-vote", label: "Dinner Voting" },
      { slug: "firefighter-meal-calendar", label: "Meal Calendar" },
    ],
    ctas: [
      { href: "/wheel", label: "Spin the Classics Wheel", variant: "primary" },
      { href: "/generator", label: "Find a Meal", variant: "outline" },
      { href: "/explore", label: "Browse all recipes", variant: "outline" },
    ],
    faqs: [
      {
        question: "What is the Classics Wheel?",
        answer:
          "A Firehall Meals spinner that lands on hall-tested classic dinners — the same kitchen-table gamble stations already know, backed by full crew recipes.",
      },
      {
        question: "Do I need a hall account to spin?",
        answer:
          "No. The Classics Wheel at /wheel is public. Hall voting and pantry tools are optional when you want shared private features.",
      },
      {
        question: "Can we re-spin if we hate the result?",
        answer:
          "Yes — but many halls house-rule one re-spin max so the wheel stays fair. You can also use the result as a nominee in a dinner vote.",
      },
      {
        question: "Is the wheel the same as Find a Meal?",
        answer:
          "Find a Meal filters by protein, time, and head count. The Classics Wheel is pure luck among signature hall classics when you want a fast, fair pick.",
      },
    ],
    appName: "Firehall Meals Classics Wheel",
  },
];

const PAGE_BY_SLUG = new Map(PRODUCT_SEO_PAGES.map((p) => [p.slug, p]));

export function getProductSeoPage(slug: string): ProductSeoPageDef | undefined {
  return PAGE_BY_SLUG.get(slug as ProductSeoPageSlug);
}

export function productSeoPagePath(slug: ProductSeoPageSlug): string {
  return PAGE_BY_SLUG.get(slug)?.path ?? `/${slug}`;
}

/**
 * "classics-wheel" is excluded here: its page 301-redirects to the real
 * /wheel tool (see server/routes.ts) rather than serving its own content, so
 * it must never appear in the sitemap as an independently indexable URL.
 * Its `PRODUCT_SEO_PAGES` entry is kept only so /wheel's own SEO snapshot
 * (server/seo/generic-page-injection.ts) can reuse its copy.
 */
export function allProductSeoPagePaths(): string[] {
  return PRODUCT_SEO_PAGES.filter((p) => p.slug !== "classics-wheel").map((p) => p.path);
}
