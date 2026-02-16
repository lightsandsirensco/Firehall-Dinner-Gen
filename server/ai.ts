import OpenAI from "openai";
import type { TemplateRow, GenerateRequest, GenerateResponse } from "@shared/schema";
import { log } from "./index";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const MAX_RETRIES = 3;

async function callAI(prompt: string, systemPrompt: string, templateId: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
      });

      const choice = response.choices[0];
      const content = choice?.message?.content;

      if (content && content.trim().length > 10) {
        return content;
      }

      const finishReason = choice?.finish_reason || "unknown";
      log(`Attempt ${attempt}/${MAX_RETRIES}: AI returned empty/short content. Finish reason: ${finishReason}`, "ai");

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    } catch (err: any) {
      log(`Attempt ${attempt}/${MAX_RETRIES}: AI call error: ${err.message}`, "ai");
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      } else {
        throw err;
      }
    }
  }

  throw new Error("AI did not return a recipe after multiple attempts. Please try again.");
}

export async function generateRecipe(
  template: TemplateRow,
  request: GenerateRequest
): Promise<GenerateResponse> {
  const allergenWarning =
    request.allergens_to_avoid.length > 0
      ? `CRITICAL: The crew has allergies: ${request.allergens_to_avoid.join(", ")}. Do NOT include any ingredients with these allergens. Use safe substitutes.`
      : "No allergy restrictions.";

  const prompt = `Generate ONE firehall dinner recipe as JSON.

TEMPLATE: ${template.template_name} (${template.style}) - ${template.base_idea_description}
Appliances: ${template.appliances_needed}

CREW: ${request.crew_size} people | Shift: ${request.busy_level} | Time: ${request.time_available} min
Appliances available: ${request.appliances.join(", ")}
Proteins: ${request.proteins.join(", ")}
Healthiness: ${request.healthiness_preference}
${allergenWarning}

Rules: Scale for ${request.crew_size} servings. 4-6 interruptible steps. 8-12 ingredients. Target 35-60g protein/serving.

JSON format:
{"template_id":${template.template_id},"title":"string","why_it_fits_tonight":"string","ingredients":[{"item":"string","amount":"string","notes":"string"}],"steps":["string"],"cleanup_tip":"string","macros_per_serving":{"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0}}`;

  log(`Generating recipe from template: ${template.template_name} (ID: ${template.template_id})`, "ai");

  const content = await callAI(
    prompt,
    "You are a firehall chef. Return ONLY valid JSON. No markdown. No code fences.",
    template.template_id
  );

  log(`AI response received (${content.length} chars)`, "ai");

  let recipe: GenerateResponse;
  try {
    recipe = JSON.parse(content) as GenerateResponse;
  } catch {
    log(`Failed to parse AI JSON: ${content.substring(0, 200)}`, "ai");
    throw new Error("Failed to parse AI response. Please try again.");
  }

  recipe.template_id = parseInt(template.template_id);

  if (!recipe.title || !recipe.ingredients || !recipe.steps) {
    throw new Error("AI returned incomplete recipe data. Please try again.");
  }

  return recipe;
}
