/**
 * Meal occasions for the approved catalog — which Shift Planner slots a recipe
 * is a realistic pick for. Based on dish style and how a crew actually eats on
 * shift, not on "could technically be eaten then": a pot roast is not lunch, a
 * tray of street corn is not anyone's dinner.
 *
 * Deterministic and data-only (title, format, cook time); explicit overrides
 * win over the rules. Breakfast slots keep using the catalog's breakfast
 * entries (shared/shift-plan/breakfast.ts).
 */

export const MEAL_OCCASIONS = ["breakfast", "lunch", "dinner", "late_night"] as const;
export type MealOccasion = (typeof MEAL_OCCASIONS)[number];

/** What the dish is on the table: only "meal" can fill a meal slot on its own. */
export type MealRole = "meal" | "side" | "appetizer" | "drink";

/** Reporting bucket: a single occasion, or several of lunch / dinner / late night. */
export type MealOccasionPrimary = MealOccasion | "multi_purpose" | "not_a_meal";

export interface MealOccasionInput {
  slug: string;
  title: string;
  mealFormat: string;
  cookTime: number;
  isSmoothie?: boolean;
}

export interface MealOccasionResult {
  role: MealRole;
  occasions: MealOccasion[];
  primary: MealOccasionPrimary;
  source: "rule" | "override";
}

interface MealOccasionOverride {
  role?: MealRole;
  occasions?: MealOccasion[];
}

/** Lunch tops out here: anything longer can't realistically land at midday on shift. */
export const LUNCH_MAX_MINUTES = 60;
/** Late night is a quick hot meal between calls. */
export const LATE_NIGHT_MAX_MINUTES = 30;

const SIDE_SLUGS = [
  "smoked-potato-salad-tray",
  "grilled-corn-cotija",
  "smoked-baked-beans-crew",
  "firehall-street-elote-cups",
  "loaded-ranch-potato-salad-crew",
  "firehall-antipasto-pasta-salad",
  "charred-broccolini-lemon-tray",
  "grilled-peach-burrata-salad",
  "smoked-mac-and-cheese-crew",
] as const;

const APPETIZER_SLUGS = [
  "buffalo-chicken-dip",
  "jalapeno-popper-dip",
  "smoked-queso-fundido",
  "pretzel-bite-platter",
  "firehall-charcuterie-board",
  "loaded-potato-skins",
  "philly-egg-rolls",
  "bbq-meatball-skewers",
] as const;

const OCCASION_OVERRIDES: Record<string, MealOccasionOverride> = {
  ...Object.fromEntries(SIDE_SLUGS.map((s) => [s, { role: "side" as const }])),
  ...Object.fromEntries(APPETIZER_SLUGS.map((s) => [s, { role: "appetizer" as const }])),
  // Breakfast dishes filed outside the breakfast catalog — never a lunch or dinner pick.
  "breakfast-sausage-pizza": { occasions: ["breakfast"] },
  "sausage-egg-bake": { occasions: ["breakfast"] },
  // Soups without "soup" in the title.
  "pasta-e-fagioli-hall": { occasions: ["lunch", "dinner"] },
  "30-minute-pasta-e-fagioli-for-the-hall": { occasions: ["lunch", "dinner"] },
  // Grilled-chicken Caesar is a standing hall dinner, not just a side salad.
  "chicken-caesar": { occasions: ["lunch", "dinner"] },
  "leftover-roast-beef-bowls": { occasions: ["lunch", "dinner", "late_night"] },
  // Cold sandwich spread — a lunch line, not a hot dinner.
  "sandwich-board-night": { occasions: ["lunch"] },
  // Sheet-pan meal prep built to portion out for the next day's lunches too.
  "sheet-pan-meal-prep": { occasions: ["lunch", "dinner"] },
  "high-protein-chicken-quinoa-meal-prep-bowls": { occasions: ["lunch", "dinner"] },
  // Template formats on the BBQ batch don't describe the dish; these are sandwiches.
  "andouille-po-boy-rolls-crew": { occasions: ["lunch", "dinner", "late_night"] },
  "grilled-reuben-sandwiches-crew": { occasions: ["lunch", "late_night"] },
  "grilled-chicken-pesto-panini-crew": { occasions: ["lunch", "late_night"] },
  "pressed-cuban-sandwiches-crew": { occasions: ["lunch", "late_night"] },
  "flat-top-philly-cheesesteaks-crew": { occasions: ["lunch", "dinner", "late_night"] },
  "griddle-smash-sausage-peppers": { occasions: ["lunch", "dinner", "late_night"] },
  // Grilled steak / BBQ plates filed under "sandwich" or "burger".
  "smoked-picanha-steak-platter": { occasions: ["dinner"] },
  "reverse-seared-ribeye-crew": { occasions: ["dinner"] },
  "texas-central-brisket-crew": { occasions: ["dinner"] },
  "firehall-burnt-ends-platter": { occasions: ["dinner"] },
  "honey-sriracha-shrimp-skewers": { occasions: ["dinner"] },
  // BBQ mains filed under "side".
  "spiedie-chicken-platter-crew": { occasions: ["dinner"] },
  "portuguese-linguica-grill-platter": { occasions: ["dinner"] },
  "tandoori-lamb-chop-platter": { occasions: ["dinner"] },
};

/** Dish styles a crew actually makes for lunch on shift. */
const LUNCH_FORMATS = new Set(["sandwich", "handheld", "salad", "soup", "soup_chili", "tacos", "burger", "bowl", "bowls"]);
const LUNCH_TITLE =
  /\b(sandwich(es)?|subs?|hoagies?|wraps?|pitas?|gyros?|quesadillas?|melt|blt|sloppy joe|panini|po ?boy|reuben|cuban sandwich(es)?|sliders?|burgers?|soup|salad|tacos?|lettuce|bowls?|hot dogs?)\b|\bchili\b(?=\s*(mac|crock|for\b|$))/;
/** Lunch-style words that still describe a dinner plate, not a midday meal. */
const NOT_LUNCH_TITLE = /\b(platter|board|pot roast|ribeye|picanha|ribs|nachos?|potato bar)\b/;

/** Light midday dishes that don't carry a crew's main meal. */
const LUNCH_ONLY_FORMATS = new Set(["salad"]);
const LUNCH_ONLY_TITLE = /\b(lettuce (cups|wraps)|blt|tuna melt|patty melt|panini|reuben|cuban sandwich(es)?|sandwich board)\b/;
const SOUP_TITLE = /\bsoup|bisque\b/;
const HEARTY_SOUP_TITLE = /\b(chili|stew|dumplings?|ramen|pho|laksa|bun bo|wonton|goulash|paprikash|dal|barley)\b/;

/** Slow, outdoor, or crowd-production formats nobody fires up between late calls. */
const NOT_LATE_NIGHT_FORMATS = new Set([
  "grill",
  "bbq",
  "smoker",
  "crew_kebab",
  "smokehouse_board",
  "skewer",
  "platter",
  "bar_line",
  "roast",
  "braise",
  "slow_cooker",
  "pizza",
  "salad",
]);

function primaryFor(role: MealRole, occasions: readonly MealOccasion[]): MealOccasionPrimary {
  if (role !== "meal" || occasions.length === 0) return "not_a_meal";
  if (occasions.length === 1) return occasions[0]!;
  return "multi_purpose";
}

function ruleOccasions(input: MealOccasionInput): { role: MealRole; occasions: MealOccasion[] } {
  if (input.isSmoothie || input.mealFormat === "smoothie") return { role: "drink", occasions: [] };
  if (input.mealFormat === "breakfast") return { role: "meal", occasions: ["breakfast"] };
  if (input.mealFormat === "side") return { role: "side", occasions: [] };

  const title = input.title.toLowerCase();
  const minutes = input.cookTime > 0 ? input.cookTime : Number.POSITIVE_INFINITY;
  const occasions: MealOccasion[] = [];

  const lunchStyle =
    (LUNCH_FORMATS.has(input.mealFormat) || LUNCH_TITLE.test(title)) && !NOT_LUNCH_TITLE.test(title);
  if (lunchStyle && minutes <= LUNCH_MAX_MINUTES) occasions.push("lunch");

  const lightSoup = SOUP_TITLE.test(title) && !HEARTY_SOUP_TITLE.test(title);
  const lunchOnly = LUNCH_ONLY_FORMATS.has(input.mealFormat) || LUNCH_ONLY_TITLE.test(title) || lightSoup;
  if (!lunchOnly) occasions.push("dinner");

  if (minutes <= LATE_NIGHT_MAX_MINUTES && !NOT_LATE_NIGHT_FORMATS.has(input.mealFormat)) {
    occasions.push("late_night");
  }

  // A light dish too slow for lunch (crock soups, long-simmered bisques) is still a dinner.
  if (occasions.length === 0) occasions.push("dinner");

  return { role: "meal", occasions };
}

export function classifyMealOccasions(input: MealOccasionInput): MealOccasionResult {
  const rule = ruleOccasions(input);
  const override = OCCASION_OVERRIDES[input.slug];
  if (!override) return { ...rule, primary: primaryFor(rule.role, rule.occasions), source: "rule" };

  const role = override.role ?? (override.occasions ? "meal" : rule.role);
  const occasions = role === "meal" ? (override.occasions ?? rule.occasions) : [];
  return { role, occasions: [...occasions], primary: primaryFor(role, occasions), source: "override" };
}

export function mealOccasionOverrideSlugs(): string[] {
  return Object.keys(OCCASION_OVERRIDES);
}
