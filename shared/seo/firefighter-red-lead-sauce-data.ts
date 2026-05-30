/**
 * Red Lead tomato sauce only — not steak, eggs, or the full breakfast spread.
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

/** Base recipe — serves 8 hall portions of sauce (~3/4 cup each). */
export const RED_LEAD_SAUCE_INGREDIENTS: RedLeadSauceIngredient[] = [
  { name: "crushed tomatoes", amount: "2 cans (28 oz each)" },
  { name: "tomato juice", amount: "1 cup", notes: "or use liquid from one can if thick" },
  { name: "yellow onion", amount: "1 large", notes: "diced small" },
  { name: "butter", amount: "4 tbsp" },
  { name: "kosher salt", amount: "2 tsp" },
  { name: "black pepper", amount: "1 tsp", notes: "freshly ground" },
  { name: "sugar", amount: "1/2 tsp", notes: "optional — only if sauce tastes sharp", optional: true },
  { name: "garlic", amount: "3 cloves", notes: "minced", optional: true },
  { name: "hot sauce", amount: "1 tsp", notes: "optional, for the hall that likes heat", optional: true },
];

export const RED_LEAD_SAUCE_STEPS: RedLeadSauceStep[] = [
  {
    number: 1,
    title: "Start the rest of breakfast before the sauce",
    body:
      "Red Lead is the tomato pan — not the whole meal. Put bacon in the oven, sausage links on a sheet pan, coffee on, and toast ready before you dice the onion. The sauce needs a calm simmer, not a rushed boil while the crew is still hunting for plates.",
    minutes: "5 min setup",
    mistake: "Starting the sauce first and letting it scorch while you scramble to cook everything else.",
  },
  {
    number: 2,
    title: "Melt butter and sweat the onion",
    body:
      "Set a 12-inch cast iron over medium heat. Melt the butter until it foams and smells nutty — not brown. Add the diced onion (and bell pepper if your hall uses it). Stir every minute or so until the onion turns soft and translucent with light gold at the edges.",
    minutes: "8–10 min",
    visualCue: "Onion pieces bend easily on the spoon; no raw white centers.",
    mistake: "Cranking heat to “speed it up” — butter burns and the sauce tastes bitter.",
  },
  {
    number: 3,
    title: "Add garlic, then tomatoes",
    body:
      "If using garlic, stir it in for 45 seconds until fragrant — not brown. Pour in crushed tomatoes, tomato juice, tomato paste if your hall adds a spoon for body, salt, and pepper. Stir until the red is even and the pan looks like thick soup.",
    minutes: "2 min",
    visualCue: "Uniform deep red; no dry tomato paste streaks.",
  },
  {
    number: 4,
    title: "Simmer until the sauce thickens",
    body:
      "Drop heat to medium-low. Simmer with the pan uncovered, stirring every few minutes so the bottom does not stick. The sauce is ready when it coats a spoon and a drag through the middle leaves a brief trail that slowly fills in.",
    minutes: "25–35 min",
    visualCue: "Thick enough to mound slightly on toast; raw tomato smell is gone.",
    mistake: "Covering too early — steam keeps it watery. Uncovered simmer builds body.",
  },
  {
    number: 5,
    title: "Taste, adjust, and hold",
    body:
      "Taste for salt and pepper. Add the pinch of sugar only if the tomatoes are sharp. For service, hold the pan on the lowest steady heat or transfer to a warm oven (170°F / 75°C) with foil on top. Sauce should stay above 140°F (60°C) for food safety.",
    minutes: "2 min",
    visualCue: "Balanced savory tomato — not flat, not candy-sweet.",
  },
  {
    number: 6,
    title: "Carry the pan to the table",
    body:
      "Place the cast iron in the center of the spread. Bacon, sausage, eggs, toast, hash browns, and juice stay in their own platters. The crew serves themselves from the Red Lead pan with a spoon while everything else passes around it.",
    minutes: "Serve immediately",
    mistake: "Plating Red Lead to-go — it is hall table food, meant to be shared from the pan.",
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
    title: "Make it ahead",
    body:
      "Simmer the sauce the night before, cool quickly, and refrigerate. Reheat in cast iron over medium-low with a splash of tomato juice — stir until glossy again. Do not microwave the whole pan if you can avoid it.",
  },
  {
    title: "Scale for the crew",
    body:
      "Use the 4 / 8 / 12 scaling on page 2. For two pans, split onion and tomato evenly — never double depth in one skillet or the center stays cold while the edges scorch.",
  },
  {
    title: "Holding temperature",
    body:
      "Hold at 140°F (60°C) or above on the range’s lowest flame or in a 170°F (75°C) oven. Stir before service. If the sauce skin over, fold it back in — do not scrape burnt pan bottom into the sauce.",
  },
  {
    title: "Best cast iron",
    body:
      "A well-seasoned 12-inch skillet is the standard. Larger crews use two pans or a 15-inch lodge — same technique, more surface for evaporation.",
  },
  {
    title: "Rookie mistakes",
    body:
      "Boiling hard (splits the tomato and makes it grainy), under-salting until the table adds hot sauce, and confusing Red Lead with the steak skillet some halls also call by the same name — this card is tomato sauce only.",
  },
] as const;

export const RED_LEAD_TRADITIONAL_SIDES = [
  { name: "Bacon", detail: "Sheet-pan at 400°F (205°C) until crisp; refill the platter." },
  { name: "Breakfast sausage", detail: "Links in the oven or bulk crumbled on the griddle." },
  { name: "Eggs", detail: "Scrambled in a hotel pan or fried to order — separate from the sauce." },
  { name: "Toast", detail: "Thick bread, butter and jam on the table." },
  { name: "Hash browns or potatoes", detail: "On the griddle or oven — not mixed into the Red Lead pan." },
  { name: "Orange juice", detail: "Pitcher on the table; refill without being asked." },
] as const;

export const RED_LEAD_PDF_ASSETS = {
  htmlPath: "/downloads/the-official-firehall-red-lead-recipe.html",
  pdfPath: "/downloads/the-official-firehall-red-lead-recipe.pdf",
  previewPath: "/downloads/the-official-firehall-red-lead-recipe-preview.jpg",
  heroImage: "/images/breakfast/firefighter-red-lead-recipe.jpg",
  spreadImage: "/images/breakfast/chorizo-breakfast-hash.jpg",
} as const;
