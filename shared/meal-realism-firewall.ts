/**
 * Meal realism firewall — aggressive quality gate for non-curated AI outputs.
 * Prefer boring-but-real over creative-but-fake.
 */

import type { GenerateResponse } from "./schema.js";
import { isRoboticTitle } from "./generation-reliability.js";

export type RealismRejectionCode =
  | "fake_naming"
  | "realism"
  | "side_mismatch"
  | "cuisine_incoherence"
  | "unrecognizable_dish"
  | "ingredient_mashup"
  | "nutrition_slop";

export interface MealRealismFirewallResult {
  pass: boolean;
  hardReject: boolean;
  score: number;
  realismScore: number;
  cuisineCohesionScore: number;
  sideCompatibilityScore: number;
  recognizableDishScore: number;
  rejections: RealismRejectionCode[];
  /** e.g. [rejected: realism] for logs */
  logTags: string[];
  messages: string[];
}

const PASS_THRESHOLD = 62;
const HARD_REJECT_SCORE_CAP = 35;

/** Sources that skip the firewall (trusted curated / imported real recipes). */
export const TRUSTED_GENERATION_SOURCES = new Set([
  "golden_100",
  "curated_editorial",
  "curated_fallback",
  "catalog",
  "catalog_relaxed",
  "session_cache",
  "spoonacular_v2",
  "spoonacular_v2_relaxed",
  "emergency_pool",
]);

/** Non-curated AI / synthetic paths that MUST pass the firewall. */
export const FIREWALL_REQUIRED_SOURCES = new Set([
  "ai_variation",
  "ai_live",
  "pantry",
  "pantry_template",
  "template_fallback",
]);

export function isTrustedGenerationSource(source: string | undefined): boolean {
  if (!source) return false;
  return TRUSTED_GENERATION_SOURCES.has(source);
}

export function requiresRealismFirewall(source: string | undefined, extras?: Record<string, unknown>): boolean {
  if (!source) return true;
  if (isTrustedGenerationSource(source)) return false;
  if (FIREWALL_REQUIRED_SOURCES.has(source)) return true;
  if (extras?._fallback === true && (source === "curated_fallback" || source === "emergency_pool")) {
    return false;
  }
  return !isTrustedGenerationSource(source);
}

// ── Hard auto-reject patterns ───────────────────────────────────────────────

const HARD_REJECT_TITLE: RegExp[] = [
  /\bfireball\b/i,
  /\b(chickpea|lentil|quinoa|oats)\s+plates?\b/i,
  /\bprotein\s+bowls?\b/i,
  /\b\w+\s+plates?\s*$/i,
  /\b(nutrient|macro|balanced|optimized|fuel)\s+(bowl|plate|stack)\b/i,
  /\bpower\s+protein\b/i,
  /\bwellness\s+bowl\b/i,
  /\bmediterranean\s+power\b/i,
  /\bplant[- ]based\s+power\b/i,
  /\bhigh[- ]fiber\s+(bowl|plate)\b/i,
  /\bheart[- ]healthy\s+(skillet|bowl|plate)\b/i,
  /\b(chickpea|quinoa|oats).*(broccoli|kale).*(rice|bowl)\b/i,
  /\b(buffalo|alfredo).*(taco\s+bowl)\b/i,
  /\b(teriyaki).*(burger).*(mashed)\b/i,
  /\b(cajun).*(chickpea).*(wrap).*(broccoli)\b/i,
];

const GENERIC_PLATE_TITLE = /\b(chicken|beef|pork|turkey|fish|seafood|vegetarian|pantry)\s+plates?\b/i;
const AWKWARD_AI_ADJECTIVES =
  /\b(fireball|zesty fusion|global fusion|chef'?s special medley|protein-packed|nutrient-dense|superfood|detox|clean eating)\b/i;

const NUTRITION_SLOP_INGREDIENT =
  /\b(chickpea|quinoa|oats|nutritional yeast|flax|chia|hemp hearts|spirulina)\b/i;
const FORCED_BROCCOLI =
  /\bbroccoli\b/i;

const CUISINE_MARKERS: Array<{ id: string; re: RegExp }> = [
  { id: "mexican", re: /\b(taco|burrito|birria|carnitas|queso|salsa|elote|chipotle|adobo|tex.?mex)\b/i },
  { id: "italian", re: /\b(pasta|alfredo|parm|marinara|lasagna|penne|rigatoni|meatball sub|chicken parm)\b/i },
  { id: "asian", re: /\b(teriyaki|soy|sesame|ginger|stir.?fry|ramen|bibimbap|gochujang|korean|thai|pho)\b/i },
  { id: "bbq", re: /\b(bbq|barbecue|smoked|brisket|pulled pork|ribs|burnt ends)\b/i },
  { id: "cajun", re: /\b(cajun|creole|jambalaya|andouille|nashville hot)\b/i },
  { id: "southern", re: /\b(biscuit|grits|cornbread|fried chicken|mac and cheese|mac & cheese)\b/i },
  { id: "pub", re: /\b(burger|smash|pub|wings|loaded fries|sliders|nachos)\b/i },
  { id: "jerk", re: /\b(jerk|caribbean|plantain|rice and peas)\b/i },
  { id: "indian", re: /\b(curry|tikka|masala|naan|biryani)\b/i },
  { id: "mediterranean", re: /\b(hummus|falafel|tzatziki|gyro|shawarma)\b/i },
];

const RECOGNIZABLE_DISH_PATTERNS: RegExp[] = [
  /\bsmash\s+burgers?\b/i,
  /\bnashville\s+hot\b/i,
  /\bchicken\s+parm\b/i,
  /\bbirria\s+tacos?\b/i,
  /\bbuffalo\s+(chicken|wings?)\b/i,
  /\bpulled\s+pork\b/i,
  /\bmac\s*(and|&)\s*cheese\b/i,
  /\bloaded\s+(fries|baked\s+potato)\b/i,
  /\bchili\s+dogs?\b/i,
  /\bgarlic\s+butter\b/i,
  /\bhoney\s+garlic\b/i,
  /\bcajun\s+\w+\s+(pasta|alfredo|chicken)\b/i,
  /\bjerk\s+chicken\b/i,
  /\bstreet\s+tacos?\b/i,
  /\bwraps?\b/i,
  /\bsheet\s+pan\b/i,
  /\bone[- ]?pot\b/i,
  /\bstuffed\s+\w+\b/i,
  /\bfirehall\s+chili\b/i,
  /\balfredo\b/i,
  /\bmeatloaf\b/i,
  /\bsloppy\s+joes?\b/i,
  /\bbreakfast\s+(skillet|hash)\b/i,
  /\brita\b/i,
  /\bquesadillas?\b/i,
  /\bflatbread\b/i,
  /\bpub\s+\w+/i,
  /\bsmoker\b/i,
  /\bbrisket\b/i,
];

const MEAL_FORMAT_HINTS: Record<string, RegExp> = {
  burger: /\b(burger|smash|bun|patty|slider)\b/i,
  tacos: /\b(taco|tortilla|birria|carnitas|street)\b/i,
  wrap: /\b(wrap|burrito)\b/i,
  pasta: /\b(pasta|spaghetti|penne|alfredo|marinara|lasagna)\b/i,
  bowl: /\b(bowl|rice bowl|burrito bowl|bibimbap|poke)\b/i,
  soup_chili: /\b(chili|soup|chowder|stew)\b/i,
  sheet_pan: /\b(sheet\s*pan|tray\s*bake)\b/i,
  grill: /\b(grill|bbq|barbecue|smoked)\b/i,
  loaded_fries: /\b(loaded\s+fries|dirty\s+fries)\b/i,
  sandwich: /\b(sandwich|sub|hoagie|po\s*boy|parm\s+sub|nashville hot)\b/i,
};

const SIDE_BY_FORMAT: Record<string, { good: RegExp[]; bad: RegExp[] }> = {
  burger: {
    good: [/\b(fries|onion rings|slaw|coleslaw|pickles|dirty fries)\b/i],
    bad: [/\b(quinoa|couscous|jasmine rice|brown rice|broccoli rice)\b/i],
  },
  tacos: {
    good: [/\b(elote|mexican rice|chips|salsa|guacamole|street corn)\b/i],
    bad: [/\b(mashed potato|pasta|alfredo|caesar salad only)\b/i],
  },
  pasta: {
    good: [/\b(garlic bread|caesar|breadsticks|side salad)\b/i],
    bad: [/\b(steak fries|onion rings only)\b/i],
  },
  bbq: {
    good: [/\b(mac|coleslaw|cornbread|baked beans|slaw)\b/i],
    bad: [/\b(quinoa|couscous|plain broccoli side)\b/i],
  },
  jerk: {
    good: [/\b(rice and peas|plantain|jerk)\b/i],
    bad: [/\b(mashed potato|pasta|tortilla)\b/i],
  },
  bowl: {
    good: [/\b(rice|greens|pickled|sesame|kimchi)\b/i],
    bad: [/\b(bun|tortilla wrap only)\b/i],
  },
  sandwich: {
    good: [/\b(pickles|slaw|coleslaw|fries|chips|bun|roll)\b/i],
    bad: [/\b(quinoa|broccoli rice|jasmine rice side)\b/i],
  },
  plated_main: {
    good: [/\b(mashed|potatoes|rice|vegetables|asparagus)\b/i],
    bad: [/\b(quinoa bowl|chickpea)\b/i],
  },
};

function collectText(recipe: GenerateResponse): string {
  const parts = [
    recipe.title || "",
    recipe.meal_style || "",
    recipe.why_it_fits_tonight || "",
    ...(recipe.ingredients || []).map((i) => `${i.item} ${i.amount} ${i.notes || ""}`),
    ...(recipe.steps || []).map((s) => `${s.heading || ""} ${s.body || ""}`),
    recipe.tags?.cuisine || "",
    ...(recipe.tags?.key_ingredients || []),
  ];
  return parts.join(" ").toLowerCase();
}

function detectMealFormat(recipe: GenerateResponse): string {
  const style = (recipe.meal_style || "").toLowerCase().replace(/\s+/g, "_");
  if (style && style !== "random") return style;
  const title = (recipe.title || "").toLowerCase();
  for (const [fmt, re] of Object.entries(MEAL_FORMAT_HINTS)) {
    if (re.test(title)) return fmt;
  }
  if (/\bbowl\b/.test(title) && !/\b(rice|burrito|bibimbap|poke|teriyaki|bbq)\s+bowl\b/i.test(title)) {
    return "bowl";
  }
  return "plated_main";
}

function countCuisineIdentities(text: string): string[] {
  const found: string[] = [];
  for (const { id, re } of CUISINE_MARKERS) {
    if (re.test(text)) found.push(id);
  }
  return [...new Set(found)];
}

function scoreRecognizableDish(title: string, text: string): { score: number; issues: RealismRejectionCode[] } {
  const issues: RealismRejectionCode[] = [];
  let score = 42;

  for (const re of RECOGNIZABLE_DISH_PATTERNS) {
    if (re.test(title) || re.test(text)) {
      score += 18;
      break;
    }
  }

  if (/\b(burger|taco|wrap|pasta|chili|mac and cheese|smash|wings|pulled pork|sheet pan|skillet)\b/i.test(title)) {
    score += 12;
  }

  if (GENERIC_PLATE_TITLE.test(title) || /\b\w+\s+plates?\s*$/i.test(title.trim())) {
    score -= 35;
    issues.push("unrecognizable_dish");
  }

  if (/\bprotein\s+bowl\b/i.test(title) && !/\b(rice|burrito|power|teriyaki|bbq|bibimbap)\b/i.test(title)) {
    score -= 28;
    issues.push("unrecognizable_dish");
  }

  if (score < 50 && issues.length === 0) {
    issues.push("unrecognizable_dish");
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function scoreRealism(title: string, text: string, ingredients: string): { score: number; issues: RealismRejectionCode[] } {
  const issues: RealismRejectionCode[] = [];
  let score = 70;

  if (isRoboticTitle(title)) {
    score -= 30;
    issues.push("fake_naming");
  }

  for (const re of HARD_REJECT_TITLE) {
    if (re.test(title) || re.test(text)) {
      score -= 40;
      issues.push("realism");
      break;
    }
  }

  if (AWKWARD_AI_ADJECTIVES.test(title)) {
    score -= 25;
    issues.push("fake_naming");
  }

  const slopCount = (ingredients.match(NUTRITION_SLOP_INGREDIENT) || []).length;
  const hasSlopTitle = NUTRITION_SLOP_INGREDIENT.test(title);
  if (slopCount >= 2 || (hasSlopTitle && slopCount >= 1)) {
    score -= 22;
    issues.push("nutrition_slop");
  }

  if (
    FORCED_BROCCOLI.test(ingredients) &&
    !/\b(burger|taco|stir|asian|sheet|roast|beef and broccoli)\b/i.test(text)
  ) {
    const broccoliOnlySide =
      FORCED_BROCCOLI.test(ingredients) &&
      !/\b(fries|slaw|mac|cornbread|rice|pasta|tortilla|bun)\b/i.test(ingredients);
    if (broccoliOnlySide) {
      score -= 15;
      issues.push("realism");
    }
  }

  const mashupSignals = [
    /\b(chickpea|quinoa).*(pasta|burger|taco)\b/i,
    /\b(oats|granola).*(dinner|skillet|chicken)\b/i,
    /\b(alfredo).*(taco|wrap)\b/i,
    /\b(buffalo).*(alfredo).*(bowl)\b/i,
    /\b(teriyaki).*(burger)\b/i,
    /\b(cajun).*(chickpea)\b/i,
  ];
  for (const re of mashupSignals) {
    if (re.test(text)) {
      score -= 30;
      issues.push("ingredient_mashup");
      break;
    }
  }

  if (/\b(bowl|plate)\b/i.test(title) && !RECOGNIZABLE_DISH_PATTERNS.some((r) => r.test(title))) {
    score -= 12;
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function scoreCuisineCohesion(text: string, title: string): { score: number; issues: RealismRejectionCode[] } {
  const issues: RealismRejectionCode[] = [];
  let score = 78;
  const identities = countCuisineIdentities(`${title} ${text}`);

  if (identities.length > 2) {
    score -= 35;
    issues.push("cuisine_incoherence");
  } else if (identities.length === 2) {
    const compatiblePairs = new Set([
      "mexican:pub",
      "bbq:southern",
      "bbq:pub",
      "bbq:italian",
      "cajun:southern",
      "cajun:italian",
      "asian:pub",
      "italian:pub",
      "southern:pub",
    ]);
    const key = identities.sort().join(":");
    const keyRev = [...identities].reverse().join(":");
    if (!compatiblePairs.has(key) && !compatiblePairs.has(keyRev)) {
      score -= 20;
      issues.push("cuisine_incoherence");
    }
  }

  const clashPatterns = [
    /\b(cajun|creole).*(teriyaki|miso|ramen)\b/i,
    /\b(italian|alfredo).*(taco|burrito|salsa)\b/i,
    /\b(jerk|caribbean).*(alfredo|marinara)\b/i,
    /\b(indian|tikka).*(burger|smash)\b/i,
  ];
  for (const re of clashPatterns) {
    if (re.test(text)) {
      score -= 28;
      issues.push("cuisine_incoherence");
      break;
    }
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function scoreSideCompatibility(
  recipe: GenerateResponse,
  format: string,
): { score: number; issues: RealismRejectionCode[] } {
  const issues: RealismRejectionCode[] = [];
  let score = 80;
  const text = collectText(recipe);

  const rules = SIDE_BY_FORMAT[format] || SIDE_BY_FORMAT.bowl;
  if (!rules) return { score, issues };

  for (const bad of rules.bad) {
    if (bad.test(text)) {
      score -= 28;
      issues.push("side_mismatch");
      break;
    }
  }

  if (format === "burger" && /\b(broccoli|quinoa|brown rice)\b/i.test(text) && !/\b(slaw|fries)\b/i.test(text)) {
    score -= 22;
    issues.push("side_mismatch");
  }

  if (format === "tacos" && /\b(broccoli|mashed potato)\b/i.test(text) && !/\b(rice|beans|corn|salsa)\b/i.test(text)) {
    score -= 18;
    issues.push("side_mismatch");
  }

  if (/\bbroccoli\b/i.test(text)) {
    const mainIsBroccoliFriendly = /\b(stir|sheet|roast|beef and broccoli|asian)\b/i.test(text);
    const randomBroccoli =
      /\bbroccoli\b/i.test(text) &&
      !mainIsBroccoliFriendly &&
      (format === "burger" || format === "tacos" || format === "pasta");
    if (randomBroccoli) {
      score -= 20;
      issues.push("side_mismatch");
    }
  }

  return { score: Math.max(0, Math.min(100, score)), issues };
}

function rejectionToLogTag(code: RealismRejectionCode): string {
  const map: Record<RealismRejectionCode, string> = {
    fake_naming: "[rejected: fake naming]",
    realism: "[rejected: realism]",
    side_mismatch: "[rejected: side mismatch]",
    cuisine_incoherence: "[rejected: cuisine incoherence]",
    unrecognizable_dish: "[rejected: unrecognizable dish]",
    ingredient_mashup: "[rejected: ingredient mashup]",
    nutrition_slop: "[rejected: nutrition slop]",
  };
  return map[code];
}

/**
 * Run the full realism firewall on a recipe.
 */
export function evaluateMealRealismFirewall(recipe: GenerateResponse): MealRealismFirewallResult {
  const title = (recipe.title || "").trim();
  const text = collectText(recipe);
  const ingredients = (recipe.ingredients || []).map((i) => i.item || "").join(" ");
  const format = detectMealFormat(recipe);

  const allRejections: RealismRejectionCode[] = [];
  const messages: string[] = [];

  let hardReject = false;
  for (const re of HARD_REJECT_TITLE) {
    if (re.test(title)) {
      hardReject = true;
      allRejections.push("fake_naming");
      messages.push(`hard_reject_title:${title.slice(0, 60)}`);
      break;
    }
  }
  if (GENERIC_PLATE_TITLE.test(title)) {
    hardReject = true;
    if (!allRejections.includes("fake_naming")) allRejections.push("fake_naming");
  }

  const r1 = scoreRealism(title, text, ingredients);
  const r2 = scoreCuisineCohesion(text, title);
  const r3 = scoreSideCompatibility(recipe, format);
  const r4 = scoreRecognizableDish(title, text);

  for (const issues of [r1.issues, r2.issues, r3.issues, r4.issues]) {
    for (const code of issues) {
      if (!allRejections.includes(code)) allRejections.push(code);
    }
  }

  const realismScore = r1.score;
  const cuisineCohesionScore = r2.score;
  const sideCompatibilityScore = r3.score;
  const recognizableDishScore = r4.score;

  const score = Math.round(
    realismScore * 0.32 +
      cuisineCohesionScore * 0.24 +
      sideCompatibilityScore * 0.22 +
      recognizableDishScore * 0.22,
  );

  if (score < HARD_REJECT_SCORE_CAP) hardReject = true;

  const criticalRejections = new Set<RealismRejectionCode>([
    "fake_naming",
    "ingredient_mashup",
    "nutrition_slop",
    "cuisine_incoherence",
    "side_mismatch",
    "unrecognizable_dish",
    "realism",
  ]);
  const hasCritical = allRejections.some((r) => criticalRejections.has(r));

  const knownComfortDish = RECOGNIZABLE_DISH_PATTERNS.some((re) => re.test(title));
  const waiveMinor =
    knownComfortDish &&
    recognizableDishScore >= 60 &&
    score >= 60 &&
    !hardReject &&
    !allRejections.includes("fake_naming") &&
    !allRejections.includes("ingredient_mashup") &&
    !allRejections.includes("nutrition_slop");

  const effectiveRejections = waiveMinor
    ? allRejections.filter(
        (r) => r !== "side_mismatch" && r !== "cuisine_incoherence" && r !== "unrecognizable_dish",
      )
    : allRejections;

  const pass =
    !hardReject &&
    score >= PASS_THRESHOLD &&
    recognizableDishScore >= 48 &&
    realismScore >= 42 &&
    (effectiveRejections.length === 0 || waiveMinor);

  const logTags = [...new Set(allRejections.map(rejectionToLogTag))];

  return {
    pass: hardReject ? false : pass,
    hardReject,
    score,
    realismScore,
    cuisineCohesionScore,
    sideCompatibilityScore,
    recognizableDishScore,
    rejections: allRejections,
    logTags,
    messages,
  };
}

export function formatFirewallRejectionLog(
  result: MealRealismFirewallResult,
  title: string,
): string {
  const tags = result.logTags.length ? result.logTags.join(" ") : "[rejected: realism]";
  return `${tags} title="${title.slice(0, 56)}" score=${result.score} realism=${result.realismScore} cuisine=${result.cuisineCohesionScore} sides=${result.sideCompatibilityScore} recognizable=${result.recognizableDishScore}`;
}
