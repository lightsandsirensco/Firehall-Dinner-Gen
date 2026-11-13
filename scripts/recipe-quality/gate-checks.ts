/**
 * Recipe Quality Gate — pure, deterministic checks on one normalized recipe.
 *
 * Automated checks can only establish "Technically Validated". They never
 * stand in for a kitchen test: KITCHEN_TESTED and APPROVED_FOR_PUBLISHING are
 * only ever read from a human-entered review log (see review-status.ts).
 */

export type Severity = "S1" | "S2" | "S3" | "S4" | "S5";

export const SEVERITY_LABEL: Record<Severity, string> = {
  S1: "Food safety / misleading claim",
  S2: "Missing ingredient, wrong quantity or broken instruction",
  S3: "Nutrition, timing or data reliability",
  S4: "Presentation",
  S5: "Polish",
};

export type CheckCategory =
  | "required_fields"
  | "ingredient_instruction"
  | "quantity_unit"
  | "serving_scaling"
  | "nutrition"
  | "food_safety"
  | "image"
  | "duplicate"
  | "completeness"
  | "presentation";

export interface GateFinding {
  code: string;
  severity: Severity;
  category: CheckCategory;
  message: string;
  evidence?: string;
  fix?: string;
  /** Heuristic findings need a human to confirm before any correction. */
  heuristic?: boolean;
}

export interface QualityIngredient {
  name: string;
  quantity?: string;
  unit?: string;
  notes?: string;
  optional?: boolean;
  group?: string;
}

export interface QualityStep {
  title?: string;
  instruction: string;
  minutes?: number;
}

export interface QualityRecipe {
  slug: string;
  title: string;
  description?: string;
  mealType: "dinner" | "breakfast" | "smoothie";
  baseServings?: number;
  crewSize?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: QualityIngredient[];
  steps: QualityStep[];
  heroImage?: string;
  thumbImage?: string;
  mobileImage?: string;
  nutrition?: { calories: number; protein: number; carbs: number; fat: number; source?: string };
}

/** Blocking severities: any of these keeps a recipe at "Needs Review". */
export const BLOCKING: ReadonlySet<Severity> = new Set(["S1", "S2"]);
/** S3 codes that also block Technically Validated. */
export const BLOCKING_S3_CODES: ReadonlySet<string> = new Set([
  "nutrition_macro_energy_mismatch",
  "nutrition_integrity_disqualifying",
  "stated_time_understates_steps",
  "unparseable_quantity",
]);

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stem = (w: string) =>
  w.replace(/ies$/, "y").replace(/oes$/, "o").replace(/(s|x|ch|sh)es$/, "$1").replace(/s$/, "").slice(0, 6);

const stepText = (r: QualityRecipe) => r.steps.map((s) => `${s.title ?? ""}. ${s.instruction}`).join(" ");

function ingredientHay(r: QualityRecipe): string {
  return norm(r.ingredients.map((i) => `${i.name} ${i.notes ?? ""} ${i.group ?? ""}`).join(" "));
}

// ---------------------------------------------------------------------------
// Quantity parsing
// ---------------------------------------------------------------------------

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875 };

/** Parses "2", "1 1/2", "1½", "2-3" (upper bound), "0.5". Returns null when unparseable. */
export function parseQuantity(q: string | undefined): number | null {
  if (!q) return null;
  let s = q.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, (m) => ` ${UNICODE_FRACTIONS[m]}`);
  s = s.replace(/^(about|approx\.?|approximately|~)\s*/, "");
  const range = s.split(/\s*(?:-|–|to)\s*/);
  const part = range[range.length - 1]!.trim();
  let total = 0;
  let matched = false;
  for (const tok of part.split(/\s+/)) {
    if (/^\d+\/\d+$/.test(tok)) {
      const [a, b] = tok.split("/").map(Number);
      if (!b) return null;
      total += a! / b;
      matched = true;
    } else if (/^\d*\.?\d+$/.test(tok)) {
      total += Number(tok);
      matched = true;
    } else if (tok) {
      return matched ? total : null;
    }
  }
  return matched ? total : null;
}

const KNOWN_UNITS = new Set([
  "cup", "cups", "c", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons", "lb", "lbs", "pound", "pounds",
  "oz", "ounce", "ounces", "fl oz", "g", "kg", "ml", "l", "liter", "liters", "quart", "quarts", "qt", "pint", "pints", "gallon",
  "can", "cans", "jar", "jars", "package", "packages", "pkg", "bunch", "bunches", "head", "heads", "clove", "cloves",
  "slice", "slices", "piece", "pieces", "whole", "large", "medium", "small", "sprig", "sprigs", "stalk", "stalks", "pinch",
  "dash", "bag", "bags", "box", "boxes", "loaf", "loaves", "dozen", "ear", "ears", "fillet", "fillets", "breast", "breasts",
  "thigh", "thighs", "stick", "sticks", "bottle", "bottles", "container", "containers", "block", "blocks", "sheet", "sheets",
  "link", "links", "each", "count", "ct", "leaves", "handful", "rib", "ribs", "tortillas", "buns", "rolls", "eggs", "egg",
  "packet", "packets", "envelope", "tub", "carton", "wedge", "wedges", "strip", "strips", "rack", "racks", "lime", "limes",
  "lemon", "lemons", "scoop", "scoops", "serving", "servings",
]);

/** Any decimal that isn't a clean ¼, ½ or ¾ (e.g. 0.33, 3.2, 1.6). */
const AWKWARD_DECIMAL = /\b\d*\.(?!(?:5|25|75)\b)\d+\b/;
const COUNT_UNIT = /^(each|count|ct|whole|can|cans|jar|jars|package|packages|pkg|bag|bags|box|boxes|loaf|loaves|head|heads|bunch|bunches|link|links|slice|slices|piece|pieces|egg|eggs|breast|breasts|thigh|thighs|fillet|fillets|ear|ears|stick|sticks|bottle|bottles|clove|cloves|large|medium|small|tortillas|buns|rolls)$/;

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

export function checkRequiredFields(r: QualityRecipe): GateFinding[] {
  const out: GateFinding[] = [];
  const req = (cond: boolean, code: string, message: string, severity: Severity = "S2") => {
    if (!cond) out.push({ code, severity, category: "required_fields", message, fix: "Add the missing field." });
  };
  req(r.title.trim().length >= 3, "missing_title", "Title is missing or too short.");
  req((r.description ?? "").trim().length >= 40, "missing_description", "Description is missing or under 40 characters.", "S4");
  req(!!r.baseServings && r.baseServings >= 1, "missing_servings", "Base servings not set.", r.mealType === "smoothie" ? "S3" : "S2");
  if (r.mealType !== "smoothie") {
    req(r.prepTime != null, "missing_prep_time", "Prep time not set.", "S3");
    req(r.cookTime != null && r.cookTime > 0, "missing_cook_time", "Cook time not set.", "S3");
  }
  req(r.ingredients.length >= (r.mealType === "smoothie" ? 3 : 4), "too_few_ingredients", `Only ${r.ingredients.length} ingredients.`);
  req(r.steps.length >= (r.mealType === "smoothie" ? 2 : 3), "too_few_steps", `Only ${r.steps.length} steps.`);
  req(!!r.heroImage, "missing_hero_image", "No hero image set.");
  return out;
}

const PANTRY = /^(salt|kosher salt|sea salt|black pepper|pepper|salt and pepper|water|olive oil|vegetable oil|canola oil|oil|cooking spray|nonstick spray|ice|ice cubes)$/;
const FORM_WORDS = new Set([
  "cloves", "clove", "stalks", "stalk", "fillets", "fillet", "florets", "floret", "kernels", "kernel", "balls", "ball",
  "leaves", "leaf", "bone", "skin", "sprigs", "sprig", "heads", "head", "bunch", "can", "cans", "uncooked", "cooked",
  "scrubbed", "peeled", "crumbled", "softened", "melted", "cold", "warm", "whole", "lean", "extra", "virgin", "low",
  "sodium", "reduced", "fat", "plain", "unsalted", "salted", "frozen", "canned", "drained", "rinsed", "fresh", "chopped",
  "diced", "minced", "sliced", "large", "small", "medium", "boneless", "skinless", "ground", "shredded", "grated", "dried",
  "optional", "taste", "store", "bought", "jarred", "prepared", "thinly", "finely", "roughly", "into", "inch", "pieces",
]);

function ingredientMentioned(name: string, steps: string): boolean {
  const words = norm(name).split(" ").filter((w) => w.length > 2 && !FORM_WORDS.has(w));
  if (!words.length) return true;
  const stepStems = new Set(norm(steps).replace(/\bmayo\b/g, "mayonnaise").split(" ").map(stem));
  return words.some((w) => stepStems.has(stem(w)));
}

/** Common ingredients that, when named in the steps, should also be in the ingredient list. */
const STEP_INGREDIENT_WATCHLIST: Array<[string, RegExp]> = [
  ["garlic", /\bgarlic\b(?! press)/],
  ["onion", /\bonions?\b/],
  ["butter", /\bbutter\b(?!milk|nut|cup)/],
  ["eggs", /\beggs?\b(?! wash)/],
  ["flour", /\bflour\b(?! tortilla)/],
  ["sugar", /\b(?:brown |white )?sugar\b/],
  ["honey", /\bhoney\b/],
  ["lemon", /\blemons?\b/],
  ["lime", /\blimes?\b/],
  ["cilantro", /\bcilantro\b/],
  ["parsley", /\bparsley\b/],
  ["basil", /\bbasil\b/],
  ["soy sauce", /\bsoy sauce\b/],
  ["vinegar", /\bvinegar\b/],
  ["heavy cream", /\b(?:heavy |whipping )cream\b/],
  ["sour cream", /\bsour cream\b/],
  ["milk", /\bmilk\b(?!shake)/],
  ["parmesan", /\bparmesan\b/],
  ["mozzarella", /\bmozzarella\b/],
  ["cheddar", /\bcheddar\b/],
  ["broth or stock", /\b(?:broth|stock)\b/],
  ["tomato paste", /\btomato paste\b/],
  ["cornstarch", /\bcornstarch\b/],
  ["ginger", /\bginger\b/],
  ["cumin", /\bcumin\b/],
  ["paprika", /\bpaprika\b/],
  ["chili powder", /\bchili powder\b/],
  ["oregano", /\boregano\b/],
  ["mayonnaise", /\b(?:mayo|mayonnaise)\b/],
  ["mustard", /\bmustard\b/],
  ["breadcrumbs", /\b(?:bread ?crumbs|panko)\b/],
  ["rice", /\brice\b(?! vinegar| wine| paper| noodle)/],
  ["tortillas", /\btortillas?\b/],
  ["buns or rolls", /\b(?:buns?|hoagie rolls?|sub rolls?)\b/],
];
const STEP_INGREDIENT_ALIASES: Record<string, RegExp> = {
  "broth or stock": /\b(?:broth|stock|bouillon|base)\b/,
  sugar: /\bsugar\b|\bhoney\b|\bsyrup\b/,
  eggs: /\beggs?\b|\begg whites?\b|\bmayo|mayonnaise/,
  "buns or rolls": /\b(?:buns?|rolls?|bread|hoagie|brioche)\b/,
  onion: /\bonions?\b|\bshallots?\b|\bscallions?\b|\bgreen onions?\b|\bsalsa\b|\bpico\b/,
  garlic: /\bgarlic\b|\bpesto\b|\bseasoning\b|\bchimichurri\b|\baioli\b/,
  milk: /\bmilk\b|\bcream\b|\bbuttermilk\b|\bhalf and half\b/,
  butter: /\bbutter\b|\bghee\b/,
  rice: /\brice\b/,
  tortillas: /\btortillas?\b|\bwraps?\b|\bshells?\b|\bchips?\b/,
  lemon: /\blemons?\b|\bdressing\b|\bvinaigrette\b/,
  lime: /\blimes?\b|\bsalsa\b|\bcrema\b/,
  vinegar: /\bvinegar\b|\bdressing\b|\bvinaigrette\b|\bpickled?\b|\bslaw\b/,
  mustard: /\bmustard\b|\bdressing\b|\bvinaigrette\b|\bsauce\b/,
  cumin: /\bcumin\b|\bseasoning\b|\btaco\b|\bspice\b|\brub\b/,
  paprika: /\bpaprika\b|\bseasoning\b|\bspice\b|\brub\b/,
  "chili powder": /\bchili powder\b|\bseasoning\b|\btaco\b|\bspice\b|\brub\b/,
  oregano: /\boregano\b|\bseasoning\b|\bitalian\b|\bspice\b/,
  ginger: /\bginger\b|\bsauce\b|\bteriyaki\b/,
  honey: /\bhoney\b|\bsauce\b|\bglaze\b/,
  "soy sauce": /\bsoy\b|\btamari\b|\bteriyaki\b|\bsauce\b/,
  parmesan: /\bparmesan\b|\bparm\b|\bpecorino\b|\bcheese\b|\bpesto\b|\bcaesar\b/,
  mozzarella: /\bmozzarella\b|\bcheese\b/,
  cheddar: /\bcheddar\b|\bcheese\b/,
};

export function checkIngredientInstructionConsistency(r: QualityRecipe): GateFinding[] {
  const out: GateFinding[] = [];
  const steps = stepText(r);
  const stepsNorm = norm(steps);
  const unused = r.ingredients.filter((i) => {
    const key = norm(i.name);
    if (PANTRY.test(key) || i.optional) return false;
    if (/garnish|for serving|to serve|topping/i.test(`${i.notes ?? ""} ${i.group ?? ""}`)) {
      return !/\b(serv|garnish|top|sprinkle)/.test(stepsNorm) && !ingredientMentioned(i.name, steps);
    }
    if (i.group && stepsNorm.includes(norm(i.group))) return false;
    return !ingredientMentioned(i.name, steps);
  });
  if (unused.length) {
    out.push({
      code: "ingredient_not_in_steps",
      severity: "S2",
      category: "ingredient_instruction",
      message: `${unused.length} listed ingredient(s) never used in the steps.`,
      evidence: unused.map((i) => i.name).join("; "),
      fix: "Add each ingredient to the step where it goes in, or remove it from the list.",
      heuristic: true,
    });
  }
  const hay = ingredientHay(r);
  const missing: string[] = [];
  const stepLower = steps.toLowerCase();
  for (const [label, re] of STEP_INGREDIENT_WATCHLIST) {
    if (!re.test(stepLower)) continue;
    const alias = STEP_INGREDIENT_ALIASES[label] ?? re;
    if (!alias.test(hay)) missing.push(label);
  }
  if (missing.length) {
    out.push({
      code: "step_ingredient_not_listed",
      severity: "S2",
      category: "ingredient_instruction",
      message: `Steps use ${missing.length} ingredient(s) that aren't in the ingredient list.`,
      evidence: missing.join("; "),
      fix: "Add the ingredient with a quantity, or correct the step.",
      heuristic: true,
    });
  }
  const dupes = new Map<string, number>();
  for (const i of r.ingredients) {
    const k = norm(i.name).split(" ").filter((w) => !FORM_WORDS.has(w)).join(" ");
    if (k && !PANTRY.test(k)) dupes.set(k, (dupes.get(k) ?? 0) + 1);
  }
  const dupeNames = [...dupes].filter(([, c]) => c > 1).map(([k]) => k);
  if (dupeNames.length) {
    out.push({
      code: "duplicate_ingredient_lines",
      severity: "S4",
      category: "ingredient_instruction",
      message: "Same ingredient listed more than once.",
      evidence: dupeNames.join("; "),
      fix: "Combine into one line, or label each use (for example, 'for the sauce').",
      heuristic: true,
    });
  }
  return out;
}

export function checkQuantities(r: QualityRecipe): GateFinding[] {
  const out: GateFinding[] = [];
  const missingQty: string[] = [];
  const unparseable: string[] = [];
  const awkward: string[] = [];
  const unknownUnit: string[] = [];
  const fractionalCount: string[] = [];
  for (const i of r.ingredients) {
    const q = i.quantity?.trim();
    const label = `${q ?? ""} ${i.unit ?? ""} ${i.name}`.replace(/\s+/g, " ").trim();
    if (!q) {
      if (!i.optional && !/to taste|pinch|for serving|garnish|as needed|spray/i.test(`${i.name} ${i.notes ?? ""} ${i.unit ?? ""}`) && !PANTRY.test(norm(i.name))) missingQty.push(label);
      continue;
    }
    if (/to taste|as needed|optional|pinch|handful|splash|dash/i.test(q)) continue;
    const value = parseQuantity(q);
    if (value == null) unparseable.push(label);
    const unit = i.unit?.trim().toLowerCase().replace(/\.$/, "");
    if (value != null && unit && COUNT_UNIT.test(unit) && q.includes(".") && Math.abs(value * 2 - Math.round(value * 2)) > 0.01) fractionalCount.push(label);
    else if (AWKWARD_DECIMAL.test(q)) awkward.push(label);
    if (unit && !KNOWN_UNITS.has(unit)) unknownUnit.push(label);
  }
  if (missingQty.length) out.push({ code: "missing_quantity", severity: "S2", category: "quantity_unit", message: `${missingQty.length} ingredient(s) have no quantity.`, evidence: missingQty.join("; "), fix: "Give every non-optional ingredient a quantity." });
  if (unparseable.length) out.push({ code: "unparseable_quantity", severity: "S3", category: "quantity_unit", message: `${unparseable.length} quantity value(s) can't be scaled.`, evidence: unparseable.join("; "), fix: "Use a number, fraction or range (for example '1 1/2' or '2-3')." });
  if (fractionalCount.length) out.push({ code: "fractional_count", severity: "S2", category: "quantity_unit", message: `${fractionalCount.length} whole-item ingredient(s) have impossible fractional counts — a scaling leftover.`, evidence: fractionalCount.join("; "), fix: "Round to a purchasable whole number and re-check the batch (3.2 chickens → 3)." });
  if (awkward.length) out.push({ code: "awkward_decimal_quantity", severity: "S4", category: "quantity_unit", message: `${awkward.length} quantity value(s) are raw decimals.`, evidence: awkward.join("; "), fix: "Rewrite as a kitchen fraction without changing the amount (0.33 cup → 1/3 cup)." });
  if (unknownUnit.length) out.push({ code: "nonstandard_unit", severity: "S5", category: "quantity_unit", message: `${unknownUnit.length} unit(s) are outside the standard list.`, evidence: unknownUnit.join("; "), fix: "Use a standard US unit (cup, tbsp, tsp, lb, oz, can, clove, whole).", heuristic: true });
  return out;
}

const MAIN_PROTEIN = /\b(chicken|turkey|beef|steak|chuck|brisket|pork|sausage|chorizo|bacon|ham|lamb|shrimp|salmon|tilapia|cod|fish|tuna|meatballs?|ribs?|tenderloin|loin|sirloin|flank|carnitas|thighs?|breasts?|drumsticks?|wings?)\b/;
const NOT_PROTEIN = /\b(broth|stock|bouillon|base|seasoning|sauce|gravy|fat|drippings|powder|fries|buns?|chips)\b/;
/** Flavoring meats and bone-heavy cuts distort a per-serving protein estimate. */
const ACCENT_OR_BONE = /\b(bacon|chorizo|pancetta|prosciutto|pepperoni|salami|anchov\w*|bones?|backs?|necks?|hocks?|shanks?|wings?|ribs?|legs?|drumsticks?|whole chicken|feet)\b/;

function weightOz(qty: number, unit: string | undefined, name: string): number | null {
  const u = (unit ?? "").toLowerCase();
  const n = name.toLowerCase();
  if (/^(lb|lbs|pound|pounds)$/.test(u) || /\b(lb|lbs|pounds?)\b/.test(n.slice(0, 10))) return qty * 16;
  if (/^(oz|ounce|ounces)$/.test(u)) return qty;
  if (u === "kg") return qty * 35.274;
  if (u === "g") return qty / 28.35;
  return null;
}

export function checkServingScaling(r: QualityRecipe): GateFinding[] {
  const out: GateFinding[] = [];
  const servings = r.baseServings ?? r.crewSize;
  if (!servings) return out;
  if (r.baseServings && r.crewSize && r.baseServings !== r.crewSize) {
    out.push({ code: "crew_size_ne_base_servings", severity: "S3", category: "serving_scaling", message: `Crew size (${r.crewSize}) differs from base servings (${r.baseServings}).`, fix: "Make the scaling base and displayed crew size the same number." });
  }
  if (servings < 2 || servings > 16) {
    out.push({ code: "servings_out_of_range", severity: "S3", category: "serving_scaling", message: `Base servings ${servings} is outside the supported 2–16 range.` });
  }
  const perHead: string[] = [];
  for (const i of r.ingredients) {
    if (i.optional || !/\b(buns?|rolls?|tortillas?|pitas?|bagels?|potatoes|hoagies?|english muffins?|biscuits?)\b/i.test(i.name) || /\b(tater|fries|chips|crumbs)\b/i.test(i.name)) continue;
    const q = parseQuantity(i.quantity);
    const u = (i.unit ?? "").toLowerCase();
    const limit = /tortillas?|taco shells?/i.test(i.name) ? 4 : 2.5;
    if (q != null && (!u || COUNT_UNIT.test(u) || /\b(bagels?|buns?|rolls?|tortillas?|pitas?|potatoes|biscuits?|muffins?)\b/.test(u)) && q / servings > limit) perHead.push(`${i.quantity} ${i.unit ?? ""} ${i.name} (${(q / servings).toFixed(1)} per person)`.replace(/\s+/g, " "));
  }
  if (perHead.length) {
    out.push({ code: "count_per_person_high", severity: "S2", category: "serving_scaling", message: `More than 2½ rolls or potatoes (or 4 tortillas) per person for ${servings} servings.`, evidence: perHead.join("; "), fix: "Check whether the quantity was written for a larger crew; correct it or the serving count.", heuristic: true });
  }
  if (r.mealType !== "dinner") return out;
  let oz = 0;
  let skippedBone = false;
  const counted: string[] = [];
  for (const i of r.ingredients) {
    const lower = i.name.toLowerCase();
    if (i.optional || !MAIN_PROTEIN.test(lower) || NOT_PROTEIN.test(lower)) continue;
    if (ACCENT_OR_BONE.test(lower)) {
      skippedBone = true;
      continue;
    }
    const q = parseQuantity(i.quantity);
    if (q == null) continue;
    const w = weightOz(q, i.unit, i.name);
    if (w == null) continue;
    oz += w;
    counted.push(`${i.quantity} ${i.unit ?? ""} ${i.name}`.replace(/\s+/g, " "));
  }
  if (!counted.length) return out;
  const perServing = oz / servings;
  if (perServing < 3 && !skippedBone) {
    out.push({ code: "protein_portion_low", severity: "S2", category: "serving_scaling", message: `Main protein works out to ${perServing.toFixed(1)} oz raw per serving for ${servings} servings — light for a firehall main.`, evidence: counted.join("; "), fix: "Check the protein amount or the serving count (typical: 5–8 oz raw per adult).", heuristic: true });
  } else if (perServing > 13) {
    out.push({ code: "protein_portion_high", severity: "S2", category: "serving_scaling", message: `Main protein works out to ${perServing.toFixed(1)} oz raw per serving for ${servings} servings.`, evidence: counted.join("; "), fix: "Check whether the quantity is for a larger batch than the stated servings.", heuristic: true });
  }
  return out;
}

export interface NutritionContext {
  /** Codes from shared/nutrition/integrity-audit.ts for this recipe. */
  integrityFindingCodes?: string[];
  integrityStatus?: "pass" | "fail" | "withheld";
  numericFilterEligible?: boolean;
  /** True when the app labels this recipe High Protein anywhere a user can filter by it. */
  labeledHighProtein?: boolean;
}

const DISQUALIFYING = new Set([
  "ui_zero_macros", "crew_size_coupled", "likely_batch_total_stored", "incomplete_macros", "impossible",
  "ingredient_protein_drift", "ingredient_calorie_drift", "macro_calorie_divergence", "protein_too_low_meat", "carbs_too_low_starch",
]);

export function checkNutrition(r: QualityRecipe, ctx: NutritionContext = {}): GateFinding[] {
  const out: GateFinding[] = [];
  const n = r.nutrition;
  if (!n || !n.calories) {
    out.push({ code: "nutrition_missing", severity: "S3", category: "nutrition", message: "No structured per-serving nutrition.", fix: "Calculate from ingredients; never type in a guess." });
  } else {
    const energy = 4 * n.protein + 4 * n.carbs + 9 * n.fat;
    const diff = Math.abs(energy - n.calories) / n.calories;
    if (diff > 0.15) {
      out.push({ code: "nutrition_macro_energy_mismatch", severity: "S3", category: "nutrition", message: `Calories (${n.calories}) don't match the macros (4P+4C+9F = ${Math.round(energy)}, ${Math.round(diff * 100)}% off).`, fix: "Recalculate from ingredients." });
    }
    if (n.source === "estimated" || n.source === "unavailable" || !n.source) {
      out.push({ code: "nutrition_not_calculated", severity: "S3", category: "nutrition", message: `Nutrition source is "${n.source ?? "unspecified"}", not calculated from the ingredient list.`, fix: "Calculate from ingredients, and label it 'Calculated from ingredients' rather than 'Estimated'." });
    }
  }
  const disq = (ctx.integrityFindingCodes ?? []).filter((c) => DISQUALIFYING.has(c));
  if (disq.length) {
    out.push({ code: "nutrition_integrity_disqualifying", severity: "S3", category: "nutrition", message: "The nutrition integrity audit found a calculation problem.", evidence: disq.join(", "), fix: "Recalculate per serving from the ingredient list and base servings." });
  }
  if (ctx.labeledHighProtein && !ctx.numericFilterEligible) {
    out.push({ code: "high_protein_claim_unverified", severity: "S1", category: "nutrition", message: "Shown as High Protein, but its nutrition isn't verified enough for nutrition filters.", evidence: n ? `stored protein ${n.protein} g/serving` : "no structured nutrition", fix: "Only label High Protein from verified per-serving protein (≥35 g); drop the label until then." });
  } else if (ctx.labeledHighProtein && n && n.protein < 35) {
    out.push({ code: "high_protein_claim_below_threshold", severity: "S1", category: "nutrition", message: `Shown as High Protein with only ${n.protein} g protein per serving (threshold 35 g).`, fix: "Remove the High Protein label or change the recipe." });
  }
  return out;
}

const POULTRY = /\b(chicken|turkey|duck|cornish)\b/;
const PRECOOKED = /\b(rotisserie|cooked|leftover|deli|canned|pre-?cooked|smoked turkey|lunch ?meat|kielbasa|andouille|smoked sausage|hot dogs?|frankfurters?|pulled|shredded chicken)\b/;
const GROUND = /\b(ground (beef|pork|chuck|sirloin|lamb|turkey|chicken)|sausage|chorizo|burgers?|patties|meatballs?|meatloaf)\b/;
const WHOLE_PORK_FISH = /\b(pork (chops?|loin|tenderloin|shoulder|butt)|tenderloin|salmon|tilapia|cod|halibut|fish|shrimp)\b/;
/** Bones simmered for stock and strained out, and bacon cooked crisp — no internal-temperature check applies. */
const STOCK_BONES = /\b(backs?|bones?|carcass(es)?|feet|necks?|bacon)\b/;
const READY_TO_EAT_FISH = /\b(smoked salmon|lox|gravlax|canned (tuna|salmon)|fish sauce)\b/;

/** Doneness temperatures (°F) stated in the steps — excludes oven, oil, grill and holding temperatures. */
export function internalTemps(text: string): number[] {
  const temps: number[] = [];
  const re = /(\d{3})\s*°\s*F?\b|(\d{3})\s*(?:degrees|deg)\s*F?\b|(\d{3})F\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const t = Number(m[1] ?? m[2] ?? m[3]);
    if (t < 120 || t > 212) continue;
    const before = text.slice(Math.max(0, m.index - 18), m.index).toLowerCase();
    const after = text.slice(m.index, m.index + 14).toLowerCase();
    if (/\b(oven|preheat|bake at|roast at|broil|oil to|fryer|smoker|water bath|sous vide|hold|keep warm|warm in|heat to|set to)\b/.test(before)) continue;
    if (/\b(oven|oil|grill|smoker|water)\b/.test(after)) continue;
    temps.push(t);
  }
  return temps;
}

const LONG_WET_COOK = /\b(simmer|braise|stew|poach|boil)\w*\b[^.]{0,80}\b([2-9]\d|1\d\d)\s*(?:-|–|to)?\s*\d*\s*(minutes?|mins?)\b|\b(simmer|braise|slow cook|slow cooker|crock|pressure cook)\w*\b[^.]{0,80}\b\d+\s*(?:-|–|to)?\s*\d*\s*(hours?|hrs?)\b/i;
const LONG_BAKE = /\b(bake|roast)\w*\b[^.]{0,80}\b([3-9]\d|1\d\d)\s*(?:-|–|to)?\s*\d*\s*(minutes?|mins?)\b|\b(bake|roast)\w*\b[^.]{0,80}\b\d+\s*(hours?|hrs?)\b/i;

export function checkFoodSafety(r: QualityRecipe, opts: { vegetarianClaim?: string } = {}): GateFinding[] {
  const out: GateFinding[] = [];
  const steps = stepText(r);
  const names = r.ingredients.filter((i) => !/\b(broth|stock|bouillon|base)\b/i.test(i.name)).map((i) => i.name.toLowerCase());
  const nameHay = names.join(" | ");
  const temps = internalTemps(steps);
  const max = temps.length ? Math.max(...temps) : 0;

  const longCook = LONG_WET_COOK.test(steps) || LONG_BAKE.test(steps);
  const rawPoultry = names.some((n) => POULTRY.test(n) && !PRECOOKED.test(n) && !STOCK_BONES.test(n));
  const cookedPoultry = names.some((n) => POULTRY.test(n) && PRECOOKED.test(n) && !/\bdeli\b/.test(n));
  if (rawPoultry) {
    if (!temps.length) {
      out.push(
        longCook
          ? { code: "poultry_long_cook_no_temp", severity: "S2", category: "food_safety", message: "Raw poultry is simmered or baked a long time, but no 165°F check is given.", fix: "Add 'until the chicken reads 165°F (74°C) in the thickest piece'." }
          : { code: "poultry_no_internal_temp", severity: "S1", category: "food_safety", message: "Raw poultry cooked quickly (sauté, grill, bake) with no safe internal temperature in the steps.", fix: "Add 'cook until an instant-read thermometer in the thickest piece reads 165°F (74°C)'." },
      );
    } else if (max < 165) {
      out.push({ code: "poultry_temp_below_165", severity: "S1", category: "food_safety", message: `Raw poultry's stated internal temperature tops out at ${max}°F, below the USDA 165°F.`, evidence: temps.join(", "), fix: "Change the doneness temperature to 165°F (74°C)." });
    }
  } else if (cookedPoultry && !temps.some((t) => t >= 165) && !/\b(hot throughout|steaming|heated through|until hot)\b/i.test(steps)) {
    out.push({ code: "precooked_poultry_reheat_unclear", severity: "S3", category: "food_safety", message: "Precooked poultry is reheated without a temperature or 'steaming hot throughout' cue.", fix: "Add 'reheat until steaming hot, 165°F (74°C)'." });
  }

  const ground = names.some((n) => GROUND.test(n) && !PRECOOKED.test(n) && !/\b(buns?|sauce|seasoning|toppings?|spice)\b/.test(n));
  if (ground && !rawPoultry) {
    const groundPoultry = /ground (turkey|chicken)|turkey sausage|chicken sausage/.test(nameHay);
    const need = groundPoultry ? 165 : 160;
    if (!temps.some((t) => t >= need) && !/\bno (longer )?pink\b|\bno pink remains\b/i.test(steps)) {
      out.push(
        longCook
          ? { code: "ground_meat_long_cook_no_temp", severity: "S2", category: "food_safety", message: `Ground meat is later simmered or baked, but no ${need}°F or 'no pink' check is given when it's browned.`, fix: `Add 'brown until no pink remains (${need}°F / ${need === 165 ? 74 : 71}°C)'.` }
          : { code: "ground_meat_no_safe_temp", severity: "S1", category: "food_safety", message: `Ground meat or sausage with no ${need}°F doneness temperature or 'no pink' cue.`, fix: `Add 'cook until no pink remains and it reads ${need}°F (${need === 165 ? 74 : 71}°C)'.` },
      );
    } else if (!temps.some((t) => t >= need)) {
      out.push({ code: "ground_meat_visual_only", severity: "S3", category: "food_safety", message: `Ground meat relies on color only; no ${need}°F temperature.`, fix: `Add the ${need}°F temperature alongside the visual cue.` });
    }
  }
  if (/\bburgers?\b[^.]{0,50}\b(rare|medium[- ]rare|pink (in the )?(middle|center))\b/i.test(steps)) {
    out.push({ code: "undercooked_burger", severity: "S1", category: "food_safety", message: "Steps suggest serving ground-beef burgers rare or pink.", fix: "Cook burgers to 160°F (71°C)." });
  }

  const wholePorkFish = names.some((n) => WHOLE_PORK_FISH.test(n) && !PRECOOKED.test(n) && !READY_TO_EAT_FISH.test(n));
  if (wholePorkFish && !temps.length && !/\b(flakes?|opaque|pink and (firm|curled)|probe[- ]tender|fork[- ]tender|falls apart|shreds)\b/i.test(steps)) {
    out.push({ code: "pork_fish_no_doneness", severity: "S2", category: "food_safety", message: "Pork, fish or shrimp with no internal temperature or reliable visual doneness cue.", fix: "Add 145°F (63°C) for pork and fish, or 'opaque and flakes easily' for fish, 'pink and curled' for shrimp." });
  }

  if (/\bthaw\w*\b[^.]{0,40}\b(counter|room temperature)\b/i.test(steps)) {
    out.push({ code: "thaw_at_room_temp", severity: "S1", category: "food_safety", message: "Steps tell you to thaw meat at room temperature.", fix: "Thaw in the fridge or in cold water changed every 30 minutes." });
  }
  if (/\bmarinat\w*\b[^.]{0,60}\broom temperature\b[^.]{0,40}\b(hours?|overnight)\b/i.test(steps)) {
    out.push({ code: "marinate_at_room_temp", severity: "S1", category: "food_safety", message: "Marinating at room temperature for hours.", fix: "Marinate in the fridge." });
  }
  const rawEggServed = steps.split(/(?<=[.!?])\s+/).some((s) => /\b(raw egg|raw yolks?|coddled)\b/i.test(s) && !/\b(scrambl\w*|curds?|wok|pan|skillet|griddle|fry|cook\w*|sets?)\b/i.test(s));
  if (rawEggServed || (/\begg yolks?\b/i.test(nameHay) && /\b(dressing|aioli|mayonnaise|mayo)\b/i.test(steps) && !/\b(cook|whisk over|double boiler|temper)\b/i.test(steps))) {
    out.push({ code: "raw_egg_unflagged", severity: "S3", category: "food_safety", message: "Uses raw egg yolk without a pasteurized-egg note.", fix: "Specify pasteurized eggs or a store-bought dressing.", heuristic: true });
  }
  if (/\bkeep (it |them )?warm\b[^.]{0,60}\b(1[0-3]\d)\s*°?\s*F\b/i.test(steps)) {
    out.push({ code: "hot_hold_below_140", severity: "S2", category: "food_safety", message: "Hot-holding temperature below 140°F.", fix: "Hold hot food at 140°F (60°C) or above, or in a 200°F oven." });
  }
  if (/\boven\b/i.test(steps.replace(/\b(dutch|microwave|toaster) ovens?\b/gi, "")) && !/\b\d{3}\s*°?\s*F\b|\d{3}°|\bbroil/i.test(steps)) {
    out.push({ code: "oven_without_temperature", severity: "S2", category: "food_safety", message: "Uses the oven without giving a temperature.", fix: "State the oven temperature in °F and °C." });
  }
  const safeDoneness = /\b14[5-9]\s?°F|\b1[5-9]\d\s?°F/;
  const lowDoneness = r.steps.filter((s, i) => {
    if (!/\b(1[1-3]\d|14[1-4])\s?°F|medium[- ]rare/i.test(s.instruction) || safeDoneness.test(s.instruction)) return false;
    const smokeStage = /\bsmok/i.test(s.instruction) && r.steps.slice(i + 1).some((n) => /\bsear/i.test(n.instruction) && safeDoneness.test(n.instruction));
    return !smokeStage;
  });
  if (lowDoneness.length) {
    out.push({ code: "doneness_below_usda_default", severity: "S2", category: "food_safety", message: "A doneness target is below the USDA minimum and the step gives no safe default.", evidence: lowDoneness.map((s) => s.instruction.slice(0, 120)).join(" | "), fix: "Make 145°F (whole cuts, fish) the default and label lower temperatures as a preference with a safety note." });
  }
  if (r.steps.some((s) => /\b(until done|until cooked|cook through|until ready)\b/i.test(s.instruction) && !/\d{3}\s*°?\s*F/i.test(s.instruction))) {
    out.push({ code: "vague_doneness", severity: "S3", category: "food_safety", message: "Vague doneness wording ('until done', 'cook through') without a temperature or visual cue.", fix: "Replace with a temperature or a concrete visual/texture cue." });
  }
  if (opts.vegetarianClaim) {
    const animal = r.ingredients.filter((i) => /\b(chicken|beef|pork|turkey|sausage|chorizo|bacon|ham|steak|lamb|pepperoni|prosciutto|shrimp|salmon|tuna|fish|anchov)/i.test(i.name) && !/\b(vegetable|veggie|vegetarian|vegan|plant|meatless|beyond|impossible|anchovy-free|fish-free)\b/i.test(i.name) && !i.optional);
    const meat = animal.filter((i) => !/\b(broth|stock|bouillon|base)\b/i.test(i.name));
    const brothOnly = animal.filter((i) => /\b(broth|stock|bouillon|base)\b/i.test(i.name));
    if (meat.length) {
      out.push({
        code: opts.vegetarianClaim === "title" ? "vegetarian_title_contains_meat" : "vegetarian_tag_contains_meat",
        severity: "S1",
        category: "food_safety",
        message: `Labeled vegetarian (${opts.vegetarianClaim}), but the ingredients include meat or fish.`,
        evidence: meat.map((i) => i.name).join("; "),
        fix: opts.vegetarianClaim === "title" ? "Rewrite as a real vegetarian recipe, or retire it." : "Remove the vegetarian tag so vegetarian filters stop showing it.",
      });
    } else if (brothOnly.length) {
      out.push({ code: "vegetarian_claim_meat_broth", severity: "S1", category: "food_safety", message: `Labeled vegetarian (${opts.vegetarianClaim}), but uses meat-based broth.`, evidence: brothOnly.map((i) => i.name).join("; "), fix: "Switch to vegetable broth, or remove the vegetarian label." });
    }
  }
  return out;
}

export interface ImageFacts {
  heroExists: boolean;
  thumbExists?: boolean;
  mobileExists?: boolean;
  width?: number;
  height?: number;
  sharedWith?: string[];
  mappingStatus?: string;
}

export function checkImages(facts: ImageFacts): GateFinding[] {
  const out: GateFinding[] = [];
  if (!facts.heroExists) out.push({ code: "hero_file_missing", severity: "S2", category: "image", message: "Hero image file is missing.", fix: "Add a real photo of the finished dish." });
  if (facts.thumbExists === false) out.push({ code: "thumb_file_missing", severity: "S4", category: "image", message: "Thumbnail file is missing.", fix: "Generate the thumbnail from the hero." });
  if (facts.mobileExists === false) out.push({ code: "mobile_file_missing", severity: "S4", category: "image", message: "Mobile image file is missing.", fix: "Generate the mobile crop from the hero." });
  if (facts.width && facts.width < 1000) out.push({ code: "hero_low_resolution", severity: "S4", category: "image", message: `Hero is only ${facts.width}px wide.`, fix: "Replace with an image at least 1200px wide." });
  if (facts.sharedWith?.length) out.push({ code: "hero_shared", severity: "S4", category: "image", message: "Same hero image used by another recipe.", evidence: facts.sharedWith.join(", "), fix: "Give each recipe its own photo." });
  if (facts.mappingStatus && facts.mappingStatus !== "correct") out.push({ code: `image_${facts.mappingStatus}`, severity: "S3", category: "image", message: `Image mapping status is "${facts.mappingStatus}".` });
  return out;
}

function minutesMentioned(text: string): number {
  let total = 0;
  const re = /(\d+)(?:\s*(?:-|–|to)\s*(\d+))?\s*(minutes?|mins?|hours?|hrs?)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const n = Number(m[2] ?? m[1]);
    total += /^h/i.test(m[3]!) ? n * 60 : n;
  }
  return total;
}

export function checkPresentation(r: QualityRecipe, opts: { titleScore?: number } = {}): GateFinding[] {
  const out: GateFinding[] = [];
  if (opts.titleScore != null && opts.titleScore < 50) {
    out.push({ code: "weak_title", severity: "S5", category: "presentation", message: `Title quality score ${opts.titleScore}/100.`, fix: "Name the dish plainly and appetizingly (main protein + style)." });
  }
  const desc = (r.description ?? "").trim();
  if (desc.length > 450) out.push({ code: "long_description", severity: "S5", category: "presentation", message: `Description is ${desc.length} characters; aim for under 300.`, fix: "Cut to two sentences: what it is, why crews like it." });
  const longSteps = r.steps.filter((s) => s.instruction.split(/\s+/).length > 90);
  if (longSteps.length) out.push({ code: "long_steps", severity: "S5", category: "presentation", message: `${longSteps.length} step(s) over 90 words — hard to follow on a phone mid-cook.`, fix: "Split into shorter steps with one action each." });
  if (r.steps.length > 14) out.push({ code: "too_many_steps", severity: "S5", category: "presentation", message: `${r.steps.length} steps.`, fix: "Merge prep steps or move tips out of the method." });
  if (r.mealType !== "smoothie" && r.cookTime != null) {
    const stated = (r.prepTime ?? 0) + r.cookTime;
    const fromFields = r.steps.reduce((a, s) => a + (s.minutes ?? 0), 0);
    const fromText = minutesMentioned(r.steps.map((s) => s.instruction).join(" "));
    const longest = Math.max(fromFields, fromText);
    if (stated > 0 && longest > stated * 1.5 + 15 && !/\b(overnight|marinate|slow cooker|crock|smoker|smoke|brine)\b/i.test(stepText(r))) {
      out.push({ code: "stated_time_understates_steps", severity: "S3", category: "presentation", message: `Prep + cook is ${stated} min, but the steps add up to about ${longest} min.`, fix: "Re-time the recipe and correct prep/cook time.", heuristic: true });
    }
  }
  return out;
}

export function isTechnicallyValidated(findings: GateFinding[]): boolean {
  return !findings.some((f) => BLOCKING.has(f.severity) || (f.severity === "S3" && BLOCKING_S3_CODES.has(f.code)));
}

const SEVERITY_PENALTY: Record<Severity, number> = { S1: 35, S2: 15, S3: 7, S4: 3, S5: 1 };

/** 0–100. A rough triage score, not a measure of taste. */
export function qualityScore(findings: GateFinding[]): number {
  const penalty = findings.reduce((a, f) => a + SEVERITY_PENALTY[f.severity], 0);
  return Math.max(0, 100 - penalty);
}
