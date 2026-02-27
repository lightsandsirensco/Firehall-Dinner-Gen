import type { GenerateResponse } from "@shared/schema";
import { log } from "./index";

export interface RecipeValidationContext {
  chosenProtein: string;
  meal_style: string;
  cuisine: string;
  appliances: string[];
  allergens: string[];
  recentSignatures?: string[];
  currentRecipeSignature?: string;
}

export interface ValidationResult {
  recipe: GenerateResponse;
  ok: boolean;
  issues: string[];
  actionTaken: string;
  signature: string;
}

function norm(s: string): string {
  return (s || "").toLowerCase().trim();
}

function ingredientText(recipe: GenerateResponse): string {
  return (recipe.ingredients || []).map(i => norm(i.item)).join(" ");
}

function stepText(recipe: GenerateResponse): string {
  return (recipe.steps || []).map(s => `${norm(s.heading)} ${norm(s.body)}`).join(" ");
}

function fullText(recipe: GenerateResponse): string {
  return `${norm(recipe.title)} ${ingredientText(recipe)} ${stepText(recipe)} ${(recipe.pro_tips || []).join(" ").toLowerCase()}`;
}

interface StructureRule {
  requiredIngredient?: RegExp;
  requiredStep?: RegExp;
  label: string;
}

const STRUCTURE_RULE_DEFS: StructureRule[] = [
  { requiredIngredient: /\b(tortilla|wrap|pita|naan|lavash|flatbread|roti)\b/i, requiredStep: /\b(assemble|wrap|roll|fold|fill)\b/i, label: "wrap" },
  { requiredIngredient: /\b(tortilla|taco shell|corn tortilla|flour tortilla)\b/i, requiredStep: /\b(assemble|fill|top|load|build)\b/i, label: "taco" },
  { requiredIngredient: /\b(rice|quinoa|noodle|greens|potato|couscous|grain|farro|barley|bulgur|sweet potato)\b/i, label: "bowl" },
  { requiredIngredient: /\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|orzo|macaroni|noodle|rotini|farfalle|ziti)\b/i, requiredStep: /\b(boil|cook.*pasta|cook.*noodle|drain)\b/i, label: "pasta" },
  { requiredStep: /\b(bake|roast|sheet\s*pan|baking\s*sheet|425|400|450|375)\b/i, label: "sheet-pan" },
  { requiredStep: /\b(bake|roast|oven|425|400|450|375|350)\b/i, label: "bake" },
  { requiredStep: /\b(bake|oven|425|400|450|375|350)\b/i, requiredIngredient: /\b(rice)\b/i, label: "rice-bake" },
  { requiredIngredient: /\b(broth|stock|water)\b/i, requiredStep: /\b(simmer|boil|stew|soup)\b/i, label: "soup-stew" },
  { requiredStep: /\b(stir.?fry|wok|high heat|toss)\b/i, label: "stir-fry" },
  { requiredStep: /\b(grill|char|grill.?pan)\b/i, label: "grill" },
  { requiredIngredient: /\b(bread|bun|roll|baguette|hoagie|sub|ciabatta|sourdough)\b/i, requiredStep: /\b(assemble|layer|stack|build|spread)\b/i, label: "sandwich" },
  { requiredIngredient: /\b(bun|brioche|roll)\b/i, label: "burger" },
  { requiredStep: /\b(stuff|fill|filled|stuffed|hollow)\b/i, label: "stuffed" },
  { requiredStep: /\b(bake|casserole|oven|layer)\b/i, label: "casserole" },
  { requiredIngredient: /\b(flatbread|naan|pita|pizza dough)\b/i, label: "flatbread" },
  { requiredIngredient: /\b(noodle|pasta|soba|udon|rice noodle|ramen|lo mein)\b/i, label: "noodle-toss" },
  { requiredIngredient: /\b(fries|potato|fry)\b/i, label: "loaded-fries" },
  { requiredStep: /\b(skillet|pan|sauté|sear|cook)\b/i, label: "skillet" },
];

function normalizeStyleToLabel(mealStyle: string): string | null {
  const s = norm(mealStyle);
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
  return null;
}

function getRuleForLabel(label: string): StructureRule | undefined {
  return STRUCTURE_RULE_DEFS.find(r => r.label === label);
}

const CUISINE_INDICATORS: Record<string, RegExp> = {
  mexican: /\b(cumin|chili powder|lime|salsa|tortilla|jalapeño|cilantro|chipotle|taco seasoning|enchilada|avocado|queso|beans)\b/i,
  mediterranean: /\b(oregano|lemon|feta|olive|hummus|pita|za'atar|tahini|tzatziki|kalamata|couscous|chickpea)\b/i,
  greek: /\b(oregano|lemon|feta|olive|pita|tzatziki|kalamata|dill|yogurt|cucumber)\b/i,
  asian: /\b(soy sauce|tamari|ginger|sesame|rice vinegar|sriracha|hoisin|wok|stir.?fry|teriyaki|miso|tofu|edamame)\b/i,
  korean: /\b(gochujang|kimchi|sesame|soy sauce|rice vinegar|gochugaru|bibimbap|bulgogi|doenjang)\b/i,
  thai: /\b(coconut milk|lime|fish sauce|thai basil|lemongrass|curry paste|peanut|sriracha|galangal|pad thai)\b/i,
  indian: /\b(curry|garam masala|turmeric|cumin|coriander|naan|tikka|masala|cardamom|chutney|paneer|dal|lentil)\b/i,
  italian: /\b(basil|oregano|tomato|parmesan|mozzarella|garlic|marinara|pasta|olive oil|balsamic|ricotta|prosciutto)\b/i,
  middle_eastern: /\b(za'atar|tahini|sumac|hummus|pita|cumin|coriander|pomegranate|falafel|shawarma)\b/i,
  bbq: /\b(bbq|barbecue|smoky|pulled|smoked|coleslaw|cornbread|brisket)\b/i,
  cajun: /\b(cajun|creole|andouille|jambalaya|gumbo|cayenne|paprika|okra|blackened)\b/i,
  canadian: /\b(maple|poutine|canadian|bacon|back bacon)\b/i,
  japanese: /\b(soy sauce|miso|teriyaki|wasabi|nori|dashi|sake|mirin|panko|tofu)\b/i,
};

const CUISINE_DISPLAY: Record<string, string> = {
  mexican: "Mexican", mediterranean: "Mediterranean", greek: "Greek",
  asian: "Asian", korean: "Korean", thai: "Thai", indian: "Indian",
  italian: "Italian", middle_eastern: "Middle Eastern", bbq: "BBQ",
  cajun: "Cajun", canadian: "Canadian", japanese: "Japanese",
};

const TITLE_INGREDIENT_KEYWORDS = [
  "honey", "hummus", "bbq", "barbecue", "teriyaki", "pesto", "buffalo",
  "ranch", "sriracha", "chipotle", "mango", "avocado", "peanut",
  "sesame", "coconut", "lemon", "lime", "garlic", "maple",
  "mushroom", "spinach", "sweet potato", "broccoli",
  "curry", "chimichurri", "tzatziki", "alfredo", "marinara",
  "parmesan", "feta", "cilantro", "gochujang", "harissa",
  "tahini", "salsa", "kimchi", "wasabi", "miso",
];

const TITLE_STRUCTURE_KEYWORDS: Record<string, RegExp> = {
  wrap: /\bwrap/i,
  taco: /\btaco/i,
  bowl: /\bbowl/i,
  pasta: /\bpasta\b/i,
  "sheet-pan": /\bsheet[\s-]?pan\b/i,
  bake: /\bbake[ds]?\b/i,
  "rice-bake": /\brice\s*bake/i,
  "soup-stew": /\b(soup|stew|chili|chowder)\b/i,
  "stir-fry": /\bstir[\s-]?fry\b/i,
  grill: /\b(grill|grilled|char[\s-]?grill)\b/i,
  sandwich: /\b(sandwich|sub|hoagie)\b/i,
  burger: /\bburger/i,
  stuffed: /\bstuffed\b/i,
  casserole: /\bcasserole/i,
  flatbread: /\bflatbread/i,
  "noodle-toss": /\bnoodle/i,
  "loaded-fries": /\b(loaded|nacho)\s*(fries|fry)\b/i,
  skillet: /\bskillet\b/i,
};

const PROTEIN_TITLE_PATTERNS: Record<string, RegExp> = {
  chicken: /\b(chicken|poultry)\b/i,
  beef: /\b(beef|steak|brisket|ground beef)\b/i,
  pork: /\b(pork|pulled pork|bacon|ham|sausage|tenderloin)\b/i,
  turkey: /\b(turkey)\b/i,
  fish: /\b(fish|salmon|cod|tilapia|halibut|trout|tuna|mahi|snapper|haddock|bass)\b/i,
  seafood: /\b(shrimp|prawn|crab|lobster|scallop|mussel|clam|seafood|fish|salmon|cod|tilapia|tuna)\b/i,
};

const VEG_PROTEIN_TITLE_PATTERN = /\b(chickpea|lentil|bean|tofu|tempeh|quinoa|egg|edamame|paneer|halloumi|seitan|veggie|vegetable|vegitarian|vegetarian)\b/i;

const GLUTEN_ITEMS = /\b(tortilla|bread|bun|roll|pasta|penne|spaghetti|noodle|flatbread|naan|pizza dough|flour|brioche|baguette|ciabatta|sourdough|couscous)\b/i;
const DAIRY_ITEMS = /\b(cheese|cheddar|mozzarella|parmesan|feta|cream|yogurt|butter|milk|halloumi|ricotta)\b/i;

function hasAllergen(item: string, allergens: string[]): boolean {
  const lo = norm(item);
  for (const a of allergens) {
    const al = norm(a);
    if (al === "gluten" && GLUTEN_ITEMS.test(lo)) return true;
    if (al === "dairy" && DAIRY_ITEMS.test(lo)) return true;
    if (al === "nuts" && /\b(peanut|almond|walnut|cashew|pecan|hazelnut|pistachio)\b/i.test(lo)) return true;
    if (al === "soy" && /\b(soy|tofu|edamame|tamari|miso)\b/i.test(lo)) return true;
    if (al === "shellfish" && /\b(shrimp|crab|lobster|mussel|clam|oyster|scallop)\b/i.test(lo)) return true;
    if (al === "eggs" && /\b(egg)\b/i.test(lo)) return true;
    if (lo.includes(al)) return true;
  }
  return false;
}

function validateStructureRules(recipe: GenerateResponse): string[] {
  const issues: string[] = [];
  const style = recipe.meal_style || "";
  const label = normalizeStyleToLabel(style);
  if (!label) return issues;

  const rule = getRuleForLabel(label);
  if (!rule) return issues;

  const ings = ingredientText(recipe);
  const steps = stepText(recipe);

  if (rule.requiredIngredient && !rule.requiredIngredient.test(ings)) {
    issues.push(`structure_missing_ingredient:${rule.label}`);
  }
  if (rule.requiredStep && !rule.requiredStep.test(steps)) {
    issues.push(`structure_missing_step:${rule.label}`);
  }

  return issues;
}

function validateTitleStructureClaims(recipe: GenerateResponse): string[] {
  const issues: string[] = [];
  const title = norm(recipe.title);
  const ings = ingredientText(recipe);
  const steps = stepText(recipe);

  for (const [label, pattern] of Object.entries(TITLE_STRUCTURE_KEYWORDS)) {
    if (!pattern.test(title)) continue;
    const rule = getRuleForLabel(label);
    if (!rule) continue;
    if (rule.requiredIngredient && !rule.requiredIngredient.test(ings)) {
      issues.push(`title_structure_claim:${label}`);
    }
    if (rule.requiredStep && !rule.requiredStep.test(steps)) {
      issues.push(`title_structure_step_claim:${label}`);
    }
  }

  return issues;
}

function validateCuisineProof(recipe: GenerateResponse): string[] {
  const issues: string[] = [];
  const title = norm(recipe.title);
  const text = fullText(recipe);

  for (const [cuisine, pattern] of Object.entries(CUISINE_INDICATORS)) {
    const displayName = CUISINE_DISPLAY[cuisine] || cuisine;
    if (!title.includes(cuisine) && !title.includes(displayName.toLowerCase())) continue;

    const matches = text.match(new RegExp(pattern, "gi"));
    const uniqueMatches = new Set((matches || []).map(m => m.toLowerCase()));
    if (uniqueMatches.size < 2) {
      issues.push(`cuisine_unproven:${cuisine}`);
    }
  }

  return issues;
}

function validateTitleIngredients(recipe: GenerateResponse): string[] {
  const issues: string[] = [];
  const title = norm(recipe.title);
  const ings = ingredientText(recipe);

  for (const keyword of TITLE_INGREDIENT_KEYWORDS) {
    if (title.includes(keyword) && !ings.includes(keyword)) {
      issues.push(`title_missing_ingredient:${keyword}`);
    }
  }

  return issues;
}

function validateProteinInTitle(recipe: GenerateResponse, ctx: RecipeValidationContext): string[] {
  const issues: string[] = [];
  const title = norm(recipe.title);
  const protein = norm(ctx.chosenProtein);

  if (protein === "pantry" || protein === "any") return issues;

  if (protein === "vegetarian") {
    if (!VEG_PROTEIN_TITLE_PATTERN.test(title)) {
      issues.push("title_missing_veg_protein");
    }
    return issues;
  }

  const pattern = PROTEIN_TITLE_PATTERNS[protein];
  if (pattern && !pattern.test(title)) {
    issues.push(`title_missing_protein:${protein}`);
  }

  return issues;
}

function detectBaseCarb(recipe: GenerateResponse): string {
  const ings = ingredientText(recipe);
  if (/\b(rice)\b/i.test(ings) && !/rice vinegar|rice wine|rice paper/i.test(ings)) return "rice";
  if (/\b(pasta|spaghetti|penne|rigatoni|fusilli|linguine|fettuccine|rotini|farfalle|ziti|macaroni)\b/i.test(ings)) return "pasta";
  if (/\b(quinoa)\b/i.test(ings)) return "quinoa";
  if (/\b(potato|potatoes|fries)\b/i.test(ings)) return "potatoes";
  if (/\b(noodle|udon|soba|ramen|lo mein|rice noodle)\b/i.test(ings)) return "noodles";
  if (/\b(bread|bun|roll|baguette|ciabatta|sourdough|brioche)\b/i.test(ings)) return "bread";
  if (/\b(tortilla|taco shell)\b/i.test(ings)) return "tortillas";
  if (/\b(couscous)\b/i.test(ings)) return "couscous";
  if (/\b(flatbread|naan|pita)\b/i.test(ings)) return "flatbread";
  if (/\b(greens|lettuce|spinach|kale|arugula)\b/i.test(ings)) return "greens";
  if (/\b(orzo)\b/i.test(ings)) return "orzo";
  if (/\b(farro|barley|bulgur)\b/i.test(ings)) return "grains";
  return "none";
}

function detectCookingMethod(recipe: GenerateResponse): string {
  const steps = stepText(recipe);
  if (/\bsheet\s*pan\b/i.test(steps)) return "sheet-pan";
  if (/\b(grill|grill.?pan|char.?grill)\b/i.test(steps)) return "grill";
  if (/\boven|bake|roast|425|400|450|375|350/i.test(steps)) return "oven";
  if (/\bstir.?fry|wok\b/i.test(steps)) return "stir-fry";
  if (/\b(skillet|pan|sauté|sear)\b/i.test(steps)) return "stovetop";
  if (/\b(simmer|stew|braise)\b/i.test(steps)) return "stovetop";
  if (/\b(instant.?pot|pressure cook)\b/i.test(steps)) return "instantpot";
  return "stovetop";
}

function detectKeyIngredients(recipe: GenerateResponse): string[] {
  const FILLER = /\b(olive oil|salt|pepper|black pepper|garlic|water|oil|onion|butter)\b/i;
  return (recipe.ingredients || [])
    .map(i => {
      const raw = i.item.replace(/,.*$/, "").trim();
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    })
    .filter(i => i.length > 3 && !FILLER.test(i))
    .slice(0, 6);
}

function detectCuisineFromContent(recipe: GenerateResponse): string {
  const text = fullText(recipe);
  let best = "";
  let bestCount = 0;

  for (const [cuisine, pattern] of Object.entries(CUISINE_INDICATORS)) {
    const matches = text.match(new RegExp(pattern, "gi"));
    const unique = new Set((matches || []).map(m => m.toLowerCase()));
    if (unique.size >= 2 && unique.size > bestCount) {
      bestCount = unique.size;
      best = CUISINE_DISPLAY[cuisine] || cuisine;
    }
  }

  return best;
}

function ensureCanonicalFields(recipe: GenerateResponse): GenerateResponse {
  const tags = recipe.tags ? { ...recipe.tags } : {
    cuisine: "", cooking_method: "", base_carb: "",
    key_ingredients: [] as string[], high_protein: true, high_fiber: false, quick_cleanup: false,
  };

  if (!tags.base_carb) tags.base_carb = detectBaseCarb(recipe);
  if (!tags.cooking_method) tags.cooking_method = detectCookingMethod(recipe);
  if (!tags.key_ingredients || tags.key_ingredients.length === 0) tags.key_ingredients = detectKeyIngredients(recipe);
  if (!tags.cuisine) tags.cuisine = detectCuisineFromContent(recipe);

  return { ...recipe, tags };
}

function cap(s: string): string {
  return s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const LABEL_TO_TITLE_SUFFIX: Record<string, string> = {
  bowl: "Bowls",
  wrap: "Wraps",
  taco: "Tacos",
  "stir-fry": "Stir-Fry",
  burger: "Burgers",
  pasta: "Pasta",
  sandwich: "Sandwiches",
  "soup-stew": "Stew",
  flatbread: "Flatbreads",
  "noodle-toss": "Noodle Toss",
  "loaded-fries": "Loaded Fries",
  casserole: "Casserole",
  stuffed: "Stuffed Peppers",
  bake: "Bake",
  "rice-bake": "Rice Bake",
  "sheet-pan": "Sheet-Pan Dinner",
  grill: "Grill Plates",
  skillet: "Skillet",
  "one-pot": "One-Pot",
  "breakfast-for-dinner": "Breakfast Scramble",
  "stuffed-bread": "Stuffed Bread",
};

const LABEL_TO_TITLE_PREFIX: Record<string, string> = {
  "sheet-pan": "Sheet-Pan",
  skillet: "Skillet",
  "one-pot": "One-Pot",
};

function buildTitleFromContent(recipe: GenerateResponse, ctx: RecipeValidationContext): string {
  const label = normalizeStyleToLabel(recipe.meal_style || "") || "";
  const protein = recipe.primary_protein_source || recipe.chosen_protein || ctx.chosenProtein || "";
  const proteinDisplay = cap(protein);

  const cuisine = recipe.tags?.cuisine || "";
  const cuisineValid = cuisine ? verifyCuisineInContent(cuisine, recipe) : false;

  const ings = ingredientText(recipe);
  const flavorKeyword = findFlavorKeyword(ings);
  const flavorDisplay = flavorKeyword ? cap(flavorKeyword) : "";

  const prefix = LABEL_TO_TITLE_PREFIX[label] || "";
  const suffix = LABEL_TO_TITLE_SUFFIX[label] || "";

  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (cuisineValid && cuisine) parts.push(cuisine);
  if (flavorDisplay && !parts.some(p => norm(p) === norm(flavorDisplay))) parts.push(flavorDisplay);
  parts.push(proteinDisplay);
  if (suffix && !prefix) parts.push(suffix);

  let title = parts.join(" ");
  if (prefix && suffix) {
    title = `${prefix} ${cuisineValid && cuisine ? cuisine + " " : ""}${flavorDisplay ? flavorDisplay + " " : ""}${proteinDisplay} ${suffix}`;
  }

  return title.replace(/\s{2,}/g, " ").trim();
}

function verifyCuisineInContent(cuisine: string, recipe: GenerateResponse): boolean {
  const cuisineKey = norm(cuisine);
  const text = fullText(recipe);

  for (const [key, pattern] of Object.entries(CUISINE_INDICATORS)) {
    const displayLower = norm(CUISINE_DISPLAY[key] || key);
    if (cuisineKey !== key && cuisineKey !== displayLower) continue;
    const matches = text.match(new RegExp(pattern, "gi"));
    const unique = new Set((matches || []).map(m => m.toLowerCase()));
    if (unique.size >= 2) return true;
  }
  return false;
}

function findFlavorKeyword(ings: string): string {
  const flavorWords = [
    "lemon", "lime", "honey", "chipotle", "bbq", "teriyaki", "pesto",
    "buffalo", "sriracha", "sesame", "coconut", "maple", "curry",
    "garlic butter", "herb", "cajun", "smoky", "spicy",
    "gochujang", "harissa", "tahini", "miso", "chimichurri",
  ];
  for (const word of flavorWords) {
    if (ings.includes(word)) return word;
  }
  return "";
}

export function computeSignature(recipe: GenerateResponse): string {
  const style = norm(recipe.meal_style || "");
  const protein = norm(recipe.chosen_protein || "");
  const cuisine = norm(recipe.tags?.cuisine || "");
  const baseCarb = norm(recipe.tags?.base_carb || "");
  const method = norm(recipe.tags?.cooking_method || "");

  const FILLER = /\b(olive oil|salt|pepper|black pepper|garlic|water|oil|onion|vegetable broth|chicken broth)\b/i;
  const coreIngs = (recipe.ingredients || [])
    .map(i => norm(i.item).replace(/,.*$/, "").trim())
    .filter(i => i.length > 2 && !FILLER.test(i))
    .sort()
    .slice(0, 8);

  return `${style}|${protein}|${cuisine}|${baseCarb}|${method}|${coreIngs.join(",")}`;
}

const lastSignaturesByProtein: Record<string, string[]> = {};
const MAX_SIGS_PER_PROTEIN = 20;

export function recordSignature(protein: string, sig: string): void {
  const key = norm(protein);
  if (!lastSignaturesByProtein[key]) lastSignaturesByProtein[key] = [];
  lastSignaturesByProtein[key].push(sig);
  if (lastSignaturesByProtein[key].length > MAX_SIGS_PER_PROTEIN) {
    lastSignaturesByProtein[key].splice(0, lastSignaturesByProtein[key].length - MAX_SIGS_PER_PROTEIN);
  }
}

function isDuplicate(protein: string, sig: string, ctx: RecipeValidationContext): boolean {
  if (ctx.currentRecipeSignature && sig === ctx.currentRecipeSignature) return true;
  if (ctx.recentSignatures && ctx.recentSignatures.includes(sig)) return true;
  const key = norm(protein);
  const serverSigs = lastSignaturesByProtein[key] || [];
  if (serverSigs.includes(sig)) return true;
  return false;
}

function fixStructureIssues(recipe: GenerateResponse, issues: string[], allergens: string[]): GenerateResponse {
  let fixed = { ...recipe, ingredients: [...recipe.ingredients], steps: [...recipe.steps] };

  for (const issue of issues) {
    if (issue.startsWith("structure_missing_ingredient:")) {
      const type = issue.split(":")[1];

      if ((type === "wrap" || type === "taco") && !ingredientText(fixed).match(/tortilla/i)) {
        const item = "Large flour tortillas";
        if (!hasAllergen(item, allergens)) {
          fixed.ingredients.push({ item, amount: "6", notes: "" });
        } else {
          const altItem = "Corn tortillas";
          if (!hasAllergen(altItem, allergens)) {
            fixed.ingredients.push({ item: altItem, amount: "12", notes: "Gluten-free option" });
          } else {
            fixed.ingredients.push({ item: "Large lettuce leaves (for wrapping)", amount: "6", notes: "" });
          }
        }
      }

      if (type === "bowl" && !ingredientText(fixed).match(/rice|quinoa|noodle|greens|potato|couscous/i)) {
        if (!hasAllergen("Rice", allergens)) {
          fixed.ingredients.push({ item: "Rice", amount: "2 cups", notes: "" });
          fixed.steps.unshift({ heading: "Start the rice (high → low, 20 min)", body: "Bring 2 cups rice and 4 cups water to a boil. Reduce to low, cover, and simmer 18-20 minutes until tender." });
        } else {
          fixed.ingredients.push({ item: "Mixed greens", amount: "6 cups", notes: "As a base layer" });
        }
      }

      if (type === "pasta" && !ingredientText(fixed).match(/pasta|spaghetti|penne|noodle/i)) {
        if (!hasAllergen("Penne pasta", allergens)) {
          fixed.ingredients.push({ item: "Penne pasta", amount: "1 lb", notes: "" });
          fixed.steps.unshift({ heading: "Cook the pasta (boiling, 10 min)", body: "Bring a large pot of salted water to a rolling boil. Add pasta and cook until al dente. Drain, reserving ½ cup pasta water." });
        } else {
          fixed.ingredients.push({ item: "Gluten-free pasta", amount: "1 lb", notes: "" });
          fixed.steps.unshift({ heading: "Cook the pasta (boiling, 10 min)", body: "Cook gluten-free pasta according to package directions until al dente. Drain." });
        }
      }

      if (type === "burger" && !ingredientText(fixed).match(/bun/i)) {
        if (!hasAllergen("Burger buns", allergens)) {
          fixed.ingredients.push({ item: "Burger buns", amount: "6", notes: "" });
        } else {
          fixed.ingredients.push({ item: "Lettuce leaves (as burger wraps)", amount: "12", notes: "Gluten-free option" });
        }
      }

      if (type === "sandwich" && !ingredientText(fixed).match(/bread|bun|roll|baguette/i)) {
        if (!hasAllergen("Crusty sub rolls", allergens)) {
          fixed.ingredients.push({ item: "Crusty sub rolls", amount: "6", notes: "" });
          fixed.steps.push({ heading: "Assemble the sandwiches (no heat, 3 min)", body: "Split each roll, layer the filling and toppings inside, and serve." });
        } else {
          fixed.ingredients.push({ item: "Gluten-free wraps", amount: "6", notes: "" });
        }
      }

      if (type === "flatbread" && !ingredientText(fixed).match(/flatbread|naan|pita/i)) {
        if (!hasAllergen("Flatbreads or naan", allergens)) {
          fixed.ingredients.push({ item: "Flatbreads or naan", amount: "6", notes: "" });
        }
      }

      if (type === "loaded-fries" && !ingredientText(fixed).match(/fries|potato/i)) {
        fixed.ingredients.push({ item: "Frozen French fries", amount: "2 lbs", notes: "" });
        fixed.steps.unshift({ heading: "Bake the fries (425°F oven, 20 min)", body: "Spread frozen fries on a lined baking sheet. Bake at 425°F for 20 minutes, flipping halfway, until golden and crispy." });
      }

      if (type === "noodle-toss" && !ingredientText(fixed).match(/noodle|pasta|soba|udon/i)) {
        fixed.ingredients.push({ item: "Rice noodles", amount: "1 lb", notes: "" });
        fixed.steps.unshift({ heading: "Cook the noodles (boiling, 8 min)", body: "Cook rice noodles according to package directions. Drain and rinse with cold water to prevent sticking." });
      }

      if (type === "rice-bake" && !ingredientText(fixed).match(/rice/i)) {
        fixed.ingredients.push({ item: "Rice", amount: "2 cups", notes: "" });
      }

      if (type === "soup-stew" && !ingredientText(fixed).match(/broth|stock/i)) {
        fixed.ingredients.push({ item: "Vegetable broth", amount: "4 cups", notes: "" });
      }
    }

    if (issue.startsWith("structure_missing_step:")) {
      const type = issue.split(":")[1];

      if ((type === "wrap" || type === "taco") && !stepText(fixed).match(/assemble|wrap|roll|fold|fill/i)) {
        fixed.steps.push({ heading: `Assemble the ${type}s (no heat, 3 min)`, body: `Spoon the filling onto each ${type === "taco" ? "tortilla" : "wrap"}. Add toppings and ${type === "wrap" ? "roll tightly" : "fold"} to serve.` });
      }

      if (type === "pasta" && !stepText(fixed).match(/boil|cook.*pasta|drain/i)) {
        fixed.steps.unshift({ heading: "Cook the pasta (boiling, 10 min)", body: "Bring a large pot of salted water to a rolling boil. Add pasta and cook until al dente. Drain, reserving ½ cup pasta water." });
      }

      if (type === "sheet-pan" && !stepText(fixed).match(/bake|roast|sheet/i)) {
        fixed.steps.unshift({ heading: "Preheat oven (425°F, 2 min)", body: "Preheat oven to 425°F. Line a large sheet pan with parchment paper or foil." });
      }

      if (type === "grill" && !stepText(fixed).match(/grill/i)) {
        fixed.steps.unshift({ heading: "Heat the grill pan (medium-high, 3 min)", body: "Heat a grill pan or cast-iron skillet over medium-high heat until very hot. Lightly oil the surface." });
      }

      if (type === "soup-stew" && !stepText(fixed).match(/simmer|boil|stew/i)) {
        fixed.steps.push({ heading: "Simmer until thickened (medium-low, 15 min)", body: "Bring to a gentle boil, then reduce heat and simmer uncovered for 15 minutes until slightly thickened and flavors meld." });
      }

      if (type === "stir-fry" && !stepText(fixed).match(/stir.?fry|wok|toss/i)) {
        fixed.steps.push({ heading: "Stir-fry over high heat (high, 3-4 min)", body: "Toss everything together in the hot pan over high heat for 3-4 minutes until heated through and slightly charred at the edges." });
      }
    }
  }

  return fixed;
}

function shouldRebuildTitle(allIssues: string[]): boolean {
  return allIssues.some(i =>
    i.startsWith("cuisine_unproven:") ||
    i.startsWith("title_missing_ingredient:") ||
    i.startsWith("title_structure_claim:") ||
    i.startsWith("title_structure_step_claim:") ||
    i.startsWith("title_missing_protein:") ||
    i === "title_missing_veg_protein"
  );
}

export function validateAndFixRecipe(
  recipe: GenerateResponse,
  ctx: RecipeValidationContext
): ValidationResult {
  const issues: string[] = [];
  const actions: string[] = [];
  let fixedRecipe = { ...recipe };

  fixedRecipe = ensureCanonicalFields(fixedRecipe);

  const structureIssues = validateStructureRules(fixedRecipe);
  issues.push(...structureIssues);

  const titleStructureIssues = validateTitleStructureClaims(fixedRecipe);
  issues.push(...titleStructureIssues);

  const cuisineIssues = validateCuisineProof(fixedRecipe);
  issues.push(...cuisineIssues);

  const titleIngIssues = validateTitleIngredients(fixedRecipe);
  issues.push(...titleIngIssues);

  const proteinTitleIssues = validateProteinInTitle(fixedRecipe, ctx);
  issues.push(...proteinTitleIssues);

  if (structureIssues.length > 0) {
    fixedRecipe = fixStructureIssues(fixedRecipe, structureIssues, ctx.allergens);
    actions.push("structure_fixed");
  }

  if (shouldRebuildTitle(issues)) {
    const rebuilt = buildTitleFromContent(fixedRecipe, ctx);
    if (rebuilt && rebuilt.length > 5) {
      fixedRecipe = { ...fixedRecipe, title: rebuilt };
      actions.push("title_rebuilt");
    }
    if (cuisineIssues.length > 0) {
      const tags = fixedRecipe.tags ? { ...fixedRecipe.tags } : undefined;
      if (tags) {
        for (const issue of cuisineIssues) {
          const cuisine = issue.split(":")[1];
          if (tags.cuisine && norm(tags.cuisine) === cuisine) {
            tags.cuisine = detectCuisineFromContent(fixedRecipe);
          }
        }
        fixedRecipe = { ...fixedRecipe, tags };
      }
    }
  }

  fixedRecipe = ensureCanonicalFields(fixedRecipe);

  const sig = computeSignature(fixedRecipe);

  if (isDuplicate(ctx.chosenProtein, sig, ctx)) {
    issues.push("duplicate_signature");
    actions.push("duplicate_detected");
  }

  const actionTaken = actions.length > 0 ? actions.join("+") : "none";

  log(
    `[validator] ok=${issues.length === 0}, action=${actionTaken}, issues=${issues.length}, ` +
    `meal_style=${fixedRecipe.meal_style || "?"}, protein=${ctx.chosenProtein}, ` +
    `cuisine=${fixedRecipe.tags?.cuisine || "?"}, baseCarb=${fixedRecipe.tags?.base_carb || "?"}, ` +
    `method=${fixedRecipe.tags?.cooking_method || "?"}, ` +
    `sig=${sig.substring(0, 60)}..., title="${fixedRecipe.title}"`,
    "validator"
  );

  return {
    recipe: fixedRecipe,
    ok: issues.length === 0,
    issues,
    actionTaken,
    signature: sig,
  };
}
