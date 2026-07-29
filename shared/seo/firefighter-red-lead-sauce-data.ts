/**
 * Red Lead tomato sauce only — not steak, eggs in the pan, or the full breakfast spread.
 * Used by the SEO page, PDF lead magnet, and validation.
 */

export type RedLeadSauceIngredient = {
  name: string;
  amount: string;
  notes?: string;
  optional?: boolean;
};

export type RedLeadSauceStep = {
  number: number;
  title: string;
  body: string;
  minutes?: string;
  visualCue?: string;
  mistake?: string;
};

export type RedLeadSauceScale = {
  label: string;
  crew: number;
  ingredients: RedLeadSauceIngredient[];
};

export const RED_LEAD_SAUCE_DEFAULT_CREW = 8;

export const RED_LEAD_SAUCE_PREP_MIN = 10;
export const RED_LEAD_SAUCE_COOK_MIN = 35;

/** Shared narrative copy — article, PDF, and lead magnet. */
export const RED_LEAD_PDF_COPY = {
  header: "The Official Firehall Red Lead Recipe",
  subtitle: "Tomato sauce for a proper station breakfast.",
  introduction: [
    "Ask ten firefighters how to make Red Lead and you will probably get ten different answers. Every hall seems to have its own version, but the idea is always the same: a slow-cooked tomato sauce served with a proper station breakfast.",
    "Red Lead is the sauce — not the whole meal. You simmer it in cast iron, set the pan in the middle of the table, and let the crew help themselves while bacon, eggs, and the rest of the spread goes around.",
    "This card is the sauce recipe only. Cook your eggs, bacon, sausage, toast, and potatoes separately.",
  ],
  whyItMatters: {
    heading: "Why Firefighters Still Make It",
    paragraphs: [
      "Most weeks in the hall move fast. Calls, training, paperwork, gear checks — there is not much time to sit still. Sunday breakfast is different. Somebody puts coffee on, the kitchen gets warm, and the crew actually sits down.",
      "That is when rookies hear the old stories — bad calls, funny calls, the shift before theirs. Retired guys still talk about who ran the best sauce pan. Spouses and kids show up at halls that do family mornings. It is one of the few meals where everyone is at the table at once.",
      "The food is simple. The point is the table.",
    ],
  },
  recipeIntro:
    "This recipe makes only the Red Lead sauce. Serve it with eggs, bacon, breakfast sausage, toast, home fries or hash browns, orange juice, and coffee. Nothing fancy — just the way most halls still do it.",
  stepsHeading: "Step-by-Step Instructions",
  stepsIntro: "Read it once before you start. Get the rest of breakfast moving before the onion hits the pan.",
  serveHeading: "Serve It Like The Hall Does",
  serveIntro:
    "Put the cast iron in the centre of the table. Everything else stays on its own platters. Pass the sauce with a spoon and let people take what they want.",
  tipsHeading: "Firehall Tips",
  closingQuote:
    "Every hall has its own recipe. The important part is not who is right. It is getting the crew around the table.",
} as const;

/** Base recipe — serves 8 hall portions of sauce (~3/4 cup each). */
export const RED_LEAD_SAUCE_INGREDIENTS: RedLeadSauceIngredient[] = [
  { name: "crushed tomatoes", amount: "2 cans (28 oz each)" },
  { name: "tomato juice", amount: "1 cup", notes: "or thin with liquid from a can if the tomatoes are thick" },
  { name: "yellow onion", amount: "1 large", notes: "diced small" },
  { name: "butter", amount: "4 tbsp" },
  { name: "kosher salt", amount: "2 tsp" },
  { name: "black pepper", amount: "1 tsp", notes: "freshly ground" },
  { name: "sugar", amount: "1/2 tsp", notes: "optional — only if the tomatoes taste sharp", optional: true },
  { name: "garlic", amount: "3 cloves", notes: "minced", optional: true },
  { name: "hot sauce", amount: "1 tsp", notes: "optional — a lot of halls add a dash", optional: true },
];

export const RED_LEAD_SAUCE_STEPS: RedLeadSauceStep[] = [
  {
    number: 1,
    title: "Get the rest of breakfast started first",
    body:
      "Red Lead needs a quiet simmer, not a pan left alone while you are scrambling to cook everything else. Put coffee on, get bacon in the oven, sausage on a sheet pan, and your toast ready before you dice the onion.",
    minutes: "5 min setup",
    mistake: "Starting the sauce first and letting it stick while the rest of the breakfast falls behind.",
  },
  {
    number: 2,
    title: "Melt the butter and cook the onion",
    body:
      "Set a 12-inch cast iron over medium heat. Melt the butter until it foams — not brown. Add the onion and stir every minute or so until it is soft, translucent, and just starting to colour at the edges. Some crews toss in diced green pepper here; that is up to your hall.",
    minutes: "8–10 min",
    visualCue: "Onion bends on the spoon with no raw white left in the middle.",
    mistake: "Turning the heat up to rush it. Burnt butter makes the whole pan taste off.",
  },
  {
    number: 3,
    title: "Add garlic, then the tomatoes",
    body:
      "If you are using garlic, stir it in for about 45 seconds until you can smell it — do not let it brown. Pour in the crushed tomatoes, tomato juice, salt, and pepper. Stir until the colour is even and the pan looks like thick soup.",
    minutes: "2 min",
    visualCue: "Deep red all the way through; no pale tomato streaks.",
  },
  {
    number: 4,
    title: "Simmer until it thickens",
    body:
      "Drop the heat to medium-low. Leave the pan uncovered and stir every few minutes so the bottom does not scorch. It is ready when the sauce coats a spoon and a swipe through the middle leaves a trail that slowly closes back up. A longer simmer is better if you have the time.",
    minutes: "25–35 min",
    visualCue: "Thick enough to sit on toast without running off; the raw tomato smell is gone.",
    mistake: "Putting a lid on too early — the steam keeps it thin.",
  },
  {
    number: 5,
    title: "Taste it and adjust",
    body:
      "Taste for salt and pepper. Add the pinch of sugar only if the tomatoes are sharp. A little hot sauce goes in now if your hall likes heat. Hold the pan on the lowest steady flame, or keep it in a warm oven (170°F / 75°C) with foil on top until the crew is seated.",
    minutes: "2 min",
    visualCue: "Savory and balanced — not flat, not sweet like candy.",
  },
  {
    number: 6,
    title: "Bring the pan to the table",
    body:
      "Carry the cast iron out when the rest of the spread is ready — bacon, sausage, eggs, toast, potatoes, juice, and coffee on the go. Set the sauce in the middle. The crew serves themselves with a spoon. That is the meal.",
    minutes: "Serve right away",
    mistake: "Trying to plate this like a restaurant dish. It is hall food — shared from the pan.",
  },
];

export const RED_LEAD_SAUCE_SCALES: RedLeadSauceScale[] = [
  {
    label: "Serves 4",
    crew: 4,
    ingredients: [
      { name: "crushed tomatoes", amount: "1 can (28 oz)" },
      { name: "tomato juice", amount: "1/2 cup" },
      { name: "yellow onion", amount: "1/2 large", notes: "diced" },
      { name: "butter", amount: "2 tbsp" },
      { name: "kosher salt", amount: "1 tsp" },
      { name: "black pepper", amount: "1/2 tsp" },
    ],
  },
  {
    label: "Serves 8",
    crew: 8,
    ingredients: RED_LEAD_SAUCE_INGREDIENTS.filter((i) => !i.optional),
  },
  {
    label: "Serves 12",
    crew: 12,
    ingredients: [
      { name: "crushed tomatoes", amount: "3 cans (28 oz each)" },
      { name: "tomato juice", amount: "1 1/2 cups" },
      { name: "yellow onion", amount: "2 large", notes: "diced" },
      { name: "butter", amount: "6 tbsp" },
      { name: "kosher salt", amount: "1 tbsp" },
      { name: "black pepper", amount: "1 1/2 tsp" },
    ],
  },
];

export const RED_LEAD_SAUCE_FIREHALL_TIPS = [
  {
    title: "Give it time",
    body:
      "The sauce is better after a long simmer. If you can start it early and let it sit on low, do it. Leftovers reheated the next day are often better than the first serving.",
  },
  {
    title: "Make it your hall's way",
    body:
      "Some crews add green pepper with the onion. Some add a dash of hot sauce at the end. Garlic is optional. Do not overthink it — taste and adjust.",
  },
  {
    title: "Scale for the crew",
    body:
      "Use the 4 / 8 / 12 portions on the ingredients page. If you need two pans, split the batch evenly. Do not pile a double recipe into one skillet — the middle stays cold while the edges burn.",
  },
  {
    title: "Hold it without ruining it",
    body:
      "Keep it above 140°F (60°C) on low heat or in a 170°F (75°C) oven. Stir before you carry it out. If a skin forms on top, stir it back in — do not scrape burnt pan bottom into the sauce.",
  },
  {
    title: "Rookie mistakes",
    body:
      "Boiling hard splits the tomatoes and makes them grainy. Under-salting until the table fixes it for you. And remember — this card is the tomato sauce. Eggs and bacon cook separately.",
  },
] as const;

export const RED_LEAD_TRADITIONAL_SIDES = [
  { name: "Eggs", detail: "Scrambled in a large baking dish or fried to order — cooked on their own, not in the sauce." },
  { name: "Bacon", detail: "Sheet pan at 400°F (205°C) until crisp. Refill the platter." },
  { name: "Breakfast sausage", detail: "Links in the oven or bulk crumbled on the griddle." },
  { name: "Toast", detail: "Thick bread, butter on the table." },
  { name: "Home fries or hash browns", detail: "Griddle or oven — keep them off the Red Lead pan." },
  { name: "Orange juice", detail: "Pitcher within reach. Top it up without being asked." },
  { name: "Coffee", detail: "First pot on early. Keep it going." },
] as const;

export const RED_LEAD_PDF_ASSETS = {
  htmlPath: "/downloads/the-official-firehall-red-lead-recipe.html",
  pdfPath: "/downloads/the-official-firehall-red-lead-recipe.pdf",
  previewPath: "/downloads/the-official-firehall-red-lead-recipe-preview.jpg",
  heroImage: "/images/breakfast/firefighter-red-lead-recipe.jpg",
  spreadImage: "/images/breakfast/chorizo-breakfast-hash.jpg",
} as const;
