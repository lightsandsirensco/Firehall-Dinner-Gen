/**
 * Recipe → image prompt template. The recipe JSON is the only source of what
 * food appears in the photo; art direction (angle, light, background, crop,
 * realism) comes from the shared style presets + master style via
 * buildEditorialModelPrompt.
 */
import type { BuildEditorialImagePromptInput } from "./build-image-prompt.js";
import type { ImageStylePresetId } from "../../shared/image-style-presets.js";

export interface RecipeIngredientLike {
  name?: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  group?: string;
}

export interface RecipePageLike {
  slug: string;
  title?: string;
  subtitle?: string;
  description?: string;
  category?: string;
  taxonomyCategory?: string;
  cuisine?: string;
  ingredients?: RecipeIngredientLike[];
  steps?: Array<{ title?: string; instruction?: string }>;
  dietary?: { flags?: Record<string, boolean> };
  heroImageAlt?: string;
  imageAlt?: string;
}

const COLLECTION_PRESET: Record<string, ImageStylePresetId> = {
  breakfast: "breakfast_shift",
  bbq: "hall_bbq_dark",
  smoothies: "healthy_performance",
  "hall-expansion": "comfort_firehall",
};

const COLLECTION_CATEGORY: Record<string, string> = {
  breakfast: "breakfast",
  bbq: "bbq",
  smoothies: "smoothies",
  "pizza-night": "pizza",
};

// Ingredients that are cooked into the dish and never seen as a distinct item.
const HIDDEN_GROUP = /batter|marinade|brine|custard|dredge|egg wash|^cook(ing)?$|for (the )?(pan|griddle)|frying/i;
const PANTRY =
  /^((kosher|sea|table|fine) )?salt\b|black pepper|cooking spray|(vegetable|canola|neutral|olive|avocado) oil|^water$|^ice$|baking (soda|powder)|^(all-purpose )?flour$|^(granulated )?sugar$|vanilla extract/i;
// Dry spices, seasoning blends and cooking liquids dissolve into the dish; listing
// them crowds real toppings out of the prompt's capped ingredient line.
const SEASONING =
  /^(ground )?(cumin|turmeric|garam masala|chili powder|(smoked )?paprika|cayenne|coriander|cinnamon|nutmeg)$|(garlic|onion) powder|seasoning$|^dried (thyme|oregano|basil|rosemary)|^bay leaf|red pepper flakes|\b(broth|stock)$|vinegar$|^cornstarch$|pickle juice/i;

const PLATED_EGG_TITLE = /\begg|omelet|frittata|benedict|scramble|shakshuka|huevos|quiche|strata/i;
const WHOLE_EGG =
  /crack(?:ing|ed)? (?:an |the |one |\d+ |each )?eggs?|fr(?:y|ied) (?:the )?eggs?|poach(?:ed|ing)? (?:the )?eggs?|sunny.?side|over.?easy|soft.?boiled|hard.?boiled|jammy yolks?|runny yolk|yolks? (?:are |is |stay )?runny/i;
const SCRAMBLED_EGG = /scrambl|egg (?:sheet|squares?|patt(?:y|ies)|layer)s?|fold(?:ed)? (?:the )?eggs?|omelet/i;

const PROTEIN_WORDS = [
  "chicken",
  "beef",
  "brisket",
  "steak",
  "pork",
  "ham",
  "turkey",
  "bacon",
  "sausage",
  "shrimp",
  "salmon",
  "cod",
  "tuna",
  "fish",
  "lamb",
  "tofu",
  "tempeh",
  "chickpea",
  "lentil",
  "black bean",
];

// "Burrito Bowls" / "Burger Bowls" are served in a bowl, so bowl wins over handheld words.
const FORMAT_WORDS: Array<[RegExp, string]> = [
  [/bowl/i, "bowl"],
  [/sandwich|monte cristo|sub\b|hoagie|panini|po.?boy|melt\b|club\b/i, "sandwich"],
  [/burger|slider/i, "burger"],
  [/taco/i, "tacos"],
  [/burrito|wrap/i, "wrap"],
  [/pizza|flatbread/i, "pizza"],
  [/soup|chowder|bisque/i, "soup"],
  [/chili|stew|curry/i, "stew"],
  [/casserole|bake\b|baked ziti|lasagna|strata/i, "casserole"],
  [/pasta|spaghetti|penne|mac|noodle|lo mein/i, "pasta"],
  [/salad/i, "salad"],
  [/smoothie|shake/i, "smoothie"],
  [/skillet|hash\b/i, "skillet"],
  [/pancake|waffle|french toast/i, "griddle breakfast"],
  [/sheet.?pan|tray/i, "sheet pan"],
];

function blobOf(page: RecipePageLike): string {
  const ing = (page.ingredients ?? []).map((i) => `${i.name ?? ""} ${i.notes ?? ""}`).join(" ");
  return `${page.title ?? ""} ${ing}`.toLowerCase();
}

/**
 * How eggs appear on the plate, read from ingredient notes AND the method —
 * "crack an egg into each well" means a visible whole egg even when the
 * ingredient line just says "large eggs".
 */
export function plateEggStyle(page: RecipePageLike): "whole" | "scrambled" | "title" | null {
  const eggIngredients = (page.ingredients ?? []).filter((i) => /\begg/i.test(i.name ?? ""));
  if (!eggIngredients.length && !PLATED_EGG_TITLE.test(page.title ?? "")) return null;
  const text = [
    ...eggIngredients.map((i) => `${i.name ?? ""} ${i.notes ?? ""}`),
    ...(page.steps ?? []).map((s) => s.instruction ?? ""),
  ].join(" ");
  if (WHOLE_EGG.test(text)) return "whole";
  if (SCRAMBLED_EGG.test(text)) return "scrambled";
  if (PLATED_EGG_TITLE.test(page.title ?? "")) return "title";
  return null;
}

export function recipePlatesEgg(page: RecipePageLike): boolean {
  return plateEggStyle(page) !== null;
}

const TITLE_PROTEIN_CHECKS: Array<{ label: string; title: RegExp; ingredients: RegExp }> = [
  { label: "pork", title: /\bpork\b|carnitas/i, ingredients: /pork|carnitas|\bham\b|bacon|sausage|chorizo|prosciutto/i },
  { label: "chicken", title: /\bchicken\b(?![- ]fried)/i, ingredients: /chicken/i },
  { label: "beef", title: /\bbeef\b|\bsteak\b|brisket/i, ingredients: /beef|steak|brisket|chuck|sirloin|ribeye|flank|skirt|tri.?tip|picanha|short rib|oxtail|rump|round roast/i },
  { label: "turkey", title: /\bturkey\b/i, ingredients: /turkey/i },
  { label: "shrimp", title: /\bshrimp\b|prawn/i, ingredients: /shrimp|prawn/i },
  { label: "salmon", title: /\bsalmon\b/i, ingredients: /salmon/i },
  { label: "tuna", title: /\btuna\b/i, ingredients: /tuna/i },
  { label: "lamb", title: /\blamb\b/i, ingredients: /lamb/i },
  { label: "tofu", title: /\btofu\b/i, ingredients: /tofu/i },
  { label: "black bean", title: /black bean/i, ingredients: /black bean/i },
  { label: "chickpea", title: /chickpea|garbanzo/i, ingredients: /chickpea|garbanzo|hummus/i },
  { label: "lentil", title: /\blentil/i, ingredients: /lentil/i },
  { label: "quinoa", title: /\bquinoa\b/i, ingredients: /quinoa/i },
  { label: "sausage", title: /\bsausage\b/i, ingredients: /sausage|chorizo|kielbasa|andouille|bratwurst/i },
];

/**
 * Title names a defining ingredient the ingredient list doesn't contain.
 * Neither an image nor a regenerated image can be right until an editor
 * resolves the recipe itself.
 */
export function titleIngredientConflicts(page: RecipePageLike): string[] {
  const title = page.title ?? "";
  const ing = (page.ingredients ?? []).map((i) => `${i.name ?? ""} ${i.notes ?? ""}`).join(" ");
  if (!ing.trim()) return [];
  return TITLE_PROTEIN_CHECKS.filter((c) => c.title.test(title) && !c.ingredients.test(ing)).map(
    (c) => `title says "${c.label}" but the ingredient list has none`,
  );
}

function isHiddenIngredient(ing: RecipeIngredientLike, platesEgg: boolean): boolean {
  const name = (ing.name ?? "").trim();
  if (!name) return true;
  if (HIDDEN_GROUP.test(ing.group ?? "")) return true;
  if (PANTRY.test(name)) return true;
  if (SEASONING.test(name)) return true;
  if (/\begg/i.test(name) && !platesEgg) return true;
  return false;
}

/** Foods the photo should show, in recipe order, including "plus X for serving" notes. */
export function visibleIngredientHints(page: RecipePageLike): string[] {
  const platesEgg = recipePlatesEgg(page);
  const out: string[] = [];
  for (const ing of page.ingredients ?? []) {
    if (!isHiddenIngredient(ing, platesEgg)) out.push((ing.name ?? "").trim().toLowerCase());
    const plus = /\bplus ([^,;.]+?)(?: for [^,;.]+)?(?:[,;.]|$)/i.exec(ing.notes ?? "");
    if (plus?.[1]) out.push(plus[1].trim().toLowerCase());
  }
  return [...new Set(out)];
}

export function inferMealFormat(title: string): string | undefined {
  return FORMAT_WORDS.find(([re]) => re.test(title))?.[1];
}

export function inferProteinLabel(page: RecipePageLike): string {
  const blob = blobOf(page).replace(/\b(chicken|beef|turkey|pork|fish|seafood)\s+(broth|stock|bouillon|base)\b/g, "");
  const found = PROTEIN_WORDS.filter((w) => new RegExp(`\\b${w}`, "i").test(blob));
  if (found.length) return found.slice(0, 3).join(" and ");
  return page.dietary?.flags?.vegetarian ? "vegetarian (no meat)" : "none";
}

interface FailureRule {
  avoid: string[];
  allowedWhen: (blob: string, page: RecipePageLike) => boolean;
}

// Things image models add to dishes by default. Each is suppressed only when
// the recipe does not actually contain it.
const FAILURE_RULES: FailureRule[] = [
  {
    avoid: ["fried egg", "poached egg", "sunny-side-up egg", "runny yolk"],
    allowedWhen: (_b, p) => ["whole", "title"].includes(plateEggStyle(p) ?? ""),
  },
  { avoid: ["bacon strips"], allowedWhen: (b) => /bacon/.test(b) },
  { avoid: ["sausage links", "sausage patties"], allowedWhen: (b) => /sausage|chorizo|andouille|kielbasa|bratwurst/.test(b) },
  { avoid: ["ham slices"], allowedWhen: (b) => /\bham\b|prosciutto/.test(b) },
  { avoid: ["hash browns", "home fries", "french fries", "potato wedges"], allowedWhen: (b) => /potato|fries|tots|hash brown/.test(b) },
  { avoid: ["pancakes", "waffles"], allowedWhen: (b) => /pancake|waffle/.test(b) },
  { avoid: ["side salad", "lettuce garnish"], allowedWhen: (b) => /lettuce|greens|salad|arugula|spinach|romaine|slaw|cabbage|kale/.test(b) },
  { avoid: ["shrimp"], allowedWhen: (b) => /shrimp|prawn/.test(b) },
  {
    avoid: ["melted or shredded cheese"],
    allowedWhen: (b) =>
      /cheese|cheddar|mozzarella|parmesan|parmigiano|swiss|feta|provolone|\bjack\b|queso|ricotta|gruy[eè]re|brie|paneer|halloumi|cotija|asiago|pecorino/.test(b),
  },
  { avoid: ["meat of any kind"], allowedWhen: (_b, p) => p.dietary?.flags?.vegetarian !== true },
];

export function deriveAvoidItems(page: RecipePageLike, extra: string[] = []): string[] {
  const blob = blobOf(page);
  const avoid = FAILURE_RULES.filter((r) => !r.allowedWhen(blob, page)).flatMap((r) => r.avoid);
  return [...new Set([...extra.map((e) => e.trim()).filter(Boolean), ...avoid, "side dishes not in the recipe"])];
}

// Holding, leftover and food-safety steps describe storage containers, not the plate.
const NON_SERVING_STEP =
  /hold for|call interruption|tones drop|leftovers?|pack down|within two hours|refrigerat|reheat|\bstore\b|delayed (line|service)|if service is delayed|room temperature/i;

function servingLine(page: RecipePageLike): string {
  const steps = page.steps ?? [];
  const serving = [...steps].reverse().find((s) => !NON_SERVING_STEP.test(`${s.title ?? ""} ${s.instruction ?? ""}`));
  const last = (serving ?? steps[steps.length - 1])?.instruction ?? "";
  return last.length > 220 ? `${last.slice(0, 217)}…` : last;
}

export function buildRecipeImagePromptInput(
  page: RecipePageLike,
  collection: string,
  extraAvoid: string[] = [],
): BuildEditorialImagePromptInput {
  const title = (page.title ?? page.slug).trim();
  const summary = (page.subtitle || page.description || "").trim();
  const hook = [summary, servingLine(page) && `Served: ${servingLine(page)}`].filter(Boolean).join(" ");
  return {
    mealName: title,
    category: page.category || COLLECTION_CATEGORY[collection] || page.taxonomyCategory,
    cuisine: page.cuisine,
    protein: inferProteinLabel(page),
    mealFormat: inferMealFormat(title),
    stylePreset: COLLECTION_PRESET[collection],
    ingredientHints: visibleIngredientHints(page),
    hookLine: hook || undefined,
    avoidItems: deriveAvoidItems(page, extraAvoid),
  };
}

const ALT_MAX = 160;
const SERVING_TAIL =
  /\s*(?:—\s*)?(?:(?:sheet-pan )?batch )?(?:for (?:a |the )?(?:hungry )?(?:crew|hall|ten|eight|twelve|twenty|\d+)|in a make-ahead \w+)$/i;

function joinFoods(items: string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/**
 * Alt text derived from the recipe, not from the image filename. When vision QA has listed
 * the foods in this exact photo, the alt names them instead of the recipe's marketing subtitle.
 */
export function buildRecipeImageAlt(page: RecipePageLike, visibleFoods?: string[]): string {
  const title = (page.title ?? page.slug).trim();
  if (visibleFoods?.length) {
    const stem = (w: string) => w.replace(/s$/, "");
    const titleWords = new Set((title.toLowerCase().match(/[a-z]+/g) ?? []).map(stem));
    const extra = visibleFoods
      .map((f) => f.trim())
      .filter((f) => f && !(f.toLowerCase().match(/[a-z]{3,}/g) ?? []).every((w) => titleWords.has(stem(w))));
    for (let n = extra.length; n > 0; n--) {
      const alt = `${title} — ${joinFoods(extra.slice(0, n))}`;
      if (alt.length <= ALT_MAX) return alt;
    }
    return title;
  }
  const summary = ((page.subtitle || page.description || "").split(/(?<=\.)\s/)[0] ?? "")
    .trim()
    .replace(/\.$/, "")
    .replace(SERVING_TAIL, "")
    .trim();
  if (!summary) return title;
  const lead = summary.charAt(0).toLowerCase() + summary.slice(1);
  const alt = `${title} — ${lead}`;
  return alt.length > ALT_MAX ? `${alt.slice(0, ALT_MAX - 3)}…` : alt;
}
