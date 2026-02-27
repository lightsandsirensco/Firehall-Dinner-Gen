import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse, ProteinSafetyItem, RecipeTags } from "@shared/schema";
import { log } from "./index";
import { getForbiddenProteinsText, validateProteinCompliance, validateTitleConsistency, validateStructure, validateVegVariety, commitVegBase, getRecentVegBases } from "./protein-validator";
import { type VarietyConstraints, buildVarietyPromptBlock, buildHealthyPromptBlock } from "./variety-memory";
import { type StructureType, STRUCTURE_DISPLAY } from "./structure-variety";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_PROTEIN_RETRIES = 4;

export interface AIResult {
  recipe: GenerateResponse;
  tokensIn: number;
  tokensOut: number;
  fallback?: boolean;
}

type ErrorCategory = "json_parse_failed" | "schema_invalid" | "ai_timeout" | "ai_empty" | "protein_mismatch" | "unknown";

function logError(category: ErrorCategory, detail: string, rawSnippet?: string) {
  log(`[${category}] ${detail}${rawSnippet ? ` | raw(${rawSnippet.length}): ${rawSnippet.substring(0, 600)}` : ""}`, "ai");
}

const SAFETY_TEMPS: Record<string, ProteinSafetyItem> = {
  chicken: { protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Into the thickest part of the cut, avoid touching fat or any bone", notes: "All poultry must reach 165°F for safety." },
  turkey: { protein: "Turkey", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Into the thickest part of the cut, avoid touching fat or any bone", notes: "All poultry must reach 165°F for safety." },
  beef: { protein: "Beef (steak/cut)", target_temp_f: 145, target_temp_c: 63, rest_minutes: 3, probe_where: "Center of the thickest portion", notes: "For ground beef, cook to 160°F/71°C with no rest required." },
  pork: { protein: "Pork", target_temp_f: 145, target_temp_c: 63, rest_minutes: 3, probe_where: "Center of the thickest portion", notes: "Allow a 3-minute rest for carryover." },
  fish: { protein: "Fish", target_temp_f: 145, target_temp_c: 63, rest_minutes: 0, probe_where: "Center of the thickest portion", notes: "Fish should flake easily with a fork when done." },
  vegetarian: { protein: "General food safety", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Center of dish", notes: "Reheat leftovers to 165°F." },
};

function inferSafetyTemps(chosenProtein: string): ProteinSafetyItem[] {
  const key = chosenProtein.toLowerCase();
  const item = SAFETY_TEMPS[key];
  if (item) return [item];
  if (key.includes("ground")) {
    return [{ protein: `Ground ${chosenProtein}`, target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of the thickest portion of the cooked ground mass", notes: "No rest needed for ground meat." }];
  }
  return [];
}

function extractJSON(raw: string): string | null {
  const trimmed = raw.trim();

  const noBackticks = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");

  const first = noBackticks.indexOf("{");
  const last = noBackticks.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;

  const candidate = noBackticks.substring(first, last + 1);
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    // ignore
  }

  const match = candidate.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      JSON.parse(match[0]);
      return match[0];
    } catch {
      // ignore
    }
  }

  return null;
}

function safeParseJSON(content: string): GenerateResponse | null {
  try {
    return JSON.parse(content) as GenerateResponse;
  } catch {
    const extracted = extractJSON(content);
    if (extracted) {
      try {
        return JSON.parse(extracted) as GenerateResponse;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function fillDefaults(recipe: GenerateResponse, template: TemplateRow, chosenProtein: string, budgetLevel: string): GenerateResponse {
  recipe.template_id = parseInt(template.template_id);
  if (chosenProtein !== "pantry") {
    recipe.chosen_protein = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  } else if (!recipe.chosen_protein) {
    recipe.chosen_protein = "Pantry mix";
  }
  recipe.budget_level = budgetLevel;

  if (!recipe.primary_protein_source) {
    const lower = (chosenProtein || "").toLowerCase();
    if (lower === "vegetarian") {
      const VEG_SOURCES = ["lentils", "chickpeas", "black beans", "kidney beans", "white beans", "tempeh", "tofu", "seitan", "edamame", "greek yogurt", "eggs", "quinoa", "paneer"];
      const text = [
        recipe.title || "",
        ...(recipe.ingredients || []).map((i: any) => i.item || ""),
      ].join(" ").toLowerCase();
      recipe.primary_protein_source = VEG_SOURCES.find(s => text.includes(s)) || "mixed vegetables";
    } else if (lower === "pantry") {
      const text = [recipe.title || "", ...(recipe.ingredients || []).map((i: any) => i.item || "")].join(" ").toLowerCase();
      const PROTEINS = ["chicken", "beef", "pork", "turkey", "salmon", "shrimp", "tofu", "lentils", "chickpeas", "black beans"];
      recipe.primary_protein_source = PROTEINS.find(s => text.includes(s)) || "mixed";
    } else {
      recipe.primary_protein_source = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
    }
  }

  if (!recipe.budget_tips || !Array.isArray(recipe.budget_tips)) recipe.budget_tips = [];
  if (!recipe.pro_tips || !Array.isArray(recipe.pro_tips)) recipe.pro_tips = [];
  if (!recipe.timing) recipe.timing = { prep_minutes: 0, cook_minutes: 0, total_minutes: 0 };

  if (!recipe.protein_safety || !Array.isArray(recipe.protein_safety) || recipe.protein_safety.length === 0) {
    recipe.protein_safety = inferSafetyTemps(chosenProtein);
  }

  if (!recipe.macros_per_serving) {
    recipe.macros_per_serving = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
  }
  if (!recipe.cleanup_tip) recipe.cleanup_tip = "";
  if (!recipe.ingredients_used) recipe.ingredients_used = [];
  if (!recipe.extra_items_needed) recipe.extra_items_needed = [];

  if (!recipe.tags || typeof recipe.tags !== "object") {
    recipe.tags = { cuisine: "", cooking_method: "", base_carb: "", key_ingredients: [], high_protein: false, high_fiber: false, quick_cleanup: false };
  } else {
    const t = recipe.tags as any;
    recipe.tags = {
      cuisine: t.cuisine || "",
      cooking_method: t.cooking_method || "",
      base_carb: t.base_carb || "",
      key_ingredients: Array.isArray(t.key_ingredients) ? t.key_ingredients : [],
      high_protein: !!t.high_protein,
      high_fiber: !!t.high_fiber,
      quick_cleanup: !!t.quick_cleanup,
    };
  }

  if (recipe.steps && Array.isArray(recipe.steps)) {
    recipe.steps = recipe.steps.map((s: any) => {
      if (typeof s === "string") return { heading: "", body: s };
      if (s && typeof s === "object") return { heading: s.heading || "", body: s.body || s.step || s.instruction || String(s) };
      return { heading: "", body: String(s) };
    });
  }

  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map((ing: any) => {
      if (typeof ing === "string") return { item: ing, amount: "", notes: "" };
      if (ing && typeof ing === "object") return { item: ing.item || ing.name || String(ing), amount: ing.amount || ing.quantity || "", notes: ing.notes || "" };
      return { item: String(ing), amount: "", notes: "" };
    });
  }

  return recipe;
}

function isRecipeValid(recipe: GenerateResponse): { valid: boolean; reason?: string } {
  if (!recipe.title || typeof recipe.title !== "string" || recipe.title.length < 3) {
    return { valid: false, reason: "Missing or empty title" };
  }
  if (!recipe.ingredients || !Array.isArray(recipe.ingredients) || recipe.ingredients.length < 2) {
    return { valid: false, reason: "Missing or insufficient ingredients" };
  }
  if (!recipe.steps || !Array.isArray(recipe.steps) || recipe.steps.length < 2) {
    return { valid: false, reason: "Missing or insufficient steps" };
  }
  return { valid: true };
}

const AI_CALL_TIMEOUT_MS = 35_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`AI call timed out after ${ms}ms (${label})`));
    }, ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

async function callAI(
  prompt: string,
  systemPrompt: string,
  isRetry: boolean = false,
  timeoutMs: number = AI_CALL_TIMEOUT_MS
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const retryAddendum = isRetry ? " IMPORTANT: Return ONLY valid JSON that exactly matches the schema. No extra text, no backticks, no markdown." : "";
  const finalSystem = systemPrompt + retryAddendum;

  try {
    const startMs = Date.now();
    const apiPromise = openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: finalSystem },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const response = await withTimeout(apiPromise, timeoutMs, isRetry ? "retry" : "primary");

    const elapsed = Date.now() - startMs;
    const choice = response.choices[0];
    const content = choice?.message?.content;
    const usage = response.usage;

    log(`AI call completed in ${elapsed}ms (retry=${isRetry})`, "perf");

    if (content && content.trim().length > 10) {
      return {
        content,
        tokensIn: usage?.prompt_tokens || 0,
        tokensOut: usage?.completion_tokens || 0,
      };
    }

    logError("ai_empty", `Empty/short response (${content?.length || 0} chars)`, content || "");
    throw new Error("AI returned empty response");
  } catch (err: any) {
    if (err.message === "AI returned empty response") throw err;
    if (err.message?.includes("timed out")) {
      logError("ai_timeout", err.message);
    } else if (err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
      logError("ai_timeout", err.message);
    } else {
      logError("unknown", err.message);
    }
    throw err;
  }
}

function tryParseRecipe(
  content: string,
  template: TemplateRow,
  chosenProtein: string,
  budgetLevel: string
): GenerateResponse | null {
  const parseStart = Date.now();

  const recipe = safeParseJSON(content);
  if (!recipe) {
    logError("json_parse_failed", "All extraction methods failed", content);
    return null;
  }

  const filled = fillDefaults(recipe, template, chosenProtein, budgetLevel);
  const validation = isRecipeValid(filled);
  if (!validation.valid) {
    logError("schema_invalid", validation.reason || "Unknown schema issue");
    return null;
  }

  log(`Parse+validate completed in ${Date.now() - parseStart}ms`, "perf");
  return filled;
}

const CUISINE_DISPLAY_NAMES: Record<string, string> = {
  mediterranean: "Mediterranean",
  mexican: "Mexican / Tex-Mex",
  italian: "Italian-Inspired",
  asian: "Asian-Inspired",
  korean: "Korean-Inspired",
  thai: "Thai-Inspired",
  indian: "Indian-Inspired",
  middle_eastern: "Middle Eastern",
  bbq: "BBQ / Smoky",
  cajun: "Cajun / Southern",
  canadian: "Canadian Classics",
};

function buildCuisineDirective(cuisineStyle: string): string {
  if (!cuisineStyle || cuisineStyle === "any") return "";
  const displayName = CUISINE_DISPLAY_NAMES[cuisineStyle] || cuisineStyle;
  return `CUISINE STYLE (FLAVOR LAYER — mandatory): This recipe MUST use a ${displayName} flavor profile. Use ${displayName} spices, sauces, seasoning blends, and ingredient combinations. The dish name, aromatics, and key flavors must clearly reflect ${displayName} cuisine. This is a flavor directive only — it does NOT override protein selection, allergies, time, or healthiness constraints. If constraints conflict (e.g. dairy-free + Italian), adapt creatively within the cuisine (e.g. olive oil instead of butter/cheese).`;
}

function buildFilterSummary(request: GenerateRequest): string {
  const parts = [
    `crew=${request.crew_size}`,
    `shift=${request.busy_level}`,
    `time=${request.time_available}`,
    `appliances=${request.appliances.join("+")}`,
    `health=${request.healthiness_preference}`,
    `budget=${request.budget_level || "standard"}`,
    `cuisine=${request.cuisine_style || "any"}`,
  ];
  if (request.use_what_we_have) parts.push("pantry=yes");
  if (request.vegetarian_swap_needed) parts.push("veg=yes");
  if (request.allergens_to_avoid.length) parts.push(`allergens=${request.allergens_to_avoid.join("+")}`);
  if (!request.use_what_we_have) parts.push(`proteins=${request.proteins.join("+")}`);
  return parts.join(" | ");
}

const MEAL_FORMAT_RULES: Record<string, string> = {
  burger: "FORMAT RULES (BURGER — STRICT): Must include buns (or lettuce wrap if low carb). Final step must assemble the burger. Do NOT include rice. Do NOT say 'serve over rice'. Do NOT include tortillas.",
  tacos: "FORMAT RULES (TACOS — STRICT): Must include tortillas (corn or flour). Final step must assemble tacos. Do NOT include buns. Do NOT say 'serve over rice'. Do NOT include rice.",
  wrap: "FORMAT RULES (WRAP — STRICT): Must include a large tortilla or wrap. Final step must roll or fold the wrap. Do NOT include buns. Do NOT say 'serve over rice'. Do NOT include rice.",
  bowl: "FORMAT RULES (BOWL — STRICT): Must include a base layer: rice, quinoa, potatoes, or greens. Final step must say 'serve in a bowl' or 'serve over [base]'. Do NOT include buns or tortillas.",
  pasta: "FORMAT RULES (PASTA — STRICT): Must include pasta (any shape). Final step must toss or combine with pasta. Do NOT include buns or tortillas. Do NOT include rice.",
  salad: "FORMAT RULES (SALAD — STRICT): Must include greens or a salad base. Final step must toss or plate the salad. Do NOT include buns or tortillas. Do NOT include rice. Do NOT include pasta.",
  sheet_pan: "FORMAT RULES (SHEET PAN — STRICT): Must include an oven temperature and a roasting step on a sheet pan. Must NOT be a stovetop-only recipe. Do NOT include rice. Do NOT say 'serve over rice'.",
  stir_fry: "FORMAT RULES (STIR FRY — STRICT): Must use high-heat skillet or wok stir-fry technique. Do NOT include buns or tortillas. Do NOT default to rice — only include rice if the format is also a bowl.",
  soup_chili: "FORMAT RULES (SOUP/CHILI — STRICT): Must include a simmer time. Serve in a bowl. Do NOT include rice. Do NOT include buns or tortillas.",
  breakfast: "FORMAT RULES (BREAKFAST — STRICT): Must include a breakfast anchor: eggs, oats, yogurt, pancakes, or similar. Do NOT include rice. Do NOT include buns or tortillas.",
};

function buildMealFormatBlock(mealFormat: string | undefined): string {
  if (!mealFormat || mealFormat === "random") {
    return "CARB RULE: Do not default to rice. Only include a carb (rice, pasta, bread, tortillas, etc.) if it is integral to the dish style. Vary the base across generations.";
  }
  return MEAL_FORMAT_RULES[mealFormat] || "";
}

const STRUCTURAL_CONSISTENCY_RULES = `STRUCTURAL CONSISTENCY RULES (STRICT): The recipe title, ingredients, and instructions must be fully aligned. If the title contains a descriptive claim, it must be reflected in both ingredients and instructions. Examples: If the title includes "cheesy", the ingredients must contain a cheese product and the instructions must include adding or melting the cheese. If the title includes "creamy", the ingredients must contain a cream-based ingredient (cream, milk, yogurt, coconut milk, cream cheese, etc.) and the instructions must show it being incorporated. If the title includes "stuffed", the instructions must explicitly describe stuffing or filling the item. If the title includes a protein (e.g., chicken, pork, tofu), that protein must appear in the ingredients and be used in the instructions. Do not generate titles that exaggerate or misrepresent the ingredients.`;

const SYSTEM_PROMPT = `Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown. The recipe MUST use ONLY the specified protein — no substitutions. ${STRUCTURAL_CONSISTENCY_RULES}`;
const PANTRY_SYSTEM_PROMPT = `Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown. ${STRUCTURAL_CONSISTENCY_RULES}`;

function buildPrompt(template: TemplateRow, request: GenerateRequest, chosenProtein: string, varietyBlock: string, healthyBlock: string, structureType?: StructureType): string {
  const proteinDisplay = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  const budgetLevel = request.budget_level || "standard";
  const forbiddenText = getForbiddenProteinsText(chosenProtein);

  const allergenLine = request.allergens_to_avoid.length > 0
    ? `ALLERGIES (CRITICAL): ${request.allergens_to_avoid.join(", ")} — exclude ALL ingredients with these allergens from main recipe AND veg option.`
    : "";

  const budgetLine = budgetLevel === "low"
    ? `BUDGET: LOW ($). Prefer cheap cuts/staples, avoid premium items. Include "budget_tips": ["tip1","tip2"] with 2-3 cost-saving tactics.`
    : budgetLevel === "splurge"
    ? `BUDGET: SPLURGE ($$$). Premium ingredients allowed. No budget_tips needed.`
    : `BUDGET: STANDARD ($$).`;

  const vegLine = request.vegetarian_swap_needed
    ? `VEG OPTION: 1 crew member is vegetarian. Add "veg_option" with swap_protein (chickpeas/lentils/black beans/tofu/tempeh/paneer/plant-based ground), ingredients (additional only), steps, plating_notes. Same base sauce/spices. Separate pan. Label "VEG".${request.allergens_to_avoid.includes("dairy") ? " No paneer." : ""}${request.allergens_to_avoid.includes("soy") ? " No tofu/tempeh." : ""}`
    : "";

  const cuisineLine = buildCuisineDirective(request.cuisine_style || "any");
  const mealFormatBlock = buildMealFormatBlock(request.meal_format);

  const structureLine = structureType
    ? `MEAL STRUCTURE (mandatory): This recipe MUST be a ${STRUCTURE_DISPLAY[structureType]} style meal. The dish format, title, and presentation must clearly be a ${STRUCTURE_DISPLAY[structureType]}. Do NOT repeat the same structure as previous recipes.`
    : `MEAL STRUCTURE: Vary the structure. Use different formats like wraps, tacos, sheet-pan, pasta, one-pot, stuffed, casserole, stir-fry, etc. across generations.`;

  const isVegetarian = chosenProtein.toLowerCase() === "vegetarian";
  const isSeafood = chosenProtein.toLowerCase() === "seafood";

  const recentVegBases = isVegetarian ? getRecentVegBases(3) : [];
  const vegVarietyLine = isVegetarian && recentVegBases.length > 0
    ? ` PROTEIN VARIETY (mandatory): Do NOT default to tofu. Rotate the primary vegetarian protein. Recently used: ${recentVegBases.join(", ")} — pick a DIFFERENT one from this list: lentils, chickpeas, black beans, kidney beans, white beans, quinoa, tempeh, seitan, greek yogurt, eggs, edamame.`
    : isVegetarian
    ? ` PROTEIN VARIETY (mandatory): Do NOT default to tofu. Pick the primary protein from this rotation list: lentils, chickpeas, black beans, kidney beans, white beans, quinoa, tempeh, seitan, greek yogurt, eggs, edamame.`
    : "";

  const proteinDirective = isVegetarian
    ? `DIET CONSTRAINT (STRICT VEGETARIAN): Vegetarian means ZERO meat and ZERO seafood. Do NOT include: chicken, beef, pork, turkey, lamb, veal, fish, salmon, tuna, shrimp, crab, lobster, scallops, anchovies, or any other meat/seafood. Do NOT include meat or fish broths (chicken broth, chicken stock, beef broth, beef stock, fish stock, bone broth). Do NOT include gelatin, fish sauce, anchovy paste, oyster sauce, worcestershire sauce, lard, tallow, suet, dripping, schmaltz, demi-glace. Eggs and dairy ARE allowed unless restricted by allergens below. Use vegetable broth/stock instead of any animal broth. Use soy sauce or tamari instead of fish sauce/oyster sauce. If any prohibited ingredient appears, the recipe is INVALID. The title must clearly reflect it is a vegetarian dish. FORBIDDEN (do NOT include ANY of these): ${forbiddenText}.${vegVarietyLine}${request.allergens_to_avoid.includes("dairy") ? " ALLERGEN: No paneer, cheese, yogurt, cream, butter, or any dairy." : ""}${request.allergens_to_avoid.includes("soy") ? " ALLERGEN: No tofu, tempeh, soy sauce, or edamame." : ""}${request.allergens_to_avoid.includes("eggs") ? " ALLERGEN: No eggs." : ""}`
    : isSeafood
    ? `PROTEIN (STRICT — SEAFOOD ONLY): Use seafood as the ONLY protein — fish (salmon, tuna, cod, tilapia, halibut, etc.) or shellfish (shrimp, prawns, crab, lobster, scallops, clams, mussels, etc.). Do NOT include ANY land meat: chicken, beef, pork, turkey, lamb, duck, sausage, bacon, or any other land-animal protein. Do NOT use meat-based broths/stocks (chicken broth, chicken stock, beef broth, beef stock, bone broth). Use seafood stock, fish stock, or vegetable broth instead. The title must clearly feature the seafood used. FORBIDDEN (do NOT include ANY of these): ${forbiddenText}. If any land meat appears, the recipe is INVALID — regenerate.`
    : `PROTEIN (STRICT): Recipe MUST use ${proteinDisplay} as the ONLY animal protein. Do not include, mention, or substitute any other meat or animal protein. The title MUST include the word "${proteinDisplay}". Every meat ingredient MUST be ${proteinDisplay}. FORBIDDEN proteins (do NOT use any of these): ${forbiddenText}.`;

  return `Generate ONE firehall meal as JSON.

TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
${proteinDirective}
Healthiness: ${request.healthiness_preference}
${structureLine}
${mealFormatBlock}
${cuisineLine}
${allergenLine}
${budgetLine}
${vegLine}

${varietyBlock}

${healthyBlock}

RULES: ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. ${isVegetarian ? "25-45g" : "35-60g"} protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "${isVegetarian ? "Sauté the chickpeas (medium-high, 4-5 min)" : "Sear the chicken (medium-high, 5-7 min)"}". body = concise HOW-TO with visual/doneness cue. Include: heat level (low/medium/medium-high/high or oven °F), time estimate, and a doneness cue ("until golden brown", "until fragrant", "until heated through"). Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
${isVegetarian ? "SAFETY: Reheat leftovers to 165°F. Ensure tofu/tempeh is cooked through." : "SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C."}
PRIMARY PROTEIN SOURCE: Set "primary_protein_source" to the single main protein ingredient (e.g. "chicken", "lentils", "salmon", "chickpeas", "tofu", "eggs"). For vegetarian: name the specific plant protein used most.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (the actual carb used, or empty string if none), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

JSON:
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","primary_protein_source":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[],"tags":{"cuisine":"","cooking_method":"","base_carb":"","key_ingredients":[],"high_protein":false,"high_fiber":false,"quick_cleanup":false}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;
}

function buildPantryPrompt(template: TemplateRow, request: GenerateRequest, varietyBlock: string, healthyBlock: string, structureType?: StructureType): string {
  const ingredientsList = (request.ingredients_on_hand || []).join(", ");
  const budgetLevel = request.budget_level || "standard";

  const allergenLine = request.allergens_to_avoid.length > 0
    ? `ALLERGIES (CRITICAL): ${request.allergens_to_avoid.join(", ")} — exclude ALL.`
    : "";

  const budgetLine = budgetLevel === "low"
    ? `BUDGET: LOW ($). Extra items should be cheap staples only. Include "budget_tips":["tip1","tip2"].`
    : budgetLevel === "splurge"
    ? `BUDGET: SPLURGE ($$$). Premium extras allowed.`
    : `BUDGET: STANDARD ($$).`;

  const vegLine = request.vegetarian_swap_needed
    ? `VEG OPTION: 1 person. Add "veg_option" with swap_protein, ingredients, steps, plating_notes. No tofu if soy allergy, no paneer if dairy allergy.`
    : "";

  const cuisineLine = buildCuisineDirective(request.cuisine_style || "any");
  const mealFormatBlock = buildMealFormatBlock(request.meal_format);

  const structureLine = structureType
    ? `MEAL STRUCTURE (mandatory): This recipe MUST be a ${STRUCTURE_DISPLAY[structureType]} style meal. Vary the format.`
    : `MEAL STRUCTURE: Vary the structure.`;

  const isPantryVegetarian = (request.proteins || []).some(p => p.toLowerCase() === "vegetarian");
  const pantryRecentVeg = isPantryVegetarian ? getRecentVegBases(3) : [];
  const pantryVegVariety = isPantryVegetarian && pantryRecentVeg.length > 0
    ? ` PROTEIN VARIETY (mandatory): Do NOT default to tofu. Recently used: ${pantryRecentVeg.join(", ")} — pick a DIFFERENT primary protein from: lentils, chickpeas, black beans, kidney beans, white beans, quinoa, tempeh, seitan, greek yogurt, eggs, edamame.`
    : isPantryVegetarian
    ? ` PROTEIN VARIETY (mandatory): Do NOT default to tofu. Pick the primary protein from: lentils, chickpeas, black beans, kidney beans, white beans, quinoa, tempeh, seitan, greek yogurt, eggs, edamame.`
    : "";
  const pantryVegLine = isPantryVegetarian
    ? `DIET CONSTRAINT (STRICT VEGETARIAN): Vegetarian means ZERO meat and ZERO seafood. Do NOT include: chicken, beef, pork, turkey, lamb, veal, fish, salmon, tuna, shrimp, crab, lobster, scallops, anchovies, or any other meat/seafood. Do NOT include meat or fish broths (chicken broth, chicken stock, beef broth, beef stock, fish stock, bone broth). Do NOT include gelatin, fish sauce, anchovy paste, oyster sauce, worcestershire sauce, lard, tallow, suet, dripping, schmaltz, demi-glace. Eggs and dairy ARE allowed${request.allergens_to_avoid.includes("dairy") ? " — EXCEPT dairy is an allergen, so NO paneer, cheese, yogurt, cream, butter, or any dairy" : ""}${request.allergens_to_avoid.includes("soy") ? " — EXCEPT soy is an allergen, so NO tofu, tempeh, soy sauce, or edamame" : ""}${request.allergens_to_avoid.includes("eggs") ? " — EXCEPT eggs are an allergen, so NO eggs" : ""}. Use vegetable broth/stock instead of any animal broth. If any prohibited ingredient appears, the recipe is INVALID.${pantryVegVariety}`
    : "";

  return `Generate ONE firehall meal as JSON using crew's on-hand ingredients.

ON HAND: ${ingredientsList}
TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
Healthiness: ${request.healthiness_preference}
${structureLine}
${mealFormatBlock}
${cuisineLine}
${allergenLine}
${budgetLine}
${vegLine}
${pantryVegLine}

${varietyBlock}

${healthyBlock}

RULES: Use as many on-hand ingredients as practical. List used ones in "ingredients_used". List 1-4 extras needed in "extra_items_needed" (skip basic pantry staples). ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. ${isPantryVegetarian ? "25-45g" : "35-60g"} protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "Sear the chicken (medium-high, 5-7 min)". body = concise HOW-TO with visual/doneness cue. Include: heat level (low/medium/medium-high/high or oven °F), time estimate, and a doneness cue ("until golden brown", "until juices run clear", "until internal temp reaches 165°F"). Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C.
PRIMARY PROTEIN SOURCE: Set "primary_protein_source" to the single main protein ingredient (e.g. "chicken", "lentils", "salmon", "chickpeas", "tofu", "eggs"). For vegetarian: name the specific plant protein used most.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (the actual carb used, or empty string if none), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

JSON:
{"template_id":${template.template_id},"chosen_protein":"","primary_protein_source":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"ingredients_used":[],"extra_items_needed":[],"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[],"tags":{"cuisine":"","cooking_method":"","base_carb":"","key_ingredients":[],"high_protein":false,"high_fiber":false,"quick_cleanup":false}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;
}

async function attemptGenerate(
  prompt: string,
  systemPrompt: string,
  template: TemplateRow,
  chosenProtein: string,
  budgetLevel: string,
  isRetry: boolean
): Promise<{ recipe: GenerateResponse; tokensIn: number; tokensOut: number } | null> {
  try {
    const { content, tokensIn, tokensOut } = await callAI(prompt, systemPrompt, isRetry);
    const recipe = tryParseRecipe(content, template, chosenProtein, budgetLevel);
    if (recipe) return { recipe, tokensIn, tokensOut };
    return null;
  } catch (err: any) {
    if (err.message?.includes("timed out")) throw err;
    return null;
  }
}

async function fallbackRemix(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string
): Promise<AIResult | null> {
  const proteinDisplay = chosenProtein === "pantry" ? "any protein from ingredients" : chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  const budgetLevel = request.budget_level || "standard";

  const fallbackPrompt = `Creatively remix this template into a unique firehall meal as JSON.

TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
PROTEIN: ${proteinDisplay}
CREW SIZE: ${request.crew_size}
HEALTHINESS: ${request.healthiness_preference}
TIME: ${request.time_available} min
${request.allergens_to_avoid.length > 0 ? `AVOID: ${request.allergens_to_avoid.join(", ")}` : ""}

Give it a creative twist — different sauce, spice profile, or side variation. Keep it practical for a fire station kitchen.
Return ONLY valid JSON matching this schema exactly:
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","primary_protein_source":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[]}`;

  try {
    log(`Fallback remix attempt for template: ${template.template_name}`, "ai");
    const { content, tokensIn, tokensOut } = await callAI(
      fallbackPrompt,
      "Creative firehall chef. Return ONLY valid JSON. No markdown.",
      false
    );

    const recipe = tryParseRecipe(content, template, chosenProtein, budgetLevel);
    if (recipe) {
      log(`Fallback remix succeeded: "${recipe.title}"`, "ai");
      return { recipe, tokensIn, tokensOut, fallback: true };
    }
    return null;
  } catch {
    logError("unknown", "Fallback remix also failed");
    return null;
  }
}

function runValidationGates(
  recipe: GenerateResponse,
  proteinMode: string
): { ok: boolean; reasons: string[]; vegBase?: string } {
  const reasons: string[] = [];

  const v1 = validateStructure(recipe);
  if (!v1.ok) reasons.push(...v1.reasons);

  const v2 = validateProteinCompliance(recipe, proteinMode);
  if (!v2.valid) reasons.push(v2.reason || "protein_invalid");

  const v3 = validateTitleConsistency(recipe);
  if (!v3.ok) reasons.push(...v3.reasons);

  let vegBase: string | undefined;
  if (proteinMode === "vegetarian") {
    const v4 = validateVegVariety(recipe);
    if (!v4.ok) reasons.push(...v4.reasons);
    else vegBase = v4.base;
  }

  return { ok: reasons.length === 0, reasons, vegBase };
}

export async function generateRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string,
  varietyConstraints?: VarietyConstraints,
  structureType?: StructureType
): Promise<AIResult> {
  const genStart = Date.now();
  const budgetLevel = request.budget_level || "standard";
  const proteinDisplay = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  const filterSummary = buildFilterSummary(request);

  log(`Generating: ${template.template_name} (ID: ${template.template_id}), protein: ${proteinDisplay}, structure: ${structureType || "any"} | ${filterSummary}`, "ai");

  const varietyBlock = varietyConstraints ? buildVarietyPromptBlock(varietyConstraints) : "";
  const healthyBlock = buildHealthyPromptBlock(request.healthiness_preference, request.busy_level);
  const prompt = buildPrompt(template, request, chosenProtein, varietyBlock, healthyBlock, structureType);
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  let lastRecipe: GenerateResponse | null = null;
  let lastReasons: string[] = [];

  for (let attempt = 1; attempt <= MAX_PROTEIN_RETRIES; attempt++) {
    const isRetry = attempt > 1;
    const result = await attemptGenerate(prompt, SYSTEM_PROMPT, template, chosenProtein, budgetLevel, isRetry);

    if (result) {
      totalTokensIn += result.tokensIn;
      totalTokensOut += result.tokensOut;
      lastRecipe = result.recipe;

      const { ok, reasons, vegBase } = runValidationGates(result.recipe, chosenProtein);
      if (!ok) {
        lastReasons = reasons;
        log(`[recipe-validation] invalid (${chosenProtein}) attempt=${attempt}/${MAX_PROTEIN_RETRIES}: ${reasons.join(", ")}`, "ai");
        if (attempt < MAX_PROTEIN_RETRIES) await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      if (chosenProtein === "vegetarian" && vegBase) commitVegBase(vegBase);

      const elapsed = Date.now() - genStart;
      log(`Recipe OK in ${elapsed}ms (${totalTokensIn}in/${totalTokensOut}out, attempt ${attempt}/${MAX_PROTEIN_RETRIES}) | ${filterSummary}`, "perf");
      return { recipe: result.recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
    } else {
      log(`[recipe-validation] attempt ${attempt}/${MAX_PROTEIN_RETRIES}: AI failed to produce parseable recipe`, "ai");
      if (attempt < MAX_PROTEIN_RETRIES) await new Promise((r) => setTimeout(r, 300));
    }
  }

  log(`Could not generate a valid ${chosenProtein} recipe after ${MAX_PROTEIN_RETRIES} attempts (last: ${lastReasons.join(", ")}) — trying fallback remix...`, "ai");

  const fallback = await fallbackRemix(template, request, chosenProtein);
  if (fallback) {
    const elapsed = Date.now() - genStart;
    totalTokensIn += fallback.tokensIn;
    totalTokensOut += fallback.tokensOut;
    log(`Fallback served in ${elapsed}ms total | ${filterSummary}`, "perf");
    return { recipe: fallback.recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut, fallback: true };
  }

  throw new Error(`Couldn't generate a compliant ${proteinDisplay} recipe. Please try again.`);
}

export async function generateRecipeFromPantry(
  template: TemplateRow,
  request: GenerateRequest,
  varietyConstraints?: VarietyConstraints,
  structureType?: StructureType
): Promise<AIResult> {
  const genStart = Date.now();
  const budgetLevel = request.budget_level || "standard";
  const filterSummary = buildFilterSummary(request);
  const pantryProteinMode = (request.proteins || []).find(p => ["vegetarian", "seafood"].includes(p.toLowerCase()));

  log(`Generating pantry recipe: ${template.template_name}, structure: ${structureType || "any"}, ingredients: ${(request.ingredients_on_hand || []).join(", ")}${pantryProteinMode ? ` | diet: ${pantryProteinMode}` : ""} | ${filterSummary}`, "ai");

  const varietyBlock = varietyConstraints ? buildVarietyPromptBlock(varietyConstraints) : "";
  const healthyBlock = buildHealthyPromptBlock(request.healthiness_preference, request.busy_level);
  const prompt = buildPantryPrompt(template, request, varietyBlock, healthyBlock, structureType);
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  const maxAttempts = pantryProteinMode ? MAX_PROTEIN_RETRIES : 2;
  const validationMode = pantryProteinMode || "any";
  let lastReasons: string[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isRetry = attempt > 1;
    const result = await attemptGenerate(prompt, PANTRY_SYSTEM_PROMPT, template, "pantry", budgetLevel, isRetry);

    if (result) {
      totalTokensIn += result.tokensIn;
      totalTokensOut += result.tokensOut;

      const { ok, reasons, vegBase } = runValidationGates(result.recipe, validationMode);
      if (!ok) {
        lastReasons = reasons;
        log(`[recipe-validation] pantry (${validationMode}) invalid attempt=${attempt}/${maxAttempts}: ${reasons.join(", ")}`, "ai");
        if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 300));
        continue;
      }

      if (pantryProteinMode === "vegetarian" && vegBase) commitVegBase(vegBase);

      const elapsed = Date.now() - genStart;
      log(`Pantry recipe OK in ${elapsed}ms (${totalTokensIn}in/${totalTokensOut}out, attempt ${attempt}/${maxAttempts}) | ${filterSummary}`, "perf");
      return { recipe: result.recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
    }

    log(`[recipe-validation] pantry attempt ${attempt}/${maxAttempts}: AI failed to produce parseable recipe`, "ai");
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 300));
  }

  log(`Pantry generation failed after ${maxAttempts} attempts (last: ${lastReasons.join(", ")}), trying fallback remix...`, "ai");
  const fallback = await fallbackRemix(template, request, "pantry");
  if (fallback) {
    const elapsed = Date.now() - genStart;
    totalTokensIn += fallback.tokensIn;
    totalTokensOut += fallback.tokensOut;
    log(`Pantry fallback served in ${elapsed}ms | ${filterSummary}`, "perf");
    return { recipe: fallback.recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut, fallback: true };
  }

  throw new Error("Couldn't generate a pantry recipe. Please try again.");
}
