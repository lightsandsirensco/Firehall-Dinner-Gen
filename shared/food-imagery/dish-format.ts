/**
 * Dish format — the physical form the food is served in (bowl, sandwich, wrapped burrito,
 * casserole, soup…). A first-class recipe-fidelity requirement for hero images: the right
 * ingredients in the wrong format (beef-and-slaw sub for a beef BOWL) is a wrong picture.
 */
import { normalizeFormatKey } from "../meal-format-contract.js";

export const DISH_FORMATS = [
  "bowl",
  "meal_prep",
  "sandwich",
  "burger",
  "wrap",
  "taco",
  "pasta",
  "casserole",
  "rolled",
  "soup",
  "salad",
  "plated",
  "skillet",
  "sheet_pan",
  "pizza",
  "unclear",
] as const;

export type DishFormat = (typeof DISH_FORMATS)[number];

/** Definitions shown to the vision model. Classify by food form, not by the tray or board it sits on. */
export const DISH_FORMAT_DEFINITIONS: Record<DishFormat, string> = {
  bowl: "components served together in individual bowls (rice/grain/noodle/pasta bowls, burrito bowls, burger bowls)",
  meal_prep: "portioned into meal-prep containers",
  sandwich: "food between or on bread — sandwich, sub, hoagie, hero, roll, panini, melt, po'boy, open-faced on bread",
  burger: "patty on a bun, including sliders",
  wrap: "filling rolled inside a tortilla or flatbread — burrito, wrap, rolled lavash",
  taco: "folded taco shells or tortillas, open-topped",
  pasta: "pasta or noodles plated or in a pasta bowl (not baked in a dish)",
  casserole: "baked in a baking dish or hotel pan — casserole, pasta bake, lasagna, gratin, hot dish",
  rolled: "individually rolled items plated separately — enchiladas, cannelloni, cabbage rolls, egg rolls",
  soup: "liquid-based: soup, stew, chili, chowder in a bowl or pot",
  salad: "cold or room-temperature tossed salad as the main dish",
  plated: "hot entrée on a dinner plate — protein with separate sides",
  skillet: "served in the skillet or pan it was cooked in",
  sheet_pan: "roasted spread on a sheet pan or tray",
  pizza: "pizza or flatbread pie",
  unclear: "cannot tell what format the dish is",
};

const FORMAT_KEYWORDS: Array<{ format: DishFormat; re: RegExp }> = [
  { format: "bowl", re: /(?<!super )\bbowls?\b/gi },
  { format: "casserole", re: /\b(casseroles?|bakes?|baked ziti|lasagnas?|hot ?dish|gratin)\b/gi },
  // "chili" is only the dish when it ends the name ("Chili Lime Tilapia", "Chili Cheese Dogs" are not soup).
  { format: "soup", re: /\b(soups?|stews?|chowders?|bisques?|broth|chili(?=\s*$)|chili con carne)\b/gi },
  { format: "salad", re: /\bsalads?\b/gi },
  { format: "burger", re: /\b(burgers?|cheeseburgers?|sliders?)\b/gi },
  {
    format: "sandwich",
    re: /\b(sandwich(?:es)?|subs?|hoagies?|heroes|hero subs?|paninis?|melts?(?!-in)|po'?.?boys?|grilled cheese|french dips?|beef dips?|cheesesteaks?)\b/gi,
  },
  { format: "taco", re: /\btacos?\b/gi },
  { format: "wrap", re: /\b(burritos?|wraps?|chimichangas?)\b/gi },
  { format: "rolled", re: /\b(enchiladas?|cannelloni|cabbage rolls?|egg rolls?)\b/gi },
  { format: "pizza", re: /\bpizzas?\b/gi },
  { format: "pasta", re: /\b(pasta|spaghetti|penne|rigatoni|fettuccine|linguine|ziti|macaroni|mac and cheese|mac)\b/gi },
  { format: "skillet", re: /\bskillets?\b/gi },
  { format: "sheet_pan", re: /\b(sheet[- ]pan|tray bake)\b/gi },
];

/** "X Bowls with Spaghetti & Coleslaw" — the format lives in the dish name, not the listed sides. */
function dishHead(title: string): string {
  return title.split(/\s+(?:with|over|on|plus|served with|\+)\s+/i)[0] ?? title;
}

/** The format word nearest the end of the dish name is its head noun ("Taco Soup" → soup, "Burger Bowl" → bowl). */
function lastFormatKeyword(text: string): DishFormat | null {
  let best: { format: DishFormat; index: number } | null = null;
  for (const { format, re } of FORMAT_KEYWORDS) {
    for (const m of text.matchAll(re)) {
      const end = (m.index ?? 0) + m[0].length;
      if (!best || end > best.index) best = { format, index: end };
    }
  }
  return best?.format ?? null;
}

const MEAL_FORMAT_KEY: Record<string, DishFormat> = {
  bowl: "bowl",
  sandwich: "sandwich",
  burger: "burger",
  wrap: "wrap",
  tacos: "taco",
  pasta: "pasta",
  casserole: "casserole",
  soup_chili: "soup",
  stew: "soup",
  salad: "salad",
  skillet: "skillet",
  sheet_pan: "sheet_pan",
  pizza: "pizza",
};

/**
 * The format the recipe promises, or null when the title/format do not commit to one
 * (then the format check is not applicable and ingredient fidelity decides).
 */
export function expectedDishFormat(title: string, mealFormat?: string): DishFormat | null {
  return resolveExpectedDishFormat(title, mealFormat).format;
}

/** Where the promise comes from: the title is a hard commitment, the loose mealFormat tag is only a hint. */
export function resolveExpectedDishFormat(
  title: string,
  mealFormat?: string,
): { format: DishFormat | null; source: "title" | "meal_format" | null } {
  const head = dishHead(title.trim());
  let format = lastFormatKeyword(head);
  if (format === "bowl" && /\bmeal[- ]?prep\b/i.test(title)) format = "meal_prep";
  if (!format && /\bmeal[- ]?prep\b/i.test(title)) format = "meal_prep";
  if (format) return { format, source: "title" };
  const fallback = MEAL_FORMAT_KEY[normalizeFormatKey(mealFormat)] ?? null;
  return { format: fallback, source: fallback ? "meal_format" : null };
}

/**
 * Compare a depicted format against the recipe. Only a title-level format promise can hard-fail;
 * a mismatch against the mealFormat tag alone goes to manual review.
 */
export function checkRecipeDishFormat(
  title: string,
  mealFormat: string | undefined,
  depictedRaw: unknown,
  confidence?: number,
): DishFormatCheck {
  const { format, source } = resolveExpectedDishFormat(title, mealFormat);
  const check = compareDishFormat(format, depictedRaw, confidence);
  if (check.verdict === "mismatch" && source === "meal_format") {
    return { ...check, verdict: "inconclusive", reason: `${check.reason} (format from meal tag, not title — review)` };
  }
  return check;
}

const DEPICTED_SYNONYMS: Array<{ format: DishFormat; re: RegExp }> = [
  { format: "meal_prep", re: /meal[- _]?prep|container/i },
  { format: "burger", re: /\b(burger|slider|patty on (a )?bun)/i },
  { format: "wrap", re: /\b(burrito(?! bowl)|wrap|chimichanga)/i },
  { format: "rolled", re: /\b(rolled|enchilada|cannelloni|cabbage roll|egg roll)/i },
  { format: "sandwich", re: /\b(sandwich|sub\b|subs\b|hoagie|hero\b|panini|melt\b|po'?.?boy|roll(?!ed)|bread|toast|baguette|ciabatta)/i },
  { format: "taco", re: /\btaco/i },
  { format: "pizza", re: /\b(pizza|flatbread)/i },
  { format: "casserole", re: /\b(casserole|bake|baking dish|lasagna|gratin|hotel pan)/i },
  { format: "soup", re: /\b(soup|stew|chili|chowder|bisque|broth)/i },
  { format: "salad", re: /\bsalad/i },
  { format: "skillet", re: /\b(skillet|cast[- ]iron|in the pan)/i },
  { format: "sheet_pan", re: /\b(sheet[- _]?pan|tray bake|roasting tray)/i },
  { format: "bowl", re: /\bbowl/i },
  { format: "pasta", re: /\b(pasta|spaghetti|noodle|penne|rigatoni|linguine)/i },
  { format: "plated", re: /\b(plate|plated|entr[ée]e)/i },
];

/** Map a model's format label (enum value or free text like "meatball subs on a tray") to a DishFormat. */
export function normalizeDepictedFormat(raw: unknown): DishFormat {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return "unclear";
  const exact = text.replace(/[\s-]+/g, "_");
  if ((DISH_FORMATS as readonly string[]).includes(exact)) return exact as DishFormat;
  return DEPICTED_SYNONYMS.find(({ re }) => re.test(text))?.format ?? "unclear";
}

/**
 * For each promised format: depicted formats that satisfy it, and ones too close to call.
 * Anything else is a mismatch.
 */
const FORMAT_COMPATIBILITY: Record<Exclude<DishFormat, "unclear" | "plated">, { ok: DishFormat[]; ambiguous: DishFormat[] }> = {
  bowl: { ok: ["bowl", "meal_prep", "pasta"], ambiguous: ["salad", "skillet", "plated", "soup"] },
  meal_prep: { ok: ["meal_prep", "bowl"], ambiguous: [] },
  sandwich: { ok: ["sandwich"], ambiguous: ["burger", "wrap"] },
  burger: { ok: ["burger"], ambiguous: ["sandwich"] },
  wrap: { ok: ["wrap"], ambiguous: ["taco", "rolled"] },
  taco: { ok: ["taco"], ambiguous: [] },
  pasta: { ok: ["pasta", "bowl"], ambiguous: ["casserole", "skillet", "soup", "plated"] },
  casserole: { ok: ["casserole", "sheet_pan"], ambiguous: ["skillet", "pasta", "plated", "bowl"] },
  rolled: { ok: ["rolled", "casserole"], ambiguous: ["wrap", "plated"] },
  soup: { ok: ["soup"], ambiguous: ["bowl"] },
  salad: { ok: ["salad", "bowl"], ambiguous: ["meal_prep"] },
  skillet: { ok: ["skillet"], ambiguous: ["bowl", "plated", "casserole", "pasta", "sheet_pan"] },
  sheet_pan: { ok: ["sheet_pan", "casserole"], ambiguous: ["plated", "skillet", "bowl"] },
  pizza: { ok: ["pizza"], ambiguous: [] },
};

/** Below this the model's format call is treated as ambiguous rather than evidence. */
export const DISH_FORMAT_MIN_CONFIDENCE = 60;

export type DishFormatVerdict = "match" | "mismatch" | "inconclusive" | "not_applicable";

export interface DishFormatCheck {
  expected: DishFormat | null;
  depicted: DishFormat;
  verdict: DishFormatVerdict;
  reason?: string;
}

const LABEL: Partial<Record<DishFormat, string>> = { meal_prep: "meal-prep containers", sheet_pan: "sheet pan", rolled: "individually rolled items", wrap: "wrapped burrito/wrap", plated: "hot plated entrée" };
const label = (f: DishFormat) => LABEL[f] ?? f;

export function compareDishFormat(
  expected: DishFormat | null,
  depictedRaw: unknown,
  confidence?: number,
): DishFormatCheck {
  const depicted = normalizeDepictedFormat(depictedRaw);
  if (!expected || expected === "unclear" || expected === "plated") return { expected, depicted, verdict: "not_applicable" };
  if (depicted === "unclear") {
    return { expected, depicted, verdict: "inconclusive", reason: `dish format unclear — recipe is ${label(expected)}` };
  }
  const rules = FORMAT_COMPATIBILITY[expected];
  if (rules.ok.includes(depicted)) return { expected, depicted, verdict: "match" };

  const pct = confidence === undefined ? 100 : confidence <= 1 ? confidence * 100 : confidence;
  if (rules.ambiguous.includes(depicted) || pct < DISH_FORMAT_MIN_CONFIDENCE) {
    return { expected, depicted, verdict: "inconclusive", reason: `format may not match — recipe is ${label(expected)}, image looks like ${label(depicted)}` };
  }
  return {
    expected,
    depicted,
    verdict: "mismatch",
    reason: `wrong dish format — recipe is ${label(expected)} but image shows ${label(depicted)}`,
  };
}

export type FidelityStatus = "PASS" | "FAIL" | "INCONCLUSIVE";

/**
 * Combine the format check with the ingredient/dish verdict. A format mismatch fails no matter
 * how many ingredients overlap; an ambiguous format can only pass to manual review.
 */
export function combineFidelity(
  format: DishFormatCheck,
  content: { status: FidelityStatus; reasons: string[] },
): { status: FidelityStatus; reasons: string[] } {
  if (format.verdict === "mismatch") return { status: "FAIL", reasons: [format.reason!, ...content.reasons] };
  if (format.verdict === "inconclusive" && content.status !== "FAIL") {
    return { status: "INCONCLUSIVE", reasons: [format.reason!, ...content.reasons] };
  }
  return content;
}

/** Rubric block asking the vision model for a format label from the fixed list. */
export function dishFormatRubricLines(): string[] {
  return [
    "DISH FORMAT — classify the physical form of the food, independent of ingredients. Use the food's form, not the tray or board it sits on (subs on a sheet pan are still \"sandwich\").",
    ...DISH_FORMATS.map((f) => `  - ${f}: ${DISH_FORMAT_DEFINITIONS[f]}`),
    "Report depicted_format honestly even when every ingredient matches — a bowl recipe shown as subs is depicted_format \"sandwich\".",
    "Format and vessel (bowl vs plate vs skillet vs baking dish) are judged separately from depicted_format: grade ACCURACY on the foods only and do not list format or vessel differences in accuracy_issues.",
  ];
}

const FORMAT_NOUN =
  "(?:skillet|casserole|baking dish|bowl|plate|plated|sheet[-_ ]?pan|tray|pan|wrap|sandwich|soup|stew|meal[-_ ]?prep|containers?|format|bake)";
const FORMAT_ISSUE = new RegExp(
  [
    `wrong (?:dish )?format`,
    `\\b(?:instead of|rather than|not)\\s+(?:(?:a|an|the|in|on|served|plated|in a|on a)\\s+)*(?:[\\w']+[- ])?${FORMAT_NOUN}\\b`,
    `\\b(?:served|presented|plated)\\s+(?:in|on|as)\\s+(?:(?:a|an|the)\\s+)?(?:[\\w']+[- ])?${FORMAT_NOUN}\\b`,
    `\\b${FORMAT_NOUN}\\s+format\\b`,
  ].join("|"),
  "i",
);
const FOOD_COMPLAINT = /\bnot (?:in|listed in|part of) (?:the )?recipe\b|\bmissing\b/i;

/** Vision issues that are about serving format/vessel — these are adjudicated by the format check, not by content. */
export function isFormatIssue(issue: string): boolean {
  return FORMAT_ISSUE.test(issue) && !FOOD_COMPLAINT.test(issue);
}

/** Recipe-side line for the vision brief. */
export function expectedDishFormatBrief(title: string, mealFormat?: string): string {
  const { format, source } = resolveExpectedDishFormat(title, mealFormat);
  if (!format) return "Expected dish format: not specified by the title (judge from ingredients and serving step)";
  if (source === "meal_format") {
    return `Likely dish format (from a loose meal tag, not the title): ${format} — ${DISH_FORMAT_DEFINITIONS[format]}. Report the depicted format, but a different format alone is not CRITICAL.`;
  }
  return `Expected dish format: ${format} — ${DISH_FORMAT_DEFINITIONS[format]}`;
}

/** Formats that must not appear in a generated image for this recipe (prompt negatives). */
export function dishFormatNegativeHints(expected: DishFormat | null): string[] {
  if (!expected || expected === "unclear" || expected === "plated") return [];
  const rules = FORMAT_COMPATIBILITY[expected];
  const banned = DISH_FORMATS.filter((f) => f !== "unclear" && f !== "plated" && !rules.ok.includes(f) && !rules.ambiguous.includes(f));
  const words: Partial<Record<DishFormat, string[]>> = {
    sandwich: ["sandwich", "sub roll", "hoagie", "bread roll", "sliced bread"],
    burger: ["burger bun"],
    wrap: ["wrapped burrito", "tortilla wrap"],
    taco: ["taco shells"],
    rolled: ["rolled enchiladas"],
    soup: ["soup broth"],
    pizza: ["pizza crust"],
    casserole: ["baking dish casserole"],
    salad: ["cold tossed salad"],
    sheet_pan: ["sheet pan spread"],
    skillet: ["cast-iron skillet service"],
    pasta: ["plated pasta only"],
    bowl: ["rice bowl"],
    meal_prep: ["meal-prep containers"],
  };
  return banned.flatMap((f) => words[f] ?? [f]);
}
