/**
 * Firehall Meals — public voice & CTAs.
 * Firefighter-built, kitchen-table practical. No catalog/startup speak.
 */

export const BRAND_NAME = "Firehall Meals";

export const BRAND_TAGLINE = "Built by Firefighters. Tested in the Firehall.";

export const BRAND_MISSION =
  "Get rid of the \"What's for Dinner?\" debate every shift.";

/** @deprecated Prefer `@/lib/lights-and-sirens` and brand components */
export const BRAND_CREDIT = {
  label: "Built by Lights & Sirens Co.",
  href: "https://www.lightsandsirensco.com",
} as const;

export const CTA = {
  findDinner: "Find a Meal",
  pickDinner: "Pick Tonight's Meal",
  pickTonight: "Pick Tonight's Meal",
  hallMatch: "Hall Match",
  crewMealPicker: "Crew Meal Picker",
  spinWheel: "Spin the Wheel",
  exploreMeals: "Browse Recipes",
  viewRecipes: "All recipes",
  /** @deprecated Prefer pickTonight on homepage and primary flows */
  generateTonight: "Pick Tonight's Meal",
  /** @deprecated Prefer spinWheel on homepage */
  spinMealWheel: "Spin the Wheel",
  fullFaq: "All questions",
  spinAgain: "Spin again",
  tryAnother: "Try another",
  changePicks: "Change picks",
  cookThis: "Cook this one",
  viewPackage: "Hall package",
  classicsWheel: "Classics Wheel",
} as const;

export const HALL_VOTE = {
  letCrewVote: "Let the crew vote",
  startVote: "Start Hall Vote",
  sendToCrew: "Send this to the crew",
  shareTitle: "Tonight's crew dinner vote",
  shareText: "The crew picks dinner — tap to vote:",
} as const;

/** Collaboration framing — hall is optional, not the product root. */
export const HALL_LINKED = {
  connect: "Connect to Hall",
  join: "Join Hall",
  linked: "Linked Hall",
  linkedHalls: "Linked halls",
  create: "Create Hall",
  manage: "Manage linked hall",
  switch: "Switch linked hall",
  active: "Linked hall",
  noLink: "No hall linked",
  noLinkBody: "Join with a code or create one when your crew wants to collaborate.",
  signInToConnect: "Sign in to connect to a hall.",
  crewTools: "Crew collaboration",
} as const;

export const HALL_ONBOARDING = {
  joinTitle: "Join Hall",
  joinTagline: "Enter your crew code — collaboration starts on the next screen.",
  welcomeTitle: "You're connected",
  welcomeTagline: "You're linked to your crew.",
  welcomeBody: "Use shared vote, shopping list, meal history, and staples with your crew.",
  startDinner: "Go to Tonight",
  viewHallHome: "View linked hall",
  signInPrompt: "Sign in to join or create a hall.",
  haveCode: "Hall or invite code",
} as const;

export const PERSONAL_ONBOARDING = {
  welcomeTitle: "Welcome — let's pick dinner",
  welcomeBody: "Under two minutes to your first meal. We'll save it and set up your profile, then you can link a hall if you want.",
  generateTitle: "Generate your first meal",
  generateBody: "Tap Pick Tonight — filters are pre-set for a fast first pick.",
  saveTitle: "Save your first meal",
  saveBody: "Tap Save on the recipe card so it stays in your list across devices.",
  profileTitle: "Build your profile",
  profileBody: "Add your name and preferences — saves sync and picks get smarter.",
  hallTitle: "Do you work at a fire hall?",
  hallBody: "Linking a hall is optional. Connect when you want shared votes, shopping lists, and crew meal history.",
  hallYesHint: "Free to join — crew collaboration tools",
  hallNoLabel: "No — use it personally",
  hallNoHint: "Keep picking meals on your own. You can connect a hall anytime.",
  connectSkip: "Continue without connecting",
  connectTitle: "Connect to your hall",
  connectBody: "Enter a crew code or invite link. Skip if you're not ready.",
} as const;

export const TONIGHT_HUB = {
  title: "Tonight",
  tagline: "Decide, vote, shop, and cook — right now.",
  sections: {
    meal: "Tonight's Meal",
    vote: "Hall Vote",
    shopping: "Shopping List",
    cook: "Cook Mode",
    needAnything: "Need Anything?",
  },
  actions: {
    pickMeal: "Pick Meal",
    spinWheel: "Spin Wheel",
    continueSession: "Continue Last Session",
    startVote: "Start Vote",
    viewVote: "View Current Vote",
    voteStatus: "Vote Status",
    viewList: "View Shared List",
    assignRunner: "Assign Grocery Runner",
    continueCooking: "Continue Cooking",
    openRecipe: "Open Recipe",
  },
  hints: {
    continueSession: "Crew filters saved — pick up where you left off",
    noHall: "Connect to a hall for shared shopping and crew vote",
    noVote: "Start a Hall Vote so the crew can pick dinner",
    noRecipe: "Pick a meal first",
    allStocked: "All stocked — nothing to grab",
    listItems: (n: number) => (n === 0 ? "List is empty" : `${n} item${n === 1 ? "" : "s"} to grab`),
    runnerAssigned: (name: string) => `Runner: ${name}`,
    runnerUnassigned: "No runner assigned yet",
  },
} as const;

export const COOK_MODE = {
  startCooking: "Start Cooking",
  exitCooking: "Exit Cook Mode",
  stepOf: (current: number, total: number) => `Step ${current} of ${total}`,
  ingredients: "Ingredients",
  previous: "Previous",
  next: "Next",
  doneCooking: "Done cooking",
  callsHold: "Calls & holding",
  keepAwake: "Keep screen awake",
  keepAwakeOn: "Screen staying awake",
  holdingTitle: "If the tones go off",
  holdingLead: "Pause safely, hold hot food, pick up where you left off.",
  noSteps: "No cook steps for this recipe yet.",
} as const;

export const GENERATOR = {
  headline: "Pick tonight's meal for the crew.",
  headlineWithMeal: "Tonight's pick",
  subline:
    "Set crew size, protein, and time — Hall Match finds a curated, hall-tested recipe from our catalog.",
  sublineFocus: "Shuffle or tweak your picks below.",
  loading: "Finding a match…",
  loadingAlt: "Trying another match…",
  emptyTitle: "Ready when you are",
  emptyBody:
    "Set the crew, tap Pick Tonight's Meal, or browse firefighter recipes if you want to look around first.",
  emptyHint: "More controls below if you want to narrow it down.",
  wheelLink: "Can't decide? Try the Classics Wheel →",
} as const;

export const HOME = {
  /** Visible hero — answers "What does this app do for me?" */
  heroHeadline: "Pick dinner for your shift — fast.",
  heroSubheadline:
    "Crew-sized recipes, saved meals, and cook mode built for firefighters — not single-plate food blogs.",
  heroActionLine:
    "Connect your account to your hall when you want shared votes, shopping lists, and meal history.",
  heroTrustLine: "Built by firefighters. Free to cook — no hall required.",
  heroEyebrow: "For firefighters · Your shift · Your meals",
  /** @deprecated Use heroHeadline */
  h1: "Firefighter Meals & Firehall Recipes",
  eyebrow: "Your shift kitchen",
  subline:
    "The meal app for firefighters — pick tonight's dinner, save what you love, and optionally link your hall for crew planning.",
  trust: {
    built: "Built by firefighters",
    free: "Free to cook",
    crew: "Crew-sized",
    shift: "Shift-tested",
    beginner: "Clear steps",
    connect: "Optional hall link",
  },
  stats: {
    recipes: "Curated Recipes",
    categories: "Categories",
    crew: "Crew size",
    time: "Time windows",
  },
  howTitle: "How it works for you",
  howLead: "Start solo. Link your hall when the crew wants to plan together.",
  howSteps: [
    {
      step: "01",
      title: "Pick tonight's meal",
      body: "Set crew size and time — get a hall-tested recipe in seconds, or browse 300+ options.",
    },
    {
      step: "02",
      title: "Cook with confidence",
      body: "Crew-scaled ingredients, step-by-step cook mode, and shopping lists sized for your run.",
    },
    {
      step: "03",
      title: "Connect to your hall",
      body: "Optional — link your account for shared dinner votes, grocery lists, and crew meal history.",
    },
  ],
  featuresTitle: "What you get",
  featuresLead: "Personal tools that work on any shift — hall link is optional.",
  features: [
    {
      title: "Pick tonight's meal",
      body: "Hall Match finds a crew-sized recipe from 300+ firefighter-tested meals in under 30 seconds.",
    },
    {
      title: "Save meals you love",
      body: "Build your own rotation — sync saves across devices so your favorites follow you shift to shift.",
    },
    {
      title: "Crew-sized by default",
      body: "Portions scale for two on duty or twelve at the table. No spreadsheet math.",
    },
    {
      title: "Shopping lists that fit",
      body: "Export ingredients sized for your crew — grab groceries once, feed everyone.",
    },
    {
      title: "Classics Wheel",
      body: "When you can't decide alone, spin ten hall-tested picks and go.",
    },
    {
      title: "Link your hall",
      body: "Connect your account for shared votes, shopping lists, and meal history — when your crew is ready.",
    },
  ],
  hallConnectTitle: "Cooking for the crew?",
  hallConnectLead:
    "Connect your account to your hall for shared dinner planning — votes, grocery lists, and meal history. Free to join.",
  curatedRecipesLabel: "300+ curated recipes",
  curatedRecipesCount: "300+",
  featuredTitle: "Meals firefighters actually cook",
  featuredLead: "Hall-tested picks — browse the full catalog anytime.",
  whyTitle: "Built for shift night",
  whyLead: "Written for firefighters on the line, not the recipe scroll.",
  seoTitle: "The meal app for firefighters",
  introTitle: "Firefighter meals sized for your shift",
  ctaBandTitle: "Pick your next shift dinner.",
  ctaBandBody: "Free to use. Save meals, scale for your crew, and cook with steps that respect the bell.",
  ctaBandSecondary: "Connect to your hall",
  emailCaptureTitle: "Get new recipes in your inbox",
  emailCaptureLead: "Weekly firefighter meals and new catalog drops — no spam, unsubscribe anytime.",
  emailCaptureCta: "Subscribe",
  faqTitle: "Questions from the crew",
  trustStrip: "Free for firefighters · 300+ recipes · Crew-sized · Shift-tested",
} as const;

export const NAV = {
  home: "Home",
  generator: "Find a Meal",
  explore: "Browse Recipes",
  ideas: "Hall Ideas",
  wheel: "Classics Wheel",
  pizza: "Pizza Night",
  faq: "FAQ",
  saved: "Saved Meals",
  hall: "Hall",
  hallHistory: "Hall Meal History",
  proteinDeals: "Protein Deals",
} as const;

export const APP_HOME = {
  subtitle: "Your shift meals — pick, cook, and save.",
  recentlyViewed: "Recently viewed",
  continueCooking: "Continue cooking",
  savedMeals: "Saved meals",
  savedMealsCount: (n: number) => `${n} saved meal${n === 1 ? "" : "s"}`,
  savedMealsEmpty: "Save recipes you want to cook again",
  proteinDealsHint: "Protein on sale near your station",
} as const;

export const HALL_EMPTY = {
  title: "Hall",
  subtitle: "Optional crew collaboration — your personal meals work without a link.",
  joinTitle: "Join Hall",
  joinDescription: "Enter a crew code or scan the fridge QR",
  createTitle: "Create Hall",
  createDescription: "Start a link for shared vote, list, history, and staples",
  createSignIn: "Sign in to create a hall link for your crew",
  learnTitle: "Connect to Hall",
  learnDescription: "Hall Vote, shared shopping, meal history, and staples",
} as const;

export const HALL_PRO = {
  title: "Hall Pro",
  tagline: "Crew collaboration for shift night — one subscription for the whole hall.",
  subtitle: "Benefits the crew, not your personal account.",
  excludesNote: "Meal planning, saved meals, and profiles belong to Firefighter Plus.",
  features: {
    sharedList: "Shared Shopping List",
    mealHistory: "Hall Meal History",
    staples: "Hall Staples",
    advancedVote: "Advanced Hall Vote",
    groceryPlanning: "Hall grocery planning",
    paymentTracker: "Canteen Payment Tracker",
  },
} as const;

export const HALL_FEATURES = {
  title: "Connect to Hall",
  subtitle: "Free crew link — Hall Pro unlocks full collaboration.",
  proTeaser: "Hall Pro adds cloud sync, advanced vote, and crew grocery planning.",
  voteTitle: "Hall Vote",
  voteBody: "Basic crew vote is free. Hall Pro adds deadlines, vote history, and shift-scoped polls.",
  shoppingTitle: "Shared Shopping List",
  shoppingBody: "Hall Pro — one grocery list for the crew with runner assignment and cloud sync.",
  historyTitle: "Hall Meal History",
  historyBody: "Hall Pro — shared meal log for what your crew cooked and voted on.",
  staplesTitle: "Hall Staples",
  staplesBody: "Free with hall link — track coffee, paper towels, and pantry staples together.",
  groceryTitle: "Hall grocery planning",
  groceryBody: "Hall Pro — plan the crew grocery run with flyer deals matched to crew meals.",
  paymentTrackerTitle: "Canteen Payment Tracker",
  paymentTrackerBody:
    "Hall Pro — track monthly dues for every firefighter. Mark paid, see who's overdue, and ditch the spreadsheet.",
  ctaJoin: "Join Hall",
  ctaCreate: "Create Hall",
} as const;

export const ME_HISTORY = {
  title: "Meal History",
  subtitle: "Meals you generated, cooked, and spun on the wheel.",
} as const;

export const ME_SETTINGS = {
  title: "Settings",
  subtitle: "App preferences and crew admin.",
  measurements: "Measurements",
  measurementsHint: "Applies to cook mode and recipe ingredients.",
  account: "Account",
  editProfile: "Edit profile and shift reminders",
  crew: "Linked hall",
  hallSettings: "Manage linked hall — members and invites",
} as const;

export const PROTEIN_DEALS = {
  title: "Protein Deals",
  question: "What protein is cheap this week?",
  tagline: "Protein on sale near your station — matched to crew meals.",
  proteinOnlyNote: "Chicken, beef, pork, sausage, turkey, and fish only. No produce or pantry.",
  setupTitle: "One-time setup",
  setupLead: "Enter your postal code and pick the stores your crew shops at.",
  setupPostal: "Postal code",
  setupStores: "Preferred stores",
  findStores: "Find nearby stores",
  saveStores: "Save stores",
  editStores: "Edit stores",
  emptySetup: "Set up your stores to see this week's protein deals.",
  emptyDeals: "No protein deals this week at your stores.",
  integrationSoon: "Live flyer deals are coming soon. Demo prices show the flow.",
  proTeaser: "Hall Pro unlocks crew grocery planning and add-to-list.",
  actions: {
    findMeals: "Find Meals",
    addToList: "Add to Shopping List",
    viewAll: "All protein deals",
    openHub: "Open hub",
  },
  matchedMeals: (label: string) => `Meals with ${label}`,
  noMatches: "No matches yet — try another protein deal.",
  addedToList: "Added to hall shopping list",
} as const;

export const HALL_IDENTITY = {
  myHall: "My Hall",
  members: "Members",
  canteenManager: "Canteen Manager",
  stationNotSet: "Station not set",
  departmentNotSet: "Department not set",
  cityNotSet: "City not set",
  unassignedManager: "No canteen manager assigned",
  assignManagerInSettings: "Assign in hall settings",
  addIdentityInSettings: "Add in hall settings",
  noHallPhoto: "No hall photo yet",
  hallPhoto: "Hall photo",
  hallPhotoHint: "Paste a photo URL — your crew sees it on the hall home.",
  motto: "Hall motto",
  mottoHint: "Optional — a line your crew recognizes.",
  mottoPlaceholder: "Feed the crew, fuel the shift.",
  canteenManagerLabel: "Canteen manager",
  canteenManagerHint: "One crew member manages the staples list.",
  canteenManagerNone: "No canteen manager",
} as const;

export const HALL_DASHBOARD = {
  title: "Linked Hall",
  myHall: "My Hall",
  subtitle: "Crew collaboration — vote, shop, and track meals together.",
  tagline: "Connected to your crew",
  tonight: "Tonight",
  /** @deprecated Use `tonight` */
  tonightsMeal: "Tonight",
  lastMeals: "Hall Meal History",
  lastMealsCooked: "Recently cooked",
  /** @deprecated Use `lastMealsCooked` */
  recentMeals: "Recently cooked",
  hallFavorites: "Crew favorites",
  /** @deprecated Removed from dashboard */
  lastHallVote: "Last Hall Vote",
  /** @deprecated Quick action only */
  shoppingLists: "Shopping List",
  needAnything: "Need Anything?",
  needAnythingEmpty: "All stocked — nothing to grab at the store.",
  /** @deprecated */
  suppliesRunningLow: "Need Anything?",
  /** @deprecated */
  mealsThisMonth: "Meals This Month",
  /** @deprecated */
  lastMealCooked: "Last meal cooked",
  /** @deprecated */
  mostPopularMonth: "Most popular this month",
  /** @deprecated */
  wheelStreak: "Hall streak",
  wheelStreakDays: (n: number) =>
    n === 0 ? "No activity yet" : n === 1 ? "1 day" : `${n} days`,
  /** @deprecated */
  wheelStreakHint: "Consecutive shift days with crew activity.",
  emptyTonight: "Nothing picked yet — choose tonight's meal for the crew.",
  /** @deprecated Use `emptyTonight` */
  emptyTonightsMeal: "Nothing picked yet — choose tonight's meal for the crew.",
  /** @deprecated */
  emptyLastMeal: "Start Cooking on a recipe to log your first hall meal.",
  /** @deprecated */
  emptyLastVote: "Start a hall vote to let the crew pick dinner.",
  /** @deprecated */
  emptyPopularMonth: "No cooks logged this month yet.",
  /** @deprecated */
  emptyMealsMonth: "No meals logged this month yet.",
  /** @deprecated */
  emptyWheelHistory: "Spin the Classics Wheel to build your hall rhythm.",
  /** @deprecated */
  emptyShoppingLists: "One grocery runner, one list — add items from recipes or by hand.",
  emptyLastMeals: "Cook together and your crew meal history will show up here.",
  quickActions: "Crew collaboration",
  seeFullHistory: "Full Hall Meal History",
  manageFavorites: "View all",
  members: "Members",
  /** @deprecated */
  hallSummary: "Hall summary",
  /** @deprecated */
  stats: {
    mealsCooked: "Meals cooked",
    votesCreated: "Votes created",
    wheelSpins: "Wheel spins",
    hallStreak: "Hall streak",
    mostCooked: "Most cooked meal",
  },
  actions: {
    hallVote: "Hall Vote",
    sharedList: "Shared Shopping List",
    mealHistory: "Hall Meal History",
    staples: "Hall Staples",
    groceryPlanning: "Hall grocery planning",
    pickMeal: "Pick Meal",
    spinWheel: "Spin Wheel",
    shoppingList: "Shared Shopping List",
    cookMode: "Cook Mode",
    /** @deprecated Vote lives on /tonight */
    startVote: "Hall Vote",
    /** @deprecated Use `shoppingList` */
    shoppingListLegacy: "Shared Shopping List",
  },
  deviceNote: "Sign in to sync your account across devices.",
} as const;

export const SHIFT_DASHBOARD = {
  title: "Shift crew",
  tagline: "Your shift, your rhythm.",
  crewSize: "Crew size",
  members: "Members",
  quickActions: "Quick actions",
  recentlyCooked: "Recently Cooked",
  favorites: "Favorites",
  mostCookedMeal: "Most Cooked Meal",
  wheelHistory: "Wheel History",
  recentVotes: "Recent Votes",
  currentShoppingList: "Current Shopping List",
  emptyRecentlyCooked: "No meals logged for this shift yet — pick dinner for the crew.",
  emptyFavorites: "Save hall classics your shift loves.",
  emptyMostCooked: "Cook a few meals and your shift staple will show up here.",
  emptyWheelHistory: "Spin the wheel on a shift night to build history.",
  emptyRecentVotes: "Start a hall vote so the crew can pick dinner together.",
  emptyShoppingList: "No items on the hall grocery run yet.",
  backToHall: "Linked Hall",
  hallSettings: "Manage linked hall",
  stats: {
    mealsThisMonth: "Meals this month",
    votesThisMonth: "Votes this month",
    longestMealStreak: "Longest meal streak",
  },
  streakDays: (n: number) =>
    n === 0 ? "No streak yet" : n === 1 ? "1 day" : `${n} days`,
  actions: {
    createVote: "Create Hall Vote",
    pickMeal: "Pick Meal",
    spinWheel: "Spin Wheel",
    reportCanteen: "Hall Staples",
  },
  manageFavorites: "View all",
  openShoppingList: "Open list",
} as const;

export const HALL_CANTEEN = {
  title: "Hall Staples",
  subtitle: "What does the crew need to pick up for the hall?",
  backToHall: "Linked Hall",
  needsAttention: "Need Anything?",
  viewCanteen: "View Hall Staples",
  viewList: "View Hall Staples",
  markRestocked: "Mark Restocked",
  imBuyingThis: "I'm Buying This",
  shoppingThisWeek: "Shopping This Week",
  shoppingThisWeekSubtitle: "Recurring kitchen staples to pick up — not tonight's meal list.",
  shoppingThisWeekEmpty: "Nothing to pick up this week — all staples look good.",
  purchased: "Purchased",
  buyingToday: "Buying today",
  pickingUp: (name: string) => `${name} is picking this up.`,
  releasePickup: "Release claim",
  addNote: "Leave a note for the grocery runner",
} as const;

export const HALL_CANTEEN_PAYMENTS = {
  title: "Canteen Payment Tracker",
  subtitle: "Track monthly dues for your crew — no spreadsheets, whiteboards, or paper lists.",
  enrollAll: "Enroll all canteen members",
  enrolledToast: "Canteen members enrolled",
  markedPaidToast: "Marked as paid",
  empty: "Enroll your hall members to start tracking canteen dues in one place.",
  loadError: "Payment tracker is unavailable right now.",
  noFilterResults: "No members match this filter.",
  paymentHistory: "Payment History",
  canteenMembers: "Canteen Members",
  monthlyDues: "Monthly dues",
  nextPaymentDue: "Next payment due",
  markAsPaid: "Mark as Paid",
  currentOnDues: "Current on dues",
  awaitingPayment: "Awaiting payment",
  paywallTeaser:
    "Hall Pro — track canteen dues for every firefighter. Monthly, semi-annual, or annual.",
} as const;

export const HALL_NOTES = {
  title: "Hall Notes",
  subtitle: "Messages for whoever is buying groceries.",
  placeholder: "Grab Costco-sized coffee if possible…",
  empty: "No notes yet — leave a tip for the next grocery run.",
  add: "Add note",
  save: "Save note",
  delete: "Delete",
  edit: "Edit",
} as const;

export const HALL_HISTORY = {
  title: "Hall Meal History",
  subtitle: "What your linked crew cooked and voted on.",
  recentlyCooked: "Recently Cooked",
  cookAgain: "Cook Again",
  seeAll: "See meal history",
  repeatWarning: "You made this recently — consider rotating the menu.",
  profileHallName: "Station label",
  profileShift: "Shift label",
  profileCrewSize: "Default crew size",
  profileHint: "Optional — shows when you log meals (e.g. A Shift).",
  wheelResults: "Last wheel picks",
  hallVotes: "Hall Votes",
  generatedMeals: "Hall Match picks",
  empty: "No crew meals logged yet. Cook a recipe or start a Hall Vote.",
  deviceNote: "Personal meals live under Me → Meal History. This page is for linked crew context.",
} as const;

export const SOCIAL_PROOF = {
  mealsGenerated: "Meals generated",
  hallVotes: "Hall votes",
  recipesSaved: "Recipes saved",
} as const;

export const HALL_OF_FAME = {
  title: "Hall of Fame",
  eyebrow: "Community picks",
  subtitle: "What crews across Canada are cooking, voting, and spinning — ranked from real hall activity.",
  aggregateNote: "Site-wide totals for now. Hall names and badges are coming soon.",
  mostCooked: "Most cooked meals",
  mostVoted: "Most voted meals",
  mostWheel: "Most spun on the wheel",
  cookedCount: (n: number) => `${n} cook${n === 1 ? "" : "s"}`,
  voteCount: (n: number) => `${n} vote${n === 1 ? "" : "s"}`,
  wheelCount: (n: number) => `${n} spin${n === 1 ? "" : "s"}`,
  emptyCooked: "No cooks logged yet — be the first crew on the board.",
  emptyVoted: "No hall votes yet — start a crew vote and make the list.",
  emptyWheel: "No wheel spins yet — spin the Classics Wheel to kick things off.",
  loadError: "Could not load the Hall of Fame right now.",
  ctaLead: "Want your crew on the board? Cook, vote, and spin — it all counts.",
  myHallCta: "Connect to Hall",
} as const;

export const HALL_FAVORITES = {
  title: "Saved Meals",
  subtitle: "Recipes you save for yourself — not the same as crew collaboration.",
  ourClassics: "Pinned classics",
  classicsHint: "Pin up to 10 recipes you cook often on shift.",
  mostCooked: "Most cooked",
  mostCookedHint: "Ranked by how often you logged Start Cooking.",
  favoriteCount: (n: number) =>
    n === 0 ? "No pinned classics yet" : `${n} pinned classic${n === 1 ? "" : "s"}`,
  addToHall: "Pin classic",
  addedToHall: "Pinned",
  removeFromHall: "Unpin",
  classicsFull: "Pinned classics are full (10 max). Remove one to add another.",
  emptyClassics: "Pin the meals you rotate — jerk chicken, BBQ mac, steak sandwiches, and the rest.",
  savedDinners: "Saved dinners",
  savedDinnersHint: "One-off picks from Find a Meal.",
  deviceNote: "Saved on this device. Sign in to sync across phones.",
} as const;

export const PWA_COPY = {
  installTitle: "Add Firehall Meals to your home screen",
  installBody: "Install for one-tap shift dinners, faster reloads, and offline recipe access.",
  installCta: "Install app",
  installing: "Installing…",
  dismiss: "Not now",
  dismissAria: "Dismiss install prompt",
  offlineBanner: "Offline — showing your cached app shell. Some features need a connection.",
} as const;

export const CLASSICS_WHEEL = {
  title: "Classics Wheel",
  subtitles: [
    "The firehall kitchen-table gamble.",
    "When nobody can decide dinner.",
    "Every hall ends up making these eventually.",
  ],
  subtitle: "The firehall kitchen-table gamble.",
  eyebrow: "Crew tradition",
  hint: "Tap Spin or the center button. What lands is what you cook.",
  suspense: "Still spinning…",
  browseLink: "Rather browse? Explore firefighter recipes →",
  shareCta: "Share tonight's pick",
} as const;
