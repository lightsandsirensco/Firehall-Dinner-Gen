import type { GenerateResponse } from "@shared/schema";
import { inferShoppingCategory, isSeasoningOrGarnish } from "@shared/meal-semantics";
import { log } from "./index";
import { containsAllergen } from "./allergens";

export interface LabelAuditContext {
  selectedAppliances: string[];
  selectedAllergens: string[];
  selectedHealthiness: string;
  selectedBudget: string;
  selectedCuisine: string;
  selectedMealFormat: string;
  selectedProtein: string;
  chosenProtein: string;
  crewSize: number;
}

export interface AuditResult {
  recipe: GenerateResponse;
  ok: boolean;
  fixesApplied: string[];
  issues: string[];
  auditDetails: AuditDetails;
}

export interface AuditDetails {
  requestedStyle: string;
  inferredStyle: string;
  finalStyle: string;
  requestedCuisine: string;
  inferredCuisine: string;
  finalCuisine: string;
  inferredBaseCarb: string;
  finalBaseCarb: string;
  inferredMethod: string;
  finalMethod: string;
  inferredHealthiness: string;
  finalHealthiness: string;
  inferredBudget: string;
  finalBudget: string;
  applianceFit: boolean;
  allergenClean: boolean;
  categoryFixes: number;
}

function ingsText(recipe: GenerateResponse): string {
  return (recipe.ingredients || []).map(i => `${i.item} ${i.notes || ""}`).join(" ").toLowerCase();
}

function stepsText(recipe: GenerateResponse): string {
  return (recipe.steps || []).map(s => `${s.heading || ""} ${s.body || ""}`).join(" ").toLowerCase();
}

function fullText(recipe: GenerateResponse): string {
  return `${recipe.title || ""} ${ingsText(recipe)} ${stepsText(recipe)}`.toLowerCase();
}

const STYLE_EVIDENCE: Record<string, { ingredients: RegExp; steps: RegExp; weight: number }> = {
  wrap: { ingredients: /\b(tortilla|wrap|pita|lavash)\b/i, steps: /\b(roll|wrap|fold|assemble)\b/i, weight: 3 },
  taco: { ingredients: /\b(tortilla|taco shell|corn tortilla)\b/i, steps: /\b(assemble|fill|top|layer)\b/i, weight: 3 },
  pasta: { ingredients: /\b(pasta|spaghetti|penne|linguine|fettuccine|rigatoni|fusilli|macaroni|orzo|farfalle|ziti|rotini)\b/i, steps: /\b(boil|cook pasta|al dente|drain)\b/i, weight: 3 },
  "soup-stew": { ingredients: /\b(broth|stock|soup|stew)\b/i, steps: /\b(simmer|stew|braise|ladle|soup)\b/i, weight: 3 },
  "sheet-pan": { ingredients: /\b(sheet pan|baking sheet|lined sheet)\b/i, steps: /\b(sheet pan|baking sheet|roast|bake|425|400|450|375|350)\b/i, weight: 2 },
  "stir-fry": { ingredients: /\b(stir.?fry|wok)\b/i, steps: /\b(stir.?fry|wok|high heat|toss)\b/i, weight: 2 },
  bowl: { ingredients: /\b(rice|quinoa|greens|noodle)\b/i, steps: /\b(bowl|layer|assemble|top with)\b/i, weight: 1 },
  burger: { ingredients: /\b(bun|burger|patty|patties)\b/i, steps: /\b(assemble|stack|bun|smash|sear)\b/i, weight: 3 },
  sandwich: { ingredients: /\b(bread|bun|roll|baguette|ciabatta|sub roll|hoagie)\b/i, steps: /\b(assemble|layer|sandwich|spread)\b/i, weight: 2 },
  grill: { ingredients: /./i, steps: /\b(grill|char.?grill|grill pan|bbq|barbecue)\b/i, weight: 2 },
  flatbread: { ingredients: /\b(flatbread|naan|pita)\b/i, steps: /\b(top|spread|bake|assemble)\b/i, weight: 2 },
  "loaded-fries": { ingredients: /\b(fries|french fries|potato)\b/i, steps: /\b(load|pile|top|bake fries)\b/i, weight: 3 },
  skillet: { ingredients: /./i, steps: /\b(skillet|pan|sauté|sear)\b/i, weight: 1 },
  casserole: { ingredients: /\b(casserole|baking dish)\b/i, steps: /\b(casserole|bake|oven|layer)\b/i, weight: 2 },
  "one-pot": { ingredients: /./i, steps: /\b(one.?pot|same pot|single pot)\b/i, weight: 2 },
  stuffed: { ingredients: /\b(pepper|zucchini|squash|potato|tomato)\b/i, steps: /\b(stuff|fill|hollow)\b/i, weight: 2 },
  "stuffed-bread": { ingredients: /\b(bread|dough|roll|baguette)\b/i, steps: /\b(stuff|fill|wrap|fold)\b/i, weight: 2 },
  "noodle-toss": { ingredients: /\b(noodle|udon|soba|ramen|lo mein)\b/i, steps: /\b(toss|stir|cook noodle|boil)\b/i, weight: 2 },
  "rice-bake": { ingredients: /\b(rice)\b/i, steps: /\b(bake|oven|casserole)\b/i, weight: 2 },
  bake: { ingredients: /./i, steps: /\b(bake|oven|roast|425|400|450|375|350)\b/i, weight: 1 },
  "breakfast-for-dinner": { ingredients: /\b(egg|pancake|waffle|sausage|hash|bacon|syrup)\b/i, steps: /\b(scramble|fry|flip|griddle)\b/i, weight: 2 },
};

export function inferMealStyle(recipe: GenerateResponse): string {
  const ings = ingsText(recipe);
  const steps = stepsText(recipe);
  const scores: { style: string; score: number }[] = [];

  for (const [style, evidence] of Object.entries(STYLE_EVIDENCE)) {
    let score = 0;
    if (evidence.ingredients.test(ings)) score += evidence.weight;
    if (evidence.steps.test(steps)) score += evidence.weight;
    if (score > 0) scores.push({ style, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.length > 0 ? scores[0].style : "skillet";
}

export function inferBaseCarb(recipe: GenerateResponse): string {
  const ings = ingsText(recipe);
  if (/\b(rice)\b/i.test(ings) && !/rice vinegar|rice wine|rice paper|rice noodle/i.test(ings)) return "rice";
  if (/\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|rotini|farfalle|ziti|macaroni)\b/i.test(ings)) return "pasta";
  if (/\b(quinoa)\b/i.test(ings)) return "quinoa";
  if (/\b(potato|potatoes|fries|french fries)\b/i.test(ings)) return "potatoes";
  if (/\b(noodle|udon|soba|ramen|lo mein|rice noodle)\b/i.test(ings)) return "noodles";
  if (/\b(bread|bun|roll|baguette|ciabatta|sourdough|brioche|sub roll)\b/i.test(ings)) return "bread";
  if (/\b(tortilla|taco shell)\b/i.test(ings)) return "tortillas";
  if (/\b(couscous)\b/i.test(ings)) return "couscous";
  if (/\b(flatbread|naan|pita)\b/i.test(ings)) return "flatbread";
  if (/\b(greens|lettuce|spinach|kale|arugula)\b/i.test(ings)) return "greens";
  if (/\b(orzo)\b/i.test(ings)) return "orzo";
  if (/\b(farro|barley|bulgur)\b/i.test(ings)) return "grains";
  return "none";
}

export function inferCookingMethod(recipe: GenerateResponse): string {
  const steps = stepsText(recipe);
  if (/\bslow\s*cook/i.test(steps)) return "slow cooker";
  if (/\bair\s*fr/i.test(steps)) return "air fryer";
  if (/\b(instant\s*pot|pressure\s*cook)/i.test(steps)) return "instant pot";
  if (/\bmicrowave/i.test(steps)) return "microwave";
  if (/\bsheet\s*pan/i.test(steps)) return "sheet-pan";
  if (/\b(grill|char.?grill|grill.?pan)\b/i.test(steps)) return "grill";
  if (/\b(oven|bake|roast|425|400|450|375|350)/i.test(steps)) return "oven";
  if (/\bstir.?fry|wok\b/i.test(steps)) return "stir-fry";
  if (/\b(skillet|pan|sauté|sear)\b/i.test(steps)) return "stovetop";
  if (/\b(simmer|stew|braise|boil)\b/i.test(steps)) return "stovetop";
  return "stovetop";
}

const CUISINE_INDICATORS: Record<string, { pattern: RegExp; display: string }> = {
  mexican: { pattern: /\b(cumin|chili powder|lime|salsa|tortilla|jalapeño|cilantro|chipotle|taco seasoning|enchilada|avocado|queso|refried beans)\b/ig, display: "Mexican" },
  mediterranean: { pattern: /\b(oregano|lemon|feta|olive|hummus|pita|za'atar|tahini|tzatziki|kalamata|couscous|chickpea)\b/ig, display: "Mediterranean" },
  greek: { pattern: /\b(oregano|lemon|feta|olive|pita|tzatziki|kalamata|dill|yogurt|cucumber)\b/ig, display: "Greek" },
  asian: { pattern: /\b(soy sauce|tamari|ginger|sesame|rice vinegar|sriracha|hoisin|wok|stir.?fry|teriyaki|miso|tofu|edamame)\b/ig, display: "Asian" },
  korean: { pattern: /\b(gochujang|kimchi|sesame|soy sauce|rice vinegar|gochugaru|bibimbap|bulgogi|doenjang)\b/ig, display: "Korean" },
  thai: { pattern: /\b(coconut milk|lime|fish sauce|thai basil|lemongrass|curry paste|peanut|galangal|pad thai)\b/ig, display: "Thai" },
  indian: { pattern: /\b(curry|garam masala|turmeric|cumin|coriander|naan|tikka|masala|cardamom|chutney|paneer|dal|lentil)\b/ig, display: "Indian" },
  italian: { pattern: /\b(basil|oregano|tomato|parmesan|mozzarella|garlic|marinara|pasta|olive oil|balsamic|ricotta|prosciutto)\b/ig, display: "Italian" },
  middle_eastern: { pattern: /\b(za'atar|tahini|sumac|hummus|pita|cumin|coriander|pomegranate|falafel|shawarma)\b/ig, display: "Middle Eastern" },
  bbq: { pattern: /\b(bbq|barbecue|smoky|pulled|smoked|coleslaw|cornbread|brisket)\b/ig, display: "BBQ" },
  cajun: { pattern: /\b(cajun|creole|andouille|jambalaya|gumbo|cayenne|blackened)\b/ig, display: "Cajun" },
  japanese: { pattern: /\b(soy sauce|miso|teriyaki|wasabi|nori|dashi|sake|mirin|panko|ramen)\b/ig, display: "Japanese" },
};

const HIGH_THRESHOLD_CUISINES = new Set(["Asian", "Korean", "Japanese", "Thai"]);
const ASIAN_REQUIRED_INDICATORS = /\b(soy sauce|tamari|ginger|sesame|teriyaki|miso|hoisin|rice vinegar|wok|stir.?fry|gochujang|kimchi|fish sauce|coconut milk|lemongrass|curry paste|mirin|dashi|nori)\b/i;

export function inferCuisine(recipe: GenerateResponse): string {
  const text = fullText(recipe);
  const ings = ingsText(recipe);
  let best = "";
  let bestCount = 0;

  for (const [, info] of Object.entries(CUISINE_INDICATORS)) {
    const matches = text.match(info.pattern);
    const unique = new Set((matches || []).map(m => m.toLowerCase()));

    const isHighThreshold = HIGH_THRESHOLD_CUISINES.has(info.display);
    const minRequired = isHighThreshold ? 3 : 2;

    if (unique.size >= minRequired && unique.size > bestCount) {
      if (isHighThreshold && !ASIAN_REQUIRED_INDICATORS.test(ings)) {
        continue;
      }
      bestCount = unique.size;
      best = info.display;
    }
  }

  return best || "American";
}

export function inferHealthiness(recipe: GenerateResponse): string {
  let score = 0;
  const ings = ingsText(recipe);

  if (/\b(lean|skinless|breast|white meat|96%|93%|90%)\b/i.test(ings)) score += 2;
  if (/\b(broccoli|spinach|kale|zucchini|asparagus|brussels|cauliflower|greens)\b/i.test(ings)) score += 2;
  if (/\b(quinoa|brown rice|whole wheat|whole grain|lentil|chickpea|black bean|kidney bean)\b/i.test(ings)) score += 1;
  if (/\b(greek yogurt|cottage cheese|egg white)\b/i.test(ings)) score += 1;
  if (/\b(salmon|tuna|cod|tilapia|halibut|trout)\b/i.test(ings)) score += 1;

  if (/\b(heavy cream|cream cheese|sour cream|whipping cream)\b/i.test(ings)) score -= 2;
  if (/\b(deep fr|fried|batter)\b/i.test(ings)) score -= 2;
  if (/\b(bacon|sausage|pepperoni|salami|bratwurst)\b/i.test(ings)) score -= 1;
  if (/\b(sugar|brown sugar|maple syrup|honey glazed)\b/i.test(ings)) score -= 1;
  if (/\b(french fries|loaded fries|nacho)\b/i.test(ings)) score -= 1;

  if (score >= 3) return "lean";
  if (score <= -2) return "comfort";
  return "balanced";
}

export function inferBudget(recipe: GenerateResponse): string {
  let score = 0;
  const ings = ingsText(recipe);

  if (/\b(salmon|steak|filet|ribeye|tenderloin|lobster|crab|scallop|prosciutto|wagyu|lamb chop)\b/i.test(ings)) score += 3;
  if (/\b(saffron|truffle|pine nut|miso paste|gochujang|tahini|za'atar)\b/i.test(ings)) score += 1;
  if (/\b(avocado|fresh herb|fresh basil|fresh cilantro|fresh dill)\b/i.test(ings)) score += 1;

  if (/\b(ground beef|ground turkey|ground chicken|ground pork)\b/i.test(ings)) score -= 1;
  if (/\b(canned|frozen|dried)\b/i.test(ings)) score -= 1;
  if (/\b(rice|pasta|beans|lentil|potato|oats)\b/i.test(ings)) score -= 1;
  if (/\b(chicken thigh|drumstick|whole chicken|chicken leg)\b/i.test(ings)) score -= 1;

  if (score >= 3) return "splurge";
  if (score <= -2) return "low";
  return "standard";
}

const INGREDIENT_CATEGORIES: [string, RegExp][] = [
  ["protein", /\b(chicken|beef|pork|turkey|salmon|shrimp|sausage|bacon|steak|ground beef|ground turkey|ground chicken|ground pork|fish|tofu|lamb|ham|prosciutto|pepperoni|crab|lobster|scallop|tuna|cod|tilapia|halibut|trout|tempeh|seitan|mussels|clams|prawns|meatball|patty|patties|lentil|chickpea|black bean|kidney bean|white bean)\b/i],
  ["produce", /\b(onion|garlic|bell pepper|tomato|lettuce|spinach|broccoli|carrot|celery|potato|mushroom|zucchini|corn|avocado|lime|lemon|cilantro|fresh basil|cucumber|cabbage|kale|ginger|jalapeño|jalapeno|arugula|asparagus|squash|cauliflower|brussels|sweet potato|green onion|scallion|shallot|radish|beet|eggplant|artichoke|peas|snap pea|green bean|bok choy|watercress|fennel|fresh parsley|fresh dill|fresh mint|fresh thyme|fresh rosemary|chive|romaine|poblano|serrano|habanero|banana pepper|green pepper|red pepper(?! flake))\b/i],
  ["dairy", /\b(cheese|mozzarella|cheddar|parmesan|cream|milk|butter|yogurt|sour cream|ricotta|feta|halloumi|gouda|gruyere|brie|provolone|monterey|colby|cream cheese|cottage cheese|ghee|buttermilk|whipped cream|mascarpone)\b/i],
  ["grain", /\b(rice|pasta|noodle|bread|tortilla|bun|roll|pita|naan|couscous|quinoa|oats|farro|barley|bulgur|flatbread|spaghetti|penne|linguine|fettuccine|rigatoni|fusilli|rotini|orzo|udon|soba|ramen|lo mein|taco shell|ciabatta|sourdough|brioche|baguette|sub roll|pizza dough)\b/i],
  ["spice", /\b(salt|pepper|cumin|paprika|chili powder|oregano|thyme|cinnamon|cayenne|garlic powder|onion powder|turmeric|coriander|nutmeg|garam masala|curry powder|smoked paprika|red pepper flake|bay leaf|mustard powder|allspice|cardamom|clove|gochugaru|za'atar|sumac|italian seasoning|taco seasoning|cajun seasoning|old bay)\b/i],
  ["sauce", /\b(sauce|soy sauce|coconut aminos|tamari|vinegar|mustard|ketchup|mayo|mayonnaise|sriracha|bbq|salsa|pesto|hoisin|teriyaki|hot sauce|honey|oil|olive oil|sesame oil|coconut oil|vegetable oil|canola oil|fish sauce|oyster sauce|worcestershire|tahini|gochujang|harissa|chimichurri|tzatziki|aioli|mirin|rice wine|balsamic|maple syrup|brown sugar|tomato paste|tomato sauce|marinara|enchilada sauce|buffalo sauce|ranch)\b/i],
  ["pantry", /\b(broth|stock|canned tomato|diced tomato|crushed tomato|tomato puree|coconut milk|coconut cream|canned bean|canned corn|canned chickpea|dried|nutritional yeast|cornstarch|flour|baking|panko|breadcrumb|crouton)\b/i],
];

const SPICE_OVERRIDES = /\b(black pepper|white pepper|cracked pepper|ground pepper|pepper flake|red pepper|chili pepper|cayenne pepper|garlic powder|onion powder|dried thyme|dried oregano|dried basil|dried parsley|dried dill|dried rosemary|dried sage|dried mint|ground cumin|ground cinnamon|ground turmeric|ground coriander|ground ginger)\b/i;
const SAUCE_OVERRIDES = /\b(olive oil|sesame oil|coconut oil|vegetable oil|canola oil|avocado oil|peanut oil)\b/i;
const PANTRY_OVERRIDES = /\b(chicken broth|beef broth|vegetable broth|chicken stock|beef stock|vegetable stock|bone broth)\b/i;

export function inferIngredientCategory(name: string): string {
  const lower = name.toLowerCase();
  if (SPICE_OVERRIDES.test(lower)) return "spice";
  if (SAUCE_OVERRIDES.test(lower)) return "sauce";
  if (PANTRY_OVERRIDES.test(lower)) return "pantry";
  if (isSeasoningOrGarnish(name)) return "spice";
  const aisle = inferShoppingCategory(name);
  const map: Record<string, string> = {
    Proteins: "protein",
    Produce: "produce",
    "Dairy / Dairy Alternatives": "dairy",
    "Bakery / Dough": "grain",
    "Pantry & Spices": "spice",
    "Condiments & Sauces": "sauce",
    Other: "other",
  };
  if (map[aisle]) return map[aisle];
  for (const [cat, pattern] of INGREDIENT_CATEGORIES) {
    if (pattern.test(lower)) return cat;
  }
  return "other";
}

export function checkApplianceFit(recipe: GenerateResponse, selectedAppliances: string[]): { fit: boolean; required: string[] } {
  const steps = stepsText(recipe);
  const required: string[] = [];

  if (/\boven|bake|roast|425|400|450|375|350|sheet pan|preheat/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase() === "oven")) {
    required.push("oven");
  }
  if (/\b(stove|skillet|pan|sauté|sear|simmer|boil|saucepan|pot)\b/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase() === "stove")) {
    required.push("stove");
  }
  if (/\b(grill(?!ed cheese)|char.?grill|grill pan|bbq grill)\b/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase() === "grill")) {
    required.push("grill");
  }
  if (/\bslow\s*cook/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase().includes("slow"))) {
    required.push("slow cooker");
  }
  if (/\bair\s*fr/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase().includes("air"))) {
    required.push("air fryer");
  }
  if (/\b(instant\s*pot|pressure\s*cook)/i.test(steps) && !selectedAppliances.some(a => a.toLowerCase().includes("instant"))) {
    required.push("instant pot");
  }

  return { fit: required.length === 0, required };
}

function normalizeStyleLabel(style: string): string {
  const s = style.toLowerCase().trim();
  if (s.includes("wrap") || s.includes("burrito")) return "wrap";
  if (s.includes("taco")) return "taco";
  if (s === "bowl") return "bowl";
  if (s === "pasta") return "pasta";
  if (s.includes("sheet") && s.includes("pan")) return "sheet-pan";
  if (s.includes("rice") && s.includes("bake")) return "rice-bake";
  if (s === "bake") return "bake";
  if (s.includes("soup") || s.includes("stew")) return "soup-stew";
  if (s.includes("stir") && s.includes("fry")) return "stir-fry";
  if (s.includes("grill")) return "grill";
  if (s.includes("sandwich") || s.includes("sub")) return "sandwich";
  if (s.includes("burger")) return "burger";
  if (s.includes("stuffed") && s.includes("bread")) return "stuffed-bread";
  if (s.includes("stuff")) return "stuffed";
  if (s.includes("casserole")) return "casserole";
  if (s.includes("flatbread")) return "flatbread";
  if (s.includes("noodle") && s.includes("toss")) return "noodle-toss";
  if (s.includes("loaded") && s.includes("fries")) return "loaded-fries";
  if (s.includes("skillet")) return "skillet";
  if (s.includes("one") && s.includes("pot")) return "one-pot";
  if (s.includes("breakfast")) return "breakfast-for-dinner";
  return s;
}

const STYLE_DISPLAY: Record<string, string> = {
  bowl: "Bowl", wrap: "Wrap", taco: "Tacos", pasta: "Pasta",
  "sheet-pan": "Sheet Pan", "stir-fry": "Stir Fry", burger: "Burger",
  sandwich: "Sandwich", "soup-stew": "Soup/Stew", grill: "Grill",
  flatbread: "Flatbread", skillet: "Skillet", casserole: "Casserole",
  "one-pot": "One-Pot", stuffed: "Stuffed", "stuffed-bread": "Stuffed Bread",
  "noodle-toss": "Noodle Toss", "loaded-fries": "Loaded Fries",
  "rice-bake": "Rice Bake", bake: "Bake",
  "breakfast-for-dinner": "Breakfast-for-Dinner",
};

function findFlavorKeyword(ings: string): string {
  const FLAVOR_WORDS = [
    "honey", "bbq", "teriyaki", "pesto", "buffalo", "ranch", "sriracha",
    "chipotle", "maple", "lime", "lemon", "garlic", "sesame", "miso",
    "curry", "harissa", "tahini", "gochujang", "chimichurri", "balsamic",
  ];
  const lower = ings.toLowerCase();
  for (const w of FLAVOR_WORDS) {
    if (lower.includes(w)) return w;
  }
  return "";
}

function cap(s: string): string {
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const LABEL_TO_TITLE_SUFFIX: Record<string, string> = {
  bowl: "Bowls", wrap: "Wraps", taco: "Tacos", "stir-fry": "Stir-Fry",
  burger: "Burgers", pasta: "Pasta", sandwich: "Sandwiches",
  "soup-stew": "Stew", flatbread: "Flatbreads", "noodle-toss": "Noodle Toss",
  "loaded-fries": "Loaded Fries", casserole: "Casserole", stuffed: "Stuffed Peppers",
  bake: "Bake", "rice-bake": "Rice Bake", "sheet-pan": "Sheet-Pan Dinner",
  grill: "Grill Plates", skillet: "Skillet", "one-pot": "One-Pot",
  "breakfast-for-dinner": "Breakfast Scramble", "stuffed-bread": "Stuffed Bread",
};

const LABEL_TO_TITLE_PREFIX: Record<string, string> = {
  "sheet-pan": "Sheet-Pan", skillet: "Skillet", "one-pot": "One-Pot",
};

function rebuildTitle(recipe: GenerateResponse, styleLabel: string): string {
  const protein = recipe.primary_protein_source || recipe.chosen_protein || "";
  const proteinDisplay = cap(protein);
  const cuisine = recipe.tags?.cuisine || "";
  const ings = (recipe.ingredients || []).map(i => i.item).join(" ");
  const flavorKw = findFlavorKeyword(ings);
  const flavorDisplay = flavorKw ? cap(flavorKw) : "";
  const prefix = LABEL_TO_TITLE_PREFIX[styleLabel] || "";
  const suffix = LABEL_TO_TITLE_SUFFIX[styleLabel] || cap(styleLabel);

  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (cuisine && cuisine !== "American") parts.push(cuisine);
  if (flavorDisplay && !parts.some(p => p.toLowerCase() === flavorDisplay.toLowerCase())) parts.push(flavorDisplay);
  if (proteinDisplay) parts.push(proteinDisplay);
  parts.push(suffix);

  return parts.join(" ");
}

export function auditAndFixRecipe(recipe: GenerateResponse, ctx: LabelAuditContext): AuditResult {
  const fixes: string[] = [];
  const issues: string[] = [];
  let fixed = { ...recipe, tags: recipe.tags ? { ...recipe.tags } : { cuisine: "", cooking_method: "", base_carb: "", key_ingredients: [] as string[], high_protein: true, high_fiber: false, quick_cleanup: false } };

  const currentStyleLabel = normalizeStyleLabel(fixed.meal_style || "");
  const inferredStyleLabel = inferMealStyle(fixed);
  let finalStyle = currentStyleLabel || inferredStyleLabel;
  let styleChanged = false;

  if (!currentStyleLabel) {
    finalStyle = inferredStyleLabel;
    fixed.meal_style = STYLE_DISPLAY[inferredStyleLabel] || inferredStyleLabel;
    fixes.push(`meal_style: set to "${inferredStyleLabel}" (was empty)`);
    styleChanged = true;
  } else if (inferredStyleLabel !== currentStyleLabel) {
    const currentEvidence = STYLE_EVIDENCE[currentStyleLabel];
    if (currentEvidence) {
      const ings = ingsText(fixed);
      const steps = stepsText(fixed);
      const hasIngEvidence = currentEvidence.ingredients.test(ings);
      const hasStepEvidence = currentEvidence.steps.test(steps);
      if (!hasIngEvidence && !hasStepEvidence) {
        finalStyle = inferredStyleLabel;
        fixed.meal_style = STYLE_DISPLAY[inferredStyleLabel] || inferredStyleLabel;
        fixes.push(`meal_style: "${currentStyleLabel}" → "${inferredStyleLabel}" (no content evidence for original)`);
        styleChanged = true;
      }
    }
  }

  const inferredCuisine = inferCuisine(fixed);
  const currentCuisine = fixed.tags?.cuisine || "";
  let cuisineChanged = false;
  if (currentCuisine && currentCuisine !== "American") {
    const text = fullText(fixed);
    const ings = ingsText(fixed);
    const cuisineKey = Object.entries(CUISINE_INDICATORS).find(([, info]) => info.display === currentCuisine);
    if (cuisineKey) {
      const matches = text.match(cuisineKey[1].pattern);
      const unique = new Set((matches || []).map(m => m.toLowerCase()));
      const isHighThreshold = HIGH_THRESHOLD_CUISINES.has(currentCuisine);
      const minRequired = isHighThreshold ? 3 : 2;
      const missingAsianIndicators = isHighThreshold && !ASIAN_REQUIRED_INDICATORS.test(ings);

      if (unique.size < minRequired || missingAsianIndicators) {
        fixed.tags!.cuisine = inferredCuisine;
        fixes.push(`cuisine: "${currentCuisine}" → "${inferredCuisine}" (indicators: ${unique.size}/${minRequired}${missingAsianIndicators ? ", missing core Asian ingredients" : ""})`);
        cuisineChanged = true;
      }
    }
  } else if (!currentCuisine) {
    fixed.tags!.cuisine = inferredCuisine;
    if (inferredCuisine !== "American") {
      fixes.push(`cuisine: set to "${inferredCuisine}" from content`);
      cuisineChanged = true;
    }
  }

  const inferredMethod = inferCookingMethod(fixed);
  const currentMethod = fixed.tags?.cooking_method || "";
  if (!currentMethod) {
    fixed.tags!.cooking_method = inferredMethod;
    fixes.push(`cooking_method: set to "${inferredMethod}"`);
  } else {
    const methodNorm = currentMethod.toLowerCase().replace(/[-\s]+/g, "");
    const inferredNorm = inferredMethod.toLowerCase().replace(/[-\s]+/g, "");
    if (methodNorm !== inferredNorm) {
      fixed.tags!.cooking_method = inferredMethod;
      fixes.push(`cooking_method: "${currentMethod}" → "${inferredMethod}"`);
    }
  }

  const inferredCarb = inferBaseCarb(fixed);
  const currentCarb = fixed.tags?.base_carb || "";
  if (!currentCarb) {
    fixed.tags!.base_carb = inferredCarb;
    if (inferredCarb !== "none") fixes.push(`base_carb: set to "${inferredCarb}"`);
  } else if (currentCarb.toLowerCase() !== inferredCarb.toLowerCase()) {
    fixed.tags!.base_carb = inferredCarb;
    fixes.push(`base_carb: "${currentCarb}" → "${inferredCarb}"`);
  }

  const inferredHealth = inferHealthiness(fixed);
  const currentHealth = (fixed as any).healthiness || ctx.selectedHealthiness || "balanced";
  if (currentHealth !== inferredHealth) {
    (fixed as any).healthiness = inferredHealth;
    fixes.push(`healthiness: "${currentHealth}" → "${inferredHealth}"`);
  }

  const inferredBdgt = inferBudget(fixed);
  const currentBudgetLabel = fixed.budget_level || ctx.selectedBudget || "standard";
  if (currentBudgetLabel !== inferredBdgt) {
    fixed.budget_level = inferredBdgt;
    fixes.push(`budget_level: "${currentBudgetLabel}" → "${inferredBdgt}"`);
  }

  const timing = fixed.timing;
  if (timing) {
    const totalExpected = (timing.prep_minutes || 0) + (timing.cook_minutes || 0);
    const totalClaimed = timing.total_minutes || 0;
    if (totalClaimed > 0 && totalExpected > 0 && Math.abs(totalClaimed - totalExpected) > 10) {
      timing.total_minutes = totalExpected;
      fixes.push(`timing: total_minutes ${totalClaimed} → ${totalExpected} (prep+cook)`);
    }
  }

  const applianceCheck = checkApplianceFit(fixed, ctx.selectedAppliances);
  if (!applianceCheck.fit) {
    issues.push(`appliance_mismatch: recipe requires [${applianceCheck.required.join(",")}] but user selected [${ctx.selectedAppliances.join(",")}]`);
  }

  let allergenClean = true;
  if (ctx.selectedAllergens.length > 0) {
    for (const allergen of ctx.selectedAllergens) {
      for (const ing of fixed.ingredients || []) {
        if (containsAllergen(`${ing.item} ${ing.notes || ""}`, allergen)) {
          issues.push(`allergen_violation: ingredient "${ing.item}" contains ${allergen}`);
          allergenClean = false;
        }
      }
    }
  }

  const finalCuisine = fixed.tags?.cuisine || inferredCuisine;

  const hasTitleMismatch = checkTitleConsistency(fixed, finalStyle, finalCuisine);
  if (styleChanged || cuisineChanged || hasTitleMismatch) {
    const rebuilt = rebuildTitle(fixed, finalStyle);
    if (rebuilt !== fixed.title) {
      fixes.push(`title: rebuilt from finalized content (style=${finalStyle}, cuisine=${finalCuisine})`);
      fixed.title = rebuilt;
    }
  }

  const details: AuditDetails = {
    requestedStyle: ctx.selectedMealFormat || "random",
    inferredStyle: inferredStyleLabel,
    finalStyle,
    requestedCuisine: ctx.selectedCuisine || "any",
    inferredCuisine,
    finalCuisine: fixed.tags?.cuisine || "",
    inferredBaseCarb: inferredCarb,
    finalBaseCarb: fixed.tags?.base_carb || "",
    inferredMethod,
    finalMethod: fixed.tags?.cooking_method || "",
    inferredHealthiness: inferredHealth,
    finalHealthiness: inferredHealth,
    inferredBudget: inferredBdgt,
    finalBudget: fixed.budget_level || "standard",
    applianceFit: applianceCheck.fit,
    allergenClean,
    categoryFixes: 0,
  };

  log(
    `[audit] fixes=[${fixes.join("; ")}] issues=${issues.length} ` +
    `reqStyle=${details.requestedStyle} infStyle=${details.inferredStyle} finStyle=${details.finalStyle} ` +
    `cuisine=${details.finalCuisine} baseCarb=${details.finalBaseCarb} method=${details.finalMethod} ` +
    `health=${details.inferredHealthiness} budget=${details.inferredBudget} ` +
    `appFit=${details.applianceFit} allergenOk=${details.allergenClean}`,
    "audit"
  );

  return {
    recipe: fixed,
    ok: issues.length === 0,
    fixesApplied: fixes,
    issues,
    auditDetails: details,
  };
}

const CUISINE_TITLE_WORDS: Record<string, RegExp> = {
  asian: /\b(asian|mongolian|chinese|szechuan|cantonese)\b/i,
  korean: /\b(korean|bulgogi|bibimbap)\b/i,
  japanese: /\b(japanese|teriyaki|miso|ramen)\b/i,
  thai: /\b(thai|pad thai)\b/i,
  indian: /\b(indian|tikka|masala|curry)\b/i,
  mexican: /\b(mexican|enchilada|taco)\b/i,
  italian: /\b(italian|marinara|bolognese)\b/i,
  mediterranean: /\b(mediterranean|greek)\b/i,
  cajun: /\b(cajun|creole)\b/i,
  middle_eastern: /\b(middle eastern|shawarma|falafel)\b/i,
};

function checkTitleConsistency(recipe: GenerateResponse, contentStyle: string, inferredCuisine: string): boolean {
  const title = (recipe.title || "").toLowerCase();

  const TITLE_STYLE_WORDS: Record<string, RegExp> = {
    wrap: /\bwrap/i, taco: /\btaco/i, pasta: /\bpasta\b/i,
    "soup-stew": /\b(soup|stew|chili|chowder)\b/i,
    burger: /\bburger/i, sandwich: /\b(sandwich|sub|hoagie)\b/i,
    "loaded-fries": /\b(loaded|fries)\b/i,
    bowl: /\bbowl\b/i,
  };

  for (const [style, pattern] of Object.entries(TITLE_STYLE_WORDS)) {
    if (pattern.test(title) && style !== contentStyle) {
      const ings = ingsText(recipe);
      const steps = stepsText(recipe);
      const evidence = STYLE_EVIDENCE[style];
      if (evidence && !evidence.ingredients.test(ings) && !evidence.steps.test(steps)) {
        return true;
      }
    }
  }

  for (const [cuisineKey, pattern] of Object.entries(CUISINE_TITLE_WORDS)) {
    if (pattern.test(title)) {
      const cuisineInfo = CUISINE_INDICATORS[cuisineKey];
      if (!cuisineInfo) continue;

      if (cuisineInfo.display !== inferredCuisine) {
        const text = fullText(recipe);
        const ings = ingsText(recipe);
        const matches = text.match(cuisineInfo.pattern);
        const unique = new Set((matches || []).map(m => m.toLowerCase()));

        const isHighThreshold = HIGH_THRESHOLD_CUISINES.has(cuisineInfo.display);
        const minRequired = isHighThreshold ? 3 : 2;

        if (unique.size < minRequired) {
          return true;
        }
        if (isHighThreshold && !ASIAN_REQUIRED_INDICATORS.test(ings)) {
          return true;
        }
      }
    }
  }

  return false;
}
