import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse, ProteinSafetyItem, RecipeTags } from "@shared/schema";
import { log } from "./index";
import { getForbiddenProteinsText, validateProteinCompliance } from "./protein-validator";
import { type VarietyConstraints, buildVarietyPromptBlock, buildHealthyPromptBlock } from "./variety-memory";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_PROTEIN_RETRIES = 2;

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

async function callAI(
  prompt: string,
  systemPrompt: string,
  isRetry: boolean = false
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const retryAddendum = isRetry ? " IMPORTANT: Return ONLY valid JSON that exactly matches the schema. No extra text, no backticks, no markdown." : "";
  const finalSystem = systemPrompt + retryAddendum;

  try {
    const startMs = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: finalSystem },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
    });

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
    if (err.code === "ETIMEDOUT" || err.message?.includes("timeout")) {
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

function buildFilterSummary(request: GenerateRequest): string {
  const parts = [
    `crew=${request.crew_size}`,
    `shift=${request.busy_level}`,
    `time=${request.time_available}`,
    `appliances=${request.appliances.join("+")}`,
    `health=${request.healthiness_preference}`,
    `budget=${request.budget_level || "standard"}`,
  ];
  if (request.use_what_we_have) parts.push("pantry=yes");
  if (request.vegetarian_swap_needed) parts.push("veg=yes");
  if (request.allergens_to_avoid.length) parts.push(`allergens=${request.allergens_to_avoid.join("+")}`);
  if (!request.use_what_we_have) parts.push(`proteins=${request.proteins.join("+")}`);
  return parts.join(" | ");
}

const SYSTEM_PROMPT = "Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown. The recipe MUST use ONLY the specified protein — no substitutions.";
const PANTRY_SYSTEM_PROMPT = "Firehall chef writing beginner-friendly recipes. Return ONLY valid JSON. Every step heading includes heat level and time. Every step body explains HOW to do it with a visual doneness cue. Include safety temps for every protein. No markdown.";

function buildPrompt(template: TemplateRow, request: GenerateRequest, chosenProtein: string, varietyBlock: string, healthyBlock: string): string {
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

  return `Generate ONE firehall meal as JSON.

TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
PROTEIN (STRICT): Recipe MUST use ${proteinDisplay} as the ONLY animal protein. Do not include, mention, or substitute any other meat or animal protein. The title MUST include the word "${proteinDisplay}". Every meat ingredient MUST be ${proteinDisplay}. FORBIDDEN proteins (do NOT use any of these): ${forbiddenText}.
Healthiness: ${request.healthiness_preference}
${allergenLine}
${budgetLine}
${vegLine}

${varietyBlock}

${healthyBlock}

RULES: ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. 35-60g protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "Sear the chicken (medium-high, 5-7 min)". body = concise HOW-TO with visual/doneness cue. Include: heat level (low/medium/medium-high/high or oven °F), time estimate, and a doneness cue ("until golden brown", "until juices run clear", "until internal temp reaches 165°F"). Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (e.g. "rice"), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

JSON:
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[],"tags":{"cuisine":"","cooking_method":"","base_carb":"","key_ingredients":[],"high_protein":false,"high_fiber":false,"quick_cleanup":false}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;
}

function buildPantryPrompt(template: TemplateRow, request: GenerateRequest, varietyBlock: string, healthyBlock: string): string {
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

  return `Generate ONE firehall meal as JSON using crew's on-hand ingredients.

ON HAND: ${ingredientsList}
TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
Healthiness: ${request.healthiness_preference}
${allergenLine}
${budgetLine}
${vegLine}

${varietyBlock}

${healthyBlock}

RULES: Use as many on-hand ingredients as practical. List used ones in "ingredients_used". List 1-4 extras needed in "extra_items_needed" (skip basic pantry staples). ${request.crew_size} servings. 6-10 steps max. 8-12 ingredients. 35-60g protein/serving. Include "pro_tips": 1-2 short practical tips (1-2 sentences each) about technique, make-ahead, or serving. Max 2 tips.
STEP FORMAT (each step MUST follow this): heading = "Action (heat level, time)" e.g. "Sear the chicken (medium-high, 5-7 min)". body = concise HOW-TO with visual/doneness cue. Include: heat level (low/medium/medium-high/high or oven °F), time estimate, and a doneness cue ("until golden brown", "until juices run clear", "until internal temp reaches 165°F"). Never repeat same instruction in two steps. No storytelling. Keep each step 1-3 sentences.
SAFETY TEMPS (always include for any protein): chicken/turkey 165°F/74°C, ground beef/sausage 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C.
REQUIRED OUTPUT TAGS: Include "tags" object with: cuisine (e.g. "Mediterranean"), cooking_method (e.g. "sheet-pan"), base_carb (e.g. "rice"), key_ingredients (3-5 main items as string array), high_protein (boolean, true if 30g+ protein/serving), high_fiber (boolean, true if contains beans/lentils/chickpeas/whole grains), quick_cleanup (boolean, true if one-pan/sheet-pan/slow-cooker).

JSON:
{"template_id":${template.template_id},"chosen_protein":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"ingredients_used":[],"extra_items_needed":[],"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[],"tags":{"cuisine":"","cooking_method":"","base_carb":"","key_ingredients":[],"high_protein":false,"high_fiber":false,"quick_cleanup":false}${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;
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
  } catch {
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
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[],"pro_tips":[]}`;

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

export async function generateRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string,
  varietyConstraints?: VarietyConstraints
): Promise<AIResult> {
  const genStart = Date.now();
  const budgetLevel = request.budget_level || "standard";
  const proteinDisplay = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  const filterSummary = buildFilterSummary(request);

  log(`Generating: ${template.template_name} (ID: ${template.template_id}), protein: ${proteinDisplay} | ${filterSummary}`, "ai");

  const varietyBlock = varietyConstraints ? buildVarietyPromptBlock(varietyConstraints) : "";
  const healthyBlock = buildHealthyPromptBlock(request.healthiness_preference, request.busy_level);
  const prompt = buildPrompt(template, request, chosenProtein, varietyBlock, healthyBlock);
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (let attempt = 1; attempt <= MAX_PROTEIN_RETRIES; attempt++) {
    const isRetry = attempt > 1;
    const result = await attemptGenerate(prompt, SYSTEM_PROMPT, template, chosenProtein, budgetLevel, isRetry);

    if (result) {
      totalTokensIn += result.tokensIn;
      totalTokensOut += result.tokensOut;

      const validation = validateProteinCompliance(result.recipe, chosenProtein);
      if (validation.valid) {
        const elapsed = Date.now() - genStart;
        log(`Recipe OK in ${elapsed}ms (${totalTokensIn}in/${totalTokensOut}out, attempt ${attempt}) | ${filterSummary}`, "perf");
        return { recipe: result.recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
      }

      logError("protein_mismatch", `Attempt ${attempt}/${MAX_PROTEIN_RETRIES}: ${validation.reason}`);
    } else {
      log(`Attempt ${attempt}/${MAX_PROTEIN_RETRIES}: failed to produce valid recipe`, "ai");
    }

    if (attempt < MAX_PROTEIN_RETRIES) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  log(`Primary generation failed after ${MAX_PROTEIN_RETRIES} attempts, trying fallback remix...`, "ai");

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
  varietyConstraints?: VarietyConstraints
): Promise<AIResult> {
  const genStart = Date.now();
  const budgetLevel = request.budget_level || "standard";
  const filterSummary = buildFilterSummary(request);

  log(`Generating pantry recipe: ${template.template_name}, ingredients: ${(request.ingredients_on_hand || []).join(", ")} | ${filterSummary}`, "ai");

  const varietyBlock = varietyConstraints ? buildVarietyPromptBlock(varietyConstraints) : "";
  const healthyBlock = buildHealthyPromptBlock(request.healthiness_preference, request.busy_level);
  const prompt = buildPantryPrompt(template, request, varietyBlock, healthyBlock);

  const result = await attemptGenerate(prompt, PANTRY_SYSTEM_PROMPT, template, "pantry", budgetLevel, false);
  if (result) {
    const elapsed = Date.now() - genStart;
    log(`Pantry recipe OK in ${elapsed}ms (${result.tokensIn}in/${result.tokensOut}out) | ${filterSummary}`, "perf");
    return { recipe: result.recipe, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
  }

  log(`Pantry primary failed, retrying with format correction...`, "ai");
  const retry = await attemptGenerate(prompt, PANTRY_SYSTEM_PROMPT, template, "pantry", budgetLevel, true);
  if (retry) {
    const elapsed = Date.now() - genStart;
    log(`Pantry retry OK in ${elapsed}ms | ${filterSummary}`, "perf");
    return { recipe: retry.recipe, tokensIn: retry.tokensIn, tokensOut: retry.tokensOut };
  }

  log(`Pantry retry failed, trying fallback remix...`, "ai");
  const fallback = await fallbackRemix(template, request, "pantry");
  if (fallback) {
    const elapsed = Date.now() - genStart;
    log(`Pantry fallback served in ${elapsed}ms | ${filterSummary}`, "perf");
    return fallback;
  }

  throw new Error("Couldn't generate a pantry recipe. Please try again.");
}
