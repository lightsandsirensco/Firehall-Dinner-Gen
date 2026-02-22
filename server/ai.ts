import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";
import { getForbiddenProteinsText, validateProteinCompliance } from "./protein-validator";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_RETRIES = 2;
const MAX_PROTEIN_RETRIES = 3;

export interface AIResult {
  recipe: GenerateResponse;
  tokensIn: number;
  tokensOut: number;
}

async function callAI(prompt: string, systemPrompt: string): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startMs = Date.now();
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const elapsed = Date.now() - startMs;
      const choice = response.choices[0];
      const content = choice?.message?.content;
      const usage = response.usage;

      log(`AI call completed in ${elapsed}ms (attempt ${attempt})`, "perf");

      if (content && content.trim().length > 10) {
        return {
          content,
          tokensIn: usage?.prompt_tokens || 0,
          tokensOut: usage?.completion_tokens || 0,
        };
      }

      log(`Attempt ${attempt}/${MAX_RETRIES}: empty/short response`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 800 * attempt));
    } catch (err: any) {
      log(`Attempt ${attempt}/${MAX_RETRIES}: ${err.message}`, "ai");
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 800 * attempt));
      else throw err;
    }
  }
  throw new Error("AI did not return a recipe after multiple attempts. Please try again.");
}

function parseRecipe(content: string, template: TemplateRow, chosenProtein: string, budgetLevel: string): GenerateResponse {
  let recipe: GenerateResponse;
  try {
    recipe = JSON.parse(content) as GenerateResponse;
  } catch {
    log(`JSON parse failed: ${content.substring(0, 200)}`, "ai");
    throw new Error("Failed to parse AI response. Please try again.");
  }

  recipe.template_id = parseInt(template.template_id);
  recipe.chosen_protein = chosenProtein.charAt(0).toUpperCase() + chosenProtein.slice(1);
  recipe.budget_level = budgetLevel;
  if (!recipe.budget_tips) recipe.budget_tips = [];
  if (!recipe.timing) recipe.timing = { prep_minutes: 0, cook_minutes: 0, total_minutes: 0 };
  if (!recipe.protein_safety || !Array.isArray(recipe.protein_safety)) recipe.protein_safety = [];
  if (!recipe.title || !recipe.ingredients || !recipe.steps) {
    throw new Error("AI returned incomplete recipe data. Please try again.");
  }

  return recipe;
}

export async function generateRecipe(
  template: TemplateRow,
  request: GenerateRequest,
  chosenProtein: string
): Promise<AIResult> {
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

  const prompt = `Generate ONE firehall meal as JSON.

TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
PROTEIN (STRICT): Recipe MUST use ${proteinDisplay} as the ONLY animal protein. Do not include, mention, or substitute any other meat or animal protein. The title MUST include the word "${proteinDisplay}". Every meat ingredient MUST be ${proteinDisplay}. FORBIDDEN proteins (do NOT use any of these): ${forbiddenText}.
Healthiness: ${request.healthiness_preference}
${allergenLine}
${budgetLine}
${vegLine}

RULES: ${request.crew_size} servings. 4-6 steps. 8-12 ingredients. 35-60g protein/serving. Each step: heading with temp/time, body with concise actions. Safety temps: chicken/turkey 165°F/74°C, ground meat 160°F/71°C, pork 145°F/63°C +3min rest, fish 145°F/63°C.

JSON:
{"template_id":${template.template_id},"chosen_protein":"${proteinDisplay}","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"budget_level":"${budgetLevel}","budget_tips":[]${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;

  const genStart = Date.now();
  log(`Generating: ${template.template_name} (ID: ${template.template_id}), protein: ${proteinDisplay}`, "ai");

  let totalTokensIn = 0;
  let totalTokensOut = 0;

  for (let proteinAttempt = 1; proteinAttempt <= MAX_PROTEIN_RETRIES; proteinAttempt++) {
    const { content, tokensIn, tokensOut } = await callAI(
      prompt,
      "Firehall chef. Return ONLY valid JSON. Include cooking temps and safety targets for every protein. No markdown. The recipe MUST use ONLY the specified protein — no substitutions."
    );

    totalTokensIn += tokensIn;
    totalTokensOut += tokensOut;

    const recipe = parseRecipe(content, template, chosenProtein, budgetLevel);
    const validation = validateProteinCompliance(recipe, chosenProtein);

    if (validation.valid) {
      const genElapsed = Date.now() - genStart;
      log(`Recipe generated in ${genElapsed}ms (${totalTokensIn}in/${totalTokensOut}out tokens, protein attempts: ${proteinAttempt})`, "perf");
      return { recipe, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
    }

    log(`Protein validation failed (attempt ${proteinAttempt}/${MAX_PROTEIN_RETRIES}): ${validation.reason}`, "ai");

    if (proteinAttempt < MAX_PROTEIN_RETRIES) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw new Error(`Couldn't generate a compliant ${proteinDisplay} recipe after ${MAX_PROTEIN_RETRIES} attempts. Please try again.`);
}

export async function generateRecipeFromPantry(
  template: TemplateRow,
  request: GenerateRequest
): Promise<AIResult> {
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

  const prompt = `Generate ONE firehall meal as JSON using crew's on-hand ingredients.

ON HAND: ${ingredientsList}
TEMPLATE: ${template.template_name} (${template.style}) — ${template.base_idea_description}
CREW: ${request.crew_size} | Shift: ${request.busy_level} | Time: ${request.time_available} min | Appliances: ${request.appliances.join(", ")}
Healthiness: ${request.healthiness_preference}
${allergenLine}
${budgetLine}
${vegLine}

RULES: Use as many on-hand ingredients as practical. List used ones in "ingredients_used". List 1-4 extras needed in "extra_items_needed" (skip basic pantry staples). ${request.crew_size} servings. 4-6 steps. 8-12 ingredients. 35-60g protein/serving. Safety temps: chicken 165°F, ground meat 160°F, pork 145°F+3min rest.

JSON:
{"template_id":${template.template_id},"chosen_protein":"","title":"","why_it_fits_tonight":"","timing":{"prep_minutes":0,"cook_minutes":0,"total_minutes":0},"protein_safety":[{"protein":"","target_temp_f":0,"target_temp_c":0,"rest_minutes":0,"probe_where":"","notes":""}],"ingredients":[{"item":"","amount":"","notes":""}],"steps":[{"heading":"","body":""}],"cleanup_tip":"","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0},"ingredients_used":[],"extra_items_needed":[],"budget_level":"${budgetLevel}","budget_tips":[]${request.vegetarian_swap_needed ? ',"veg_option":{"enabled":true,"swap_protein":"","ingredients":[],"steps":[],"plating_notes":""}' : ""}}`;

  const genStart = Date.now();
  log(`Generating pantry recipe: ${template.template_name}, ingredients: ${ingredientsList}`, "ai");

  const { content, tokensIn, tokensOut } = await callAI(
    prompt,
    "Firehall chef. Return ONLY valid JSON. Include cooking temps for every protein. No markdown."
  );

  const genElapsed = Date.now() - genStart;
  log(`Pantry recipe generated in ${genElapsed}ms (${tokensIn}in/${tokensOut}out tokens)`, "perf");

  let recipe: GenerateResponse;
  try {
    recipe = JSON.parse(content) as GenerateResponse;
  } catch {
    log(`JSON parse failed: ${content.substring(0, 200)}`, "ai");
    throw new Error("Failed to parse AI response. Please try again.");
  }

  recipe.template_id = parseInt(template.template_id);
  if (!recipe.chosen_protein) recipe.chosen_protein = "Pantry mix";
  recipe.budget_level = budgetLevel;
  if (!recipe.budget_tips) recipe.budget_tips = [];
  if (!recipe.timing) recipe.timing = { prep_minutes: 0, cook_minutes: 0, total_minutes: 0 };
  if (!recipe.protein_safety || !Array.isArray(recipe.protein_safety)) recipe.protein_safety = [];
  if (!recipe.ingredients_used) recipe.ingredients_used = [];
  if (!recipe.extra_items_needed) recipe.extra_items_needed = [];
  if (!recipe.title || !recipe.ingredients || !recipe.steps) {
    throw new Error("AI returned incomplete recipe data. Please try again.");
  }

  return { recipe, tokensIn, tokensOut };
}
