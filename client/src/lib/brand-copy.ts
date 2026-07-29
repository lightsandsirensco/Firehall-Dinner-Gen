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
  /** Canonical dinner CTA — use everywhere on the pick path */
  findDinner: "Pick Tonight's Meal",
  pickDinner: "Pick Tonight's Meal",
  pickTonight: "Pick Tonight's Meal",
  hallMatch: "Pick Tonight's Meal",
  crewMealPicker: "Pick Tonight's Meal",
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
  linked: "Hall",
  linkedHalls: "Your halls",
  create: "Create Hall",
  manage: "Manage hall",
  switch: "Switch hall",
  active: "Active hall",
  noLink: "No hall linked",
  noLinkBody: "Join with a code or create one when your crew wants to collaborate.",
  signInToConnect: "Sign in to connect to a hall.",
  crewTools: "Crew tools",
} as const;

export const HALL_ONBOARDING = {
  joinTitle: "Join Hall",
  joinTagline: "Enter your crew code — collaboration starts on the next screen.",
  welcomeTitle: "You're connected",
  welcomeTagline: "You're linked to your crew.",
  welcomeBody: "Use shared vote, shopping list, meal history, and staples with your crew.",
  startDinner: "Open Hall Home",
  viewHallHome: "View Hall",
  signInPrompt: "Sign in to join or create a hall.",
  haveCode: "Hall or invite code",
} as const;

export const PERSONAL_ONBOARDING = {
  welcomeTitle: "Welcome",
  welcomeBody: "Pick dinner in under a minute — connect a hall anytime if you cook with a crew.",
  generateTitle: "Generate your first meal",
  generateBody: "Tap Pick Tonight — filters are pre-set for a fast first pick.",
  saveTitle: "Save a meal you like",
  saveBody: "Tap Save so it stays in Saved across devices.",
  profileTitle: "Add your name",
  profileBody: "Optional — helps sync and crew picks.",
  hallTitle: "Do you cook at a fire hall?",
  hallBody: "Optional next step — shared board, shopping list, and staples when your crew is ready.",
  hallYesHint: "Free to join — crew collaboration",
  hallNoLabel: "Just picking meals for now",
  hallNoHint: "Keep picking meals. Connect a hall anytime.",
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
  headline: "What's for dinner tonight?",
  headlineWithMeal: "Tonight's pick",
  subline: "Crew size and protein — tap once. Under a minute to a hall-tested recipe.",
  sublineFocus: "Cook this one, or shuffle for another match.",
  loading: "Finding a match…",
  loadingAlt: "Trying another match…",
  emptyTitle: "Ready when you are",
  emptyBody: "Tap Pick Tonight's Meal — crew-sized, hall-tested, ready to cook.",
  emptyHint: "Need to tweak? Expand options below.",
  wheelLink: "Can't decide? Spin the Classics Wheel →",
} as const;

export const HOME = {
  /** Visible hero — kitchen-table voice; one problem, one fix. */
  heroEyebrow: "Built by firefighters • For every shift",
  heroHeadline: 'End the "What\'s for Dinner?" Debate.',
  heroLead: "Great meals for home, the hall, and every shift in between.",
  heroPunchlines: ["No recipe blogs.", "No group chat.", "No arguing."] as const,
  heroPrimaryCta: "Pick Tonight's Meal",
  heroSecondaryCta: "Can't Decide? Spin the Wheel",
  heroTrustLine: "Free to use. Built for crew-sized dinners.",
  /** @deprecated Use heroLead + heroPunchlines */
  heroSubheadline:
    "Pick a meal, let the crew vote, and get cooking.",
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
  howTitle: "How it works",
  howLead: "Three steps from \"what's for dinner?\" to food on the table.",
  howSteps: [
    {
      step: "01",
      title: "Pick a meal",
      body: "Hall Match, the Classics Wheel, or browse 300+ crew-sized recipes.",
    },
    {
      step: "02",
      title: "Let the crew vote",
      body: "Send options to the hall. Everyone taps a pick — no more 40-minute group chat debates.",
    },
    {
      step: "03",
      title: "Shop and cook",
      body: "Crew-scaled shopping list, step-by-step cook mode, and portions that actually feed the table.",
    },
  ],
  whyTitle: "Why firefighters use it",
  whyLead: "Less debate. More dinner. Built for shift night — at home or at the hall.",
  whyBenefits: [
    {
      title: "Ends the dinner debate",
      body: "Pick fast, vote once, move on. Nobody's stuck asking twenty guys what they want.",
    },
    {
      title: "Built for crew-sized meals",
      body: "Portions scale for two on duty or twelve at the table — no spreadsheet math.",
    },
    {
      title: "Saves grocery run guesswork",
      body: "Shopping lists sized for your crew. Grab what you need in one trip.",
    },
    {
      title: "Works for home or hall",
      body: "Cook solo on your shift, or link your hall when the crew wants to plan together.",
    },
    {
      title: "Hall Operations — private beta",
      body: "Shared votes, lists, staples, and meal history for the whole crew. In testing with a small number of fire stations now.",
    },
  ],
  hallSectionTitle: "Cooking with your crew?",
  hallSectionLead:
    "Link your account to your hall for shared planning — free to join, optional until you're ready.",
  hallSectionFeatures: [
    {
      title: "Connect your account",
      body: "Join with a crew code or invite link. Your saves and profile come with you.",
    },
    {
      title: "Shared shopping list",
      body: "One list for the grocery run — sized for the hall, not a single plate.",
    },
    {
      title: "Canteen staples",
      body: "Track what's low, what's out, and what the crew needs restocked.",
    },
    {
      title: "Hall meal history",
      body: "See what the crew cooked, voted on, and wants again.",
    },
  ],
  curatedRecipesLabel: "300+ curated recipes",
  curatedRecipesCount: "300+",
  featuredTitle: "Meals firefighters actually cook",
  featuredLead: "Hall-tested picks — browse the full catalog anytime.",
  seoTitle: "The meal app for firefighters",
  introTitle: "Firefighter meals sized for your shift",
  ctaBandTitle: "Ready for your next shift dinner?",
  ctaBandBody: "Pick a meal, spin the wheel, or browse the catalog — free to use.",
  ctaBandSecondary: "Spin the Wheel",
  emailCaptureTitle: "Get new recipes in your inbox",
  emailCaptureLead: "Weekly firefighter meals and new catalog drops — no spam, unsubscribe anytime.",
  emailCaptureCta: "Subscribe",
  faqTitle: "Questions from the crew",
} as const;

export const NAV = {
  home: "Home",
  generator: "Pick Tonight",
  explore: "Browse Recipes",
  ideas: "Cooking Guides",
  wheel: "Classics Wheel",
  pizza: "Pizza Night",
  faq: "FAQ",
  saved: "Saved Meals",
  hall: "Hall",
  hallHistory: "Hall Meal History",
  proteinDeals: "Protein Deals",
} as const;

export const APP_HOME = {
  title: "Firehall Meals",
  shiftEyebrow: "Tonight's dinner",
  shiftStart: "What's for dinner?",
  subtitleGuest: "Open around 4 — lock dinner, then cook.",
  subtitleMember: "Every shift starts here — lock dinner, vote, shop, cook.",
  subtitleHall: "Dinner window — lock the meal, then finish the run.",
  ritualWindowHint: "Between now and dinner — decide, vote if needed, shop, cook.",
  ritualHabitHint: "Open Home every shift · Decide → Vote → Shop → Cook",
  returnTomorrowOpen:
    "Tomorrow: open Home again when dinner isn't decided yet — same ritual, new shift.",
  returnTomorrowLocked:
    "Tomorrow the slate resets — open Home to lock the next shift's dinner.",
  welcomeNew: "Welcome — pick dinner first",
  welcomeReturning: "Welcome back",
  nextUp: "What to do next",
  nextGenerate: "Pick tonight's meal",
  nextGenerateHint: "Under a minute — crew-sized match",
  nextSave: "Save a meal you like",
  nextSaveHint: "Keeps it on Saved across devices",
  nextProfile: "Add your name",
  nextProfileHint: "Helps sync and crew picks",
  nextHallQuestion: "Do you cook at a fire hall?",
  nextHallQuestionHint: "Optional — after you've picked dinner a few times",
  nextConnectHall: "Join or create a Hall",
  nextConnectHallHint: "Shared board, shopping, and staples",
  nextDismiss: "I'll explore on my own",
  resumeTitle: "Cook again",
  hallTonight: "Tonight at the hall",
  hallAlerts: "Needs attention",
  hallShopping: "Shopping run",
  mealsWorkspace: "What's for dinner",
  mealsWorkspaceHint: "Pick, explore, wheel, and saved meals",
  hallWorkspace: "At the hall",
  hallWorkspaceHint: "Board, dinner, shopping, staples, and tools",
  openHallOps: "Manage the hall",
  tryHallOps: "Connect your hall",
  tryHallOpsHint: "Optional — after dinner is decided",
  manageHall: "Manage the hall",
  manageHallHint: "Board, shopping, canteen, dues, and log",
  inspireTitle: "Other ways to decide",
  browseMeals: "Browse the catalog",
  browseMealsHint: "When you want to look around",
  openHall: "Manage the hall",
  openHallHint: "After dinner is locked",
  keepPickingMeals: "Keep picking meals",
  nextStepMeals: "Next: pick meals",
  nextStepHall: "Next: hall",
  lifecycleHint: "Pick → cook → done",
  recentlyViewed: "Recently viewed",
  continueCooking: "Continue cooking",
  savedMeals: "Saved meals",
  savedMealsCount: (n: number) => `${n} saved meal${n === 1 ? "" : "s"}`,
  savedMealsEmpty: "Save recipes you want to cook again",
  proteinDealsHint: "Protein on sale near your station",
  undecidedHint: "Tap below — under a minute to a crew-sized pick.",
} as const;

export const HALL_EMPTY = {
  title: "Connect your hall",
  subtitle: "Join with a crew code — Home stays your command center; Hall is where you manage the work.",
  joinTitle: "Join Hall",
  joinDescription: "Enter a crew code or scan the fridge QR",
  createTitle: "Create Hall",
  createDescription: "Start a link for board, shopping, history, and staples",
  createSignIn: "Sign in to create a hall for your crew",
  learnTitle: "How the hall workflow works",
  learnDescription: "Home surfaces what needs attention — Hall is where you manage it",
  browseMeals: "Back to Home",
  browseMealsHint: "Every shift starts at Home — connect a hall whenever the crew is ready",
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
  subtitle: "Your last picks — tap to cook again tonight.",
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
  title: "Hall",
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
  backToHall: "Hall",
  hallSettings: "Manage hall",
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
  title: "Canteen Manager",
  subtitle: "Report shortages in two taps. One Canteen Manager runs the weekly order and Costco handoff.",
  backToHall: "Hall",
  needsAttention: "Need Anything?",
  viewCanteen: "View Canteen",
  viewList: "View Canteen",
  markRestocked: "Mark Restocked",
  imBuyingThis: "I'm Buying This",
  shoppingThisWeek: "This Week’s Order",
  shoppingThisWeekSubtitle: "Shared weekly staple order — not tonight's meal list.",
  shoppingThisWeekEmpty: "Nothing in this week’s order yet.",
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
  repeatWarning: "Crew had this recently — still fine to cook if you want it.",
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
  subtitle: "Meals you want again — tap to cook tonight.",
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
  savedDinnersHint: "Tap Cook again for tonight.",
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
  hint: "Tap Spin — lands in about 5 seconds. What lands is what you cook.",
  suspense: "Still spinning…",
  browseLink: "Rather browse? Explore firefighter recipes →",
  shareCta: "Share tonight's pick",
} as const;
