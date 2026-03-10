import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse, ProteinSafetyItem, RecipeTags } from "@shared/schema";
import { log } from "./index";
import { getForbiddenProteinsText, validateProteinCompliance, validateTitleConsistency, validateStructure, validateVegVariety, commitVegBase, getRecentVegBases } from "./protein-validator";
import { type VarietyConstraints, buildVarietyPromptBlock, buildHealthyPromptBlock } from "./variety-memory";
import { type StructureType, STRUCTURE_DISPLAY } from "./structure-variety";
import { buildAllergenAvoidList } from "./allergens";
import { buildCarbRulesPromptBlock, type ChooseCarbContext } from "./carb-rules";

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

  sanitizeGenericProteinWord(recipe, chosenProtein);

  return recipe;
}

function sanitizeGenericProteinWord(recipe: GenerateResponse, chosenProtein: string): void {
  const lower = (chosenProtein || "").toLowerCase();
  if (lower === "pantry" || !lower) return;

  const PROTEIN_DISPLAY_MAP: Record<string, string> = {
    chicken: "chicken", beef: "beef", pork: "pork", turkey: "turkey",
    fish: "fish", salmon: "salmon", shrimp: "shrimp", seafood: "seafood",
    vegetarian: "the main filling", tofu: "tofu", tempeh: "tempeh",
    lentils: "lentils", chickpeas: "chickpeas",
  };
  const replacement = PROTEIN_DISPLAY_MAP[lower] || lower;

  const genericPatterns = [
    /\bthe protein\b/gi,
    /\byour protein\b/gi,
    /\bthe proteins\b/gi,
    /\beach protein\b/gi,
    /\bprotein pieces?\b/gi,
    /\bprotein dry\b/gi,
    /\bprotein in bulk\b/gi,
  ];

  const replaceInText = (text: string): string => {
    let result = text;
    for (const pattern of genericPatterns) {
      result = result.replace(pattern, (match) => {
        const startsUpper = match[0] === match[0].toUpperCase();
        const rep = match.toLowerCase().replace(/protein(s|pieces?)?/g, replacement);
        return startsUpper ? rep.charAt(0).toUpperCase() + rep.slice(1) : rep;
      });
    }
    return result;
  };

  if (recipe.title) recipe.title = replaceInText(recipe.title);
  if (recipe.why_it_fits) recipe.why_it_fits = replaceInText(recipe.why_it_fits);
  if (recipe.cleanup_tip) recipe.cleanup_tip = replaceInText(recipe.cleanup_tip);

  if (recipe.steps && Array.isArray(recipe.steps)) {
    recipe.steps = recipe.steps.map((s: any) => ({
      heading: replaceInText(s.heading || ""),
      body: replaceInText(s.body || ""),
    }));
  }

  if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map((ing: any) => ({
      item: replaceInText(ing.item || ""),
      amount: ing.amount || "",
      notes: replaceInText(ing.notes || ""),
    }));
  }

  if (recipe.pro_tips && Array.isArray(recipe.pro_tips)) {
    recipe.pro_tips = recipe.pro_tips.map((tip: string) => replaceInText(tip));
  }

  if (recipe.budget_tips && Array.isArray(recipe.budget_tips)) {
    recipe.budget_tips = recipe.budget_tips.map((tip: string) => replaceInText(tip));
  }
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
  burger: "STRUCTURE REQUIREMENT: meal_format=burger. Do NOT mix formats.\nFORMAT RULES (BURGER — STRICT): Must include buns (or lettuce wrap if explicitly low carb). Final step MUST assemble the burger. FORBIDDEN base carb: rice, pasta, quinoa, noodles, couscous, tortillas. Do NOT say 'serve over rice'. Do NOT include 'start the rice' step. Do NOT include 'either/or' ingredients. Side options: potato wedges, sweet potato fries, coleslaw, side salad. base_carb tag MUST be \"none\".",
  tacos: "STRUCTURE REQUIREMENT: meal_format=tacos. Do NOT mix formats.\nFORMAT RULES (TACOS — STRICT): Must include tortillas (corn or flour). Final step MUST assemble tacos. FORBIDDEN: buns, rice, pasta, quinoa. Do NOT say 'serve over rice'. Rice is NOT allowed.",
  wrap: "STRUCTURE REQUIREMENT: meal_format=wrap. Do NOT mix formats.\nFORMAT RULES (WRAP — STRICT): Must include a large tortilla or wrap. Final step MUST roll or fold the wrap. FORBIDDEN: buns, rice, pasta, quinoa. Do NOT say 'serve over rice'.",
  bowl: "STRUCTURE REQUIREMENT: meal_format=bowl. Do NOT mix formats.\nFORMAT RULES (BOWL — STRICT): Carb is OPTIONAL. Can be greens base (salad bowl), protein bowl, or quinoa/sweet potato base. Do NOT default to rice. Final plating MUST say 'serve in a bowl' or 'serve over [base]'. FORBIDDEN: buns, tortillas. Do NOT output 'either/or' ingredients — choose ONE specific base.",
  pasta: "STRUCTURE REQUIREMENT: meal_format=pasta. Do NOT mix formats.\nFORMAT RULES (PASTA — STRICT): The ONLY base carb allowed is pasta. Must include pasta (any shape) in ingredients. Final step MUST toss or combine with pasta. FORBIDDEN: rice, quinoa, buns, tortillas, fries. Do NOT include rice anywhere — not in ingredients, not in steps, not as a side. Do NOT include 'rice or pasta' either/or ingredients. Do NOT say 'serve over rice'. Do not include more than one base carb.",
  salad: "STRUCTURE REQUIREMENT: meal_format=salad. Do NOT mix formats.\nFORMAT RULES (SALAD — STRICT): Must include greens or a salad base. Final step MUST toss or plate the salad. FORBIDDEN: rice, pasta, buns, tortillas, quinoa.",
  sheet_pan: "STRUCTURE REQUIREMENT: meal_format=sheet_pan. Do NOT mix formats.\nFORMAT RULES (SHEET PAN — STRICT): Must include an oven temperature AND a roasting/baking step on a sheet pan/baking sheet. Must NOT be a stovetop-only recipe. FORBIDDEN: rice, pasta, noodles, buns, tortillas. Do NOT say 'serve over rice'. Do NOT include 'start the rice' step. base_carb should be 'none' or 'potatoes' only. Do NOT include rice.",
  skillet: "STRUCTURE REQUIREMENT: meal_format=skillet. Do NOT mix formats.\nFORMAT RULES (SKILLET — STRICT): Must use a skillet or pan on stovetop. Carbs NOT required. Do NOT default to rice. Serve the skillet dish as protein + vegetables. FORBIDDEN: buns, tortillas. base_carb should be 'none' unless a carb is integral to the dish.",
  stir_fry: "STRUCTURE REQUIREMENT: meal_format=stir_fry. Do NOT mix formats.\nFORMAT RULES (STIR FRY — STRICT): Must mention stir-fry, wok, or high-heat skillet technique. Rice or noodles optional. Can serve as protein + veggie stir-fry without carb. FORBIDDEN: buns, tortillas. Do NOT default to rice — only include a carb base if it is integral to the stir-fry. If including a carb, choose ONE (rice OR noodles, not both).",
  soup_chili: "STRUCTURE REQUIREMENT: meal_format=soup_chili. Do NOT mix formats.\nFORMAT RULES (SOUP/CHILI — STRICT): Must include broth/stock (>= 3 cups). Must include a simmer step (>= 10 minutes). Single pot flow. base_carb MUST be \"none\". FORBIDDEN base: rice, pasta, noodles, quinoa. Do NOT include a \"start the rice\" step. Do NOT say \"serve over rice\". Allowed thickeners INSIDE the stew: potato, beans, lentils, barley. Optional SIDE (not base): crusty bread or cornbread.",
  breakfast: "STRUCTURE REQUIREMENT: meal_format=breakfast. Do NOT mix formats.\nFORMAT RULES (BREAKFAST — STRICT): Must include a breakfast anchor ingredient: eggs, oats, yogurt, pancakes, hash browns, or similar. FORBIDDEN: rice, pasta, buns, tortillas.",
  loaded_fries: "STRUCTURE REQUIREMENT: meal_format=loaded_fries. Do NOT mix formats.\nFORMAT RULES (LOADED FRIES — STRICT): Base carb MUST be fries (frozen fries OR fresh-cut potato fries). Must bake or air-fry the fries, then top them. FORBIDDEN: rice, pasta, quinoa, tortillas, buns. Do NOT say 'serve over rice'.",
};

function buildMealFormatBlock(mealFormat: string | undefined): string {
  if (!mealFormat || mealFormat === "random") {
    return "STRUCTURE REQUIREMENT: meal_format=random. Choose a format that fits the dish naturally.\nCARB RULE (STRICT): Do NOT default to rice or pasta. Only include a carb (rice, pasta, bread, tortillas, fries, etc.) if it is integral to the chosen dish format. Do NOT add rice/pasta as a side unless the dish structure demands it. Do NOT output 'either/or' ingredients like 'rice or pasta' — choose ONE specific ingredient. Vary the base across generations.";
  }
  return MEAL_FORMAT_RULES[mealFormat] || "";
}

const STRUCTURAL_CONSISTENCY_RULES = `STRUCTURAL CONSISTENCY RULES (STRICT): The recipe title, ingredients, and instructions must be fully aligned. If the title contains a descriptive claim, it must be reflected in both ingredients and instructions. Examples: If the title includes "cheesy", the ingredients must contain a cheese product and the instructions must include adding or melting the cheese. If the title includes "creamy", the ingredients must contain a cream-based ingredient (cream, milk, yogurt, coconut milk, cream cheese, etc.) and the instructions must show it being incorporated. If the title includes "stuffed", the instructions must explicitly describe stuffing or filling the item. If the title includes a protein (e.g., chicken, pork, tofu), that protein must appear in the ingredients and be used in the instructions. Do not generate titles that exaggerate or misrepresent the ingredients.`;

const SYSTEM_PROMPT = `Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown. The recipe MUST use ONLY the specified protein — no substitutions. ${STRUCTURAL_CONSISTENCY_RULES}

NATURAL LANGUAGE RULES (mandatory):
1. NEVER use the generic word "protein" in steps, ingredients, titles, or tips. Always use the SPECIFIC ingredient name (e.g. "chicken thighs", "ground beef", "salmon fillets", "chickpeas", "lentils", "tofu"). The word "protein" is FORBIDDEN in recipe text.
2. Use VARIED cooking verbs — never repeat the same verb in consecutive steps. Rotate between: sear, brown, roast, grill, toss, stir, simmer, sauté, crisp, char, braise, fold, drizzle, build, assemble, layer.
3. Every step must include: (a) specific heat level, (b) approximate time, (c) a visual or sensory doneness cue like "until golden brown", "until edges crisp", "until fragrant", "until bubbling".
4. NEVER start more than 2 steps with the same verb. Vary sentence openers.
5. Write like a confident chef coaching a beginner — direct, clear, encouraging. No robotic phrasing.`;
const PANTRY_SYSTEM_PROMPT = `Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown. ${STRUCTURAL_CONSISTENCY_RULES}

NATURAL LANGUAGE RULES (mandatory):
1. NEVER use the generic word "protein" in steps, ingredients, titles, or tips. Always use the SPECIFIC ingredient name. The word "protein" is FORBIDDEN in recipe text.
2. Use VARIED cooking verbs. Rotate between: sear, brown, roast, grill, toss, stir, simmer, sauté, crisp, braise, fold, drizzle, build, assemble, layer.
3. Every step must include specific heat level, approximate time, and a visual doneness cue.
4. Write like a confident chef coaching a beginner.`;

function buildPrompt(template: TemplateRow, request: GenerateRequest, chosenProtein: string, varietyBlock: string, healthyBlock: string, structureType?: StructureType): string {
  const proteinDisplay = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  const budgetLevel = request.budget_level || "standard";
  const forbiddenText = getForbiddenProteinsText(chosenProtein);

  const allergenLine = request.allergens_to_avoid.length > 0
    ? `ALLERGIES (CRITICAL — ZERO TOLERANCE): ${request.allergens_to_avoid.join(", ")}
MUST AVOID these specific ingredients: ${buildAllergenAvoidList(request.allergens_to_avoid)}
Do NOT include ANY of the above in ingredients, steps, garnishes, sauces, or pro tips — not even as "optional".
Use safe substitutions automatically:${request.allergens_to_avoid.includes("dairy") ? " butter→olive oil, cheese→nutritional yeast, cream→coconut cream, yogurt→coconut yogurt, milk→oat milk." : ""}${request.allergens_to_avoid.includes("gluten") ? " flour→GF flour, pasta→GF pasta, soy sauce→coconut aminos/tamari, bread→GF bread, tortillas→corn tortillas." : ""}${request.allergens_to_avoid.includes("nuts") ? " peanut butter→sunflower seed butter, almonds/cashews/walnuts→pumpkin seeds or sunflower seeds." : ""}${request.allergens_to_avoid.includes("soy") ? " soy sauce→coconut aminos, tofu→chickpeas, tempeh→lentils, edamame→green peas." : ""}${request.allergens_to_avoid.includes("eggs") || request.allergens_to_avoid.includes("egg") ? " eggs→flax eggs, mayo→egg-free mayo." : ""}
This applies to the main recipe AND any veg_option.`
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
  const carbCtx: ChooseCarbContext = {
    meal_format: request.meal_format || "random",
    healthiness: request.healthiness_preference || "balanced",
    time: request.time_available || "25-40",
    budget: request.budget_level || "standard",
    allergens: request.allergens_to_avoid || [],
    crew_size: request.crew_size || 6,
  };
  const carbRulesBlock = buildCarbRulesPromptBlock(request.meal_format, request.healthiness_preference, carbCtx);

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
${carbRulesBlock}
${cuisineLine}
${allergenLine}
${budgetLine}
${vegLine}

${varietyBlock}

${healthyBlock}

CARB POLICY: Carbs are OPTIONAL. Do NOT default to rice. Only include a carb if the meal format structurally requires it (pasta needs pasta, pizza needs crust). For formats like skillet, sheet-pan, bowl, stir-fry, soup — omit carbs unless they genuinely improve the dish. If you do include a carb, choose ONE specific option — never 'rice or pasta'. If no carb is used, set base_carb tag to 'none' and do NOT include rice/pasta/quinoa in ingredients or steps.
RULES: ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. ${isVegetarian ? "25-45g" : "35-60g"} protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
TITLE RULES (mandatory): Use this formula: {Cooking Method or Texture Word} + {Flavor Descriptor} + {Protein} + {Meal Style or Base}. Use 1-2 vivid adjectives max. Only use descriptors that are supported by actual ingredients/spices (e.g. "Smoky" only if using smoked paprika/chipotle/BBQ; "Zesty" only if using lime/lemon; "Creamy" only if using cream/cheese/coconut milk; "Crispy" only if a frying/roasting step produces crispness). Use texture words only if supported by cooking method in steps (crispy, roasted, grilled, charred, seared, caramelized). NEVER use clickbait words: "ultimate", "insane", "crazy", "life-changing", "best-ever", "epic". Examples of great titles: "Crispy Garlic-Lime Chicken Wraps", "Smoky Chipotle Beef Skillet Bowls", "Zesty Lemon-Oregano Sheet-Pan Chicken", "Hearty Mediterranean Chickpea Pitas", "Bold Teriyaki Steak Stir-Fry", "Creamy Tuscan Turkey Pasta", "Golden Roasted Veggie & Tofu Grain Bowls". Bland titles like "Chicken Rice Bowl" or "Beef Pasta" are NOT acceptable.
DESCRIPTION RULES ("why_it_fits_tonight"): Write 1-2 punchy sentences that sell the meal to the crew. Mention texture + flavor + protein. Explain why it works for the shift (quick, filling, easy cleanup, budget-friendly, one-pan, feeds a crowd). Example: "A bold, protein-packed wrap with smoky spices and crispy tofu — built to satisfy a hungry crew in 30 minutes." Do NOT use generic lines like "A hearty meal for the crew."
FLAVOR AMPLIFIER MAP (use ONLY when ingredients justify it): lime/lemon→"zesty" or "bright"; chili powder/smoked paprika/chipotle→"smoky" or "bold"; garlic+butter→"savory garlic"; BBQ sauce→"sticky BBQ"; soy sauce/ginger→"umami-packed" or "savory soy-ginger"; roasted vegetables→"caramelized"; cream/cheese→"creamy"; honey/brown sugar→"sweet heat" or "honey-glazed"; cumin/coriander→"warmly spiced".
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "${isVegetarian ? "Sauté the chickpeas (medium-high, 4-5 min)" : "Sear the chicken (medium-high, 5-7 min)"}". body = concise HOW-TO with visual/doneness cue. Each step MUST include: (1) clear action verb + exact sequence, (2) heat level (low/medium/medium-high/high or oven °F) + pan/pot/oven instructions, (3) doneness cue (color/texture/internal temp, e.g. "until golden brown", "until edges crisp", "until internal temp reaches 165°F"), (4) brief parallelization note where appropriate (e.g. "while fries bake, brown the beef"). AVOID vague steps like "cook until done". Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
${isVegetarian ? "SAFETY: Reheat leftovers to 165°F. Ensure tofu/tempeh is cooked through." : "SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C."}
PRIMARY PROTEIN SOURCE: Set "primary_protein_source" to the single main protein ingredient (e.g. "chicken", "lentils", "salmon", "chickpeas", "tofu", "eggs"). For vegetarian: name the specific plant protein used most.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (the actual carb used e.g. "rice", "pasta", "potatoes", "tortilla", "greens", or "none" if no carb — NEVER default to rice), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

JSON:
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","primary_protein_source":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[],"tags":{"cuisine":"","cooking_method":"","base_carb":"","key_ingredients":[],"high_protein":false,"high_fiber":false,"quick_cleanup":false}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;
}

function buildPantryPrompt(template: TemplateRow, request: GenerateRequest, varietyBlock: string, healthyBlock: string, structureType?: StructureType): string {
  const ingredientsList = (request.ingredients_on_hand || []).join(", ");
  const budgetLevel = request.budget_level || "standard";

  const allergenLine = request.allergens_to_avoid.length > 0
    ? `ALLERGIES (CRITICAL — ZERO TOLERANCE): ${request.allergens_to_avoid.join(", ")}
MUST AVOID: ${buildAllergenAvoidList(request.allergens_to_avoid)}
Do NOT include ANY of the above in ingredients, steps, garnishes, or sauces.
Use safe substitutions:${request.allergens_to_avoid.includes("dairy") ? " butter→olive oil, cheese→nutritional yeast, cream→coconut cream." : ""}${request.allergens_to_avoid.includes("gluten") ? " flour→GF flour, soy sauce→coconut aminos, tortillas→corn tortillas." : ""}${request.allergens_to_avoid.includes("nuts") ? " nuts→seeds." : ""}${request.allergens_to_avoid.includes("soy") ? " soy sauce→coconut aminos, tofu→chickpeas." : ""}${request.allergens_to_avoid.includes("eggs") || request.allergens_to_avoid.includes("egg") ? " eggs→flax eggs, mayo→egg-free mayo." : ""}
Applies to main recipe AND veg_option.`
    : "";

  const budgetLine = budgetLevel === "low"
    ? `BUDGET: LOW ($). Extra items should be cheap staples only. Include "budget_tips":["tip1","tip2"].`
    : budgetLevel === "splurge"
    ? `BUDGET: SPLURGE ($$$). Premium extras allowed.`
    : `BUDGET: STANDARD ($$).`;

  const vegLine = request.vegetarian_swap_needed
    ? `VEG OPTION: 1 person. Add "veg_option" with swap_protein, ingredients, steps, plating_notes.${request.allergens_to_avoid.includes("soy") ? " No tofu/tempeh." : ""}${request.allergens_to_avoid.includes("dairy") ? " No paneer/cheese." : ""}${request.allergens_to_avoid.includes("nuts") ? " No nut-based proteins." : ""}`
    : "";

  const cuisineLine = buildCuisineDirective(request.cuisine_style || "any");
  const mealFormatBlock = buildMealFormatBlock(request.meal_format);
  const pantryCarbCtx: ChooseCarbContext = {
    meal_format: request.meal_format || "random",
    healthiness: request.healthiness_preference || "balanced",
    time: request.time_available || "25-40",
    budget: request.budget_level || "standard",
    allergens: request.allergens_to_avoid || [],
    crew_size: request.crew_size || 6,
  };
  const carbRulesBlock = buildCarbRulesPromptBlock(request.meal_format, request.healthiness_preference, pantryCarbCtx);

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
${carbRulesBlock}
${cuisineLine}
${allergenLine}
${budgetLine}
${vegLine}
${pantryVegLine}

${varietyBlock}

${healthyBlock}

CARB POLICY: Carbs are OPTIONAL. Do NOT default to rice. Only include a carb if the meal format structurally requires it (pasta needs pasta, pizza needs crust). For formats like skillet, sheet-pan, bowl, stir-fry, soup — omit carbs unless they genuinely improve the dish. If you do include a carb, choose ONE specific option — never 'rice or pasta'. If no carb is used, set base_carb tag to 'none' and do NOT include rice/pasta/quinoa in ingredients or steps.
RULES: Use as many on-hand ingredients as practical. List used ones in "ingredients_used". List 1-4 extras needed in "extra_items_needed" (skip basic pantry staples). ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. ${isPantryVegetarian ? "25-45g" : "35-60g"} protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
TITLE RULES (mandatory): Use this formula: {Cooking Method or Texture Word} + {Flavor Descriptor} + {Protein} + {Meal Style or Base}. Use 1-2 vivid adjectives max. Only use descriptors supported by actual ingredients/spices. Use texture words only if supported by cooking method. NEVER use clickbait words: "ultimate", "insane", "crazy", "life-changing", "best-ever", "epic". Bland titles like "Chicken Bowl" or "Beef Pasta" are NOT acceptable.
DESCRIPTION RULES ("why_it_fits_tonight"): Write 1-2 punchy sentences that sell the meal to the crew. Mention texture + flavor + protein. Explain why it works for the shift. Example: "A bold, protein-packed wrap with smoky spices and crispy tofu — built to satisfy a hungry crew in 30 minutes."
FLAVOR AMPLIFIER MAP (use ONLY when ingredients justify it): lime/lemon→"zesty"; chili powder/smoked paprika→"smoky"; garlic+butter→"savory garlic"; BBQ sauce→"sticky BBQ"; soy/ginger→"umami-packed"; cream/cheese→"creamy"; honey/brown sugar→"honey-glazed"; cumin/coriander→"warmly spiced".
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "Sear the chicken (medium-high, 5-7 min)". body = concise HOW-TO with visual/doneness cue. Each step MUST include: (1) clear action verb + exact sequence, (2) heat level (low/medium/medium-high/high or oven °F) + pan/pot/oven instructions, (3) doneness cue (color/texture/internal temp, e.g. "until golden brown", "until edges crisp", "until internal temp reaches 165°F"), (4) brief parallelization note where appropriate (e.g. "while fries bake, brown the beef"). AVOID vague steps like "cook until done". Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C.
PRIMARY PROTEIN SOURCE: Set "primary_protein_source" to the single main protein ingredient (e.g. "chicken", "lentils", "salmon", "chickpeas", "tofu", "eggs"). For vegetarian: name the specific plant protein used most.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (the actual carb used e.g. "rice", "pasta", "potatoes", "tortilla", "greens", or "none" if no carb — NEVER default to rice), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

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

const REPAIR_SYSTEM_PROMPT = "You are a recipe repair assistant. You receive a recipe JSON and a list of validation errors. Fix ONLY the issues described. Return ONLY corrected JSON. No markdown, no explanation.";

export async function repairRecipe(
  recipe: GenerateResponse,
  validationErrors: string[],
  template: TemplateRow,
  chosenProtein: string,
  budgetLevel: string
): Promise<AIResult | null> {
  const repairPrompt = `The following recipe JSON failed validation. Fix it and return ONLY corrected JSON.

PREVIOUS JSON:
${JSON.stringify(recipe, null, 2)}

VALIDATION ERRORS:
${JSON.stringify(validationErrors)}

INSTRUCTIONS:
- Return ONLY corrected JSON. Do not change meal_format or servings.
- Do NOT add rice or pasta unless the meal_format explicitly requires it (bowl allows rice; pasta requires pasta).
- Do NOT include "either/or" ingredients like "rice or pasta" — choose ONE specific ingredient.
- Fix every listed error while keeping the recipe coherent.
- Keep the same title style, protein, and crew size.
- Ensure every ingredient is used in at least one step.
- Ensure steps do not reference ingredients not in the ingredients list.
- Respect format constraints: burgers need buns (no rice/pasta/tortillas), tacos need tortillas (no rice/buns), wraps need tortillas (no rice/buns), bowls need a base layer (no buns/tortillas), pasta needs pasta (no rice/buns), salad needs greens (no rice/pasta/buns), sheet_pan needs oven+sheet pan (no rice/pasta), stir_fry needs wok/high-heat (no buns), soup_chili needs simmer time (no rice/buns), breakfast needs anchor ingredient (no rice/pasta), loaded_fries need fries as base (no rice/pasta/quinoa/buns).
- Ensure timing.total_minutes >= max(prep_minutes, cook_minutes) and <= prep_minutes + cook_minutes + 5.`;

  try {
    log(`[repair] Attempting repair for "${recipe.title}" with ${validationErrors.length} errors: ${validationErrors.join(", ")}`, "ai");
    const { content, tokensIn, tokensOut } = await callAI(repairPrompt, REPAIR_SYSTEM_PROMPT, true, 15_000);
    const repaired = tryParseRecipe(content, template, chosenProtein, budgetLevel);
    if (repaired) {
      log(`[repair] Repair succeeded: "${repaired.title}"`, "ai");
      return { recipe: repaired, tokensIn, tokensOut };
    }
    log(`[repair] Repair returned unparseable JSON`, "ai");
    return null;
  } catch (err: any) {
    log(`[repair] Repair LLM call failed: ${err.message}`, "ai");
    return null;
  }
}

const SAFE_FALLBACK_RECIPES: Record<string, () => GenerateResponse> = {
  "sheet-pan": () => ({
    template_id: 0,
    chosen_protein: "Chicken",
    primary_protein_source: "Chicken",
    title: "Smoky Paprika Sheet-Pan Chicken & Roasted Vegetables",
    why_it_fits_tonight: "Crispy, protein-packed chicken with smoky paprika seasoning and roasted vegetables — one pan, zero fuss, and ready before the next call.",
    timing: { prep_minutes: 10, cook_minutes: 25, total_minutes: 35 },
    protein_safety: [{ protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part of the breast", notes: "All poultry must reach 165°F." }],
    ingredients: [
      { item: "Boneless skinless chicken breasts", amount: "3 lbs", notes: "Cut into 1-inch cubes" },
      { item: "Broccoli florets", amount: "4 cups", notes: "" },
      { item: "Bell peppers", amount: "3 large", notes: "Cut into strips" },
      { item: "Red onion", amount: "2 large", notes: "Cut into wedges" },
      { item: "Olive oil", amount: "3 tbsp", notes: "" },
      { item: "Garlic powder", amount: "1 tbsp", notes: "" },
      { item: "Smoked paprika", amount: "1 tbsp", notes: "" },
      { item: "Salt and pepper", amount: "To taste", notes: "" },
    ],
    steps: [
      { heading: "Preheat oven (425°F, 2 min)", body: "Preheat oven to 425°F. Line a large sheet pan with parchment paper." },
      { heading: "Season the chicken (no heat, 5 min)", body: "Toss chicken cubes with olive oil, garlic powder, smoked paprika, salt, and pepper in a large bowl." },
      { heading: "Arrange on sheet pan (no heat, 3 min)", body: "Spread seasoned chicken and all vegetables (broccoli florets, bell pepper strips, red onion wedges) in a single layer on the sheet pan. Don't overcrowd." },
      { heading: "Roast (425°F oven, 25 min)", body: "Roast for 25 minutes, flipping chicken and vegetables halfway through, until chicken reaches 165°F and vegetables are tender with charred edges." },
      { heading: "Serve (no heat, 2 min)", body: "Divide chicken and vegetables among plates. Serve immediately." },
    ],
    cleanup_tip: "Line the sheet pan with parchment for zero-scrub cleanup.",
    macros_per_serving: { calories: 380, protein_g: 42, carbs_g: 18, fat_g: 14 },
    budget_level: "standard",
    budget_tips: ["Buy chicken in bulk and freeze portions.", "Use whatever vegetables are on sale."],
    pro_tips: ["Don't overcrowd the pan — air circulation is key to crispy edges.", "Pat chicken dry before seasoning for better browning."],
    tags: { cuisine: "", cooking_method: "sheet-pan", base_carb: "none", key_ingredients: ["Chicken", "Broccoli", "Bell Peppers"], high_protein: true, high_fiber: false, quick_cleanup: true },
    meal_style: "Sheet Pan",
    ingredients_used: [],
    extra_items_needed: [],
  }),
  burger: () => ({
    template_id: 0,
    chosen_protein: "Beef",
    primary_protein_source: "Beef",
    title: "Seared Smash Burgers with Melted Cheddar",
    why_it_fits_tonight: "Crispy-edged, juicy smash burgers with gooey melted cheddar — a crew-favorite that's ready in 25 minutes flat.",
    timing: { prep_minutes: 10, cook_minutes: 15, total_minutes: 25 },
    protein_safety: [{ protein: "Beef (ground)", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of patty", notes: "Ground beef must reach 160°F." }],
    ingredients: [
      { item: "Ground beef (80/20)", amount: "3 lbs", notes: "" },
      { item: "Burger buns", amount: "6", notes: "Brioche or sesame" },
      { item: "Cheddar cheese slices", amount: "6", notes: "" },
      { item: "Lettuce leaves", amount: "6", notes: "" },
      { item: "Tomato", amount: "2 large", notes: "Sliced" },
      { item: "Red onion", amount: "1 large", notes: "Sliced into rings" },
      { item: "Salt and pepper", amount: "To taste", notes: "" },
      { item: "Butter", amount: "2 tbsp", notes: "For toasting buns" },
    ],
    steps: [
      { heading: "Form patties (no heat, 5 min)", body: "Divide ground beef into 6 equal balls (about 8 oz each). Season generously with salt and pepper." },
      { heading: "Heat skillet (high, 2 min)", body: "Heat a large cast-iron skillet or flat grill over high heat until smoking." },
      { heading: "Smash and sear (high, 3 min per side)", body: "Place beef balls on the hot skillet and smash flat with a sturdy spatula. Sear for 3 minutes until a deep crust forms. Flip, add cheddar cheese on top, and cook 2 more minutes until cheese melts and beef reaches 160°F." },
      { heading: "Toast buns (medium, 2 min)", body: "Butter the burger buns and toast them cut-side down in the skillet until golden." },
      { heading: "Assemble burgers (no heat, 3 min)", body: "Layer each toasted bun with lettuce, tomato slice, red onion ring, and the smash patty. Close and serve." },
    ],
    cleanup_tip: "Wipe the cast iron while still warm — don't soak it.",
    macros_per_serving: { calories: 620, protein_g: 45, carbs_g: 32, fat_g: 35 },
    budget_level: "standard",
    budget_tips: ["80/20 ground beef has the best flavor-to-cost ratio.", "Buy buns in bulk when on sale."],
    pro_tips: ["Don't press the patty after smashing — you'll lose all the juices.", "A hot, dry skillet is the secret to a great crust."],
    tags: { cuisine: "", cooking_method: "stovetop", base_carb: "bread", key_ingredients: ["Ground Beef", "Cheddar", "Burger Buns"], high_protein: true, high_fiber: false, quick_cleanup: false },
    meal_style: "Burger",
    ingredients_used: [],
    extra_items_needed: [],
  }),
  taco: () => ({
    template_id: 0,
    chosen_protein: "Chicken",
    primary_protein_source: "Chicken",
    title: "Charred Chili-Lime Chicken Tacos",
    why_it_fits_tonight: "Smoky, zesty chicken with a quick char — everyone builds their own in minutes. Perfect for a crew on the move.",
    timing: { prep_minutes: 10, cook_minutes: 15, total_minutes: 25 },
    protein_safety: [{ protein: "Chicken", target_temp_f: 165, target_temp_c: 74, rest_minutes: 0, probe_where: "Thickest part", notes: "All poultry must reach 165°F." }],
    ingredients: [
      { item: "Boneless skinless chicken thighs", amount: "3 lbs", notes: "" },
      { item: "Flour tortillas", amount: "12", notes: "Street taco size or large" },
      { item: "Lime", amount: "3", notes: "Cut into wedges" },
      { item: "Cilantro", amount: "1 bunch", notes: "Roughly chopped" },
      { item: "Red onion", amount: "1 large", notes: "Diced" },
      { item: "Chili powder", amount: "2 tbsp", notes: "" },
      { item: "Cumin", amount: "1 tbsp", notes: "" },
      { item: "Olive oil", amount: "2 tbsp", notes: "" },
      { item: "Salt and pepper", amount: "To taste", notes: "" },
    ],
    steps: [
      { heading: "Season chicken (no heat, 5 min)", body: "Toss chicken thighs with olive oil, chili powder, cumin, salt, and pepper." },
      { heading: "Cook chicken (medium-high, 12 min)", body: "Sear chicken in a hot skillet for 5-6 minutes per side until charred and internal temp reaches 165°F. Rest 3 minutes, then slice into strips." },
      { heading: "Warm tortillas (medium, 2 min)", body: "Warm flour tortillas in a dry skillet or directly over a gas flame for 15 seconds per side." },
      { heading: "Assemble tacos (no heat, 3 min)", body: "Fill each tortilla with sliced chicken, diced red onion, chopped cilantro, and a squeeze of lime juice. Serve immediately." },
    ],
    cleanup_tip: "One skillet, one cutting board — rinse and done.",
    macros_per_serving: { calories: 420, protein_g: 38, carbs_g: 35, fat_g: 14 },
    budget_level: "standard",
    budget_tips: ["Chicken thighs are cheaper and more flavorful than breasts.", "Buy limes in bags for better value."],
    pro_tips: ["Let the chicken rest before slicing to keep it juicy.", "Charring tortillas over a flame adds great smoky flavor."],
    tags: { cuisine: "Mexican", cooking_method: "stovetop", base_carb: "tortillas", key_ingredients: ["Chicken", "Tortillas", "Cilantro", "Lime"], high_protein: true, high_fiber: false, quick_cleanup: true },
    meal_style: "Taco",
    ingredients_used: [],
    extra_items_needed: [],
  }),
  "loaded-fries": () => ({
    template_id: 0,
    chosen_protein: "Beef",
    primary_protein_source: "Beef",
    title: "Spiced Chili-Cheese Loaded Fries",
    why_it_fits_tonight: "Crispy fries piled high with spiced beef, melted cheddar, and a kick of jalapeño — shareable, satisfying, and done in 35 minutes.",
    timing: { prep_minutes: 10, cook_minutes: 25, total_minutes: 35 },
    protein_safety: [{ protein: "Beef (ground)", target_temp_f: 160, target_temp_c: 71, rest_minutes: 0, probe_where: "Center of meat", notes: "Ground beef must reach 160°F." }],
    ingredients: [
      { item: "Frozen French fries", amount: "3 lbs", notes: "Thick-cut preferred" },
      { item: "Ground beef (80/20)", amount: "2 lbs", notes: "" },
      { item: "Shredded cheddar cheese", amount: "2 cups", notes: "" },
      { item: "Red onion", amount: "1 large", notes: "Diced" },
      { item: "Jalapeños", amount: "3", notes: "Sliced" },
      { item: "Chili powder", amount: "2 tbsp", notes: "" },
      { item: "Cumin", amount: "1 tbsp", notes: "" },
      { item: "Sour cream", amount: "1 cup", notes: "For topping" },
      { item: "Salt and pepper", amount: "To taste", notes: "" },
    ],
    steps: [
      { heading: "Preheat oven (425°F, 2 min)", body: "Preheat oven to 425°F. Line a large sheet pan with parchment paper." },
      { heading: "Bake fries (425°F oven, 20 min)", body: "Spread frozen fries in a single layer on the sheet pan. Bake for 20 minutes until golden and crispy, flipping halfway through." },
      { heading: "Brown beef (medium-high, 8 min)", body: "While fries bake, brown ground beef in a large skillet over medium-high heat. Break into crumbles until no pink remains and internal temp reaches 160°F. Drain excess fat." },
      { heading: "Season beef (medium, 2 min)", body: "Add chili powder, cumin, salt, and pepper to the cooked beef. Stir to coat evenly and cook 1-2 minutes until fragrant." },
      { heading: "Load the fries (no heat, 3 min)", body: "Top the crispy fries with seasoned beef, diced red onion, sliced jalapeños, and shredded cheddar cheese." },
      { heading: "Melt cheese (425°F oven, 3 min)", body: "Return the loaded fries to the oven for 2-3 minutes until cheese is melted and bubbly." },
      { heading: "Serve (no heat, 2 min)", body: "Dollop sour cream on top. Serve immediately on the sheet pan for easy sharing." },
    ],
    cleanup_tip: "Parchment paper on the sheet pan means almost no scrubbing.",
    macros_per_serving: { calories: 580, protein_g: 38, carbs_g: 42, fat_g: 28 },
    budget_level: "standard",
    budget_tips: ["Frozen fries are cheaper than fresh-cut.", "Use store-brand shredded cheese."],
    pro_tips: ["Don't overcrowd the fries — spread them out for maximum crispiness.", "Drain the beef well so fries stay crispy under the toppings."],
    tags: { cuisine: "", cooking_method: "oven", base_carb: "fries", key_ingredients: ["French Fries", "Ground Beef", "Cheddar", "Jalapeños"], high_protein: true, high_fiber: false, quick_cleanup: true },
    meal_style: "Loaded Fries",
    ingredients_used: [],
    extra_items_needed: [],
  }),
};

export function buildSafeFallbackRecipe(mealFormat: string, crewSize: number): GenerateResponse {
  const formatLower = (mealFormat || "").toLowerCase().replace(/_/g, " ");
  let key = "sheet-pan";
  if (formatLower.includes("burger")) key = "burger";
  else if (formatLower.includes("taco")) key = "taco";
  else if (formatLower.includes("loaded") && formatLower.includes("fries")) key = "loaded-fries";

  const builder = SAFE_FALLBACK_RECIPES[key] || SAFE_FALLBACK_RECIPES["sheet-pan"];
  const recipe = builder();

  if (crewSize && crewSize !== 6) {
    const scale = crewSize / 6;
    recipe.ingredients = recipe.ingredients.map(ing => {
      const match = ing.amount.match(/^([\d.]+)\s*(.*)/);
      if (match) {
        const scaled = Math.round(parseFloat(match[1]) * scale * 10) / 10;
        return { ...ing, amount: `${scaled} ${match[2]}`.trim() };
      }
      return ing;
    });
    if (recipe.macros_per_serving) {
      recipe.macros_per_serving = { ...recipe.macros_per_serving };
    }
  }

  log(`[safe-fallback] Serving deterministic ${key} fallback for format="${mealFormat}", crew=${crewSize}`, "fallback");
  return recipe;
}
